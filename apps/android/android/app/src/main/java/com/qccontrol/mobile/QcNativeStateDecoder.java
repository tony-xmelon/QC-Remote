package com.qccontrol.mobile;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/** Narrow JNI facade over the shared Rust protocol/state engine. */
final class QcNativeStateDecoder implements AutoCloseable {
    static { System.loadLibrary("qc_android"); }

    static final int REPORT_SIZE = nativeReportSize();
    static final int OUT_REPORT_ID = nativeOutboundReportId();
    static final int IN_REPORT_ID = nativeInboundReportId();

    static final class EncodedMessage {
        final int messageType;
        final byte[] payload;

        EncodedMessage(int messageType, byte[] payload) {
            this.messageType = messageType;
            this.payload = payload;
        }
    }

    static final class DecodedFrame {
        final int messageType;
        final byte[] payload;

        DecodedFrame(int messageType, byte[] payload) {
            this.messageType = messageType;
            this.payload = payload;
        }
    }

    static final class PlannedGatewayWrite {
        final String method;
        final String detail;
        final String verificationJson;
        final boolean midi;
        final int controller;
        final int value;
        final boolean realtime;
        final long interMessageIntervalMs;
        final long confirmationTimeoutMs;
        final String postWriteRefreshMethod;
        final long postWriteRefreshDelayMs;
        final String preflightMethod;
        final String readbackMethod;
        final List<EncodedMessage> messages;

        PlannedGatewayWrite(
            String method, String detail, String verificationJson, boolean midi, int controller, int value,
            boolean realtime, long interMessageIntervalMs,
            long confirmationTimeoutMs,
            String postWriteRefreshMethod, long postWriteRefreshDelayMs,
            String preflightMethod, String readbackMethod, List<EncodedMessage> messages
        ) {
            this.method = method;
            this.detail = detail;
            this.verificationJson = verificationJson;
            this.midi = midi;
            this.controller = controller;
            this.value = value;
            this.realtime = realtime;
            this.interMessageIntervalMs = interMessageIntervalMs;
            this.confirmationTimeoutMs = confirmationTimeoutMs;
            this.postWriteRefreshMethod = postWriteRefreshMethod;
            this.postWriteRefreshDelayMs = postWriteRefreshDelayMs;
            this.preflightMethod = preflightMethod;
            this.readbackMethod = readbackMethod;
            this.messages = messages;
        }
    }

    static final class PlannedGatewayStage {
        final long timeoutMs;
        final long settleMs;
        final String verificationJson;
        final List<EncodedMessage> messages;

        PlannedGatewayStage(
            long timeoutMs, long settleMs, String verificationJson,
            List<EncodedMessage> messages
        ) {
            this.timeoutMs = timeoutMs;
            this.settleMs = settleMs;
            this.verificationJson = verificationJson;
            this.messages = messages;
        }
    }

    static final class PlannedGatewayWorkflow {
        final String detail;
        final String savedName;
        final String setlistKey;
        final int position;
        final int instrument;
        final JSONArray savedPresets;
        final List<PlannedGatewayStage> stages;

        PlannedGatewayWorkflow(
            String detail, String savedName, String setlistKey, int position, int instrument,
            JSONArray savedPresets, List<PlannedGatewayStage> stages
        ) {
            this.detail = detail;
            this.savedName = savedName;
            this.setlistKey = setlistKey;
            this.position = position;
            this.instrument = instrument;
            this.savedPresets = savedPresets;
            this.stages = stages;
        }
    }

    static final class PlannedGatewayRead {
        final int responseType;
        final long timeoutMs;
        final String projectionJson;
        final String followupMethod;
        final List<EncodedMessage> messages;

        PlannedGatewayRead(
            int responseType, long timeoutMs, String projectionJson,
            String followupMethod, List<EncodedMessage> messages
        ) {
            this.responseType = responseType;
            this.timeoutMs = timeoutMs;
            this.projectionJson = projectionJson;
            this.followupMethod = followupMethod;
            this.messages = messages;
        }
    }

