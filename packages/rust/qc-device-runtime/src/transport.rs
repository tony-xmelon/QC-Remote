//! Platform-neutral QC transport engine.
//!
//! Native hosts own USB handles and move raw reports. This type owns the
//! device-facing session policy and HID framing so Android and Windows cannot
//! make different decisions about report layout, handshake cadence, link
//! readiness, keepalives, or frame recovery.

use prost::Message;
use qc_protocol::commands::{self, OutboundMessage};
use qc_protocol::framing::{self, FrameAssembler, FrameError};
use qc_protocol::profile;
use qc_protocol::proto::cortex_protobuf_v2 as pa;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionPhase {
    Disconnected,
    Searching,
    Handshaking,
    Syncing,
    Ready,
}

#[derive(Debug)]
struct SessionMachine {
    phase: SessionPhase,
    auto_reconnect: bool,
    next_reconnect_at_ms: u64,
    handshake_started_at_ms: Option<u64>,
    handshake_attempts: u32,
    next_handshake_at_ms: u64,
    next_keepalive_at_ms: u64,
    consecutive_read_errors: u8,
    synchronized: bool,
}

impl SessionMachine {
    fn new(now_ms: u64) -> Self {
        Self {
            phase: SessionPhase::Searching,
            auto_reconnect: true,
            next_reconnect_at_ms: now_ms,
            handshake_started_at_ms: None,
            handshake_attempts: 0,
            next_handshake_at_ms: now_ms,
            next_keepalive_at_ms: now_ms.saturating_add(profile::KEEPALIVE_INTERVAL_MS),
            consecutive_read_errors: 0,
            synchronized: false,
        }
    }

    fn reset_connection_state(&mut self, now_ms: u64) {
        self.handshake_started_at_ms = None;
        self.handshake_attempts = 0;
        self.next_handshake_at_ms = now_ms;
        self.next_keepalive_at_ms = now_ms.saturating_add(profile::KEEPALIVE_INTERVAL_MS);
        self.consecutive_read_errors = 0;
        self.synchronized = false;
    }

    fn phase(&self) -> SessionPhase {
        self.phase
    }

    fn synchronized(&self) -> bool {
        self.synchronized
    }

    fn is_connected(&self) -> bool {
        matches!(self.phase, SessionPhase::Syncing | SessionPhase::Ready)
    }

    fn request_reconnect(&mut self, now_ms: u64) {
        self.auto_reconnect = true;
        self.phase = SessionPhase::Searching;
        self.next_reconnect_at_ms = now_ms;
        self.reset_connection_state(now_ms);
    }

    fn disconnect(&mut self, now_ms: u64, recover: bool) {
        self.auto_reconnect = recover;
        self.phase = if recover {
            SessionPhase::Searching
        } else {
            SessionPhase::Disconnected
        };
        self.next_reconnect_at_ms = now_ms.saturating_add(profile::RECONNECT_INTERVAL_MS);
        self.reset_connection_state(now_ms);
    }

    fn reconnect_due(&self, now_ms: u64) -> bool {
        self.auto_reconnect
            && self.phase == SessionPhase::Searching
            && now_ms >= self.next_reconnect_at_ms
    }

    fn reconnect_attempted(&mut self, now_ms: u64) {
        self.next_reconnect_at_ms = now_ms.saturating_add(profile::RECONNECT_INTERVAL_MS);
    }

    fn transport_opened(&mut self, now_ms: u64) {
        self.phase = SessionPhase::Handshaking;
        self.handshake_started_at_ms = Some(now_ms);
        self.handshake_attempts = 0;
        self.next_handshake_at_ms = now_ms;
        self.synchronized = false;
        self.consecutive_read_errors = 0;
        self.outbound(now_ms);
    }

