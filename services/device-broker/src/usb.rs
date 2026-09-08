use crate::flight::FlightRecorder;
use hidapi::{HidApi, HidDevice};
use qc_device_runtime::initialization::{
    DeviceStartupAction, DeviceStartupRuntime, InitializationAction,
};
use qc_device_runtime::transport::{ReportLayout, TransportRuntime};
use qc_protocol::commands::{self, OutboundMessage};
use qc_protocol::framing;
use qc_protocol::profile;
use std::cell::UnsafeCell;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use thiserror::Error;

/// Wall-clock milliseconds, for the SystemTimeSync the QC is sent at connect.
fn unix_time_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[derive(Debug, Error)]
pub enum UsbError {
    #[error("Quad Cortex is not present or its HID interface is owned by another application")]
    NotAvailable,
    #[error("Quad Cortex HID opened, but no ResetCommsBuffers reply arrived within the native handshake timeout")]
    HandshakeTimeout,
    #[error("Quad Cortex initialization failed: {0}")]
    Initialization(String),
    #[error("USB read failed: {0}")]
    Read(String),
    #[error("invalid QC frame: {0}")]
    Frame(#[from] framing::FrameError),
    #[error("HID initialization failed: {0}")]
    Hid(String),
}

#[derive(Debug, Clone)]
pub struct IncomingMessage {
    pub sequence: u64,
    pub message_type: u16,
    pub payload: Vec<u8>,
    pub received_at_unix_ms: u128,
}

pub struct ConnectedQc {
    pub usb: QcUsb,
    pub synchronized: bool,
    pub message_counts: HashMap<u16, usize>,
    pub latest_messages: HashMap<u16, IncomingMessage>,
    /// Every initialization message, in arrival order.
    ///
    /// `latest_messages` keeps only the newest of each type, so replaying it
    /// silently discards incremental pushes — a preset-folder listing arrives
    /// as one message per folder, and only the final folder would survive.
    pub initial_messages: Vec<IncomingMessage>,
    startup: DeviceStartupRuntime,
    initialization: Option<qc_device_runtime::initialization::InitializationRuntime>,
}

impl ConnectedQc {
    pub fn reserve_request_id(&mut self) -> u64 {
        self.startup.reserve_request_id()
    }

    /// Keep the staged device controller alive for the full USB session.
    /// Connected-state Version reads and Connection(false) rebuilds therefore
    /// take the same shared path on Windows and Android.
    pub fn observe_lifecycle(
        &mut self,
        message: &IncomingMessage,
        now_ms: u64,
    ) -> Result<(), UsbError> {
        if let Some(initialization) = self.initialization.as_mut() {
            initialization.observe_message(message.message_type, &message.payload);
        }
        let action = self.startup.observe(message.message_type, &message.payload);
        self.apply_startup_action(action, now_ms)
    }

    pub fn advance_lifecycle(&mut self, now_ms: u64) -> Result<(), UsbError> {
        let Some(initialization) = self.initialization.as_mut() else {
            return Ok(());
        };
        match initialization.advance(now_ms) {
            InitializationAction::Wait => {}
            InitializationAction::Send(messages) => {
                for message in messages {
                    self.usb.send_command(message);
                }
            }
            InitializationAction::Complete { synchronized } => {
                self.synchronized = synchronized;
                self.initialization = None;
            }
        }
        Ok(())
    }

