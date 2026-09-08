//! Shared recovery policy for chunked backup/update forwarding.
//!
//! This module deliberately performs no HTTP. Device-supplied URLs and headers
//! remain untrusted, and no network execution path exists until a complete
//! origin allowlist, redirect, credential, and response-size policy is defined.

use prost::Message;
use qc_protocol::forward::UpdaterForwardRequest;
use qc_protocol::proto::cortex_protobuf_v2 as pa;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ForwardFamily {
    Backups,
    Updater,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferIdentity {
    pub family: ForwardFamily,
    pub service_request_id: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TransferPhase {
    Receiving,
    Complete,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TransferFailure {
    OverallTimeout,
    StreamStalled,
    MaximumBytesExceeded { maximum_bytes: usize },
    RemoteError { code: i32 },
    TransportLost,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TransferEvent {
    Progress { chunks: usize, bytes: usize },
    Complete { chunks: usize, bytes: usize },
    IgnoredStale { service_request_id: u64 },
    Cancelled,
    Failed { failure: TransferFailure },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ChunkTransferPolicy {
    pub total_timeout_ms: u64,
    pub stall_timeout_ms: u64,
    pub maximum_bytes: usize,
}

/// One service-request stream. There is intentionally no retry/replay action:
/// once a chunk has been accepted, recovery is cancellation or a fresh service
/// request ID after the current stream has drained.
#[derive(Debug)]
pub struct ChunkTransferRuntime {
    identity: TransferIdentity,
    policy: ChunkTransferPolicy,
    phase: TransferPhase,
    failure: Option<TransferFailure>,
    chunks: usize,
    bytes: usize,
    deadline_ms: u64,
    progress_deadline_ms: u64,
}

impl ChunkTransferRuntime {
    pub fn start(identity: TransferIdentity, now_ms: u64, policy: ChunkTransferPolicy) -> Self {
        let deadline_ms = now_ms.saturating_add(policy.total_timeout_ms);
        Self {
            identity,
            policy,
            phase: TransferPhase::Receiving,
            failure: None,
            chunks: 0,
            bytes: 0,
            deadline_ms,
            progress_deadline_ms: now_ms
                .saturating_add(policy.stall_timeout_ms)
                .min(deadline_ms),
        }
    }

    pub fn identity(&self) -> TransferIdentity {
        self.identity
    }

    pub fn phase(&self) -> TransferPhase {
        self.phase
    }

    pub fn failure(&self) -> Option<&TransferFailure> {
        self.failure.as_ref()
    }

    pub fn absorb(
        &mut self,
        service_request_id: u64,
        payload_bytes: usize,
        is_last_chunk: Option<bool>,
        error_code: Option<i32>,
        now_ms: u64,
    ) -> TransferEvent {
        if service_request_id != self.identity.service_request_id
            || self.phase != TransferPhase::Receiving
        {
            return TransferEvent::IgnoredStale { service_request_id };
        }
        if let Some(code) = error_code.filter(|code| *code != 0) {
            return self.fail(TransferFailure::RemoteError { code });
        }
        let Some(bytes) = self.bytes.checked_add(payload_bytes) else {
            return self.fail(TransferFailure::MaximumBytesExceeded {
                maximum_bytes: self.policy.maximum_bytes,
            });
        };
        if bytes > self.policy.maximum_bytes {
            return self.fail(TransferFailure::MaximumBytesExceeded {
                maximum_bytes: self.policy.maximum_bytes,
            });
        }
        self.bytes = bytes;
        self.chunks = self.chunks.saturating_add(1);
        self.progress_deadline_ms = now_ms
            .saturating_add(self.policy.stall_timeout_ms)
            .min(self.deadline_ms);
        if is_last_chunk == Some(true) {
            self.phase = TransferPhase::Complete;
            TransferEvent::Complete {
                chunks: self.chunks,
                bytes: self.bytes,
            }
        } else {
            TransferEvent::Progress {
                chunks: self.chunks,
                bytes: self.bytes,
            }
        }
    }

    pub fn advance(&mut self, now_ms: u64) -> Option<TransferEvent> {
        if self.phase != TransferPhase::Receiving {
            return None;
        }
        if now_ms >= self.deadline_ms {
            return Some(self.fail(TransferFailure::OverallTimeout));
        }
        if now_ms >= self.progress_deadline_ms {
            return Some(self.fail(TransferFailure::StreamStalled));
        }
        None
    }

    pub fn cancel(&mut self) -> TransferEvent {
        if self.phase != TransferPhase::Receiving {
            return TransferEvent::IgnoredStale {
                service_request_id: self.identity.service_request_id,
            };
        }
        self.phase = TransferPhase::Cancelled;
        TransferEvent::Cancelled
    }

    pub fn transport_lost(&mut self) -> TransferEvent {
        if self.phase != TransferPhase::Receiving {
            return TransferEvent::IgnoredStale {
                service_request_id: self.identity.service_request_id,
            };
        }
        self.fail(TransferFailure::TransportLost)
    }

    fn fail(&mut self, failure: TransferFailure) -> TransferEvent {
        self.phase = TransferPhase::Failed;
        self.failure = Some(failure.clone());
        TransferEvent::Failed { failure }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NetworkExecutionDecision {
    Disabled,
}

/// Network forwarding is intentionally not activatable in the current public
/// runtime. Adding an `Allowed` variant is a security-sensitive future change.
pub fn network_execution_decision() -> NetworkExecutionDecision {
    NetworkExecutionDecision::Disabled
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdaterPhase {
    Idle,
    RequestingData,
    DownloadingData,
    Updating,
    AwaitingReboot,
    Reconnecting,
    AwaitingDeviceConfirmation,
    CancelRequested,
    Cancelled,
    Complete,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdaterOperation {
    Check,
    CheckAndDownload,
    Install,
    RestartDownloadViaControl,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdaterStatus {
    None,
    NewVersionAvailable,
    NewVersionDownloaded,
    NoNewVersion,
    Unknown(i32),
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdaterSnapshot {
    pub phase: UpdaterPhase,
    pub operation: Option<UpdaterOperation>,
    pub status: Option<UpdaterStatus>,
    pub updater_request_id: Option<u64>,
    pub download_progress: Option<f32>,
    pub installation_progress: Option<f32>,
    pub error: Option<String>,
}

#[derive(Debug, Default)]
pub struct UpdaterTransferRuntime {
    updater_request_id: Option<u64>,
    phase: Option<UpdaterPhase>,
    operation: Option<UpdaterOperation>,
    status: Option<UpdaterStatus>,
    download_progress: Option<f32>,
    installation_progress: Option<f32>,
    error: Option<String>,
}

impl UpdaterTransferRuntime {
    pub fn new() -> Self {
        Self {
            phase: Some(UpdaterPhase::Idle),
            ..Self::default()
        }
    }

    pub fn snapshot(&self) -> UpdaterSnapshot {
        UpdaterSnapshot {
            phase: self.phase.unwrap_or(UpdaterPhase::Idle),
            operation: self.operation,
            status: self.status,
            updater_request_id: self.updater_request_id,
            download_progress: self.download_progress,
            installation_progress: self.installation_progress,
            error: self.error.clone(),
        }
    }

    pub fn begin_operation(
        &mut self,
        operation: UpdaterOperation,
    ) -> Result<UpdaterSnapshot, String> {
        if !matches!(
            self.phase,
            Some(
                UpdaterPhase::Idle
                    | UpdaterPhase::Cancelled
                    | UpdaterPhase::Complete
                    | UpdaterPhase::Failed
            )
        ) {
            return Err("an updater operation is already active".into());
        }
        self.operation = Some(operation);
        self.status = None;
        self.error = None;
        self.download_progress = None;
        self.installation_progress = None;
        self.phase = Some(match operation {
            UpdaterOperation::Install => UpdaterPhase::Updating,
            _ => UpdaterPhase::RequestingData,
        });
        Ok(self.snapshot())
    }

    /// Record a decoded device-originated forward request without executing its
    /// URL. A new nonzero request ID supersedes only an idle/terminal lifecycle.
    pub fn observe_forward_request(
        &mut self,
        request: &UpdaterForwardRequest,
    ) -> Result<UpdaterSnapshot, String> {
        if let Some(active) = self.updater_request_id {
            let terminal = matches!(
                self.phase,
                Some(
                    UpdaterPhase::Idle
                        | UpdaterPhase::Cancelled
                        | UpdaterPhase::Complete
                        | UpdaterPhase::Failed
                )
            );
            if request.updater_request_id == active && terminal {
                return Err(format!(
                    "stale updater-forward request reused terminal id {active}"
                ));
            }
            if request.updater_request_id != active && !terminal {
                return Err(format!(
                    "stale updater-forward request {} arrived while {} is active",
                    request.updater_request_id, active
                ));
            }
            if request.updater_request_id != active {
                // A fresh service request is a separate lifecycle. Do not let
                // the previous operation influence completion inference for a
                // device-originated request whose operation is not yet known.
                self.operation = None;
                self.status = None;
                self.download_progress = None;
                self.installation_progress = None;
                self.error = None;
            }
        }
        self.updater_request_id = Some(request.updater_request_id);
        self.phase = Some(match request.request_type {
            3 => UpdaterPhase::DownloadingData,
            0..=2 => UpdaterPhase::RequestingData,
            _ => {
                self.error = Some(format!(
                    "unsupported updater-forward request type {}",
                    request.request_type
                ));
                UpdaterPhase::Failed
            }
        });
        Ok(self.snapshot())
    }

    pub fn observe_device(&mut self, payload: &[u8]) -> Result<UpdaterSnapshot, String> {
        let message = pa::UpdaterMessage::decode(payload).map_err(|error| error.to_string())?;
        if message.action != pa::message_action::Enum::Update as i32 {
            return Err("Updater lifecycle requires an UPDATE message".into());
        }
        if let Some(progress) =
            finite_progress(message.download_progress.map(|value| match value {
                pa::updater_message::DownloadProgress::DownloadProgress(value) => value,
            }))?
        {
            self.download_progress = Some(progress);
        }
        if let Some(progress) =
            finite_progress(message.installation_progress.map(|value| match value {
                pa::updater_message::InstallationProgress::InstallationProgress(value) => value,
            }))?
        {
            self.installation_progress = Some(progress);
        }
        let state = message.state.map(|value| match value {
            pa::updater_message::State::State(value) => value,
        });
        if let Some(value) = message.status.map(|value| match value {
            pa::updater_message::Status::Status(value) => value,
        }) {
            self.status = Some(match value {
                0 => UpdaterStatus::None,
                1 => UpdaterStatus::NewVersionAvailable,
                2 => UpdaterStatus::NewVersionDownloaded,
                3 => UpdaterStatus::NoNewVersion,
                other => UpdaterStatus::Unknown(other),
            });
        }
        if self.phase == Some(UpdaterPhase::CancelRequested) && state == Some(0) {
            self.phase = Some(UpdaterPhase::Cancelled);
            return Ok(self.snapshot());
        }
        let previous_phase = self.phase;
        self.phase = Some(match state {
            Some(0) if self.phase == Some(UpdaterPhase::AwaitingDeviceConfirmation) => {
                UpdaterPhase::Complete
            }
            Some(0)
                if matches!(
                    (self.operation, self.status),
                    (
                        Some(UpdaterOperation::Check),
                        Some(UpdaterStatus::NewVersionAvailable | UpdaterStatus::NoNewVersion)
                    ) | (
                        Some(
                            UpdaterOperation::CheckAndDownload
                                | UpdaterOperation::RestartDownloadViaControl
                        ),
                        Some(UpdaterStatus::NewVersionDownloaded)
                    )
                ) =>
            {
                UpdaterPhase::Complete
            }
            Some(0)
                if self.operation == Some(UpdaterOperation::Install)
                    && previous_phase == Some(UpdaterPhase::Updating) =>
            {
                // Some firmware completes without a reboot transition. Idle is
                // still required; progress alone is never terminal.
                UpdaterPhase::Complete
            }
            Some(0) => UpdaterPhase::Idle,
            Some(1) => UpdaterPhase::RequestingData,
            Some(2) => UpdaterPhase::DownloadingData,
            Some(3) => UpdaterPhase::Updating,
            Some(4) => UpdaterPhase::AwaitingReboot,
            Some(5) => {
                self.error = Some("device reported updater failure".into());
                UpdaterPhase::Failed
            }
            Some(other) => {
                self.error = Some(format!("unknown updater state {other}"));
                UpdaterPhase::Failed
            }
            None => self.phase.unwrap_or(UpdaterPhase::Idle),
        });
        Ok(self.snapshot())
    }

    pub fn request_cancel(&mut self) -> Result<UpdaterSnapshot, String> {
        if !matches!(
            self.phase,
            Some(UpdaterPhase::RequestingData | UpdaterPhase::DownloadingData)
        ) {
            return Err("updater cancellation is allowed only before installation".into());
        }
        self.phase = Some(UpdaterPhase::CancelRequested);
        Ok(self.snapshot())
    }

    pub fn transport_disconnected(&mut self) -> UpdaterSnapshot {
        if self.phase == Some(UpdaterPhase::AwaitingReboot) {
            self.phase = Some(UpdaterPhase::Reconnecting);
        } else if !matches!(
            self.phase,
            Some(UpdaterPhase::Idle | UpdaterPhase::Cancelled | UpdaterPhase::Complete)
        ) {
            self.phase = Some(UpdaterPhase::Failed);
            self.error = Some("transport lost during updater transfer".into());
        }
        self.snapshot()
    }

    pub fn transport_reconnected(&mut self) -> UpdaterSnapshot {
        if self.phase == Some(UpdaterPhase::Reconnecting) {
            self.phase = Some(UpdaterPhase::AwaitingDeviceConfirmation);
        }
        self.snapshot()
    }
}

fn finite_progress(value: Option<f32>) -> Result<Option<f32>, String> {
    match value {
        Some(value) if !value.is_finite() => Err("updater progress must be finite".into()),
        value => Ok(value),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use qc_protocol::forward::UntrustedUrl;

    fn policy() -> ChunkTransferPolicy {
        ChunkTransferPolicy {
            total_timeout_ms: 1_000,
            stall_timeout_ms: 100,
            maximum_bytes: 16,
        }
    }

    #[test]
    fn chunks_complete_once_and_stale_ids_never_splice() {
        let mut runtime = ChunkTransferRuntime::start(
            TransferIdentity {
                family: ForwardFamily::Backups,
                service_request_id: 7,
            },
            0,
            policy(),
        );
        assert_eq!(
            runtime.absorb(6, 4, Some(true), None, 1),
            TransferEvent::IgnoredStale {
                service_request_id: 6
            }
        );
        assert_eq!(
            runtime.absorb(7, 4, Some(false), None, 2),
            TransferEvent::Progress {
                chunks: 1,
                bytes: 4
            }
        );
        assert_eq!(
            runtime.absorb(7, 5, Some(true), None, 3),
            TransferEvent::Complete {
                chunks: 2,
                bytes: 9
            }
        );
        assert!(matches!(
            runtime.absorb(7, 1, Some(true), None, 4),
            TransferEvent::IgnoredStale { .. }
        ));
    }

    #[test]
    fn started_streams_fail_without_retry_or_splicing() {
        let mut runtime = ChunkTransferRuntime::start(
            TransferIdentity {
                family: ForwardFamily::Updater,
                service_request_id: 9,
            },
            0,
            policy(),
        );
        runtime.absorb(9, 4, None, None, 1);
        assert_eq!(
            runtime.advance(101),
            Some(TransferEvent::Failed {
                failure: TransferFailure::StreamStalled
            })
        );
        assert_eq!(runtime.phase(), TransferPhase::Failed);
        assert!(matches!(
            runtime.absorb(9, 4, Some(true), None, 102),
            TransferEvent::IgnoredStale { .. }
        ));
    }

    #[test]
    fn cancellation_and_remote_errors_are_terminal() {
        let identity = TransferIdentity {
            family: ForwardFamily::Backups,
            service_request_id: 2,
        };
        let mut cancelled = ChunkTransferRuntime::start(identity, 0, policy());
        assert_eq!(cancelled.cancel(), TransferEvent::Cancelled);
        assert_eq!(cancelled.phase(), TransferPhase::Cancelled);

        let mut failed = ChunkTransferRuntime::start(identity, 0, policy());
        assert_eq!(
            failed.absorb(2, 0, Some(true), Some(23), 1),
            TransferEvent::Failed {
                failure: TransferFailure::RemoteError { code: 23 }
            }
        );
    }

    #[test]
    fn bounds_and_transport_loss_have_distinct_failures() {
        let identity = TransferIdentity {
            family: ForwardFamily::Updater,
            service_request_id: 4,
        };
        let mut oversized = ChunkTransferRuntime::start(identity, 0, policy());
        assert_eq!(
            oversized.absorb(4, 17, None, None, 1),
            TransferEvent::Failed {
                failure: TransferFailure::MaximumBytesExceeded { maximum_bytes: 16 }
            }
        );

        let mut timed_out = ChunkTransferRuntime::start(identity, 0, policy());
        assert_eq!(
            timed_out.advance(1_000),
            Some(TransferEvent::Failed {
                failure: TransferFailure::OverallTimeout
            })
        );

        let mut disconnected = ChunkTransferRuntime::start(identity, 0, policy());
        assert_eq!(
            disconnected.transport_lost(),
            TransferEvent::Failed {
                failure: TransferFailure::TransportLost
            }
        );
    }

    #[test]
    fn network_execution_has_no_enable_path() {
        assert_eq!(
            network_execution_decision(),
            NetworkExecutionDecision::Disabled
        );
    }

    #[test]
    fn updater_reboot_requires_reconnect_and_device_confirmation() {
        let mut runtime = UpdaterTransferRuntime::new();
        let message = |state| {
            pa::UpdaterMessage {
                action: pa::message_action::Enum::Update as i32,
                state: Some(pa::updater_message::State::State(state)),
                ..Default::default()
            }
            .encode_to_vec()
        };
        assert_eq!(
            runtime.observe_device(&message(4)).unwrap().phase,
            UpdaterPhase::AwaitingReboot
        );
        assert_eq!(
            runtime.transport_disconnected().phase,
            UpdaterPhase::Reconnecting
        );
        assert_eq!(
            runtime.transport_reconnected().phase,
            UpdaterPhase::AwaitingDeviceConfirmation
        );
        assert_eq!(
            runtime.observe_device(&message(0)).unwrap().phase,
            UpdaterPhase::Complete
        );
    }

    #[test]
    fn updater_status_completes_only_the_matching_operation() {
        let mut runtime = UpdaterTransferRuntime::new();
        runtime.begin_operation(UpdaterOperation::Check).unwrap();
        let available = pa::UpdaterMessage {
            action: pa::message_action::Enum::Update as i32,
            state: Some(pa::updater_message::State::State(0)),
            status: Some(pa::updater_message::Status::Status(1)),
            ..Default::default()
        }
        .encode_to_vec();
        let snapshot = runtime.observe_device(&available).unwrap();
        assert_eq!(snapshot.phase, UpdaterPhase::Complete);
        assert_eq!(snapshot.status, Some(UpdaterStatus::NewVersionAvailable));

        runtime
            .begin_operation(UpdaterOperation::CheckAndDownload)
            .unwrap();
        assert_eq!(
            runtime.observe_device(&available).unwrap().phase,
            UpdaterPhase::Idle
        );
    }

    #[test]
    fn sparse_updater_messages_preserve_progress_and_fresh_ids_clear_old_operation() {
        let mut runtime = UpdaterTransferRuntime::new();
        runtime.begin_operation(UpdaterOperation::Check).unwrap();
        let progress = pa::UpdaterMessage {
            action: pa::message_action::Enum::Update as i32,
            state: Some(pa::updater_message::State::State(2)),
            download_progress: Some(pa::updater_message::DownloadProgress::DownloadProgress(
                0.25,
            )),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(
            runtime.observe_device(&progress).unwrap().download_progress,
            Some(0.25)
        );

        let sparse = pa::UpdaterMessage {
            action: pa::message_action::Enum::Update as i32,
            ..Default::default()
        }
        .encode_to_vec();
        let snapshot = runtime.observe_device(&sparse).unwrap();
        assert_eq!(snapshot.phase, UpdaterPhase::DownloadingData);
        assert_eq!(snapshot.download_progress, Some(0.25));

        let failed = pa::UpdaterMessage {
            action: pa::message_action::Enum::Update as i32,
            state: Some(pa::updater_message::State::State(5)),
            ..Default::default()
        }
        .encode_to_vec();
        runtime.observe_device(&failed).unwrap();
        runtime.updater_request_id = Some(1);
        let fresh = UpdaterForwardRequest {
            action: 0,
            request_id: None,
            updater_request_id: 2,
            request_type: 0,
            url: UntrustedUrl("https://untrusted.invalid".into()),
            timeout: 30,
            headers: Vec::new(),
            payload: None,
        };
        let snapshot = runtime.observe_forward_request(&fresh).unwrap();
        assert_eq!(snapshot.operation, None);
        assert_eq!(snapshot.status, None);
        assert_eq!(snapshot.download_progress, None);
    }

    #[test]
    fn updater_rejects_stale_request_ids_and_late_cancellation() {
        let request = |id, request_type| UpdaterForwardRequest {
            action: 0,
            request_id: None,
            updater_request_id: id,
            request_type,
            url: UntrustedUrl("https://untrusted.invalid".into()),
            timeout: 30,
            headers: Vec::new(),
            payload: None,
        };
        let mut runtime = UpdaterTransferRuntime::new();
        assert_eq!(
            runtime
                .observe_forward_request(&request(1, 3))
                .unwrap()
                .phase,
            UpdaterPhase::DownloadingData
        );
        assert!(runtime.observe_forward_request(&request(2, 3)).is_err());
        assert_eq!(
            runtime.request_cancel().unwrap().phase,
            UpdaterPhase::CancelRequested
        );

        let updating = pa::UpdaterMessage {
            action: pa::message_action::Enum::Update as i32,
            state: Some(pa::updater_message::State::State(3)),
            ..Default::default()
        }
        .encode_to_vec();
        runtime.observe_device(&updating).unwrap();
        assert!(runtime.request_cancel().is_err());

        let failed = pa::UpdaterMessage {
            action: pa::message_action::Enum::Update as i32,
            state: Some(pa::updater_message::State::State(5)),
            ..Default::default()
        }
        .encode_to_vec();
        runtime.observe_device(&failed).unwrap();
        assert!(runtime.observe_forward_request(&request(1, 3)).is_err());
        assert_eq!(
            runtime
                .observe_forward_request(&request(2, 0))
                .unwrap()
                .phase,
            UpdaterPhase::RequestingData
        );
    }
}
