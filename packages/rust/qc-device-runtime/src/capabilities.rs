//! Runtime evidence for retail-only protocol capabilities.
//!
//! A protobuf type in Cortex Control is schema evidence, not proof that a
//! particular retail CorOS build implements it. Hosts should begin at
//! `SchemaOnly`, promote a capability only after a correlated response, and
//! retain unsupported/unknown outcomes in physical-conformance evidence.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RetailCapability {
    Diagnostics,
    Screenshot,
    GraphicsTree,
    MousePress,
    MouseRelease,
    MouseMove,
    MouseTap,
    MouseDrag,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum CapabilityEvidence {
    SchemaOnly,
    RetailResponse,
    PhysicalObservation,
    Unsupported { reason: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetailCapabilityState {
    /// The examined Cortex Control binary exposes cloud feature flags, but no
    /// evidence ties those flags to message 7 or 72. Keep the source explicit.
    pub feature_gate_source: String,
    pub capabilities: BTreeMap<RetailCapability, CapabilityEvidence>,
}

impl Default for RetailCapabilityState {
    fn default() -> Self {
        Self {
            feature_gate_source: "none-observed-in-cortex-control-4.1.0".into(),
            capabilities: RetailCapability::ALL
                .into_iter()
                .map(|capability| (capability, CapabilityEvidence::SchemaOnly))
                .collect(),
        }
    }
}

impl RetailCapability {
    pub const ALL: [Self; 8] = [
        Self::Diagnostics,
        Self::Screenshot,
        Self::GraphicsTree,
        Self::MousePress,
        Self::MouseRelease,
        Self::MouseMove,
        Self::MouseTap,
        Self::MouseDrag,
    ];

    /// Non-mutating probes safe to run automatically on a retail device.
    pub const SAFE_PROBES: [Self; 3] = [Self::Diagnostics, Self::Screenshot, Self::GraphicsTree];
}

impl RetailCapabilityState {
    pub fn record_retail_response(&mut self, capability: RetailCapability) {
        self.capabilities
            .insert(capability, CapabilityEvidence::RetailResponse);
    }

    pub fn record_physical_observation(&mut self, capability: RetailCapability) {
        self.capabilities
            .insert(capability, CapabilityEvidence::PhysicalObservation);
    }

    pub fn record_unsupported(&mut self, capability: RetailCapability, reason: impl Into<String>) {
        self.capabilities.insert(
            capability,
            CapabilityEvidence::Unsupported {
                reason: reason.into(),
            },
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_presence_never_defaults_to_retail_support() {
        let state = RetailCapabilityState::default();
        assert!(state
            .capabilities
            .values()
            .all(|value| value == &CapabilityEvidence::SchemaOnly));
        assert_eq!(RetailCapability::SAFE_PROBES.len(), 3);
        assert!(!RetailCapability::SAFE_PROBES.contains(&RetailCapability::MouseTap));
    }

    #[test]
    fn runtime_evidence_is_explicit_and_capability_specific() {
        let mut state = RetailCapabilityState::default();
        state.record_retail_response(RetailCapability::Diagnostics);
        state.record_unsupported(RetailCapability::GraphicsTree, "no correlated reply");
        assert_eq!(
            state.capabilities[&RetailCapability::Diagnostics],
            CapabilityEvidence::RetailResponse
        );
        assert!(matches!(
            state.capabilities[&RetailCapability::GraphicsTree],
            CapabilityEvidence::Unsupported { .. }
        ));
        assert_eq!(
            state.capabilities[&RetailCapability::MouseMove],
            CapabilityEvidence::SchemaOnly
        );
    }
}
