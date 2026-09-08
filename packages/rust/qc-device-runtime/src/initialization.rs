//! Shared post-handshake synchronization policy.
//!
//! Hosts drive this state machine from their own event loop. It decides which
//! QC commands are sent and when synchronization is complete; the host merely
//! performs writes and feeds observed message types back in.

use prost::Message;
use qc_protocol::commands::{self, OutboundMessage};
use qc_protocol::profile;
use qc_protocol::proto::cortex_protobuf_v2 as pa;
use qc_protocol::state::parse_model_repo;
use std::collections::HashSet;

/// Cortex Control's device-state lifecycle. The older `InitializationRuntime`
/// below still owns post-boot preset seeding; this runtime owns the protocol
/// gates which must complete before that seeding may start.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeviceStartupPhase {
    SessionValidating,
    VersionValidating,
    Disconnected,
    Building,
    Initializing,
    Booting,
    Connected,
    Invalid,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum DeviceStartupError {
    Undefined = 1,
    ParseMessageFailure = 2,
    InvalidCloudEndpoint = 3,
    StateError = 4,
    ModelRepositoryDataError = 5,
    ModuleStatisticsDataError = 6,
    SessionMismatch = 7,
    UnsupportedDevice = 8,
    IncompatibleControllerVersion = 9,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DeviceStartupAction {
    Wait,
    Send(Vec<OutboundMessage>),
    /// Send the Disconnected-state writes, then let the host confirm that its
    /// external dependencies are ready before calling `begin_building`.
    SendThenBuild(Vec<OutboundMessage>),
    Connected,
    Invalid(DeviceStartupError),
    Failed(DeviceStartupError),
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct DeviceStartupOptions {
    /// Cortex Control obtains File.short_listing from its device/controller
    /// interface at runtime. Quad Cortex uses false; the option keeps the
    /// recovered dynamic field explicit for other supported device types.
    pub short_file_listing: bool,
}

/// Deterministic staged startup policy recovered from Cortex Control 4.1.0.
#[derive(Debug)]
pub struct DeviceStartupRuntime {
    phase: DeviceStartupPhase,
    session_id: String,
    next_request_id: u64,
    options: DeviceStartupOptions,
    error: Option<DeviceStartupError>,
    observed_types: HashSet<u16>,
}

impl DeviceStartupRuntime {
    pub fn start(request_id: u64, session_id: impl Into<String>) -> (Self, Vec<OutboundMessage>) {
        Self::start_with_options(request_id, session_id, DeviceStartupOptions::default())
    }

    pub fn start_with_options(
        request_id: u64,
        session_id: impl Into<String>,
        options: DeviceStartupOptions,
    ) -> (Self, Vec<OutboundMessage>) {
        let session_id = session_id.into();
        (
            Self {
                phase: DeviceStartupPhase::SessionValidating,
                session_id: session_id.clone(),
                next_request_id: request_id.saturating_add(1),
                options,
                error: None,
                observed_types: HashSet::new(),
            },
            vec![commands::reset_comms(request_id, session_id)],
        )
    }

    pub fn phase(&self) -> DeviceStartupPhase {
        self.phase
    }

    pub fn error(&self) -> Option<DeviceStartupError> {
        self.error
    }

    /// Begin the bounded live-state seed with every message already observed
    /// during staged startup. This keeps an early preset/scene/mode push from
    /// being forgotten just because the final Updater gate arrived later.
    pub fn post_boot_initialization(
        &mut self,
        now_ms: u64,
    ) -> Result<InitializationRuntime, DeviceStartupError> {
        if self.phase != DeviceStartupPhase::Connected {
            return Err(DeviceStartupError::StateError);
        }
        let request_id = self.take_request_id();
        let mut initialization = InitializationRuntime::start_post_boot(now_ms, request_id);
        for message_type in &self.observed_types {
            initialization.observe(*message_type);
        }
        Ok(initialization)
    }

    /// The external connection controller enters Building only after its
    /// dependencies are ready. Keeping this edge explicit prevents a valid
    /// Version response from collapsing every startup write into one burst.
    pub fn begin_building(&mut self) -> DeviceStartupAction {
        if self.phase != DeviceStartupPhase::Disconnected {
            return self.fail(DeviceStartupError::StateError);
        }
        self.phase = DeviceStartupPhase::Building;
        DeviceStartupAction::Send(commands::building_initialization())
    }

    pub fn observe(&mut self, message_type: u16, payload: &[u8]) -> DeviceStartupAction {
        if payload.len() > profile::MAX_FRAME_BYTES {
            return self.fail(DeviceStartupError::ParseMessageFailure);
        }
        self.observed_types.insert(message_type);

        if message_type == profile::MESSAGE_TYPE_CONNECTION && self.handles_connection() {
            let message = match pa::ConnectionMessage::decode(payload) {
                Ok(message) => message,
                Err(_) => return self.fail(DeviceStartupError::ParseMessageFailure),
            };
            if matches!(
                message.connected,
                Some(pa::connection_message::Connected::Connected(false))
            ) {
                // A fresh in-session build must prove a fresh authoritative
                // seed. Observations from the prior Connected epoch cannot
                // make the rebuilt session ready.
                self.observed_types.clear();
                self.observed_types
                    .insert(profile::MESSAGE_TYPE_CONNECTION);
                self.phase = DeviceStartupPhase::Disconnected;
                self.error = None;
                let request_id = self.take_request_id();
                return DeviceStartupAction::SendThenBuild(
                    commands::disconnect_initialization_exact(request_id),
                );
            }
            return DeviceStartupAction::Wait;
        }

        match (self.phase, message_type) {
            (DeviceStartupPhase::SessionValidating, profile::MESSAGE_TYPE_RESET_COMMS_BUFFERS) => {
                self.observe_reset(payload)
            }
            (DeviceStartupPhase::VersionValidating, profile::MESSAGE_TYPE_VERSION) => {
                self.observe_version(payload)
            }
            (DeviceStartupPhase::VersionValidating, profile::MESSAGE_TYPE_GENERIC_ERROR) => {
                self.observe_version_error(payload)
            }
            (DeviceStartupPhase::Building, profile::MESSAGE_TYPE_MODEL_REPO) => {
                self.observe_model_repo(payload)
            }
            (DeviceStartupPhase::Initializing, profile::MESSAGE_TYPE_MODULE_STATS) => {
                self.observe_module_stats(payload)
            }
            (DeviceStartupPhase::Booting, profile::MESSAGE_TYPE_UPDATER) => {
                self.observe_updater(payload)
            }
            // In every state which dispatches Version, answer a device READ
            // with the controller version without treating it as validation.
            (
                DeviceStartupPhase::Building
                | DeviceStartupPhase::Initializing
                | DeviceStartupPhase::Booting
                | DeviceStartupPhase::Connected
                | DeviceStartupPhase::Disconnected,
                profile::MESSAGE_TYPE_VERSION,
            ) => self.answer_version_read(payload),
            _ => DeviceStartupAction::Wait,
        }
    }

    fn handles_connection(&self) -> bool {
        matches!(
            self.phase,
            DeviceStartupPhase::SessionValidating
                | DeviceStartupPhase::VersionValidating
                | DeviceStartupPhase::Building
                | DeviceStartupPhase::Initializing
                | DeviceStartupPhase::Booting
                | DeviceStartupPhase::Connected
        )
    }

    fn observe_reset(&mut self, payload: &[u8]) -> DeviceStartupAction {
        let message = match pa::ResetCommsBuffersMessage::decode(payload) {
            Ok(message) => message,
            Err(_) => return self.fail(DeviceStartupError::ParseMessageFailure),
        };
        let session_id = message.session_id.map(|value| match value {
            pa::reset_comms_buffers_message::SessionId::SessionId(value) => value,
        });
        // Cortex Control's gate is the opaque session id. Some firmware does
        // not echo optional request ids consistently, so do not invent a
        // stronger requirement than the reference implementation.
        if session_id.as_deref() != Some(&self.session_id) {
            return self.invalidate(DeviceStartupError::SessionMismatch);
        }
        self.phase = DeviceStartupPhase::VersionValidating;
        DeviceStartupAction::Send(vec![commands::read_version()])
    }

    fn observe_version(&mut self, payload: &[u8]) -> DeviceStartupAction {
        let message = match pa::VersionMessage::decode(payload) {
            Ok(message) => message,
            Err(_) => return self.fail(DeviceStartupError::ParseMessageFailure),
        };
        if message.action == pa::message_action::Enum::Read as i32 {
            return DeviceStartupAction::Send(vec![commands::version_hello()]);
        }
        if message.action != pa::message_action::Enum::Update as i32 {
            return self.fail(DeviceStartupError::StateError);
        }
        let device_type = message.device_type.map(|value| match value {
            pa::version_message::DeviceTypeOneOf::DeviceType(value) => value,
        });
        if device_type != Some(pa::version_message::DeviceType::Qc as i32) {
            return self.invalidate(DeviceStartupError::UnsupportedDevice);
        }
        let version_valid = message
            .cortex_control_version_valid
            .map(|value| match value {
                pa::version_message::CortexControlVersionValid::CortexControlVersionValid(
                    value,
                ) => value,
            });
        // Retail CorOS may omit this optional field on a successful Version
        // reply. Only an explicit false is a compatibility rejection.
        if version_valid == Some(false) {
            return self.invalidate(DeviceStartupError::IncompatibleControllerVersion);
        }
        self.phase = DeviceStartupPhase::Disconnected;
        self.error = None;
        let request_id = self.take_request_id();
        DeviceStartupAction::SendThenBuild(commands::disconnect_initialization_exact(request_id))
    }

    fn observe_version_error(&mut self, payload: &[u8]) -> DeviceStartupAction {
        let message = match pa::GenericErrorMessage::decode(payload) {
            Ok(message) => message,
            Err(_) => return self.fail(DeviceStartupError::ParseMessageFailure),
        };
        let code = message.error_code.map(|value| match value {
            pa::generic_error_message::ErrorCodeOneOf::ErrorCode(value) => value,
        });
        if matches!(code, Some(0 | 1)) {
            self.invalidate(DeviceStartupError::IncompatibleControllerVersion)
        } else {
            DeviceStartupAction::Wait
        }
    }

    fn observe_model_repo(&mut self, payload: &[u8]) -> DeviceStartupAction {
        let catalog = match parse_model_repo(payload) {
            Ok(catalog) if catalog.model_list().audit.model_count > 0 => catalog,
            _ => return self.fail(DeviceStartupError::ModelRepositoryDataError),
        };
        // Parsing is the installability gate. The host remains responsible for
        // moving the same payload to its catalog worker after startup.
        drop(catalog);
        self.phase = DeviceStartupPhase::Initializing;
        self.error = None;
        DeviceStartupAction::Send(commands::module_stats_initialization())
    }

    fn observe_module_stats(&mut self, payload: &[u8]) -> DeviceStartupAction {
        let message = match pa::ModuleStatsMessage::decode(payload) {
            Ok(message) => message,
            Err(_) => return self.fail(DeviceStartupError::ModuleStatisticsDataError),
        };
        if message.action != pa::message_action::Enum::Update as i32 {
            return self.fail(DeviceStartupError::ModuleStatisticsDataError);
        }
        if message.stats.is_empty()
            && message.core_stats.is_empty()
            && message.size_relations.is_empty()
            && message.valid_id.is_empty()
        {
            return self.fail(DeviceStartupError::ModuleStatisticsDataError);
        }
        self.phase = DeviceStartupPhase::Booting;
        self.error = None;
        let request_id = self.take_request_id();
        DeviceStartupAction::Send(commands::boot_initialization_exact(
            request_id,
            self.options.short_file_listing,
        ))
    }

    fn observe_updater(&mut self, payload: &[u8]) -> DeviceStartupAction {
        let message = match pa::UpdaterMessage::decode(payload) {
            Ok(message) => message,
            Err(_) => return self.fail(DeviceStartupError::ParseMessageFailure),
        };
        if message.action != pa::message_action::Enum::Update as i32 {
            return self.fail(DeviceStartupError::StateError);
        }
        self.phase = DeviceStartupPhase::Connected;
        self.error = None;
        DeviceStartupAction::Connected
    }

    fn answer_version_read(&mut self, payload: &[u8]) -> DeviceStartupAction {
        let message = match pa::VersionMessage::decode(payload) {
            Ok(message) => message,
            Err(_) => return self.fail(DeviceStartupError::ParseMessageFailure),
        };
        if message.action == pa::message_action::Enum::Read as i32 {
            DeviceStartupAction::Send(vec![commands::version_hello()])
        } else {
            DeviceStartupAction::Wait
        }
    }

    fn fail(&mut self, error: DeviceStartupError) -> DeviceStartupAction {
        self.phase = DeviceStartupPhase::Failed;
        self.error = Some(error);
        DeviceStartupAction::Failed(error)
    }

    fn invalidate(&mut self, error: DeviceStartupError) -> DeviceStartupAction {
        self.phase = DeviceStartupPhase::Invalid;
        self.error = Some(error);
        DeviceStartupAction::Invalid(error)
    }

    fn take_request_id(&mut self) -> u64 {
        let request_id = self.next_request_id;
        self.next_request_id = self.next_request_id.saturating_add(1);
        request_id
    }
}

/// The small authoritative state seed needed before the control surface can be
/// treated as coherent. Large File catalogs remain explicitly on demand.
pub const REQUIRED_SEED_TYPES: &[u16] = &[
    profile::MESSAGE_TYPE_SETLIST_POSITION,
    profile::MESSAGE_TYPE_SCENE,
    profile::MESSAGE_TYPE_MODE,
    profile::MESSAGE_TYPE_MASTER_VOLUME,
    profile::MESSAGE_TYPE_PRESET_DIRTY,
];

/// CorOS normally publishes this seed immediately after the preset. Three
/// seconds matches the proven Windows path and is now defined only here.
pub const INITIAL_SEED_TIMEOUT_MS: u64 = 3_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum InitializationPhase {
    InitialPreset,
    RequestedPreset,
    Seed,
    Complete,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InitializationAction {
    Wait,
    Send(Vec<OutboundMessage>),
    Complete { synchronized: bool },
}

#[derive(Debug)]
pub struct InitializationRuntime {
    phase: InitializationPhase,
    deadline_ms: u64,
    request_id: u64,
    observed_types: HashSet<u16>,
    synchronized: bool,
}

impl InitializationRuntime {
    /// Start the canonical subscription/connection burst. `unix_time_ms` is
    /// device-facing wall time; `now_ms` is the host's monotonic clock.
    pub fn start(now_ms: u64, unix_time_ms: u64, request_id: u64) -> (Self, Vec<OutboundMessage>) {
        (
            Self {
                phase: InitializationPhase::InitialPreset,
                deadline_ms: now_ms.saturating_add(profile::INITIAL_SYNC_TIMEOUT_MS),
                request_id,
                observed_types: HashSet::new(),
                synchronized: false,
            },
            commands::initialization(unix_time_ms),
        )
    }

    /// Start only the bounded post-boot preset/state seed. Native hosts using
    /// [`DeviceStartupRuntime`] have already performed the staged Version,
    /// ModelRepo, ModuleStats, and boot-subscription sequence and must not send
    /// the legacy collapsed initialization burst a second time.
    pub fn start_post_boot(now_ms: u64, request_id: u64) -> Self {
        Self {
            phase: InitializationPhase::InitialPreset,
            deadline_ms: now_ms.saturating_add(profile::INITIAL_SYNC_TIMEOUT_MS),
            request_id,
            observed_types: HashSet::new(),
            synchronized: false,
        }
    }

    pub fn observe(&mut self, message_type: u16) {
        self.observed_types.insert(message_type);
        if message_type == profile::MESSAGE_TYPE_RECALL_PRESET {
            self.synchronized = true;
        }
    }

    pub fn synchronized(&self) -> bool {
        self.synchronized
    }

    pub fn is_complete(&self) -> bool {
        self.phase == InitializationPhase::Complete
    }

    pub fn advance(&mut self, now_ms: u64) -> InitializationAction {
        match self.phase {
            InitializationPhase::InitialPreset if self.synchronized => self.begin_seed(now_ms),
            InitializationPhase::InitialPreset if now_ms >= self.deadline_ms => {
                self.phase = InitializationPhase::RequestedPreset;
                self.deadline_ms = now_ms.saturating_add(profile::PRESET_SYNC_TIMEOUT_MS);
                InitializationAction::Send(vec![commands::read_current_preset(self.request_id)])
            }
            InitializationPhase::RequestedPreset
                if self.synchronized || now_ms >= self.deadline_ms =>
            {
                self.begin_seed(now_ms)
            }
            InitializationPhase::Seed if self.seed_complete() || now_ms >= self.deadline_ms => {
                self.phase = InitializationPhase::Complete;
                InitializationAction::Complete {
                    synchronized: self.ready(),
                }
            }
            InitializationPhase::Complete => InitializationAction::Complete {
                synchronized: self.ready(),
            },
            _ => InitializationAction::Wait,
        }
    }

    fn begin_seed(&mut self, now_ms: u64) -> InitializationAction {
        let messages = REQUIRED_SEED_TYPES
            .iter()
            .copied()
            .filter(|message_type| !self.observed_types.contains(message_type))
            .map(commands::read)
            .collect::<Vec<_>>();
        if messages.is_empty() {
            self.phase = InitializationPhase::Complete;
            InitializationAction::Complete {
                synchronized: self.synchronized,
            }
        } else {
            self.phase = InitializationPhase::Seed;
            self.deadline_ms = now_ms.saturating_add(INITIAL_SEED_TIMEOUT_MS);
            InitializationAction::Send(messages)
        }
    }

    fn seed_complete(&self) -> bool {
        REQUIRED_SEED_TYPES
            .iter()
            .all(|message_type| self.observed_types.contains(message_type))
    }

    fn ready(&self) -> bool {
        self.synchronized && self.seed_complete()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn reset_reply(request_id: u64, session_id: &str) -> Vec<u8> {
        pa::ResetCommsBuffersMessage {
            request_id: Some(pa::reset_comms_buffers_message::RequestId::RequestId(
                request_id,
            )),
            session_id: Some(pa::reset_comms_buffers_message::SessionId::SessionId(
                session_id.into(),
            )),
        }
        .encode_to_vec()
    }

    fn valid_version() -> Vec<u8> {
        pa::VersionMessage {
            action: pa::message_action::Enum::Update as i32,
            device_type: Some(pa::version_message::DeviceTypeOneOf::DeviceType(
                pa::version_message::DeviceType::Qc as i32,
            )),
            cortex_control_version_valid: Some(
                pa::version_message::CortexControlVersionValid::CortexControlVersionValid(true),
            ),
            ..Default::default()
        }
        .encode_to_vec()
    }

    fn valid_model_repo() -> Vec<u8> {
        pa::ModelRepoMessage {
            action: pa::message_action::Enum::Update as i32,
            model_repo_payload: Some(
                pa::model_repo_message::ModelRepoPayload::ModelRepoPayload(
                    br#"<Models><Category name="Drive"><Model id="1" name="Test" /></Category></Models>"#
                        .to_vec(),
                ),
            ),
            ..Default::default()
        }
        .encode_to_vec()
    }

    fn enter_building(runtime: &mut DeviceStartupRuntime) {
        assert!(matches!(
            runtime.observe(
                profile::MESSAGE_TYPE_RESET_COMMS_BUFFERS,
                &reset_reply(7, "session")
            ),
            DeviceStartupAction::Send(messages)
                if messages == vec![commands::read_version()]
        ));
        assert!(matches!(
            runtime.observe(profile::MESSAGE_TYPE_VERSION, &valid_version()),
            DeviceStartupAction::SendThenBuild(messages)
                if messages == commands::disconnect_initialization_exact(8)
        ));
        assert!(matches!(
            runtime.begin_building(),
            DeviceStartupAction::Send(messages)
                if messages == commands::building_initialization()
        ));
    }

    #[test]
    fn recovered_startup_path_is_strictly_staged() {
        let (mut runtime, entry) = DeviceStartupRuntime::start(7, "session");
        assert_eq!(entry, vec![commands::reset_comms(7, "session")]);
        enter_building(&mut runtime);

        assert!(matches!(
            runtime.observe(profile::MESSAGE_TYPE_MODEL_REPO, &valid_model_repo()),
            DeviceStartupAction::Send(messages)
                if messages == commands::module_stats_initialization()
        ));
        let module_stats = pa::ModuleStatsMessage {
            action: pa::message_action::Enum::Update as i32,
            stats: vec![pa::ModuleStatsItem::default()],
            ..Default::default()
        }
        .encode_to_vec();
        assert!(matches!(
            runtime.observe(profile::MESSAGE_TYPE_MODULE_STATS, &module_stats),
            DeviceStartupAction::Send(messages)
                if messages == commands::boot_initialization_exact(9, false)
        ));
        assert_eq!(runtime.phase(), DeviceStartupPhase::Booting);

        // Mere state traffic cannot bypass the final Updater gate.
        assert_eq!(
            runtime.observe(profile::MESSAGE_TYPE_RECALL_PRESET, &[]),
            DeviceStartupAction::Wait
        );
        let updater = pa::UpdaterMessage {
            action: pa::message_action::Enum::Update as i32,
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(
            runtime.observe(profile::MESSAGE_TYPE_UPDATER, &updater),
            DeviceStartupAction::Connected
        );
        assert_eq!(runtime.phase(), DeviceStartupPhase::Connected);

        let mut seed = runtime
            .post_boot_initialization(100)
            .expect("connected startup may begin its state seed");
        assert!(
            seed.synchronized(),
            "the preset observed before Updater is retained"
        );
        let InitializationAction::Send(messages) = seed.advance(100) else {
            panic!("missing state fields should produce a bounded seed read");
        };
        assert!(messages
            .iter()
            .all(|message| message.message_type != profile::MESSAGE_TYPE_RECALL_PRESET));
    }

    #[test]
    fn reset_reply_requires_session_correlation_without_requiring_request_echo() {
        let (mut runtime, _) = DeviceStartupRuntime::start(7, "expected");
        assert_eq!(
            runtime.observe(
                profile::MESSAGE_TYPE_RESET_COMMS_BUFFERS,
                &reset_reply(7, "other")
            ),
            DeviceStartupAction::Invalid(DeviceStartupError::SessionMismatch)
        );
        assert_eq!(runtime.phase(), DeviceStartupPhase::Invalid);

        let (mut runtime, _) = DeviceStartupRuntime::start(7, "expected");
        assert!(matches!(
            runtime.observe(
                profile::MESSAGE_TYPE_RESET_COMMS_BUFFERS,
                &reset_reply(8, "expected")
            ),
            DeviceStartupAction::Send(messages) if messages == vec![commands::read_version()]
        ));
    }

    #[test]
    fn decoded_startup_failures_retain_their_specific_error() {
        let (mut runtime, _) = DeviceStartupRuntime::start(7, "session");
        assert!(matches!(
            runtime.observe(
                profile::MESSAGE_TYPE_RESET_COMMS_BUFFERS,
                &reset_reply(7, "session")
            ),
            DeviceStartupAction::Send(_)
        ));
        let incompatible = pa::GenericErrorMessage {
            error_code: Some(pa::generic_error_message::ErrorCodeOneOf::ErrorCode(0)),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(
            runtime.observe(profile::MESSAGE_TYPE_GENERIC_ERROR, &incompatible),
            DeviceStartupAction::Invalid(DeviceStartupError::IncompatibleControllerVersion)
        );

        let (mut runtime, _) = DeviceStartupRuntime::start(7, "session");
        enter_building(&mut runtime);
        assert_eq!(
            runtime.observe(profile::MESSAGE_TYPE_MODEL_REPO, &[0xff]),
            DeviceStartupAction::Failed(DeviceStartupError::ModelRepositoryDataError)
        );
    }

    #[test]
    fn omitted_legacy_compatibility_flag_is_not_treated_as_rejection() {
        let (mut runtime, _) = DeviceStartupRuntime::start(7, "session");
        assert!(matches!(
            runtime.observe(
                profile::MESSAGE_TYPE_RESET_COMMS_BUFFERS,
                &reset_reply(7, "session")
            ),
            DeviceStartupAction::Send(_)
        ));
        let legacy_version = pa::VersionMessage {
            action: pa::message_action::Enum::Update as i32,
            device_type: Some(pa::version_message::DeviceTypeOneOf::DeviceType(
                pa::version_message::DeviceType::Qc as i32,
            )),
            cortex_control_version_valid: None,
            ..Default::default()
        }
        .encode_to_vec();
        assert!(matches!(
            runtime.observe(profile::MESSAGE_TYPE_VERSION, &legacy_version),
            DeviceStartupAction::SendThenBuild(_)
        ));
        assert_eq!(runtime.phase(), DeviceStartupPhase::Disconnected);
    }

    #[test]
    fn connection_false_returns_an_active_startup_to_disconnected() {
        let (mut runtime, _) = DeviceStartupRuntime::start(7, "session");
        enter_building(&mut runtime);
        let disconnected = pa::ConnectionMessage {
            connected: Some(pa::connection_message::Connected::Connected(false)),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(
            runtime.observe(profile::MESSAGE_TYPE_CONNECTION, &disconnected),
            DeviceStartupAction::SendThenBuild(commands::disconnect_initialization_exact(9))
        );
        assert_eq!(runtime.phase(), DeviceStartupPhase::Disconnected);
    }

    #[test]
    fn an_unsolicited_preset_skips_the_explicit_preset_read() {
        let (mut runtime, initial) = InitializationRuntime::start(10, 20, 41);
        assert!(initial.len() > REQUIRED_SEED_TYPES.len());
        runtime.observe(profile::MESSAGE_TYPE_RECALL_PRESET);
        let InitializationAction::Send(seed) = runtime.advance(11) else {
            panic!("missing state seed");
        };
        assert_eq!(seed.len(), REQUIRED_SEED_TYPES.len());
        assert!(seed
            .iter()
            .all(|message| message.message_type != profile::MESSAGE_TYPE_RECALL_PRESET));
    }

    #[test]
    fn a_missing_preset_is_requested_once_before_seeding() {
        let (mut runtime, _) = InitializationRuntime::start(0, 0, 77);
        let InitializationAction::Send(read) = runtime.advance(profile::INITIAL_SYNC_TIMEOUT_MS)
        else {
            panic!("missing explicit preset read");
        };
        assert_eq!(read.len(), 1);
        assert_eq!(read[0].message_type, profile::MESSAGE_TYPE_RECALL_PRESET);
        assert_eq!(
            runtime.advance(profile::INITIAL_SYNC_TIMEOUT_MS + 1),
            InitializationAction::Wait
        );
    }

    #[test]
    fn post_boot_seed_does_not_replay_the_startup_burst() {
        let mut runtime = InitializationRuntime::start_post_boot(100, 77);
        assert_eq!(runtime.advance(101), InitializationAction::Wait);
        assert!(matches!(
            runtime.advance(100 + profile::INITIAL_SYNC_TIMEOUT_MS),
            InitializationAction::Send(messages)
                if messages == vec![commands::read_current_preset(77)]
        ));
    }

    #[test]
    fn seed_completion_has_one_shared_readiness_definition() {
        let (mut runtime, _) = InitializationRuntime::start(0, 0, 1);
        runtime.observe(profile::MESSAGE_TYPE_RECALL_PRESET);
        for message_type in REQUIRED_SEED_TYPES {
            runtime.observe(*message_type);
        }
        assert_eq!(
            runtime.advance(1),
            InitializationAction::Complete { synchronized: true }
        );
        assert!(runtime.is_complete());
    }

    #[test]
    fn a_device_without_a_preset_reaches_a_bounded_incomplete_state() {
        let (mut runtime, _) = InitializationRuntime::start(0, 0, 1);
        assert!(matches!(
            runtime.advance(profile::INITIAL_SYNC_TIMEOUT_MS),
            InitializationAction::Send(_)
        ));
        let preset_deadline = profile::INITIAL_SYNC_TIMEOUT_MS + profile::PRESET_SYNC_TIMEOUT_MS;
        assert!(matches!(
            runtime.advance(preset_deadline),
            InitializationAction::Send(_)
        ));
        assert_eq!(
            runtime.advance(preset_deadline + INITIAL_SEED_TIMEOUT_MS),
            InitializationAction::Complete {
                synchronized: false
            }
        );
    }

    #[test]
    fn a_preset_without_the_required_state_seed_is_not_ready() {
        let (mut runtime, _) = InitializationRuntime::start(0, 0, 1);
        runtime.observe(profile::MESSAGE_TYPE_RECALL_PRESET);
        assert!(matches!(runtime.advance(1), InitializationAction::Send(_)));
        assert_eq!(
            runtime.advance(1 + INITIAL_SEED_TIMEOUT_MS),
            InitializationAction::Complete {
                synchronized: false
            }
        );
    }
}
