use crate::worker::DeviceController;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use qc_device_runtime::{
    generated_gateway,
    request::{
        self as runtime_request, finalize_device_backup, GatewayResponseProjection,
        GatewayVerification, GatewayVerificationAction, GatewayVerificationRuntime,
        GatewayWritePlan, PlannedWrite, PresetMutationPlan,
    },
};
use qc_protocol::responses::decode_tempo_clock;
use qc_protocol::{domain, profile};
use qc_windows_midi::PerformanceMidi;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{self, Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    jsonrpc: String,
    id: Value,
    method: String,
    #[serde(default = "empty_params")]
    params: Value,
}

fn empty_params() -> Value {
    json!({})
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RawMessage {
    sequence: u64,
    message_type: u16,
    payload_base64: String,
    received_at_unix_ms: u128,
}

pub fn serve_stdio(controller: DeviceController) -> Result<(), String> {
    let stdin = io::stdin();
    let mut input = stdin.lock();
    let output = Arc::new(Mutex::new(io::stdout()));
    let mut midi = PerformanceMidi::default();
    // Keep endpoint discovery and handle acquisition off the first physical
    // control's latency-critical path. A disconnected startup remains valid;
    // send() retries acquisition after the QC becomes available.
    let _ = midi.warm_up();
    let performance_midi = Mutex::new(midi);
    let event_output = Arc::clone(&output);
    let events = controller.subscribe_state_events();
    thread::Builder::new()
        .name("qc-native-events".into())
        .spawn(move || {
            while let Ok(frame) = events.recv() {
                let notification = json!({
                    "jsonrpc": "2.0",
                    "method": "device.stateFrame",
                    "params": frame
                });
                let Ok(mut output) = event_output.lock() else {
                    return;
                };
                if write_response(&mut *output, &notification).is_err() {
                    return;
                }
            }
        })
        .map_err(|error| format!("Could not start native event stream: {error}"))?;
    while let Some(request) = read_request(&mut input)? {
        let response = handle(&controller, &performance_midi, request);
        let mut output = output
            .lock()
            .map_err(|_| "Native broker output lock was poisoned".to_string())?;
        write_response(&mut *output, &response)?;
    }
    Ok(())
}

fn handle(
    controller: &DeviceController,
    performance_midi: &Mutex<PerformanceMidi>,
    request: Request,
) -> Value {
    let id = request.id.clone();
    if request.jsonrpc != "2.0" || id.as_u64().is_none_or(|id| id == 0) {
        return error(id, -32600, "Invalid JSON-RPC request");
    }
    if !request.params.is_object() {
        return error(id, -32602, "JSON-RPC params must be an object");
    }
    if generated_gateway::broker_dispatch(&request.method).is_some() {
        if let Err(message) = generated_gateway::validate_params(&request.method, &request.params) {
            return error(id, -32602, &message);
        }
    }
    let result = match generated_gateway::broker_dispatch(&request.method) {
        Some(generated_gateway::BrokerDispatch::SystemStatus) => {
            let mut capabilities = vec!["nativeGateway"];
            capabilities.extend_from_slice(generated_gateway::CAPABILITIES);
            capabilities.push("hostMidiPerformance");
            Ok(json!({
                "platform": "Rust device gateway",
                "gatewayAvailable": true,
                "gatewayApiVersion": generated_gateway::API_VERSION,
                "capabilities": capabilities,
                "message": "Shared Rust QC engine active",
                "usbDiagnostics": controller.status()
            }))
        }
        Some(generated_gateway::BrokerDispatch::Reconnect) => controller
            .reconnect()
            .map(|_| ready_connection_state(controller, "Quad Cortex handshake complete")),
        Some(generated_gateway::BrokerDispatch::ResetSession) => controller
            .reset_session()
            .map(|_| ready_connection_state(controller, "Communication session reset")),
        Some(generated_gateway::BrokerDispatch::Disconnect) => controller
            .disconnect()
            .map(|_| connection_state(controller, "Quad Cortex session closed")),
        // The native broker implements the generated gateway contract without
        // exposing raw HID/protobuf details to either client.
        Some(generated_gateway::BrokerDispatch::StateEvents) => {
            gateway_state_events(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::Snapshot) => controller
            .gateway_snapshot()
            .filter(|snapshot| !snapshot.setlist_key.is_empty() && !snapshot.preset_name.is_empty())
            .map(|snapshot| serde_json::to_value(snapshot).map_err(|error| error.to_string()))
            .unwrap_or_else(|| Err("No Quad Cortex preset has been synchronized yet".into())),
        Some(generated_gateway::BrokerDispatch::ListModels) => gateway_list_models(controller),
        Some(generated_gateway::BrokerDispatch::Identity) => gateway_identity(controller),
        Some(generated_gateway::BrokerDispatch::GatewayRead) => {
            execute_gateway_read(controller, &request.method, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::GatewayOperation) => {
            gateway_operation(controller, &request.params, &request.method)
        }
        Some(generated_gateway::BrokerDispatch::SetDeviceName) => {
            gateway_set_device_name(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::Undo) => gateway_history(controller, true),
        Some(generated_gateway::BrokerDispatch::Redo) => gateway_history(controller, false),
        Some(generated_gateway::BrokerDispatch::InhibitedModules) => {
            gateway_inhibited_modules(controller)
        }
        Some(generated_gateway::BrokerDispatch::PresetScreenshot) => {
            gateway_preset_screenshot(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::CaptureScreen) => {
            gateway_capture_screen(controller)
        }
        Some(generated_gateway::BrokerDispatch::TapScreen) => {
            gateway_screen_gesture(controller, &request.method, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::TempoClock) => gateway_tempo_clock(controller),
        Some(generated_gateway::BrokerDispatch::SelectScene) => {
            gateway_select_scene(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::ToggleBypass) => {
            gateway_toggle_bypass(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::BlockDetails) => {
            gateway_block_details(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::LaneControlDetails) => {
            gateway_lane_control_details(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::PreviewParameter) => {
            gateway_parameter(controller, &request.params, true)
        }
        Some(generated_gateway::BrokerDispatch::SetParameter) => {
            gateway_parameter(controller, &request.params, false)
        }
        Some(generated_gateway::BrokerDispatch::PreviewLaneControlParameter) => {
            gateway_lane_control_parameter(controller, &request.params, true)
        }
        Some(generated_gateway::BrokerDispatch::SetLaneControlParameter) => {
            gateway_lane_control_parameter(controller, &request.params, false)
        }
        Some(generated_gateway::BrokerDispatch::SetLaneControlSceneMode) => {
            gateway_lane_control_scene_mode(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::ParameterAssignment) => {
            gateway_parameter_assignment(controller, &request.params, &request.method)
        }
        Some(generated_gateway::BrokerDispatch::SetTempo) => {
            gateway_set_tempo(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::SetMasterVolume) => {
            gateway_set_master_volume(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::MasterVolume) => gateway_master_volume(controller),
        Some(generated_gateway::BrokerDispatch::PerformanceMidi) => gateway_performance_midi(
            controller,
            performance_midi,
            &request.method,
            &request.params,
        ),
        Some(generated_gateway::BrokerDispatch::NavigateBank) => {
            gateway_navigate_bank(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::RecallPreset) => {
            gateway_recall_preset(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::ReloadPreset) => {
            gateway_reload_preset(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::ListPresetFolders) => {
            gateway_list_preset_folders(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::ListPresets) => {
            gateway_list_presets(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::ListPresetSlots) => {
            gateway_list_preset_slots(controller)
        }
        Some(generated_gateway::BrokerDispatch::SavePresetAs) => {
            gateway_save_preset_as(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::RenameCurrentPreset) => {
            gateway_rename_current_preset(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::CreateBackup) => {
            gateway_create_backup(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::CopyPreset) => {
            gateway_copy_preset(controller, &request.params)
        }
        Some(generated_gateway::BrokerDispatch::DuplicateSetlist) => {
            gateway_duplicate_setlist(controller, &request.params)
        }
        None if request.method == "device.status" => {
            serde_json::to_value(controller.status()).map_err(|error| error.to_string())
        }
        None if request.method == "device.raw.latest" => raw_latest(controller, &request.params),
        None if request.method == "device.raw.events" => raw_events(controller, &request.params),
        None if request.method == "device.state.events" => {
            state_events(controller, &request.params)
        }
        None if request.method == "device.state.blockDetails" => {
            state_block_details(controller, &request.params)
        }
        None if request.method == "device.command.scene" => {
            command_scene(controller, &request.params)
        }
        None if request.method == "device.command.bypass" => {
            command_bypass(controller, &request.params)
        }
        None if request.method == "device.command.parameter" => {
            command_parameter(controller, &request.params)
        }
        None if request.method == "device.command.tempo" => {
            command_tempo(controller, &request.params)
        }
        None if request.method == "device.command.operation" => {
            command_operation(controller, &request.params)
        }
        None if request.method == "device.raw.send" => raw_send(controller, &request.params),
        None if request.method == "device.raw.request" => raw_request(controller, &request.params),
        None => return error(id, -32601, &format!("Method not found: {}", request.method)),
    };
    match result {
        Ok(result) => json!({"jsonrpc": "2.0", "id": id, "result": result}),
        Err(message) => error(id, -32010, &message),
    }
}

fn connection_state(controller: &DeviceController, detail: &str) -> Value {
    let status = controller.status();
    json!({
        "phase": status.phase,
        "detail": detail,
        "lastSync": status.connected_at_unix_ms,
        "demo": false
    })
}

fn ready_connection_state(controller: &DeviceController, detail: &str) -> Value {
    let status = controller.wait_for_ready(Duration::from_millis(profile::READY_WAIT_TIMEOUT_MS));
    if status.phase == "ready" {
        // USB synchronization and state decoding run on separate workers.
        // A successful reconnect must not return until the first decoded
        // preset is queryable by the very next gateway call.
        let _ = controller.wait_for_gateway_snapshot(
            Duration::from_millis(profile::COMMAND_CONFIRMATION_TIMEOUT_MS),
            |snapshot| !snapshot.setlist_key.is_empty() && !snapshot.preset_name.is_empty(),
        );
    }
    json!({
        "phase": status.phase,
        "detail": if status.phase == "ready" { detail } else { &status.detail },
        "lastSync": status.connected_at_unix_ms,
        "demo": false
    })
}

fn gateway_state_events(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let frames = state_events(controller, params)?;
    Ok(json!({
        "native": true,
        "latestSequence": controller.latest_state_sequence(),
        "frames": frames
    }))
}

fn gateway_list_models(controller: &DeviceController) -> Result<Value, String> {
    serde_json::to_value(controller.list_models()?).map_err(|error| error.to_string())
}

fn request_command(
    controller: &DeviceController,
    command: qc_protocol::commands::OutboundMessage,
    expected_type: u16,
    request_id: Option<u64>,
    timeout: Duration,
) -> Result<crate::usb::IncomingMessage, String> {
    controller.request(
        command.message_type,
        command.payload,
        expected_type,
        request_id,
        timeout,
    )
}

fn execute_single_gateway_read(
    controller: &DeviceController,
    method: &str,
    params: &Value,
) -> Result<Value, String> {
    let plan =
        runtime_request::plan_gateway_read(method, params, controller.reserve_request_id()?)?;
    let timeout = Duration::from_millis(plan.timeout_ms);
    let messages = plan
        .operation
        .try_encode()
        .map_err(|error| error.to_string())?;
    if let GatewayResponseProjection::PresetScreenshot { request_id, .. } = &plan.projection {
        let mut messages = messages.into_iter();
        let message = messages
            .next()
            .ok_or_else(|| "The correlated QC read produced no request message".to_string())?;
        if messages.next().is_some() {
            return Err("The correlated QC read produced multiple request messages".into());
        }
        let reply = request_command(
            controller,
            message,
            plan.response_type,
            Some(*request_id),
            timeout,
        )?;
        return plan.projection.decode(&reply.payload);
    }

    let events = controller.subscribe_raw_events();
    for message in messages {
        controller.send_command(message)?;
    }
    let deadline = std::time::Instant::now() + timeout;
    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        match events.recv_timeout(remaining) {
            Ok(reply) if reply.message_type == plan.response_type => {
                if let Ok(value) = plan.projection.decode(&reply.payload) {
                    return Ok(value);
                }
            }
            Ok(_) => {}
            Err(_) => {
                return Err(format!(
                    "The Quad Cortex did not return a valid {method} reply within {} seconds",
                    timeout.as_secs()
                ));
            }
        }
    }
}

fn execute_gateway_read(
    controller: &DeviceController,
    method: &str,
    params: &Value,
) -> Result<Value, String> {
    let primary = match execute_single_gateway_read(controller, method, params) {
        Ok(value) => value,
        Err(error) if gateway_read_timeout_is_recoverable(method, &error) => {
            controller.reset_session()?;
            let status = controller.wait_for_ready(preset_recall_recovery_timeout());
            if status.phase != "ready" {
                return Err(format!(
                    "{error} Read recovery ended in {}: {}",
                    status.phase, status.detail
                ));
            }
            controller
                .wait_for_gateway_snapshot(
                    Duration::from_millis(profile::COMMAND_CONFIRMATION_TIMEOUT_MS),
                    |snapshot| !snapshot.setlist_key.is_empty() && !snapshot.preset_name.is_empty(),
                )
                .ok_or_else(|| format!("{error} Read recovery published no active preset"))?;
            execute_single_gateway_read(controller, method, params).map_err(|retry_error| {
                format!("{error} Recovery retry also failed: {retry_error}")
            })?
        }
        Err(error) => return Err(error),
    };
    let Some(followup_method) = runtime_request::gateway_read_followup_method(method) else {
        return Ok(primary);
    };
    let followup = execute_single_gateway_read(controller, followup_method, &Value::Null)?;
    runtime_request::compose_global_tempo_settings(&primary, &followup)
}

fn gateway_read_timeout_is_recoverable(method: &str, error: &str) -> bool {
    method != "device.diagnostics"
        && error.starts_with("The Quad Cortex did not return a valid ")
        && error.contains(" reply within ")
}

fn gateway_identity(controller: &DeviceController) -> Result<Value, String> {
    execute_gateway_read(controller, "device.identity", &Value::Null)
}

fn gateway_set_device_name(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let plan = plan_gateway_write(controller, "device.setDeviceName", params)?;
    let policy = runtime_request::gateway_write_verification_policy("device.setDeviceName");
    let name = params
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or_default();
    execute_gateway_write(controller, &plan)?;
    let read_method = policy
        .readback_method
        .ok_or_else(|| "Device-name write is missing its shared readback policy".to_string())?;
    let identity =
        execute_correlated_readback(controller, "device.setDeviceName", params, read_method)?;
    Ok(json!({
        "accepted": true,
        "verified": true,
        "verification": "authoritative_readback",
        "detail": format!("Device name changed to {name}"),
        "identity": identity
    }))
}

fn gateway_history(controller: &DeviceController, undo: bool) -> Result<Value, String> {
    let method = if undo { "device.undo" } else { "device.redo" };
    let plan = plan_gateway_write(controller, method, &Value::Null)?;
    let policy = runtime_request::gateway_write_verification_policy(method);
    execute_gateway_write(controller, &plan)?;
    if let Some(refresh_method) = policy.post_write_refresh_method {
        thread::sleep(Duration::from_millis(policy.post_write_refresh_delay_ms));
        dispatch_gateway_refresh(controller, refresh_method)?;
    }
    Ok(accepted_unverified(plan.detail))
}

fn gateway_inhibited_modules(controller: &DeviceController) -> Result<Value, String> {
    execute_gateway_read(controller, "device.inhibitedModules", &Value::Null)
}

fn gateway_preset_screenshot(
    controller: &DeviceController,
    params: &Value,
) -> Result<Value, String> {
    execute_gateway_read(controller, "device.presetScreenshot", params)
}

fn gateway_capture_screen(controller: &DeviceController) -> Result<Value, String> {
    execute_gateway_read(controller, "device.captureScreen", &Value::Null)
}

fn gateway_screen_gesture(
    controller: &DeviceController,
    method: &str,
    params: &Value,
) -> Result<Value, String> {
    gateway_operation(controller, params, method)
}

fn gateway_tempo_clock(controller: &DeviceController) -> Result<Value, String> {
    let Some(raw) = controller.latest_message(profile::MESSAGE_TYPE_GLOBAL_TEMPO) else {
        return Ok(json!({"available": false}));
    };
    let Some(status) = decode_tempo_clock(raw.payload.as_slice())
        .map_err(|error| format!("Could not decode the cached tempo clock: {error}"))?
    else {
        return Ok(json!({"available": false}));
    };
    Ok(json!({
        "available": true,
        "sequence": raw.sequence,
        "receivedAtUnixMs": raw.received_at_unix_ms,
        "currentBeat": status.current_beat,
        "currentBar": status.current_bar,
        "currentTick": status.current_tick
    }))
}

fn assert_expected_preset(controller: &DeviceController, params: &Value) -> Result<(), String> {
    let snapshot = controller.gateway_snapshot();
    runtime_request::assert_expected_preset(snapshot.as_ref(), params)
}

fn plan_gateway_write(
    controller: &DeviceController,
    method: &str,
    params: &Value,
) -> Result<GatewayWritePlan, String> {
    let snapshot = controller.gateway_snapshot();
    runtime_request::plan_gateway_write(method, params, snapshot.as_ref())
}

fn execute_gateway_write(
    controller: &DeviceController,
    plan: &GatewayWritePlan,
) -> Result<(), String> {
    execute_planned_write(controller, &plan.write)
}

fn execute_planned_write(
    controller: &DeviceController,
    write: &PlannedWrite,
) -> Result<(), String> {
    match write {
        PlannedWrite::HidCommand(command) => controller.send_command(command.clone().encode()),
        PlannedWrite::HidOperation(operation) => controller.send_operation(operation.clone()),
        PlannedWrite::MidiControlChange { .. } => {
            Err("Host MIDI must be executed by the native application transport".into())
        }
    }
}

fn execute_realtime_planned_write(
    controller: &DeviceController,
    write: &PlannedWrite,
) -> Result<(), String> {
    match write {
        PlannedWrite::HidCommand(command) => {
            controller.send_realtime_command(command.clone().encode())
        }
        PlannedWrite::HidOperation(operation) => {
            for message in operation
                .clone()
                .try_encode()
                .map_err(|error| error.to_string())?
            {
                controller.send_realtime_command(message)?;
            }
            Ok(())
        }
        PlannedWrite::MidiControlChange { .. } => {
            Err("Host MIDI must be executed by the native application transport".into())
        }
    }
}

fn accepted_unverified(detail: impl Into<String>) -> Value {
    json!({
        "accepted": true,
        "verified": false,
        "verification": "accepted_unverified",
        "detail": detail.into()
    })
}

fn gateway_performance_midi(
    controller: &DeviceController,
    performance_midi: &Mutex<PerformanceMidi>,
    method: &str,
    params: &Value,
) -> Result<Value, String> {
    if !runtime_request::gateway_write_is_realtime(method) {
        return Err(format!(
            "{method} is not classified as a realtime gateway write"
        ));
    }
    let plan = plan_gateway_write(controller, method, params)?;
    let PlannedWrite::MidiControlChange { controller, value } = plan.write else {
        return Err(format!("{method} did not produce a host MIDI write"));
    };
    let host_started_at_unix_ms = unix_ms();
    let receipt = performance_midi
        .lock()
        .map_err(|_| "Performance MIDI lock was poisoned".to_string())?
        .send(controller, value)?;
    let mut result = accepted_unverified(format!(
        "{} immediately through {}; live USB state will reconcile the result.",
        plan.detail, receipt.endpoint
    ));
    if let Some(object) = result.as_object_mut() {
        object.insert("immediate".into(), json!(true));
        object.insert("transport".into(), json!(receipt.endpoint));
        object.insert(
            "dispatchLatencyMs".into(),
            json!(receipt.dispatch_latency_ms),
        );
        object.insert("hostStartedAtUnixMs".into(), json!(host_started_at_unix_ms));
        object.insert("throttleDelayMs".into(), json!(receipt.throttle_delay_ms));
    }
    Ok(result)
}

fn unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(u128::from(u64::MAX)) as u64
}

fn dispatch_gateway_refresh(controller: &DeviceController, method: &str) -> Result<(), String> {
    let plan =
        runtime_request::plan_gateway_read(method, &json!({}), controller.reserve_request_id()?)?;
    for message in plan
        .operation
        .try_encode()
        .map_err(|error| error.to_string())?
    {
        controller.send_command(message)?;
    }
    Ok(())
}

fn verify_gateway_write_on_schedule(
    controller: &DeviceController,
    events: &std::sync::mpsc::Receiver<crate::worker::DecodedStateFrame>,
    verification: GatewayVerification,
    after_sequence: u64,
    policy: &runtime_request::GatewayWriteVerificationPolicy,
) -> Result<Option<qc_device_runtime::GatewaySnapshot>, String> {
    let started = Instant::now();
    let parameter_target = verification.parameter_target();
    let mut runtime =
        GatewayVerificationRuntime::new(verification, u128::from(after_sequence), 0, policy);
    let mut observation_sequence = after_sequence;
    loop {
        let now_ms = started.elapsed().as_millis().min(u128::from(u64::MAX)) as u64;
        let snapshot = controller.gateway_snapshot();
        let parameter =
            parameter_target.and_then(|target| observed_gateway_parameter(controller, target));
        match runtime.advance(
            snapshot.as_ref(),
            parameter.as_ref(),
            u128::from(observation_sequence),
            now_ms,
        ) {
            GatewayVerificationAction::Verified => return Ok(snapshot),
            GatewayVerificationAction::TimedOut => return Ok(None),
            GatewayVerificationAction::Refresh { method } => {
                dispatch_gateway_refresh(controller, method)?;
            }
            GatewayVerificationAction::Wait { delay_ms } => {
                match events.recv_timeout(Duration::from_millis(delay_ms)) {
                    Ok(frame) => observation_sequence = frame.sequence,
                    Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
                    Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                        return Err(
                            "QC state event stream disconnected during write verification"
                                .to_string(),
                        );
                    }
                }
            }
        }
    }
}

fn observed_gateway_parameter(
    controller: &DeviceController,
    (row, column, parameter_index): (u32, u32, u32),
) -> Option<qc_protocol::state::BlockParameter> {
    let details = match column {
        10 => controller.lane_control_details(row, "inputGate"),
        11 => controller.lane_control_details(row, "laneOutput"),
        _ => controller.block_details(row, column),
    }
    .ok()
    .flatten()?;
    details
        .parameters
        .into_iter()
        .find(|parameter| parameter.index == parameter_index)
}

fn gateway_select_scene(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    gateway_operation(controller, params, "device.selectScene")
}

fn gateway_toggle_bypass(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    gateway_operation(controller, params, "device.toggleBypass")
}

fn gateway_block_details(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    assert_expected_preset(controller, params)?;
    refresh_current_preset_state(controller)?;
    let details = state_block_details(controller, params)?;
    if details.is_null() {
        Err("No block exists at that grid position".into())
    } else {
        Ok(details)
    }
}

fn lane_control_target(params: &Value) -> Result<(u32, &str), String> {
    let row = bounded_u32(params, "row", domain::GRID_ROWS - 1)?;
    let control = params
        .get("control")
        .and_then(Value::as_str)
        .filter(|value| matches!(*value, "inputGate" | "laneOutput"))
        .ok_or_else(|| "control must be inputGate or laneOutput".to_string())?;
    Ok((row, control))
}

fn gateway_lane_control_details(
    controller: &DeviceController,
    params: &Value,
) -> Result<Value, String> {
    assert_expected_preset(controller, params)?;
    let (row, control) = lane_control_target(params)?;
    refresh_current_preset_state(controller)?;
    controller
        .lane_control_details(row, control)?
        .map(|details| serde_json::to_value(details).map_err(|error| error.to_string()))
        .unwrap_or_else(|| {
            Err(format!(
                "No {control} control is synchronized for row {}",
                row + 1
            ))
        })
}

fn refresh_current_preset_state(controller: &DeviceController) -> Result<(), String> {
    let events = controller.subscribe_state_events();
    let after_sequence = controller.latest_state_sequence();
    execute_gateway_read(controller, "device.currentPreset", &json!({}))?;
    let deadline = Instant::now() + Duration::from_millis(profile::COMMAND_CONFIRMATION_TIMEOUT_MS);
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        let frame = events.recv_timeout(remaining).map_err(|_| {
            "The correlated preset reply arrived, but decoded lane state did not update".to_string()
        })?;
        if frame.sequence > after_sequence
            && frame.states.iter().any(|state| state.kind == "preset")
        {
            return Ok(());
        }
    }
}

fn gateway_lane_control_parameter(
    controller: &DeviceController,
    params: &Value,
    preview: bool,
) -> Result<Value, String> {
    assert_expected_preset(controller, params)?;
    let (row, control) = lane_control_target(params)?;
    let parameter_index = bounded_u32(params, "parameterIndex", u32::MAX)?;
    let before = controller
        .lane_control_details(row, control)?
        .ok_or_else(|| format!("No {control} control is synchronized for row {}", row + 1))?;
    let actual = before
        .parameters
        .iter()
        .find(|parameter| parameter.index == parameter_index)
        .and_then(|parameter| parameter.normalized_value);
    runtime_request::assert_expected_parameter(actual, params)?;
    let method = if preview {
        "device.previewLaneControlParameter"
    } else {
        "device.setLaneControlParameter"
    };
    let plan = plan_gateway_write(controller, method, params)?;
    if preview {
        execute_gateway_write(controller, &plan)?;
        let mut result = accepted_unverified(plan.detail);
        if let Some(object) = result.as_object_mut() {
            object.insert(
                "acceptedValue".into(),
                params.get("value").cloned().unwrap_or_else(|| json!(0.0)),
            );
        }
        return Ok(result);
    }
    let mut result = gateway_operation(controller, params, method)?;
    let details = controller
        .lane_control_details(row, control)?
        .ok_or_else(|| {
            "The write completed, but its lane control is absent from readback".to_string()
        })?;
    if let Some(object) = result.as_object_mut() {
        object.insert(
            "block".into(),
            serde_json::to_value(details).map_err(|error| error.to_string())?,
        );
    }
    Ok(result)
}

fn gateway_lane_control_scene_mode(
    controller: &DeviceController,
    params: &Value,
) -> Result<Value, String> {
    assert_expected_preset(controller, params)?;
    let (row, control) = lane_control_target(params)?;
    let parameter_index = bounded_u32(params, "parameterIndex", u32::MAX)?;
    let mut result = gateway_operation(controller, params, "device.setLaneControlSceneMode")?;
    let details = controller
        .lane_control_details(row, control)?
        .ok_or_else(|| {
            "The write completed, but its lane control is absent from readback".to_string()
        })?;
    let parameter = details
        .parameters
        .iter()
        .find(|item| item.index == parameter_index)
        .ok_or_else(|| {
            "The write completed, but its lane parameter is absent from readback".to_string()
        })?;
    let expected = params
        .get("enabled")
        .and_then(Value::as_bool)
        .ok_or_else(|| "enabled must be true or false".to_string())?;
    if parameter.scene_mode != expected {
        return Err(format!(
            "Lane parameter scene behavior readback was {}, expected {expected}",
            parameter.scene_mode
        ));
    }
    if let Some(object) = result.as_object_mut() {
        object.insert(
            "block".into(),
            serde_json::to_value(details).map_err(|error| error.to_string())?,
        );
    }
    Ok(result)
}

fn gateway_parameter(
    controller: &DeviceController,
    params: &Value,
    preview: bool,
) -> Result<Value, String> {
    let row = bounded_u32(params, "row", domain::GRID_ROWS - 1)?;
    let column = bounded_u32(params, "column", domain::GRID_COLUMNS + 1)?;
    let parameter_index = bounded_u32(params, "parameterIndex", u32::MAX)?;
    let before = controller
        .block_details(row, column)?
        .ok_or_else(|| "No block exists at that grid position".to_string())?;
    let actual = before
        .parameters
        .iter()
        .find(|parameter| parameter.index == parameter_index)
        .and_then(|parameter| parameter.normalized_value);
    runtime_request::assert_expected_parameter(actual, params)?;
    let method = if preview {
        "device.previewParameter"
    } else {
        "device.setParameter"
    };
    let plan = plan_gateway_write(controller, method, params)?;
    let value = params
        .get("value")
        .and_then(Value::as_f64)
        .unwrap_or_default();
    if preview {
        execute_gateway_write(controller, &plan)?;
        let mut result = accepted_unverified(plan.detail);
        if let Some(object) = result.as_object_mut() {
            object.insert("acceptedValue".into(), json!(value));
        }
        Ok(result)
    } else {
        // Return the latest local view immediately, patched with the accepted
        // value.  Waiting for a USB round-trip here made sliders visibly lag;
        // the timestamped device echo still supersedes this optimistic value.
        let mut block = serde_json::to_value(before).map_err(|error| error.to_string())?;
        if let Some(parameters) = block.get_mut("parameters").and_then(Value::as_array_mut) {
            if let Some(parameter) = parameters.iter_mut().find(|parameter| {
                parameter.get("index").and_then(Value::as_u64) == Some(parameter_index as u64)
            }) {
                if let Some(object) = parameter.as_object_mut() {
                    object.insert("normalizedValue".into(), json!(value));
                }
            }
        }
        let mut result = gateway_operation(controller, params, method)?;
        if let Some(object) = result.as_object_mut() {
            object.insert("block".into(), block);
        }
        Ok(result)
    }
}

fn gateway_parameter_assignment(
    controller: &DeviceController,
    params: &Value,
    method: &str,
) -> Result<Value, String> {
    let row = bounded_u32(params, "row", domain::GRID_ROWS - 1)?;
    let column = bounded_u32(params, "column", domain::GRID_COLUMNS + 1)?;
    let parameter_index = bounded_u32(params, "parameterIndex", u32::MAX)?;
    let mut result = gateway_operation(controller, params, method)?;
    let block = controller
        .block_details(row, column)?
        .ok_or_else(|| "The write completed, but its block is absent from readback".to_string())?;
    let parameter = block
        .parameters
        .iter()
        .find(|parameter| parameter.index == parameter_index)
        .ok_or_else(|| {
            "The write completed, but its parameter is absent from readback".to_string()
        })?;

    match method {
        "device.setParameterSceneMode" => {
            let expected = params
                .get("enabled")
                .and_then(Value::as_bool)
                .ok_or_else(|| "enabled must be true or false".to_string())?;
            if parameter.scene_mode != expected {
                return Err(format!(
                    "Parameter scene behavior readback was {}, expected {expected}",
                    parameter.scene_mode
                ));
            }
        }
        "device.setParameterExpression" => {
            let expected_pedal = bounded_u32(params, "pedal", 2)? as i32;
            let actual_pedal = parameter.expression.unwrap_or(0);
            if actual_pedal != expected_pedal {
                return Err(format!(
                    "Parameter expression readback was pedal {actual_pedal}, expected {expected_pedal}"
                ));
            }
            if expected_pedal != 0 {
                let expected_minimum = normalized_f64(params, "minimum")?;
                let expected_maximum = normalized_f64(params, "maximum")?;
                let actual_minimum = parameter.expression_minimum.map(f64::from);
                let actual_maximum = parameter.expression_maximum.map(f64::from);
                let close = |actual: Option<f64>, expected: f64| {
                    actual.is_some_and(|value| (value - expected).abs() <= 0.001)
                };
                if !close(actual_minimum, expected_minimum)
                    || !close(actual_maximum, expected_maximum)
                {
                    return Err(format!(
                        "Parameter expression range readback was {:?}-{:?}, expected {expected_minimum}-{expected_maximum}",
                        actual_minimum, actual_maximum
                    ));
                }
            }
        }
        _ => return Err(format!("Unsupported parameter assignment method: {method}")),
    }

    if let Some(object) = result.as_object_mut() {
        object.insert(
            "block".into(),
            serde_json::to_value(block).map_err(|error| error.to_string())?,
        );
    }
    Ok(result)
}

fn gateway_set_tempo(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    gateway_operation(controller, params, "device.setTempo")
}

fn latest_master_volume(controller: &DeviceController) -> Option<f32> {
    controller
        .state_events_since(0, domain::STATE_EVENT_MAXIMUM_LIMIT)
        .into_iter()
        .rev()
        .flat_map(|frame| frame.states.into_iter().rev())
        .find_map(|state| state.master_volume)
}

fn gateway_master_volume(controller: &DeviceController) -> Result<Value, String> {
    let value = latest_master_volume(controller)
        .ok_or_else(|| "The Quad Cortex has not reported Master Volume yet".to_string())?;
    Ok(json!({"value": (value.clamp(0.0, 1.0) * 100.0).round() as u32}))
}

fn gateway_set_master_volume(
    controller: &DeviceController,
    params: &Value,
) -> Result<Value, String> {
    gateway_operation(controller, params, "device.setMasterVolume")
}

fn execute_correlated_readback(
    controller: &DeviceController,
    method: &str,
    params: &Value,
    read_method: &str,
) -> Result<Value, String> {
    // CorOS acknowledges several global writes before their next READ reflects
    // the new value. Poll the authoritative read briefly instead of treating
    // that normal apply delay as a failed write. This stays off the realtime
    // path and never resends the mutation.
    let mut attempt = 0;
    while let Some(interval_ms) =
        runtime_request::gateway_correlated_readback_delay(method, attempt)
    {
        if interval_ms > 0 {
            thread::sleep(Duration::from_millis(interval_ms));
        }
        let response = execute_gateway_read(controller, read_method, &json!({}))?;
        if runtime_request::gateway_write_readback_matches(method, params, &response) {
            return Ok(response);
        }
        attempt += 1;
    }
    Err(format!(
        "correlated {read_method} readback did not match after {} attempts",
        attempt
    ))
}

fn gateway_operation(
    controller: &DeviceController,
    params: &Value,
    method: &str,
) -> Result<Value, String> {
    let verification_policy = runtime_request::gateway_write_verification_policy(method);
    if let Some(read_method) = verification_policy.preflight_method {
        let response = execute_gateway_read(controller, read_method, &json!({}))?;
        if !runtime_request::gateway_write_preflight_matches(method, params, &response) {
            return Err(format!(
                "{method} was based on stale global state, or the QC is not in GLOBAL tempo mode; refresh and retry"
            ));
        }
    }
    let plan = plan_gateway_write(controller, method, params)?;
    if runtime_request::gateway_write_is_realtime(method) {
        execute_realtime_planned_write(controller, &plan.write)?;
        controller.record_library_mutation(method, params);
        return Ok(accepted_unverified(plan.detail));
    }
    let events = controller.subscribe_state_events();
    let after_sequence = controller.latest_state_sequence();
    execute_gateway_write(controller, &plan)?;
    controller.record_library_mutation(method, params);
    if !plan.verification.requires_authoritative_readback() {
        let Some(read_method) = verification_policy.readback_method else {
            return Ok(accepted_unverified(plan.detail));
        };
        let response = execute_correlated_readback(controller, method, params, read_method)
            .map_err(|error| format!("{} was sent, but {error}", plan.detail))?;
        return Ok(json!({
            "accepted": true,
            "verified": true,
            "verification": "authoritative_readback",
            "detail": plan.detail,
            "readback": response
        }));
    }
    let snapshot = verify_gateway_write_on_schedule(
        controller,
        &events,
        plan.verification.clone(),
        after_sequence,
        &verification_policy,
    )?
    .ok_or_else(|| {
        format!(
            "{} was sent, but authoritative preset readback did not confirm it",
            plan.detail
        )
    })?;
    let parameter = plan
        .verification
        .parameter_target()
        .and_then(|target| observed_gateway_parameter(controller, target));
    if !plan.verification.matches(&snapshot, parameter.as_ref()) {
        return Err(format!(
            "{} was sent, but authoritative preset readback rejected it",
            plan.detail
        ));
    }
    Ok(json!({
        "accepted": true,
        "verified": true,
        "verification": "authoritative_readback",
        "detail": plan.detail,
        "snapshot": snapshot
    }))
}

fn execute_preset_recall(
    controller: &DeviceController,
    plan: runtime_request::PresetRecallPlan,
) -> Result<Value, String> {
    let recall_message = |request_id| {
        qc_protocol::commands::setlist_position_with_request_id(
            plan.setlist_key.clone(),
            plan.position,
            plan.setlist_key.starts_with("/opt/"),
            Some(request_id),
        )
    };
    let device_events = controller.subscribe_state_events();
    let after_sequence = controller.latest_state_sequence();
    let verification = plan.verification();
    let verification_policy =
        runtime_request::gateway_write_verification_policy("device.recallPreset");
    controller.send_command(recall_message(controller.reserve_request_id()?))?;
    let after = match verify_gateway_write_on_schedule(
        controller,
        &device_events,
        verification,
        after_sequence,
        &verification_policy,
    )? {
        Some(after) => after,
        None => {
            // Match Android's recovery rule: reset the transport once, trust
            // the fresh synchronized snapshot, and never replay the mutation.
            controller.reset_session()?;
            let status = controller.wait_for_ready(preset_recall_recovery_timeout());
            if status.phase != "ready" {
                return Err(format!(
                    "Preset recall required USB recovery, but reconnection ended in {}: {}",
                    status.phase, status.detail
                ));
            }
            // USB startup can become protocol-ready a few milliseconds before
            // the decoder worker has reduced the retained startup burst. Wait
            // for that authoritative projection instead of sampling the race.
            let recovered = controller
                .wait_for_gateway_snapshot(
                    Duration::from_millis(profile::COMMAND_CONFIRMATION_TIMEOUT_MS),
                    |snapshot| !snapshot.setlist_key.is_empty() && !snapshot.preset_name.is_empty(),
                )
                .ok_or_else(|| {
                    "The recovered QC session did not publish its active position".to_string()
                })?;
            if plan.matches_recovered(&recovered) {
                recovered
            } else {
                return Err(format!(
                    "Preset recall targeted slot {}, but recovered device readback remained on slot {}.",
                    plan.position, recovered.preset_position
                ));
            }
        }
    };
    // Freshness was already established by the event verifier above, or by a
    // complete reconnect plus synchronized snapshot in the recovery branch.
    // A recovered session starts a new revision generation, so comparing its
    // revision counter with the prior session would reject correct readback.
    if !plan.matches_recovered(&after) {
        return Err(format!(
            "Preset recall targeted slot {}, but live device readback remained on slot {}.",
            plan.position, after.preset_position
        ));
    }
    // recallPreset, navigateBank and reloadPreset are all contracted as
    // DeviceActionResult, so they must carry verification semantics like every
    // other device action. The plan checks above are an authoritative
    // device readback - the call returns Err when the QC did not land on the
    // requested slot - so reporting the readback here is accurate, not
    // optimistic. Omitting these fields made the host reject a correct result
    // and tear down the session on every preset change.
    Ok(json!({
        "accepted": true,
        "verified": true,
        "verification": "authoritative_readback",
        "detail": plan.detail,
        "snapshot": after
    }))
}

fn preset_recall_recovery_timeout() -> Duration {
    Duration::from_millis(profile::READY_WAIT_TIMEOUT_MS)
}

fn gateway_recall_preset(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let snapshot = controller.gateway_snapshot();
    let plan =
        runtime_request::plan_preset_recall("device.recallPreset", params, snapshot.as_ref())?;
    execute_preset_recall(controller, plan)
}

fn gateway_navigate_bank(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let snapshot = controller.gateway_snapshot();
    let plan =
        runtime_request::plan_preset_recall("device.navigateBank", params, snapshot.as_ref())?;
    execute_preset_recall(controller, plan)
}

fn gateway_reload_preset(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let snapshot = controller.gateway_snapshot();
    let plan =
        runtime_request::plan_preset_recall("device.reloadPreset", params, snapshot.as_ref())?;
    execute_preset_recall(controller, plan)
}

fn maybe_refresh_library(controller: &DeviceController, params: &Value) -> Result<(), String> {
    if params
        .get("refresh")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        controller.refresh_preset_library()?;
    }
    Ok(())
}

fn gateway_list_preset_folders(
    controller: &DeviceController,
    params: &Value,
) -> Result<Value, String> {
    if controller.preset_folders().is_empty() {
        controller.refresh_preset_library()?;
    } else {
        maybe_refresh_library(controller, params)?;
    }
    let folders = controller.preset_folders();
    let loading = folders.is_empty();
    Ok(json!({"folders": folders, "loading": loading}))
}

fn gateway_list_presets(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let key = params
        .get("setlistKey")
        .and_then(Value::as_str)
        .map(String::from)
        .or_else(|| {
            controller
                .gateway_snapshot()
                .map(|snapshot| snapshot.setlist_key)
        })
        .filter(|key| !key.is_empty())
        .ok_or_else(|| "No active preset setlist has been synchronized".to_string())?;
    if params
        .get("refresh")
        .and_then(Value::as_bool)
        .unwrap_or(false)
        || controller.preset_list(&key).is_none()
    {
        controller.refresh_preset_library()?;
    }
    if let Some(list) = controller.preset_list(&key) {
        let mut value = serde_json::to_value(list).map_err(|error| error.to_string())?;
        value["loading"] = Value::Bool(false);
        return Ok(value);
    }
    let snapshot = controller
        .gateway_snapshot()
        .ok_or_else(|| "No Quad Cortex preset has been synchronized yet".to_string())?;
    let setlist_name = key.trim_end_matches('/').rsplit('/').next().unwrap_or(&key);
    Ok(json!({
        "setlistKey": key,
        "setlistName": setlist_name,
        "currentPosition": snapshot.preset_position,
        "presets": [],
        "folders": controller.preset_folders(),
        "loading": true
    }))
}

fn gateway_list_preset_slots(controller: &DeviceController) -> Result<Value, String> {
    let snapshot = controller
        .gateway_snapshot()
        .ok_or_else(|| "No Quad Cortex preset has been synchronized yet".to_string())?;
    if let Some(slots) = controller.preset_slots()? {
        return serde_json::to_value(slots).map_err(|error| error.to_string());
    }
    controller.refresh_preset_library()?;
    if controller
        .wait_for_preset_list(
            &snapshot.setlist_key,
            Duration::from_millis(profile::PRESET_SYNC_TIMEOUT_MS),
        )
        .is_none()
    {
        return Err("The active preset slots did not finish loading".into());
    }
    controller
        .preset_slots()?
        .map(|slots| serde_json::to_value(slots).map_err(|error| error.to_string()))
        .unwrap_or_else(|| Err("The active preset slots did not finish loading".into()))
}

fn execute_preset_mutation(
    controller: &DeviceController,
    mut plan: PresetMutationPlan,
    report_actual_preset_name: bool,
) -> Result<Value, String> {
    let mut observed = None;
    for stage in std::mem::take(&mut plan.stages) {
        let catalog_verified_save = matches!(
            &stage.write,
            PlannedWrite::HidOperation(qc_protocol::commands::DeviceOperation::SavePreset { .. })
        );
        let events = controller.subscribe_state_events();
        let before_sequence = controller.latest_state_sequence();
        execute_planned_write(controller, &stage.write)?;
        let verification = stage.verification;
        if !matches!(verification, GatewayVerification::None) {
            let verification_policy =
                runtime_request::gateway_verification_policy(stage.timeout_ms, 0);
            let after = verify_gateway_write_on_schedule(
                controller,
                &events,
                verification.clone(),
                before_sequence,
                &verification_policy,
            )?;
            if let Some(after) = after {
                if !verification.matches(&after, None) {
                    return Err(
                        "The preset operation completed, but live-state verification failed."
                            .into(),
                    );
                }
                observed = Some(after);
            } else if !catalog_verified_save {
                return Err(
                    "The preset operation did not produce a verified device snapshot".into(),
                );
            }
        }
        if stage.settle_ms > 0 {
            thread::sleep(Duration::from_millis(stage.settle_ms));
        }
    }

    // Saving is eventually consistent and CorOS de-duplicates colliding names
    // (for example Foo may be stored as Foo_1). A live preset snapshot can
    // still carry the requested display name, so only a fresh File listing is
    // authoritative for the catalog name and slot.
    if !plan.saved_presets.is_empty() {
        let expected = plan.saved_presets.clone();
        let listing_matches = |listing: &qc_protocol::state::PresetFolderListing| {
            expected.iter().all(|preset| {
                listing.files.iter().any(|file| {
                    file.position == preset.position
                        && !file.name.is_empty()
                        && runtime_request::stored_preset_name_matches(&preset.name, &file.name)
                })
            })
        };
        let listing = match controller
            .wait_for_fresh_preset_listing(&plan.setlist_key, listing_matches)
        {
            Ok(listing) => listing,
            Err(stale_error) => {
                // Persistent writes are not safe to replay. CorOS can commit a
                // save while continuing to serve an old File stream, so reset
                // the session once and verify the committed catalog instead.
                controller.reset_session()?;
                let status = controller.wait_for_ready(preset_recall_recovery_timeout());
                if status.phase != "ready" {
                    return Err(format!(
                        "{stale_error} Catalog recovery ended in {}: {}",
                        status.phase, status.detail
                    ));
                }
                let recovered = controller
                    .wait_for_gateway_snapshot(
                        Duration::from_millis(profile::COMMAND_CONFIRMATION_TIMEOUT_MS),
                        |snapshot| {
                            !snapshot.setlist_key.is_empty() && !snapshot.preset_name.is_empty()
                        },
                    )
                    .ok_or_else(|| {
                        format!("{stale_error} Catalog recovery published no active preset")
                    })?;
                observed = Some(recovered);
                controller
                    .wait_for_fresh_preset_listing(&plan.setlist_key, listing_matches)
                    .map_err(|recovery_error| {
                        format!("{stale_error} Recovery verification also failed: {recovery_error}")
                    })?
            }
        };
        for preset in &mut plan.saved_presets {
            let file = listing
                .files
                .iter()
                .find(|file| {
                    file.position == preset.position
                        && !file.name.is_empty()
                        && runtime_request::stored_preset_name_matches(&preset.name, &file.name)
                })
                .ok_or_else(|| {
                    format!(
                        "The fresh QC catalog did not contain the saved preset at slot {}",
                        preset.position
                    )
                })?;
            preset.name.clone_from(&file.name);
            preset.instrument = file.instrument;
        }
        if report_actual_preset_name {
            if let Some(saved) = plan.saved_presets.first() {
                plan.saved_name.clone_from(&saved.name);
            }
        }
    }

    let after = observed
        .or_else(|| controller.gateway_snapshot())
        .ok_or_else(|| "The preset operation produced no synchronized snapshot".to_string())?;
    controller.ensure_preset_setlist(&plan.setlist_key);
    for preset in &plan.saved_presets {
        controller.record_saved_preset(
            &preset.setlist_key,
            preset.position,
            &preset.name,
            preset.instrument,
        );
    }
    Ok(json!({
        "detail": plan.detail,
        "savedName": plan.saved_name,
        "snapshot": after,
    }))
}

fn ensure_preset_listing_loaded(
    controller: &DeviceController,
    setlist_key: &str,
) -> Result<(), String> {
    if controller.preset_list(setlist_key).is_some() {
        return Ok(());
    }
    controller
        .wait_for_fresh_preset_listing(setlist_key, |_| true)
        .map(|_| ())
}

fn ensure_preset_entry_loaded(
    controller: &DeviceController,
    setlist_key: &str,
    position: u32,
) -> Result<(), String> {
    if controller.preset_entry(setlist_key, position).is_some() {
        return Ok(());
    }
    controller
        .wait_for_fresh_preset_listing(setlist_key, |listing| {
            listing
                .files
                .iter()
                .any(|file| file.position == position && !file.name.is_empty())
        })
        .map(|_| ())
}

fn gateway_save_preset_as(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let setlist_key = required_text(params, "setlistKey")?;
    ensure_preset_listing_loaded(controller, &setlist_key)?;
    execute_preset_mutation(
        controller,
        controller.plan_preset_mutation("device.savePresetAs", params)?,
        true,
    )
}

fn gateway_rename_current_preset(
    controller: &DeviceController,
    params: &Value,
) -> Result<Value, String> {
    let setlist_key = controller
        .gateway_snapshot()
        .map(|snapshot| snapshot.setlist_key)
        .ok_or_else(|| "No Quad Cortex preset has been synchronized yet".to_string())?;
    ensure_preset_listing_loaded(controller, &setlist_key)?;
    execute_preset_mutation(
        controller,
        controller.plan_preset_mutation("device.renameCurrentPreset", params)?,
        true,
    )
}

fn gateway_create_backup(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let name = required_text(params, "name")?;
    let raw = controller.create_backup(Duration::from_millis(profile::BACKUP_TOTAL_TIMEOUT_MS))?;
    finalize_device_backup(&raw, &name)
}

fn gateway_copy_preset(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let source_setlist_key = required_text(params, "sourceSetlistKey")?;
    let source_position = runtime_request::bounded_u32(params, "sourcePosition", 255)?;
    ensure_preset_entry_loaded(controller, &source_setlist_key, source_position)?;
    execute_preset_mutation(
        controller,
        controller.plan_preset_mutation("device.copyPreset", params)?,
        true,
    )
}

fn gateway_duplicate_setlist(
    controller: &DeviceController,
    params: &Value,
) -> Result<Value, String> {
    let source_setlist_key = required_text(params, "sourceSetlistKey")?;
    ensure_preset_listing_loaded(controller, &source_setlist_key)?;
    execute_preset_mutation(
        controller,
        controller.plan_preset_mutation("device.duplicateSetlist", params)?,
        false,
    )
}

fn message_type(params: &Value, field: &str) -> Result<u16, String> {
    let raw = params
        .get(field)
        .and_then(Value::as_u64)
        .ok_or_else(|| format!("{field} must be an integer from 1 through 72"))?;
    let value = u16::try_from(raw).map_err(|_| format!("{field} is outside the u16 range"))?;
    if !(1..=72).contains(&value) {
        return Err(format!("{field} must be an integer from 1 through 72"));
    }
    Ok(value)
}

fn payload(params: &Value) -> Result<Vec<u8>, String> {
    let encoded = params
        .get("payloadBase64")
        .and_then(Value::as_str)
        .ok_or_else(|| "payloadBase64 must be a Base64 string".to_string())?;
    BASE64
        .decode(encoded)
        .map_err(|_| "payloadBase64 is not valid Base64".to_string())
}

fn raw_latest(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let kind = message_type(params, "messageType")?;
    Ok(match controller.latest_message(kind) {
        Some(message) => serde_json::to_value(RawMessage {
            sequence: message.sequence,
            message_type: message.message_type,
            payload_base64: BASE64.encode(message.payload),
            received_at_unix_ms: message.received_at_unix_ms,
        })
        .map_err(|error| error.to_string())?,
        None => Value::Null,
    })
}

fn raw_events(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let after = optional_u64(params, "afterSequence")?.unwrap_or(0);
    let kind = params
        .get("messageType")
        .map(|_| message_type(params, "messageType"))
        .transpose()?;
    let limit = optional_bounded_u64(params, "limit", 1, domain::STATE_EVENT_MAXIMUM_LIMIT as u64)?
        .unwrap_or(domain::STATE_EVENT_DEFAULT_LIMIT as u64) as usize;
    let messages = controller
        .events_since(after, kind, limit)
        .into_iter()
        .map(|message| RawMessage {
            sequence: message.sequence,
            message_type: message.message_type,
            payload_base64: BASE64.encode(message.payload),
            received_at_unix_ms: message.received_at_unix_ms,
        })
        .collect::<Vec<_>>();
    serde_json::to_value(messages).map_err(|error| error.to_string())
}

fn state_events(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let after = optional_u64(params, "afterSequence")?.unwrap_or(0);
    let limit = optional_bounded_u64(params, "limit", 1, domain::STATE_EVENT_MAXIMUM_LIMIT as u64)?
        .unwrap_or(domain::STATE_EVENT_DEFAULT_LIMIT as u64) as usize;
    serde_json::to_value(controller.state_events_since(after, limit))
        .map_err(|error| error.to_string())
}

fn state_block_details(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let row = bounded_u32(params, "row", domain::GRID_ROWS - 1)?;
    let column = bounded_u32(params, "column", domain::GRID_COLUMNS - 1)?;
    serde_json::to_value(controller.block_details(row, column)?).map_err(|error| error.to_string())
}

fn bounded_u32(params: &Value, field: &str, maximum: u32) -> Result<u32, String> {
    runtime_request::bounded_u32(params, field, maximum)
}

fn optional_u64(params: &Value, field: &str) -> Result<Option<u64>, String> {
    match params.get(field) {
        None => Ok(None),
        Some(value) => value
            .as_u64()
            .map(Some)
            .ok_or_else(|| format!("{field} must be a non-negative integer")),
    }
}

fn optional_bounded_u64(
    params: &Value,
    field: &str,
    minimum: u64,
    maximum: u64,
) -> Result<Option<u64>, String> {
    let Some(value) = optional_u64(params, field)? else {
        return Ok(None);
    };
    if !(minimum..=maximum).contains(&value) {
        return Err(format!(
            "{field} must be an integer from {minimum} through {maximum}"
        ));
    }
    Ok(Some(value))
}

fn normalized_f64(params: &Value, field: &str) -> Result<f64, String> {
    params
        .get(field)
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite() && (0.0..=1.0).contains(value))
        .ok_or_else(|| format!("{field} must be a number from 0 through 1"))
}

fn command_scene(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let plan = plan_gateway_write(controller, "device.command.scene", params)?;
    execute_gateway_write(controller, &plan)?;
    Ok(json!({"accepted": true}))
}

fn command_bypass(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let plan = plan_gateway_write(controller, "device.command.bypass", params)?;
    execute_gateway_write(controller, &plan)?;
    Ok(json!({"accepted": true}))
}

fn command_parameter(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let plan = plan_gateway_write(controller, "device.command.parameter", params)?;
    execute_gateway_write(controller, &plan)?;
    Ok(json!({"accepted": true}))
}

fn command_tempo(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let plan = plan_gateway_write(controller, "device.command.tempo", params)?;
    execute_gateway_write(controller, &plan)?;
    Ok(json!({"accepted": true}))
}

fn required_text(params: &Value, field: &str) -> Result<String, String> {
    runtime_request::required_text(params, field)
}

fn command_operation(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let plan = plan_gateway_write(controller, "device.command.operation", params)?;
    execute_gateway_write(controller, &plan)?;
    Ok(json!({"accepted": true}))
}

fn raw_send(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let kind = message_type(params, "messageType")?;
    controller.send(kind, payload(params)?)?;
    Ok(json!({"accepted": true}))
}

fn raw_request(controller: &DeviceController, params: &Value) -> Result<Value, String> {
    let kind = message_type(params, "messageType")?;
    let expected = params
        .get("expectedType")
        .map(|_| message_type(params, "expectedType"))
        .transpose()?
        .unwrap_or(kind);
    let request_id = optional_u64(params, "requestId")?;
    let timeout_ms = optional_bounded_u64(params, "timeoutMs", 1, 60_000)?.unwrap_or(10_000);
    let message = controller.request(
        kind,
        payload(params)?,
        expected,
        request_id,
        Duration::from_millis(timeout_ms),
    )?;
    serde_json::to_value(RawMessage {
        sequence: message.sequence,
        message_type: message.message_type,
        payload_base64: BASE64.encode(message.payload),
        received_at_unix_ms: message.received_at_unix_ms,
    })
    .map_err(|error| error.to_string())
}

fn error(id: Value, code: i64, message: &str) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}})
}

fn read_request(input: &mut impl Read) -> Result<Option<Request>, String> {
    let mut header = [0_u8; 4];
    let mut read = 0;
    while read < header.len() {
        match input.read(&mut header[read..]) {
            Ok(0) if read == 0 => return Ok(None),
            Ok(0) => return Err("Incomplete native broker frame header".into()),
            Ok(count) => read += count,
            Err(error) => return Err(format!("Could not read native broker input: {error}")),
        }
    }
    let length = u32::from_be_bytes(header) as usize;
    if length == 0 || length > qc_protocol::domain::IPC_MAX_FRAME_BYTES {
        return Err(format!("Invalid native broker frame length: {length}"));
    }
    let mut body = vec![0_u8; length];
    input
        .read_exact(&mut body)
        .map_err(|error| format!("Incomplete native broker frame: {error}"))?;
    serde_json::from_slice(&body)
        .map(Some)
        .map_err(|error| format!("Invalid native broker JSON: {error}"))
}

fn write_response(output: &mut impl Write, response: &Value) -> Result<(), String> {
    let body = serde_json::to_vec(response).map_err(|error| error.to_string())?;
    if body.len() > qc_protocol::domain::IPC_MAX_FRAME_BYTES {
        return Err("Native broker response exceeds the IPC frame limit".into());
    }
    let length =
        u32::try_from(body.len()).map_err(|_| "Native broker response is too large".to_string())?;
    output
        .write_all(&length.to_be_bytes())
        .map_err(|error| error.to_string())?;
    output.write_all(&body).map_err(|error| error.to_string())?;
    output.flush().map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preset_recall_recovery_uses_the_complete_shared_ready_window() {
        assert_eq!(
            preset_recall_recovery_timeout(),
            Duration::from_millis(profile::READY_WAIT_TIMEOUT_MS)
        );
    }

    #[test]
    fn only_safe_timed_out_reads_trigger_session_recovery() {
        let timeout = "The Quad Cortex did not return a valid device.irs reply within 30 seconds";
        assert!(gateway_read_timeout_is_recoverable("device.irs", timeout));
        assert!(!gateway_read_timeout_is_recoverable(
            "device.diagnostics",
            "The Quad Cortex did not return a valid device.diagnostics reply within 8 seconds"
        ));
        assert!(!gateway_read_timeout_is_recoverable(
            "device.irs",
            "folder must not contain path traversal"
        ));
    }

    #[test]
    fn preset_recall_results_satisfy_their_own_generated_contract() {
        // Regression: recallPreset, navigateBank and reloadPreset are contracted
        // as DeviceActionResult but returned only {detail, snapshot}. The host
        // validates every result and reported the mismatch as a transport
        // fault, so it killed a healthy broker on every preset change. Nothing
        // exercised validate_result against a real broker result, so the whole
        // parity gate stayed green while the device session died on each click.
        let recall = json!({
            "accepted": true,
            "verified": true,
            "verification": "authoritative_readback",
            "detail": "Preset recalled and verified",
            "snapshot": {"presetName": "Test", "blocks": []}
        });
        for method in [
            "device.recallPreset",
            "device.navigateBank",
            "device.reloadPreset",
        ] {
            generated_gateway::validate_result(method, &recall).unwrap_or_else(|error| {
                panic!("{method} result must satisfy its contract: {error}")
            });
        }

        // The shape that caused the outage must still be rejected, so this can
        // never silently regress to "detail plus snapshot".
        let without_verification = json!({
            "detail": "Preset recalled and verified",
            "snapshot": {"presetName": "Test", "blocks": []}
        });
        for method in [
            "device.recallPreset",
            "device.navigateBank",
            "device.reloadPreset",
        ] {
            assert!(
                generated_gateway::validate_result(method, &without_verification).is_err(),
                "{method} must not accept a result without verification semantics"
            );
        }
    }

    #[test]
    fn coros_preset_name_deduplication_is_accepted_without_accepting_unrelated_names() {
        assert!(runtime_request::stored_preset_name_matches(
            "Crying Wah",
            "Crying Wah"
        ));
        assert!(runtime_request::stored_preset_name_matches(
            "Crying Wah",
            "Crying Wah_1"
        ));
        assert!(runtime_request::stored_preset_name_matches(
            "Cali Basswalk [Ret1]",
            "Cali Basswalk [Ret_1"
        ));
        assert!(!runtime_request::stored_preset_name_matches(
            "Crying Wah",
            "Crying Wah copy"
        ));
        assert!(!runtime_request::stored_preset_name_matches(
            "Crying Wah",
            "Other_1"
        ));
        assert!(!runtime_request::stored_preset_name_matches(
            "Crying Wah",
            "Crying Wah_x"
        ));
        assert!(!runtime_request::stored_preset_name_matches(
            "Crying Wah Plus",
            "Crying Wah_1"
        ));
    }

    #[test]
    fn optional_event_and_raw_request_numbers_are_strictly_typed_and_bounded() {
        assert_eq!(optional_u64(&json!({}), "afterSequence"), Ok(None));
        assert_eq!(
            optional_u64(&json!({"afterSequence": 7}), "afterSequence"),
            Ok(Some(7))
        );
        for invalid in [json!(null), json!(-1), json!(1.5), json!("7"), json!(true)] {
            assert!(optional_u64(&json!({"afterSequence": invalid}), "afterSequence").is_err());
        }
        assert!(optional_bounded_u64(&json!({"limit": 0}), "limit", 1, 4096).is_err());
        assert!(optional_bounded_u64(&json!({"limit": 4097}), "limit", 1, 4096).is_err());
        assert_eq!(
            optional_bounded_u64(&json!({"timeoutMs": 60_000}), "timeoutMs", 1, 60_000),
            Ok(Some(60_000))
        );
    }

    #[test]
    fn framing_reads_one_request() {
        let body = br#"{"jsonrpc":"2.0","id":1,"method":"system.status"}"#;
        let mut frame = (body.len() as u32).to_be_bytes().to_vec();
        frame.extend_from_slice(body);
        let request = read_request(&mut frame.as_slice()).unwrap().unwrap();
        assert_eq!(request.method, "system.status");
        assert_eq!(request.id, 1);
    }

    #[test]
    fn request_envelope_rejects_unknown_fields_and_nonpositive_ids() {
        let body = br#"{"jsonrpc":"2.0","id":1,"method":"system.status","extra":true}"#;
        let mut frame = (body.len() as u32).to_be_bytes().to_vec();
        frame.extend_from_slice(body);
        assert!(read_request(&mut frame.as_slice()).is_err());

        let controller = DeviceController::start_disconnected();
        let performance_midi = Mutex::new(PerformanceMidi::default());
        let response = handle(
            &controller,
            &performance_midi,
            Request {
                jsonrpc: "2.0".into(),
                id: json!(0),
                method: "system.status".into(),
                params: json!({}),
            },
        );
        assert_eq!(response["error"]["code"], -32600);
    }

    #[test]
    fn canonical_gateway_boundary_rejects_missing_extra_and_wrong_typed_arguments() {
        assert!(generated_gateway::validate_params("device.snapshot", &json!({})).is_ok());
        assert!(
            generated_gateway::validate_params("device.snapshot", &json!({"ignored": true}))
                .is_err()
        );
        assert!(generated_gateway::validate_params(
            "device.setTempo",
            &json!({
                "bpm": 120, "expectedTempo": 120, "expectedPresetName": "Clean"
            })
        )
        .is_ok());
        assert!(generated_gateway::validate_params(
            "device.setTempo",
            &json!({
                "bpm": true, "expectedTempo": 120, "expectedPresetName": "Clean"
            })
        )
        .is_err());
        assert!(generated_gateway::validate_params(
            "device.setTempo",
            &json!({
                "expectedTempo": 120, "expectedPresetName": "Clean"
            })
        )
        .is_err());
        assert!(generated_gateway::validate_params(
            "device.setInputPort",
            &json!({
                "inputPortId": 1, "levelDb": null, "impedance": null,
                "inputType": null, "groundLift": null
            })
        )
        .is_ok());
        assert!(generated_gateway::validate_params(
            "device.setInputPort",
            &json!({
                "inputPortId": 1, "levelDb": "12", "impedance": null,
                "inputType": null, "groundLift": null
            })
        )
        .is_err());
    }

    #[test]
    fn raw_message_types_are_bounded_to_registry() {
        assert!(message_type(&json!({"messageType": 1}), "messageType").is_ok());
        assert!(message_type(&json!({"messageType": 72}), "messageType").is_ok());
        assert!(message_type(&json!({"messageType": 0}), "messageType").is_err());
        assert!(message_type(&json!({"messageType": 73}), "messageType").is_err());
    }

    #[test]
    fn writes_without_a_readback_predicate_are_explicitly_unverified() {
        let result = accepted_unverified("Undo sent");
        assert_eq!(result["accepted"], true);
        assert_eq!(result["verified"], false);
        assert_eq!(result["verification"], "accepted_unverified");
        assert_eq!(result["detail"], "Undo sent");
    }

    #[test]
    fn system_status_identifies_the_rust_gateway_contract() {
        let controller = DeviceController::start_disconnected();
        assert_eq!(controller.status().phase, "disconnected");
        let performance_midi = Mutex::new(PerformanceMidi::default());
        let response = handle(
            &controller,
            &performance_midi,
            Request {
                jsonrpc: "2.0".into(),
                id: json!(1),
                method: "system.status".into(),
                params: json!({}),
            },
        );
        assert_eq!(response["result"]["platform"], "Rust device gateway");
        assert_eq!(
            response["result"]["gatewayApiVersion"],
            generated_gateway::API_VERSION
        );
        assert_eq!(response["result"]["gatewayAvailable"], true);
        assert_eq!(
            response["result"]["usbDiagnostics"]["phase"],
            "disconnected"
        );
        assert_eq!(response["result"]["usbDiagnostics"]["connected"], false);
        assert_eq!(response["result"]["usbDiagnostics"]["messagesSent"], 0);
        assert_eq!(
            response["result"]["usbDiagnostics"]["messagesSentByType"],
            json!({})
        );
        assert_eq!(
            response["result"]["usbDiagnostics"]["messagesReceivedByType"],
            json!({})
        );
        assert_eq!(
            response["result"]["usbDiagnostics"]["maxHidWriteDurationMs"],
            0
        );
        for capability in generated_gateway::CAPABILITIES {
            assert!(response["result"]["capabilities"]
                .as_array()
                .expect("capability array")
                .iter()
                .any(|value| value == capability));
        }
    }
}