    private long handle = nativeCreate();

    List<JSObject> decode(int messageType, byte[] payload) throws Exception {
        return objects(nativeDecode(requireHandle(), messageType, payload));
    }

    List<JSObject> installModelRepo(byte[] payload) throws Exception {
        return objects(nativeInstallModelRepo(requireHandle(), payload));
    }

    JSObject blockDetails(int row, int column) throws Exception {
        return new JSObject(nativeBlockDetails(requireHandle(), row, column));
    }

    JSObject laneControlDetails(int row, String control) throws Exception {
        return new JSObject(nativeLaneControlDetails(requireHandle(), row, control));
    }

    JSObject snapshot() throws Exception { return new JSObject(nativeSnapshot(requireHandle())); }
    JSObject modelList() throws Exception { return new JSObject(nativeModelList(requireHandle())); }
    JSObject presetFolders() throws Exception { return new JSObject(nativePresetFolders(requireHandle())); }
    JSObject presetList(String setlistKey) throws Exception { return new JSObject(nativePresetList(requireHandle(), setlistKey)); }
    JSObject presetSlots() throws Exception { return new JSObject(nativePresetSlots(requireHandle())); }
    JSObject mergeExpectedState(JSObject params, JSObject expected) throws Exception {
        return new JSObject(nativeMergeExpectedState(params.toString(), expected.toString()));
    }

    int modelCount() { return nativeModelCount(requireHandle()); }

    void sessionOpened(long nowMs) { nativeSessionOpened(requireHandle(), nowMs); }
    void sessionHandshakeComplete(long nowMs, boolean synchronizedState) {
        nativeSessionHandshakeComplete(
            requireHandle(), nowMs, synchronizedState ? 1 : 0);
    }
    void sessionStateObserved(long nowMs, boolean presetSynchronized) {
        nativeSessionStateObserved(requireHandle(), nowMs, presetSynchronized ? 1 : 0);
    }
    boolean sessionShouldKeepalive(long nowMs) {
        return nativeSessionShouldKeepalive(requireHandle(), nowMs) == 1;
    }

    static final class StartupDecision {
        static final int WAIT = 0;
        static final int SEND = 1;
        static final int CONNECTED = 2;
        static final int INVALID = 3;
        static final int FAILED = 4;

        final int kind;
        final String phase;
        final boolean beginBuilding;
        final String error;
        final List<EncodedMessage> messages;

        StartupDecision(
            int kind, String phase, boolean beginBuilding, String error,
            List<EncodedMessage> messages
        ) {
            this.kind = kind;
            this.phase = phase;
            this.beginBuilding = beginBuilding;
            this.error = error;
            this.messages = messages;
        }
    }

    static final class HandshakeDecision {
        static final int WAIT = 0;
        static final int SEND = 1;
        static final int TIMED_OUT = 2;

        final int kind;
        final int attempt;
        final long requestId;
        final boolean includeReportId;
        final StartupDecision startup;

        HandshakeDecision(
            int kind, int attempt, long requestId, boolean includeReportId,
            StartupDecision startup
        ) {
            this.kind = kind;
            this.attempt = attempt;
            this.requestId = requestId;
            this.includeReportId = includeReportId;
            this.startup = startup;
        }
    }

    static final class InitializationDecision {
        static final int WAIT = 0;
        static final int SEND = 1;
        static final int COMPLETE = 2;

        final int kind;
        final boolean synchronizedState;
        final List<EncodedMessage> messages;