    fn apply_startup_action(
        &mut self,
        mut action: DeviceStartupAction,
        now_ms: u64,
    ) -> Result<(), UsbError> {
        loop {
            action = match action {
                DeviceStartupAction::Wait => return Ok(()),
                DeviceStartupAction::Send(messages) => {
                    for message in messages {
                        self.usb.send_command(message);
                    }
                    return Ok(());
                }
                DeviceStartupAction::SendThenBuild(messages) => {
                    self.synchronized = false;
                    self.initialization = None;
                    for message in messages {
                        self.usb.send_command(message);
                    }
                    self.startup.begin_building()
                }
                DeviceStartupAction::Connected => {
                    self.synchronized = false;
                    self.usb
                        .send_command(commands::sync_system_time(unix_time_ms()));
                    self.initialization = Some(
                        self.startup
                            .post_boot_initialization(now_ms)
                            .map_err(|error| {
                                UsbError::Initialization(format!(
                                    "could not restart state seed: {error:?}"
                                ))
                            })?,
                    );
                    return self.advance_lifecycle(now_ms);
                }
                DeviceStartupAction::Invalid(error) => {
                    return Err(UsbError::Initialization(format!(
                        "device rejected active session: {error:?}"
                    )))
                }
                DeviceStartupAction::Failed(error) => {
                    return Err(UsbError::Initialization(format!(
                        "active session protocol error: {error:?}"
                    )))
                }
            };
        }
    }
}

/// Bounds the retained initialization burst. The collection deadlines already
/// bound it in time; this bounds it in memory if a device ever floods.
const MAX_INITIAL_MESSAGES: usize = 1024;

/// Record one initialization message into the ordered burst and the per-type
/// caches. The ordered burst is what gets replayed into the state decoder.
fn record_initial(
    initial: &mut Vec<IncomingMessage>,
    message_counts: &mut HashMap<u16, usize>,
    latest_messages: &mut HashMap<u16, IncomingMessage>,
    message: IncomingMessage,
) {
    let count = message_counts.entry(message.message_type).or_default();
    *count = count.saturating_add(1);
    if initial.len() < MAX_INITIAL_MESSAGES {
        initial.push(message.clone());
    }
    latest_messages.insert(message.message_type, message);
}

#[derive(Debug, Clone, Default)]
pub struct UsbTelemetry {
    pub messages_sent: u64,
    pub messages_sent_by_type: HashMap<u16, u64>,
    pub expected_write_stalls: u64,
    pub last_hid_write_duration_ms: u64,
    pub max_hid_write_duration_ms: u64,
    pub last_hid_write_completed: bool,
}

impl UsbTelemetry {
    fn record_write(&mut self, duration_ms: u64, completed: bool) {
        self.last_hid_write_duration_ms = duration_ms;
        self.max_hid_write_duration_ms = self.max_hid_write_duration_ms.max(duration_ms);
        self.last_hid_write_completed = completed;
        if !completed {
            self.expected_write_stalls = self.expected_write_stalls.saturating_add(1);
        }
    }

    fn record_message(&mut self, message_type: u16) {
        self.messages_sent = self.messages_sent.saturating_add(1);
        let count = self.messages_sent_by_type.entry(message_type).or_default();
        *count = count.saturating_add(1);
    }
}

enum HidReadEvent {
    Report(Vec<u8>),
    Error(String),
}

/// One native handle with independent full-duplex read and write lanes.
///
/// hidapi's pure-Rust Windows backend keeps distinct buffers, events and
/// OVERLAPPED records for those operations. This is the topology used by the
/// proven reference client as well: one permanent RX thread is already waiting
/// when the command thread writes a report.
struct SharedWindowsHid(UnsafeCell<HidDevice>);

// Safety: exactly one RX thread calls read_timeout and exactly one TX thread
// calls write. The selected windows-native backend touches disjoint
// read_state/write_state RefCells; read_pending is RX-only and the native
// handle is immutable. HidIo joins both lanes before releasing the handle.
unsafe impl Sync for SharedWindowsHid {}

impl SharedWindowsHid {
    fn read_timeout(&self, report: &mut [u8], timeout_ms: i32) -> Result<usize, String> {
        unsafe { (&*self.0.get()).read_timeout(report, timeout_ms) }
            .map_err(|error| error.to_string())
    }