    fn next_handshake_attempt(&mut self, now_ms: u64) -> Option<(u32, bool)> {
        if self.phase != SessionPhase::Handshaking
            || now_ms < self.next_handshake_at_ms
            || self.handshake_timed_out(now_ms)
        {
            return None;
        }
        self.handshake_attempts = self.handshake_attempts.saturating_add(1);
        self.next_handshake_at_ms = now_ms.saturating_add(profile::HANDSHAKE_ATTEMPT_TIMEOUT_MS);
        self.outbound(now_ms);
        Some((self.handshake_attempts, self.handshake_attempts % 2 == 1))
    }

    fn handshake_timed_out(&self, now_ms: u64) -> bool {
        self.phase == SessionPhase::Handshaking
            && self.handshake_started_at_ms.is_some_and(|started| {
                now_ms.saturating_sub(started) >= profile::HANDSHAKE_TIMEOUT_MS
            })
    }

    fn awaiting_handshake_reply(&self, now_ms: u64) -> bool {
        self.phase == SessionPhase::Handshaking
            && now_ms < self.next_handshake_at_ms
            && !self.handshake_timed_out(now_ms)
    }

    fn handshake_completed(&mut self, now_ms: u64, synchronized: bool) {
        self.phase = if synchronized {
            SessionPhase::Ready
        } else {
            SessionPhase::Syncing
        };
        self.synchronized = synchronized;
        self.consecutive_read_errors = 0;
        self.outbound(now_ms);
    }

    fn state_observed(&mut self, _now_ms: u64, preset_synchronized: bool) {
        self.consecutive_read_errors = 0;
        if matches!(self.phase, SessionPhase::Syncing | SessionPhase::Ready) {
            self.synchronized = preset_synchronized;
            self.phase = if preset_synchronized {
                SessionPhase::Ready
            } else {
                SessionPhase::Syncing
            };
        }
    }

    fn keepalive_due(&self, now_ms: u64) -> bool {
        matches!(self.phase, SessionPhase::Syncing | SessionPhase::Ready)
            && now_ms >= self.next_keepalive_at_ms
    }

    fn keepalive_sent(&mut self, now_ms: u64) {
        self.next_keepalive_at_ms = now_ms.saturating_add(profile::KEEPALIVE_INTERVAL_MS);
    }

    fn outbound(&mut self, _now_ms: u64) {
        // Ordinary traffic is not a substitute for the device's KeepAlive.
    }

    fn defer_keepalive(&mut self, now_ms: u64) {
        self.next_keepalive_at_ms = now_ms.saturating_add(profile::KEEPALIVE_INTERVAL_MS);
    }

    fn read_succeeded(&mut self) {
        self.consecutive_read_errors = 0;
    }

    fn read_failed(&mut self) -> bool {
        self.consecutive_read_errors = self.consecutive_read_errors.saturating_add(1);
        self.consecutive_read_errors >= 2
    }

    fn terminal_read_failed(&mut self) -> bool {
        self.consecutive_read_errors = 2;
        true
    }
}

/// Layout expected by a host USB write API.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReportLayout {
    /// The native API accepts the complete 129-byte logical HID report.
    ReportIdPrefixed,
    /// The native API accepts only the 128-byte SET_REPORT data stage.
    BodyOnly,
}

/// A fully assembled QC message and transport diagnostics for its source frame.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InboundFrame {
    pub message_type: u16,
    pub payload: Vec<u8>,
    pub report_count: usize,
}

/// A handshake write selected by the shared session policy.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HandshakeWrite {
    pub attempt: u32,
    pub layout: ReportLayout,
    pub message: OutboundMessage,
    request_id: u64,
    session_id: String,
}

impl HandshakeWrite {
    pub fn request_id(&self) -> u64 {
        self.request_id
    }

    pub fn session_id(&self) -> &str {
        &self.session_id
    }

    /// A type-52 frame is not itself a successful handshake. Cortex Control
    /// requires the opaque session id to match the attempt. The request id is
    /// optional on replies and is not the reference client's session gate.
    pub fn matches_reply(&self, payload: &[u8]) -> bool {
        let Ok(reply) = pa::ResetCommsBuffersMessage::decode(payload) else {
            return false;
        };
        let session_id = reply.session_id.map(|value| match value {
            pa::reset_comms_buffers_message::SessionId::SessionId(value) => value,
        });
        session_id.as_deref() == Some(&self.session_id)
    }
}

