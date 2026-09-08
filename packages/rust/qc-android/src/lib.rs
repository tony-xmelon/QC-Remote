use jni::objects::{JByteArray, JClass, JString};
use jni::sys::{jbyteArray, jint, jlong, jstring};
use jni::JNIEnv;
use qc_device_runtime::backup::{BackupAction, BackupRuntime};
use qc_device_runtime::catalog::{CatalogVerificationAction, CatalogVerificationRuntime};
use qc_device_runtime::correlation::ResponseExpectation;
use qc_device_runtime::initialization::{
    DeviceStartupAction, DeviceStartupPhase, DeviceStartupRuntime, InitializationAction,
    InitializationRuntime,
};
use qc_device_runtime::request::{
    assert_expected_parameter, compose_global_tempo_settings, finalize_device_backup,
    gateway_correlated_readback_delay, gateway_read_followup_method, gateway_verification_policy,
    gateway_write_is_realtime, gateway_write_preflight_matches, gateway_write_verification_policy,
    merge_expected_state, plan_gateway_read, plan_gateway_write, plan_preset_mutation,
    plan_preset_recall, reconcile_saved_preset_snapshot, stored_preset_name_matches,
    GatewayReadPlan, GatewayResponseProjection, GatewayTransaction, GatewayTransactionState,
    GatewayVerification, GatewayVerificationAction, GatewayVerificationRuntime,
    GatewayWriteVerificationPolicy, PlannedWrite, PresetMutationPlan,
};
use qc_device_runtime::state_runtime::DeviceStateRuntime;
use qc_device_runtime::transport::{ReportLayout, TransportRuntime};
use qc_protocol::commands::{self, OutboundMessage};
use qc_protocol::framing;
use qc_protocol::responses::decode_tempo_clock;
use qc_protocol::state::parse_model_repo;
use serde_json::Value;
use std::collections::HashMap;
use std::ptr;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeStoredPresetNameMatches(
    mut env: JNIEnv,
    _class: JClass,
    requested: JString,
    stored: JString,
) -> jint {
    let result = (|| {
        let requested = env
            .get_string(&requested)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let stored = env
            .get_string(&stored)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        Ok::<_, String>(stored_preset_name_matches(&requested, &stored))
    })();
    match result {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(error) => {
            let _ = env.throw_new("java/lang/IllegalArgumentException", error);
            0
        }
    }
}

struct DecoderHandle {
    state: Mutex<DeviceStateRuntime>,
    transport: Mutex<TransportRuntime>,
    backup: Mutex<Option<BackupRuntime>>,
    startup: Mutex<Option<DeviceStartupRuntime>>,
    initialization: Mutex<Option<InitializationRuntime>>,
    catalog_verifications: Mutex<HashMap<u64, CatalogVerificationRuntime>>,
    gateway_verifications: Mutex<HashMap<u64, GatewayVerificationRuntime>>,
}

fn handles() -> &'static Mutex<HashMap<jlong, Arc<DecoderHandle>>> {
    static HANDLES: OnceLock<Mutex<HashMap<jlong, Arc<DecoderHandle>>>> = OnceLock::new();
    HANDLES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn handle(value: jlong) -> Result<Arc<DecoderHandle>, String> {
    if value <= 0 {
        return Err("native QC decoder handle is invalid".into());
    }
    handles()
        .lock()
        .map_err(|_| "native QC handle registry lock was poisoned".to_string())?
        .get(&value)
        .cloned()
        .ok_or_else(|| "native QC decoder handle is closed".to_string())
}

fn register_handle() -> jlong {
    static NEXT_HANDLE: AtomicI64 = AtomicI64::new(1);
    let decoder = Arc::new(DecoderHandle {
        state: Mutex::new(DeviceStateRuntime::new()),
        transport: Mutex::new(TransportRuntime::new(0)),
        backup: Mutex::new(None),
        startup: Mutex::new(None),
        initialization: Mutex::new(None),
        catalog_verifications: Mutex::new(HashMap::new()),
        gateway_verifications: Mutex::new(HashMap::new()),
    });
    let value = NEXT_HANDLE.fetch_add(1, Ordering::Relaxed);
    match handles().lock() {
        Ok(mut registry) if value > 0 => {
            registry.insert(value, decoder);
            value
        }
        _ => 0,
    }
}

fn next_gateway_verification_id() -> u64 {
    static NEXT_ID: AtomicI64 = AtomicI64::new(1);
    NEXT_ID.fetch_add(1, Ordering::Relaxed).max(1) as u64
}

fn unregister_handle(value: jlong) {
    if let Ok(mut registry) = handles().lock() {
        registry.remove(&value);
    }
}

fn json_result(env: &mut JNIEnv, result: Result<String, String>) -> jstring {
    match result {
        Ok(value) => env
            .new_string(value)
            .map(|value| value.into_raw())
            .unwrap_or(ptr::null_mut()),
        Err(error) => {
            let _ = env.throw_new("java/lang/IllegalStateException", error);
            ptr::null_mut()
        }
    }
}

fn bytes_result(env: &mut JNIEnv, result: Result<Vec<u8>, String>) -> jbyteArray {
    match result {
        Ok(value) => env
            .byte_array_from_slice(&value)
            .map(|value| value.into_raw())
            .unwrap_or(ptr::null_mut()),
        Err(error) => {
            let _ = env.throw_new("java/lang/IllegalStateException", error);
            ptr::null_mut()
        }
    }
}

fn initialization_envelope(action: InitializationAction) -> Result<String, String> {
    let (kind, synchronized, messages) = match action {
        InitializationAction::Wait => (0, false, Vec::new()),
        InitializationAction::Send(messages) => (1, false, messages),
        InitializationAction::Complete { synchronized } => (2, synchronized, Vec::new()),
    };
    serde_json::to_string(&serde_json::json!({
        "kind": kind,
        "synchronized": synchronized,
        "messages": messages_json(messages),
    }))
    .map_err(|error| error.to_string())
}

fn startup_phase_name(phase: DeviceStartupPhase) -> &'static str {
    match phase {
        DeviceStartupPhase::SessionValidating => "sessionValidating",
        DeviceStartupPhase::VersionValidating => "versionValidating",
        DeviceStartupPhase::Disconnected => "disconnected",
        DeviceStartupPhase::Building => "building",
        DeviceStartupPhase::Initializing => "initializing",
        DeviceStartupPhase::Booting => "booting",
        DeviceStartupPhase::Connected => "connected",
        DeviceStartupPhase::Invalid => "invalid",
        DeviceStartupPhase::Failed => "failed",
    }
}

