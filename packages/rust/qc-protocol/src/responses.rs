//! Platform-neutral decoding for correlated device replies that are not part
//! of the continuous preset-state stream.

use crate::{
    compression::{maybe_gunzip, InflateError},
    generated_payloads::{
        ExpressionPortSettings, GeneralSettings, GlobalBypassRows, GlobalEqParameter,
        GlobalEqSettings, HeadphonesFeed, HeadphonesSettings, InputPortSettings, IoSettings,
        LooperStatus, MasterVolumeAssignment, MidiPortSettings, ModeCycle, OutputPortSettings,
        TempoModeSettings, TempoSettings, TunerSettings, UsbPortSettings,
    },
    profile,
    proto::cortex_protobuf_v2 as pa,
    proto::{param_value, Param},
};
use prost::Message;
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ResponseDecodeError {
    #[error("the QC protobuf reply exceeded the shared 1 MiB frame-size limit")]
    OversizedReply,
    #[error("QC protobuf reply could not be decoded: {0}")]
    Protobuf(#[from] prost::DecodeError),
    #[error("compressed QC reply exceeds the inflated-size limit")]
    InflatedLimit,
    #[error("compressed QC reply could not be decoded: {0}")]
    Compression(String),
    #[error("the QC reply is incomplete: {0}")]
    Incomplete(&'static str),
    #[error("the QC reply does not match the request: {0}")]
    Mismatch(&'static str),
    #[error("the QC response is not a PNG image")]
    InvalidPng,
    #[error("the QC backup exceeded the 32 MiB safety limit")]
    OversizedBackup,
    #[error("the QC backup stream ended with an incomplete or unsupported document")]
    InvalidBackupDocument,
}

impl From<InflateError> for ResponseDecodeError {
    fn from(error: InflateError) -> Self {
        match error {
            InflateError::Limit => Self::InflatedLimit,
            InflateError::Decode(message) => Self::Compression(message),
        }
    }
}

fn decode_reply<M>(payload: &[u8]) -> Result<M, ResponseDecodeError>
where
    M: Message + Default,
{
    if payload.len() > profile::MAX_FRAME_BYTES {
        return Err(ResponseDecodeError::OversizedReply);
    }
    let decoded = maybe_gunzip(payload)?;
    Ok(M::decode(decoded.as_slice())?)
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceIdentity {
    pub serial: String,
    pub app_fw_version: Option<String>,
    pub custom_name: Option<String>,
    pub device_type: Option<i32>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InhibitedModules {
    pub global_gate: bool,
    pub global_eq: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryEntry {
    pub name: String,
    pub key: String,
    pub folder_key: Option<String>,
    pub folder_name: Option<String>,
    pub position: Option<u32>,
    pub instrument: Option<i32>,
    pub is_factory: bool,
    pub is_plugin: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryEntries {
    pub entries: Vec<LibraryEntry>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PinnedModels {
    pub models: Vec<u32>,
    pub captures: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PngImage {
    pub bytes: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TempoClock {
    pub current_beat: u32,
    pub current_bar: u32,
    pub current_tick: u32,
}

#[derive(Debug, Default)]
pub struct BackupAssembler {
    document: String,
    started: bool,
    chunks: usize,
    ignored_prefix_chunks: usize,
    ignored_prefix_terminators: usize,
}

impl BackupAssembler {
    pub fn reset(&mut self) {
        self.document.clear();
        self.started = false;
        self.chunks = 0;
        self.ignored_prefix_chunks = 0;
        self.ignored_prefix_terminators = 0;
    }

    pub fn started(&self) -> bool {
        self.started
    }

    pub fn chunks(&self) -> usize {
        self.chunks
    }

    pub fn ignored_prefix_chunks(&self) -> usize {
        self.ignored_prefix_chunks
    }

    pub fn ignored_prefix_terminators(&self) -> usize {
        self.ignored_prefix_terminators
    }

    pub fn push(&mut self, payload: &[u8]) -> Result<Option<String>, ResponseDecodeError> {
        let message: pa::LocalBackupMessage = decode_reply(payload)?;
        let terminal = matches!(
            message.is_last_chunk,
            Some(true)
        );
        let chunk = match message.backup_json {
            Some(chunk) => chunk,
            None => String::new(),
        };

        if !self.started {
            // Current QC firmware does not echo request_id on LocalBackup
            // replies. A new client can therefore inherit the tail of a
            // transfer started by an earlier session. Synchronize only at a
            // JSON document boundary and ignore every preceding fragment or
            // terminator.
            if !chunk.trim_start().starts_with('{') {
                if !chunk.is_empty() || terminal {
                    self.ignored_prefix_chunks = self.ignored_prefix_chunks.saturating_add(1);
                }
                if terminal {
                    self.ignored_prefix_terminators =
                        self.ignored_prefix_terminators.saturating_add(1);
                }
                return Ok(None);
            }
            self.started = true;
        }

        self.chunks = self.chunks.saturating_add(1);
        self.document.push_str(&chunk);
        if self.document.len() > profile::BACKUP_MAXIMUM_DOCUMENT_BYTES {
            self.reset();
            return Err(ResponseDecodeError::OversizedBackup);
        }

        if terminal {
            let valid = serde_json::from_str::<serde_json::Value>(&self.document)
                .ok()
                .is_some_and(|document| {
                    document.get("type").and_then(serde_json::Value::as_str) == Some("backup")
                        && document.get("creator").and_then(serde_json::Value::as_str)
                            == Some("quad")
                });
            if !valid {
                self.reset();
                return Err(ResponseDecodeError::InvalidBackupDocument);
            }
            let complete = std::mem::take(&mut self.document);
            self.started = false;
            self.chunks = 0;
            return Ok(Some(complete));
        }
        Ok(None)
    }
}

pub fn decode_tempo_clock(payload: &[u8]) -> Result<Option<TempoClock>, ResponseDecodeError> {
    let message: pa::GlobalTempoMessage = decode_reply(payload)?;
    let Some(status) =
        message.metronome_status
    else {
        return Ok(None);
    };
    Ok(Some(TempoClock {
        current_beat: status.current_beat,
        current_bar: status.current_bar,
        current_tick: status.current_tick,
    }))
}

pub fn decode_device_identity(payload: &[u8]) -> Result<DeviceIdentity, ResponseDecodeError> {
    let message: pa::VersionMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch(
            "identity action is not UPDATE",
        ));
    }
    let serial = match message.device_serial_number {
        Some(value) => value,
        None => return Err(ResponseDecodeError::Incomplete("device serial number")),
    };
    let app_fw_version = message
        .app_fw_version;
    let custom_name = message
        .custom_name;
    // proto3 renders an enum field as its i32 tag, which is what DeviceIdentity
    // carries; the wrapper this used to unwrap is gone with the oneof.
    let device_type = message.device_type;
    Ok(DeviceIdentity {
        serial,
        app_fw_version,
        custom_name,
        device_type,
    })
}

pub fn decode_recents_favorites(
    payload: &[u8],
    request_id: u64,
) -> Result<LibraryEntries, ResponseDecodeError> {
    let message: pa::RecentsFavoritesMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch(
            "recents/favorites action is not UPDATE",
        ));
    }
    let actual_id = message
        .request_id
        .ok_or(ResponseDecodeError::Incomplete(
            "recents/favorites request_id",
        ))?;
    if actual_id != request_id {
        return Err(ResponseDecodeError::Mismatch(
            "recents/favorites request_id does not match",
        ));
    }
    Ok(LibraryEntries {
        entries: message
            .items
            .into_iter()
            .map(|item| {
                if item.name.is_empty() || item.folder_key.is_empty() {
                    return Err(ResponseDecodeError::Incomplete(
                        "recents/favorites item identity",
                    ));
                }
                Ok(LibraryEntry {
                    key: item.folder_key.clone(),
                    name: item.name,
                    folder_key: Some(item.folder_key),
                    folder_name: (!item.folder_name.is_empty()).then_some(item.folder_name),
                    position: None,
                    instrument: None,
                    is_factory: item.is_factory,
                    is_plugin: item.is_plugin,
                })
            })
            .collect::<Result<_, ResponseDecodeError>>()?,
    })
}

pub fn decode_pinned_models(payload: &[u8]) -> Result<PinnedModels, ResponseDecodeError> {
    let message: pa::PinnedModelsMessage = decode_reply(payload)?;
    Ok(PinnedModels {
        models: message.models,
        captures: message.captures,
    })
}

pub fn decode_library_files(
    payload: &[u8],
    request_id: Option<u64>,
    folder_key: &str,
) -> Result<LibraryEntries, ResponseDecodeError> {
    let message: pa::FileMessage = decode_reply(payload)?;
    // File READ replies are broadcasts. Depending on the CorOS path that
    // produced them, the action may be UPDATE or the protobuf default CREATE;
    // folder identity (plus request_id for typed reads) is authoritative.
    let actual_id = message
        .request_id;
    if let Some(request_id) = request_id {
        if actual_id != Some(request_id) {
            return Err(ResponseDecodeError::Mismatch(
                "file listing request_id does not match",
            ));
        }
    }
    let folder = message
        .folder
        .ok_or(ResponseDecodeError::Incomplete("file listing folder"))?;
    let actual_key = folder
        .key
        .ok_or(ResponseDecodeError::Incomplete("file listing folder key"))?;
    if actual_key.trim_end_matches('/') != folder_key.trim_end_matches('/') {
        return Err(ResponseDecodeError::Mismatch(
            "file listing folder does not match",
        ));
    }
    let is_factory = folder
        .is_factory
        .unwrap_or(false);
    let folder_name = folder
        .name
        .unwrap_or_else(|| {
            actual_key
                .trim_end_matches('/')
                .rsplit('/')
                .next()
                .unwrap_or_default()
                .to_string()
        });
    Ok(LibraryEntries {
        entries: folder
            .files
            .into_iter()
            .map(|file| {
                let key = file
                    .key
                    .filter(|value| !value.is_empty())
                    .ok_or(ResponseDecodeError::Incomplete("file key"))?;
                let name = file
                    .name
                    .filter(|value| !value.is_empty())
                    .ok_or(ResponseDecodeError::Incomplete("file name"))?;
                let position = file
                    .index
                    .map(u32::try_from)
                    .transpose()
                    .map_err(|_| ResponseDecodeError::Mismatch("negative file position"))?;
                let instrument = file
                    .instrument;
                Ok(LibraryEntry {
                    name,
                    key,
                    folder_key: Some(actual_key.clone()),
                    folder_name: Some(folder_name.clone()),
                    position,
                    instrument,
                    is_factory,
                    is_plugin: false,
                })
            })
            .collect::<Result<_, ResponseDecodeError>>()?,
    })
}

pub fn decode_tuner_settings(payload: &[u8]) -> Result<TunerSettings, ResponseDecodeError> {
    let message: pa::TunerMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch("tuner action is not UPDATE"));
    }
    let input_port_id = message
        .input_port_id
        .ok_or(ResponseDecodeError::Incomplete("tuner input_port_id"))?;
    let reference_offset_hz = message
        .frequency
        .ok_or(ResponseDecodeError::Incomplete("tuner frequency"))?;
    let muted = message
        .mute
        .ok_or(ResponseDecodeError::Incomplete("tuner mute"))?;
    Ok(TunerSettings {
        input_port_id,
        reference_offset_hz,
        reference_hz: 440.0 + reference_offset_hz,
        muted,
    })
}

pub fn decode_general_settings(payload: &[u8]) -> Result<GeneralSettings, ResponseDecodeError> {
    let message: pa::GeneralSettingsMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch(
            "general-settings action is not UPDATE",
        ));
    }
    let scene_bypass_behavior = match message.scene_block_bypass {
        Some(value) => Some(
            match value {
                0 => "alwaysOverwrite",
                1 => "nonstompOverwrite",
                2 => "neverOverwrite",
                _ => {
                    return Err(ResponseDecodeError::Mismatch(
                        "unknown scene_block_bypass value",
                    ))
                }
            }
            .to_string(),
        ),
        None => return Err(ResponseDecodeError::Incomplete("scene_block_bypass")),
    };
    let midi_clock_out = match message.midi_clock_out {
        Some(value) => Some(
            match value {
                0 => "off",
                1 => "midiDinOnly",
                2 => "usbMidiOnly",
                3 => "bothUsbAndDinMidi",
                _ => {
                    return Err(ResponseDecodeError::Mismatch(
                        "unknown midi_clock_out value",
                    ))
                }
            }
            .to_string(),
        ),
        None => None,
    };
    let rows = |value: pa::GlobalBypassRows| GlobalBypassRows {
        row1: value.row1,
        row2: value.row2,
        row3: value.row3,
        row4: value.row4,
    };
    let hold_timing_index = message
        .hold_timing;
    if hold_timing_index.is_some_and(|value| !(0..=5).contains(&value)) {
        return Err(ResponseDecodeError::Mismatch("hold_timing is out of range"));
    }
    Ok(GeneralSettings {
        screen_brightness: message.screen_brightness.map(
            |value| value,
        ),
        led_brightness: message
            .led_brightness,
        dimmed_led_brightness: message.dimmed_led_brightness.map(
            |value| value,
        ),
        lock_screen_and_volume_knob: message.lock_screen_and_volume_knob.map(
            |value,| value,
        ),
        global_bypass_cab: message.global_bypass_cab.map(
            |value| rows(value),
        ),
        global_bypass_ir: message.global_bypass_ir.map(
            |value| rows(value),
        ),
        scene_bypass_behavior,
        midi_over_usb: message
            .midi_over_usb,
        midi_channel: message
            .midi_channel,
        ignore_duplicate_pc: message.ignore_duplicate_pc.map(
            |value| value,
        ),
        available_disk_space: message.available_disk_space.map(
            |value| value,
        ),
        total_disk_space: message.total_disk_space.map(
            |value| value,
        ),
        internal_midi_clock_enabled: message.internal_midi_clock_enabled.map(
            |value,| value,
        ),
        master_volume_assignment: message.master_volume_assignment.map(
            |value| {
                MasterVolumeAssignment {
                    out12: value.out12,
                    out34: value.out34,
                    send12: value.send12,
                    headphones: value.headphones,
                }
            },
        ),
        stomp_mode_auto_assign: message.stomp_mode_auto_assign.map(
            |value| value,
        ),
        swap_tempo_tuner_access: message.swap_tempo_tuner_access.map(
            |value| value,
        ),
        midi_clock_out,
        disable_internet_connection_check: message.disable_internet_connection_check.map(
            |value| value,
        ),
        dynamic_delay_compensation: message.enable_dynamic_delay_compensation.map(
            |value| value,
        ),
        preset_dimmed: message.enable_preset_dimmed.map(
            |value| value,
        ),
        scene_dimmed: message.enable_scene_dimmed.map(
            |value| value,
        ),
        stomp_dimmed: message.enable_stomp_dimmed.map(
            |value| value,
        ),
        midi_clock_in: message.midi_clock_in_enabled.map(
            |value| value,
        ),
        gig_view_stomp_access: message.gig_view_stomp_access_enabled.map(
            |value,| value,
        ),
        hold_timing_index,
        hold_timing_ms: hold_timing_index.map(|value| 500 + 100 * value),
    })
}

pub fn decode_io_settings(payload: &[u8]) -> Result<IoSettings, ResponseDecodeError> {
    let message: pa::IoSettingsMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch(
            "I/O settings action is not UPDATE",
        ));
    }
    let settings = message
        .settings
        .ok_or(ResponseDecodeError::Incomplete("I/O settings"))?;
    if settings.in_port.is_empty() {
        return Err(ResponseDecodeError::Incomplete("input ports"));
    }

    let inputs = settings
        .in_port
        .into_iter()
        .map(|port| {
            let level = port
                .level;
            InputPortSettings {
                input_port_id: port.input_port_id,
                level,
                level_db: level.map(|value| -12.0 + 72.0 * value),
                impedance: port
                    .input_zmode,
                input_type: port
                    .input_type,
                ground_lift: port
                    .ground_lift,
                plugged: port
                    .plugged,
            }
        })
        .collect();
    let outputs = settings
        .out_port
        .into_iter()
        .map(|port| OutputPortSettings {
            output_port_id: port.output_port_id,
            level: port
                .level,
            ground_lift: port
                .ground_lift,
            muted: port
                .mute,
            plugged: port
                .plugged,
        })
        .collect();
    let expression_ports = settings
        .exp_port
        .into_iter()
        .map(|port| ExpressionPortSettings {
            expression_port_id: port.exp_port_id,
            plugged: port
                .plugged,
            level: port
                .level,
            calibrating: port
                .calibrating,
        })
        .collect();
    let headphones =
        settings.hp_port.map(
            |port| HeadphonesSettings {
                feeds: port
                    .hp_feed
                    .into_iter()
                    .map(|feed| HeadphonesFeed {
                        output_port_id: feed.output_port_id,
                        level: feed.level,
                    })
                    .collect(),
                level: port
                    .level,
                plugged: port
                    .plugged,
            },
        );
    let usb = settings.usb_port.map(
        |port| UsbPortSettings {
            level: port
                .level,
            headphones_source: port
                .hp_select,
            plugged: port
                .plugged,
            dry_wet: port
                .dry_wet,
        },
    );
    let midi =
        settings.midi_port.map(
            |port| MidiPortSettings {
                thru: port
                    .midi_thru,
            },
        );

    Ok(IoSettings {
        inputs,
        outputs,
        expression_ports,
        headphones,
        usb,
        midi,
        xlr12_linked: message
            .xlr1_2_linked,
        out34_linked: message
            .out3_4_linked,
    })
}

