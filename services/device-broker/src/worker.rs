use crate::usb::{ConnectedQc, IncomingMessage, QcUsb, UsbError};
use qc_device_runtime::backup::{BackupAction, BackupRuntime};
use qc_device_runtime::catalog::{
    CatalogRefreshGate, CatalogVerificationAction, CatalogVerificationRuntime,
};
use qc_device_runtime::correlation::ResponseExpectation;
use qc_device_runtime::request::{self as runtime_request, PresetMutationPlan};
use qc_device_runtime::state_runtime::DeviceStateRuntime;
use qc_device_runtime::transport::TransportRuntime;
use qc_device_runtime::{GatewaySnapshot, PresetEntry, PresetFolder, PresetList, PresetSlotList};
use qc_protocol::commands::{self, DeviceCommand, DeviceOperation, OutboundMessage};
use qc_protocol::domain::STATE_EVENT_MAXIMUM_LIMIT;
use qc_protocol::responses::TempoClock as TempoClockFrame;
use qc_protocol::state::{
    decode_preset_folder, parse_model_repo, BlockDetails, ModelCatalog, ModelList,
    PresetFolderListing, StateUpdate,
};
use serde::Serialize;
use std::collections::{HashMap, VecDeque};
use std::sync::{mpsc, Arc, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BrokerStatus {
    pub phase: String,
    pub detail: String,
    pub connected: bool,
    pub synchronized: bool,
    pub active_preset_name: Option<String>,
    pub active_scene: Option<u32>,
    pub connected_at_unix_ms: Option<u128>,
    pub handshake_ms: Option<u128>,
    pub messages_received: u64,
    pub messages_sent: u64,
    pub messages_received_by_type: HashMap<u16, u64>,
    pub messages_sent_by_type: HashMap<u16, u64>,
    pub expected_write_stalls: u64,
    pub last_hid_write_duration_ms: u64,
    pub max_hid_write_duration_ms: u64,
    pub last_hid_write_completed: bool,
    pub last_message_type: Option<u16>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DecodedStateFrame {
    pub sequence: u64,
    pub observed_at: u128,
    pub states: Vec<StateUpdate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tempo_clock: Option<TempoClockFrame>,
}

impl Default for BrokerStatus {
    fn default() -> Self {
        Self {
            phase: "searching".into(),
            detail: "Waiting for Quad Cortex USB".into(),
            connected: false,
            synchronized: false,
            active_preset_name: None,
            active_scene: None,
            connected_at_unix_ms: None,
            handshake_ms: None,
            messages_received: 0,
            messages_sent: 0,
            messages_received_by_type: HashMap::new(),
            messages_sent_by_type: HashMap::new(),
            expected_write_stalls: 0,
            last_hid_write_duration_ms: 0,
            max_hid_write_duration_ms: 0,
            last_hid_write_completed: false,
            last_message_type: None,
        }
    }
}

enum Command {
    Reconnect {
        force: bool,
        reply: mpsc::Sender<()>,
    },
    Disconnect {
        reply: mpsc::Sender<()>,
    },
    Send(u16, Vec<u8>, mpsc::Sender<Result<(), String>>),
    SendRealtime(u16, Vec<u8>),
    SendSequence {
        messages: Vec<OutboundMessage>,
        delay: Duration,
        interval: Duration,
        reply: mpsc::Sender<Result<(), String>>,
    },
    Request {
        message_type: u16,
        payload: Vec<u8>,
        expected_type: u16,
        request_id: Option<u64>,
        timeout: Duration,
        reply: mpsc::Sender<Result<IncomingMessage, String>>,
    },
    CreateBackup {
        timeout: Duration,
        reply: mpsc::Sender<Result<String, String>>,
    },
    Stop,
}

#[derive(Default)]
struct RawEventBus {
    log: Mutex<VecDeque<IncomingMessage>>,
    subscribers: Mutex<Vec<mpsc::SyncSender<IncomingMessage>>>,
}

// Subscribers are notification aids, not authoritative storage. The bounded
// history above is the catch-up source, so a stalled UI/client must not retain
// an unbounded clone of every device frame.
const SUBSCRIBER_QUEUE_CAPACITY: usize = qc_protocol::domain::STATE_EVENT_DEFAULT_LIMIT;
// Bound both internal producer/consumer seams. Realtime commands acknowledge
// queue admission rather than physical completion, so an unbounded channel
// would let a stalled USB device turn concurrent remote calls into unbounded
// process memory. The decoder queue is larger because one legitimate catalog
// burst can contain more than a thousand frames.
const DEVICE_COMMAND_QUEUE_CAPACITY: usize = qc_protocol::domain::STATE_EVENT_DEFAULT_LIMIT;
const STATE_DECODER_QUEUE_CAPACITY: usize = qc_protocol::domain::STATE_EVENT_MAXIMUM_LIMIT;
// The USB reader itself blocks on a permanent native RX thread. This short
// broker-side receive poll only multiplexes completed reports with outbound
// commands; keeping the old 50 ms wait added a full UI frame (and sometimes
// more) before realtime HID commands could even be submitted.
const CONNECTED_IO_POLL_MS: i32 = 5;

trait RecoverPoison<T> {
    fn lock_recover(&self) -> MutexGuard<'_, T>;
}

impl<T> RecoverPoison<T> for Mutex<T> {
    fn lock_recover(&self) -> MutexGuard<'_, T> {
        // A panic while updating one cache must not permanently crash both
        // broker workers and every future request. The protected structures
        // are replaced or updated atomically enough for their next event to
        // reconcile them, so retaining the inner value is safer than cascading.
        self.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

pub struct DeviceController {
    state: Arc<Mutex<BrokerStatus>>,
    latest_messages: Arc<Mutex<HashMap<u16, IncomingMessage>>>,
    raw_events: Arc<RawEventBus>,
    state_event_log: Arc<Mutex<VecDeque<DecodedStateFrame>>>,
    state_subscribers: Arc<Mutex<Vec<mpsc::SyncSender<DecodedStateFrame>>>>,
    device_state: Arc<Mutex<DeviceStateRuntime>>,
    catalog_clock: Instant,
    preset_library_refresh: Mutex<CatalogRefreshGate>,
    commands: mpsc::SyncSender<Command>,
}

impl DeviceController {
    pub fn start() -> Self {
        Self::start_with_auto_connect(true)
    }

    /// Starts the stdio broker without racing its client's explicit reconnect.
    pub fn start_disconnected() -> Self {
        Self::start_with_auto_connect(false)
    }

    fn start_with_auto_connect(auto_connect: bool) -> Self {
        let state = Arc::new(Mutex::new(BrokerStatus::default()));
        if !auto_connect {
            let mut status = state.lock_recover();
            status.phase = "disconnected".into();
            status.detail = "Waiting for a reconnect request".into();
        }
        let latest_messages = Arc::new(Mutex::new(HashMap::new()));
        let raw_events = Arc::new(RawEventBus::default());
        let state_event_log = Arc::new(Mutex::new(VecDeque::new()));
        let state_subscribers = Arc::new(Mutex::new(Vec::new()));
        let device_state = Arc::new(Mutex::new(DeviceStateRuntime::new()));
        let (state_messages, state_receiver) = mpsc::sync_channel(STATE_DECODER_QUEUE_CAPACITY);
        let state_catalogs = state_messages.clone();
        let decoded_events = Arc::clone(&state_event_log);
        let decoded_state = Arc::clone(&device_state);
        let decoded_subscribers = Arc::clone(&state_subscribers);
        thread::Builder::new()
            .name("qc-native-state".into())
            .spawn(move || {
                run_state_decoder(
                    decoded_events,
                    decoded_state,
                    decoded_subscribers,
                    state_catalogs,
                    state_receiver,
                )
            })
            .expect("native QC state decoder starts");
        let (commands, receiver) = mpsc::sync_channel(DEVICE_COMMAND_QUEUE_CAPACITY);
        let worker_state = Arc::clone(&state);
        let worker_messages = Arc::clone(&latest_messages);
        let worker_raw_events = Arc::clone(&raw_events);
        thread::Builder::new()
            .name("qc-native-usb".into())
            .spawn(move || {
                run(
                    worker_state,
                    worker_messages,
                    worker_raw_events,
                    state_messages,
                    receiver,
                    auto_connect,
                )
            })
            .expect("native QC USB worker starts");
        Self {
            state,
            latest_messages,
            raw_events,
            state_event_log,
            state_subscribers,
            device_state,
            catalog_clock: Instant::now(),
            preset_library_refresh: Mutex::new(CatalogRefreshGate::default()),
            commands,
        }
    }

    pub fn status(&self) -> BrokerStatus {
        self.state.lock_recover().clone()
    }

    pub fn reconnect(&self) -> Result<(), String> {
        self.request_reconnect(false)
    }
    pub fn reset_session(&self) -> Result<(), String> {
        self.request_reconnect(true)
    }
    fn request_reconnect(&self, force: bool) -> Result<(), String> {
        let (reply, response) = mpsc::channel();
        self.commands
            .send(Command::Reconnect { force, reply })
            .map_err(|_| "Native QC worker is not available".to_string())?;
        response
            .recv_timeout(Duration::from_millis(
                qc_protocol::profile::READY_WAIT_TIMEOUT_MS,
            ))
            .map_err(|_| "Native QC worker did not acknowledge the reconnect request".to_string())
    }
    pub fn disconnect(&self) -> Result<(), String> {
        let (reply, response) = mpsc::channel();
        self.commands
            .send(Command::Disconnect { reply })
            .map_err(|_| "Native QC worker is not available".to_string())?;
        response
            .recv_timeout(Duration::from_secs(1))
            .map_err(|_| "Native QC worker did not acknowledge the disconnect request".to_string())
    }

    pub fn latest_message(&self, message_type: u16) -> Option<IncomingMessage> {
        self.latest_messages
            .lock_recover()
            .get(&message_type)
            .cloned()
    }

    pub fn events_since(
        &self,
        sequence: u64,
        message_type: Option<u16>,
        limit: usize,
    ) -> Vec<IncomingMessage> {
        self.raw_events
            .log
            .lock_recover()
            .iter()
            .filter(|message| {
                message.sequence > sequence
                    && message_type.is_none_or(|kind| kind == message.message_type)
            })
            .take(limit.min(STATE_EVENT_MAXIMUM_LIMIT))
            .cloned()
            .collect()
    }

    pub fn state_events_since(&self, sequence: u64, limit: usize) -> Vec<DecodedStateFrame> {
        self.state_event_log
            .lock_recover()
            .iter()
            .filter(|frame| frame.sequence > sequence)
            .take(limit.min(STATE_EVENT_MAXIMUM_LIMIT))
            .cloned()
            .collect()
    }

    pub fn latest_state_sequence(&self) -> u64 {
        self.state_event_log
            .lock_recover()
            .back()
            .map_or(0, |frame| frame.sequence)
    }

    pub fn subscribe_state_events(&self) -> mpsc::Receiver<DecodedStateFrame> {
        let (sender, receiver) = mpsc::sync_channel(SUBSCRIBER_QUEUE_CAPACITY);
        self.state_subscribers.lock_recover().push(sender);
        receiver
    }

    pub fn subscribe_raw_events(&self) -> mpsc::Receiver<IncomingMessage> {
        let (sender, receiver) = mpsc::sync_channel(SUBSCRIBER_QUEUE_CAPACITY);
        self.raw_events.subscribers.lock_recover().push(sender);
        receiver
    }

    pub fn block_details(&self, row: u32, column: u32) -> Result<Option<BlockDetails>, String> {
        if row > 3 || column > 9 {
            return Err("Block coordinates must address rows 0-3 and columns 0-9".into());
        }
        Ok(self.device_state.lock_recover().block_details(row, column))
    }

    pub fn lane_control_details(
        &self,
        row: u32,
        control: &str,
    ) -> Result<Option<BlockDetails>, String> {
        if row > 3 || !matches!(control, "inputGate" | "laneOutput") {
            return Err("Lane control must be inputGate or laneOutput on rows 0-3".into());
        }
        Ok(self
            .device_state
            .lock_recover()
            .lane_control_details(row, control))
    }

    pub fn gateway_snapshot(&self) -> Option<GatewaySnapshot> {
        let snapshot = self.device_state.lock_recover().snapshot().clone();
        snapshot.has_preset.then_some(snapshot)
    }

    pub fn wait_for_gateway_snapshot(
        &self,
        timeout: Duration,
        predicate: impl Fn(&GatewaySnapshot) -> bool,
    ) -> Option<GatewaySnapshot> {
        let events = self.subscribe_state_events();
        let deadline = Instant::now() + timeout;
        loop {
            if let Some(snapshot) = self.gateway_snapshot() {
                if predicate(&snapshot) || Instant::now() >= deadline {
                    return Some(snapshot);
                }
            } else if Instant::now() >= deadline {
                return None;
            }
            if events
                .recv_timeout(deadline.saturating_duration_since(Instant::now()))
                .is_err()
            {
                return self
                    .gateway_snapshot()
                    .filter(|snapshot| predicate(snapshot));
            }
        }
    }

    pub fn list_models(&self) -> Result<ModelList, String> {
        Ok(self.device_state.lock_recover().model_list())
    }

    pub fn refresh_preset_library(&self) -> Result<(), String> {
        let connection_id = self
            .state
            .lock_recover()
            .connected_at_unix_ms
            .and_then(|value| u64::try_from(value).ok())
            .unwrap_or(0);
        let now_ms = self.catalog_clock.elapsed().as_millis() as u64;
        {
            let mut refresh = self.preset_library_refresh.lock_recover();
            if !refresh.reserve(connection_id, now_ms) {
                return Ok(());
            }
        }
        if let Err(error) = self.send_operation(DeviceOperation::ListPresetFolders) {
            self.preset_library_refresh.lock_recover().clear();
            return Err(error);
        }
        Ok(())
    }

    /// Wait for a new File listing emitted after this call and matching the
    /// requested setlist. The in-memory catalog is intentionally not used as
    /// proof: it may contain an optimistic save/move overlay or a listing from
    /// before an eventually-consistent device mutation. Missed File pushes are
    /// retried with bounded exponential backoff. A File request publishes the
    /// complete directory one frame per folder, so a fixed 500 ms retry can
    /// amplify one eventually-consistent save into hundreds of USB frames.
    pub fn wait_for_fresh_preset_listing(
        &self,
        key: &str,
        predicate: impl Fn(&PresetFolderListing) -> bool,
    ) -> Result<PresetFolderListing, String> {
        let expected_key = key.trim_end_matches('/');
        let events = self.subscribe_raw_events();
        let clock = Instant::now();
        let mut verification = CatalogVerificationRuntime::new(0);

        loop {
            let now_ms = clock.elapsed().as_millis() as u64;
            let wait_ms = match verification.take_action(now_ms) {
                CatalogVerificationAction::Request => {
                    // Verification owns its shared retry cadence and therefore
                    // deliberately bypasses the ordinary refresh coalescer.
                    self.send_operation(DeviceOperation::ListPresetFolders)?;
                    let connection_id = self
                        .state
                        .lock_recover()
                        .connected_at_unix_ms
                        .and_then(|value| u64::try_from(value).ok())
                        .unwrap_or(0);
                    self.preset_library_refresh.lock_recover().reserve(
                        connection_id,
                        self.catalog_clock.elapsed().as_millis() as u64,
                    );
                    0
                }
                CatalogVerificationAction::Wait { delay_ms } => delay_ms,
                CatalogVerificationAction::Complete => {
                    unreachable!("a matching listing returns immediately")
                }
                CatalogVerificationAction::Failed { .. } => {
                    return Err(verification
                        .failure_message(&format!("preset listing for {expected_key:?}")));
                }
            };
            if wait_ms == 0 {
                continue;
            }
            match events.recv_timeout(Duration::from_millis(wait_ms)) {
                Ok(message) if message.message_type == qc_protocol::profile::MESSAGE_TYPE_FILE => {
                    let Ok(Some(listing)) = decode_preset_folder(&message.payload) else {
                        continue;
                    };
                    if listing.key.trim_end_matches('/') != expected_key {
                        continue;
                    }
                    let matches = predicate(&listing);
                    verification.listing_observed(clock.elapsed().as_millis() as u64, matches);
                    if matches {
                        // Raw subscribers are notified before the USB worker's
                        // normal cache ingestion. Ingest synchronously here so
                        // the caller can safely plan its next operation without
                        // racing that worker step.
                        self.device_state
                            .lock_recover()
                            .preset_library_mut()
                            .ingest(listing.clone());
                        return Ok(listing);
                    }
                }
                Ok(_) | Err(mpsc::RecvTimeoutError::Timeout) => {}
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    return Err(
                        "The QC preset-listing event stream closed during verification".into(),
                    );
                }
            }
        }
    }

    pub fn preset_folders(&self) -> Vec<PresetFolder> {
        self.device_state.lock_recover().preset_folders()
    }

    pub fn preset_list(&self, key: &str) -> Option<PresetList> {
        self.device_state.lock_recover().preset_list(key)
    }

    pub fn preset_slots(&self) -> Result<Option<PresetSlotList>, String> {
        self.device_state.lock_recover().preset_slots()
    }

    pub fn preset_entry(&self, key: &str, position: u32) -> Option<PresetEntry> {
        self.device_state.lock_recover().preset_entry(key, position)
    }

    pub fn record_saved_preset(&self, key: &str, position: u32, name: &str, instrument: i32) {
        let mut state = self.device_state.lock_recover();
        state
            .preset_library_mut()
            .record_saved(key, position, name, instrument);
        runtime_request::reconcile_saved_preset_snapshot(state.snapshot_mut(), key, position, name);
    }

    pub fn ensure_preset_setlist(&self, key: &str) {
        self.device_state
            .lock_recover()
            .preset_library_mut()
            .ensure_setlist(key);
    }

    pub fn record_library_mutation(&self, method: &str, params: &serde_json::Value) {
        let method = method.rsplit('.').next().unwrap_or(method);
        if !matches!(
            method,
            "createSetlist"
                | "create_setlist"
                | "deleteSetlist"
                | "delete_setlist"
                | "deletePreset"
                | "delete_preset"
                | "movePreset"
                | "move_preset"
        ) {
            return;
        }
        let mut state = self.device_state.lock_recover();
        let library = state.preset_library_mut();
        match method {
            "createSetlist" | "create_setlist" => {
                if let Some(name) = params.get("name").and_then(serde_json::Value::as_str) {
                    library.ensure_setlist(&format!("/media/p4/Presets/{name}"));
                }
            }
            "deleteSetlist" | "delete_setlist" => {
                if let Some(name) = params.get("name").and_then(serde_json::Value::as_str) {
                    library.remove_setlist(name);
                }
            }
            "deletePreset" | "delete_preset" => {
                if let (Some(key), Some(name)) = (
                    params.get("setlistKey").and_then(serde_json::Value::as_str),
                    params.get("name").and_then(serde_json::Value::as_str),
                ) {
                    library.remove_preset(key, name);
                }
            }
            "movePreset" | "move_preset" => {
                if let (Some(key), Some(name), Some(position)) = (
                    params.get("setlistKey").and_then(serde_json::Value::as_str),
                    params.get("name").and_then(serde_json::Value::as_str),
                    params
                        .get("position")
                        .and_then(serde_json::Value::as_u64)
                        .and_then(|value| u32::try_from(value).ok()),
                ) {
                    library.move_preset(key, name, position);
                }
            }
            _ => {}
        }
    }

    pub fn plan_preset_mutation(
        &self,
        method: &str,
        params: &serde_json::Value,
    ) -> Result<PresetMutationPlan, String> {
        let state = self.device_state.lock_recover();
        runtime_request::plan_preset_mutation(
            method,
            params,
            Some(state.snapshot()),
            state.preset_library(),
        )
    }

    pub fn wait_for_preset_folders(&self, timeout: Duration) -> Vec<PresetFolder> {
        let events = self.subscribe_raw_events();
        let deadline = Instant::now() + timeout;
        loop {
            let folders = self.preset_folders();
            if !folders.is_empty() || Instant::now() >= deadline {
                return folders;
            }
            match events.recv_timeout(deadline.saturating_duration_since(Instant::now())) {
                Ok(message) if message.message_type == qc_protocol::profile::MESSAGE_TYPE_FILE => {}
                Ok(_) => continue,
                Err(_) => return self.preset_folders(),
            }
        }
    }

    pub fn wait_for_preset_list(&self, key: &str, timeout: Duration) -> Option<PresetList> {
        let events = self.subscribe_raw_events();
        let deadline = Instant::now() + timeout;
        loop {
            if let Some(list) = self.preset_list(key) {
                return Some(list);
            }
            if Instant::now() >= deadline {
                return None;
            }
            match events.recv_timeout(deadline.saturating_duration_since(Instant::now())) {
                Ok(message) if message.message_type == qc_protocol::profile::MESSAGE_TYPE_FILE => {}
                Ok(_) => continue,
                Err(_) => return self.preset_list(key),
            }
        }
    }

    pub fn send(&self, message_type: u16, payload: Vec<u8>) -> Result<(), String> {
        let (sender, receiver) = mpsc::channel();
        self.commands
            .send(Command::Send(message_type, payload, sender))
            .map_err(|error| error.to_string())?;
        receiver
            .recv_timeout(Duration::from_secs(2))
            .map_err(|error| error.to_string())?
    }

    pub fn send_command(&self, message: OutboundMessage) -> Result<(), String> {
        self.send(message.message_type, message.payload)
    }

    /// Queue a realtime report on the permanent USB worker. The QC accepts the
    /// report before its Windows HID status stage completes, so UI/MCP latency
    /// must not include that expected stall.
    pub fn send_realtime_command(&self, message: OutboundMessage) -> Result<(), String> {
        if !self.state.lock_recover().connected {
            return Err("Quad Cortex is not connected".into());
        }
        match self
            .commands
            .try_send(Command::SendRealtime(message.message_type, message.payload))
        {
            Ok(()) => Ok(()),
            Err(mpsc::TrySendError::Full(_)) => {
                Err("Native QC command queue is busy; retry the realtime control".into())
            }
            Err(mpsc::TrySendError::Disconnected(_)) => {
                Err("Native QC worker is not available".into())
            }
        }
    }

    pub fn send_sequence(
        &self,
        messages: Vec<OutboundMessage>,
        delay: Duration,
        interval: Duration,
    ) -> Result<(), String> {
        let (sender, receiver) = mpsc::channel();
        let message_count = u32::try_from(messages.len()).unwrap_or(u32::MAX);
        self.commands
            .send(Command::SendSequence {
                messages,
                delay,
                interval,
                reply: sender,
            })
            .map_err(|error| error.to_string())?;
        receiver
            .recv_timeout(delay + interval.saturating_mul(message_count) + Duration::from_secs(2))
            .map_err(|error| error.to_string())?
    }

    pub fn send_operation(&self, operation: DeviceOperation) -> Result<(), String> {
        let interval_ms =
            qc_device_runtime::request::operation_inter_message_interval_ms(&operation);
        let messages = operation.try_encode().map_err(|error| error.to_string())?;
        if interval_ms > 0 {
            return self.send_sequence(
                messages,
                Duration::ZERO,
                Duration::from_millis(interval_ms),
            );
        }
        for message in messages {
            self.send_command(message)?;
        }
        Ok(())
    }

    pub fn request(
        &self,
        message_type: u16,
        payload: Vec<u8>,
        expected_type: u16,
        request_id: Option<u64>,
        timeout: Duration,
    ) -> Result<IncomingMessage, String> {
        let (sender, receiver) = mpsc::channel();
        self.commands
            .send(Command::Request {
                message_type,
                payload,
                expected_type,
                request_id,
                timeout,
                reply: sender,
            })
            .map_err(|error| error.to_string())?;
        receiver
            .recv_timeout(timeout + Duration::from_secs(1))
            .map_err(|error| error.to_string())?
    }

    pub fn create_backup(&self, timeout: Duration) -> Result<String, String> {
        let (reply, response) = mpsc::channel();
        self.commands
            .send(Command::CreateBackup { timeout, reply })
            .map_err(|_| "Native QC worker is not available".to_string())?;
        let document = response
            .recv_timeout(timeout + Duration::from_secs(20))
            .map_err(|_| "Native QC backup worker timed out".to_string())??;
        let status = self.wait_for_ready(Duration::from_millis(
            qc_protocol::profile::READY_WAIT_TIMEOUT_MS,
        ));
        if status.phase != "ready" {
            return Err(format!(
                "The backup completed, but the Quad Cortex session did not recover: {}",
                status.detail
            ));
        }
        // The shared initialization runtime's ready state already requires
        // Master Volume and the complete authoritative control seed.
        Ok(document)
    }

    pub fn switch_scene(&self, scene: u32) -> Result<(), String> {
        if scene > 7 {
            return Err("Scene must be between 0 and 7".into());
        }
        self.send_operation(DeviceOperation::Command(DeviceCommand::SelectScene(scene)))
    }

    pub fn wait_for_scene(&self, scene: u32, timeout: Duration) -> BrokerStatus {
        let events = self.subscribe_state_events();
        let deadline = Instant::now() + timeout;
        loop {
            let status = self.status();
            if status.active_scene == Some(scene)
                || status.phase == "error"
                || Instant::now() >= deadline
            {
                return status;
            }
            if events
                .recv_timeout(deadline.saturating_duration_since(Instant::now()))
                .is_err()
            {
                return self.status();
            }
        }
    }

    pub fn wait_for_ready(&self, timeout: Duration) -> BrokerStatus {
        let events = self.subscribe_state_events();
        let deadline = Instant::now() + timeout;
        loop {
            let status = self.status();
            if status.phase == "ready" || status.phase == "error" || Instant::now() >= deadline {
                return status;
            }
            if events
                .recv_timeout(deadline.saturating_duration_since(Instant::now()))
                .is_err()
            {
                return self.status();
            }
        }
    }
}

impl Drop for DeviceController {
    fn drop(&mut self) {
        let _ = self.commands.send(Command::Stop);
    }
}

struct PendingRequest {
    expectation: ResponseExpectation,
    reply: mpsc::Sender<Result<IncomingMessage, String>>,
}

/// A LocalBackup document collected on the main device loop.
///
/// LocalBackup replies are an uncorrelated stream, so collection is a state
/// machine advanced by the ordinary read path rather than a nested loop. A
/// backup can legitimately take three minutes; running it inline used to stop
/// live state, keepalive and every other command for that whole time, and
/// forced pending requests to be failed before it started.
struct BackupInProgress {
    runtime: BackupRuntime,
    reply: mpsc::Sender<Result<String, String>>,
}

impl BackupInProgress {
    fn start(now_ms: u64, timeout: Duration, reply: mpsc::Sender<Result<String, String>>) -> Self {
        Self {
            runtime: BackupRuntime::start(
                now_ms,
                timeout.as_millis().min(u128::from(u64::MAX)) as u64,
            ),
            reply,
        }
    }

    fn absorb(&mut self, now_ms: u64, payload: &[u8]) -> Option<Result<String, String>> {
        match self.runtime.absorb(now_ms, payload) {
            Ok(progress) => progress.document.map(Ok),
            Err(error) => Some(Err(error)),
        }
    }
}

enum StateDecoderCommand {
    Reset(u64),
    Message(u64, IncomingMessage),
    Catalog(u64, ModelCatalog),
    Stop,
}

fn run_state_decoder(
    event_log: Arc<Mutex<VecDeque<DecodedStateFrame>>>,
    device_state: Arc<Mutex<DeviceStateRuntime>>,
    subscribers: Arc<Mutex<Vec<mpsc::SyncSender<DecodedStateFrame>>>>,
    sender: mpsc::SyncSender<StateDecoderCommand>,
    messages: mpsc::Receiver<StateDecoderCommand>,
) {
    let (metadata_tx, metadata_rx) = mpsc::sync_channel::<(u64, Vec<u8>)>(1);
    let metadata_results = sender.clone();
    let metadata_worker = thread::Builder::new()
        .name("qc-native-metadata".into())
        .spawn(move || {
            while let Ok((message_generation, payload)) = metadata_rx.recv() {
                if let Ok(catalog) = parse_model_repo(&payload) {
                    if metadata_results
                        .send(StateDecoderCommand::Catalog(message_generation, catalog))
                        .is_err()
                    {
                        return;
                    }
                }
            }
        })
        .ok();
    let mut generation = 0;
    let mut next_sequence = 1_u64;
    while let Ok(message) = messages.recv() {
        match message {
            StateDecoderCommand::Reset(next_generation) => {
                generation = next_generation;
                device_state.lock_recover().reset();
                event_log.lock_recover().clear();
            }
            StateDecoderCommand::Message(message_generation, message)
                if message_generation == generation =>
            {
                if message.message_type == qc_protocol::profile::MESSAGE_TYPE_MODEL_REPO {
                    if metadata_worker.is_some() {
                        // ModelRepo refreshes are full snapshots. Keep at most the parse
                        // in progress plus one pending refresh; a noisy device cannot
                        // create unbounded decompression threads or retained payloads.
                        let _ = metadata_tx.try_send((message_generation, message.payload));
                    } else if let Ok(catalog) = parse_model_repo(&message.payload) {
                        let _ = device_state.lock_recover().install_model_catalog(catalog);
                    }
                    continue;
                }
                if let Ok(observation) = device_state
                    .lock_recover()
                    .ingest(message.message_type, &message.payload)
                {
                    if observation.states.is_empty() && observation.tempo_clock.is_none() {
                        continue;
                    }
                    let frame = DecodedStateFrame {
                        sequence: next_sequence,
                        observed_at: message.received_at_unix_ms,
                        states: observation.states,
                        tempo_clock: observation.tempo_clock,
                    };
                    publish_state_frame(&event_log, &subscribers, frame);
                    next_sequence = next_sequence.saturating_add(1);
                }
            }
            StateDecoderCommand::Catalog(catalog_generation, catalog)
                if catalog_generation == generation =>
            {
                let states = device_state.lock_recover().install_model_catalog(catalog);
                if states.is_empty() {
                    continue;
                }
                let frame = DecodedStateFrame {
                    sequence: next_sequence,
                    observed_at: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis(),
                    states,
                    tempo_clock: None,
                };
                publish_state_frame(&event_log, &subscribers, frame);
                next_sequence = next_sequence.saturating_add(1);
            }
            StateDecoderCommand::Message(_, _) | StateDecoderCommand::Catalog(_, _) => {}
            StateDecoderCommand::Stop => return,
        }
    }
}

fn publish_state_frame(
    event_log: &Arc<Mutex<VecDeque<DecodedStateFrame>>>,
    subscribers: &Arc<Mutex<Vec<mpsc::SyncSender<DecodedStateFrame>>>>,
    frame: DecodedStateFrame,
) {
    {
        let mut log = event_log.lock_recover();
        log.push_back(frame.clone());
        while log.len() > STATE_EVENT_MAXIMUM_LIMIT {
            log.pop_front();
        }
    }
    subscribers
        .lock_recover()
        .retain(|subscriber| match subscriber.try_send(frame.clone()) {
            Ok(()) | Err(mpsc::TrySendError::Full(_)) => true,
            Err(mpsc::TrySendError::Disconnected(_)) => false,
        });
}

#[allow(clippy::too_many_arguments)]
fn ingest_incoming(
    state: &Arc<Mutex<BrokerStatus>>,
    connected: &mut ConnectedQc,
    latest_messages: &Arc<Mutex<HashMap<u16, IncomingMessage>>>,
    raw_events: &Arc<RawEventBus>,
    state_messages: &mpsc::SyncSender<StateDecoderCommand>,
    state_generation: u64,
    pending_requests: &mut Vec<PendingRequest>,
    message: IncomingMessage,
) {
    update_message(state, &mut connected.latest_messages, message.clone());
    latest_messages
        .lock_recover()
        .insert(message.message_type, message.clone());
    {
        let mut log = raw_events.log.lock_recover();
        log.push_back(message.clone());
        while log.len() > STATE_EVENT_MAXIMUM_LIMIT {
            log.pop_front();
        }
    }
    raw_events.subscribers.lock_recover().retain(|subscriber| {
        match subscriber.try_send(message.clone()) {
            Ok(()) | Err(mpsc::TrySendError::Full(_)) => true,
            Err(mpsc::TrySendError::Disconnected(_)) => false,
        }
    });
    let _ = state_messages.send(StateDecoderCommand::Message(
        state_generation,
        message.clone(),
    ));
    deliver_pending(pending_requests, &message);
}

fn run(
    state: Arc<Mutex<BrokerStatus>>,
    latest_messages: Arc<Mutex<HashMap<u16, IncomingMessage>>>,
    raw_events: Arc<RawEventBus>,
    state_messages: mpsc::SyncSender<StateDecoderCommand>,
    commands: mpsc::Receiver<Command>,
    initial_auto_connect: bool,
) {
    let session_clock = Instant::now();
    let mut session = TransportRuntime::new(0);
    let mut connection: Option<ConnectedQc> = None;
    let mut auto_connect = initial_auto_connect;
    let mut pending_requests: Vec<PendingRequest> = Vec::new();
    let mut backup: Option<BackupInProgress> = None;
    let mut state_generation = 0_u64;
    let mut command_not_before = Instant::now();
    loop {
        // The post-handshake settle window holds commands without sleeping on
        // this thread. Sleeping here used to stall the read path for the whole
        // window, which is exactly when the QC pushes its initial state burst.
        while Instant::now() >= command_not_before {
            let Ok(command) = commands.try_recv() else {
                break;
            };
            match command {
                Command::Reconnect { force, reply } => {
                    let phase = state.lock_recover().phase.clone();
                    if reconnect_is_satisfied(force, connection.is_some(), &phase) {
                        let _ = reply.send(());
                        continue;
                    }
                    if connection.take().is_some() {
                        session.outbound(session_clock.elapsed().as_millis() as u64);
                    }
                    fail_pending(&mut pending_requests, "Device session restarted");
                    fail_backup(&mut backup, "Device session restarted");
                    latest_messages.lock_recover().clear();
                    raw_events.log.lock_recover().clear();
                    state_generation = state_generation.saturating_add(1);
                    let _ = state_messages.send(StateDecoderCommand::Reset(state_generation));
                    auto_connect = true;
                    session.request_reconnect(session_clock.elapsed().as_millis() as u64);
                    set_phase(&state, "searching", "Reconnect requested", false, false);
                    let _ = reply.send(());
                }
                Command::Disconnect { reply } => {
                    connection = None;
                    fail_pending(&mut pending_requests, "Device session closed");
                    fail_backup(&mut backup, "Device session closed");
                    latest_messages.lock_recover().clear();
                    raw_events.log.lock_recover().clear();
                    state_generation = state_generation.saturating_add(1);
                    let _ = state_messages.send(StateDecoderCommand::Reset(state_generation));
                    auto_connect = false;
                    session.disconnect(session_clock.elapsed().as_millis() as u64, false);
                    set_phase(
                        &state,
                        "disconnected",
                        "Device session closed",
                        false,
                        false,
                    );
                    let _ = reply.send(());
                }
                Command::Send(message_type, payload, reply) => {
                    let result = if let Some(connected) = connection.as_mut() {
                        connected.usb.send(message_type, payload);
                        update_usb_telemetry(&state, connected);
                        session.outbound(session_clock.elapsed().as_millis() as u64);
                        Ok(())
                    } else {
                        Err("Quad Cortex is not connected".into())
                    };
                    let _ = reply.send(result);
                }
                Command::SendRealtime(message_type, payload) => {
                    if let Some(connected) = connection.as_mut() {
                        connected.usb.send(message_type, payload);
                        update_usb_telemetry(&state, connected);
                        session.outbound(session_clock.elapsed().as_millis() as u64);
                    }
                }
                Command::SendSequence {
                    messages,
                    delay,
                    interval,
                    reply,
                } => {
                    let result = if let Some(connected) = connection.as_mut() {
                        thread::sleep(delay);
                        for (index, message) in messages.iter().enumerate() {
                            connected.usb.send_command(message.clone());
                            update_usb_telemetry(&state, connected);
                            session.outbound(session_clock.elapsed().as_millis() as u64);
                            if index + 1 < messages.len() {
                                thread::sleep(interval);
                            }
                        }
                        Ok(())
                    } else {
                        Err("Quad Cortex is not connected".into())
                    };
                    let _ = reply.send(result);
                }
                Command::Request {
                    message_type,
                    payload,
                    expected_type,
                    request_id,
                    timeout,
                    reply,
                } => {
                    if let Some(connected) = connection.as_mut() {
                        pending_requests.push(PendingRequest {
                            expectation: ResponseExpectation::new(
                                expected_type,
                                request_id,
                                session_clock.elapsed().as_millis() as u64,
                                timeout.as_millis().min(u128::from(u64::MAX)) as u64,
                            ),
                            reply,
                        });
                        connected.usb.send(message_type, payload);
                        update_usb_telemetry(&state, connected);
                        session.outbound(session_clock.elapsed().as_millis() as u64);
                    } else {
                        let _ = reply.send(Err("Quad Cortex is not connected".into()));
                    }
                }
                Command::CreateBackup { timeout, reply } => {
                    if backup.is_some() {
                        let _ = reply.send(Err("A device backup is already in progress".into()));
                    } else if let Some(connected) = connection.as_mut() {
                        // Pending requests are deliberately not failed: the read
                        // path keeps serving them while the document streams.
                        connected.usb.send_command(commands::create_local_backup());
                        update_usb_telemetry(&state, connected);
                        // Clear any armed Version probe: the device is about to
                        // go quiet, and a probe left armed both tears the session
                        // down and blocks the KeepAlive the transfer needs.
                        session.suspend_liveness_probe(session_clock.elapsed().as_millis() as u64);
                        backup = Some(BackupInProgress::start(
                            session_clock.elapsed().as_millis() as u64,
                            timeout,
                            reply,
                        ));
                        set_phase(
                            &state,
                            "syncing",
                            "Creating device backup",
                            true,
                            connected.synchronized,
                        );
                    } else {
                        let _ = reply.send(Err("Quad Cortex is not connected".into()));
                    }
                }
                Command::Stop => {
                    fail_pending(&mut pending_requests, "Native broker stopped");
                    fail_backup(&mut backup, "Native broker stopped");
                    let _ = state_messages.send(StateDecoderCommand::Stop);
                    return;
                }
            }
        }

        let now_ms = session_clock.elapsed().as_millis() as u64;
        if connection.is_none() && auto_connect && session.reconnect_due(now_ms) {
            session.reconnect_attempted(now_ms);
            set_phase(
                &state,
                "connecting",
                "Opening native QC USB session",
                false,
                false,
            );
            let started = Instant::now();
            match QcUsb::connect(&mut session, &session_clock, |attempt, telemetry| {
                let mut status = state.lock_recover();
                status.phase = "handshaking".into();
                status.detail =
                    format!("Waiting for Quad Cortex ResetCommsBuffers reply (attempt {attempt})");
                status.connected = false;
                status.synchronized = false;
                status.messages_sent = telemetry.messages_sent;
                status.expected_write_stalls = telemetry.expected_write_stalls;
                status.last_hid_write_duration_ms = telemetry.last_hid_write_duration_ms;
                status.max_hid_write_duration_ms = telemetry.max_hid_write_duration_ms;
                status.last_hid_write_completed = telemetry.last_hid_write_completed;
                status.messages_sent_by_type = telemetry.messages_sent_by_type;
            }) {
                Ok(connected) => {
                    let handshake_ms = started.elapsed().as_millis();
                    state_generation = state_generation.saturating_add(1);
                    let _ = state_messages.send(StateDecoderCommand::Reset(state_generation));
                    install_connection_status(&state, &connected, handshake_ms);
                    *latest_messages.lock_recover() = connected.latest_messages.clone();
                    {
                        // Replay the burst as it arrived. Replaying only the
                        // newest message per type dropped every incremental
                        // push, and a preset-folder listing is one message per
                        // folder.
                        //
                        // The state runtime consumes this same ordered burst on
                        // its bounded decoder lane; the USB host does not
                        // maintain a second preset-library cache.
                        let initial = connected.initial_messages.clone();
                        for message in &initial {
                            let _ = state_messages.send(StateDecoderCommand::Message(
                                state_generation,
                                message.clone(),
                            ));
                        }
                        let mut log = raw_events.log.lock_recover();
                        log.clear();
                        log.extend(initial);
                    }
                    // The QC reports its initial preset before its control loop
                    // is always ready to accept the first host mutation. Hold
                    // only that first post-handshake write briefly; subsequent
                    // commands remain on the zero-debounce realtime lane.
                    command_not_before = Instant::now()
                        + Duration::from_millis(
                            qc_protocol::profile::POST_INITIALIZATION_WRITE_DELAY_MS,
                        );
                    connection = Some(connected);
                }
                Err(UsbError::NotAvailable) => {
                    session.disconnect(session_clock.elapsed().as_millis() as u64, true);
                    set_phase(
                        &state,
                        "searching",
                        "Quad Cortex is not attached or is owned by another application",
                        false,
                        false,
                    );
                }
                Err(error) => {
                    session.disconnect(session_clock.elapsed().as_millis() as u64, true);
                    set_phase(&state, "error", &error.to_string(), false, false);
                }
            }
        }

        if let Some(connected) = connection.as_mut() {
            match connected
                .usb
                .read_message(&mut session, CONNECTED_IO_POLL_MS)
            {
                Ok(Some(message)) => {
                    session.read_succeeded();
                    let was_synchronized = connected.synchronized;
                    if let Err(error) = connected.observe_lifecycle(&message, now_ms) {
                        let detail = format!("QC session lifecycle failed: {error}");
                        set_phase(&state, "searching", &detail, false, false);
                        fail_pending(&mut pending_requests, &detail);
                        fail_backup(&mut backup, &detail);
                        session.disconnect(now_ms, true);
                        connection = None;
                        continue;
                    }
                    update_lifecycle_status(&state, connected, was_synchronized);
                    session.state_observed(
                        session_clock.elapsed().as_millis() as u64,
                        connected.synchronized,
                    );
                    if message.message_type == qc_protocol::profile::MESSAGE_TYPE_LOCAL_BACKUP
                        && backup.is_some()
                    {
                        let outcome = backup.as_mut().and_then(|active| {
                            active.absorb(
                                session_clock.elapsed().as_millis() as u64,
                                &message.payload,
                            )
                        });
                        if let Some(outcome) = outcome {
                            finish_backup(&mut backup, &state, connected, outcome);
                        }
                    } else {
                        ingest_incoming(
                            &state,
                            connected,
                            &latest_messages,
                            &raw_events,
                            &state_messages,
                            state_generation,
                            &mut pending_requests,
                            message,
                        );
                    }
                }
                Ok(None) => session.read_succeeded(),
                Err(error) => {
                    if !session.read_failed() {
                        continue;
                    }
                    set_phase(
                        &state,
                        "searching",
                        &format!("USB link lost: {error}"),
                        false,
                        false,
                    );
                    fail_pending(&mut pending_requests, &format!("USB link lost: {error}"));
                    fail_backup(&mut backup, &format!("USB link lost: {error}"));
                    session.disconnect(session_clock.elapsed().as_millis() as u64, true);
                    connection = None;
                    continue;
                }
            }
            let backup_action = backup.as_mut().map(|active| {
                active
                    .runtime
                    .advance(session_clock.elapsed().as_millis() as u64)
            });
            match backup_action {
                Some(BackupAction::Keepalive) => {
                    connected.usb.send_command(commands::keepalive());
                    update_usb_telemetry(&state, connected);
                    session.suspend_liveness_probe(session_clock.elapsed().as_millis() as u64);
                }
                Some(BackupAction::Rerequest) => {
                    connected.usb.send_command(commands::create_local_backup());
                    update_usb_telemetry(&state, connected);
                    session.suspend_liveness_probe(session_clock.elapsed().as_millis() as u64);
                }
                Some(BackupAction::Failed(error)) => {
                    finish_backup(&mut backup, &state, connected, Err(error));
                }
                Some(BackupAction::Wait) | None => {}
            }
            let now_ms = session_clock.elapsed().as_millis() as u64;
            let was_synchronized = connected.synchronized;
            if let Err(error) = connected.advance_lifecycle(now_ms) {
                let detail = format!("QC session lifecycle failed: {error}");
                set_phase(&state, "searching", &detail, false, false);
                fail_pending(&mut pending_requests, &detail);
                fail_backup(&mut backup, &detail);
                session.disconnect(now_ms, true);
                connection = None;
                continue;
            }
            update_lifecycle_status(&state, connected, was_synchronized);
            // Device loss is detected by read errors, as in the reference
            // client: a write carries no information because every QC write
            // stalls its status stage. The old Version-probe teardown is gone
            // with the probe itself - the session is now held open by the
            // dedicated KeepAlive below rather than proven by a correlated read.
            // A running backup owns the keepalive on its own unconditional clock,
            // so the idle probe stands down for the whole transfer.
            if backup.is_none() {
                if let Some(keepalive) = session.take_keepalive(now_ms) {
                    // The QC needs its dedicated KeepAlive on a fixed cadence,
                    // the same message Cortex Control and the reference client
                    // send every five seconds. A Version READ is answered, so
                    // the link looks alive, but it does not hold the session
                    // open.
                    connected.usb.send_command(keepalive);
                    update_usb_telemetry(&state, connected);
                }
            }
        } else {
            thread::sleep(Duration::from_millis(100));
        }
        expire_pending(
            &mut pending_requests,
            session_clock.elapsed().as_millis() as u64,
        );
    }
}

fn update_lifecycle_status(
    state: &Arc<Mutex<BrokerStatus>>,
    connected: &ConnectedQc,
    was_synchronized: bool,
) {
    if connected.synchronized == was_synchronized {
        return;
    }
    set_phase(
        state,
        if connected.synchronized {
            "ready"
        } else {
            "syncing"
        },
        if connected.synchronized {
            "Active preset synchronized"
        } else {
            "QC requested an in-session state rebuild"
        },
        true,
        connected.synchronized,
    );
}

/// Deliver a backup's terminal outcome and restore the session phase.
fn finish_backup(
    backup: &mut Option<BackupInProgress>,
    state: &Arc<Mutex<BrokerStatus>>,
    connected: &ConnectedQc,
    outcome: Result<String, String>,
) {
    let Some(active) = backup.take() else {
        return;
    };
    let succeeded = outcome.is_ok();
    let _ = active.reply.send(outcome);
    set_phase(
        state,
        if connected.synchronized {
            "ready"
        } else {
            "syncing"
        },
        if succeeded {
            "Device backup complete"
        } else {
            "Device backup failed; USB session remains open"
        },
        true,
        connected.synchronized,
    );
}

/// Abandon an in-flight backup because the session it belonged to is gone.
fn fail_backup(backup: &mut Option<BackupInProgress>, detail: &str) {
    if let Some(active) = backup.take() {
        let _ = active.reply.send(Err(detail.to_string()));
    }
}

fn reconnect_is_satisfied(force: bool, connected: bool, phase: &str) -> bool {
    !force && (connected || matches!(phase, "connecting" | "handshaking" | "syncing" | "ready"))
}

fn deliver_pending(pending: &mut Vec<PendingRequest>, message: &IncomingMessage) {
    if let Some(index) = pending.iter().position(|request| {
        request
            .expectation
            .matches(message.message_type, &message.payload)
    }) {
        let request = pending.remove(index);
        let _ = request.reply.send(Ok(message.clone()));
    }
}

fn expire_pending(pending: &mut Vec<PendingRequest>, now_ms: u64) {
    let mut index = 0;
    while index < pending.len() {
        if pending[index].expectation.expired(now_ms) {
            let request = pending.remove(index);
            let _ = request
                .reply
                .send(Err(request.expectation.timeout_message()));
        } else {
            index += 1;
        }
    }
}

fn fail_pending(pending: &mut Vec<PendingRequest>, detail: &str) {
    for request in pending.drain(..) {
        let _ = request.reply.send(Err(detail.into()));
    }
}

fn set_phase(
    state: &Arc<Mutex<BrokerStatus>>,
    phase: &str,
    detail: &str,
    connected: bool,
    synchronized: bool,
) {
    let mut status = state.lock_recover();
    status.phase = phase.into();
    status.detail = detail.into();
    status.connected = connected;
    status.synchronized = synchronized;
    if !connected {
        status.active_preset_name = None;
        status.active_scene = None;
        status.connected_at_unix_ms = None;
    }
}

fn install_connection_status(
    state: &Arc<Mutex<BrokerStatus>>,
    connection: &ConnectedQc,
    handshake_ms: u128,
) {
    let mut status = state.lock_recover();
    status.phase = if connection.synchronized {
        "ready"
    } else {
        "syncing"
    }
    .into();
    status.detail = if connection.synchronized {
        "Active preset synchronized"
    } else {
        "Handshake complete; waiting for active preset"
    }
    .into();
    status.connected = true;
    status.synchronized = connection.synchronized;
    status.active_preset_name = connection
        .latest_messages
        .get(&15)
        .and_then(|message| crate::usb::preset_name(&message.payload));
    status.active_scene = connection
        .latest_messages
        .get(&13)
        .and_then(|message| crate::usb::scene_value(&message.payload));
    status.connected_at_unix_ms = Some(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
    );
    status.handshake_ms = Some(handshake_ms);
    status.messages_received = connection.message_counts.values().sum::<usize>() as u64;
    status.messages_received_by_type = connection
        .message_counts
        .iter()
        .map(|(message_type, count)| (*message_type, *count as u64))
        .collect();
    let telemetry = connection.usb.telemetry();
    status.messages_sent = telemetry.messages_sent;
    status.expected_write_stalls = telemetry.expected_write_stalls;
    status.last_hid_write_duration_ms = telemetry.last_hid_write_duration_ms;
    status.max_hid_write_duration_ms = telemetry.max_hid_write_duration_ms;
    status.last_hid_write_completed = telemetry.last_hid_write_completed;
    status.messages_sent_by_type = telemetry.messages_sent_by_type;
    status.last_message_type = connection
        .latest_messages
        .values()
        .max_by_key(|message| message.sequence)
        .map(|message| message.message_type);
}

fn update_usb_telemetry(state: &Arc<Mutex<BrokerStatus>>, connection: &ConnectedQc) {
    let telemetry = connection.usb.telemetry();
    let mut status = state.lock_recover();
    status.messages_sent = telemetry.messages_sent;
    status.expected_write_stalls = telemetry.expected_write_stalls;
    status.last_hid_write_duration_ms = telemetry.last_hid_write_duration_ms;
    status.max_hid_write_duration_ms = telemetry.max_hid_write_duration_ms;
    status.last_hid_write_completed = telemetry.last_hid_write_completed;
    status.messages_sent_by_type = telemetry.messages_sent_by_type;
}

fn update_message(
    state: &Arc<Mutex<BrokerStatus>>,
    latest: &mut HashMap<u16, IncomingMessage>,
    message: IncomingMessage,
) {
    let message_type = message.message_type;
    let preset_name = if message_type == qc_protocol::profile::MESSAGE_TYPE_RECALL_PRESET {
        crate::usb::preset_name(&message.payload)
    } else {
        None
    };
    let active_scene = if message_type == qc_protocol::profile::MESSAGE_TYPE_SCENE {
        crate::usb::scene_value(&message.payload)
    } else {
        None
    };
    latest.insert(message_type, message);
    let mut status = state.lock_recover();
    status.messages_received = status.messages_received.saturating_add(1);
    let count = status
        .messages_received_by_type
        .entry(message_type)
        .or_default();
    *count = count.saturating_add(1);
    status.last_message_type = Some(message_type);
    if message_type == qc_protocol::profile::MESSAGE_TYPE_RECALL_PRESET {
        status.phase = "ready".into();
        status.detail = "Active preset synchronized".into();
        status.synchronized = true;
        status.active_preset_name = preset_name;
    }
    if let Some(scene) = active_scene {
        status.active_scene = Some(scene)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use prost::Message as _;
    use qc_protocol::proto::cortex_protobuf_v2 as pa;

    fn backup_chunk(json: &str, last: bool) -> Vec<u8> {
        pa::LocalBackupMessage {
            backup_json: Some(pa::local_backup_message::BackupJson::BackupJson(
                json.into(),
            )),
            is_last_chunk: last.then_some(pa::local_backup_message::IsLastChunk::IsLastChunk(true)),
            ..Default::default()
        }
        .encode_to_vec()
    }

    fn started_backup(
        timeout: Duration,
    ) -> (BackupInProgress, mpsc::Receiver<Result<String, String>>) {
        let (reply, receiver) = mpsc::channel();
        (BackupInProgress::start(0, timeout, reply), receiver)
    }

    #[test]
    fn every_remote_touch_gesture_uses_the_paced_sequence_lane() {
        assert_eq!(
            qc_device_runtime::request::operation_inter_message_interval_ms(
                &DeviceOperation::ScreenTap { x: 10.0, y: 20.0 }
            ),
            qc_protocol::profile::REMOTE_GESTURE_INTERVAL_MS
        );
        assert_eq!(
            qc_device_runtime::request::operation_inter_message_interval_ms(
                &DeviceOperation::ScreenDrag {
                    x: 10.0,
                    y: 20.0,
                    to_x: 30.0,
                    to_y: 40.0,
                }
            ),
            qc_protocol::profile::REMOTE_GESTURE_INTERVAL_MS
        );
        assert_eq!(
            qc_device_runtime::request::operation_inter_message_interval_ms(&DeviceOperation::Undo),
            0
        );
    }

    #[test]
    fn backup_streams_on_the_device_loop_without_a_nested_read_loop() {
        let (mut backup, _receiver) = started_backup(Duration::from_secs(60));
        assert!(backup
            .absorb(1, &backup_chunk("{\"type\":\"backup\",", false))
            .is_none());
        // A partial document keeps the transfer alive rather than blocking.
        assert!(matches!(backup.runtime.advance(2), BackupAction::Wait));
        let outcome = backup.absorb(3, &backup_chunk("\"creator\":\"quad\"}", true));
        assert_eq!(
            outcome.expect("terminal outcome").expect("document"),
            "{\"type\":\"backup\",\"creator\":\"quad\"}"
        );
    }

    #[test]
    fn a_backup_stands_the_idle_probe_down_instead_of_tearing_the_session_down() {
        let mut session = TransportRuntime::new(0);
        session.transport_opened(0);
        session.handshake_completed(1, true);
        session.liveness_probe_sent(1);
        assert!(
            session.liveness_probe_timed_out(1 + qc_protocol::profile::LIVENESS_REPLY_TIMEOUT_MS)
        );

        // Starting a backup disarms the probe, so the device's silence while it
        // prepares the document cannot end the session.
        session.suspend_liveness_probe(2);
        assert!(!session.liveness_probe_timed_out(u64::MAX));
        // ...and the KeepAlive the transfer needs is able to come due again.
        assert!(session.keepalive_due(2 + qc_protocol::profile::KEEPALIVE_INTERVAL_MS));
    }

    #[test]
    fn an_abandoned_session_reports_to_the_backup_caller() {
        let (backup, receiver) = started_backup(Duration::from_secs(600));
        let mut active = Some(backup);
        fail_backup(&mut active, "USB link lost: cable removed");
        assert!(active.is_none());
        assert_eq!(
            receiver.recv().expect("caller notified"),
            Err("USB link lost: cable removed".to_string())
        );
    }

    #[test]
    fn poisoned_cache_locks_recover_without_cascading_worker_failure() {
        let value = Arc::new(Mutex::new(41_u32));
        let poison = Arc::clone(&value);
        let _ = thread::spawn(move || {
            let _guard = poison.lock().expect("initial lock");
            panic!("test poison");
        })
        .join();

        *value.lock_recover() += 1;
        assert_eq!(*value.lock_recover(), 42);
    }

    #[test]
    fn accepted_library_mutations_update_the_session_catalog() {
        let controller = DeviceController::start_disconnected();
        let name = "QC MCP CACHE TEST";
        controller
            .record_library_mutation("device.createSetlist", &serde_json::json!({"name": name}));
        assert!(controller
            .preset_folders()
            .iter()
            .any(|folder| folder.name == name));
        controller
            .record_library_mutation("device.deleteSetlist", &serde_json::json!({"name": name}));
        assert!(!controller
            .preset_folders()
            .iter()
            .any(|folder| folder.name == name));
    }

    #[test]
    fn authoritative_saved_catalog_entry_updates_the_active_snapshot_name() {
        let controller = DeviceController::start_disconnected();
        *controller.device_state.lock_recover().snapshot_mut() = GatewaySnapshot {
            has_preset: true,
            setlist_key: "/media/p4/Presets/My Presets".into(),
            preset_position: 15,
            preset_name: "Old".into(),
            ..GatewaySnapshot::default()
        };
        controller.record_saved_preset("/media/p4/Presets/My Presets", 15, "Renamed", 0);
        assert_eq!(
            controller.gateway_snapshot().unwrap().preset_name,
            "Renamed"
        );
    }

    #[test]
    fn stalled_state_subscribers_are_bounded_and_do_not_block_publication() {
        let event_log = Arc::new(Mutex::new(VecDeque::new()));
        let (subscriber, receiver) = mpsc::sync_channel(1);
        let subscribers = Arc::new(Mutex::new(vec![subscriber]));
        let frame = DecodedStateFrame {
            sequence: 1,
            observed_at: 0,
            states: Vec::new(),
            tempo_clock: None,
        };

        publish_state_frame(&event_log, &subscribers, frame.clone());
        publish_state_frame(
            &event_log,
            &subscribers,
            DecodedStateFrame {
                sequence: 2,
                ..frame
            },
        );

        assert_eq!(receiver.try_recv().expect("first queued frame").sequence, 1);
        assert!(receiver.try_recv().is_err());
        assert_eq!(event_log.lock_recover().len(), 2);
    }

    #[test]
    fn default_status_distinguishes_searching_from_ready() {
        let status = BrokerStatus::default();
        assert_eq!(status.phase, "searching");
        assert!(!status.connected);
        assert!(!status.synchronized);
    }

    #[test]
    fn realtime_queue_rejects_a_disconnected_session_before_acceptance() {
        let controller = DeviceController::start_disconnected();
        let error = controller
            .send_realtime_command(commands::select_scene(1))
            .expect_err("disconnected realtime send must fail");
        assert!(error.contains("not connected"));
    }

    #[test]
    fn gateway_snapshot_reduces_native_updates_without_python() {
        let mut snapshot = GatewaySnapshot::default();
        let mut position = StateUpdate::empty("position");
        position.position = Some(17);
        position.setlist_key = Some("/media/p4/Presets/Live/".into());
        snapshot.apply(&position);

        let mut preset = StateUpdate::empty("preset");
        preset.preset_name = Some("Direct Rust".into());
        preset.tempo = Some(96);
        preset.scenes = Some(
            (b'A'..=b'H')
                .map(|letter| format!("Scene {}", letter as char))
                .collect(),
        );
        preset.blocks = Some(Vec::new());
        preset.routes = Some(Vec::new());
        snapshot.apply(&preset);

        let mut volume = StateUpdate::empty("master");
        volume.master_volume = Some(0.57);
        snapshot.apply(&volume);

        assert!(snapshot.has_preset);
        assert_eq!(snapshot.preset_name, "Direct Rust");
        assert_eq!(snapshot.preset_location, "3B");
        assert_eq!(snapshot.setlist_name, "Live");
        assert_eq!(snapshot.tempo, 96);
        assert_eq!(snapshot.master_volume, 57);
    }

    #[test]
    fn normal_reconnect_does_not_restart_an_active_or_connecting_session() {
        for phase in ["connecting", "handshaking", "syncing", "ready"] {
            assert!(reconnect_is_satisfied(false, phase == "ready", phase));
        }
        assert!(!reconnect_is_satisfied(false, false, "searching"));
        assert!(!reconnect_is_satisfied(false, false, "disconnected"));
    }

    #[test]
    fn forced_session_reset_always_restarts() {
        assert!(!reconnect_is_satisfied(true, true, "ready"));
        assert!(!reconnect_is_satisfied(true, false, "connecting"));
    }
}
