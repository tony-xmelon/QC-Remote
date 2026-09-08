//! Platform-neutral lifecycle for the QC's uncorrelated LocalBackup stream.
//!
//! Hosts provide only a monotonic clock, deliver payloads, and execute the
//! returned I/O action. Retry, liveness, progress, and stream-splicing policy
//! belong here because they are properties of the device protocol.

use qc_protocol::profile;
use qc_protocol::responses::BackupAssembler;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BackupProgress {
    pub document: Option<String>,
    pub started: bool,
    pub chunks: usize,
    pub ignored_prefix_chunks: usize,
    pub ignored_prefix_terminators: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BackupAction {
    Wait,
    /// Send the dedicated QC KeepAlive. Busy inbound traffic must not defer it.
    Keepalive,
    /// Repeat LocalBackup only before a document has started.
    Rerequest,
    Failed(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BackupTerminalState {
    Complete,
    Cancelled,
    Failed,
}

/// One LocalBackup transfer, expressed entirely in monotonic milliseconds.
#[derive(Debug)]
pub struct BackupRuntime {
    assembler: BackupAssembler,
    deadline_ms: u64,
    first_chunk_deadline_ms: u64,
    progress_deadline_ms: u64,
    next_keepalive_ms: u64,
    attempts: usize,
    terminal: bool,
    terminal_state: Option<BackupTerminalState>,
}

fn window(from_ms: u64, timeout_ms: u64, deadline_ms: u64) -> u64 {
    from_ms.saturating_add(timeout_ms).min(deadline_ms)
}

impl BackupRuntime {
    pub fn start(now_ms: u64, timeout_ms: u64) -> Self {
        let deadline_ms = now_ms.saturating_add(timeout_ms);
        Self {
            assembler: BackupAssembler::default(),
            deadline_ms,
            first_chunk_deadline_ms: window(
                now_ms,
                profile::BACKUP_FIRST_CHUNK_TIMEOUT_MS,
                deadline_ms,
            ),
            progress_deadline_ms: deadline_ms,
            next_keepalive_ms: now_ms.saturating_add(profile::KEEPALIVE_INTERVAL_MS),
            attempts: 1,
            terminal: false,
            terminal_state: None,
        }
    }

    pub fn attempts(&self) -> usize {
        self.attempts
    }

    pub fn started(&self) -> bool {
        self.assembler.started()
    }

    pub fn is_terminal(&self) -> bool {
        self.terminal
    }

    pub fn terminal_state(&self) -> Option<BackupTerminalState> {
        self.terminal_state
    }

    /// Cancellation is local and terminal. It never emits a second uncorrelated
    /// LocalBackup request and never permits a partial document to be resumed.
    pub fn cancel(&mut self) {
        if !self.terminal {
            self.terminal = true;
            self.terminal_state = Some(BackupTerminalState::Cancelled);
        }
    }

    /// Feed one LocalBackup chunk. A completed document is returned exactly
    /// once; callers own platform-specific persistence of that document.
    pub fn absorb(&mut self, now_ms: u64, payload: &[u8]) -> Result<BackupProgress, String> {
        if self.terminal {
            return Err("QC backup transfer is already complete".into());
        }
        let was_started = self.assembler.started();
        let previous_chunks = self.assembler.chunks();
        let previous_ignored = self.assembler.ignored_prefix_chunks();
        let document = match self.assembler.push(payload) {
            Ok(document) => document,
            Err(error) => {
                // A malformed/oversized message after stream start must not
                // reset the assembler and accidentally make a retry eligible.
                self.terminal = true;
                self.terminal_state = Some(BackupTerminalState::Failed);
                return Err(error.to_string());
            }
        };
        if document.is_some() {
            self.terminal = true;
            self.terminal_state = Some(BackupTerminalState::Complete);
        } else if self.assembler.chunks() > previous_chunks {
            self.progress_deadline_ms = window(
                now_ms,
                profile::BACKUP_STREAM_STALL_TIMEOUT_MS,
                self.deadline_ms,
            );
        } else if !was_started && self.assembler.ignored_prefix_chunks() > previous_ignored {
            // An earlier uncorrelated transfer is still draining. Do not inject
            // a duplicate request into it; extend only the pre-start window.
            self.first_chunk_deadline_ms = window(
                now_ms,
                profile::BACKUP_FIRST_CHUNK_TIMEOUT_MS,
                self.deadline_ms,
            );
        }
        Ok(BackupProgress {
            document,
            started: self.assembler.started(),
            chunks: self.assembler.chunks(),
            ignored_prefix_chunks: self.assembler.ignored_prefix_chunks(),
            ignored_prefix_terminators: self.assembler.ignored_prefix_terminators(),
        })
    }

    /// Decide the next protocol action. The host performs the physical write.
    pub fn advance(&mut self, now_ms: u64) -> BackupAction {
        if self.terminal {
            return BackupAction::Wait;
        }
        if now_ms >= self.deadline_ms {
            self.terminal = true;
            self.terminal_state = Some(BackupTerminalState::Failed);
            return BackupAction::Failed(format!(
                "QC backup timed out: overall deadline reached after {} request(s), {} complete document chunk(s), and {} ignored prefix chunk(s)",
                self.attempts,
                self.assembler.chunks(),
                self.assembler.ignored_prefix_chunks()
            ));
        }
        if self.assembler.started() {
            if now_ms >= self.progress_deadline_ms {
                self.terminal = true;
                self.terminal_state = Some(BackupTerminalState::Failed);
                return BackupAction::Failed(format!(
                    "QC backup timed out: stream stalled after {} chunk(s); the partial document was discarded and was not combined with a retry",
                    self.assembler.chunks()
                ));
            }
        } else if now_ms >= self.first_chunk_deadline_ms {
            if self.attempts >= profile::BACKUP_MAXIMUM_ATTEMPTS {
                self.terminal = true;
                self.terminal_state = Some(BackupTerminalState::Failed);
                return BackupAction::Failed(format!(
                    "QC backup timed out: no JSON document start arrived after {} request(s); ignored {} stale chunk(s) and {} stale terminator(s)",
                    self.attempts,
                    self.assembler.ignored_prefix_chunks(),
                    self.assembler.ignored_prefix_terminators()
                ));
            }
            self.attempts += 1;
            self.first_chunk_deadline_ms = window(
                now_ms,
                profile::BACKUP_FIRST_CHUNK_TIMEOUT_MS,
                self.deadline_ms,
            );
            return BackupAction::Rerequest;
        }
        if now_ms >= self.next_keepalive_ms {
            self.next_keepalive_ms = now_ms.saturating_add(profile::KEEPALIVE_INTERVAL_MS);
            return BackupAction::Keepalive;
        }
        BackupAction::Wait
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn chunk(text: &str, last: bool) -> Vec<u8> {
        fn push_varint(mut value: usize, target: &mut Vec<u8>) {
            loop {
                let byte = (value & 0x7f) as u8;
                value >>= 7;
                target.push(if value == 0 { byte } else { byte | 0x80 });
                if value == 0 {
                    break;
                }
            }
        }
        let mut payload = vec![0x1a]; // field 3: backup_json
        push_varint(text.len(), &mut payload);
        payload.extend_from_slice(text.as_bytes());
        if last {
            payload.extend_from_slice(&[0x30, 0x01]); // field 6: is_last_chunk
        }
        payload
    }

    #[test]
    fn retries_only_before_document_start() {
        let mut runtime = BackupRuntime::start(1_000, 180_000);
        assert_eq!(
            runtime.advance(1_000 + profile::BACKUP_FIRST_CHUNK_TIMEOUT_MS),
            BackupAction::Rerequest
        );
        assert_eq!(runtime.attempts(), 2);
        runtime
            .absorb(20_000, &chunk("{\"type\":\"backup\"", false))
            .unwrap();
        assert!(runtime.started());
        assert!(matches!(
            runtime.advance(20_000 + profile::BACKUP_STREAM_STALL_TIMEOUT_MS),
            BackupAction::Failed(message) if message.contains("not combined with a retry")
        ));
        assert_eq!(runtime.attempts(), 2);
    }

    #[test]
    fn keepalive_is_independent_of_inbound_progress() {
        let mut runtime = BackupRuntime::start(0, 180_000);
        runtime
            .absorb(1_000, &chunk("{\"type\":\"backup\",", false))
            .unwrap();
        runtime
            .absorb(2_000, &chunk("\"creator\":\"quad\",", false))
            .unwrap();
        assert_eq!(
            runtime.advance(profile::KEEPALIVE_INTERVAL_MS),
            BackupAction::Keepalive
        );
    }

    #[test]
    fn completes_a_document_once() {
        let mut runtime = BackupRuntime::start(0, 180_000);
        let progress = runtime
            .absorb(
                1,
                &chunk("{\"type\":\"backup\",\"creator\":\"quad\"}", true),
            )
            .unwrap();
        assert_eq!(
            progress.document.as_deref(),
            Some("{\"type\":\"backup\",\"creator\":\"quad\"}")
        );
        assert!(runtime.is_terminal());
        assert_eq!(
            runtime.terminal_state(),
            Some(BackupTerminalState::Complete)
        );
        assert!(runtime.absorb(2, &chunk("{}", true)).is_err());
    }

    #[test]
    fn cancellation_and_malformed_started_streams_cannot_be_retried() {
        let mut cancelled = BackupRuntime::start(0, 180_000);
        cancelled.cancel();
        assert_eq!(
            cancelled.terminal_state(),
            Some(BackupTerminalState::Cancelled)
        );
        assert_eq!(
            cancelled.advance(profile::BACKUP_FIRST_CHUNK_TIMEOUT_MS),
            BackupAction::Wait
        );

        let mut malformed = BackupRuntime::start(0, 180_000);
        malformed
            .absorb(1, &chunk("{\"type\":\"backup\",", false))
            .unwrap();
        assert!(malformed.absorb(2, &[0xff]).is_err());
        assert_eq!(
            malformed.terminal_state(),
            Some(BackupTerminalState::Failed)
        );
        assert_eq!(
            malformed.advance(profile::BACKUP_FIRST_CHUNK_TIMEOUT_MS),
            BackupAction::Wait
        );
        assert_eq!(malformed.attempts(), 1);
    }
}