        InitializationDecision(int kind, boolean synchronizedState, List<EncodedMessage> messages) {
            this.kind = kind;
            this.synchronizedState = synchronizedState;
            this.messages = messages;
        }
    }
    void sessionKeepaliveSent(long nowMs) { nativeSessionKeepaliveSent(requireHandle(), nowMs); }
    void sessionOutbound(long nowMs) { nativeSessionOutbound(requireHandle(), nowMs); }
    void sessionDisconnected(long nowMs) { nativeSessionDisconnected(requireHandle(), nowMs); }
    long sessionScheduleReconnect(long nowMs) {
        return nativeSessionScheduleReconnect(requireHandle(), nowMs);
    }
    boolean sessionReconnectDue(long nowMs) {
        return nativeSessionReconnectDue(requireHandle(), nowMs) == 1;
    }
    void sessionReconnectAttempted(long nowMs) {
        nativeSessionReconnectAttempted(requireHandle(), nowMs);
    }

    HandshakeDecision handshakeAttempt(long nowMs, String sessionId) {
        try {
            JSONObject decision = new JSONObject(
                nativeHandshakeAttempt(requireHandle(), nowMs, sessionId));
            int kind = decision.getInt("kind");
            if (kind < HandshakeDecision.WAIT || kind > HandshakeDecision.TIMED_OUT)
                throw new IllegalStateException("Native QC handshake decision is invalid.");
            if (kind != HandshakeDecision.SEND)
                return new HandshakeDecision(kind, 0, 0, false, null);
            return new HandshakeDecision(
                kind, decision.getInt("attempt"), nonNegativeLong(decision, "requestId"),
                decision.getBoolean("includeReportId"),
                startupDecision(decision.getJSONObject("startup")));
        } catch (Exception error) {
            throw new IllegalStateException("Native QC handshake decision is invalid.", error);
        }
    }

    StartupDecision startupObserved(int messageType, byte[] payload) {
        return startupDecision(nativeStartupObserved(requireHandle(), messageType, payload));
    }

    StartupDecision startupBeginBuilding() {
        return startupDecision(nativeStartupBeginBuilding(requireHandle()));
    }

    boolean startupConnected() {
        return nativeStartupConnected(requireHandle()) == 1;
    }

    void postBootInitializationStarted(long nowMs, long requestId) {
        nativePostBootInitializationStarted(requireHandle(), nowMs, requestId);
    }

    void initializationObserved(int messageType) {
        nativeInitializationObserved(requireHandle(), messageType);
    }

    InitializationDecision initializationAdvance(long nowMs) {
        try {
            JSONObject decision = new JSONObject(nativeInitializationAdvance(requireHandle(), nowMs));
            int kind = decision.getInt("kind");
            if (kind < InitializationDecision.WAIT || kind > InitializationDecision.COMPLETE)
                throw new IllegalStateException("Native QC initialization decision is invalid.");
            return new InitializationDecision(
                kind, decision.getBoolean("synchronized"),
                encodedMessages(decision.getJSONArray("messages")));
        } catch (Exception error) {
            throw new IllegalStateException("Native QC initialization decision is invalid.", error);
        }
    }

    private static StartupDecision startupDecision(String raw) {
        try {
            return startupDecision(new JSONObject(raw));
        } catch (Exception error) {
            throw new IllegalStateException("Native QC startup decision is invalid.", error);
        }
    }

    private static StartupDecision startupDecision(JSONObject decision) throws Exception {
        int kind = decision.getInt("kind");
        if (kind < StartupDecision.WAIT || kind > StartupDecision.FAILED)
            throw new IllegalStateException("Native QC startup decision is invalid.");
        return new StartupDecision(
            kind, decision.getString("phase"), decision.getBoolean("beginBuilding"),
            nullableString(decision, "error"),
            encodedMessages(decision.getJSONArray("messages")));
    }

    void catalogVerificationStarted(long verificationId, long nowMs) {
        nativeCatalogVerificationStarted(requireHandle(), verificationId, nowMs);
    }

    JSObject catalogVerificationAdvance(long verificationId, long nowMs) throws Exception {
        return new JSObject(nativeCatalogVerificationAdvance(requireHandle(), verificationId, nowMs));
    }

