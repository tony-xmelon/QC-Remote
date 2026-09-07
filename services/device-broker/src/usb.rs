use crate::flight::FlightRecorder;
use hidapi::{HidApi, HidDevice};
use prost::Message;
use qc_protocol::commands::{self, OutboundMessage};
use qc_protocol::framing;
use qc_protocol::profile;
use qc_protocol::proto;
use qc_protocol::proto::cortex_protobuf_v2 as pa;
use qc_protocol::session::{FrameAssembler, SessionMachine};
use std::cell::UnsafeCell;
use std::collections::HashMap;
use std::io::Read;
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
    frames: FrameAssembler,
    frame_report_count: usize,
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
            frames: FrameAssembler::new(),
            frame_report_count: 0,
            next_sequence: 1,
            flight,
        })
    }

    pub fn connect(
        session: &mut SessionMachine,
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
            let Some(attempt) = session.next_handshake_attempt(now_ms) else {
                std::thread::yield_now();
                continue;
            };
            let session_id = uuid::Uuid::new_v4().simple().to_string();
            usb.flight
                .event(format!("handshake-attempt-{}", attempt.number));
            usb.send_command(commands::reset_comms(attempt.number as u64, session_id));
            report_handshake_attempt(attempt.number, usb.telemetry());
            while session.awaiting_handshake_reply(session_clock.elapsed().as_millis() as u64) {
                if let Some(message) = usb.read_message(200)? {
                    if message.message_type == profile::MESSAGE_TYPE_RESET_COMMS_BUFFERS {
                        usb.flight.event("handshake-reply");
                        let connected = usb.finish_hello(attempt.number as u64 + 1)?;
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

    fn finish_hello(mut self, request_id: u64) -> Result<ConnectedQc, UsbError> {
        // Version, ModelRepo, connection state and live subscriptions share
        // one protocol plan with Android. Directory enumeration stays on
        // demand so it cannot starve the active preset.
        self.flight.event("initialization-started");
        for message in commands::initialization(unix_time_ms()) {
            self.send_command(message);
        }
        self.flight.event("initialization-sent");
        let deadline = Instant::now() + Duration::from_millis(profile::INITIAL_SYNC_TIMEOUT_MS);
        let mut message_counts: HashMap<u16, usize> = HashMap::new();
        let mut latest_messages = HashMap::new();
        let mut initial_messages = Vec::new();
        let mut synchronized = self.collect_until_preset(
            deadline,
            100,
            &mut initial_messages,
            &mut message_counts,
            &mut latest_messages,
        )?;
        if !synchronized {
            self.send_command(commands::read_current_preset(request_id));
            let deadline = Instant::now() + Duration::from_millis(profile::PRESET_SYNC_TIMEOUT_MS);
            synchronized = self.collect_until_preset(
                deadline,
                200,
                &mut initial_messages,
                &mut message_counts,
                &mut latest_messages,
            )?;
        }
        let required_seed_types = [2_u16, 13, 14, 17, 34];
        for message_type in required_seed_types {
            if !latest_messages.contains_key(&message_type) {
                self.send_command(commands::read(message_type));
            }
        }
        let seed_deadline = Instant::now() + Duration::from_secs(3);
        while Instant::now() < seed_deadline
            && required_seed_types
                .iter()
                .any(|message_type| !latest_messages.contains_key(message_type))
        {
            if let Some(message) = self.read_message(100)? {
                record_initial(
                    &mut initial_messages,
                    &mut message_counts,
                    &mut latest_messages,
                    message,
                );
            }
        }
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
        })
    }

    fn collect_until_preset(
        &mut self,
        deadline: Instant,
        read_timeout_ms: i32,
        initial_messages: &mut Vec<IncomingMessage>,
        message_counts: &mut HashMap<u16, usize>,
        latest_messages: &mut HashMap<u16, IncomingMessage>,
    ) -> Result<bool, UsbError> {
        while Instant::now() < deadline {
            if let Some(message) = self.read_message(read_timeout_ms)? {
                let is_preset = message.message_type == 15;
                record_initial(initial_messages, message_counts, latest_messages, message);
                if is_preset {
                    return Ok(true);
                }
            }
        }
        Ok(false)
    }

    pub fn send(&mut self, message_type: u16, payload: Vec<u8>) {
        let reports = framing::encode(message_type, &payload);
        self.flight.outbound(message_type, reports.len());
        for report in reports {
            // Windows reports the QC's accepted status-stage STALL only after
            // the data was delivered. Keep that wait on the permanent TX lane
            // so it cannot block report ingestion or the command dispatcher.
            if self.io.write(report.to_vec()).is_err() {
                self.flight.event("hid-writer-stopped");
            }
        }
        self.io.record_message(message_type);
    }

    pub fn send_command(&mut self, message: OutboundMessage) {
        self.send(message.message_type, message.payload);
    }

    pub fn telemetry(&self) -> UsbTelemetry {
        self.io.telemetry()
    }

    pub fn read_message(&mut self, timeout_ms: i32) -> Result<Option<IncomingMessage>, UsbError> {
        let Some(report) = self.io.read(timeout_ms)? else {
            return Ok(None);
        };
        if report.len() >= 3 && report[2] & framing::FLAG_FIRST != 0 {
            self.frame_report_count = 1;
        } else if self.frame_report_count > 0 {
            self.frame_report_count = self.frame_report_count.saturating_add(1);
        }
        let assembled = match self.frames.push(report) {
            Ok(assembled) => assembled,
            Err(error) => {
                self.frame_report_count = 0;
                return Err(error.into());
            }
        };
        let Some((message_type, mut payload)) = assembled else {
            return Ok(None);
        };
        self.flight
            .inbound(message_type, self.frame_report_count.max(1));
        self.frame_report_count = 0;
        // ModelRepo is the largest compressed message. Keep its decompression
        // off this permanent USB worker; the metadata worker inflates it only
        // when the catalog is actually consumed.
        if message_type != profile::MESSAGE_TYPE_MODEL_REPO && payload.starts_with(&[0x1f, 0x8b]) {
            let mut decoded = Vec::new();
            flate2::read::GzDecoder::new(payload.as_slice())
                .take(profile::MAX_INFLATED_BYTES as u64 + 1)
                .read_to_end(&mut decoded)
                .map_err(|error| {
                    UsbError::Read(format!("gzip payload could not be decoded: {error}"))
                })?;
            if decoded.len() > profile::MAX_INFLATED_BYTES {
                return Err(UsbError::Read(
                    "gzip payload exceeds the inflated-size limit".into(),
                ));
            }
            payload = decoded;
        }
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
    let message = pa::RecallPresetMessage::decode(payload).ok()?;
    let pa::recall_preset_message::Preset::Preset(preset) = message.preset?;
    let proto::binary_preset::Name::Name(name) = preset.name?;
    Some(name)
}

pub fn scene_value(payload: &[u8]) -> Option<u32> {
    let message = pa::SceneMessage::decode(payload).ok()?;
    let pa::scene_message::SelectedScene::SelectedScene(scene) = message.selected_scene?;
    Some(scene)
}

impl Drop for QcUsb {
    fn drop(&mut self) {
        self.disconnect();
    }
}

#[cfg(test)]
mod tests {
    use super::{record_initial, IncomingMessage, UsbTelemetry, MAX_INITIAL_MESSAGES};
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
            .filter(|entry| entry.message_type == 4)
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