pub fn decode_global_eq(payload: &[u8]) -> Result<GlobalEqSettings, ResponseDecodeError> {
    let message: pa::GlobalEqMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch(
            "Global EQ action is not UPDATE",
        ));
    }
    Ok(GlobalEqSettings {
        parameters: message
            .parameters
            .into_iter()
            .map(|parameter| GlobalEqParameter {
                parameter_index: parameter.parameter_index,
                value: parameter.value,
            })
            .collect(),
        bypassed: message
            .bypassed,
    })
}

pub fn decode_mode_cycle(payload: &[u8]) -> Result<ModeCycle, ResponseDecodeError> {
    let message: pa::ModeMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch("mode action is not UPDATE"));
    }
    let slots = message
        .available_modes
        .map(|value| value.modes)
        .filter(|values| !values.is_empty())
        .ok_or(ResponseDecodeError::Incomplete("mode cycle"))?;
    Ok(ModeCycle { slots })
}

pub fn decode_looper_status(payload: &[u8]) -> Result<LooperStatus, ResponseDecodeError> {
    let message: pa::LooperMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch("looper action is not UPDATE"));
    }
    let status = message
        .status
        .ok_or(ResponseDecodeError::Incomplete("looper status"))?;
    Ok(LooperStatus {
        state: Some(status.state),
        progress: Some(status.progress),
        undo_progress: Some(status.undo_progress),
        duplicate_cycle: Some(status.duplicate_cycle),
        num_duplicate_cycles: Some(status.num_duplicate_cycles),
        one_shot_stopped: Some(status.one_shot_stopped),
        redo_available: Some(status.redo_available),
        loop_length: Some(status.loop_length),
        free_samples: Some(status.free_samples),
        in_reverse: Some(status.in_reverse),
        one_shot: Some(status.one_shot),
        half_speed: Some(status.half_speed),
        fixed_duplicate_cycles: Some(status.fixed_duplicate_cycles),
        armed: Some(status.armed),
        waiting_for_cycle: Some(status.waiting_for_cycle),
        undo_count: Some(status.undo_count),
        max_write_displacement: Some(status.max_write_displacement),
        min_write_displacement: Some(status.min_write_displacement),
        events_waiting_for_quantize: Some(status.events_waiting_for_quantize),
        current_clock: Some(status.current_clock),
        transition: Some(status.transition),
        action: Some(status.action),
        one_shot_play: message
            .one_shot_play,
        sync_start_waiting: message
            .sync_start_waiting,
        quantize_enabled: message
            .quantize_enabled,
        update_type: message
            .update_type,
    })
}

