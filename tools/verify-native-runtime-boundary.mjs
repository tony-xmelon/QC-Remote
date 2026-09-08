import { readFile, readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

async function text(relativePath) {
  return readFile(join(root, relativePath), "utf8");
}

async function files(relativePath) {
  const directory = join(root, relativePath);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const child = join(relativePath, entry.name);
    return entry.isDirectory() ? files(child) : [child];
  }));
  return nested.flat();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function rejectPatterns(relativePaths, patterns) {
  for (const relativePath of relativePaths) {
    const source = await text(relativePath);
    for (const [label, pattern] of patterns) {
      assert(!pattern.test(source), `${relativePath} contains forbidden ${label}`);
    }
  }
}

const tauri = JSON.parse(await text("apps/windows/src-tauri/tauri.conf.json"));
const externalBins = tauri.bundle?.externalBin ?? [];
assert(
  externalBins.some((entry) => basename(entry) === "qc-device-broker"),
  "The Windows bundle must include the native qc-device-broker sidecar.",
);
assert(
  externalBins.every((entry) => !/(?:python|pyquadcortex|qc-device-gateway)/i.test(entry)),
  "The Windows bundle must not include a Python or legacy device-gateway sidecar.",
);

const windowsRust = (await files("apps/windows/src-tauri/src"))
  .filter((path) => extname(path) === ".rs");