    fn write(&self, report: &[u8]) -> Result<usize, String> {
        unsafe { (&*self.0.get()).write(report) }.map_err(|error| error.to_string())
    }
}

struct HidIo {
    receiver: mpsc::Receiver<HidReadEvent>,
    write_sender: Option<mpsc::SyncSender<Vec<u8>>>,
    telemetry: Arc<Mutex<UsbTelemetry>>,
    stopping: Arc<AtomicBool>,
    overflowed: Arc<AtomicBool>,
    reader: Option<JoinHandle<()>>,
    writer: Option<JoinHandle<()>>,
}

// A complete maximum-sized logical frame fits in this queue. The queue is
// deliberately finite: a stalled command lane must never turn sustained USB
// input into unbounded process memory.
const HID_READ_QUEUE_CAPACITY: usize = profile::MAX_FRAME_BYTES / framing::CHUNK_SIZE + 2;
const HID_WRITE_QUEUE_CAPACITY: usize = profile::MAX_FRAME_BYTES / framing::CHUNK_SIZE + 2;

impl HidIo {
    fn start(device: HidDevice) -> Result<Self, UsbError> {
        let device = Arc::new(SharedWindowsHid(UnsafeCell::new(device)));
        let stopping = Arc::new(AtomicBool::new(false));
        let (sender, receiver) = mpsc::sync_channel(HID_READ_QUEUE_CAPACITY);
        let reader_device = Arc::clone(&device);
        let reader_stopping = Arc::clone(&stopping);
        let overflowed = Arc::new(AtomicBool::new(false));
        let reader_overflowed = Arc::clone(&overflowed);
        let reader = thread::Builder::new()
            .name("qc-native-hid-rx".into())
            .spawn(move || {
                let mut consecutive_errors = 0_u8;
                while !reader_stopping.load(Ordering::Acquire) {
                    let mut report = [0_u8; 1024];
                    match reader_device.read_timeout(&mut report, 200) {
                        Ok(0) => consecutive_errors = 0,
                        Ok(read) => {
                            consecutive_errors = 0;
                            match sender.try_send(HidReadEvent::Report(report[..read].to_vec())) {
                                Ok(()) => {}
                                Err(mpsc::TrySendError::Full(_)) => {
                                    // A dropped report invalidates the current logical frame.
                                    // Let the broker tear down and re-open the session rather
                                    // than attempting to decode a discontinuous byte stream.
                                    reader_overflowed.store(true, Ordering::Release);
                                }
                                Err(mpsc::TrySendError::Disconnected(_)) => break,
                            }
                        }
                        Err(error) => {
                            consecutive_errors = consecutive_errors.saturating_add(1);
                            match sender.try_send(HidReadEvent::Error(error)) {
                                Ok(()) => {}
                                Err(mpsc::TrySendError::Full(_)) => {
                                    reader_overflowed.store(true, Ordering::Release);
                                }
                                Err(mpsc::TrySendError::Disconnected(_)) => break,
                            }
                            if consecutive_errors >= 2 {
                                break;
                            }
                        }
                    }
                }
            })
            .map_err(|error| UsbError::Hid(format!("could not start HID reader: {error}")))?;
        let (write_sender, write_receiver) =
            mpsc::sync_channel::<Vec<u8>>(HID_WRITE_QUEUE_CAPACITY);
        let writer_device = Arc::clone(&device);
        let telemetry = Arc::new(Mutex::new(UsbTelemetry::default()));
        let writer_telemetry = Arc::clone(&telemetry);
        let writer = match thread::Builder::new()
            .name("qc-native-hid-tx".into())
            .spawn(move || {
                while let Ok(report) = write_receiver.recv() {
                    let started = Instant::now();
                    let completed = writer_device.write(&report).is_ok();
                    let duration_ms = started.elapsed().as_millis().min(u64::MAX as u128) as u64;
                    let mut telemetry = writer_telemetry
                        .lock()
                        .unwrap_or_else(|poisoned| poisoned.into_inner());
                    telemetry.record_write(duration_ms, completed);
                }
            }) {
            Ok(writer) => writer,
            Err(error) => {
                stopping.store(true, Ordering::Release);
                let _ = reader.join();
                return Err(UsbError::Hid(format!(
                    "could not start HID writer: {error}"
                )));
            }
        };
        Ok(Self {
            receiver,
            write_sender: Some(write_sender),
            telemetry,
            stopping,
            overflowed,
            reader: Some(reader),
            writer: Some(writer),
        })
    }

    fn write(&self, report: Vec<u8>) -> Result<(), String> {
        self.write_sender
            .as_ref()
            .ok_or_else(|| "native HID writer stopped".to_string())?
            .send(report)
            .map_err(|_| "native HID writer stopped".to_string())
    }

    fn record_message(&self, message_type: u16) {
        self.telemetry
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .record_message(message_type);
    }

    fn telemetry(&self) -> UsbTelemetry {
        self.telemetry
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .clone()
    }