fn tempo_value(parameter: &Param) -> Option<f32> {
    parameter
        .param_values
        .first()
        .and_then(|value| match value.value {
            Some(param_value::Value::FloatValue(value)) if (0.0..=1.0).contains(&value) => {
                Some(value)
            }
            _ => None,
        })
}

fn discrete(value: f32, labels: &[&str]) -> Option<String> {
    if !(0.0..=1.0).contains(&value) || labels.is_empty() {
        return None;
    }
    let index = (value * (labels.len() - 1) as f32).round() as usize;
    labels.get(index).map(|label| (*label).to_string())
}

/// Decode the preset/global TempoControl parameter vector. Unknown parameter 23
/// is intentionally ignored; the 23 attributed parameters are preserved here.
pub fn decode_tempo_settings(parameters: &[Param]) -> TempoSettings {
    const SIGNATURES: &[&str] = &[
        "2/4",
        "3/4",
        "4/4",
        "5/4",
        "6/4",
        "7/4",
        "8/4",
        "9/4",
        "10/4",
        "11/4",
        "12/4",
        "13/4",
        "3/8",
        "6/8",
        "9/8",
        "12/8",
        "5/8 (3+2)",
        "5/8 (2+3)",
        "7/8 (3+2+2)",
        "7/8 (2+3+2)",
        "7/8 (2+2+3)",
    ];
    const SUBDIVISIONS: &[&str] = &["1/4", "1/8", "1/8T", "1/16"];
    const SOUNDS: &[&str] = &[
        "BLIP", "BLOCK", "COWBELL", "DIGITAL", "DRUM KIT", "SOFT KIT",
    ];
    const ROUTING: &[&str] = &["MULTI", "HP", "OUT 1/2", "OUT 3/4", "SEND 1/2"];
    const BEATS: &[&str] = &["OFF", "MUTE", "DOWN", "ON"];
    let mut values = [None; 23];
    for (position, parameter) in parameters.iter().enumerate() {
        let index = match parameter.index {
            Some(index) => index as usize,
            None => position,
        };
        if index < values.len() {
            values[index] = tempo_value(parameter);
        }
    }
    TempoSettings {
        mode: None,
        bpm: values[0].map(|value| (40.0 + 200.0 * value).round() as u32),
        led_enabled: values[2].map(|value| value >= 0.5),
        volume_db: values[3].map(|value| -60.0 + 69.0 * value),
        running: values[4].map(|value| value >= 0.5),
        pan: values[5].map(|value| -1.0 + 2.0 * value),
        time_signature: values[6].and_then(|value| discrete(value, SIGNATURES)),
        subdivision: values[7].and_then(|value| discrete(value, SUBDIVISIONS)),
        sound: values[8].and_then(|value| discrete(value, SOUNDS)),
        routing: values[9].and_then(|value| discrete(value, ROUTING)),
        beats: values[10..23]
            .iter()
            .filter_map(|value| value.and_then(|value| discrete(value, BEATS)))
            .collect(),
    }
}