    void catalogListingObserved(long verificationId, long nowMs, boolean matches) {
        nativeCatalogListingObserved(requireHandle(), verificationId, nowMs, matches ? 1 : 0);
    }

    void catalogVerificationCancelled(long verificationId) {
        nativeCatalogVerificationCancelled(requireHandle(), verificationId);
    }

    EncodedMessage readCommand(int messageType) throws Exception {
        return one("read", new JSObject().put("messageType", messageType));
    }

    EncodedMessage keepaliveCommand() throws Exception {
        return one("keepalive", new JSObject());
    }

    EncodedMessage systemTimeCommand(long unixTimeMs) throws Exception {
        return one("systemTime", new JSObject().put("unixTimeMs", unixTimeMs));
    }

    EncodedMessage backupCommand() throws Exception {
        return one("backup", new JSObject());
    }

    JSObject tempoClock(byte[] payload) throws Exception {
        String json = nativeTempoClock(payload);
        return "null".equals(json) ? null : new JSObject(json);
    }

    void backupStarted(long nowMs, long timeoutMs) {
        nativeBackupStarted(requireHandle(), nowMs, timeoutMs);
    }

    JSObject backupAdvance(long nowMs) throws Exception {
        return new JSObject(nativeBackupAdvance(requireHandle(), nowMs));
    }

    void backupCancelled() { nativeBackupCancelled(requireHandle()); }

    JSObject consumeBackupChunk(byte[] payload, String name, long nowMs) throws Exception {
        return new JSObject(nativeConsumeBackupChunk(requireHandle(), payload, name, nowMs));
    }

    PlannedGatewayWrite gatewayPlan(String method, JSObject args) throws Exception {
        JSONObject plan = new JSONObject(nativePlanGatewayWrite(requireHandle(), method, args.toString()));
        String lane = plan.getString("lane");
        if (!"hid".equals(lane) && !"midi".equals(lane))
            throw new IllegalStateException("Native QC gateway execution lane is invalid.");
        return new PlannedGatewayWrite(
            plan.getString("method"), plan.getString("detail"), plan.getJSONObject("verification").toString(),
            "midi".equals(lane), plan.getInt("controller"), plan.getInt("value"),
            plan.getBoolean("realtime"), nonNegativeLong(plan, "interMessageIntervalMs"),
            nonNegativeLong(plan, "confirmationTimeoutMs"),
            nullableString(plan, "postWriteRefreshMethod"),
            nonNegativeLong(plan, "postWriteRefreshDelayMs"),
            nullableString(plan, "preflightMethod"), nullableString(plan, "readbackMethod"),
            encodedMessages(plan.getJSONArray("messages")));
    }

    int gatewayTransactionState(
        PlannedGatewayWrite plan, long afterSequence, long deadlineMs,
        long observationSequence, long nowMs
    ) {
        return nativeGatewayTransactionState(
            requireHandle(), plan.verificationJson, afterSequence,
            deadlineMs, observationSequence, nowMs);
    }

    boolean gatewayReadbackMatches(String method, org.json.JSONObject params, org.json.JSONObject response) {
        return nativeGatewayReadbackMatches(method, params.toString(), response.toString()) == 1;
    }

    long gatewayReadbackRetryDelay(String method, int attempt) {
        return nativeGatewayReadbackRetryDelay(method, attempt);
    }

    long gatewayVerificationStarted(
        PlannedGatewayWrite plan, long afterSequence, long startedAtMs
    ) {
        return nativeGatewayVerificationStarted(
            requireHandle(), plan.verificationJson, plan.method, afterSequence,
            startedAtMs, plan.confirmationTimeoutMs);
    }

    JSONObject gatewayVerificationAdvance(
        long verificationId, long observationSequence, long nowMs
    ) throws Exception {
        return new JSONObject(nativeGatewayVerificationAdvance(
            requireHandle(), verificationId, observationSequence, nowMs));
    }

