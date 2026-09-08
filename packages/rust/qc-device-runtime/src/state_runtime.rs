//! Atomic device-state reducer shared by every native host.
//!
//! The platform adapter decides which thread performs expensive ModelRepo
//! parsing and how observations are published to its UI. Decoding, snapshot
//! reduction, preset-catalog ingestion, and projections are one Rust concern.

use crate::{
    GatewaySnapshot, PresetEntry, PresetFolder, PresetLibrary, PresetList, PresetSlotList,
};
use qc_protocol::profile;
use qc_protocol::responses::{decode_tempo_clock, TempoClock};
use qc_protocol::state::{
    decode_preset_folder, BlockDetails, ModelCatalog, ModelList, StateDecoder, StateUpdate,
};

#[derive(Debug, Clone, PartialEq)]
pub struct StateObservation {
    pub states: Vec<StateUpdate>,
    pub tempo_clock: Option<TempoClock>,
    pub preset_catalog_observed: bool,
}

#[derive(Default)]
pub struct DeviceStateRuntime {
    decoder: StateDecoder,
    snapshot: GatewaySnapshot,
    presets: PresetLibrary,
}

impl DeviceStateRuntime {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn reset(&mut self) {
        self.decoder.reset();
        self.snapshot = GatewaySnapshot::default();
        self.presets.clear();
    }

    /// Decode and atomically reduce one assembled QC message. ModelRepo is
    /// installed separately so hosts can parse that large payload off the hot
    /// receive lane without changing reduction semantics.
    pub fn ingest(
        &mut self,
        message_type: u16,
        payload: &[u8],
    ) -> Result<StateObservation, String> {
        if message_type == profile::MESSAGE_TYPE_MODEL_REPO {
            return Err("ModelRepo must be parsed off-lane and installed atomically".into());
        }
        if message_type == profile::MESSAGE_TYPE_FILE {
            let observed = if let Some(listing) =
                decode_preset_folder(payload).map_err(|error| error.to_string())?
            {
                self.presets.ingest(listing);
                true
            } else {
                false
            };
            return Ok(StateObservation {
                states: Vec::new(),
                tempo_clock: None,
                preset_catalog_observed: observed,
            });
        }
        let states = self
            .decoder
            .decode(message_type, payload)
            .map_err(|error| error.to_string())?;
        for state in &states {
            self.snapshot.apply(state);
        }
        let tempo_clock = if message_type == profile::MESSAGE_TYPE_GLOBAL_TEMPO {
            decode_tempo_clock(payload).map_err(|error| error.to_string())?
        } else {
            None
        };
        Ok(StateObservation {
            states,
            tempo_clock,
            preset_catalog_observed: false,
        })
    }

    pub fn install_model_catalog(&mut self, catalog: ModelCatalog) -> Vec<StateUpdate> {
        let states = self.decoder.install_catalog(catalog);
        for state in &states {
            self.snapshot.apply(state);
        }
        states
    }

    pub fn snapshot(&self) -> &GatewaySnapshot {
        &self.snapshot
    }

    pub fn snapshot_mut(&mut self) -> &mut GatewaySnapshot {
        &mut self.snapshot
    }

    pub fn preset_library(&self) -> &PresetLibrary {
        &self.presets
    }

    pub fn preset_library_mut(&mut self) -> &mut PresetLibrary {
        &mut self.presets
    }

    pub fn block_details(&self, row: u32, column: u32) -> Option<BlockDetails> {
        self.decoder.block_details(row, column)
    }

    pub fn lane_control_details(&self, row: u32, control: &str) -> Option<BlockDetails> {
        self.decoder.lane_control_details(row, control)
    }

    pub fn model_count(&self) -> usize {
        self.decoder.model_count()
    }

    pub fn model_list(&self) -> ModelList {
        self.decoder.model_list()
    }

    pub fn preset_folders(&self) -> Vec<PresetFolder> {
        self.presets.folders()
    }

    pub fn preset_list(&self, key: &str) -> Option<PresetList> {
        self.presets.list(key, &self.snapshot)
    }

    pub fn preset_slots(&self) -> Result<Option<PresetSlotList>, String> {
        self.presets.writable_slots(&self.snapshot)
    }

    pub fn preset_entry(&self, key: &str, position: u32) -> Option<PresetEntry> {
        self.presets.entry(key, position)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reset_clears_all_atomic_state_projections() {
        let mut runtime = DeviceStateRuntime::new();
        runtime
            .preset_library_mut()
            .ensure_setlist("/media/p4/Presets/Test");
        runtime.snapshot_mut().has_preset = true;
        runtime.reset();
        assert!(!runtime.snapshot().has_preset);
        assert!(runtime.preset_folders().is_empty());
    }
}
