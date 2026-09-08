use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const MAX_ENTRIES: usize = 256;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct FlightEntry {
    at_unix_ms: u128,
    #[serde(default)]
    process_id: u32,
    event: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    message_type: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    report_count: Option<usize>,
}

#[derive(Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct FlightDocument {
    version: u8,
    entries: VecDeque<FlightEntry>,
}

/// A bounded, payload-free record of the messages most recently sent to the QC.
/// It is persisted after every entry so a device-side hang does not erase the
/// evidence needed to identify the final operation.
pub struct FlightRecorder {
    path: Option<PathBuf>,
    document: FlightDocument,
    last_persisted_at: Instant,
}

impl FlightRecorder {
    pub fn open_default() -> Self {
        if let Some(path) = std::env::var_os("QC_FLIGHT_RECORDER_PATH").map(PathBuf::from) {
            return Self::open(Some(path));
        }
        let Some(root) = std::env::var_os("LOCALAPPDATA").map(PathBuf::from) else {
            return Self::open(None);
        };
        let path = root.join("QC Remote").join("device-flight-recorder.json");
        let legacy_path = root.join("QC Control").join("device-flight-recorder.json");
        Self::open_with_fallback(Some(path), Some(legacy_path))
    }

    fn open(path: Option<PathBuf>) -> Self {
        Self::open_with_fallback(path, None)
    }

    fn open_with_fallback(path: Option<PathBuf>, fallback: Option<PathBuf>) -> Self {
        let document = path
            .as_deref()
            .and_then(|path| fs::read(path).ok())
            .or_else(|| fallback.as_deref().and_then(|path| fs::read(path).ok()))
            .and_then(|bytes| serde_json::from_slice::<FlightDocument>(&bytes).ok())
            .unwrap_or_else(|| FlightDocument {
                version: 1,
                entries: VecDeque::new(),
            });
        Self {
            path,
            document,
            last_persisted_at: Instant::now(),
        }
    }

    pub fn event(&mut self, event: impl Into<String>) {
        self.push(FlightEntry {
            at_unix_ms: now_unix_ms(),
            process_id: std::process::id(),
            event: event.into(),
            message_type: None,
            report_count: None,
        });
    }

    pub fn outbound(&mut self, message_type: u16, report_count: usize) {
        self.push(FlightEntry {
            at_unix_ms: now_unix_ms(),
            process_id: std::process::id(),
            event: "outbound".into(),
            message_type: Some(message_type),
            report_count: Some(report_count),
        });
    }

    pub fn inbound(&mut self, message_type: u16, report_count: usize) {
        self.push(FlightEntry {
            at_unix_ms: now_unix_ms(),
            process_id: std::process::id(),
            event: "inbound".into(),
            message_type: Some(message_type),
            report_count: Some(report_count),
        });
    }

    fn push(&mut self, entry: FlightEntry) {
        self.document.entries.push_back(entry);
        while self.document.entries.len() > MAX_ENTRIES {
            // A healthy idle link emits nothing but Version probe/reply pairs,
            // roughly 90% of all traffic on this session. Evicting oldest-first
            // let eight idle minutes overwrite the whole record, so a hang
            // investigated afterwards had no trace of the operation that hung.
            // Drop the oldest routine probe before any real operation.
            let evict = self
                .document
                .entries
                .iter()
                .position(is_routine_liveness)
                .unwrap_or(0);
            self.document.entries.remove(evict);
        }
        // Rewriting the bounded JSON document synchronously for every 129-byte
        // HID report used to stretch Cortex Control's initialization burst by
        // hundreds of milliseconds. Keep recording in memory on the realtime
        // path and checkpoint at most once per second; Drop performs a final
        // flush on orderly shutdown.
        if self.last_persisted_at.elapsed() >= Duration::from_secs(1) {
            self.persist();
            self.last_persisted_at = Instant::now();
        }
    }

    fn persist(&self) {
        let Some(path) = self.path.as_deref() else {
            return;
        };
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(document) = serde_json::to_vec_pretty(&self.document) {
            let _ = fs::write(path, document);
        }
    }

    #[cfg(test)]
    fn for_test() -> Self {
        Self::open(None)
    }
}

impl Drop for FlightRecorder {
    fn drop(&mut self) {
        self.persist();
    }
}