/// Long-lived protocol state shared by every native USB host.
#[derive(Debug)]
pub struct TransportRuntime {
    session: SessionMachine,
    frames: FrameAssembler,
    frame_report_count: usize,
}

impl TransportRuntime {
    pub fn new(now_ms: u64) -> Self {
        Self {
            session: SessionMachine::new(now_ms),
            frames: FrameAssembler::new(),
            frame_report_count: 0,
        }
    }

    pub fn reset(&mut self, now_ms: u64) {
        *self = Self::new(now_ms);
    }

    pub fn phase(&self) -> SessionPhase {
        self.session.phase()
    }

    pub fn synchronized(&self) -> bool {
        self.session.synchronized()
    }

    pub fn is_connected(&self) -> bool {
        self.session.is_connected()
    }

    pub fn request_reconnect(&mut self, now_ms: u64) {
        self.frames.reset();
        self.frame_report_count = 0;
        self.session.request_reconnect(now_ms);
    }

    pub fn disconnect(&mut self, now_ms: u64, recover: bool) {
        self.frames.reset();
        self.frame_report_count = 0;
        self.session.disconnect(now_ms, recover);
    }

    pub fn reconnect_due(&self, now_ms: u64) -> bool {
        self.session.reconnect_due(now_ms)
    }

    pub fn reconnect_attempted(&mut self, now_ms: u64) {
        self.session.reconnect_attempted(now_ms);
    }

    /// Enter recoverable link-loss state and return the delay until the first
    /// reconnect attempt. Hosts schedule I/O; the shared runtime owns cadence.
    pub fn schedule_reconnect(&mut self, now_ms: u64) -> u64 {
        self.disconnect(now_ms, true);
        profile::RECONNECT_INTERVAL_MS
    }

    pub fn transport_opened(&mut self, now_ms: u64) {
        self.frames.reset();
        self.frame_report_count = 0;
        self.session.transport_opened(now_ms);
    }

    /// Select and reserve the next handshake attempt, including the HID report
    /// layout probe. The host supplies entropy for the opaque session id but
    /// does not select or encode the protocol command.
    pub fn next_handshake_write(
        &mut self,
        now_ms: u64,
        session_id: impl Into<String>,
    ) -> Option<HandshakeWrite> {
        let session_id = session_id.into();
        self.session
            .next_handshake_attempt(now_ms)
            .map(|(attempt, include_report_id)| HandshakeWrite {
                attempt,
                layout: if include_report_id {
                    ReportLayout::ReportIdPrefixed
                } else {
                    ReportLayout::BodyOnly
                },
                message: commands::reset_comms(u64::from(attempt), session_id.clone()),
                request_id: u64::from(attempt),
                session_id,
            })
    }

    pub fn handshake_timed_out(&self, now_ms: u64) -> bool {
        self.session.handshake_timed_out(now_ms)
    }

    pub fn awaiting_handshake_reply(&self, now_ms: u64) -> bool {
        self.session.awaiting_handshake_reply(now_ms)
    }

    pub fn handshake_completed(&mut self, now_ms: u64, synchronized: bool) {
        self.session.handshake_completed(now_ms, synchronized);
    }

    pub fn state_observed(&mut self, now_ms: u64, preset_synchronized: bool) {
        self.session.state_observed(now_ms, preset_synchronized);
    }

    /// Return the one canonical maintenance write when it is due and reserve
    /// the next deadline immediately so repeated host polling cannot duplicate it.
    pub fn take_keepalive(&mut self, now_ms: u64) -> Option<OutboundMessage> {
        if !self.keepalive_due(now_ms) {
            return None;
        }
        self.keepalive_sent(now_ms);
        Some(commands::keepalive())
    }

    /// Split-phase form for adapters whose write must be queued on an OS-owned
    /// thread. The adapter checks the deadline, performs the write, then marks
    /// it sent only after the report has been handed to the native API.
    pub fn keepalive_due(&self, now_ms: u64) -> bool {
        self.session.keepalive_due(now_ms)
    }