    void gatewayVerificationCancelled(long verificationId) {
        nativeGatewayVerificationCancelled(requireHandle(), verificationId);
    }

    boolean storedPresetNameMatches(String requested, String stored) {
        return nativeStoredPresetNameMatches(requested, stored) == 1;
    }

    boolean gatewayWritePreflightMatches(String method, JSONObject params, JSONObject response) {
        return nativeGatewayWritePreflightMatches(method, params.toString(), response.toString()) == 1;
    }

    JSONObject composeGlobalTempoSettings(JSONObject global, JSONObject preset) throws Exception {
        return new JSONObject(nativeComposeGlobalTempoSettings(global.toString(), preset.toString()));
    }

    PlannedGatewayWorkflow gatewayWorkflow(String method, JSObject args) throws Exception {
        JSONObject plan = new JSONObject(nativePlanGatewayWorkflow(requireHandle(), method, args.toString()));
        JSONArray stageValues = plan.getJSONArray("stages");
        List<PlannedGatewayStage> stages = new ArrayList<>(stageValues.length());
        for (int index = 0; index < stageValues.length(); index++) {
            JSONObject stage = stageValues.getJSONObject(index);
            stages.add(new PlannedGatewayStage(
                nonNegativeLong(stage, "timeoutMs"), nonNegativeLong(stage, "settleMs"),
                stage.getJSONObject("verification").toString(),
                encodedMessages(stage.getJSONArray("messages"))));
        }
        return new PlannedGatewayWorkflow(
            plan.getString("detail"), plan.getString("savedName"), plan.getString("setlistKey"),
            plan.getInt("position"), plan.getInt("instrument"),
            plan.optJSONArray("savedPresets") == null ? new JSONArray() : plan.optJSONArray("savedPresets"), stages);
    }

    void recordSavedPreset(PlannedGatewayWorkflow workflow) {
        if (workflow.savedPresets.length() == 0) return;
        for (int index = 0; index < workflow.savedPresets.length(); index++) {
            JSONObject preset = workflow.savedPresets.optJSONObject(index);
            if (preset == null) continue;
            nativeRecordSavedPreset(
                requireHandle(), preset.optString("setlistKey"), preset.optInt("position"),
                preset.optString("name"), preset.optInt("instrument"));
        }
    }

    PlannedGatewayRead gatewayRead(String method, JSObject args, long requestId) throws Exception {
        JSONObject plan = new JSONObject(nativePlanGatewayRead(method, args.toString(), requestId));
        return new PlannedGatewayRead(
            plan.getInt("responseType"), nonNegativeLong(plan, "timeoutMs"),
            plan.getJSONObject("projection").toString(),
            nullableString(plan, "followupMethod"),
            encodedMessages(plan.getJSONArray("messages")));
    }

    JSObject decodeGatewayResponse(PlannedGatewayRead plan, byte[] payload) throws Exception {
        return new JSObject(nativeDecodeGatewayResponse(plan.projectionJson, payload));
    }

    boolean gatewayResponseMatches(PlannedGatewayRead plan, int messageType, byte[] payload) {
        return nativeGatewayResponseMatches(
            plan.projectionJson, plan.responseType, messageType, payload) == 1;
    }

    List<byte[]> encodeFrame(EncodedMessage message) {
        byte[] encoded = nativeEncodeFrame(message.messageType, message.payload);
        if (encoded.length == 0 || encoded.length % REPORT_SIZE != 0) {
            throw new IllegalStateException("Native QC framing returned an invalid report sequence.");
        }
        List<byte[]> reports = new ArrayList<>(encoded.length / REPORT_SIZE);
        for (int offset = 0; offset < encoded.length; offset += REPORT_SIZE) {
            reports.add(Arrays.copyOfRange(encoded, offset, offset + REPORT_SIZE));
        }
        return reports;
    }