/// Decode only the device-wide PRESET/GLOBAL switch from a GlobalTempo params
/// push. Clock-only messages are rejected so callers can wait for the right shape.
pub fn decode_tempo_mode(payload: &[u8]) -> Result<TempoModeSettings, ResponseDecodeError> {
    let message: pa::GlobalTempoMessage = decode_reply(payload)?;
    let value = message
        .params
        .iter()
        .find_map(|parameter| {
            matches!(parameter.index, Some(1))
                .then(|| tempo_value(parameter))?
        })
        .ok_or(ResponseDecodeError::Incomplete(
            "GlobalTempo mode parameter",
        ))?;
    let mode = match value {
        value if (value - 0.0).abs() < 0.000_01 => "PRESET",
        value if (value - 1.0).abs() < 0.000_01 => "GLOBAL",
        _ => return Err(ResponseDecodeError::Mismatch("GlobalTempo mode value")),
    };
    Ok(TempoModeSettings { mode: mode.into() })
}

pub fn decode_global_tempo_settings(payload: &[u8]) -> Result<TempoSettings, ResponseDecodeError> {
    let message: pa::GlobalTempoMessage = decode_reply(payload)?;
    if message.params.is_empty() {
        return Err(ResponseDecodeError::Incomplete("GlobalTempo parameters"));
    }
    let mut settings = decode_tempo_settings(&message.params);
    settings.mode = Some(decode_tempo_mode(payload)?.mode);
    Ok(settings)
}

/// Decode the loaded preset's TempoControl block from a correlated preset read.
/// PRESET/GLOBAL mode is device-wide and therefore composed separately from a
/// GlobalTempo reply by the native host.
pub fn decode_preset_tempo_settings(
    payload: &[u8],
    expected_request_id: u64,
) -> Result<TempoSettings, ResponseDecodeError> {
    let message: pa::RecallPresetMessage = decode_reply(payload)?;
    let request_id = match message.request_id {
        Some(value) => value,
        None => return Err(ResponseDecodeError::Incomplete("request id")),
    };
    if request_id != expected_request_id {
        return Err(ResponseDecodeError::Mismatch("current preset request id"));
    }
    let preset = match message.preset {
        Some(value) => value,
        None => return Err(ResponseDecodeError::Incomplete("current preset")),
    };
    let tempo = preset
        .tempo_program_data
        .first()
        .ok_or(ResponseDecodeError::Incomplete("preset TempoControl"))?;
    Ok(decode_tempo_settings(&tempo.params))
}