    pub fn keepalive_sent(&mut self, now_ms: u64) {
        self.session.keepalive_sent(now_ms);
    }

    pub fn outbound(&mut self, now_ms: u64) {
        self.session.outbound(now_ms);
    }

    pub fn defer_keepalive(&mut self, now_ms: u64) {
        self.session.defer_keepalive(now_ms);
    }

    pub fn read_succeeded(&mut self) {
        self.session.read_succeeded();
    }

    pub fn read_failed(&mut self) -> bool {
        self.session.read_failed()
    }

    /// Report an OS-level reader failure after which the native endpoint can
    /// no longer continue. Unlike a transient HID read error, a closed request
    /// queue does not benefit from retrying on the same handle.
    pub fn terminal_read_failed(&mut self) -> bool {
        self.session.terminal_read_failed()
    }

    /// Encode an outbound message exactly once, then adapt only its outer HID
    /// shape to the native USB API.
    pub fn encode_reports(message: &OutboundMessage, layout: ReportLayout) -> Vec<Vec<u8>> {
        framing::encode(message.message_type, &message.payload)
            .into_iter()
            .map(|report| match layout {
                ReportLayout::ReportIdPrefixed => report.to_vec(),
                ReportLayout::BodyOnly => report[1..].to_vec(),
            })
            .collect()
    }

    /// Normalize either native read layout and assemble one logical message.
    pub fn push_report(&mut self, raw_report: &[u8]) -> Result<Option<InboundFrame>, FrameError> {
        let report = normalize_inbound_report(raw_report)?;
        if report[2] & framing::FLAG_FIRST != 0 {
            self.frame_report_count = 1;
        } else if self.frame_report_count > 0 {
            self.frame_report_count = self.frame_report_count.saturating_add(1);
        }
        let assembled = match self.frames.push(report) {
            Ok(value) => value,
            Err(error) => {
                self.frame_report_count = 0;
                return Err(error);
            }
        };
        let Some((message_type, payload)) = assembled else {
            return Ok(None);
        };
        let report_count = self.frame_report_count.max(1);
        self.frame_report_count = 0;
        Ok(Some(InboundFrame {
            message_type,
            payload,
            report_count,
        }))
    }
}