    fn read(&self, timeout_ms: i32) -> Result<Option<Vec<u8>>, UsbError> {
        if self.overflowed.swap(false, Ordering::AcqRel) {
            return Err(UsbError::Read(
                "native HID receive queue overflowed; reconnecting to restore frame alignment"
                    .into(),
            ));
        }
        let timeout = if timeout_ms <= 0 {
            Duration::ZERO
        } else {
            Duration::from_millis(timeout_ms as u64)
        };
        match self.receiver.recv_timeout(timeout) {
            Ok(HidReadEvent::Report(report)) => Ok(Some(report)),
            Ok(HidReadEvent::Error(error)) => Err(UsbError::Read(error)),
            Err(mpsc::RecvTimeoutError::Timeout) => Ok(None),
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                Err(UsbError::Read("native HID reader stopped".into()))
            }
        }
    }
}

impl Drop for HidIo {
    fn drop(&mut self) {
        self.stopping.store(true, Ordering::Release);
        self.write_sender.take();
        if let Some(reader) = self.reader.take() {
            let _ = reader.join();
        }
        if let Some(writer) = self.writer.take() {
            let _ = writer.join();
        }
    }
}

pub struct QcUsb {
    // Rust drops fields in declaration order. Keep the exclusive I/O owner
    // ahead of HidApi so shutdown joins both I/O lanes and releases USB first.
    io: HidIo,
    _api: HidApi,
    next_sequence: u64,
    flight: FlightRecorder,
}

impl QcUsb {
    pub fn open() -> Result<Self, UsbError> {
        let api = HidApi::new().map_err(|error| UsbError::Hid(error.to_string()))?;
        let device = api
            .open(profile::VENDOR_ID, profile::PRODUCT_ID)
            .map_err(|_| UsbError::NotAvailable)?;
        let io = HidIo::start(device)?;
        let mut flight = FlightRecorder::open_default();
        flight.event("transport-opened");
        Ok(Self {
            io,
            _api: api,
            next_sequence: 1,
            flight,
        })
    }

    pub fn connect(
        session: &mut TransportRuntime,
        session_clock: &Instant,
        mut report_handshake_attempt: impl FnMut(u32, UsbTelemetry),
    ) -> Result<ConnectedQc, UsbError> {
        let mut usb = Self::open()?;
        session.transport_opened(session_clock.elapsed().as_millis() as u64);
        loop {
            let now_ms = session_clock.elapsed().as_millis() as u64;
            if session.handshake_timed_out(now_ms) {
                return Err(UsbError::HandshakeTimeout);
            }
            let session_id = uuid::Uuid::new_v4().simple().to_string();
            let Some(attempt) = session.next_handshake_write(now_ms, session_id) else {
                std::thread::yield_now();
                continue;
            };
            usb.flight
                .event(format!("handshake-attempt-{}", attempt.attempt));
            usb.send_command_with_layout(attempt.message.clone(), attempt.layout);
            report_handshake_attempt(attempt.attempt, usb.telemetry());
            while session.awaiting_handshake_reply(session_clock.elapsed().as_millis() as u64) {
                if let Some(message) = usb.read_message(session, 200)? {
                    if message.message_type == profile::MESSAGE_TYPE_RESET_COMMS_BUFFERS {
                        if !attempt.matches_reply(&message.payload) {
                            usb.flight.event("handshake-reply-mismatch");
                            continue;
                        }
                        usb.flight.event("handshake-reply");
                        let (mut startup, _) =
                            DeviceStartupRuntime::start(attempt.request_id(), attempt.session_id());
                        let first_action = startup.observe(message.message_type, &message.payload);
                        let connected = usb.finish_hello(startup, first_action, session)?;
                        session.handshake_completed(
                            session_clock.elapsed().as_millis() as u64,
                            connected.synchronized,
                        );
                        return Ok(connected);
                    }
                }
                if session.handshake_timed_out(session_clock.elapsed().as_millis() as u64) {
                    return Err(UsbError::HandshakeTimeout);
                }
            }
        }
    }