pub fn decode_inhibited_modules(payload: &[u8]) -> Result<InhibitedModules, ResponseDecodeError> {
    let message: pa::CompilerInhibitedModulesMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch(
            "inhibited-modules action is not UPDATE",
        ));
    }
    let global_gate = match message.global_gate {
        Some(value) => value,
        None => return Err(ResponseDecodeError::Incomplete("global_gate")),
    };
    let global_eq = match message.global_eq {
        Some(value) => value,
        None => return Err(ResponseDecodeError::Incomplete("global_eq")),
    };
    Ok(InhibitedModules {
        global_gate,
        global_eq,
    })
}

fn png_image(bytes: Vec<u8>) -> Result<PngImage, ResponseDecodeError> {
    const SIGNATURE: &[u8] = b"\x89PNG\r\n\x1a\n";
    if bytes.len() < 24
        || !bytes.starts_with(SIGNATURE)
        || bytes.get(8..12) != Some(13_u32.to_be_bytes().as_slice())
        || bytes.get(12..16) != Some(b"IHDR")
    {
        return Err(ResponseDecodeError::InvalidPng);
    }
    let width = bytes
        .get(16..20)
        .and_then(|value| value.try_into().ok())
        .map(u32::from_be_bytes)
        .filter(|value| *value != 0)
        .ok_or(ResponseDecodeError::InvalidPng)?;
    let height = bytes
        .get(20..24)
        .and_then(|value| value.try_into().ok())
        .map(u32::from_be_bytes)
        .filter(|value| *value != 0)
        .ok_or(ResponseDecodeError::InvalidPng)?;
    Ok(PngImage {
        width,
        height,
        bytes,
    })
}

pub fn decode_preset_screenshot(
    payload: &[u8],
    expected_request_id: u64,
    folder_name: &str,
    position: u32,
    is_factory: bool,
) -> Result<PngImage, ResponseDecodeError> {
    let message: pa::ScreenshotMessage = decode_reply(payload)?;
    let request_id = match message.request_id {
        Some(value) => value,
        None => return Err(ResponseDecodeError::Incomplete("request id")),
    };
    let expected_position = i32::try_from(position)
        .map_err(|_| ResponseDecodeError::Mismatch("preset screenshot position overflow"))?;
    if request_id != expected_request_id
        || message.folder_name != folder_name
        || message.index != expected_position
        || message.is_factory != is_factory
    {
        return Err(ResponseDecodeError::Mismatch("preset screenshot target"));
    }
    let bytes = match message.png {
        Some(value) => value,
        None => return Err(ResponseDecodeError::Incomplete("PNG payload")),
    };
    png_image(bytes)
}

pub fn decode_captured_screen(payload: &[u8]) -> Result<PngImage, ResponseDecodeError> {
    let message: pa::RemoteControlMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch("screen action is not UPDATE"));
    }
    let bytes = message
        .screenshot
        .and_then(|value| value.payload)
        .ok_or(ResponseDecodeError::Incomplete("screen PNG payload"))?;
    png_image(bytes)
}

