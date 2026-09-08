//! Shared preset-catalog refresh and authoritative verification policy.
//!
//! A catalog request produces an expensive, uncorrelated stream of File
//! messages. Hosts retain their own event-loop primitives, but this runtime is
//! the single authority for deadlines, retry backoff, stale-stream cooldown,
//! and failure diagnostics.

use qc_protocol::profile;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CatalogVerificationAction {
    Request,
    Wait { delay_ms: u64 },
    Complete,
    Failed { matching_listings: u32 },
}

#[derive(Debug, Clone)]
pub struct CatalogVerificationRuntime {
    deadline_ms: u64,
    next_request_ms: u64,
    retry_delay_ms: u64,
    matching_listings: u32,
    complete: bool,
}

impl CatalogVerificationRuntime {
    pub fn new(now_ms: u64) -> Self {
        Self {
            deadline_ms: now_ms.saturating_add(profile::PRESET_LIBRARY_VERIFICATION_TIMEOUT_MS),
            next_request_ms: now_ms,
            retry_delay_ms: profile::PRESET_LIBRARY_VERIFICATION_RETRY_MS,
            matching_listings: 0,
            complete: false,
        }
    }

    pub fn advance(&self, now_ms: u64) -> CatalogVerificationAction {
        if self.complete {
            CatalogVerificationAction::Complete
        } else if now_ms >= self.deadline_ms {
            CatalogVerificationAction::Failed {
                matching_listings: self.matching_listings,
            }
        } else if now_ms >= self.next_request_ms {
            CatalogVerificationAction::Request
        } else {
            CatalogVerificationAction::Wait {
                delay_ms: self
                    .next_request_ms
                    .min(self.deadline_ms)
                    .saturating_sub(now_ms),
            }
        }
    }

    pub fn take_action(&mut self, now_ms: u64) -> CatalogVerificationAction {
        let action = self.advance(now_ms);
        if action == CatalogVerificationAction::Request {
            self.request_started(now_ms);
        }
        action
    }

    /// Reserve one request before the host submits it, preventing duplicate
    /// scheduler wakeups from emitting parallel catalog streams.
    pub fn request_started(&mut self, now_ms: u64) {
        self.next_request_ms = now_ms.saturating_add(self.retry_delay_ms);
        self.retry_delay_ms = self
            .retry_delay_ms
            .saturating_mul(2)
            .min(profile::PRESET_LIBRARY_REFRESH_COALESCE_MS);
    }

    /// Record a fresh listing for the requested setlist. A stale listing proves
    /// that CorOS just completed a catalog stream, so the next request must wait
    /// for its full cooldown instead of following the earlier request clock.
    pub fn listing_observed(&mut self, now_ms: u64, matches: bool) {
        self.matching_listings = self.matching_listings.saturating_add(1);
        if matches {
            self.complete = true;
        } else {
            self.next_request_ms =
                now_ms.saturating_add(profile::PRESET_LIBRARY_REFRESH_COALESCE_MS);
            self.retry_delay_ms = profile::PRESET_LIBRARY_REFRESH_COALESCE_MS;
        }
    }

    pub fn matching_listings(&self) -> u32 {
        self.matching_listings
    }

    pub fn failure_message(&self, subject: &str) -> String {
        let seconds = profile::PRESET_LIBRARY_VERIFICATION_TIMEOUT_MS / 1_000;
        if self.matching_listings == 0 {
            format!("The QC did not publish a fresh {subject} within {seconds} seconds.")
        } else {
            format!(
                "The QC published {} fresh {subject}(s), but none confirmed the requested change within {seconds} seconds.",
                self.matching_listings
            )
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct CatalogRefreshGate {
    last_request: Option<(u64, u64)>,
}

impl CatalogRefreshGate {
    pub fn reserve(&mut self, connection_id: u64, now_ms: u64) -> bool {
        if self
            .last_request
            .is_some_and(|(last_connection, started_ms)| {
                last_connection == connection_id
                    && now_ms.saturating_sub(started_ms)
                        < profile::PRESET_LIBRARY_REFRESH_COALESCE_MS
            })
        {
            false
        } else {
            self.last_request = Some((connection_id, now_ms));
            true
        }
    }

    pub fn clear(&mut self) {
        self.last_request = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retries_back_off_to_the_shared_catalog_cooldown() {
        let mut runtime = CatalogVerificationRuntime::new(100);
        let expected = [500, 1_000, 2_000, 4_000, 8_000, 8_000];
        let mut now = 100;
        for delay in expected {
            assert_eq!(runtime.advance(now), CatalogVerificationAction::Request);
            runtime.request_started(now);
            assert_eq!(
                runtime.advance(now),
                CatalogVerificationAction::Wait { delay_ms: delay }
            );
            now += delay;
        }
    }

    #[test]
    fn stale_listing_restarts_the_full_cooldown() {
        let mut runtime = CatalogVerificationRuntime::new(0);
        runtime.request_started(0);
        runtime.listing_observed(300, false);
        assert_eq!(
            runtime.advance(301),
            CatalogVerificationAction::Wait { delay_ms: 7_999 }
        );
        assert_eq!(runtime.advance(8_300), CatalogVerificationAction::Request);
        assert_eq!(runtime.matching_listings(), 1);
    }

    #[test]
    fn matching_listing_completes_without_another_request() {
        let mut runtime = CatalogVerificationRuntime::new(10);
        runtime.request_started(10);
        runtime.listing_observed(20, true);
        assert_eq!(runtime.advance(20), CatalogVerificationAction::Complete);
    }

    #[test]
    fn timeout_diagnostics_distinguish_silence_from_stale_state() {
        let silent = CatalogVerificationRuntime::new(0);
        assert!(matches!(
            silent.advance(profile::PRESET_LIBRARY_VERIFICATION_TIMEOUT_MS),
            CatalogVerificationAction::Failed {
                matching_listings: 0
            }
        ));
        assert!(silent
            .failure_message("preset catalog")
            .contains("did not publish"));

        let mut stale = CatalogVerificationRuntime::new(0);
        stale.listing_observed(1, false);
        assert!(stale
            .failure_message("preset catalog")
            .contains("1 fresh preset catalog(s)"));
    }

    #[test]
    fn refresh_gate_is_scoped_to_one_connection() {
        let mut gate = CatalogRefreshGate::default();
        assert!(gate.reserve(1, 0));
        assert!(!gate.reserve(1, 1));
        assert!(gate.reserve(2, 1));
        gate.clear();
        assert!(gate.reserve(2, 2));
    }
}