await rejectPatterns(
  ["apps/windows/src-tauri/Cargo.toml", "apps/windows/src-tauri/tauri.conf.json", ...windowsRust],
  [
    ["pyquadcortex runtime reference", /pyquadcortex/i],
    ["legacy Python gateway selection", /QC_GATEWAY_RUNTIME/i],
    ["legacy device gateway executable", /qc-device-gateway/i],
    ["embedded Python dependency", /(?:pyo3|pythonize|rustpython)/i],
    ["Python process launch", /Command::new\s*\(\s*["'](?:python|python3|py)(?:\.exe)?["']/i],
  ],
);

const androidMain = await files("apps/android/android/app/src/main");
assert(
  androidMain.every((path) => extname(path).toLowerCase() !== ".py"),
  "The Android application source set must not package Python modules.",
);
await rejectPatterns(
  ["apps/android/android/app/build.gradle", ...androidMain.filter((path) => /\.(?:java|kt|xml)$/i.test(path))],
  [
    ["pyquadcortex runtime reference", /pyquadcortex/i],
    ["legacy Python gateway", /qc[_-]device[_-]gateway/i],
    ["Android Python runtime", /(?:chaquopy|com\.chaquo|org\.python|Python\.getInstance)/i],
  ],
);

const androidBuild = await text("apps/android/android/app/build.gradle");
for (const nativeComponent of ["qc-protocol", "qc-device-runtime", "qc-android"]) {
  assert(androidBuild.includes(nativeComponent), `Android build is missing native ${nativeComponent}.`);
}
assert(androidBuild.includes("buildSharedQcRust"), "Android must build its shared Rust runtime.");
assert(androidBuild.includes("libqc_android.so"), "Android must package the Rust JNI library.");

const usbProfile = JSON.parse(await text("contracts/qc-usb-profile.v1.json"));
assert(usbProfile.remoteGestureIntervalMs > 0, "The USB profile must own remote gesture pacing.");
assert(usbProfile.postInitializationWriteDelayMs >= 0, "The USB profile must own first-command stabilization timing.");
assert(usbProfile.presetLibrarySettlementQuietMs > 0, "The USB profile must own File-stream settlement timing.");
for (const field of [
  "commandVerificationRefreshDelaysMs",
  "presetVerificationRefreshDelaysMs",
  "correlatedWriteReadbackRetryIntervalsMs",
]) {
  assert(Array.isArray(usbProfile[field]) && usbProfile[field].length > 0,
    `The USB profile must own ${field}.`);
}

const transportRuntime = await text("packages/rust/qc-device-runtime/src/transport.rs");
for (const symbol of ["TransportRuntime", "next_handshake_write", "synchronization_completed", "take_keepalive", "encode_reports", "push_report", "normalize_inbound_report"]) {
  assert(transportRuntime.includes(symbol), `The shared native transport runtime is missing ${symbol}.`);
}
const backupRuntime = await text("packages/rust/qc-device-runtime/src/backup.rs");
for (const symbol of ["BackupRuntime", "BackupAction", "absorb", "advance"]) {
  assert(backupRuntime.includes(symbol), `The shared native backup runtime is missing ${symbol}.`);
}
const stateRuntime = await text("packages/rust/qc-device-runtime/src/state_runtime.rs");
for (const symbol of ["DeviceStateRuntime", "StateObservation", "install_model_catalog", "preset_library"]) {
  assert(stateRuntime.includes(symbol), `The shared native state runtime is missing ${symbol}.`);
}
const initializationRuntime = await text("packages/rust/qc-device-runtime/src/initialization.rs");
for (const symbol of [
  "DeviceStartupRuntime",
  "DeviceStartupAction",
  "DeviceStartupPhase",
  "InitializationRuntime",
  "InitializationAction",
  "REQUIRED_SEED_TYPES",
  "begin_building",
  "advance",
]) {
  assert(initializationRuntime.includes(symbol), `The shared native initialization runtime is missing ${symbol}.`);
}
assert(initializationRuntime.includes("self.synchronized && self.seed_complete()"),
  "Shared initialization readiness must require the full authoritative seed.");
assert(initializationRuntime.includes("deadline_ms: now_ms.saturating_add(profile::READY_WAIT_TIMEOUT_MS)")
  && initializationRuntime.includes("pub fn timed_out")
  && initializationRuntime.includes("pub fn is_active")
  && initializationRuntime.includes("pub fn is_connected")
  && initializationRuntime.includes("impl DeviceStartupPhase")
  && initializationRuntime.includes("impl DeviceStartupError"),
  "The shared staged startup runtime must own the generated readiness deadline.");
const correlationRuntime = await text("packages/rust/qc-device-runtime/src/correlation.rs");
for (const symbol of ["ResponseExpectation", "matches", "expired", "timeout_message"]) {
  assert(correlationRuntime.includes(symbol), `The shared native response-correlation runtime is missing ${symbol}.`);
}
const capabilityRuntime = await text("packages/rust/qc-device-runtime/src/capabilities.rs");
for (const symbol of ["RetailCapabilityState", "CapabilityEvidence", "SAFE_PROBES"]) {
  assert(capabilityRuntime.includes(symbol), `The shared native capability runtime is missing ${symbol}.`);
}
const transferRuntime = await text("packages/rust/qc-device-runtime/src/transfer.rs");
for (const symbol of ["ChunkTransferRuntime", "UpdaterTransferRuntime", "TransferIdentity", "NetworkExecutionDecision::Disabled"]) {
  assert(transferRuntime.includes(symbol), `The shared native transfer runtime is missing ${symbol}.`);
}
assert(!/(?:reqwest|ureq|hyper|TcpStream|HttpClient)/.test(transferRuntime),
  "The shared transfer state machine must not acquire a network execution client.");
const forwardProtocol = await text("packages/rust/qc-protocol/src/forward.rs");
for (const symbol of ["decode_product_forward_request", "decode_backups_forward_request", "decode_logs_forward_request", "decode_updater_forward_request"]) {
  assert(forwardProtocol.includes(symbol), `The shared forward protocol codec is missing ${symbol}.`);
}
const requestRuntime = await text("packages/rust/qc-device-runtime/src/request.rs");
for (const symbol of [
  "inter_message_interval_ms",
  "operation_inter_message_interval_ms",
  "gateway_write_verification_policy",
  "fn gateway_verification_refresh_delays",
]) {
  assert(requestRuntime.includes(symbol), `The shared native write planner is missing pacing policy ${symbol}.`);
}
assert(requestRuntime.includes('"device.tapScreen" | "device.swipeScreen" => Some("device.captureScreen")'),
  "Shared write policy must own the remote-screen gesture prerequisite.");
assert(requestRuntime.includes("gateway_read_followup_method"),
  "Shared read policy must own composite QC read dependencies.");
assert(requestRuntime.includes("gateway_verification_refresh_method"),
  "Shared write policy must own the authoritative verification refresh method.");
for (const hostPath of ["packages/rust/qc-android/src/lib.rs", "services/device-broker/src/worker.rs"]) {
  const source = await text(hostPath);
  assert(source.includes("DeviceStateRuntime"), `${hostPath} must use the shared atomic device-state runtime.`);
}
for (const hostPath of ["packages/rust/qc-android/src/lib.rs", "services/device-broker/src/usb.rs"]) {
  const source = await text(hostPath);
  assert(source.includes("DeviceStartupRuntime"), `${hostPath} must use the shared staged startup runtime.`);
}
for (const hostPath of ["packages/rust/qc-android/src/lib.rs", "services/device-broker/src/worker.rs"]) {
  const source = await text(hostPath);
  assert(source.includes("ResponseExpectation"), `${hostPath} must use shared response correlation.`);
}
const androidUsbHost = await text("apps/android/android/app/src/main/java/com/qccontrol/mobile/QcUsbPlugin.java");
const androidNativeFacade = await text("apps/android/android/app/src/main/java/com/qccontrol/mobile/QcNativeStateDecoder.java");
const androidJni = await text("packages/rust/qc-android/src/lib.rs");
const windowsUsbHost = await text("services/device-broker/src/usb.rs");
const windowsWorker = await text("services/device-broker/src/worker.rs");
const windowsRpc = await text("services/device-broker/src/rpc.rs");
const windowsMain = await text("services/device-broker/src/main.rs");
assert(!/\.get\(&(?:13|15)\)/.test(windowsWorker + windowsMain),
  "Windows production status projection must use generated message-type names, not wire literals.");
assert(androidJni.includes("InitializationRuntime"),
  "Android JNI must retain the shared post-boot initialization runtime.");
for (const symbol of ["handshakeAttempt", "startupObserved", "startupBeginBuilding", "postBootInitializationStarted", "initializationObserved", "initializationAdvance"]) {
  assert(androidUsbHost.includes(symbol), `Android USB host is missing shared initialization bridge ${symbol}.`);
}
assert(androidUsbHost.includes("initializationObserved(decoded.messageType, decoded.payload)"),
  "Android must feed payload-validated semantic seed evidence into the shared readiness runtime.");
assert(/if \(!stateDecoder\.sessionSynchronized\(\)\) \{\s*stateDecoder\.initializationObserved/.test(androidUsbHost)
  && androidJni.includes("*initialization = None"),
  "Android must retain an incomplete seed for late recovery, then release it at Ready and avoid steady-state JNI payload replay.");
assert(/synchronizationChanged[\s\S]{0,500}sessionSynchronizationCompleted\([\s\S]{0,100}decision\.synchronizedState/.test(androidUsbHost),
  "Android must advance the shared transport from Syncing to Ready when a late authoritative seed completes.");
assert(!/"preset"\.equals\(kind\)[\s\S]{0,100}(?:state|preset)Synchronized\s*=\s*true/.test(androidUsbHost),
  "Android must not promote a preset observation to full authoritative synchronization.");
assert(!/publishStateBatch\([\s\S]*?sessionStateObserved\(monotonicMillis\(\),\s*(?:state|preset)Synchronized\)/.test(androidUsbHost),
  "Android must not bypass the shared semantic-seed decision when publishing an ordinary state batch.");
assert(/advance_lifecycle\(now_ms\)[\s\S]{0,700}session\.synchronization_completed\(now_ms, connected\.synchronized\)/.test(windowsWorker),
  "Windows must advance the shared transport after lifecycle completion, including late seed recovery.");
assert(/let initialization = \(!synchronized\)\.then_some\(initialization\);[\s\S]{0,300}initialization,/.test(windowsUsbHost),
  "Windows must retain an incomplete initial seed for the same late recovery supported on Android.");
assert(androidUsbHost.includes("decision.beginBuilding"),
  "Android must consume the shared staged-startup transition instead of inferring it from a message type.");
assert(!androidUsbHost.includes('"disconnected".equals(decision.phase)'),
  "Android must not duplicate the shared startup phase transition table.");
assert(!androidUsbHost.includes("nextHandshakeAttempt"),
  "Android must obtain the encoded reset command and HID layout from one shared handshake decision.");
assert(!/stateDecoder\.session\w+\(System\.currentTimeMillis\(\)/.test(androidUsbHost),
  "Android must drive the shared transport runtime with a monotonic clock like Windows.");
assert(!/PERFORMANCE_MIDI_GAP_MS[\s\S]{0,120}System\.currentTimeMillis/.test(androidUsbHost),
  "Android must enforce shared performance-MIDI pacing on a monotonic clock.");
assert(androidUsbHost.includes("handshakeAttempt(monotonicMillis(), session)"),
  "Android must drive shared handshake deadlines with its monotonic clock.");
assert(/MESSAGE_TYPE_RESET_COMMS_BUFFERS[\s\S]{0,120}StartupDecision\.SEND/.test(androidUsbHost)
  && !/"versionValidating"\.equals\(startup\.phase\)/.test(androidUsbHost),
  "Android handshake completion must use the typed shared action, not a rendered phase name.");
assert(/InitializationDecision\.COMPLETE[\s\S]{0,400}sessionSynchronizationCompleted\([\s\S]{0,100}decision\.synchronizedState/.test(androidUsbHost),
  "Android must advance shared transport readiness at the same post-seed boundary as Windows.");
assert(/InitializationDecision\.SEND[\s\S]{0,300}connection == null \|\| !stateDecoder\.startupConnected\(\)/.test(androidUsbHost),
  "Android must allow shared post-boot seed writes before public transport readiness.");
assert(androidUsbHost.includes("postBootInitializationStarted(monotonicMillis())"),
  "Android must let the shared startup runtime allocate post-boot request IDs.");
assert(androidNativeFacade.includes("startupTimedOut(long nowMs)")
  && androidUsbHost.includes("stateDecoder.startupTimedOut(now)"),
  "Android must enforce staged startup timeout through the shared Rust runtime.");
assert(androidNativeFacade.includes("startupActive()")
  && androidUsbHost.includes("stateDecoder.startupActive()")
  && !/private volatile boolean startupActive/.test(androidUsbHost),
  "Android must query the shared startup controller instead of mirroring its active epoch in Java.");
assert(androidJni.includes("DeviceStartupRuntime::is_connected")
  && androidJni.includes('"phase": phase.as_str()')
  && !androidJni.includes("startup_phase_is_connected")
  && !androidJni.includes("fn startup_phase_name"),
  "Android must use the shared startup-connected projection without an adapter phase table.");
assert(androidNativeFacade.includes("sessionConnected()")
  && androidNativeFacade.includes("sessionSynchronized()")
  && !/(?:handshakeComplete|stateSynchronized|initializationComplete)/.test(androidUsbHost),
  "Android connection and synchronization projections must come from the shared transport runtime.");
assert(androidUsbHost.includes("stateDecoder.nextRequestId()") && !androidUsbHost.includes("AtomicLong requestIds"),
  "Android must reserve every correlation id from the retained shared session runtime.");
assert(windowsUsbHost.includes("pub fn reserve_request_id") && windowsUsbHost.includes("self.startup.reserve_request_id()"),
  "Windows must reserve correlation ids from the retained shared session runtime.");
assert(windowsWorker.includes("Command::ReserveRequestId") && windowsRpc.includes("controller.reserve_request_id()?"),
  "Windows gateway operations must reach the shared request-id allocator through the USB worker.");
assert(!/fn next_request_id|as_nanos\(\) as u64/.test(windowsRpc),
  "Windows must not maintain a wall-clock request-id allocator beside the shared lifecycle sequence.");
assert(/decision\.beginBuilding[\s\S]{0,500}sessionStateObserved\(monotonicMillis\(\), false\)/.test(androidUsbHost),
  "Android must return shared transport readiness to Syncing during an in-session rebuild.");
assert(androidUsbHost.includes("sessionScheduleReconnect(monotonicMillis())"),
  "Android must obtain automatic reconnect cadence from the shared transport runtime.");
assert(androidUsbHost.includes("sessionReconnectDue(now)"),
  "Android must let the shared transport runtime gate automatic reconnect attempts.");
assert(androidUsbHost.includes("stateDecoder.sessionTerminalReadFailed()")
  && androidJni.includes("transport.terminal_read_failed()"),
  "Android terminal endpoint failures must enter the same shared read-failure policy as Windows.");
assert(!/scheduleAutomaticReconnect[\s\S]{0,800},\s*250,\s*TimeUnit\.MILLISECONDS/.test(androidUsbHost),
  "Android must not hard-code an automatic reconnect delay.");
assert(androidUsbHost.includes("systemTimeCommand(System.currentTimeMillis())"),
  "Android must send the shared device-facing system-time command after staged startup.");
const androidFlightRecorder = await text("apps/android/android/app/src/main/java/com/qccontrol/mobile/QcUsbFlightRecorder.java");
assert(/isRoutineLiveness[\s\S]{0,300}MESSAGE_TYPE_KEEP_ALIVE/.test(androidFlightRecorder)
  && !/isRoutineLiveness[\s\S]{0,300}MESSAGE_TYPE_VERSION/.test(androidFlightRecorder),
  "Android diagnostics must evict routine KeepAlive traffic without discarding startup Version evidence.");
assert(androidUsbHost.includes("gatewayResponseMatches"), "Android USB reads must use shared response correlation.");
assert(androidUsbHost.includes("plan.interMessageIntervalMs"), "Android must consume shared write pacing metadata.");
assert(!androidUsbHost.includes("pacedRemoteGesture"), "Android must not infer remote gesture pacing from encoded messages.");
assert(androidUsbHost.includes("gatewayVerificationAdvance"), "Android must execute the shared native verification state machine.");
assert(androidUsbHost.includes("gatewayReadbackRetryDelay"), "Android must consume shared correlated-readback retry timing.");
assert(!androidUsbHost.includes("plan.refreshDelaysMs"), "Android must not interpret native verification refresh cadence.");
assert(androidUsbHost.includes("plan.postWriteRefreshMethod"), "Android must consume shared post-write refresh selection.");
assert(androidUsbHost.includes("plan.followupMethod"), "Android must consume shared composite-read dependencies.");
assert(androidUsbHost.includes("QcUsbProfile.POST_INITIALIZATION_WRITE_DELAY_MS"), "Android must consume shared first-command stabilization timing.");
assert(!androidUsbHost.includes("writeMessage(message, !includeReportId)"), "Android must not replay mutations while awaiting readback.");
assert(androidUsbHost.includes("QcUsbProfile.PRESET_LIBRARY_SETTLEMENT_QUIET_MS"), "Android must use generated File-stream settlement timing.");
assert(!/(?:littleEndianInt|littleEndianLong|decodeCommandEnvelope|DecodedEnvelope)/.test(androidNativeFacade),
  "Android Java must not duplicate a positional JNI plan codec.");
for (const method of ["nativeEncodeCommand", "nativePlanGatewayWrite", "nativePlanGatewayWorkflow", "nativePlanGatewayRead", "nativeHandshakeAttempt", "nativeStartupObserved", "nativeStartupBeginBuilding", "nativeInitializationAdvance"]) {
  assert(androidNativeFacade.includes(`native String ${method}`), `${method} must cross JNI as a named semantic envelope.`);
}
assert(androidNativeFacade.includes("native void nativePostBootInitializationStarted"),
  "Post-boot state seeding must have a distinct staged-startup JNI boundary.");
assert(androidNativeFacade.includes("native byte[] nativeEncodeReports"),
  "Raw QC HID frame encoding must remain a byte-array JNI boundary.");
assert(/nativeEncodeReports[\s\S]*?->\s*jbyteArray/.test(androidJni),
  "The Rust JNI frame encoder must match Java's byte-array declaration.");
assert(androidJni.includes("TransportRuntime::encode_reports(&message, layout)")
  && !/Arrays\.copyOfRange\(framedReport,\s*1,\s*framedReport\.length\)/.test(androidUsbHost),
  "Android report-ID shaping must stay in the shared Rust transport runtime.");
assert(androidJni.includes("fn messages_json"), "Android JNI must serialize native plan messages through one semantic helper.");
assert(!androidJni.includes("fn message_envelope"), "Android JNI must not maintain a private positional message envelope.");
assert(windowsRpc.includes("gateway_write_verification_policy"), "Windows must consume shared write verification policy.");
assert(windowsRpc.includes("verification_policy.preflight_method"), "Windows must consume shared preflight method selection.");
assert(windowsRpc.includes("verification_policy.readback_method"), "Windows must consume shared readback method selection.");
assert(windowsRpc.includes("GatewayVerificationAction::Refresh { method }"), "Windows must execute shared verification refresh actions.");
assert(windowsRpc.includes("policy.post_write_refresh_method"), "Windows must consume shared post-write refresh selection.");
assert(windowsRpc.includes("gateway_read_followup_method(method)"), "Windows must consume shared composite-read dependencies.");
assert(windowsRpc.includes("gateway_verification_policy(stage.timeout_ms, 0)"), "Windows workflows must consume shared refresh cadence.");
assert(windowsRpc.includes("gateway_correlated_readback_delay(method, attempt)"), "Windows must consume shared correlated-readback retry timing.");
assert(windowsRpc.includes("profile::COMMAND_CONFIRMATION_TIMEOUT_MS"),
  "Windows decoder/readback waits must consume the shared command-confirmation bound.");
assert(windowsRpc.includes("profile::PRESET_SYNC_TIMEOUT_MS"),
  "Windows preset catalog waits must consume the same shared bound as Android.");
assert(!/wait_for_preset_list\([\s\S]{0,120}Duration::from_secs\(25\)/.test(windowsRpc),
  "Windows must not retain a private preset-catalog timeout.");
const windowsUsb = await text("services/device-broker/src/usb.rs");
assert(windowsUsb.includes("next_handshake_write"), "Windows must obtain its reset command and HID layout from the shared transport runtime.");
assert(windowsUsb.includes("attempt.matches_reply"), "Windows must use shared opaque-session handshake correlation.");
assert(windowsUsb.includes("usb.report_layout = attempt.layout")
  && windowsUsb.includes("send_command_with_layout(message, self.report_layout)"),
  "Windows must retain the handshake-selected HID report layout for the full session like Android.");
assert(windowsUsb.includes("post_boot_initialization"),
  "Windows must seed readiness from the shared staged-startup observations.");
assert(windowsUsb.includes("startup.timed_out(session_clock.elapsed().as_millis() as u64)"),
  "Windows must enforce staged startup timeout through the shared Rust runtime.");
assert(windowsUsb.includes("error.as_str()"),
  "Windows must render startup errors through the same shared vocabulary as Android.");
assert(windowsUsb.includes("pub fn observe_lifecycle"),
  "Windows must retain the shared startup controller for connected-state protocol events.");
assert(windowsUsb.includes("self.startup.observe(message.message_type"),
  "Windows connected-state Version and Connection events must use the shared lifecycle runtime.");
assert(windowsUsb.includes("initialization.observe_message(message.message_type, &message.payload)"),
  "Windows must feed payload-validated semantic seed evidence into the shared readiness runtime.");
assert((await text("services/device-broker/src/worker.rs")).includes("connected.synchronized"),
  "Windows must feed the shared transport runtime the authoritative lifecycle synchronization state.");
assert(windowsUsb.includes("commands::sync_system_time(unix_time_ms())"),
  "Windows must send the same shared device-facing system-time command after staged startup.");
assert(windowsUsb.includes("HidReadEvent::Idle")
  && windowsUsb.includes("read_message_poll")
  && !windowsUsb.includes("consecutive_errors"),
  "Windows must report native read activity while leaving error tolerance to the shared transport runtime.");
assert(/read_message_poll[\s\S]{0,500}session\.read_succeeded\(\)[\s\S]{0,500}session\.read_failed\(\)/.test(windowsUsb),
  "Every Windows handshake, seed, and connected-state read must use the shared read-error policy.");
assert(!/session\.(?:read_succeeded|read_failed)\(\)/.test(windowsWorker),
  "The Windows worker must not reimplement read-error policy around the native adapter.");
await rejectPatterns(
  [
    "packages/rust/qc-android/src/lib.rs",
    "services/device-broker/src/main.rs",
    "services/device-broker/src/usb.rs",
    "services/device-broker/src/worker.rs",
  ],
  [
    ["host-owned QC session machine", /qc_protocol::session::SessionMachine/],
    ["host-owned QC frame assembler", /FrameAssembler::new\s*\(/],
    ["host-owned QC frame encoder", /framing::encode\s*\(/],
    ["host-owned QC payload decompressor", /(?:GzDecoder|maybe_gunzip)/],
    ["host-owned QC backup assembler", /BackupAssembler/],
    ["host-owned QC backup deadline policy", /BACKUP_(?:FIRST_CHUNK|STREAM_STALL|MAXIMUM_ATTEMPTS)/],
    ["host-owned QC request-id extraction", /qc_protocol::wire::request_id/],
    ["hard-coded remote gesture pacing", /(?:Duration::from_millis|thread::sleep)\s*\(\s*20\s*\)/],
  ],
);
assert(
  !androidUsbHost.includes("normalizeInputReport"),
  "Android must pass raw HID reports to the shared Rust transport runtime.",
);

for (const packagePath of ["apps/windows/package.json", "apps/android/package.json"]) {
  const manifest = JSON.parse(await text(packagePath));
  const dependencies = { ...manifest.dependencies, ...manifest.optionalDependencies };
  assert(
    Object.keys(dependencies).every((name) => !/(?:pyquadcortex|python)/i.test(name)),
    `${packagePath} declares a Python runtime dependency.`,
  );
}

console.log(JSON.stringify({
  verified: true,
  sharedTransportRuntime: "qc-device-runtime::transport",
  sharedBackupRuntime: "qc-device-runtime::backup",
  sharedStateRuntime: "qc-device-runtime::state_runtime",
  sharedInitializationRuntime: "qc-device-runtime::initialization",
  sharedStagedStartupRuntime: "qc-device-runtime::initialization::DeviceStartupRuntime",
  sharedResponseCorrelation: "qc-device-runtime::correlation",
  sharedCapabilityEvidence: "qc-device-runtime::capabilities",
  sharedTransferRecovery: "qc-device-runtime::transfer",
  sharedForwardProtocol: "qc-protocol::forward",
  sharedWritePacing: "qc-device-runtime::request::PlannedWrite",
  sharedWriteVerification: "qc-device-runtime::request::GatewayVerificationRuntime",
  windowsRuntime: "Tauri + thin qc-device-broker adapter + qc-device-runtime + qc-protocol",
  androidRuntime: "Capacitor + thin Java/JNI adapter + qc-device-runtime + qc-protocol",
  pythonPackaged: false,
}));