/// True for the idle keepalive Version probe and its reply.
///
/// These are the highest-volume, lowest-value entries in the record: they are
/// by definition the "nothing happened" case. They stay recorded so an idle
/// stretch is still visible, but they are the first thing evicted.
fn is_routine_liveness(entry: &FlightEntry) -> bool {
    // Both directions, at any size: the probe is a single report but the QC
    // answers it with several, so matching only one-report entries evicted the
    // probe while keeping its reply — leaving a record of inbound Version
    // traffic with no outbound cause.
    matches!(entry.event.as_str(), "outbound" | "inbound")
        && entry.message_type == Some(qc_protocol::profile::MESSAGE_TYPE_VERSION)
}

fn now_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recorder_is_bounded_and_contains_no_payload_field() {
        let mut recorder = FlightRecorder::for_test();
        for message_type in 0..(MAX_ENTRIES + 20) {
            recorder.outbound(message_type as u16, 1);
        }
        assert_eq!(recorder.document.entries.len(), MAX_ENTRIES);
        assert!(recorder
            .document
            .entries
            .iter()
            .all(|entry| entry.process_id > 0));
        let json = serde_json::to_value(&recorder.document).unwrap();
        assert!(json.to_string().find("payload").is_none());
        assert_eq!(json["entries"][0]["messageType"], 20);
    }

    #[test]
    fn recorder_captures_inbound_frame_size_without_payload_data() {
        let mut recorder = FlightRecorder::for_test();
        recorder.inbound(40, 1191);
        let json = serde_json::to_value(&recorder.document).unwrap();
        assert_eq!(json["entries"][0]["event"], "inbound");
        assert_eq!(json["entries"][0]["messageType"], 40);
        assert_eq!(json["entries"][0]["reportCount"], 1191);
        assert!(json.to_string().find("payload").is_none());
    }

    #[test]
    fn idle_liveness_traffic_never_evicts_a_real_operation() {
        let mut recorder = FlightRecorder::for_test();
        recorder.event("handshake-reply");
        recorder.outbound(15, 1);
        recorder.inbound(40, 1191);

        // A healthy idle link produces nothing but Version probe/reply pairs.
        // Eight minutes of them used to overwrite the entire record, so a hang
        // investigated afterwards had no evidence of the operation that hung.
        for _ in 0..(MAX_ENTRIES * 2) {
            recorder.outbound(qc_protocol::profile::MESSAGE_TYPE_VERSION, 1);
            recorder.inbound(qc_protocol::profile::MESSAGE_TYPE_VERSION, 1);
        }

        assert_eq!(recorder.document.entries.len(), MAX_ENTRIES);
        let events: Vec<&str> = recorder
            .document
            .entries
            .iter()
            .map(|entry| entry.event.as_str())
            .collect();
        assert!(events.contains(&"handshake-reply"));
        assert!(recorder
            .document
            .entries
            .iter()
            .any(|entry| entry.message_type == Some(15)));
        assert!(recorder
            .document
            .entries
            .iter()
            .any(|entry| entry.message_type == Some(40) && entry.report_count == Some(1191)));
    }

    #[test]
    fn the_liveness_reply_is_evicted_with_its_probe() {
        // The probe is one report but the QC answers it with three, so keying
        // "routine" on a single report evicted the probe and kept the reply —
        // the record then showed inbound Version traffic with no outbound
        // cause, which is exactly backwards for diagnosing a silent link.
        let mut recorder = FlightRecorder::for_test();
        for message_type in 0..MAX_ENTRIES {
            recorder.outbound(message_type as u16 % 9 + 20, 1);
        }
        for _ in 0..MAX_ENTRIES {
            recorder.outbound(qc_protocol::profile::MESSAGE_TYPE_VERSION, 1);
            recorder.inbound(qc_protocol::profile::MESSAGE_TYPE_VERSION, 3);
        }

        assert_eq!(recorder.document.entries.len(), MAX_ENTRIES);
        let version_entries = recorder
            .document
            .entries
            .iter()
            .filter(|entry| entry.message_type == Some(qc_protocol::profile::MESSAGE_TYPE_VERSION))
            .count();
        assert_eq!(
            version_entries, 0,
            "idle Version traffic must never displace real operations"
        );
    }

    #[test]
    fn recorder_flushes_on_drop() {
        let path = std::env::temp_dir().join(format!(
            "qc-flight-recorder-{}-{}.json",
            std::process::id(),
            now_unix_ms()
        ));
        {
            let mut recorder = FlightRecorder::open(Some(path.clone()));
            recorder.event("physical-transfer-test");
            recorder.inbound(40, 1191);
        }
        let document: FlightDocument =
            serde_json::from_slice(&fs::read(&path).expect("flight record persisted"))
                .expect("flight record is valid JSON");
        assert_eq!(document.entries.len(), 2);
        assert_eq!(document.entries[1].message_type, Some(40));
        let _ = fs::remove_file(path);
    }
}