    DecodedFrame pushReport(byte[] report) {
        byte[] decoded = nativePushReport(requireHandle(), report);
        if (decoded.length == 0) return null;
        if (decoded.length < 2) throw new IllegalStateException("Native QC framing returned no message trailer.");
        int messageType = (decoded[0] & 0xff) | ((decoded[1] & 0xff) << 8);
        return new DecodedFrame(messageType, Arrays.copyOfRange(decoded, 2, decoded.length));
    }

    synchronized void reset() { nativeReset(requireHandle()); }

    @Override
    public synchronized void close() {
        if (handle == 0) return;
        nativeDestroy(handle);
        handle = 0;
    }

    private synchronized long requireHandle() {
        if (handle == 0) throw new IllegalStateException("Native QC decoder is closed.");
        return handle;
    }

    private EncodedMessage one(String command, JSObject args) throws Exception {
        List<EncodedMessage> messages = commands(command, args);
        if (messages.size() != 1) throw new IllegalStateException("Native QC command did not produce exactly one message.");
        return messages.get(0);
    }

    private List<EncodedMessage> commands(String command, JSObject args) throws Exception {
        return encodedMessages(new JSONArray(nativeEncodeCommand(requireHandle(), command, args.toString())));
    }

    private static List<JSObject> objects(String json) throws Exception {
        JSArray values = new JSArray(json);
        List<JSObject> result = new ArrayList<>();
        for (int index = 0; index < values.length(); index++) {
            result.add(JSObject.fromJSONObject((JSONObject) values.get(index)));
        }
        return result;
    }

    private static long nonNegativeLong(JSONObject value, String key) throws Exception {
        long result = value.getLong(key);
        if (result < 0) throw new IllegalStateException("Native QC gateway " + key + " is invalid.");
        return result;
    }

    private static String nullableString(JSONObject value, String key) throws Exception {
        return value.isNull(key) ? null : value.getString(key);
    }

    private static long[] nonNegativeLongArray(JSONArray values) throws Exception {
        long[] result = new long[values.length()];
        for (int index = 0; index < result.length; index++) {
            result[index] = values.getLong(index);
            if (result[index] < 0) throw new IllegalStateException("Native QC gateway timing is invalid.");
        }
        return result;
    }

    private static List<EncodedMessage> encodedMessages(JSONArray values) throws Exception {
        List<EncodedMessage> result = new ArrayList<>(values.length());
        for (int index = 0; index < values.length(); index++) {
            JSONObject value = values.getJSONObject(index);
            int messageType = value.getInt("messageType");
            JSONArray payloadValues = value.getJSONArray("payload");
            byte[] payload = new byte[payloadValues.length()];
            for (int payloadIndex = 0; payloadIndex < payload.length; payloadIndex++) {
                int octet = payloadValues.getInt(payloadIndex);
                if (octet < 0 || octet > 255) throw new IllegalStateException("Native QC payload octet is invalid.");
                payload[payloadIndex] = (byte) octet;
            }
            result.add(new EncodedMessage(messageType, payload));
        }
        return result;
    }