    fn finish_hello(
        mut self,
        mut startup: DeviceStartupRuntime,
        mut startup_action: DeviceStartupAction,
        session: &mut TransportRuntime,
    ) -> Result<ConnectedQc, UsbError> {
        // Cortex Control stages startup. Each decoded response opens exactly
        // one following state; message-type arrival alone is not a gate.
        self.flight.event("initialization-started");
        let initialization_clock = Instant::now();
        let mut message_counts: HashMap<u16, usize> = HashMap::new();
        let mut latest_messages = HashMap::new();
        let mut initial_messages = Vec::new();

        loop {
            startup_action = match startup_action {
                DeviceStartupAction::Wait => DeviceStartupAction::Wait,
                DeviceStartupAction::Send(messages) => {
                    for message in messages {
                        self.send_command(message);
                    }
                    DeviceStartupAction::Wait
                }
                DeviceStartupAction::SendThenBuild(messages) => {
                    for message in messages {
                        self.send_command(message);
                    }
                    startup.begin_building()
                }
                DeviceStartupAction::Connected => break,
                DeviceStartupAction::Invalid(error) => {
                    return Err(UsbError::Initialization(format!(
                        "device rejected startup: {error:?}"
                    )))
                }
                DeviceStartupAction::Failed(error) => {
                    return Err(UsbError::Initialization(format!(
                        "protocol startup error: {error:?}"
                    )))
                }
            };
            if !matches!(startup_action, DeviceStartupAction::Wait) {
                continue;
            }
            if initialization_clock.elapsed().as_millis() as u64 >= profile::READY_WAIT_TIMEOUT_MS {
                return Err(UsbError::Initialization(format!(
                    "timed out in {:?}",
                    startup.phase()
                )));
            }
            if let Some(message) = self.read_message(session, 100)? {
                record_initial(
                    &mut initial_messages,
                    &mut message_counts,
                    &mut latest_messages,
                    message.clone(),
                );
                startup_action = startup.observe(message.message_type, &message.payload);
            }
        }

        self.flight.event("initialization-connected");
        self.send_command(commands::sync_system_time(unix_time_ms()));

        // Keep the existing bounded preset/state coherence check, but start it
        // only after the Updater gate and seed it from everything captured
        // during staged boot. This cannot replay Version/ModelRepo/subscriptions.
        let now_ms = initialization_clock.elapsed().as_millis() as u64;
        let mut initialization = startup.post_boot_initialization(now_ms).map_err(|error| {
            UsbError::Initialization(format!("could not start state seed: {error:?}"))
        })?;
        let synchronized = loop {
            let now_ms = initialization_clock.elapsed().as_millis() as u64;
            match initialization.advance(now_ms) {
                InitializationAction::Wait => {}
                InitializationAction::Send(messages) => {
                    for message in messages {
                        self.send_command(message);
                    }
                }
                InitializationAction::Complete { synchronized } => break synchronized,
            }
            if let Some(message) = self.read_message(session, 100)? {
                initialization.observe_message(message.message_type, &message.payload);
                record_initial(
                    &mut initial_messages,
                    &mut message_counts,
                    &mut latest_messages,
                    message,
                );
            }
        };
        // Directory transfer is deliberately not started here. File READ can
        // enqueue hundreds of folder messages and starve the first live
        // command for several seconds; the directory API starts it on demand.
        self.flight.event(if synchronized {
            "initialization-synchronized"
        } else {
            "initialization-incomplete"
        });
        Ok(ConnectedQc {
            usb: self,
            synchronized,
            message_counts,
            latest_messages,
            initial_messages,
            startup,
            initialization: None,
        })
    }

    pub fn send(&mut self, message_type: u16, payload: Vec<u8>) {
        self.send_command(OutboundMessage {
            message_type,
            payload,
        });
    }

    pub fn send_command(&mut self, message: OutboundMessage) {
        self.send_command_with_layout(message, ReportLayout::ReportIdPrefixed);
    }

    fn send_command_with_layout(&mut self, message: OutboundMessage, layout: ReportLayout) {
        let message_type = message.message_type;
        let reports = TransportRuntime::encode_reports(&message, layout);
        self.flight.outbound(message_type, reports.len());
        for report in reports {
            // Windows reports the QC's accepted status-stage STALL only after
            // the data was delivered. Keep that wait on the permanent TX lane
            // so it cannot block report ingestion or the command dispatcher.
            if self.io.write(report).is_err() {
                self.flight.event("hid-writer-stopped");
            }
        }
        self.io.record_message(message_type);
    }

    pub fn telemetry(&self) -> UsbTelemetry {
        self.io.telemetry()
    }

