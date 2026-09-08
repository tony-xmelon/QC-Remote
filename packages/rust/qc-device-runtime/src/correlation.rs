//! Shared matching and timeout policy for replies awaited by native hosts.
//!
//! Channels, futures, and wakeups remain platform concerns. The device
//! protocol has one definition of a matching response: the expected message
//! type must match, and a requested correlation id must be present and equal.

use qc_protocol::wire;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ResponseExpectation {
    message_type: u16,
    request_id: Option<u64>,
    deadline_ms: u64,
}

impl ResponseExpectation {
    pub fn new(
        message_type: u16,
        request_id: Option<u64>,
        started_at_ms: u64,
        timeout_ms: u64,
    ) -> Self {
        Self {
            message_type,
            request_id,
            deadline_ms: started_at_ms.saturating_add(timeout_ms),
        }
    }

    pub fn message_type(&self) -> u16 {
        self.message_type
    }

    pub fn request_id(&self) -> Option<u64> {
        self.request_id
    }

    pub fn matches(&self, actual_type: u16, payload: &[u8]) -> bool {
        actual_type == self.message_type
            && self
                .request_id
                .is_none_or(|expected| wire::request_id(actual_type, payload) == Some(expected))
    }

    pub fn expired(&self, now_ms: u64) -> bool {
        now_ms >= self.deadline_ms
    }

    pub fn remaining_ms(&self, now_ms: u64) -> u64 {
        self.deadline_ms.saturating_sub(now_ms)
    }

    pub fn timeout_message(&self) -> String {
        match self.request_id {
            Some(request_id) => format!(
                "No correlated QC message type {} response for request {} before timeout",
                self.message_type, request_id
            ),
            None => format!(
                "No QC message type {} response before timeout",
                self.message_type
            ),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uncorrelated_expectation_matches_only_its_message_type() {
        let expected = ResponseExpectation::new(10, None, 100, 50);
        assert!(expected.matches(10, &[]));
        assert!(!expected.matches(11, &[]));
        assert!(!expected.expired(149));
        assert!(expected.expired(150));
    }

    #[test]
    fn correlated_expectation_requires_the_id_to_be_present_and_equal() {
        let expected = ResponseExpectation::new(13, Some(42), 0, 1_000);
        assert!(expected.matches(13, &[0x08, 0x01, 0x10, 0x2a]));
        assert!(!expected.matches(13, &[0x08, 0x01]));
        assert!(!expected.matches(13, &[0x08, 0x01, 0x10, 0x29]));
    }

    #[test]
    fn correlated_expectation_honors_field_one_schema_exceptions() {
        let expected = ResponseExpectation::new(49, Some(42), 0, 1_000);
        assert!(expected.matches(49, &[0x08, 0x2a, 0x10, 0x01]));
    }

    #[test]
    fn timeout_arithmetic_saturates() {
        let expected = ResponseExpectation::new(1, None, u64::MAX - 2, 10);
        assert_eq!(expected.remaining_ms(0), u64::MAX);
        assert!(expected.expired(u64::MAX));
    }
}
