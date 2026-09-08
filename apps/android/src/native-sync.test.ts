import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const javaSource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/QcUsbPlugin.java", import.meta.url), "utf8");
const usbProfileSource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/QcUsbProfile.java", import.meta.url), "utf8");
const servicesSource = readFileSync(new URL("./native-services.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const usbProbeSource = readFileSync(new URL("../../../tools/probe-android-usb-adb.mjs", import.meta.url), "utf8");
const androidWebViewAdbSource = readFileSync(new URL("../../../tools/android-webview-adb.mjs", import.meta.url), "utf8");
const liveStateSource = readFileSync(new URL("../../../packages/typescript/qc-ui/src/use-qc-live-state.ts", import.meta.url), "utf8");
const performanceWorkflowSource = readFileSync(new URL("../../../packages/typescript/qc-ui/src/use-performance-workflow.ts", import.meta.url), "utf8");
const coreStateSource = readFileSync(new URL("../../../packages/typescript/qc-core/src/state.ts", import.meta.url), "utf8");
const generatedPayloadSource = readFileSync(new URL("../../../packages/typescript/qc-client/src/generated-payloads.ts", import.meta.url), "utf8");
const coreFootswitchSource = readFileSync(new URL("../../../packages/typescript/qc-core/src/footswitch.ts", import.meta.url), "utf8");
const nativeDecoderSource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/QcNativeStateDecoder.java", import.meta.url), "utf8");
const rustStateSource = readFileSync(new URL("../../../packages/rust/qc-protocol/src/state.rs", import.meta.url), "utf8");
const rustCommandsSource = readFileSync(new URL("../../../packages/rust/qc-protocol/src/commands.rs", import.meta.url), "utf8");
const rustAndroidSource = readFileSync(new URL("../../../packages/rust/qc-android/src/lib.rs", import.meta.url), "utf8");
const rustRuntimeRequestSource = readFileSync(new URL("../../../packages/rust/qc-device-runtime/src/request.rs", import.meta.url), "utf8");
const rustStateRuntimeSource = readFileSync(new URL("../../../packages/rust/qc-device-runtime/src/state_runtime.rs", import.meta.url), "utf8");
const rustTransportRuntimeSource = readFileSync(new URL("../../../packages/rust/qc-device-runtime/src/transport.rs", import.meta.url), "utf8");
const rustInitializationSource = readFileSync(new URL("../../../packages/rust/qc-device-runtime/src/initialization.rs", import.meta.url), "utf8");
const rustBackupRuntimeSource = readFileSync(new URL("../../../packages/rust/qc-device-runtime/src/backup.rs", import.meta.url), "utf8");
const rustCatalogRuntimeSource = readFileSync(new URL("../../../packages/rust/qc-device-runtime/src/catalog.rs", import.meta.url), "utf8");
const rustResponseSource = readFileSync(new URL("../../../packages/rust/qc-protocol/src/responses.rs", import.meta.url), "utf8");
const deviceBrokerRpcSource = readFileSync(new URL("../../../services/device-broker/src/rpc.rs", import.meta.url), "utf8");
const sharedTransportSource = readFileSync(new URL("../../../packages/typescript/qc-core/src/gateway-transport.ts", import.meta.url), "utf8");
const continuousControlSource = readFileSync(new URL("../../../packages/typescript/qc-ui/src/use-continuous-control-workflow.ts", import.meta.url), "utf8");
const corOsScreensSource = readFileSync(new URL("../../../packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", import.meta.url), "utf8");
const generatedGatewaySource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/GeneratedGatewayMethods.java", import.meta.url), "utf8");
const remoteActionsSource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/GeneratedRemoteActions.java", import.meta.url), "utf8");
const relayProtocolSource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/RelayProtocol.java", import.meta.url), "utf8");
const relayServiceSource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/QcRelayService.java", import.meta.url), "utf8");
const relayPluginSource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/QcRelayPlugin.java", import.meta.url), "utf8");
const actionContract = JSON.parse(readFileSync(new URL("../../../contracts/qc-actions.v1.json", import.meta.url), "utf8"));
const gatewayContract = JSON.parse(readFileSync(new URL("../../../contracts/gateway-methods.v1.json", import.meta.url), "utf8"));
const androidManifestSource = readFileSync(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
const capacitorConfigSource = readFileSync(new URL("../capacitor.config.json", import.meta.url), "utf8");
const splashFallbackSource = readFileSync(new URL("../android/app/src/main/res/drawable/splash.xml", import.meta.url), "utf8");
const adbGatewayHelperSource = readFileSync(new URL("../../../tools/invoke-android-gateway-adb.mjs", import.meta.url), "utf8");
const adbPairHelperSource = readFileSync(new URL("../../../tools/pair-android-relay-adb.mjs", import.meta.url), "utf8");
const adbCaptureHelperSource = readFileSync(new URL("../../../tools/capture-qc-screen-android-adb.mjs", import.meta.url), "utf8");
const adbSessionHelperSource = readFileSync(new URL("../../../tools/open-android-usb-session-adb.mjs", import.meta.url), "utf8");
const adbToolSources = [usbProbeSource, adbGatewayHelperSource, adbPairHelperSource, adbCaptureHelperSource, adbSessionHelperSource];

test("tempo synchronizes in both directions over the native USB bridge", () => {
  assert.match(sharedTransportSource, /gateway\.setTempo\(bpm, state\.tempo, state\.presetName\)/);
  assert.match(generatedPayloadSource, /\| "tempo"/);
  assert.match(
    javaSource,
    /writeMessages\(plan\.messages[\s\S]{0,350}stateDecoder\.gatewayVerificationStarted\([\s\S]{0,120}operation\.afterSequence, monotonicMillis\(\)/,
  );
  assert.match(
    rustRuntimeRequestSource,
    /preset_transition[\s\S]{0,300}profile::PRESET_SYNC_TIMEOUT_MS[\s\S]{0,100}profile::COMMAND_CONFIRMATION_TIMEOUT_MS/,
  );
  assert.match(rustRuntimeRequestSource, /DeviceCommand::SetTempo\(bpm\)/);
  assert.match(rustCommandsSource, /pub fn set_tempo/);
  assert.match(rustStateSource, /decode_global_tempo/);
  assert.match(rustStateSource, /StateUpdate::new\("tempo"\)/);
  assert.match(rustStateSource, /tempo_led_enabled/);
  assert.match(appSource, /consumeQcNativeStateFrame\(frame/);
  assert.match(liveStateSource, /reconcileFrame\(states, observedAt\)/);
  assert.match(performanceWorkflowSource, /transport\.tapTempo\(controller\.snapshotRef\.current\)/);
});

test("USB attachment requires an explicit connect and reports synchronization separately", () => {
  assert.match(servicesSource, /connected: boolean; synchronized: boolean/);
  assert.match(javaSource, /isReady\(\) && stateDecoder\.sessionSynchronized\(\) && currentSetlist != null/);
  assert.doesNotMatch(appSource, /if \(state === "available"\)[\s\S]{0,120}attemptUsbConnection\(\)/);
  assert.match(appSource, /if \(!devices\.length\)[\s\S]{0,120}transitionConnection\("available"\)/);
  assert.match(appSource, /state\.kind === "preset"[\s\S]*usbSessionReady\.current[\s\S]*transitionConnection\("connected"\)/);
  assert.match(appSource, /connected: usbConnected, busy: usbBusy, appearance: usbState/);
  assert.match(appSource, /> USB<\//, "the compact pill identifies the physical USB transport while its light carries readiness");
  assert.doesNotMatch(appSource, /qcReadyLabel\(connection\)/, "Android does not repeat the verbose desktop readiness label");
});

test("A through H use the reported hardware mode and assignments", () => {
  assert.match(sharedTransportSource, /gateway\.pressFootswitch\(index, state\.mode, state\.presetName\)/);
  assert.match(rustStateSource, /preset[\s\S]{0,200}\.stomp_mode_assignments/);
  assert.match(rustStateSource, /footswitch: assignments\.get/);
  assert.match(performanceWorkflowSource, /controller\.beginFootswitch/);
  assert.match(coreFootswitchSource, /mode === "SCENE"/);
  assert.match(coreFootswitchSource, /mode === "PRESET"/);
  assert.match(coreFootswitchSource, /block\.footswitch === index/);
  assert.match(rustRuntimeRequestSource, /"device\.pressFootswitch"[\s\S]*profile::FOOTSWITCH_BASE_CONTROLLER/);
  assert.match(performanceWorkflowSource, /controller\.runFootswitch\(transport, index\)/);
});

test("mode slots A through C use the same shared transport contract and immediate MIDI lane", () => {
  assert.match(sharedTransportSource, /gateway\.selectModeSlot\(slot, state\.presetName\)/);
  assert.match(rustRuntimeRequestSource, /"device\.selectModeSlot"[\s\S]*profile::MODE_SLOT_CONTROLLER/);
  assert.match(performanceWorkflowSource, /controller\.runModeSlot\(transport, slot\)/);
});

test("Tap Tempo uses its explicit official MIDI control and live bypass updates are batched", () => {
  assert.match(sharedTransportSource, /gateway\.tapTempo\(state\.mode, state\.presetName\)/);
  assert.match(rustRuntimeRequestSource, /"device\.tapTempo"[\s\S]*profile::TAP_TEMPO_CONTROLLER/);
  assert.match(rustRuntimeRequestSource, /MidiControlChange/);
  assert.match(performanceWorkflowSource, /transport\.tapTempo\(controller\.snapshotRef\.current\)/);
  assert.match(rustStateSource, /StateUpdate::new\("bypassBatch"\)/);
  assert.match(coreStateSource, /state\.kind === "bypassBatch"/);
});

test("native USB remains open and command traffic is never blocked by startup", () => {
  assert.match(javaSource, /readerIo = Executors\.newSingleThreadExecutor\(\)/);
  assert.match(javaSource, /commandIo = Executors\.newSingleThreadExecutor\(\)/);
  assert.match(javaSource, /midiIo = Executors\.newSingleThreadExecutor\(\)/);
  assert.match(javaSource, /private CompletableFuture<org\.json\.JSONObject> relayMidi/);
  assert.match(javaSource, /if \(isReady\(\) && device != null\s*&& device\.getDeviceId\(\) == candidate\.getDeviceId\(\)\)/);
  assert.doesNotMatch(javaSource, /Thread\.sleep\(2000\)/);
  assert.match(javaSource, /midiIo\.execute\(\(\) ->/);
  assert.match(javaSource, /midiConnection = openedMidi/);
  assert.match(javaSource, /activeMidiConnection\.bulkTransfer\(midiOutputEndpoint/);
  assert.match(javaSource, /hostStartedAtUnixMs/);
  assert.match(javaSource, /dispatchLatencyMs/);
  assert.match(javaSource, /midiConnection\.releaseInterface\(midiInterface\)/);
  assert.match(appSource, /consumeQcNativeStateFrame\(frame/);
  assert.match(liveStateSource, /reconcileFrame\(states, observedAt\)/);
  assert.match(readFileSync(new URL("../../../packages/typescript/qc-core/src/command-coordinator.ts", import.meta.url), "utf8"), /beginSnapshotMutation/);
  assert.match(rustStateSource, /catalog_refresh = Some\(true\)/);
});

test("one device frame crosses the bridge once with all realtime state updates", () => {
  assert.match(javaSource, /stateDecoder\.decode\(type, payload\)/);
  assert.match(rustStateSource, /fn decode_grid/);
  assert.match(javaSource, /notifyListeners\("qcStateBatch", frame, true\)/);
  assert.doesNotMatch(javaSource, /notifyListeners\("qcState", state/);
  assert.match(servicesSource, /addListener\(eventName: "qcStateBatch"/);
  assert.match(appSource, /QcUsbNative\.addListener\("qcStateBatch"/);
  assert.match(appSource, /consumeQcNativeStateFrame\(frame/);
  assert.match(coreStateSource, /reduceQcStateFrame/);
  assert.match(javaSource, /state\.put\("observedAt", observedAt\)/);
});

test("large model metadata never blocks the permanent USB reader", () => {
  assert.match(javaSource, /metadataIo = Executors\.newSingleThreadExecutor\(\)/);
  assert.match(javaSource, /if \(type == QcUsbProfile\.MESSAGE_TYPE_MODEL_REPO\) \{[\s\S]*scheduleModelCatalogDecode/);
  assert.match(javaSource, /metadataIo\.execute\(\(\) ->/);
  assert.match(javaSource, /stateDecoder\.installModelRepo\(payload\)/);
  assert.match(rustAndroidSource, /Parsing intentionally happens before the decoder lock/);
  assert.doesNotMatch(javaSource, /Base64\.encodeToString|notifyListeners\("qcUsbMessage"/, "raw frames must not be serialized across the bridge");
  assert.doesNotMatch(servicesSource, /addListener\(eventName: "qcUsbMessage"/);
  assert.match(appSource, /Promise\.all\(listenerPromises\)[\s\S]*QcUsbNative\.scan\(\)/, "listeners must be live before startup frames arrive");
  assert.match(javaSource, /stateDecoder\.postBootInitializationStarted\(/);
  assert.match(javaSource, /stateDecoder\.systemTimeCommand\(System\.currentTimeMillis\(\)\)/);
  assert.match(javaSource, /stateDecoder\.initializationAdvance\(/);
  assert.match(javaSource, /startupActive && stateDecoder\.startupTimedOut\(now\)/);
  assert.match(rustInitializationSource, /deadline_ms: now_ms\.saturating_add\(profile::READY_WAIT_TIMEOUT_MS\)/);
  assert.match(javaSource, /stateDecoder\.sessionSynchronized\(\) && currentSetlist != null/);
  assert.match(javaSource, /InitializationDecision\.SEND[\s\S]{0,300}connection == null \|\| !stateDecoder\.startupConnected\(\)/);
  assert.match(javaSource, /QcUsbProfile\.POST_INITIALIZATION_WRITE_DELAY_MS/);
  assert.match(rustInitializationSource, /self\.synchronized && self\.seed_complete\(\)/);
  assert.match(rustCommandsSource, /profile::LIVE_SUBSCRIPTIONS/);
});

test("the Capacitor bridge delegates commands, framing, and state to shared Rust", () => {
  assert.match(javaSource, /stateDecoder\.pushReport\(report\)/);
  assert.doesNotMatch(javaSource, /reportFlags|MAX_FRAME_REPORTS|List<byte\[]> reports/);
  assert.match(javaSource, /stateDecoder\.encodeReports\(message, withReportId\)/);
  assert.doesNotMatch(javaSource, /Arrays\.copyOfRange\(framedReport, 1, framedReport\.length\)/);
  assert.match(javaSource, /stateDecoder\.gatewayPlan\(method, JSObject\.fromJSONObject\(params\)\)/);
  assert.match(rustRuntimeRequestSource, /pub fn gateway_write_verification_policy/);
  assert.match(rustRuntimeRequestSource, /pub struct GatewayVerificationRuntime/);
  assert.match(rustAndroidSource, /gateway_write_verification_policy\(&method\)/);
  assert.match(nativeDecoderSource, /gatewayVerificationStarted/);
  assert.match(nativeDecoderSource, /gatewayVerificationAdvance/);
  assert.match(javaSource, /stateDecoder\.gatewayVerificationAdvance\(/);
  assert.doesNotMatch(javaSource, /for \(long refreshDelay : plan\.refreshDelaysMs\)/);
  assert.doesNotMatch(javaSource, /writeMessage\(message, !includeReportId\)/);
  assert.doesNotMatch(javaSource, /isIdempotentGatewayWrite/);
  assert.doesNotMatch(javaSource, /QcUsbFraming|QcProtobufWire|fieldVarint|fieldMessage/);
  assert.match(nativeDecoderSource, /System\.loadLibrary\("qc_android"\)/);
  assert.match(nativeDecoderSource, /nativeEncodeCommand/);
  assert.match(nativeDecoderSource, /nativePlanGatewayWrite/);
  assert.match(nativeDecoderSource, /JSONObject plan = new JSONObject\(nativePlanGatewayWrite/);
  assert.match(nativeDecoderSource, /private static native String nativePlanGatewayWorkflow/);
  assert.match(nativeDecoderSource, /private static native String nativePlanGatewayRead/);
  assert.doesNotMatch(nativeDecoderSource, /littleEndian(?:Int|Long)|decodeCommandEnvelope|DecodedEnvelope/);
  assert.match(rustAndroidSource, /fn messages_json/);
  assert.doesNotMatch(rustAndroidSource, /fn message_envelope/);
  assert.match(nativeDecoderSource, /nativeEncodeReports/);
  assert.match(nativeDecoderSource, /nativePushReport/);
  assert.match(rustAndroidSource, /qc_protocol::state/);
  assert.match(rustAndroidSource, /qc_protocol::commands/);
  assert.match(rustAndroidSource, /qc_protocol::framing/);
  assert.match(rustAndroidSource, /qc_device_runtime::transport::\{ReportLayout, TransportRuntime\}/);
  assert.match(rustTransportRuntimeSource, /FrameAssembler/);
  assert.match(rustTransportRuntimeSource, /normalize_inbound_report/);
  assert.doesNotMatch(rustAndroidSource, /qc_protocol::session::(?:FrameAssembler|\{[^}]*FrameAssembler)/);
});

test("Android feeds decoded state into the shared native device runtime", () => {
  assert.match(rustAndroidSource, /state_runtime::DeviceStateRuntime/);
  assert.match(rustStateRuntimeSource, /pub struct DeviceStateRuntime/);
  assert.match(rustStateRuntimeSource, /self\.snapshot\.apply\(state\)/);
  assert.match(rustAndroidSource, /nativeSnapshot/);
  assert.match(rustAndroidSource, /plan_gateway_write/);
  assert.match(nativeDecoderSource, /JSObject snapshot\(\).*nativeSnapshot/);
});

test("Android generic dispatch covers the generated Grid, routing, and MIDI actions", () => {
  for (const method of ["device.moveBlock", "device.addBlock", "device.removeBlock", "device.setBlockFootswitch", "device.setChainInput", "device.setChainOutput", "device.setChainSplit"]) {
    assert.match(rustRuntimeRequestSource, new RegExp(method.replace(".", "\\.")));
  }
  assert.match(generatedGatewaySource, /case "device\.pressFootswitch": return "PLANNED_WRITE"/);
  assert.match(generatedGatewaySource, /case "device\.tapTempo": return "PLANNED_WRITE"/);
  assert.match(generatedGatewaySource, /case "device\.selectModeSlot": return "PLANNED_WRITE"/);
  assert.match(javaSource, /stateDecoder\.gatewayPlan\(method, JSObject\.fromJSONObject\(params\)\)/);
  assert.match(nativeDecoderSource, /PlannedGatewayWrite/);
});

test("Android remote relay consumes every generated MCP action with verified writes", () => {
  for (const action of actionContract.actions) {
    assert.match(remoteActionsSource, new RegExp(`"${action.rpc.replace(".", "\\.")}"`), `${action.rpc} is absent from Android remote policy`);
  }
  assert.match(relayProtocolSource, /GeneratedRemoteActions\.contains\(method\)/);
  assert.match(javaSource, /relayPlannedGatewayWrite\(/);
  assert.match(javaSource, /stateDecoder\.gatewayTransactionState\(/);
  assert.match(javaSource, /resolvePendingGatewayTransactions/);
  assert.doesNotMatch(javaSource, /pollRelayVerification/);
  assert.match(javaSource, /relayGatewayWorkflow\(method, params\)/);
  assert.match(
    javaSource,
    /finalizeRelayWorkflow\(method, workflow\)[\s\S]*recordSavedPreset\(workflow\)[\s\S]{0,350}\.put\("verification", "authoritative_readback"\)/,
    "persistent workflows must return the complete DeviceActionResult verification tuple",
  );
  assert.match(javaSource, /finalizeRelayWorkflow[\s\S]{0,2200}relayWorkflowCatalogRead/);
  assert.match(javaSource, /relayWorkflowCatalogRead[\s\S]{0,900}"device\.listPresets"/);
  assert.match(javaSource, /String actualSavedName = workflow\.savedName/);
  assert.match(usbProfileSource, /PRESET_LIBRARY_VERIFICATION_TIMEOUT_MS = 45000L/);
  assert.match(usbProfileSource, /PRESET_LIBRARY_VERIFICATION_RETRY_MS = 500L/);
  assert.match(rustCatalogRuntimeSource, /pub struct CatalogVerificationRuntime/);
  assert.match(rustCatalogRuntimeSource, /profile::PRESET_LIBRARY_VERIFICATION_TIMEOUT_MS/);
  assert.match(rustCatalogRuntimeSource, /profile::PRESET_LIBRARY_VERIFICATION_RETRY_MS/);
  assert.match(rustCatalogRuntimeSource, /profile::PRESET_LIBRARY_REFRESH_COALESCE_MS/);
  assert.match(javaSource, /stateDecoder\.catalogVerificationStarted\(/);
  assert.match(javaSource, /stateDecoder\.catalogVerificationAdvance\(/);
  assert.match(javaSource, /stateDecoder\.catalogVerificationCancelled\(/);
  assert.doesNotMatch(javaSource, /nextRetryDelayMs/);
  assert.match(javaSource, /relayReconnect\("USB session refreshed for saved preset verification"\)[\s\S]{0,300}relayWorkflowCatalogRead/);
  assert.match(javaSource, /relayWorkflowCatalogRead\([\s\S]{0,2400}relayCatalogConfirmsSavedPresets/);
  assert.match(javaSource, /stateDecoder\.storedPresetNameMatches/);
  assert.match(javaSource, /relaySetDeviceName[\s\S]{0,1800}\.put\("accepted", true\)\.put\("verified", true\)[\s\S]{0,300}"authoritative_readback"[\s\S]{0,300}\.put\("identity", identity\)/);
  assert.doesNotMatch(javaSource, /Character\.isDigit/);
  assert.match(nativeDecoderSource, /nativeStoredPresetNameMatches/);
  assert.match(rustRuntimeRequestSource, /pub fn stored_preset_name_matches/);
  assert.match(deviceBrokerRpcSource, /runtime_request::stored_preset_name_matches/);
  assert.match(javaSource, /\.put\("savedName", actualSavedName\)/);
  assert.match(relayServiceSource, /"MALFORMED_RESPONSE"/);
  assert.doesNotMatch(
    relayServiceSource,
    /whenComplete\(\(result, error\)[\s\S]{0,1600}catch \(Exception ignored\) \{\}/,
    "relay completion errors must produce an explicit response instead of becoming host timeouts",
  );
  assert.match(nativeDecoderSource, /nativePlanGatewayWorkflow/);
  assert.match(rustAndroidSource, /plan_preset_mutation/);
  assert.match(rustRuntimeRequestSource, /pub fn plan_preset_mutation/);
  assert.doesNotMatch(javaSource, /relaySavePresetAs|relayRenamePreset|relayCopyPreset|relayGridVerification/);
  assert.match(javaSource, /stateDecoder\.modelList\(\)/);
  assert.match(javaSource, /relayPresetLibraryRead\(method, params\)/);
  assert.match(rustStateRuntimeSource, /decode_preset_folder/);
  assert.match(rustAndroidSource, /nativePresetSlots/);
  for (const method of ["device.identity", "device.inhibitedModules", "device.presetScreenshot", "device.captureScreen"]) {
    assert.match(rustRuntimeRequestSource, new RegExp(method.replace(".", "\\.")));
  }
  assert.match(
    javaSource,
    /case "CORRELATED_READ":[\s\S]{0,250}relayGatewayRead\(method, params\)/,
  );
  assert.match(javaSource, /relaySetDeviceName\(params\)/);
  assert.match(javaSource, /relayScreenGesture\(method, params\)/);
  assert.match(nativeDecoderSource, /nativePlanGatewayRead/);
  assert.match(nativeDecoderSource, /nativeDecodeGatewayResponse/);
  assert.match(rustResponseSource, /decode_device_identity/);
  assert.match(rustResponseSource, /decode_inhibited_modules/);
  assert.match(rustResponseSource, /decode_preset_screenshot/);
  assert.match(rustResponseSource, /decode_captured_screen/);
  assert.doesNotMatch(javaSource, /VersionMessage|ScreenshotMessage|CompilerInhibitedModulesMessage|RemoteControlMessage/);
});

test("Android keeps exact local gateway parity while its remote surface honors explicit exclusions", () => {
  const remote = new Set(["system.status", ...actionContract.actions.map((action: { rpc: string }) => action.rpc)]);
  const gateway = gatewayContract.methods.map((method: { rpc: string }) => method.rpc);
  assert.deepEqual(
    gateway.filter((method: string) => !remote.has(method)),
    actionContract.localOnlyGatewayRpcs,
  );
  for (const method of remote) {
    assert.match(remoteActionsSource, new RegExp(`"${method.replace(".", "\\.")}"`));
  }
  for (const method of gateway) {
    assert.match(generatedGatewaySource, new RegExp(`"${method.replace(".", "\\.")}"`));
  }
  for (const implementation of [
    "relayReconnect", "relayDisconnect", "relayStateEvents", "relayTempoClock",
    "relayCreateBackup"
  ]) assert.match(javaSource, new RegExp(implementation.replace(".", "\\.")));
  assert.match(javaSource, /relayPreviewParameter\(method, params\)/);
  assert.match(nativeDecoderSource, /nativeTempoClock/);
  assert.match(nativeDecoderSource, /nativeConsumeBackupChunk/);
  assert.match(rustAndroidSource, /decode_tempo_clock/);
  assert.match(rustAndroidSource, /BackupRuntime/);
  assert.match(rustBackupRuntimeSource, /BackupAssembler/);
  assert.match(javaSource, /public void gatewayInvoke\(PluginCall call\)/);
  assert.match(servicesSource, /gatewayInvoke<T>\(options:/);
});

test("Android persists backups and requires a fresh synchronized USB session before completion", () => {
  assert.match(javaSource, /MediaStore\.Downloads\.EXTERNAL_CONTENT_URI/);
  assert.match(javaSource, /R\.string\.download_folder/);
  assert.match(javaSource, /metadataIo\.execute\(\(\) -> \{[\s\S]*saveBackupDocument/);
  assert.match(javaSource, /QcUsbProfile\.BACKUP_MAXIMUM_DOCUMENT_BYTES/);
  assert.match(usbProfileSource, /BACKUP_MAXIMUM_DOCUMENT_BYTES = 33554432/);
  assert.doesNotMatch(javaSource, /pending\.result\.complete\(JSObject\.fromJSONObject\(\(org\.json\.JSONObject\) update\.get\("backup"\)\)\)/);
  assert.match(javaSource, /recoverSessionAfterBackup\(pending\)/);
  assert.match(javaSource, /pendingBackup = null;[\s\S]*pendingOperations\.remove\(pending\)[\s\S]*relayReconnect\("USB session restored after device backup"\)/);
  assert.match(javaSource, /relayReconnect\("USB session restored after device backup"\)[\s\S]*pending\.result\.complete\(savedResult\)/);
  assert.match(javaSource, /The backup was saved, but the Quad Cortex session did not recover/);
  assert.doesNotMatch(javaSource, /completePendingBackupRecovery|recoveryAfterState/);
  for (const method of ["device.captureScreen", "device.presetScreenshot", "device.captures", "device.irs"])
    assert.match(javaSource, new RegExp(method.replace(".", "\\.")));
  assert.match(javaSource, /relayReconnect\("USB session refreshed for high-volume read"\)/);
});

test("Android 16 starts the connected-device relay only after the USB permission prerequisite", () => {
  assert.match(androidManifestSource, /android\.permission\.FOREGROUND_SERVICE_CONNECTED_DEVICE/);
  assert.doesNotMatch(androidManifestSource, /android\.permission\.CHANGE_NETWORK_STATE/);
  assert.match(androidManifestSource, /android:foregroundServiceType="connectedDevice"/);
  assert.match(javaSource, /static boolean relayForegroundServiceEligible\(\)/);
  assert.match(javaSource, /manager\.hasPermission\(candidate\)/);
  assert.match(relayServiceSource, /if \(!QcUsbPlugin\.relayForegroundServiceEligible\(\)\)[\s\S]{0,300}stopSelf\(\)/);
  assert.match(relayPluginSource, /USB_PERMISSION_REQUIRED/);
  assert.match(appSource, /autoStart: false/);
  assert.match(appSource, /usbConnected[\s\S]{0,250}relayWorkflow\.start\(\)/);
});

test("Master Volume uses authoritative QC state between coalesced Android writes", () => {
  assert.match(continuousControlSource, /gateway\.setMasterVolume\(target, controller\.snapshotRef\.current\.masterVolume\)/);
  assert.doesNotMatch(continuousControlSource, /reconcile\(\{ \.\.\.controller\.snapshotRef\.current, masterVolume: value \}\);\s*notice\(`Master Volume:/);
  assert.match(rustStateSource, /decode_master_volume/);
  assert.match(javaSource, /"master"\.equals\(kind\)[\s\S]*currentMasterVolume/);
});

test("Android I/O and Gig View mirror the physical QC screen and live assignments", () => {
  assert.doesNotMatch(javaSource, /public void swipeScreen\(PluginCall call\)/);
  assert.doesNotMatch(javaSource, /public void tapScreenDirect\(PluginCall call\)/);
  assert.doesNotMatch(servicesSource, /swipeScreen\(options:/);
  assert.match(rustCommandsSource, /pub fn screen_drag[\s\S]*remote_control_mouse::Type::Drag/);
  assert.match(javaSource, /writeMessages\(plan\.messages, plan\.interMessageIntervalMs\)/);
  assert.match(javaSource, /interMessageIntervalMs > 0[\s\S]*Thread\.sleep\(interMessageIntervalMs\)/);
  assert.match(rustRuntimeRequestSource, /operation_inter_message_interval_ms[\s\S]*REMOTE_GESTURE_INTERVAL_MS/);
  assert.match(usbProfileSource, /REMOTE_GESTURE_INTERVAL_MS = 20L/);
  assert.match(appSource, /androidGatewayTransport\.swipeScreen\([\s\S]*qcRemoteScreen\.openIo\.x/);
  assert.match(appSource, /androidGatewayTransport\.tapScreen\([\s\S]*qcRemoteScreen\.done\.x/);
  assert.match(appSource, /androidGatewayTransport\.showGigView\(true\)/);
  assert.match(corOsScreensSource, /snapshot\.footswitchModes\?\.\[index < 4 \? 0 : 1\]/);
  assert.match(corOsScreensSource, /listedPresets\.find\(\(candidate\) => candidate\.position === position\)/);
});

test("Android refreshes stale high-volume USB reads before requesting their streams", () => {
  assert.match(javaSource, /device\.captureScreen[\s\S]*device\.presetScreenshot[\s\S]*relayReconnect\("USB session refreshed for high-volume read"\)/);
  assert.match(javaSource, /restoreUsbSessionAfterHighVolumeRead\([\s\S]*relayGatewayReadWithRecovery\(method, readParams\)/);
  assert.match(javaSource, /restoreUsbSessionAfterHighVolumeRead/);
  assert.match(javaSource, /relayReconnect\("USB session restored after high-volume read"\)/);
  assert.match(javaSource, /_freshUsbSession[\s\S]*relayReconnect\("USB session refreshed for preset catalog"\)/);
});

test("Android exposes the latest rejected gateway frame correlation in diagnostics", () => {
  assert.match(javaSource, /lastGatewayReadMismatch/);
  assert.match(javaSource, /lastGatewayReadMismatch = "type " \+ messageType/);
});

test("Android exposes physical USB health and worst-case write latency through remote status", () => {
  assert.match(javaSource, /\.put\("usbDiagnostics", usbDiagnostics\(\)\)/);
  assert.match(javaSource, /maxHidWriteDurationMs = Math\.max\(maxHidWriteDurationMs, lastHidWriteDurationMs\)/);
  assert.match(javaSource, /result\.put\("maxHidWriteDurationMs", maxHidWriteDurationMs\)/);
  assert.match(javaSource, /result\.put\("maxMidiQueueDelayMs", maxMidiQueueDelayMs\)/);
  assert.match(javaSource, /result\.put\("readerRequestActive", inputRequests != null && inputRequests\.length > 0\)/);
});

test("Android rebuilds a stale USB session and retries recoverable reads once", () => {
  assert.match(javaSource, /\(\(RelayException\) cause\)\.retryable\(\)/);
  assert.match(javaSource, /gatewayReadRecoveries\+\+/);
  assert.match(javaSource, /relayReconnect\("USB session recovered after read interruption"\)[\s\S]*relayGatewayReadOnCurrentSession\(method, readParams\)/);
  assert.match(javaSource, /result\.put\("gatewayReadRecoveries", gatewayReadRecoveries\)/);
  assert.doesNotMatch(javaSource, /USB session recovered after read interruption[\s\S]*relayGatewayRead\(method, readParams\)/);
  assert.match(rustRuntimeRequestSource, /"device\.tapScreen" \| "device\.swipeScreen" => Some\("device\.captureScreen"\)/);
  assert.match(javaSource, /relayScreenGesture[\s\S]{0,300}relayPlannedGatewayWriteWithReadback\(method, params\)/);
});

test("device-name writes use the shared bounded authoritative readback without replay", () => {
  assert.match(rustRuntimeRequestSource, /"device\.setDeviceName" => Some\("device\.identity"\)/);
  assert.match(rustRuntimeRequestSource, /"device\.setDeviceName" => \{[\s\S]*\("name", "customName"\)/);
  assert.match(javaSource, /relaySetDeviceName[\s\S]*relayPlannedGatewayWriteWithReadback\([\s\S]*"device\.setDeviceName"/);
  assert.match(javaSource, /result\.getJSONObject\("readback"\)/);
});

test("Android verifies timed-out structural writes after reconnect without replaying them", () => {
  assert.match(javaSource, /recoverGatewayWriteVerification\(result, plan\)/);
  assert.match(javaSource, /gatewayWriteRecoveries\+\+/);
  assert.match(javaSource, /relayReconnect\("USB session recovered after write verification timeout"\)[\s\S]*verifyGatewayWriteAfterReconnect\(plan\)/);
  assert.match(javaSource, /gatewayTransactionState\([\s\S]*plan, 0, now \+ 1_000, observationSequence, now\)/);
  assert.match(javaSource, /"verification", "authoritative_reconnect_readback"/);
  assert.match(javaSource, /the write was not replayed/i);
  assert.match(javaSource, /result\.put\("gatewayWriteRecoveries", gatewayWriteRecoveries\)/);
});

test("modern Android keeps a buffered interrupt-read ring queued across idle periods", () => {
  assert.match(javaSource, /Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.O/);
  assert.match(javaSource, /@RequiresApi\(Build\.VERSION_CODES\.O\)[\s\S]*readInputReportsAsync/);
  assert.match(javaSource, /HID_INPUT_REQUEST_DEPTH = 32/);
  assert.match(javaSource, /UsbRequest\[\] requests = new UsbRequest\[HID_INPUT_REQUEST_DEPTH\]/);
  assert.match(javaSource, /requests\[index\]\.queue\(buffer\)[\s\S]*activeConnection\.requestWait\(\)/);
  assert.match(javaSource, /completed\.queue\(buffer\)/);
  assert.doesNotMatch(javaSource, /requestWait\(\d+/);
  assert.match(javaSource, /inputRequest\.cancel\(\)[\s\S]*inputRequest\.close\(\)[\s\S]*releaseInterface/);
  assert.match(javaSource, /activeConnection\.bulkTransfer\(activeEndpoint[\s\S]*readerIsActive/);
});

test("Android rejects teardown-shortened HID reads before JNI and JNI cannot unwind", () => {
  assert.match(javaSource, /if \(count < 2 \|\| count > buffer\.length\)[\s\S]{0,220}Discarded truncated QC HID report/);
  assert.match(rustAndroidSource, /nativePushReport[\s\S]{0,400}catch_unwind/);
  assert.match(rustTransportRuntimeSource, /if raw\.len\(\) < 2 \|\| raw\.len\(\) > framing::REPORT_BODY_SIZE/);
  assert.match(rustTransportRuntimeSource, /fn every_native_read_length_is_total/);
});

test("Android explains the Remote notification before requesting permission", () => {
  assert.match(relayPluginSource, /Allow Remote notifications\?/);
  assert.match(relayPluginSource, /Android requires one low-priority, ongoing notification/);
  assert.match(relayPluginSource, /USB control and chat do not use notifications/);
  assert.match(relayPluginSource, /setNegativeButton\("Not now"/);
  assert.match(relayPluginSource, /setPositiveButton\("Continue"/);
});

test("Android relay does not disclose the hardware model as its default device name", () => {
  assert.match(relayPluginSource, /call\.getString\("deviceName", "QC Remote on Android"\)/);
  assert.doesNotMatch(relayPluginSource, /Build\.MODEL/);
});

test("Android relay preserves native error codes across completion wrappers", () => {
  assert.match(relayServiceSource, /Throwable cause = unwrapCompletion\(error\)/);
  assert.match(relayServiceSource, /cause instanceof QcUsbPlugin\.RelayException[\s\S]{0,120}\(\(QcUsbPlugin\.RelayException\) cause\)\.code/);
  assert.match(relayServiceSource, /while \(cause instanceof java\.util\.concurrent\.CompletionException/);
  assert.doesNotMatch(relayServiceSource, /Log\.\w+\([^;]*(?:Authorization|Bearer|credential)/i);
});

test("Android ADB diagnostics discover the app WebView independently of product branding", () => {
  assert.match(androidWebViewAdbSource, /candidate\.url\?\.startsWith\("https:\/\/localhost\/"\)/);
  assert.doesNotMatch(androidWebViewAdbSource, /candidate\.title\s*===/);
});

test("Android ADB tools share one bounded WebView transport implementation", () => {
  for (const source of adbToolSources) {
    assert.match(source, /from "\.\/android-webview-adb\.mjs"/);
    assert.doesNotMatch(source, /spawnSync|function cdp|\/proc\/net\/unix|candidate\.title\s*===/);
  }
  assert.match(androidWebViewAdbSource, /spawnSync/);
  assert.match(androidWebViewAdbSource, /socket\?\.close\(\)/);
  assert.match(androidWebViewAdbSource, /"forward", "--remove"/);
  assert.match(androidWebViewAdbSource, /AbortSignal\.timeout/);
  assert.match(androidWebViewAdbSource, /Android WebView debugger disconnected/);
  assert.match(androidWebViewAdbSource, /if \(!\/\^\\d\+\$\/\.test\(String\(value\)\)\)/);
});

test("Android refreshes authoritative preset state before projecting block details", () => {
  assert.match(javaSource, /case "BLOCK_DETAILS": return relayBlockDetails\(method, params\)/);
  assert.match(javaSource, /relayBlockDetails[\s\S]{0,1400}relayGatewayRead\("device\.currentPreset"[\s\S]{0,800}stateDecoder\.blockDetails[\s\S]{0,500}stateDecoder\.laneControlDetails/);
  assert.doesNotMatch(javaSource, /PendingBlockDetailsRead|resolvePendingBlockDetailsReads/);
  assert.match(deviceBrokerRpcSource, /fn gateway_block_details[\s\S]{0,500}refresh_current_preset_state\(controller\)/);
  assert.match(deviceBrokerRpcSource, /fn gateway_lane_control_details[\s\S]{0,500}refresh_current_preset_state\(controller\)/);
});

test("Android retries stale settings readback without replaying the mutation", () => {
  assert.match(javaSource, /stateDecoder\.gatewayPlan\(method, JSObject\.fromJSONObject\(params\)\)/);
  assert.match(javaSource, /relayGatewayRead\(plan\.preflightMethod/);
  assert.match(javaSource, /executeRelayPlan\(plan\)\.thenCompose\(writeResult -> plan\.readbackMethod == null/);
  assert.match(javaSource, /stateDecoder\.gatewayReadbackRetryDelay\(method, attempt\)/);
  assert.match(nativeDecoderSource, /nativeGatewayReadbackRetryDelay/);
  assert.match(rustRuntimeRequestSource, /CORRELATED_WRITE_READBACK_RETRY_INTERVALS_MS\.to_vec\(\)/);
  assert.match(javaSource, /relayGatewayWriteReadback[\s\S]{0,2200}gatewayReadbackMatches/);
  assert.doesNotMatch(
    javaSource,
    /relayGatewayWriteReadback[\s\S]{0,2200}(?:writeMessages|relayPlannedGatewayWrite)\(/,
    "readback recovery must never replay a potentially applied settings mutation",
  );
});

test("Android provides a configuration-independent splash fallback", () => {
  assert.match(splashFallbackSource, /<shape[\s\S]*<solid android:color="@color\/brandBackground"/);
});

test("Android bridge logs never expose relay credentials or pairing codes", () => {
  assert.equal(JSON.parse(capacitorConfigSource).loggingBehavior, "none");
});

test("Android requires explicit attachment connect but recovers an unexpected reader exit", () => {
  assert.match(javaSource, /ACTION_USB_DEVICE_ATTACHED/);
  assert.doesNotMatch(javaSource, /scheduleAutomaticReconnect\("Quad Cortex USB reattached"\)/);
  assert.match(javaSource, /boolean recoverReader = readerIsActive\(activeConnection, generation\)/);
  assert.match(javaSource, /sessionTerminalReadFailed\(\)[\s\S]*scheduleAutomaticReconnect\("QC HID reader recovered after interruption"\)/);
  assert.match(javaSource, /catch \(Exception error\)[\s\S]{0,700}recoverUnexpectedReaderExit\(activeConnection, generation\)/);
  assert.match(javaSource, /sessionScheduleReconnect\(monotonicMillis\(\)\)/);
  assert.match(javaSource, /sessionReconnectDue\(now\)/);
  assert.match(javaSource, /sessionReconnectAttempted\(now\)/);
  assert.match(javaSource, /stateDecoder\.nextRequestId\(\)/);
  assert.doesNotMatch(javaSource, /AtomicLong requestIds/);
  assert.match(javaSource, /if \(!stateDecoder\.sessionSynchronized\(\)\) \{\s*stateDecoder\.initializationObserved\(decoded\.messageType, decoded\.payload\)/);
  assert.match(javaSource, /synchronizationChanged[\s\S]*sessionStateObserved\([\s\S]*decision\.synchronizedState/);
  assert.match(javaSource, /decision\.beginBuilding[\s\S]*sessionStateObserved\(monotonicMillis\(\), false\)/);
  assert.doesNotMatch(javaSource, /scheduleAutomaticReconnect[\s\S]{0,800},\s*250,\s*TimeUnit\.MILLISECONDS/);
});

test("Android persists a bounded payload-free USB flight recorder", () => {
  const recorder = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/QcUsbFlightRecorder.java", import.meta.url), "utf8");
  assert.match(javaSource, /new QcUsbFlightRecorder\(getContext\(\)\)/);
  assert.match(javaSource, /flight\.event\("handshake-started"\)/);
  assert.match(javaSource, /flight\.event\("handshake-reply"\)/);
  assert.match(javaSource, /flight\.outbound\(message\.messageType, framedReports\.size\(\)\)/);
  assert.match(javaSource, /flight\.inbound\(decoded\.messageType\)/);
  assert.match(javaSource, /result\.put\("flightRecorder", flight\.snapshot\(\)\)/);
  assert.match(recorder, /MAX_ENTRIES = 256/);
  assert.match(recorder, /qc-usb-flight-recorder\.json/);
  assert.match(recorder, /if \(critical\)[\s\S]{0,300}else if \(now - lastPersistedAt >= CHECKPOINT_INTERVAL_MS\)/);
  assert.match(recorder, /persistenceIo\.execute\([\s\S]{0,180}persist\(snapshot\)/,
    "routine traffic persistence must stay off the USB command and reader lanes");
  assert.match(recorder, /closed = true;[\s\S]{0,240}awaitTermination[\s\S]{0,300}persist\(snapshot\)/,
    "shutdown must drain older checkpoints before the final current snapshot");
  assert.match(recorder, /MAX_FILE_BYTES = 256 \* 1024L/);
  assert.match(recorder, /entries\.addLast\(sanitize\(entry\)\)/);
  assert.match(recorder, /isRoutineLiveness[\s\S]*MESSAGE_TYPE_KEEP_ALIVE/);
  assert.doesNotMatch(recorder, /isRoutineLiveness[\s\S]{0,250}MESSAGE_TYPE_VERSION/);
  assert.match(javaSource, /flight\.activity\(GeneratedGatewayMethods\.contains\(method\)[\s\S]{0,100}"gateway-dispatch:" \+ method/);
  assert.doesNotMatch(javaSource, /gateway-dispatch:" \+ (?:params|expected)/);
  assert.doesNotMatch(recorder, /entry\.put\("(?:payload|serial|deviceName|credential|token)"/i);

  const systemStatus = javaSource.slice(
    javaSource.indexOf('if ("SYSTEM".equals(dispatch))'),
    javaSource.indexOf('if ("RECONNECT".equals(dispatch))'),
  );
  assert.match(systemStatus, /usbDiagnostics\(\)/);
  assert.doesNotMatch(systemStatus, /flightRecorder|flight\.snapshot/,
    "remote system.status must not disclose the local flight record");
});

test("the Android physical handshake probe is explicit, fail-closed, and self-disconnecting", () => {
  assert.match(usbProbeSource, /QC_ANDROID_USB_HANDSHAKE_ACK/);
  assert.match(usbProbeSource, /I_ACCEPT_QC_USB_HANDSHAKE/);
  assert.match(usbProbeSource, /if \(before\.connected\) throw/);
  assert.match(usbProbeSource, /scan\.devices\.length !== 1/);
  assert.match(usbProbeSource, /finally \{[\s\S]{0,120}plugin\.disconnect\(\)/);
  assert.match(usbProbeSource, /finalDiagnostics = connect[\s\S]{0,300}plugin\.diagnostics\(\)/);
  assert.doesNotMatch(usbProbeSource, /gatewayInvoke|QcRelay|pair/);
  assert.match(androidWebViewAdbSource, /candidate\.url\?\.startsWith\("https:\/\/localhost\/"\)/);
  assert.doesNotMatch(androidWebViewAdbSource, /candidate\.title/);
});

test("the Android persistent physical session requires acknowledgement and fails closed", () => {
  assert.match(adbSessionHelperSource, /QC_ANDROID_USB_SESSION_ACK/);
  assert.match(adbSessionHelperSource, /I_ACCEPT_QC_USB_SESSION/);
  assert.match(adbSessionHelperSource, /scan\.devices\.length !== 1/);
  assert.match(adbSessionHelperSource, /after\.connected && after\.setlistKnown && after\.presetPosition >= 0/);
  assert.match(adbSessionHelperSource, /catch \(error\) \{[\s\S]{0,160}plugin\.disconnect\(\)/);
  assert.doesNotMatch(adbSessionHelperSource, /gatewayInvoke|QcRelay|pair|backup/);
});

test("Android's USB maintenance uses the same dedicated shared KeepAlive as Windows", () => {
  const start = javaSource.indexOf("keepalive.scheduleWithFixedDelay");
  const end = javaSource.indexOf("static boolean relaySessionAvailable", start);
  const maintenance = javaSource.slice(start, end);
  assert.match(maintenance, /sessionShouldKeepalive/);
  assert.match(maintenance, /pendingOperations\.isEmpty\(\)/);
  assert.match(maintenance, /stateDecoder\.keepaliveCommand\(\)/);
  assert.match(maintenance, /stateDecoder\.sessionKeepaliveSent\(monotonicMillis\(\)\)/);
  assert.doesNotMatch(javaSource, /stateDecoder\.session\w+\(System\.currentTimeMillis\(\)/);
  assert.doesNotMatch(maintenance, /readCommand\(QcUsbProfile\.MESSAGE_TYPE_VERSION\)/);
  assert.match(javaSource, /MAINTENANCE_POLL_MS = 1000/);
  assert.match(javaSource, /MAINTENANCE_POLL_MS, MAINTENANCE_POLL_MS, TimeUnit\.MILLISECONDS/);
  assert.match(javaSource, /return connection != null && stateDecoder\.sessionConnected\(\)/);
  assert.doesNotMatch(javaSource, /handshakeComplete|stateSynchronized|initializationComplete/);
  assert.match(rustInitializationSource, /SessionValidating[\s\S]*commands::read_version\(\)/);
  assert.doesNotMatch(javaSource, /keepalive\.schedule\([\s\S]{0,500}readCommand\(QcUsbProfile\.MESSAGE_TYPE_VERSION\)/);
});

test("Android state-event reads expose the true tail beyond a paged frame window", () => {
  assert.match(javaSource, /result\.put\("latestSequence", latestSequence\)/);
  assert.match(javaSource, /latestSequence = nextStateSequence - 1/);
});

test("Android refreshes authoritative preset state after non-idempotent history writes", () => {
  assert.match(javaSource, /"device\.undo"\.equals\(method\) \|\| "device\.redo"\.equals\(method\)[\s\S]{0,120}\? relayHistoryWrite\(method, params\)/);
  assert.match(javaSource, /relayHistoryWrite[\s\S]{0,1200}plan\.postWriteRefreshDelayMs/);
  assert.match(javaSource, /relayHistoryWrite[\s\S]{0,900}dispatchGatewayRefresh\(plan\.postWriteRefreshMethod\)/);
  assert.doesNotMatch(javaSource, /currentPresetCommand/);
  assert.match(javaSource, /Undo and redo are non-idempotent[\s\S]{0,180}instead of replaying them/);
});

test("Android retries a backup only before a physical document starts", () => {
  // Windows collects the document on its device loop in worker.rs; Android's
  // equivalent lives in QcUsbPlugin. Both must retry only before a document
  // starts, and never splice two attempts together.
  assert.match(rustAndroidSource, /"started": progress\.started/);
  assert.match(rustAndroidSource, /"ignoredPrefixChunks": progress\.ignored_prefix_chunks/);
  assert.match(javaSource, /scheduleBackupWatchdog\(pending, MAINTENANCE_POLL_MS\)/);
  assert.match(usbProfileSource, /BACKUP_FIRST_CHUNK_TIMEOUT_MS = 60000L/);
  assert.match(usbProfileSource, /BACKUP_STREAM_STALL_TIMEOUT_MS = 15000L/);
  assert.match(javaSource, /stateDecoder\.backupAdvance\(monotonicMillis\(\)\)/);
  assert.match(javaSource, /"rerequest"\.equals\(action\)[\s\S]*issueBackupRequest\(pending\)/);
  assert.match(javaSource, /"failed"\.equals\(action\)[\s\S]*stateDecoder\.backupCancelled\(\)/);
  assert.match(javaSource, /Sending native backup request " \+ pending\.operation\.attempts/);
  assert.match(usbProfileSource, /BACKUP_MAXIMUM_ATTEMPTS = 2/);
  // A started document is terminal on Windows: its branch reports the stall
  // and never reaches the re-request path below it.
  assert.match(rustBackupRuntimeSource, /if self\.assembler\.started\(\)[\s\S]*not combined with a retry/);
  assert.match(rustBackupRuntimeSource, /partial document was discarded and was not combined with a retry/);
  assert.match(rustBackupRuntimeSource, /BACKUP_MAXIMUM_ATTEMPTS[\s\S]*BackupAction::Rerequest/);
  assert.match(javaSource, /stateDecoder\.backupStarted\(monotonicMillis\(\), QcUsbProfile\.BACKUP_TOTAL_TIMEOUT_MS\)/);
});

test("Android preset writes refresh authoritative state without replaying the mutation", () => {
  const verificationPolicy = rustRuntimeRequestSource.slice(
    rustRuntimeRequestSource.indexOf("pub fn gateway_write_verification_policy"),
    rustRuntimeRequestSource.indexOf("fn gateway_verification_refresh_delays"),
  );
  assert.match(verificationPolicy, /"device\.recallPreset"[\s\S]*"device\.navigateBank"[\s\S]*"device\.reloadPreset"/);
  assert.match(javaSource, /stateDecoder\.gatewayVerificationStarted\(/);
  assert.match(javaSource, /"refresh"[\s\S]{0,900}dispatchGatewayRefresh\(action\.getString\("method"\)\)/);
  assert.doesNotMatch(javaSource, /registered != null && plan\.retryable/);
  assert.doesNotMatch(javaSource, /writeMessage\(message, !includeReportId\)/);
  assert.doesNotMatch(javaSource, /isIdempotentGatewayWrite/);
});

test("live QC parameter frames update the open shared editor", () => {
  assert.match(generatedPayloadSource, /\| "parameter"/);
  assert.match(rustStateSource, /StateUpdate::new\("parameter"\)/);
  assert.match(rustStateSource, /parameter_overrides[\s\S]{0,100}\.insert/);
  assert.match(appSource, /useQcLiveState/);
  assert.match(liveStateSource, /state\.kind === "parameter"[\s\S]*editor\.updateParameters/);
});

test("Android queues relay work behind an in-flight USB reconnect", () => {
  assert.match(javaSource, /private volatile CompletableFuture<org\.json\.JSONObject> reconnectInFlight;/);
  assert.match(javaSource, /if \(reconnectInFlight != null\) return reconnectInFlight;/);
  assert.match(javaSource, /return reconnect\.thenComposeAsync\([\s\S]*relayInvoke\(method, deferredParams, deferredExpected\), commandIo\);/);
  assert.doesNotMatch(javaSource, /reconnect\.thenCompose\(ignored -> relayInvoke/);
  assert.match(javaSource, /if \(reconnectInFlight == result\) reconnectInFlight = null;/);
});

test("Android does not publish a header-only preset catalog as an empty folder library", () => {
  assert.match(javaSource, /folders\.length\(\) == 0/);
  assert.match(javaSource, /!params\.optBoolean\("_emptyCatalogRetried", false\)/);
  assert.match(javaSource, /\.put\("_emptyCatalogRetried", true\)/);
  assert.match(javaSource, /return relayPresetLibraryRead\(method, retryParams\);/);
});