fn startup_phase_is_connected(phase: DeviceStartupPhase) -> bool {
    phase == DeviceStartupPhase::Connected
}

fn startup_envelope(
    phase: DeviceStartupPhase,
    action: DeviceStartupAction,
) -> Result<String, String> {
    let begin_building = matches!(&action, DeviceStartupAction::SendThenBuild(_));
    let (kind, error, messages) = match action {
        DeviceStartupAction::Wait => (0, None, Vec::new()),
        DeviceStartupAction::Send(messages) | DeviceStartupAction::SendThenBuild(messages) => {
            (1, None, messages)
        }
        DeviceStartupAction::Connected => (2, None, Vec::new()),
        DeviceStartupAction::Invalid(error) => (3, Some(format!("{error:?}")), Vec::new()),
        DeviceStartupAction::Failed(error) => (4, Some(format!("{error:?}")), Vec::new()),
    };
    serde_json::to_string(&serde_json::json!({
        "kind": kind,
        "phase": startup_phase_name(phase),
        "beginBuilding": begin_building,
        "error": error,
        "messages": messages_json(messages),
    }))
    .map_err(|error| error.to_string())
}

fn catalog_verification_key(value: jlong) -> Result<u64, String> {
    u64::try_from(value)
        .ok()
        .filter(|value| *value > 0)
        .ok_or_else(|| "native QC catalog verification id is invalid".to_string())
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeMergeExpectedState(
    mut env: JNIEnv,
    _class: JClass,
    params_json: JString,
    expected_json: JString,
) -> jstring {
    let result = (|| {
        let params: Value = serde_json::from_str(
            &env.get_string(&params_json)
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
        )
        .map_err(|error| error.to_string())?;
        let expected: Value = serde_json::from_str(
            &env.get_string(&expected_json)
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
        )
        .map_err(|error| error.to_string())?;
        serde_json::to_string(&merge_expected_state(&params, &expected))
            .map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

fn messages_json(messages: Vec<OutboundMessage>) -> Vec<Value> {
    messages
        .into_iter()
        .map(|message| {
            serde_json::json!({
                "messageType": message.message_type,
                "payload": message.payload,
            })
        })
        .collect()
}

fn gateway_write_envelope(
    method: &str,
    detail: &str,
    verification: &GatewayVerification,
    realtime: bool,
    policy: &GatewayWriteVerificationPolicy,
    write: PlannedWrite,
) -> Result<String, String> {
    let inter_message_interval_ms = write.inter_message_interval_ms();
    let (lane, controller, value, messages) = match write {
        PlannedWrite::HidCommand(command) => ("hid", 0_u8, 0_u8, vec![command.encode()]),
        PlannedWrite::HidOperation(operation) => (
            "hid",
            0,
            0,
            operation.try_encode().map_err(|error| error.to_string())?,
        ),
        PlannedWrite::MidiControlChange { controller, value } => {
            ("midi", controller, value, Vec::new())
        }
    };
    serde_json::to_string(&serde_json::json!({
        "method": method,
        "detail": detail,
        "verification": verification,
        "lane": lane,
        "controller": controller,
        "value": value,
        "realtime": realtime,
        "interMessageIntervalMs": inter_message_interval_ms,
        "confirmationTimeoutMs": policy.timeout_ms,
        "postWriteRefreshMethod": policy.post_write_refresh_method,
        "postWriteRefreshDelayMs": policy.post_write_refresh_delay_ms,
        "preflightMethod": policy.preflight_method,
        "readbackMethod": policy.readback_method,
        "messages": messages_json(messages),
    }))
    .map_err(|error| error.to_string())
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeGatewayReadbackRetryDelay(
    mut env: JNIEnv,
    _class: JClass,
    method: JString,
    attempt: jint,
) -> jlong {
    let result = (|| {
        let method = env
            .get_string(&method)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let attempt = usize::try_from(attempt)
            .map_err(|_| "gateway readback attempt must be non-negative".to_string())?;
        Ok::<_, String>(
            gateway_correlated_readback_delay(&method, attempt)
                .map(|delay| delay as jlong)
                .unwrap_or(-1),
        )
    })();
    match result {
        Ok(delay) => delay,
        Err(error) => {
            let _ = env.throw_new("java/lang/IllegalArgumentException", error);
            -1
        }
    }
}

fn planned_messages(write: PlannedWrite) -> Result<Vec<OutboundMessage>, String> {
    Ok(match write {
        PlannedWrite::HidCommand(command) => vec![command.encode()],
        PlannedWrite::HidOperation(operation) => {
            operation.try_encode().map_err(|error| error.to_string())?
        }
        PlannedWrite::MidiControlChange { .. } => Vec::new(),
    })
}

fn gateway_workflow_envelope(plan: PresetMutationPlan) -> Result<String, String> {
    let stages = plan
        .stages
        .into_iter()
        .map(|stage| -> Result<Value, String> {
            Ok(serde_json::json!({
                "timeoutMs": stage.timeout_ms,
                "settleMs": stage.settle_ms,
                "verification": stage.verification,
                "messages": messages_json(planned_messages(stage.write)?),
            }))
        })
        .collect::<Result<Vec<_>, _>>()?;
    serde_json::to_string(&serde_json::json!({
        "detail": plan.detail,
        "savedName": plan.saved_name,
        "setlistKey": plan.setlist_key,
        "position": plan.position,
        "instrument": plan.instrument,
        "savedPresets": plan.saved_presets,
        "stages": stages,
    }))
    .map_err(|error| error.to_string())
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeRecordSavedPreset(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    setlist_key: JString,
    position: jint,
    name: JString,
    instrument: jint,
) {
    let result = (|| {
        let setlist_key = env
            .get_string(&setlist_key)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let name = env
            .get_string(&name)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let position = u32::try_from(position)
            .map_err(|_| "preset position must be non-negative".to_string())?;
        let decoder = handle(value)?;
        let mut state = decoder
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?;
        state
            .preset_library_mut()
            .record_saved(&setlist_key, position, &name, instrument);
        reconcile_saved_preset_snapshot(state.snapshot_mut(), &setlist_key, position, &name);
        Ok::<_, String>(())
    })();
    if let Err(error) = result {
        let _ = env.throw_new("java/lang/IllegalStateException", error);
    }
}

fn gateway_read_envelope(method: &str, plan: GatewayReadPlan) -> Result<String, String> {
    let messages = plan
        .operation
        .try_encode()
        .map_err(|error| error.to_string())?;
    serde_json::to_string(&serde_json::json!({
        "responseType": plan.response_type,
        "timeoutMs": plan.timeout_ms,
        "projection": plan.projection,
        "followupMethod": gateway_read_followup_method(method),
        "messages": messages_json(messages),
    }))
    .map_err(|error| error.to_string())
}

fn unsigned(args: &Value, name: &str) -> Result<u32, String> {
    args.get(name)
        .and_then(Value::as_u64)
        .and_then(|value| u32::try_from(value).ok())
        .ok_or_else(|| format!("{name} must be a non-negative integer"))
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeEncodeCommand(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    command: JString,
    args_json: JString,
) -> jstring {
    let result = (|| {
        let _native = handle(value)?;
        let command = env
            .get_string(&command)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let args_json = env
            .get_string(&args_json)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let args: Value = serde_json::from_str(&args_json).map_err(|error| error.to_string())?;
        let messages = match command.as_str() {
            "read" => vec![commands::read(
                u16::try_from(unsigned(&args, "messageType")?)
                    .map_err(|_| "messageType is out of range".to_string())?,
            )],
            "screenSwipe" => commands::screen_drag(
                unsigned(&args, "x")? as f32,
                unsigned(&args, "y")? as f32,
                unsigned(&args, "toX")? as f32,
                unsigned(&args, "toY")? as f32,
            )
            .to_vec(),
            "keepalive" => vec![commands::keepalive()],
            "systemTime" => vec![commands::sync_system_time(
                args.get("unixTimeMs")
                    .and_then(Value::as_u64)
                    .ok_or_else(|| "unixTimeMs must be a non-negative integer".to_string())?,
            )],
            "backup" => vec![commands::create_local_backup()],
            other => return Err(format!("unknown native QC command: {other}")),
        };
        serde_json::to_string(&messages_json(messages)).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativePlanGatewayWrite(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    method: JString,
    args_json: JString,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let method = env
            .get_string(&method)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let args_json = env
            .get_string(&args_json)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let args: Value = serde_json::from_str(&args_json).map_err(|error| error.to_string())?;
        if method == "device.setParameter" {
            let row = unsigned(&args, "row")?;
            let column = unsigned(&args, "column")?;
            let parameter_index = unsigned(&args, "parameterIndex")?;
            let actual = native
                .state
                .lock()
                .map_err(|_| "native QC state lock was poisoned".to_string())?
                .block_details(row, column)
                .and_then(|details| {
                    details
                        .parameters
                        .into_iter()
                        .find(|parameter| parameter.index == parameter_index)
                        .and_then(|parameter| parameter.normalized_value)
                });
            assert_expected_parameter(actual, &args)?;
        }
        let state = native
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?;
        let snapshot = state.snapshot();
        let (detail, verification, write) = match method.as_str() {
            "device.recallPreset" | "device.navigateBank" | "device.reloadPreset" => {
                let plan = plan_preset_recall(&method, &args, Some(snapshot))?;
                (
                    plan.detail.clone(),
                    plan.verification(),
                    PlannedWrite::HidCommand(plan.command),
                )
            }
            _ => {
                let plan = plan_gateway_write(&method, &args, Some(snapshot))?;
                (plan.detail, plan.verification, plan.write)
            }
        };
        gateway_write_envelope(
            &method,
            &detail,
            &verification,
            gateway_write_is_realtime(&method),
            &gateway_write_verification_policy(&method),
            write,
        )
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativePlanGatewayWorkflow(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    method: JString,
    args_json: JString,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let method = env
            .get_string(&method)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let args_json = env
            .get_string(&args_json)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let args: Value = serde_json::from_str(&args_json).map_err(|error| error.to_string())?;
        let state = native
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?;
        let plan = plan_preset_mutation(
            &method,
            &args,
            Some(state.snapshot()),
            state.preset_library(),
        )?;
        gateway_workflow_envelope(plan)
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativePlanGatewayRead(
    mut env: JNIEnv,
    _class: JClass,
    method: JString,
    args_json: JString,
    request_id: jlong,
) -> jstring {
    let result = (|| {
        let method = env
            .get_string(&method)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let args_json = env
            .get_string(&args_json)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let args: Value = serde_json::from_str(&args_json).map_err(|error| error.to_string())?;
        let request_id =
            u64::try_from(request_id).map_err(|_| "request id must be non-negative".to_string())?;
        gateway_read_envelope(&method, plan_gateway_read(&method, &args, request_id)?)
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeDecodeGatewayResponse(
    mut env: JNIEnv,
    _class: JClass,
    projection_json: JString,
    payload: JByteArray,
) -> jstring {
    let result = (|| {
        let projection_json = env
            .get_string(&projection_json)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let projection: GatewayResponseProjection =
            serde_json::from_str(&projection_json).map_err(|error| error.to_string())?;
        let payload = env
            .convert_byte_array(payload)
            .map_err(|error| error.to_string())?;
        let value = projection.decode(&payload)?;
        serde_json::to_string(&value).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeGatewayResponseMatches(
    mut env: JNIEnv,
    _class: JClass,
    projection_json: JString,
    expected_type: jint,
    actual_type: jint,
    payload: JByteArray,
) -> jint {
    let result = (|| {
        let projection_json = env
            .get_string(&projection_json)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let projection: GatewayResponseProjection =
            serde_json::from_str(&projection_json).map_err(|error| error.to_string())?;
        let expected_type = u16::try_from(expected_type)
            .map_err(|_| "invalid expected QC message type".to_string())?;
        let actual_type =
            u16::try_from(actual_type).map_err(|_| "invalid actual QC message type".to_string())?;
        let payload = env
            .convert_byte_array(payload)
            .map_err(|error| error.to_string())?;
        Ok::<_, String>(
            ResponseExpectation::new(expected_type, projection.expected_request_id(), 0, u64::MAX)
                .matches(actual_type, &payload),
        )
    })();
    match result {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(error) => {
            let _ = env.throw_new("java/lang/IllegalArgumentException", error);
            0
        }
    }
}

/// 0 = pending, 1 = verified, 2 = timed out. Freshness, matching, and timeout
/// are evaluated by the same runtime used by the Windows broker.
#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeGatewayTransactionState(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    verification_json: JString,
    after_sequence: jlong,
    deadline_ms: jlong,
    observation_sequence: jlong,
    now_ms: jlong,
) -> jint {
    let result = (|| {
        let native = handle(value)?;
        let verification_json = env
            .get_string(&verification_json)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let verification: GatewayVerification =
            serde_json::from_str(&verification_json).map_err(|error| error.to_string())?;
        let state = native
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?;
        let parameter =
            if let Some((row, column, parameter_index)) = verification.parameter_target() {
                let details = match column {
                    10 => state.lane_control_details(row, "inputGate"),
                    11 => state.lane_control_details(row, "laneOutput"),
                    _ => state.block_details(row, column),
                };
                details.and_then(|details| {
                    details
                        .parameters
                        .into_iter()
                        .find(|parameter| parameter.index == parameter_index)
                })
            } else {
                None
            };
        let transaction = GatewayTransaction::new(
            verification,
            after_sequence.max(0) as u128,
            0,
            deadline_ms.max(0) as u64,
        );
        Ok::<_, String>(transaction.state(
            state.snapshot(),
            parameter.as_ref(),
            observation_sequence.max(0) as u128,
            now_ms.max(0) as u64,
        ))
    })();
    match result {
        Ok(GatewayTransactionState::Pending) => 0,
        Ok(GatewayTransactionState::Verified) => 1,
        Ok(GatewayTransactionState::TimedOut) => 2,
        Err(error) => {
            let _ = env.throw_new("java/lang/IllegalStateException", error);
            2
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeGatewayVerificationStarted(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    verification_json: JString,
    policy_method: JString,
    after_sequence: jlong,
    started_at_ms: jlong,
    timeout_ms: jlong,
) -> jlong {
    let result = (|| {
        let native = handle(value)?;
        let verification: GatewayVerification = serde_json::from_str(
            &env.get_string(&verification_json)
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
        )
        .map_err(|error| error.to_string())?;
        let method = env
            .get_string(&policy_method)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let policy = if method.is_empty() {
            gateway_verification_policy(timeout_ms.max(0) as u64, 0)
        } else {
            gateway_write_verification_policy(&method)
        };
        let verification_id = next_gateway_verification_id();
        native
            .gateway_verifications
            .lock()
            .map_err(|_| "native gateway verification registry lock was poisoned".to_string())?
            .insert(
                verification_id,
                GatewayVerificationRuntime::new(
                    verification,
                    after_sequence.max(0) as u128,
                    started_at_ms.max(0) as u64,
                    &policy,
                ),
            );
        Ok::<_, String>(verification_id as jlong)
    })();
    match result {
        Ok(verification_id) => verification_id,
        Err(error) => {
            let _ = env.throw_new("java/lang/IllegalStateException", error);
            0
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeGatewayVerificationAdvance(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    verification_id: jlong,
    observation_sequence: jlong,
    now_ms: jlong,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let verification_id = u64::try_from(verification_id)
            .ok()
            .filter(|value| *value > 0)
            .ok_or_else(|| "native gateway verification id is invalid".to_string())?;
        let mut verifications = native
            .gateway_verifications
            .lock()
            .map_err(|_| "native gateway verification registry lock was poisoned".to_string())?;
        let runtime = verifications
            .get_mut(&verification_id)
            .ok_or_else(|| "native gateway verification is no longer active".to_string())?;
        let state = native
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?;
        let parameter = runtime
            .parameter_target()
            .and_then(|(row, column, parameter_index)| {
                let details = match column {
                    10 => state.lane_control_details(row, "inputGate"),
                    11 => state.lane_control_details(row, "laneOutput"),
                    _ => state.block_details(row, column),
                };
                details.and_then(|details| {
                    details
                        .parameters
                        .into_iter()
                        .find(|parameter| parameter.index == parameter_index)
                })
            });
        let action = runtime.advance(
            Some(state.snapshot()),
            parameter.as_ref(),
            observation_sequence.max(0) as u128,
            now_ms.max(0) as u64,
        );
        drop(state);
        if matches!(
            action,
            GatewayVerificationAction::Verified | GatewayVerificationAction::TimedOut
        ) {
            verifications.remove(&verification_id);
        }
        let value = match action {
            GatewayVerificationAction::Wait { delay_ms } => {
                serde_json::json!({"kind": "wait", "delayMs": delay_ms})
            }
            GatewayVerificationAction::Refresh { method } => {
                serde_json::json!({"kind": "refresh", "method": method})
            }
            GatewayVerificationAction::Verified => serde_json::json!({"kind": "verified"}),
            GatewayVerificationAction::TimedOut => serde_json::json!({"kind": "timedOut"}),
        };
        serde_json::to_string(&value).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeGatewayVerificationCancelled(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    verification_id: jlong,
) {
    let Ok(native) = handle(value) else {
        return;
    };
    if let Ok(mut verifications) = native.gateway_verifications.lock() {
        verifications.remove(&(verification_id.max(0) as u64));
    };
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeGatewayReadbackMatches(
    mut env: JNIEnv,
    _class: JClass,
    method: JString,
    params_json: JString,
    response_json: JString,
) -> jint {
    let result = (|| {
        let method = env
            .get_string(&method)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let params: Value = serde_json::from_str(
            &env.get_string(&params_json)
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
        )
        .map_err(|error| error.to_string())?;
        let response: Value = serde_json::from_str(
            &env.get_string(&response_json)
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
        )
        .map_err(|error| error.to_string())?;
        Ok::<_, String>(qc_device_runtime::request::gateway_write_readback_matches(
            &method, &params, &response,
        ))
    })();
    match result {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(error) => {
            let _ = env.throw_new("java/lang/IllegalArgumentException", error);
            0
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeComposeGlobalTempoSettings(
    mut env: JNIEnv,
    _class: JClass,
    global_json: JString,
    preset_json: JString,
) -> jstring {
    let result = (|| {
        let global: Value = serde_json::from_str(
            &env.get_string(&global_json)
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
        )
        .map_err(|error| error.to_string())?;
        let preset: Value = serde_json::from_str(
            &env.get_string(&preset_json)
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
        )
        .map_err(|error| error.to_string())?;
        serde_json::to_string(&compose_global_tempo_settings(&global, &preset)?)
            .map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeGatewayWritePreflightMatches(
    mut env: JNIEnv,
    _class: JClass,
    method: JString,
    params_json: JString,
    response_json: JString,
) -> jint {
    let result = (|| {
        let method = env
            .get_string(&method)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let params: Value = serde_json::from_str(
            &env.get_string(&params_json)
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
        )
        .map_err(|error| error.to_string())?;
        let response: Value = serde_json::from_str(
            &env.get_string(&response_json)
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
        )
        .map_err(|error| error.to_string())?;
        Ok::<_, String>(gateway_write_preflight_matches(&method, &params, &response))
    })();
    match result {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(error) => {
            let _ = env.throw_new("java/lang/IllegalArgumentException", error);
            0
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeEncodeFrame(
    mut env: JNIEnv,
    _class: JClass,
    message_type: jint,
    payload: JByteArray,
) -> jbyteArray {
    let result = (|| {
        let message_type =
            u16::try_from(message_type).map_err(|_| "invalid QC message type".to_string())?;
        let payload = env
            .convert_byte_array(payload)
            .map_err(|error| error.to_string())?;
        let message = OutboundMessage {
            message_type,
            payload,
        };
        Ok(
            TransportRuntime::encode_reports(&message, ReportLayout::ReportIdPrefixed)
                .into_iter()
                .flatten()
                .collect(),
        )
    })();
    bytes_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativePushReport(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    report: JByteArray,
) -> jbyteArray {
    // A malformed or truncated native USB read must never unwind across JNI,
    // which would abort the entire Android process. Convert any unexpected
    // decoder panic into the same Java-side error path as a frame error.
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let report = env
            .convert_byte_array(report)
            .map_err(|error| error.to_string())?;
        let Some(frame) = handle(value)?
            .transport
            .lock()
            .map_err(|_| "native QC transport lock was poisoned".to_string())?
            .push_report(&report)
            .map_err(|error| format!("invalid QC frame: {error}"))?
        else {
            return Ok(Vec::new());
        };
        let mut result = Vec::with_capacity(frame.payload.len() + 2);
        result.extend_from_slice(&frame.message_type.to_le_bytes());
        result.extend_from_slice(&frame.payload);
        Ok(result)
    }))
    .unwrap_or_else(|_| Err("native QC report decoder panicked".to_string()));
    bytes_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeReportSize(
    _env: JNIEnv,
    _class: JClass,
) -> jint {
    framing::REPORT_SIZE as jint
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeOutboundReportId(
    _env: JNIEnv,
    _class: JClass,
) -> jint {
    framing::OUT_REPORT_ID as jint
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeInboundReportId(
    _env: JNIEnv,
    _class: JClass,
) -> jint {
    framing::IN_REPORT_ID as jint
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeCreate(
    _env: JNIEnv,
    _class: JClass,
) -> jlong {
    register_handle()
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeTempoClock(
    mut env: JNIEnv,
    _class: JClass,
    payload: JByteArray,
) -> jstring {
    let result = (|| {
        let bytes = env
            .convert_byte_array(payload)
            .map_err(|error| error.to_string())?;
        serde_json::to_string(&decode_tempo_clock(&bytes).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeConsumeBackupChunk(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    payload: JByteArray,
    name: JString,
    now_ms: jlong,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let bytes = env
            .convert_byte_array(payload)
            .map_err(|error| error.to_string())?;
        let name = env
            .get_string(&name)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let progress = native
            .backup
            .lock()
            .map_err(|_| "native QC backup lock was poisoned".to_string())?
            .as_mut()
            .ok_or_else(|| "no native QC backup transfer is active".to_string())?
            .absorb(now_ms.max(0) as u64, &bytes)?;
        let backup = progress
            .document
            .map(|raw| finalize_device_backup(&raw, &name))
            .transpose()?;
        serde_json::to_string(&serde_json::json!({
            "complete": backup.is_some(),
            "backup": backup,
            "started": progress.started,
            "chunks": progress.chunks,
            "ignoredPrefixChunks": progress.ignored_prefix_chunks,
            "ignoredPrefixTerminators": progress.ignored_prefix_terminators,
        }))
        .map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeBackupStarted(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
    timeout_ms: jlong,
) {
    let result = (|| {
        let native = handle(value)?;
        let mut backup = native
            .backup
            .lock()
            .map_err(|_| "native QC backup lock was poisoned".to_string())?;
        *backup = Some(BackupRuntime::start(
            now_ms.max(0) as u64,
            timeout_ms.max(0) as u64,
        ));
        Ok::<_, String>(())
    })();
    if let Err(error) = result {
        let _ = env.throw_new("java/lang/IllegalStateException", error);
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeBackupAdvance(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let mut backup = native
            .backup
            .lock()
            .map_err(|_| "native QC backup lock was poisoned".to_string())?;
        let runtime = backup
            .as_mut()
            .ok_or_else(|| "no native QC backup transfer is active".to_string())?;
        let action = runtime.advance(now_ms.max(0) as u64);
        let (kind, error) = match action {
            BackupAction::Wait => ("wait", None),
            BackupAction::Keepalive => ("keepalive", None),
            BackupAction::Rerequest => ("rerequest", None),
            BackupAction::Failed(error) => ("failed", Some(error)),
        };
        serde_json::to_string(&serde_json::json!({
            "action": kind,
            "error": error,
            "attempts": runtime.attempts(),
            "started": runtime.started(),
        }))
        .map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeBackupCancelled(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
) {
    let result = (|| {
        let native = handle(value)?;
        *native
            .backup
            .lock()
            .map_err(|_| "native QC backup lock was poisoned".to_string())? = None;
        Ok::<_, String>(())
    })();
    if let Err(error) = result {
        let _ = env.throw_new("java/lang/IllegalStateException", error);
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeHandshakeAttempt(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
    session_id: JString,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let session_id = env
            .get_string(&session_id)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        if session_id.is_empty() {
            return Err("startup session id must not be empty".to_string());
        }
        let now_ms = now_ms.max(0) as u64;
        let mut transport = native
            .transport
            .lock()
            .map_err(|_| "native QC transport lock was poisoned".to_string())?;
        if transport.handshake_timed_out(now_ms) {
            return serde_json::to_string(&serde_json::json!({ "kind": 2 }))
                .map_err(|error| error.to_string());
        }
        let Some(write) = transport.next_handshake_write(now_ms, session_id) else {
            return serde_json::to_string(&serde_json::json!({ "kind": 0 }))
                .map_err(|error| error.to_string());
        };
        let request_id = write.request_id();
        let (runtime, _) = DeviceStartupRuntime::start(request_id, write.session_id());
        let phase = runtime.phase();
        *native
            .startup
            .lock()
            .map_err(|_| "native QC startup lock was poisoned".to_string())? = Some(runtime);
        *native
            .initialization
            .lock()
            .map_err(|_| "native QC initialization lock was poisoned".to_string())? = None;
        let startup: Value = serde_json::from_str(&startup_envelope(
            phase,
            DeviceStartupAction::Send(vec![write.message]),
        )?)
        .map_err(|error| error.to_string())?;
        serde_json::to_string(&serde_json::json!({
            "kind": 1,
            "attempt": write.attempt,
            "requestId": request_id,
            "includeReportId": write.layout == ReportLayout::ReportIdPrefixed,
            "startup": startup,
        }))
        .map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeStartupObserved(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    message_type: jint,
    payload: JByteArray,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let message_type = u16::try_from(message_type)
            .map_err(|_| "invalid QC startup message type".to_string())?;
        let payload = env
            .convert_byte_array(payload)
            .map_err(|error| error.to_string())?;
        let mut startup = native
            .startup
            .lock()
            .map_err(|_| "native QC startup lock was poisoned".to_string())?;
        let runtime = startup
            .as_mut()
            .ok_or_else(|| "no native QC startup is active".to_string())?;
        let action = runtime.observe(message_type, &payload);
        startup_envelope(runtime.phase(), action)
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeStartupBeginBuilding(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let mut startup = native
            .startup
            .lock()
            .map_err(|_| "native QC startup lock was poisoned".to_string())?;
        let runtime = startup
            .as_mut()
            .ok_or_else(|| "no native QC startup is active".to_string())?;
        let action = runtime.begin_building();
        startup_envelope(runtime.phase(), action)
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeStartupConnected(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
) -> jint {
    handle(value)
        .ok()
        .and_then(|native| {
            native
                .startup
                .lock()
                .ok()
                .and_then(|startup| startup.as_ref().map(|runtime| runtime.phase()))
        })
        .is_some_and(startup_phase_is_connected) as jint
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeNextRequestId(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
) -> jlong {
    let result = (|| {
        let native = handle(value)?;
        let request_id = native
            .startup
            .lock()
            .map_err(|_| "native QC startup lock was poisoned".to_string())?
            .as_mut()
            .ok_or_else(|| "no native QC session is active".to_string())?
            .reserve_request_id();
        i64::try_from(request_id).map_err(|_| "QC request id exceeds the JNI range".to_string())
    })();
    match result {
        Ok(request_id) => request_id,
        Err(error) => {
            let _ = env.throw_new("java/lang/IllegalStateException", error);
            0
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativePostBootInitializationStarted(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) {
    let result = (|| {
        let native = handle(value)?;
        let initialization = native
            .startup
            .lock()
            .map_err(|_| "native QC startup lock was poisoned".to_string())?
            .as_mut()
            .ok_or_else(|| "no native QC startup is active".to_string())?
            .post_boot_initialization(now_ms.max(0) as u64)
            .map_err(|error| format!("post-boot initialization rejected: {error:?}"))?;
        *native
            .initialization
            .lock()
            .map_err(|_| "native QC initialization lock was poisoned".to_string())? =
            Some(initialization);
        Ok::<_, String>(())
    })();
    if let Err(error) = result {
        let _ = env.throw_new("java/lang/IllegalStateException", error);
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeInitializationObserved(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    message_type: jint,
    payload: JByteArray,
) {
    let result = (|| {
        let native = handle(value)?;
        let message_type = u16::try_from(message_type)
            .map_err(|_| "invalid QC initialization message type".to_string())?;
        let mut initialization = native
            .initialization
            .lock()
            .map_err(|_| "native QC initialization lock was poisoned".to_string())?;
        let Some(runtime) = initialization.as_mut() else {
            return Ok::<_, String>(());
        };
        let payload = env
            .convert_byte_array(payload)
            .map_err(|error| error.to_string())?;
        runtime.observe_message(message_type, &payload);
        Ok::<_, String>(())
    })();
    if let Err(error) = result {
        let _ = env.throw_new("java/lang/IllegalStateException", error);
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeInitializationAdvance(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let mut initialization = native
            .initialization
            .lock()
            .map_err(|_| "native QC initialization lock was poisoned".to_string())?;
        let action = initialization
            .as_mut()
            .map(|runtime| runtime.advance(now_ms.max(0) as u64))
            .unwrap_or(InitializationAction::Wait);
        if matches!(action, InitializationAction::Complete { .. }) {
            *initialization = None;
        }
        initialization_envelope(action)
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeCatalogVerificationStarted(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    verification_id: jlong,
    now_ms: jlong,
) {
    let result = (|| {
        let native = handle(value)?;
        native
            .catalog_verifications
            .lock()
            .map_err(|_| "native QC catalog verification lock was poisoned".to_string())?
            .insert(
                catalog_verification_key(verification_id)?,
                CatalogVerificationRuntime::new(now_ms.max(0) as u64),
            );
        Ok::<_, String>(())
    })();
    if let Err(error) = result {
        let _ = env.throw_new("java/lang/IllegalStateException", error);
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeCatalogVerificationAdvance(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    verification_id: jlong,
    now_ms: jlong,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let key = catalog_verification_key(verification_id)?;
        let mut verifications = native
            .catalog_verifications
            .lock()
            .map_err(|_| "native QC catalog verification lock was poisoned".to_string())?;
        let runtime = verifications
            .get_mut(&key)
            .ok_or_else(|| "native QC catalog verification is not active".to_string())?;
        let value = match runtime.take_action(now_ms.max(0) as u64) {
            CatalogVerificationAction::Request => serde_json::json!({ "action": "request" }),
            CatalogVerificationAction::Wait { delay_ms } => {
                serde_json::json!({ "action": "wait", "delayMs": delay_ms })
            }
            CatalogVerificationAction::Complete => serde_json::json!({ "action": "complete" }),
            CatalogVerificationAction::Failed { matching_listings } => serde_json::json!({
                "action": "failed",
                "matchingListings": matching_listings,
                "message": runtime.failure_message("preset catalog"),
            }),
        };
        serde_json::to_string(&value).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeCatalogListingObserved(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    verification_id: jlong,
    now_ms: jlong,
    matches: jint,
) {
    let result = (|| {
        let native = handle(value)?;
        let key = catalog_verification_key(verification_id)?;
        native
            .catalog_verifications
            .lock()
            .map_err(|_| "native QC catalog verification lock was poisoned".to_string())?
            .get_mut(&key)
            .ok_or_else(|| "native QC catalog verification is not active".to_string())?
            .listing_observed(now_ms.max(0) as u64, matches != 0);
        Ok::<_, String>(())
    })();
    if let Err(error) = result {
        let _ = env.throw_new("java/lang/IllegalStateException", error);
    }
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeCatalogVerificationCancelled(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    verification_id: jlong,
) {
    let result = (|| {
        let native = handle(value)?;
        native
            .catalog_verifications
            .lock()
            .map_err(|_| "native QC catalog verification lock was poisoned".to_string())?
            .remove(&catalog_verification_key(verification_id)?);
        Ok::<_, String>(())
    })();
    if let Err(error) = result {
        let _ = env.throw_new("java/lang/IllegalStateException", error);
    }
}

fn with_transport(value: jlong, action: impl FnOnce(&mut TransportRuntime) -> jint) -> jint {
    let Ok(handle) = handle(value) else {
        return -3;
    };
    handle
        .transport
        .lock()
        .map(|mut transport| action(&mut transport))
        .unwrap_or(-3)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSessionOpened(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) {
    let _ = with_transport(value, |transport| {
        transport.transport_opened(now_ms.max(0) as u64);
        0
    });
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSessionHandshakeComplete(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
    synchronized_state: jint,
) {
    let _ = with_transport(value, |transport| {
        transport.handshake_completed(now_ms.max(0) as u64, synchronized_state != 0);
        0
    });
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSessionStateObserved(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
    preset_synchronized: jint,
) {
    let _ = with_transport(value, |transport| {
        transport.state_observed(now_ms.max(0) as u64, preset_synchronized != 0);
        0
    });
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSessionShouldKeepalive(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) -> jint {
    with_transport(value, |transport| {
        transport.keepalive_due(now_ms.max(0) as u64) as jint
    })
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSessionKeepaliveSent(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) {
    let _ = with_transport(value, |transport| {
        transport.keepalive_sent(now_ms.max(0) as u64);
        0
    });
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSessionOutbound(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) {
    let _ = with_transport(value, |transport| {
        transport.outbound(now_ms.max(0) as u64);
        0
    });
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSessionDisconnected(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) {
    let _ = with_transport(value, |transport| {
        transport.disconnect(now_ms.max(0) as u64, false);
        0
    });
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSessionScheduleReconnect(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) -> jlong {
    with_transport(value, |transport| {
        transport.schedule_reconnect(now_ms.max(0) as u64) as jint
    }) as jlong
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSessionReconnectDue(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) -> jint {
    with_transport(value, |transport| {
        transport.reconnect_due(now_ms.max(0) as u64) as jint
    })
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSessionReconnectAttempted(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
    now_ms: jlong,
) {
    let _ = with_transport(value, |transport| {
        transport.reconnect_attempted(now_ms.max(0) as u64);
        0
    });
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeReset(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
) {
    let Ok(handle) = handle(value) else {
        let _ = env.throw_new(
            "java/lang/IllegalStateException",
            "native QC decoder handle is closed",
        );
        return;
    };
    match handle.state.lock() {
        Ok(mut decoder) => decoder.reset(),
        Err(_) => {
            let _ = env.throw_new(
                "java/lang/IllegalStateException",
                "native QC decoder lock was poisoned",
            );
        }
    }
    // The host reports transport closure separately. Do not erase the shared
    // reconnect/disconnect decision while clearing decoded device state.
    if let Ok(mut backup) = handle.backup.lock() {
        *backup = None;
    };
    if let Ok(mut startup) = handle.startup.lock() {
        *startup = None;
    };
    if let Ok(mut initialization) = handle.initialization.lock() {
        *initialization = None;
    };
    if let Ok(mut verifications) = handle.catalog_verifications.lock() {
        verifications.clear();
    };
    if let Ok(mut verifications) = handle.gateway_verifications.lock() {
        verifications.clear();
    };
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeDestroy(
    _env: JNIEnv,
    _class: JClass,
    value: jlong,
) {
    unregister_handle(value);
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeDecode(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    message_type: i32,
    payload: JByteArray,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let bytes = env
            .convert_byte_array(payload)
            .map_err(|error| error.to_string())?;
        let observation = native
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?
            .ingest(
                u16::try_from(message_type).map_err(|_| "invalid QC message type".to_string())?,
                &bytes,
            )?;
        serde_json::to_string(&observation.states).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeInstallModelRepo(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    payload: JByteArray,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        // Parsing intentionally happens before the decoder lock. Hot state can
        // continue to flow while the metadata executor expands the catalog.
        let bytes = env
            .convert_byte_array(payload)
            .map_err(|error| error.to_string())?;
        let catalog = parse_model_repo(&bytes).map_err(|error| error.to_string())?;
        let states = native
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?
            .install_model_catalog(catalog);
        serde_json::to_string(&states).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeSnapshot(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let state = native
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?;
        serde_json::to_string(state.snapshot()).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeBlockDetails(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    row: i32,
    column: i32,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let decoder = native
            .state
            .lock()
            .map_err(|_| "native QC decoder lock was poisoned".to_string())?;
        let details = decoder
            .block_details(
                u32::try_from(row).map_err(|_| "invalid row".to_string())?,
                u32::try_from(column).map_err(|_| "invalid column".to_string())?,
            )
            .ok_or_else(|| "There is no block in that Grid position.".to_string())?;
        serde_json::to_string(&details).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeLaneControlDetails(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    row: i32,
    control: JString,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let control = String::from(
            env.get_string(&control)
                .map_err(|error| error.to_string())?,
        );
        let decoder = native
            .state
            .lock()
            .map_err(|_| "native QC decoder lock was poisoned".to_string())?;
        let details = decoder
            .lane_control_details(
                u32::try_from(row).map_err(|_| "invalid row".to_string())?,
                &control,
            )
            .ok_or_else(|| "There is no matching lane control on that row.".to_string())?;
        serde_json::to_string(&details).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeModelCount(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
) -> jint {
    let Ok(native) = handle(value) else {
        let _ = env.throw_new(
            "java/lang/IllegalStateException",
            "native QC decoder handle is closed",
        );
        return 0;
    };
    let result = match native.state.lock() {
        Ok(decoder) => decoder.model_count().min(i32::MAX as usize) as jint,
        Err(_) => {
            let _ = env.throw_new(
                "java/lang/IllegalStateException",
                "native QC decoder lock was poisoned",
            );
            0
        }
    };
    result
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativeModelList(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let decoder = native
            .state
            .lock()
            .map_err(|_| "native QC decoder lock was poisoned".to_string())?;
        serde_json::to_string(&decoder.model_list()).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativePresetFolders(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let state = native
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?;
        serde_json::to_string(&serde_json::json!({"folders": state.preset_folders()}))
            .map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativePresetList(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
    setlist_key: JString,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let key = env
            .get_string(&setlist_key)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let state = native
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?;
        let list = state
            .preset_list(&key)
            .ok_or_else(|| format!("No preset listing is available for {key:?}"))?;
        serde_json::to_string(&list).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[no_mangle]
pub extern "system" fn Java_com_qccontrol_mobile_QcNativeStateDecoder_nativePresetSlots(
    mut env: JNIEnv,
    _class: JClass,
    value: jlong,
) -> jstring {
    let result = (|| {
        let native = handle(value)?;
        let state = native
            .state
            .lock()
            .map_err(|_| "native QC state runtime lock was poisoned".to_string())?;
        let slots = state
            .preset_slots()?
            .ok_or_else(|| "The active preset slots are not loaded".to_string())?;
        serde_json::to_string(&slots).map_err(|error| error.to_string())
    })();
    json_result(&mut env, result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registered_handles_make_destroy_idempotent_and_keep_in_flight_calls_alive() {
        let value = register_handle();
        assert!(value > 0);
        let in_flight = handle(value).expect("registered handle");

        unregister_handle(value);
        unregister_handle(value);

        assert!(handle(value).is_err());
        assert_eq!(
            in_flight.state.lock().expect("decoder lock").model_count(),
            0
        );
    }

    #[test]
    fn invalid_handles_are_rejected_without_dereferencing_foreign_memory() {
        assert!(handle(0).is_err());
        assert!(handle(-1).is_err());
        assert!(handle(i64::MAX).is_err());
    }

    #[test]
    fn startup_envelope_preserves_phase_messages_and_typed_failures() {
        let sent = startup_envelope(
            DeviceStartupPhase::VersionValidating,
            DeviceStartupAction::Send(vec![commands::read_version()]),
        )
        .expect("startup send envelope");
        let sent: Value = serde_json::from_str(&sent).expect("startup send JSON");
        assert_eq!(sent["kind"], 1);
        assert_eq!(sent["phase"], "versionValidating");
        assert_eq!(sent["beginBuilding"], false);
        assert_eq!(sent["error"], Value::Null);
        assert_eq!(sent["messages"][0]["messageType"], 10);

        let disconnected = startup_envelope(
            DeviceStartupPhase::Disconnected,
            DeviceStartupAction::SendThenBuild(commands::disconnect_initialization_exact(8)),
        )
        .expect("disconnected startup envelope");
        let disconnected: Value =
            serde_json::from_str(&disconnected).expect("disconnected startup JSON");
        assert_eq!(disconnected["beginBuilding"], true);

        let failed = startup_envelope(
            DeviceStartupPhase::Invalid,
            DeviceStartupAction::Invalid(
                qc_device_runtime::initialization::DeviceStartupError::SessionMismatch,
            ),
        )
        .expect("startup failure envelope");
        let failed: Value = serde_json::from_str(&failed).expect("startup failure JSON");
        assert_eq!(failed["kind"], 3);
        assert_eq!(failed["phase"], "invalid");
        assert_eq!(failed["error"], "SessionMismatch");
        assert_eq!(failed["messages"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn android_public_readiness_requires_the_updater_connected_gate() {
        for phase in [
            DeviceStartupPhase::SessionValidating,
            DeviceStartupPhase::VersionValidating,
            DeviceStartupPhase::Disconnected,
            DeviceStartupPhase::Building,
            DeviceStartupPhase::Initializing,
            DeviceStartupPhase::Booting,
            DeviceStartupPhase::Invalid,
            DeviceStartupPhase::Failed,
        ] {
            assert!(!startup_phase_is_connected(phase), "phase {phase:?}");
        }
        assert!(startup_phase_is_connected(DeviceStartupPhase::Connected));
    }

    #[test]
    fn gateway_write_envelope_exposes_shared_realtime_completion_policy() {
        let detail = "Scene A sent";
        let envelope = gateway_write_envelope(
            "device.selectScene",
            detail,
            &GatewayVerification::Scene { scene: 0 },
            true,
            &gateway_write_verification_policy("device.selectScene"),
            PlannedWrite::MidiControlChange {
                controller: 35,
                value: 127,
            },
        )
        .expect("gateway envelope");
        let envelope: Value = serde_json::from_str(&envelope).expect("JSON gateway envelope");
        assert_eq!(envelope["detail"], detail);
        assert_eq!(envelope["lane"], "midi");
        assert_eq!(envelope["controller"], 35);
        assert_eq!(envelope["value"], 127);
        assert_eq!(envelope["realtime"], true);
        assert_eq!(envelope["interMessageIntervalMs"], 0);
        assert_eq!(envelope["postWriteRefreshMethod"], Value::Null);
        assert_eq!(envelope["postWriteRefreshDelayMs"], 0);
        assert_eq!(
            envelope["confirmationTimeoutMs"],
            qc_protocol::profile::COMMAND_CONFIRMATION_TIMEOUT_MS
        );
        assert_eq!(envelope["messages"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn gateway_write_envelope_exposes_shared_remote_gesture_pacing() {
        let envelope = gateway_write_envelope(
            "device.swipeScreen",
            "Screen swipe sent",
            &GatewayVerification::None,
            false,
            &gateway_write_verification_policy("device.swipeScreen"),
            PlannedWrite::HidOperation(qc_protocol::commands::DeviceOperation::ScreenDrag {
                x: 10.0,
                y: 20.0,
                to_x: 30.0,
                to_y: 40.0,
            }),
        )
        .expect("gateway envelope");
        let envelope: Value = serde_json::from_str(&envelope).expect("JSON gateway envelope");
        assert_eq!(envelope["lane"], "hid");
        assert_eq!(
            envelope["interMessageIntervalMs"],
            qc_protocol::profile::REMOTE_GESTURE_INTERVAL_MS
        );
        assert!(envelope["messages"].as_array().unwrap().len() > 1);
    }

    #[test]
    fn gateway_write_envelope_exposes_shared_history_refresh_policy() {
        let envelope = gateway_write_envelope(
            "device.undo",
            "Device undo sent",
            &GatewayVerification::None,
            false,
            &gateway_write_verification_policy("device.undo"),
            PlannedWrite::HidOperation(qc_protocol::commands::DeviceOperation::Undo),
        )
        .expect("gateway envelope");
        let envelope: Value = serde_json::from_str(&envelope).expect("JSON gateway envelope");
        assert_eq!(envelope["postWriteRefreshMethod"], "device.currentPreset");
        assert_eq!(
            envelope["postWriteRefreshDelayMs"],
            qc_protocol::profile::HISTORY_STATE_REFRESH_DELAY_MS
        );
    }
}