    private static native long nativeCreate();
    private static native String nativeMergeExpectedState(String paramsJson, String expectedJson);
    private static native int nativeReportSize();
    private static native int nativeOutboundReportId();
    private static native int nativeInboundReportId();
    private static native String nativeEncodeCommand(long handle, String command, String argsJson);
    private static native String nativePlanGatewayWrite(long handle, String method, String argsJson);
    private static native String nativePlanGatewayWorkflow(long handle, String method, String argsJson);
    private static native void nativeRecordSavedPreset(long handle, String setlistKey, int position, String name, int instrument);
    private static native String nativePlanGatewayRead(String method, String argsJson, long requestId);
    private static native String nativeDecodeGatewayResponse(String projectionJson, byte[] payload);
    private static native int nativeGatewayResponseMatches(
        String projectionJson, int expectedType, int actualType, byte[] payload);
    private static native String nativeTempoClock(byte[] payload);
    private static native void nativeBackupStarted(long handle, long nowMs, long timeoutMs);
    private static native String nativeBackupAdvance(long handle, long nowMs);
    private static native void nativeBackupCancelled(long handle);
    private static native String nativeConsumeBackupChunk(long handle, byte[] payload, String name, long nowMs);
    private static native String nativeHandshakeAttempt(long handle, long nowMs, String sessionId);
    private static native String nativeStartupObserved(long handle, int messageType, byte[] payload);
    private static native String nativeStartupBeginBuilding(long handle);
    private static native int nativeStartupConnected(long handle);
    private static native void nativePostBootInitializationStarted(
        long handle, long nowMs, long requestId);
    private static native void nativeInitializationObserved(long handle, int messageType);
    private static native String nativeInitializationAdvance(long handle, long nowMs);
    private static native void nativeCatalogVerificationStarted(
        long handle, long verificationId, long nowMs);
    private static native String nativeCatalogVerificationAdvance(
        long handle, long verificationId, long nowMs);
    private static native void nativeCatalogListingObserved(
        long handle, long verificationId, long nowMs, int matches);
    private static native void nativeCatalogVerificationCancelled(long handle, long verificationId);
    private static native int nativeGatewayTransactionState(
        long handle, String verificationJson, long afterObservedAtMs,
        long deadlineMs, long observedAtMs, long nowMs);
    private static native long nativeGatewayVerificationStarted(
        long handle, String verificationJson, String policyMethod, long afterSequence,
        long startedAtMs, long timeoutMs);
    private static native String nativeGatewayVerificationAdvance(
        long handle, long verificationId, long observationSequence, long nowMs);
    private static native void nativeGatewayVerificationCancelled(long handle, long verificationId);
    private static native int nativeGatewayReadbackMatches(
        String method, String paramsJson, String responseJson);
    private static native long nativeGatewayReadbackRetryDelay(String method, int attempt);
    private static native int nativeStoredPresetNameMatches(String requested, String stored);
    private static native String nativeComposeGlobalTempoSettings(String globalJson, String presetJson);
    private static native int nativeGatewayWritePreflightMatches(
        String method, String paramsJson, String responseJson);
    private static native byte[] nativeEncodeFrame(int messageType, byte[] payload);
    private static native byte[] nativePushReport(long handle, byte[] report);
    private static native void nativeReset(long handle);
    private static native void nativeDestroy(long handle);
    private static native String nativeDecode(long handle, int messageType, byte[] payload);
    private static native String nativeInstallModelRepo(long handle, byte[] payload);
    private static native String nativeBlockDetails(long handle, int row, int column);
    private static native String nativeLaneControlDetails(long handle, int row, String control);
    private static native String nativeSnapshot(long handle);
    private static native int nativeModelCount(long handle);
    private static native String nativeModelList(long handle);
    private static native String nativePresetFolders(long handle);
    private static native String nativePresetList(long handle, String setlistKey);
    private static native String nativePresetSlots(long handle);
    private static native void nativeSessionOpened(long handle, long nowMs);
    private static native void nativeSessionHandshakeComplete(
        long handle, long nowMs, int synchronizedState);
    private static native void nativeSessionStateObserved(long handle, long nowMs, int presetSynchronized);
    private static native int nativeSessionShouldKeepalive(long handle, long nowMs);
    private static native void nativeSessionKeepaliveSent(long handle, long nowMs);
    private static native void nativeSessionOutbound(long handle, long nowMs);
    private static native void nativeSessionDisconnected(long handle, long nowMs);
    private static native long nativeSessionScheduleReconnect(long handle, long nowMs);
    private static native int nativeSessionReconnectDue(long handle, long nowMs);
    private static native void nativeSessionReconnectAttempted(long handle, long nowMs);
}