/// Decode the device's live `zenUI` widget tree; see [`commands::read_graphics_tree`].
///
/// The payload is indented text, not a structured message, so it is returned
/// verbatim for a caller to parse or diff.
pub fn decode_graphics_tree(payload: &[u8]) -> Result<String, ResponseDecodeError> {
    let message: pa::RemoteControlMessage = decode_reply(payload)?;
    if message.action != pa::message_action::Enum::Update as i32 {
        return Err(ResponseDecodeError::Mismatch(
            "graphics tree action is not UPDATE",
        ));
    }
    message
        .graphics_tree
        .and_then(|value| value.payload)
        .ok_or(ResponseDecodeError::Incomplete("graphics tree payload"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    /// Shaped after a real reply from the unit; see `commands::read_graphics_tree`.
    #[test]
    fn graphics_tree_returns_the_device_widget_text_verbatim() {
        let tree = "zenUI::RootGraphicsItem\n  zenUI::Grid\n    text : 'In\n1'\n";
        let payload = pa::RemoteControlMessage {
            action: pa::message_action::Enum::Update as i32,
            graphics_tree: Some(pa::RemoteControlGraphicsTree {
                payload: Some(tree.to_string()),
            }),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(decode_graphics_tree(&payload).unwrap(), tree);

        // A screenshot reply carries no tree, and must not be reported as one.
        let screenshot = pa::RemoteControlMessage {
            action: pa::message_action::Enum::Update as i32,
            screenshot: Some(pa::RemoteControlScreenshot {
                payload: Some(vec![0x89, 0x50, 0x4E, 0x47]),
                ..Default::default()
            }),
            ..Default::default()
        }
        .encode_to_vec();
        assert!(matches!(
            decode_graphics_tree(&screenshot),
            Err(ResponseDecodeError::Incomplete("graphics tree payload"))
        ));
    }

    #[test]
    fn tuner_settings_are_complete_and_expose_absolute_reference() {
        let payload = pa::TunerMessage {
            action: pa::message_action::Enum::Update as i32,
            input_port_id: Some(5),
            frequency: Some(2.0),
            mute: Some(true),
            ..Default::default()
        }
        .encode_to_vec();
        let settings = decode_tuner_settings(&payload).unwrap();
        assert_eq!(settings.input_port_id, 5);
        assert_eq!(settings.reference_offset_hz, 2.0);
        assert_eq!(settings.reference_hz, 442.0);
        assert!(settings.muted);

        let incomplete = pa::TunerMessage {
            action: pa::message_action::Enum::Update as i32,
            input_port_id: Some(5),
            ..Default::default()
        }
        .encode_to_vec();
        assert!(matches!(
            decode_tuner_settings(&incomplete),
            Err(ResponseDecodeError::Incomplete(_))
        ));
    }

    #[test]
    fn general_settings_preserve_sparse_presence_and_derive_hold_milliseconds() {
        let payload = pa::GeneralSettingsMessage {
            action: pa::message_action::Enum::Update as i32,
            screen_brightness: Some(
                59,
            ),
            scene_block_bypass: Some(
                1,
            ),
            hold_timing: Some(3),
            master_volume_assignment: Some(
                pa::MasterVolumeAssignmentOptions {
                        out12: true,
                        out34: false,
                        send12: true,
                        headphones: false,
                    },
            ),
            ..Default::default()
        }
        .encode_to_vec();
        let settings = decode_general_settings(&payload).unwrap();
        assert_eq!(settings.screen_brightness, Some(59));
        assert_eq!(settings.led_brightness, None);
        assert_eq!(
            settings.scene_bypass_behavior.as_deref(),
            Some("nonstompOverwrite")
        );
        assert_eq!(settings.hold_timing_index, Some(3));
        assert_eq!(settings.hold_timing_ms, Some(800));
        assert!(settings.master_volume_assignment.unwrap().send12);
    }

    #[test]
    fn io_settings_preserve_every_sparse_port_field() {
        let payload = pa::IoSettingsMessage {
            action: pa::message_action::Enum::Update as i32,
            settings: Some(pa::PortSettings {
                    in_port: vec![pa::InputPortSettings {
                        input_port_id: 1,
                        level: Some(0.5),
                        input_zmode: Some(0.75),
                        plugged: Some(true),
                        ..Default::default()
                    }],
                    out_port: vec![pa::OutputPortSettings {
                        output_port_id: 4,
                        mute: Some(true),
                        ..Default::default()
                    }],
                    hp_port: Some(pa::HeadphonesSettings {
                        hp_feed: vec![pa::HeadphonesFeedLevel {
                            level: 0.25,
                            output_port_id: 4,
                        }],
                        level: Some(0.6),
                        plugged: Some(true),
                    }),
                    usb_port: Some(pa::UsbPortSettings {
                        hp_select: Some(0.5),
                        dry_wet: Some(1.0),
                        ..Default::default()
                    }),
                    midi_port: Some(pa::MidiPortSettings {
                            midi_thru: Some(1.0),
                        }),
                    exp_port: vec![pa::ExpPortSettings {
                        exp_port_id: 0,
                        level: Some(0.33),
                        calibrating: Some(false),
                        ..Default::default()
                    }],
                }),
            xlr1_2_linked: Some(true),
            out3_4_linked: Some(false),
            ..Default::default()
        }
        .encode_to_vec();

        let settings = decode_io_settings(&payload).unwrap();
        assert_eq!(settings.inputs[0].input_port_id, 1);
        assert_eq!(settings.inputs[0].level, Some(0.5));
        assert_eq!(settings.inputs[0].impedance, Some(0.75));
        assert_eq!(settings.inputs[0].plugged, Some(true));
        assert_eq!(settings.outputs[0].muted, Some(true));
        assert_eq!(
            settings.headphones.as_ref().unwrap().feeds[0].output_port_id,
            4
        );
        assert_eq!(settings.usb.as_ref().unwrap().dry_wet, Some(1.0));
        assert_eq!(settings.midi.as_ref().unwrap().thru, Some(1.0));
        assert_eq!(settings.expression_ports[0].level, Some(0.33));
        assert_eq!(settings.xlr12_linked, Some(true));
        assert_eq!(settings.out34_linked, Some(false));

        let incomplete = pa::IoSettingsMessage {
            action: pa::message_action::Enum::Update as i32,
            settings: Some(pa::PortSettings::default()),
            ..Default::default()
        }
        .encode_to_vec();
        assert!(matches!(
            decode_io_settings(&incomplete),
            Err(ResponseDecodeError::Incomplete("input ports"))
        ));
    }

    #[test]
    fn rejects_non_png_screen_payloads() {
        let payload = pa::RemoteControlMessage {
            action: pa::message_action::Enum::Update as i32,
            screenshot: Some(pa::RemoteControlScreenshot {
                payload: Some(vec![1, 2, 3]),
                ..Default::default()
            }),
            ..Default::default()
        }
        .encode_to_vec();
        assert!(matches!(
            decode_captured_screen(&payload),
            Err(ResponseDecodeError::InvalidPng)
        ));
    }

    #[test]
    fn png_dimensions_come_from_the_shared_ihdr_projection() {
        let mut png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR".to_vec();
        png.extend_from_slice(&800_u32.to_be_bytes());
        png.extend_from_slice(&480_u32.to_be_bytes());
        let image = png_image(png).unwrap();
        assert_eq!((image.width, image.height), (800, 480));
        assert!(png_image(b"not an image".to_vec()).is_err());
    }

    #[test]
    fn tempo_clock_and_chunked_backup_are_projected_once_for_every_host() {
        let tempo = pa::GlobalTempoMessage {
            metronome_status: Some(pa::MetronomeStatusUpdate {
                    current_beat: 2,
                    current_bar: 3,
                    current_tick: 4,
                    ..Default::default()
                }),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(
            decode_tempo_clock(&tempo).unwrap(),
            Some(TempoClock {
                current_beat: 2,
                current_bar: 3,
                current_tick: 4
            })
        );

        let mut backup = BackupAssembler::default();
        let first = pa::LocalBackupMessage {
            backup_json: Some("{\"type\":\"backup\",".into()),
            ..Default::default()
        }
        .encode_to_vec();
        let last = pa::LocalBackupMessage {
            backup_json: Some("\"creator\":\"quad\"}".into()),
            is_last_chunk: Some(true),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(backup.push(&first).unwrap(), None);
        assert_eq!(
            backup.push(&last).unwrap().as_deref(),
            Some("{\"type\":\"backup\",\"creator\":\"quad\"}")
        );

        let stale_tail = pa::LocalBackupMessage {
            backup_json: Some("old-tail".into()),
            is_last_chunk: Some(true),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(backup.push(&stale_tail).unwrap(), None);
        assert_eq!(backup.push(&first).unwrap(), None);
        assert_eq!(
            backup.push(&last).unwrap().as_deref(),
            Some("{\"type\":\"backup\",\"creator\":\"quad\"}")
        );
    }

    #[test]
    fn tempo_settings_project_every_named_option_and_reject_clock_only_mode_reads() {
        let parameter = |index: u32, value: f32| Param {
            index: Some(index),
            param_values: vec![crate::proto::ParamValue {
                value: Some(param_value::Value::FloatValue(value)),
            }],
            ..Default::default()
        };
        let params = vec![
            parameter(0, 0.4),
            parameter(1, 1.0),
            parameter(2, 1.0),
            parameter(3, 40.0 / 69.0),
            parameter(4, 0.0),
            parameter(5, 0.5),
            parameter(6, 0.1),
            parameter(7, 1.0 / 3.0),
            parameter(8, 0.4),
            parameter(9, 0.75),
            parameter(10, 2.0 / 3.0),
        ];
        let payload = pa::GlobalTempoMessage {
            action: pa::message_action::Enum::Update as i32,
            params,
            ..Default::default()
        }
        .encode_to_vec();
        let settings = decode_global_tempo_settings(&payload).unwrap();
        assert_eq!(settings.mode.as_deref(), Some("GLOBAL"));
        assert_eq!(settings.bpm, Some(120));
        assert_eq!(settings.pan, Some(0.0));
        assert_eq!(settings.time_signature.as_deref(), Some("4/4"));
        assert_eq!(settings.subdivision.as_deref(), Some("1/8"));
        assert_eq!(settings.sound.as_deref(), Some("COWBELL"));
        assert_eq!(settings.routing.as_deref(), Some("OUT 3/4"));
        assert_eq!(settings.beats, vec!["DOWN"]);
        let clock = pa::GlobalTempoMessage {
            metronome_status: Some(Default::default()),
            ..Default::default()
        }
        .encode_to_vec();
        assert!(matches!(
            decode_tempo_mode(&clock),
            Err(ResponseDecodeError::Incomplete(_))
        ));

        let preset_payload = pa::RecallPresetMessage {
            action: pa::message_action::Enum::Update as i32,
            request_id: Some(42),
            preset: Some(crate::proto::BinaryPreset {
                    tempo_program_data: vec![crate::proto::Model {
                        params: vec![parameter(0, 0.355), parameter(1, 0.0), parameter(2, 0.0)],
                        ..Default::default()
                    }],
                    ..Default::default()
                }),
            ..Default::default()
        }
        .encode_to_vec();
        let preset_settings = decode_preset_tempo_settings(&preset_payload, 42).unwrap();
        assert_eq!(preset_settings.bpm, Some(111));
        assert_eq!(preset_settings.led_enabled, Some(false));
        assert_eq!(preset_settings.mode, None);
        assert!(matches!(
            decode_preset_tempo_settings(&preset_payload, 41),
            Err(ResponseDecodeError::Mismatch("current preset request id"))
        ));
    }

    #[test]
    fn backup_ignores_an_uncorrelated_stale_tail_before_the_next_document() {
        let stale_tail = pa::LocalBackupMessage {
            backup_json: Some("end-of-an-older-document".into()),
            is_last_chunk: Some(true),
            ..Default::default()
        }
        .encode_to_vec();
        let valid = pa::LocalBackupMessage {
            backup_json: Some("{\"type\":\"backup\",\"creator\":\"quad\"}".into()),
            is_last_chunk: Some(true),
            ..Default::default()
        }
        .encode_to_vec();

        let mut backup = BackupAssembler::default();
        assert_eq!(backup.push(&stale_tail).unwrap(), None);
        assert!(!backup.started());
        assert_eq!(backup.ignored_prefix_chunks(), 1);
        assert_eq!(backup.ignored_prefix_terminators(), 1);
        assert_eq!(
            backup.push(&valid).unwrap().as_deref(),
            Some("{\"type\":\"backup\",\"creator\":\"quad\"}")
        );
    }

    #[test]
    fn backup_rejects_a_partial_document_instead_of_splicing_a_retry() {
        let first = pa::LocalBackupMessage {
            backup_json: Some("{\"type\":\"backup\",".into()),
            ..Default::default()
        }
        .encode_to_vec();
        let broken_last = pa::LocalBackupMessage {
            backup_json: Some("not-json".into()),
            is_last_chunk: Some(true),
            ..Default::default()
        }
        .encode_to_vec();

        let mut backup = BackupAssembler::default();
        assert_eq!(backup.push(&first).unwrap(), None);
        assert_eq!(
            backup.push(&broken_last).unwrap_err().to_string(),
            "the QC backup stream ended with an incomplete or unsupported document"
        );
        assert!(!backup.started());
    }

    #[test]
    fn global_eq_mode_cycle_and_looper_reads_preserve_device_state() {
        let eq = pa::GlobalEqMessage {
            action: pa::message_action::Enum::Update as i32,
            parameters: vec![pa::GlobalEqParameter {
                parameter_index: 6,
                value: 0.75,
            }],
            bypassed: Some(false),
            ..Default::default()
        }
        .encode_to_vec();
        let eq = decode_global_eq(&eq).unwrap();
        assert_eq!(eq.parameters[0].parameter_index, 6);
        assert_eq!(eq.parameters[0].value, 0.75);
        assert_eq!(eq.bypassed, Some(false));

        let modes = pa::ModeMessage {
            action: pa::message_action::Enum::Update as i32,
            available_modes: Some(pa::AvailableModes {
                    modes: vec![7, 1, 2],
                },),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(decode_mode_cycle(&modes).unwrap().slots, vec![7, 1, 2]);

        let looper = pa::LooperMessage {
            action: pa::message_action::Enum::Update as i32,
            status: Some(pa::LooperStatus {
                state: 3,
                progress: 0.5,
                in_reverse: 1,
                undo_count: 2,
                ..Default::default()
            }),
            one_shot_play: Some(true),
            quantize_enabled: Some(false),
            ..Default::default()
        }
        .encode_to_vec();
        let looper = decode_looper_status(&looper).unwrap();
        assert_eq!(looper.state, Some(3));
        assert_eq!(looper.progress, Some(0.5));
        assert_eq!(looper.in_reverse, Some(1));
        assert_eq!(looper.one_shot_play, Some(true));
    }

    #[test]
    fn library_replies_are_correlated_and_preserve_device_metadata() {
        let recents = pa::RecentsFavoritesMessage {
            action: pa::message_action::Enum::Update as i32,
            request_id: Some(71),
            // Favorites replies observed on-device can omit the flag, leaving
            // its protobuf default false. Request correlation is authoritative.
            is_favorites: false,
            r#type: pa::recents_favorites_message::RecentFavoriteType::Preset as i32,
            items: vec![pa::RecentsFavoritesItem {
                name: "Stage".into(),
                folder_key: "/media/p4/Presets/Live".into(),
                folder_name: "Live".into(),
                is_factory: false,
                is_plugin: true,
                product_key: String::new(),
            }],
        }
        .encode_to_vec();
        let entries = decode_recents_favorites(&recents, 71).unwrap();
        assert_eq!(entries.entries.len(), 1);
        assert_eq!(entries.entries[0].name, "Stage");
        assert!(entries.entries[0].is_plugin);
        assert!(matches!(
            decode_recents_favorites(&recents, 72),
            Err(ResponseDecodeError::Mismatch(_))
        ));

        let pinned = pa::PinnedModelsMessage {
            models: vec![42, 84],
            captures: vec!["capture-a".into()],
            ..Default::default()
        }
        .encode_to_vec();
        let pinned = decode_pinned_models(&pinned).unwrap();
        assert_eq!(pinned.models, vec![42, 84]);
        assert_eq!(pinned.captures, vec!["capture-a"]);

        let files = pa::FileMessage {
            action: pa::message_action::Enum::Update as i32,
            request_id: Some(73),
            folder: Some(pa::FolderInfo {
                key: Some("local_ir_root".into()),
                name: Some("Impulse Responses".into()),
                is_factory: Some(false),
                files: vec![pa::ProductData {
                    key: Some("ir/key".into()),
                    name: Some("Room".into()),
                    index: Some(4),
                    instrument: Some(2),
                    ..Default::default()
                }],
                ..Default::default()
            }),
            ..Default::default()
        }
        .encode_to_vec();
        let entries = decode_library_files(&files, Some(73), "local_ir_root").unwrap();
        assert_eq!(entries.entries[0].key, "ir/key");
        assert_eq!(entries.entries[0].position, Some(4));
        assert_eq!(entries.entries[0].instrument, Some(2));
        assert!(matches!(
            decode_library_files(&files, Some(73), "another-folder"),
            Err(ResponseDecodeError::Mismatch(_))
        ));

        let files_without_request_id = pa::FileMessage {
            folder: Some(pa::FolderInfo {
                key: Some("local_ir_root".into()),
                files: vec![pa::ProductData {
                    key: Some("ir/key".into()),
                    name: Some("Room".into()),
                    ..Default::default()
                }],
                ..Default::default()
            }),
            ..Default::default()
        }
        .encode_to_vec();
        let entries =
            decode_library_files(&files_without_request_id, None, "local_ir_root").unwrap();
        assert_eq!(entries.entries[0].key, "ir/key");

        let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        std::io::Write::write_all(&mut encoder, &files_without_request_id).unwrap();
        let compressed = encoder.finish().unwrap();
        let entries = decode_library_files(&compressed, None, "local_ir_root").unwrap();
        assert_eq!(entries.entries[0].name, "Room");

        let files_with_wrong_request_id = pa::FileMessage {
            action: pa::message_action::Enum::Update as i32,
            request_id: Some(74),
            folder: Some(pa::FolderInfo {
                key: Some("local_ir_root".into()),
                ..Default::default()
            }),
            ..Default::default()
        }
        .encode_to_vec();
        assert!(matches!(
            decode_library_files(&files_with_wrong_request_id, Some(73), "local_ir_root"),
            Err(ResponseDecodeError::Mismatch(
                "file listing request_id does not match"
            ))
        ));
    }

    #[test]
    fn malformed_library_entries_are_rejected_instead_of_silently_defaulted() {
        let listing = |file: pa::ProductData| {
            pa::FileMessage {
                action: pa::message_action::Enum::Update as i32,
                request_id: Some(9),
                folder: Some(pa::FolderInfo {
                    key: Some("library".into()),
                    files: vec![file],
                    ..Default::default()
                }),
                ..Default::default()
            }
            .encode_to_vec()
        };

        let missing_key = listing(pa::ProductData {
            name: Some("Preset".into()),
            ..Default::default()
        });
        assert!(matches!(
            decode_library_files(&missing_key, Some(9), "library"),
            Err(ResponseDecodeError::Incomplete("file key"))
        ));

        let negative_position = listing(pa::ProductData {
            key: Some("preset-key".into()),
            name: Some("Preset".into()),
            index: Some(-1),
            ..Default::default()
        });
        assert!(matches!(
            decode_library_files(&negative_position, Some(9), "library"),
            Err(ResponseDecodeError::Mismatch("negative file position"))
        ));
    }

    #[test]
    fn response_limits_and_numeric_edge_cases_are_explicit() {
        let oversized = vec![0_u8; profile::MAX_FRAME_BYTES + 1];
        assert!(matches!(
            decode_tempo_clock(&oversized),
            Err(ResponseDecodeError::OversizedReply)
        ));

        let parameter = |value| Param {
            index: Some(6),
            param_values: vec![crate::proto::ParamValue {
                value: Some(param_value::Value::FloatValue(value)),
            }],
            ..Default::default()
        };
        assert_eq!(
            decode_tempo_settings(&[parameter(f32::NAN)]).time_signature,
            None
        );
        assert_eq!(
            decode_tempo_settings(&[parameter(-0.1)]).time_signature,
            None
        );
        assert_eq!(
            decode_tempo_settings(&[parameter(1.1)]).time_signature,
            None
        );

        let invalid_general = pa::GeneralSettingsMessage {
            action: pa::message_action::Enum::Update as i32,
            scene_block_bypass: Some(
                99,
            ),
            ..Default::default()
        }
        .encode_to_vec();
        assert!(matches!(
            decode_general_settings(&invalid_general),
            Err(ResponseDecodeError::Mismatch(_))
        ));
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(256))]

        #[test]
        fn arbitrary_bounded_reply_bytes_never_panic(payload in proptest::collection::vec(any::<u8>(), 0..4096)) {
            let _ = decode_tempo_clock(&payload);
            let _ = decode_device_identity(&payload);
            let _ = decode_recents_favorites(&payload, 1);
            let _ = decode_pinned_models(&payload);
            let _ = decode_library_files(&payload, Some(1), "library");
            let _ = decode_tuner_settings(&payload);
            let _ = decode_general_settings(&payload);
            let _ = decode_io_settings(&payload);
            let _ = decode_global_eq(&payload);
            let _ = decode_mode_cycle(&payload);
            let _ = decode_looper_status(&payload);
            let _ = decode_tempo_mode(&payload);
            let _ = decode_global_tempo_settings(&payload);
            let _ = decode_inhibited_modules(&payload);
            let _ = decode_preset_screenshot(&payload, 1, "folder", 1, false);
            let _ = decode_captured_screen(&payload);
            let mut backup = BackupAssembler::default();
            let _ = backup.push(&payload);
        }
    }
}