/// Android interrupt reads expose the 128-byte body while hidapi exposes the
/// 129-byte report-id-prefixed form. Normalize both before parsing flags or
/// chunk lengths. The first body byte can legitimately equal the report id, so
/// length—not byte value alone—selects the layout.
fn normalize_inbound_report(raw: &[u8]) -> Result<Vec<u8>, FrameError> {
    if raw.len() == framing::REPORT_SIZE {
        if raw[0] != framing::IN_REPORT_ID {
            return Err(FrameError::InvalidLength);
        }
        return Ok(raw.to_vec());
    }
    // A body-only HID report must contain at least its length and flags bytes.
    // Android can surface a one-byte residual read while an interface is being
    // closed or reopened; reject it before push_report indexes the flags byte.
    if raw.len() < 2 || raw.len() > framing::REPORT_BODY_SIZE {
        return Err(FrameError::InvalidLength);
    }
    let mut report = Vec::with_capacity(raw.len() + 1);
    report.push(framing::IN_REPORT_ID);
    report.extend_from_slice(raw);
    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;
    use qc_protocol::profile;

    fn inbound_reports(message_type: u16, payload: &[u8]) -> Vec<Vec<u8>> {
        framing::encode(message_type, payload)
            .into_iter()
            .map(|mut report| {
                report[0] = framing::IN_REPORT_ID;
                report.to_vec()
            })
            .collect()
    }

    #[test]
    fn prefixed_and_body_only_hosts_decode_identically() {
        let payload = vec![0x5a; framing::CHUNK_SIZE * 2 + 7];
        let reports = inbound_reports(profile::MESSAGE_TYPE_MODEL_REPO, &payload);
        let mut prefixed = TransportRuntime::new(0);
        let mut body_only = TransportRuntime::new(0);
        let mut left = None;
        let mut right = None;
        for report in reports {
            left = prefixed.push_report(&report).unwrap().or(left);
            right = body_only.push_report(&report[1..]).unwrap().or(right);
        }
        assert_eq!(left, right);
        assert_eq!(left.unwrap().report_count, 3);
    }

    #[test]
    fn truncated_body_only_reports_are_rejected_without_panicking() {
        let mut runtime = TransportRuntime::new(0);
        assert_eq!(runtime.push_report(&[]), Err(FrameError::InvalidLength));
        assert_eq!(runtime.push_report(&[0]), Err(FrameError::InvalidLength));
    }

    #[test]
    fn every_native_read_length_is_total() {
        for length in 0..=framing::REPORT_SIZE * 2 {
            let mut report = vec![0_u8; length];
            if length == framing::REPORT_SIZE {
                report[0] = framing::IN_REPORT_ID;
            }
            let mut runtime = TransportRuntime::new(0);
            let _ = runtime.push_report(&report);
        }
    }

    #[test]
    fn body_chunk_length_equal_to_report_id_is_not_misclassified() {
        // Payload + eight-byte trailer = 127, so the final body-only report's
        // chunk-length byte is 1, the same value as IN_REPORT_ID.
        let payload = vec![0x33; framing::CHUNK_SIZE - 7];
        let reports = inbound_reports(profile::MESSAGE_TYPE_MODEL_REPO, &payload);
        assert_eq!(reports.len(), 2);
        assert_eq!(reports[1][1], framing::IN_REPORT_ID);
        let mut runtime = TransportRuntime::new(0);
        assert!(runtime.push_report(&reports[0][1..]).unwrap().is_none());
        let frame = runtime.push_report(&reports[1][1..]).unwrap().unwrap();
        assert_eq!(frame.payload, payload);
        assert_eq!(frame.report_count, 2);
    }

    #[test]
    fn outbound_layout_changes_no_protocol_bytes() {
        let message = commands::read(profile::MESSAGE_TYPE_VERSION);
        let prefixed = TransportRuntime::encode_reports(&message, ReportLayout::ReportIdPrefixed);
        let body = TransportRuntime::encode_reports(&message, ReportLayout::BodyOnly);
        assert_eq!(prefixed.len(), body.len());
        for (full, data) in prefixed.iter().zip(body) {
            assert_eq!(&full[1..], data);
        }
    }

    #[test]
    fn handshake_layout_and_keepalive_are_reserved_once() {
        let mut runtime = TransportRuntime::new(0);
        runtime.transport_opened(10);
        let first = runtime.next_handshake_write(10, "session-a").unwrap();
        assert_eq!(first.attempt, 1);
        assert_eq!(first.layout, ReportLayout::ReportIdPrefixed);
        assert!(runtime.next_handshake_write(11, "unused").is_none());
        let second = runtime
            .next_handshake_write(10 + profile::HANDSHAKE_ATTEMPT_TIMEOUT_MS, "session-b")
            .unwrap();
        assert_eq!(second.attempt, 2);
        assert_eq!(second.layout, ReportLayout::BodyOnly);

        runtime.handshake_completed(20, true);
        let due = 20 + profile::KEEPALIVE_INTERVAL_MS;
        assert!(runtime.take_keepalive(due).is_some());
        assert!(runtime.take_keepalive(due).is_none());
    }

    #[test]
    fn handshake_write_rejects_type_only_and_mismatched_sessions() {
        let mut runtime = TransportRuntime::new(0);
        runtime.transport_opened(0);
        let write = runtime.next_handshake_write(0, "opaque-session").unwrap();
        let reply = |request_id, session_id: &str| {
            pa::ResetCommsBuffersMessage {
                request_id: Some(pa::reset_comms_buffers_message::RequestId::RequestId(
                    request_id,
                )),
                session_id: Some(pa::reset_comms_buffers_message::SessionId::SessionId(
                    session_id.into(),
                )),
            }
            .encode_to_vec()
        };
        assert!(write.matches_reply(&reply(1, "opaque-session")));
        assert!(write.matches_reply(&reply(2, "opaque-session")));
        assert!(write.matches_reply(
            &pa::ResetCommsBuffersMessage {
                request_id: None,
                session_id: Some(pa::reset_comms_buffers_message::SessionId::SessionId(
                    "opaque-session".into(),
                )),
            }
            .encode_to_vec()
        ));
        assert!(!write.matches_reply(&reply(1, "other-session")));
        assert!(!write.matches_reply(&[]));
    }

    #[test]
    fn busy_traffic_does_not_defer_the_dedicated_keepalive() {
        let mut runtime = TransportRuntime::new(0);
        runtime.transport_opened(0);
        runtime.handshake_completed(10, false);
        runtime.keepalive_sent(10);
        for tick in (0..profile::KEEPALIVE_INTERVAL_MS).step_by(250) {
            runtime.state_observed(10 + tick, tick > 1_000);
            runtime.outbound(10 + tick);
        }
        assert_eq!(runtime.phase(), SessionPhase::Ready);
        assert!(runtime
            .take_keepalive(10 + profile::KEEPALIVE_INTERVAL_MS)
            .is_some());
    }

    #[test]
    fn link_loss_requires_two_consecutive_read_errors() {
        let mut runtime = TransportRuntime::new(0);
        runtime.transport_opened(0);
        runtime.handshake_completed(1, true);
        assert!(!runtime.read_failed());
        runtime.read_succeeded();
        assert!(!runtime.read_failed());
        assert!(runtime.read_failed());
        runtime.disconnect(100, true);
        assert!(!runtime.reconnect_due(100));
        assert!(runtime.reconnect_due(100 + profile::RECONNECT_INTERVAL_MS));
    }

    #[test]
    fn a_terminal_native_reader_failure_requests_immediate_recovery() {
        let mut runtime = TransportRuntime::new(0);
        runtime.transport_opened(0);
        runtime.handshake_completed(1, true);
        assert!(runtime.terminal_read_failed());
    }

    #[test]
    fn reconnect_discards_an_incomplete_frame() {
        let reports = inbound_reports(51, &vec![1; framing::CHUNK_SIZE * 2]);
        let mut runtime = TransportRuntime::new(0);
        assert!(runtime.push_report(&reports[0]).unwrap().is_none());
        runtime.request_reconnect(5);
        assert!(runtime.push_report(&reports[1]).unwrap().is_none());
        let complete = inbound_reports(13, &[8, 1, 24, 2]);
        assert_eq!(
            runtime
                .push_report(&complete[0])
                .unwrap()
                .unwrap()
                .message_type,
            13
        );
    }

    #[test]
    fn shared_runtime_owns_reconnect_schedule_and_reservation() {
        let mut runtime = TransportRuntime::new(0);
        let delay = runtime.schedule_reconnect(100);
        assert_eq!(delay, profile::RECONNECT_INTERVAL_MS);
        assert!(!runtime.reconnect_due(100 + delay - 1));
        assert!(runtime.reconnect_due(100 + delay));
        runtime.reconnect_attempted(100 + delay);
        assert!(!runtime.reconnect_due(100 + delay));
        assert!(runtime.reconnect_due(100 + delay * 2));
    }

    #[test]
    fn authoritative_state_can_return_a_ready_session_to_syncing() {
        let mut runtime = TransportRuntime::new(0);
        runtime.transport_opened(0);
        runtime.handshake_completed(1, true);
        assert_eq!(runtime.phase(), SessionPhase::Ready);
        assert!(runtime.synchronized());

        runtime.state_observed(2, false);
        assert_eq!(runtime.phase(), SessionPhase::Syncing);
        assert!(!runtime.synchronized());

        runtime.state_observed(3, true);
        assert_eq!(runtime.phase(), SessionPhase::Ready);
        assert!(runtime.synchronized());
    }
}