    pub fn read_message(
        &mut self,
        session: &mut TransportRuntime,
        timeout_ms: i32,
    ) -> Result<Option<IncomingMessage>, UsbError> {
        let Some(report) = self.io.read(timeout_ms)? else {
            return Ok(None);
        };
        let Some(frame) = session.push_report(&report)? else {
            return Ok(None);
        };
        let message_type = frame.message_type;
        let payload = frame.payload;
        self.flight.inbound(message_type, frame.report_count);
        // Preserve the wire payload exactly. Shared qc-protocol decoders own
        // bounded gzip handling, matching Android and keeping this adapter at
        // the HID/report boundary.
        let sequence = self.next_sequence;
        self.next_sequence = self.next_sequence.saturating_add(1);
        Ok(Some(IncomingMessage {
            sequence,
            message_type,
            payload,
            received_at_unix_ms: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
        }))
    }

    pub fn disconnect(&mut self) {
        self.send_command(commands::connection(false));
    }
}

pub fn preset_name(payload: &[u8]) -> Option<String> {
    qc_protocol::responses::decode_recalled_preset_name(payload)
        .ok()
        .flatten()
}

pub fn scene_value(payload: &[u8]) -> Option<u32> {
    qc_protocol::responses::decode_selected_scene(payload)
        .ok()
        .flatten()
}

impl Drop for QcUsb {
    fn drop(&mut self) {
        self.disconnect();
    }
}

#[cfg(test)]
mod tests {
    use super::{record_initial, IncomingMessage, UsbTelemetry, MAX_INITIAL_MESSAGES};
    use qc_protocol::profile;
    use std::collections::HashMap;

    fn message(sequence: u64, message_type: u16, payload: &[u8]) -> IncomingMessage {
        IncomingMessage {
            sequence,
            message_type,
            payload: payload.to_vec(),
            received_at_unix_ms: u128::from(sequence),
        }
    }

    #[test]
    fn initialization_retains_every_incremental_push_in_arrival_order() {
        let (mut initial, mut counts, mut latest) = (Vec::new(), HashMap::new(), HashMap::new());
        // A preset-folder listing arrives as one message per folder. Keeping
        // only the newest of each type left the library with one folder.
        for (sequence, folder) in [(1_u64, b"A"), (2, b"B"), (3, b"C")] {
            record_initial(
                &mut initial,
                &mut counts,
                &mut latest,
                message(sequence, 4, folder),
            );
        }
        record_initial(
            &mut initial,
            &mut counts,
            &mut latest,
            message(4, 15, b"preset"),
        );

        assert_eq!(counts.get(&4), Some(&3));
        let folders: Vec<&[u8]> = initial
            .iter()
            .filter(|entry| entry.message_type == profile::MESSAGE_TYPE_FILE)
            .map(|entry| entry.payload.as_slice())
            .collect();
        assert_eq!(
            folders,
            vec![b"A".as_slice(), b"B".as_slice(), b"C".as_slice()]
        );
        assert_eq!(
            initial
                .iter()
                .map(|entry| entry.sequence)
                .collect::<Vec<_>>(),
            vec![1, 2, 3, 4]
        );
        // The per-type cache still answers "newest of this type".
        assert_eq!(latest.get(&4).map(|entry| entry.sequence), Some(3));
    }

    #[test]
    fn initialization_burst_is_bounded() {
        let (mut initial, mut counts, mut latest) = (Vec::new(), HashMap::new(), HashMap::new());
        for sequence in 0..(MAX_INITIAL_MESSAGES as u64 + 50) {
            record_initial(
                &mut initial,
                &mut counts,
                &mut latest,
                message(sequence, 4, b"f"),
            );
        }
        assert_eq!(initial.len(), MAX_INITIAL_MESSAGES);
        assert_eq!(counts.get(&4), Some(&(MAX_INITIAL_MESSAGES + 50)));
    }

    #[test]
    fn usb_telemetry_tracks_expected_stalls_and_worst_write_latency() {
        let mut telemetry = UsbTelemetry::default();
        telemetry.record_write(3, true);
        telemetry.record_write(7, false);
        telemetry.record_write(2, true);
        telemetry.record_message(10);
        telemetry.record_message(10);
        telemetry.record_message(52);
        assert_eq!(telemetry.expected_write_stalls, 1);
        assert_eq!(telemetry.last_hid_write_duration_ms, 2);
        assert_eq!(telemetry.max_hid_write_duration_ms, 7);
        assert!(telemetry.last_hid_write_completed);
        assert_eq!(telemetry.messages_sent, 3);
        assert_eq!(telemetry.messages_sent_by_type.get(&10), Some(&2));
        assert_eq!(telemetry.messages_sent_by_type.get(&52), Some(&1));
    }
}
