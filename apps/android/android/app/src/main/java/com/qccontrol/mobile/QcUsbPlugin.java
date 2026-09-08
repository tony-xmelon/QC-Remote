package com.qccontrol.mobile;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.hardware.usb.UsbRequest;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.annotation.RequiresApi;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.UUID;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@CapacitorPlugin(name = "QcUsb")
public class QcUsbPlugin extends Plugin {
    private static long monotonicMillis() { return System.nanoTime() / 1_000_000L; }
    private static final int HID_WRITE_TIMEOUT_MS = 250;
    private static final int MIDI_WRITE_TIMEOUT_MS = 250;
    private static final int MAINTENANCE_POLL_MS = 1000;
    private static final int HID_INPUT_REQUEST_DEPTH = 32;
    private static final String USB_PERMISSION = "com.qccontrol.mobile.USB_PERMISSION";

    private UsbManager manager;
    private UsbDevice device;
    private UsbDeviceConnection connection;
    private UsbInterface hidInterface;
    private UsbEndpoint inputEndpoint;
    private volatile UsbRequest[] activeInputRequests;
    private UsbDeviceConnection midiConnection;
    private UsbInterface midiInterface;
    private UsbEndpoint midiOutputEndpoint;
    private PluginCall pendingConnect;
    // HID reads, HID writes, and performance MIDI each have an independent
    // lane. A footswitch must never queue behind preset synchronization or a
    // multi-report parameter write.
    private final ExecutorService readerIo = Executors.newSingleThreadExecutor();
    private final ExecutorService commandIo = Executors.newSingleThreadExecutor();
    private final ExecutorService midiIo = Executors.newSingleThreadExecutor();
    private final ExecutorService metadataIo = Executors.newSingleThreadExecutor();
    private final ScheduledExecutorService keepalive = Executors.newSingleThreadScheduledExecutor();
    private volatile boolean reading;
    private volatile CountDownLatch resetReply;
    private volatile String currentSetlist;
    private volatile int currentPosition = -1;
    private volatile long messagesReceived;
    private final ConcurrentHashMap<Integer, Long> messagesReceivedByType = new ConcurrentHashMap<>();
    private volatile long rawReportsReceived;
    private volatile long messagesSent;
    private final ConcurrentHashMap<Integer, Long> messagesSentByType = new ConcurrentHashMap<>();
    private volatile long decodeErrors;
    private volatile long expectedWriteStalls;
    private volatile int lastMessageType = -1;
    private volatile long connectedAt;
    private volatile String lastError;
    private volatile long readAttempts;
    private volatile long negativeReads;
    private volatile int selectedInterfaceId = -1;
    private volatile int selectedInputEndpointAddress = -1;
    private volatile int selectedInputMaxPacketSize;
    private volatile boolean includeReportId = true;
    private volatile boolean startupActive;
    private volatile boolean initializationComplete;
    private volatile long commandNotBeforeMs;
    private volatile boolean connecting;
    private volatile CompletableFuture<org.json.JSONObject> reconnectInFlight;
    private volatile long lastMidiCommandAt;
    private volatile long lastMidiQueueDelayMs;
    private volatile long maxMidiQueueDelayMs;
    private volatile long lastStateAt;
    private volatile long lastHidWriteDurationMs;
    private volatile long maxHidWriteDurationMs;
    private volatile int lastHidWriteResult;
    private volatile boolean lastHidWriteIncludedReportId;
    private volatile String lastGatewayReadMismatch;
    private volatile long gatewayReadRecoveries;
    private volatile long gatewayWriteRecoveries;
    private volatile boolean readerWaiting;
    private volatile long readerExitedAt;
    private volatile String lastReaderError;
    private volatile long lastPresetLibraryAt;
    private final AtomicBoolean presetLibrarySettlementScheduled = new AtomicBoolean();
    private final AtomicLong connectionGeneration = new AtomicLong();
    private final QcPendingOperations pendingOperations = new QcPendingOperations();
    private final QcNativeStateDecoder stateDecoder = new QcNativeStateDecoder();
    private static volatile QcUsbPlugin relaySession;
    private volatile int currentMasterVolume = -1;
    private final Object stateEventLock = new Object();
    private final Deque<JSObject> stateEventLog = new ArrayDeque<>();
    private long nextStateSequence = 1;
    private volatile JSObject latestTempoClock;
    private volatile QcPendingOperations.Entry<PendingBackup> pendingBackup;
    private volatile QcPendingOperations.Entry<PendingReady> pendingReady;
    private QcUsbFlightRecorder flight;

    private final BroadcastReceiver permissionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!USB_PERMISSION.equals(intent.getAction())) return;
            UsbDevice grantedDevice = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                ? intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice.class)
                : intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
            boolean granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
            if (flight != null) flight.event(granted ? "usb-permission-granted" : "usb-permission-denied");
            PluginCall call = pendingConnect;
            pendingConnect = null;
            if (call == null) return;
            if (!granted || grantedDevice == null) {
                call.reject("USB permission was denied.", "USB_PERMISSION_DENIED");
                return;
            }
            openAndHandshake(grantedDevice, call);
        }
    };

    private final BroadcastReceiver deviceReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            UsbDevice changed = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                ? intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice.class)
                : intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
            if (changed == null || !isQuadCortex(changed)) return;
            JSObject status = new JSObject();
            if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(intent.getAction())) {
                if (flight != null) flight.event("usb-detached");
                if (device != null && device.getDeviceId() == changed.getDeviceId()) closeConnection();
                // A connectedDevice foreground service is only valid while the
                // app owns an attached device. Keep pairing credentials, but
                // stop the relay until USB permission is available again.
                getContext().stopService(new Intent(getContext(), QcRelayService.class));
                status.put("state", "disconnected");
            } else {
                if (flight != null) flight.event("usb-attached");
                status.put("state", "available");
                status.put("name", changed.getProductName() == null ? getContext().getString(R.string.device_name) : changed.getProductName());
            }
            notifyListeners("qcConnection", status, true);
        }
    };

    @Override
    public void load() {
        flight = new QcUsbFlightRecorder(getContext());
        flight.event("plugin-loaded");
        relaySession = this;
        manager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        IntentFilter filter = new IntentFilter(USB_PERMISSION);
        ContextCompat.registerReceiver(
            getContext(), permissionReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED
        );
        IntentFilter deviceFilter = new IntentFilter();
        deviceFilter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        deviceFilter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        ContextCompat.registerReceiver(
            getContext(), deviceReceiver, deviceFilter, ContextCompat.RECEIVER_EXPORTED
        );
        keepalive.scheduleWithFixedDelay(() -> {
            advanceInitialization();
            boolean backupActive = pendingBackup != null;
            if (!isReady() || backupActive || !pendingOperations.isEmpty()
                || !stateDecoder.sessionShouldKeepalive(monotonicMillis())) return;
            // Keepalives share the serialized writer, but only enter the queue
            // after five completely idle seconds. Normal interaction therefore
            // never waits for recurring maintenance traffic.
            commandIo.execute(() -> {
                boolean currentBackupActive = pendingBackup != null;
                if (!isReady() || currentBackupActive || !pendingOperations.isEmpty()
                    || !stateDecoder.sessionShouldKeepalive(monotonicMillis())) return;
                try {
                    // The shared runtime uses the QC's dedicated KeepAlive on
                    // both platforms. A Version read can prove a reply, but it
                    // does not keep CorOS's push/session service alive.
                    writeMessage(stateDecoder.keepaliveCommand());
                    stateDecoder.sessionKeepaliveSent(monotonicMillis());
                } catch (Exception ignored) {}
            });
        }, MAINTENANCE_POLL_MS, MAINTENANCE_POLL_MS, TimeUnit.MILLISECONDS);
    }

    static boolean relaySessionAvailable() {
        QcUsbPlugin session = relaySession;
        return session != null && session.isReady() && session.initializationComplete
            && session.stateDecoder.sessionSynchronized();
    }

    static boolean relayForegroundServiceEligible() {
        QcUsbPlugin session = relaySession;
        if (session == null || session.manager == null) return false;
        UsbDevice candidate = session.findQuadCortex();
        return candidate != null && session.manager.hasPermission(candidate);
    }

    static CompletableFuture<org.json.JSONObject> invokeFromRelay(String method, org.json.JSONObject params, org.json.JSONObject expected) {
        QcUsbPlugin session = relaySession;
        if (session == null) return failedRelay("NOT_CONNECTED", "QC Remote is not running with a Quad Cortex session.");
        return session.relayInvoke(method, params == null ? new org.json.JSONObject() : params,
            expected == null ? new org.json.JSONObject() : expected);
    }

    static final class RelayException extends RuntimeException {
        final String code;
        RelayException(String code, String message) { super(message); this.code = code; }
        boolean retryable() {
            return "NOT_CONNECTED".equals(code) || "READBACK_TIMEOUT".equals(code)
                || "USB_CONNECT_FAILED".equals(code) || "DEVICE_TRANSPORT".equals(code);
        }
    }

    private static CompletableFuture<org.json.JSONObject> failedRelay(String code, String message) {
        CompletableFuture<org.json.JSONObject> value = new CompletableFuture<>();
        value.completeExceptionally(new RelayException(code, message));
        return value;
    }

    private static final class PendingBackup {
        final String name;
        final long createdAt = System.currentTimeMillis();
        volatile int chunks;
        volatile int ignoredPrefixChunks;
        volatile int attempts = 1;
        volatile int rawReports;
        volatile int decodedMessages;
        volatile int lastRawReportBytes;
        volatile boolean recoveryStarted;
        volatile org.json.JSONObject savedResult;

        PendingBackup(String name) {
            this.name = name;
        }
    }

    private static final class PendingReady {
        final String detail;

        PendingReady(String detail) {
            this.detail = detail;
        }
    }

    private CompletableFuture<org.json.JSONObject> relayDisconnect() {
        closeConnection();
        return CompletableFuture.completedFuture(connectionState("Quad Cortex session closed"));
    }

    private CompletableFuture<org.json.JSONObject> relayReconnect(String detail) {
        UsbDevice candidate = findQuadCortex();
        if (candidate == null) return failedRelay("DEVICE_NOT_FOUND", "No Quad Cortex was found over USB.");
        if (!manager.hasPermission(candidate)) return failedRelay("USB_PERMISSION_REQUIRED", "Quad Cortex USB permission is required.");
        CompletableFuture<org.json.JSONObject> result = new CompletableFuture<>();
        synchronized (this) {
            if (reconnectInFlight != null) return reconnectInFlight;
            connecting = true;
            reconnectInFlight = result;
        }
        QcPendingOperations.Entry<PendingReady> pending = pendingOperations.register(new PendingReady(detail), result);
        pendingReady = pending;
        commandIo.execute(() -> {
            try {
                openDeviceAndHandshake(candidate, pending);
                resolvePendingReady();
            } catch (Exception error) {
                lastError = error.getMessage();
                if (pendingReady == pending) pendingReady = null;
                pendingOperations.remove(pending);
                closeConnection();
                result.completeExceptionally(new RelayException("USB_CONNECT_FAILED", error.getMessage()));
            } finally {
                synchronized (this) {
                    connecting = false;
                    if (reconnectInFlight == result) reconnectInFlight = null;
                }
            }
        });
        pendingOperations.timeout(pending, QcUsbProfile.READY_WAIT_TIMEOUT_MS, keepalive,
            () -> new RelayException("READBACK_TIMEOUT", "The Quad Cortex did not finish synchronizing in time."));
        return result;
    }

    private CompletableFuture<org.json.JSONObject> recoverGatewayWriteVerification(
        CompletableFuture<org.json.JSONObject> result,
        QcNativeStateDecoder.PlannedGatewayWrite plan
    ) {
        return result.handle((value, error) -> {
            if (error == null) return CompletableFuture.completedFuture(value);
            Throwable cause = unwrapCompletion(error);
            if (!(cause instanceof RelayException)
                || !"READBACK_TIMEOUT".equals(((RelayException) cause).code)) {
                return QcUsbPlugin.<org.json.JSONObject>failedFuture(cause);
            }
            gatewayWriteRecoveries++;
            return relayReconnect("USB session recovered after write verification timeout")
                .thenCompose(ignored -> verifyGatewayWriteAfterReconnect(plan));
        }).thenCompose(recovered -> recovered);
    }

    private CompletableFuture<org.json.JSONObject> verifyGatewayWriteAfterReconnect(
        QcNativeStateDecoder.PlannedGatewayWrite plan
    ) {
        long observationSequence;
        synchronized (stateEventLock) { observationSequence = nextStateSequence - 1; }
        long now = monotonicMillis();
        int state = stateDecoder.gatewayTransactionState(
            plan, 0, now + 1_000, observationSequence, now);
        if (state != 1) return failedRelay(
            "READBACK_MISMATCH",
            "The QC did not confirm the requested state after USB session recovery; the write was not replayed.");
        try {
            return CompletableFuture.completedFuture(new org.json.JSONObject()
                .put("accepted", true).put("verified", true)
                .put("verification", "authoritative_reconnect_readback")
                .put("stateSequence", observationSequence).put("detail", plan.detail));
        } catch (Exception error) {
            return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
        }
    }

    private void scheduleAutomaticReconnect(String detail) {
        long delayMs = stateDecoder.sessionScheduleReconnect(monotonicMillis());
        keepalive.schedule(() -> {
            UsbDevice candidate = findQuadCortex();
            long now = monotonicMillis();
            if (isReady() || connecting || !stateDecoder.sessionReconnectDue(now)) return;
            if (candidate == null || !manager.hasPermission(candidate)) {
                scheduleAutomaticReconnect(detail);
                return;
            }
            stateDecoder.sessionReconnectAttempted(now);
            relayReconnect(detail).whenComplete((ignored, error) -> {
                if (error != null) {
                    android.util.Log.w(
                        "QcUsbPlugin", "Automatic QC USB reconnect failed: " + error.getMessage());
                    scheduleAutomaticReconnect(detail);
                }
            });
        }, delayMs, TimeUnit.MILLISECONDS);
    }

    private void resolvePendingReady() {
        QcPendingOperations.Entry<PendingReady> pending = pendingReady;
        if (pending == null || !isReady() || !initializationComplete
            || !stateDecoder.sessionSynchronized() || currentSetlist == null) return;
        if (pendingReady == pending) {
            pendingReady = null;
            if (pendingOperations.remove(pending)) {
                pending.result.complete(connectionState(pending.operation.detail));
            }
        }
    }

    private org.json.JSONObject connectionState(String detail) {
        JSObject state = new JSObject();
        state.put("phase", connection == null ? "disconnected"
            : initializationComplete && stateDecoder.sessionSynchronized() && currentSetlist != null ? "ready" : "syncing");
        state.put("detail", detail);
        state.put("lastSync", connectedAt == 0 ? org.json.JSONObject.NULL : connectedAt);
        state.put("demo", false);
        return state;
    }

    private org.json.JSONObject relayStateEvents(org.json.JSONObject params) throws Exception {
        long after = params.has("afterSequence") ? params.getLong("afterSequence") : 0;
        int limit = params.has("limit") ? params.getInt("limit") : QcDomain.STATE_EVENT_DEFAULT_LIMIT;
        if (after < 0) throw new IllegalArgumentException("afterSequence must be a non-negative integer.");
        if (limit < 1 || limit > QcDomain.STATE_EVENT_MAXIMUM_LIMIT)
            throw new IllegalArgumentException("limit must be an integer from 1 through " + QcDomain.STATE_EVENT_MAXIMUM_LIMIT + ".");
        org.json.JSONArray frames = new org.json.JSONArray();
        long latestSequence;
        synchronized (stateEventLock) {
            for (JSObject frame : stateEventLog) {
                if (frame.optLong("sequence", 0) > after && frames.length() < limit) frames.put(frame);
            }
            latestSequence = nextStateSequence - 1;
        }
        JSObject result = new JSObject();
        result.put("native", true);
        result.put("latestSequence", latestSequence);
        result.put("frames", frames);
        return result;
    }

    private org.json.JSONObject relayTempoClock() {
        JSObject clock = latestTempoClock;
        if (clock != null) return clock;
        JSObject unavailable = new JSObject();
        unavailable.put("available", false);
        return unavailable;
    }

    private CompletableFuture<org.json.JSONObject> relayCreateBackup(org.json.JSONObject params) throws Exception {
        String name = params.optString("name", "");
        if (name.trim().isEmpty()) return failedRelay("INVALID_ARGUMENT", "Backup name cannot be empty.");
        if (pendingBackup != null && !pendingBackup.result.isDone()) return failedRelay("BACKUP_IN_PROGRESS", "A device backup is already in progress.");
        CompletableFuture<org.json.JSONObject> result = new CompletableFuture<>();
        stateDecoder.backupStarted(monotonicMillis(), QcUsbProfile.BACKUP_TOTAL_TIMEOUT_MS);
        QcPendingOperations.Entry<PendingBackup> pending = pendingOperations.register(new PendingBackup(name), result);
        pendingBackup = pending;
        issueBackupRequest(pending);
        scheduleBackupWatchdog(pending, MAINTENANCE_POLL_MS);
        return result;
    }

    /**
     * LocalBackup replies have no correlation id. A retry is safe only before
     * the first JSON chunk: a second request after a stream starts could
     * create an unrelated document that must never be combined with it.
     */
    private void issueBackupRequest(QcPendingOperations.Entry<PendingBackup> pending) {
        commandIo.execute(() -> {
            try {
                if (pendingBackup != pending || pending.result.isDone()
                    || pending.operation.recoveryStarted) return;
                if (!isReady()) throw new RelayException("NOT_CONNECTED", "Quad Cortex USB disconnected before the backup.");
                android.util.Log.i("QcUsbPlugin", "Sending native backup request " + pending.operation.attempts
                    + "; includeReportId=" + includeReportId);
                writeMessage(stateDecoder.backupCommand());
            } catch (Exception error) {
                failPendingBackupRecovery(pending, error);
            }
        });
    }

    private void scheduleBackupWatchdog(QcPendingOperations.Entry<PendingBackup> pending, long delayMs) {
        keepalive.schedule(() -> {
            if (pendingBackup != pending || pending.result.isDone()) return;
            PendingBackup operation = pending.operation;
            if (operation.recoveryStarted) return;
            try {
                JSObject decision = stateDecoder.backupAdvance(monotonicMillis());
                operation.attempts = decision.getInteger("attempts", operation.attempts);
                String action = decision.getString("action", "wait");
                if ("keepalive".equals(action)) {
                    commandIo.execute(() -> {
                        try {
                            if (pendingBackup != pending || pending.result.isDone()) return;
                            writeMessage(stateDecoder.keepaliveCommand());
                            stateDecoder.sessionKeepaliveSent(monotonicMillis());
                        } catch (Exception error) {
                            failPendingBackupRecovery(pending, error);
                        }
                    });
                } else if ("rerequest".equals(action)) {
                    issueBackupRequest(pending);
                } else if ("failed".equals(action)) {
                    pendingBackup = null;
                    stateDecoder.backupCancelled();
                    if (pendingOperations.remove(pending)) pending.result.completeExceptionally(new RelayException(
                        "READBACK_TIMEOUT", decision.getString("error", "The native QC backup failed.")
                            + " Android observed " + operation.rawReports + " raw HID reports and "
                            + operation.decodedMessages + " decoded messages."));
                    return;
                }
                scheduleBackupWatchdog(pending, MAINTENANCE_POLL_MS);
            } catch (Exception error) {
                failPendingBackupRecovery(pending, error);
            }
        }, Math.max(1, delayMs), TimeUnit.MILLISECONDS);
    }

    private org.json.JSONObject saveBackupDocument(org.json.JSONObject document, String requestedName) throws Exception {
        String safeName = requestedName.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (safeName.isEmpty()) safeName = "QC Device Backup";
        String fileName = safeName.endsWith(".json") ? safeName : safeName + ".json";
        byte[] bytes = document.toString().getBytes(StandardCharsets.UTF_8);
        if (bytes.length > QcUsbProfile.BACKUP_MAXIMUM_DOCUMENT_BYTES) throw new Exception("The native backup exceeds the 32 MiB safety limit.");

        String path;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + getContext().getString(R.string.download_folder));
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            android.net.Uri uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new Exception("Android could not create the backup file in Downloads.");
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
                if (output == null) throw new Exception("Android could not open the backup file for writing.");
                output.write(bytes);
            } catch (Exception error) {
                getContext().getContentResolver().delete(uri, null, null);
                throw error;
            }
            ContentValues ready = new ContentValues();
            ready.put(MediaStore.Downloads.IS_PENDING, 0);
            getContext().getContentResolver().update(uri, ready, null, null);
            path = uri.toString();
        } else {
            File root = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), getContext().getString(R.string.download_folder));
            if (!root.isDirectory() && !root.mkdirs()) throw new Exception("Android could not create the backup directory.");
            File file = new File(root, fileName);
            try (OutputStream output = new FileOutputStream(file)) { output.write(bytes); }
            path = file.getAbsolutePath();
        }
        return new JSObject().put("cancelled", false).put("path", path).put("name", fileName);
    }

    private CompletableFuture<org.json.JSONObject> relayInvoke(String method, org.json.JSONObject params, org.json.JSONObject expected) {
        try {
            if (flight != null) flight.activity(GeneratedGatewayMethods.contains(method)
                ? "gateway-dispatch:" + method : "gateway-dispatch:rejected");
            params = stateDecoder.mergeExpectedState(
                JSObject.fromJSONObject(params), JSObject.fromJSONObject(expected));
            GeneratedGatewayMethods.validateParams(method, params);
            String dispatch = GeneratedGatewayMethods.dispatchKind(method);
            if ("SYSTEM".equals(dispatch)) {
                return CompletableFuture.completedFuture(new JSObject()
                    .put("platform", "Rust Android USB gateway")
                    .put("gatewayAvailable", true)
                    .put("gatewayApiVersion", GeneratedGatewayMethods.API_VERSION)
                    .put("capabilities", GeneratedGatewayMethods.CAPABILITIES)
                    .put("message", "Shared Rust QC engine active")
                    .put("connected", isReady()).put("synchronized",
                        initializationComplete && stateDecoder.sessionSynchronized() && currentSetlist != null)
                    .put("transport", "android-usb-relay")
                    .put("usbDiagnostics", usbDiagnostics()));
            }
            if ("RECONNECT".equals(dispatch)) return relayReconnect(
                "device.resetSession".equals(method) ? "Communication session reset" : "Quad Cortex handshake complete");
            if ("DISCONNECT".equals(dispatch)) return relayDisconnect();
            if (!isReady()) {
                CompletableFuture<org.json.JSONObject> reconnect = reconnectInFlight;
                if (reconnect != null) {
                    org.json.JSONObject deferredParams = params;
                    org.json.JSONObject deferredExpected = expected;
                    // Queue after the reconnect command has cleared its
                    // in-flight marker. An inline continuation can otherwise
                    // re-enter this branch recursively on a completed future.
                    return reconnect.thenComposeAsync(
                        ignored -> relayInvoke(method, deferredParams, deferredExpected), commandIo);
                }
                return failedRelay("NOT_CONNECTED", "Quad Cortex USB is not connected.");
            }
            if (!initializationComplete || !stateDecoder.sessionSynchronized()) {
                return failedRelay("STATE_UNAVAILABLE", "Quad Cortex USB is still synchronizing its authoritative state.");
            }
            switch (dispatch) {
                case "SNAPSHOT": return CompletableFuture.completedFuture(relaySnapshot());
                case "STATE_EVENTS": return CompletableFuture.completedFuture(relayStateEvents(params));
                case "TEMPO_CLOCK": return CompletableFuture.completedFuture(relayTempoClock());
                case "CORRELATED_READ": return relayGatewayRead(method, params);
                case "MODELS": return CompletableFuture.completedFuture(stateDecoder.modelList());
                case "PRESET_LIBRARY": return relayPresetLibraryRead(method, params);
                case "MASTER_VOLUME":
                    if (currentMasterVolume < 0) return failedRelay("STATE_UNAVAILABLE", "The Quad Cortex has not reported master volume yet.");
                    return CompletableFuture.completedFuture(new org.json.JSONObject().put("value", currentMasterVolume).put("observedAt", lastStateAt));
                case "BLOCK_DETAILS": return relayBlockDetails(method, params);
                case "SET_DEVICE_NAME": return relaySetDeviceName(params);
                case "TAP_SCREEN": return relayScreenGesture(method, params);
                case "BACKUP": return relayCreateBackup(params);
                case "PREVIEW_PARAMETER": return relayPreviewParameter(method, params);
                case "PLANNED_WRITE": return "device.undo".equals(method) || "device.redo".equals(method)
                    ? relayHistoryWrite(method, params)
                    : relayPlannedGatewayWriteWithReadback(method, params);
                case "PRESET_WRITE": return relayPlannedGatewayWrite(method, params);
                case "PERSISTENT_WRITE": return relayGatewayWorkflow(method, params);
                default: return failedRelay("METHOD_NOT_ALLOWED", "The requested device operation is not supported by Android.");
            }
        } catch (Exception error) { return failedRelay("INVALID_ARGUMENT", error.getMessage() == null ? "Invalid device arguments." : error.getMessage()); }
    }

    private CompletableFuture<org.json.JSONObject> relayPlannedGatewayWrite(
        String method, org.json.JSONObject params
    ) throws Exception {
        QcNativeStateDecoder.PlannedGatewayWrite plan = stateDecoder.gatewayPlan(method, JSObject.fromJSONObject(params));
        return executeRelayPlan(plan);
    }

    private CompletableFuture<org.json.JSONObject> relayHistoryWrite(
        String method, org.json.JSONObject params
    ) throws Exception {
        QcNativeStateDecoder.PlannedGatewayWrite plan =
            stateDecoder.gatewayPlan(method, JSObject.fromJSONObject(params));
        return executeRelayPlan(plan)
            .thenCompose(result -> {
                if (plan.postWriteRefreshMethod == null) {
                    return CompletableFuture.completedFuture(result);
                }
                CompletableFuture<org.json.JSONObject> refreshDispatched = new CompletableFuture<>();
                keepalive.schedule(() -> commandIo.execute(() -> {
                    try {
                        if (isReady()) {
                            dispatchGatewayRefresh(plan.postWriteRefreshMethod);
                        }
                    } catch (Exception ignored) {
                        // Undo and redo are non-idempotent and may already have applied.
                        // Keep their accepted-unverified result instead of replaying them.
                    } finally {
                        refreshDispatched.complete(result);
                    }
                }), plan.postWriteRefreshDelayMs, TimeUnit.MILLISECONDS);
                return refreshDispatched;
            });
    }

    private void dispatchGatewayRefresh(String method) throws Exception {
        QcNativeStateDecoder.PlannedGatewayRead refresh = stateDecoder.gatewayRead(
            method, new JSObject(), stateDecoder.nextRequestId());
        for (QcNativeStateDecoder.EncodedMessage message : refresh.messages) writeMessage(message);
    }

    private CompletableFuture<org.json.JSONObject> relayPlannedGatewayWriteWithReadback(
        String method, org.json.JSONObject params
    ) throws Exception {
        QcNativeStateDecoder.PlannedGatewayWrite plan =
            stateDecoder.gatewayPlan(method, JSObject.fromJSONObject(params));
        CompletableFuture<Void> preflight = CompletableFuture.completedFuture(null);
        if (plan.preflightMethod != null) {
            preflight = relayGatewayRead(plan.preflightMethod, new org.json.JSONObject()).thenApply(response -> {
                if (!stateDecoder.gatewayWritePreflightMatches(method, params, response)) {
                    throw new java.util.concurrent.CompletionException(new RelayException(
                        "STALE_STATE", "The write was based on stale global state, or the QC is not in GLOBAL tempo mode."));
                }
                return null;
            });
        }
        org.json.JSONObject guardedParams = new org.json.JSONObject(params.toString());
        return preflight.thenCompose(ignored -> {
            try {
                return executeRelayPlan(plan).thenCompose(writeResult -> plan.readbackMethod == null
                    ? CompletableFuture.completedFuture(writeResult)
                    : relayGatewayWriteReadback(method, guardedParams, plan.readbackMethod, 0));
            } catch (Exception error) {
                return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
            }
        });
    }

    private CompletableFuture<org.json.JSONObject> relayGatewayWriteReadback(
        String method, org.json.JSONObject params, String readMethod, int attempt
    ) {
        long delayMs = stateDecoder.gatewayReadbackRetryDelay(method, attempt);
        if (delayMs < 0) {
            return failedRelay("READBACK_MISMATCH",
                "The QC returned settings that do not match the requested write.");
        }
        CompletableFuture<Void> delay = new CompletableFuture<>();
        if (delayMs == 0) delay.complete(null);
        else keepalive.schedule(() -> delay.complete(null), delayMs, TimeUnit.MILLISECONDS);
        return delay.thenCompose(ignored -> {
            try { return relayGatewayRead(readMethod, new org.json.JSONObject()); }
            catch (Exception error) { return QcUsbPlugin.<org.json.JSONObject>failedFuture(error); }
        }).thenCompose(readback -> {
            if (!stateDecoder.gatewayReadbackMatches(method, params, readback)) {
                return relayGatewayWriteReadback(
                    method, params, readMethod, attempt + 1);
            }
            try {
                return CompletableFuture.completedFuture(new org.json.JSONObject()
                    .put("accepted", true).put("verified", true)
                    .put("verification", "authoritative_readback")
                    .put("detail", "The QC confirmed the settings update.").put("readback", readback));
            } catch (Exception error) {
                return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
            }
        });
    }

    private CompletableFuture<org.json.JSONObject> executeRelayPlan(
        QcNativeStateDecoder.PlannedGatewayWrite plan
    ) {
        if (plan.midi) return relayMidi(plan.controller, plan.value).thenApply(result -> {
            try { return result.put("accepted", true).put("verified", false).put("detail", plan.detail)
                .put("verification", "accepted_unverified"); }
            catch (Exception error) { throw new java.util.concurrent.CompletionException(error); }
        });
        CompletableFuture<org.json.JSONObject> result = new CompletableFuture<>();
        long hostStartedAtUnixMs = System.currentTimeMillis();
        long stateBeforeWrite;
        synchronized (stateEventLock) { stateBeforeWrite = nextStateSequence - 1; }
        QcPendingOperations.Entry<PendingGatewayTransaction> pending = null;
        PendingGatewayTransaction operation;
        try {
            org.json.JSONObject verification = new org.json.JSONObject(plan.verificationJson);
            if (!plan.realtime && !"none".equals(verification.optString("kind"))) {
                operation = new PendingGatewayTransaction(
                    plan, stateBeforeWrite, hostStartedAtUnixMs);
                pending = pendingOperations.register(operation, result);
            } else {
                operation = new PendingGatewayTransaction(plan, stateBeforeWrite, hostStartedAtUnixMs);
            }
        } catch (Exception error) {
            result.completeExceptionally(error);
            return result;
        }
        QcPendingOperations.Entry<PendingGatewayTransaction> registered = pending;
        commandIo.execute(() -> {
            try {
                if (!isReady()) throw new RelayException("NOT_CONNECTED", "Quad Cortex USB disconnected before the write.");
                org.json.JSONObject verification = new org.json.JSONObject(plan.verificationJson);
                writeMessages(plan.messages, plan.interMessageIntervalMs);
                operation.dispatchLatencyMs = Math.max(0, System.currentTimeMillis() - hostStartedAtUnixMs);
                if (!plan.realtime && !"none".equals(verification.optString("kind"))) {
                    operation.verificationId = stateDecoder.gatewayVerificationStarted(
                        plan, operation.afterSequence, monotonicMillis());
                }
                operation.dispatched = true;
                if (plan.realtime || "none".equals(verification.optString("kind"))) {
                    result.complete(new org.json.JSONObject().put("accepted", true).put("verified", false)
                        .put("detail", plan.detail).put("verification", "accepted_unverified")
                        .put("hostStartedAtUnixMs", hostStartedAtUnixMs)
                        .put("dispatchLatencyMs", operation.dispatchLatencyMs));
                } else {
                    long currentSequence;
                    synchronized (stateEventLock) { currentSequence = nextStateSequence - 1; }
                    advancePendingGatewayTransaction(registered, currentSequence, monotonicMillis());
                }
            } catch (Exception error) {
                if (registered != null) {
                    pendingOperations.remove(registered);
                    stateDecoder.gatewayVerificationCancelled(operation.verificationId);
                }
                result.completeExceptionally(error);
            }
        });
        if (registered == null) return result;
        result.whenComplete((ignored, error) ->
            stateDecoder.gatewayVerificationCancelled(operation.verificationId));
        return recoverGatewayWriteVerification(result, plan);
    }

    private CompletableFuture<org.json.JSONObject> relayGatewayWorkflow(
        String method, org.json.JSONObject params
    ) throws Exception {
        QcNativeStateDecoder.PlannedGatewayWorkflow workflow =
            stateDecoder.gatewayWorkflow(method, JSObject.fromJSONObject(params));
        return executeRelayWorkflow(workflow, 0)
            .thenCompose(ignored -> finalizeRelayWorkflow(method, workflow));
    }

    private CompletableFuture<org.json.JSONObject> relayGatewayRead(
        String method, org.json.JSONObject params
    ) throws Exception {
        if ("device.captureScreen".equals(method) || "device.presetScreenshot".equals(method)
            || "device.captures".equals(method) || "device.irs".equals(method)) {
            org.json.JSONObject readParams = new org.json.JSONObject(params.toString());
            return relayReconnect("USB session refreshed for high-volume read").thenCompose(ignored -> {
                try {
                    return restoreUsbSessionAfterHighVolumeRead(
                        relayGatewayReadWithRecovery(method, readParams));
                }
                catch (Exception error) { return failedRelay("DEVICE_ERROR", error.getMessage()); }
            });
        }
        org.json.JSONObject readParams = new org.json.JSONObject(params.toString());
        return relayGatewayReadWithRecovery(method, readParams);
    }

    private CompletableFuture<org.json.JSONObject> relayBlockDetails(
        String method, org.json.JSONObject params
    ) throws Exception {
        int row = params.getInt("row");
        boolean laneControl = "device.laneControlDetails".equals(method);
        String control = laneControl ? params.getString("control") : null;
        int column = laneControl ? -1 : params.getInt("column");
        // CorOS does not reliably push a complete parameter snapshot after
        // history changes, and sparse Grid echoes omit row-control values.
        // The regular correlated current-preset plan updates shared native
        // state before its response future completes, so no Android-only
        // pending-operation state machine is needed here.
        return relayGatewayRead("device.currentPreset", new org.json.JSONObject()).thenCompose(ignored -> {
            try {
                org.json.JSONObject details = control == null
                    ? stateDecoder.blockDetails(row, column)
                    : stateDecoder.laneControlDetails(row, control);
                return CompletableFuture.completedFuture(details);
            } catch (Exception error) {
                return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
            }
        });
    }

    private CompletableFuture<org.json.JSONObject> relayGatewayReadWithRecovery(
        String method, org.json.JSONObject readParams
    ) throws Exception {
        return relayGatewayReadOnCurrentSession(method, readParams).handle((value, error) -> {
            if (error == null) return CompletableFuture.completedFuture(value);
            Throwable cause = unwrapCompletion(error);
            if (!(cause instanceof RelayException)
                || !((RelayException) cause).retryable()) {
                return QcUsbPlugin.<org.json.JSONObject>failedFuture(cause);
            }
            gatewayReadRecoveries++;
            return relayReconnect("USB session recovered after read interruption").thenCompose(ignored -> {
                try { return relayGatewayReadOnCurrentSession(method, readParams); }
                catch (Exception retryError) { return QcUsbPlugin.<org.json.JSONObject>failedFuture(retryError); }
            });
        }).thenCompose(result -> result);
    }

    private static Throwable unwrapCompletion(Throwable error) {
        Throwable current = error;
        while (current instanceof CompletionException && current.getCause() != null) {
            current = current.getCause();
        }
        return current;
    }

    private static <T> CompletableFuture<T> failedFuture(Throwable error) {
        CompletableFuture<T> result = new CompletableFuture<>();
        result.completeExceptionally(error);
        return result;
    }

    private CompletableFuture<org.json.JSONObject> restoreUsbSessionAfterHighVolumeRead(
        CompletableFuture<org.json.JSONObject> read
    ) {
        return read.handle((value, readError) ->
            relayReconnect("USB session restored after high-volume read").handle((ignored, reconnectError) -> {
                if (readError != null) throw new CompletionException(readError);
                if (reconnectError != null) throw new CompletionException(reconnectError);
                return value;
            })
        ).thenCompose(result -> result);
    }

    private CompletableFuture<org.json.JSONObject> relayGatewayReadOnCurrentSession(
        String method, org.json.JSONObject params
    ) throws Exception {
        long requestId = stateDecoder.nextRequestId();
        QcNativeStateDecoder.PlannedGatewayRead plan = stateDecoder.gatewayRead(
            method, JSObject.fromJSONObject(params), requestId);
        CompletableFuture<org.json.JSONObject> result = new CompletableFuture<>();
        QcPendingOperations.Entry<PendingGatewayRead> pending = pendingOperations.register(
            new PendingGatewayRead(plan), result);
        commandIo.execute(() -> {
            try {
                if (!isReady()) throw new RelayException("NOT_CONNECTED", "Quad Cortex USB disconnected before the read.");
                for (QcNativeStateDecoder.EncodedMessage message : plan.messages) writeMessage(message);
            } catch (Exception error) {
                pendingOperations.remove(pending);
                result.completeExceptionally(error);
            }
        });
        pendingOperations.timeout(pending, plan.timeoutMs, keepalive,
            () -> new RelayException("READBACK_TIMEOUT", "The QC did not provide the requested reply in time."));
        if (plan.followupMethod == null) return result;
        return result.thenCompose(primary -> {
            try {
                return relayGatewayReadOnCurrentSession(
                    plan.followupMethod, new org.json.JSONObject()).thenApply(followup -> {
                        try { return stateDecoder.composeGlobalTempoSettings(primary, followup); }
                        catch (Exception error) { throw new CompletionException(error); }
                    });
            } catch (Exception error) {
                return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
            }
        });
    }

    private CompletableFuture<org.json.JSONObject> relaySetDeviceName(org.json.JSONObject params) throws Exception {
        String expectedName = params.optString("name", "");
        return relayPlannedGatewayWriteWithReadback("device.setDeviceName", params)
            .thenCompose(result -> {
                try {
                    org.json.JSONObject identity = result.getJSONObject("readback");
                    return CompletableFuture.completedFuture(new org.json.JSONObject()
                        .put("accepted", true).put("verified", true)
                        .put("verification", "authoritative_readback")
                        .put("detail", "Device name changed to " + expectedName)
                        .put("identity", identity));
                } catch (org.json.JSONException error) {
                    return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
                }
            });
    }

    private CompletableFuture<org.json.JSONObject> relayScreenGesture(
        String method, org.json.JSONObject params
    ) throws Exception {
        return relayPlannedGatewayWriteWithReadback(method, params);
    }

    private CompletableFuture<org.json.JSONObject> relayPreviewParameter(String method, org.json.JSONObject params) throws Exception {
        double value = params.optDouble("value", Double.NaN);
        return relayPlannedGatewayWrite(method, params)
            .thenApply(result -> {
                try {
                    return result.put("acceptedValue", value);
                } catch (org.json.JSONException error) {
                    throw new IllegalStateException("Could not encode the parameter preview result.", error);
                }
            });
    }

    private CompletableFuture<org.json.JSONObject> executeRelayWorkflow(
        QcNativeStateDecoder.PlannedGatewayWorkflow workflow, int stageIndex
    ) {
        if (stageIndex >= workflow.stages.size()) {
            return CompletableFuture.completedFuture(new org.json.JSONObject());
        }
        QcNativeStateDecoder.PlannedGatewayStage stage = workflow.stages.get(stageIndex);
        QcNativeStateDecoder.PlannedGatewayWrite write = new QcNativeStateDecoder.PlannedGatewayWrite(
            "", workflow.detail, stage.verificationJson, false, 0, 0, false, 0,
            stage.timeoutMs,
            null, 0, null, null, stage.messages);
        return executeRelayPlan(write)
            .thenCompose(ignored -> settleGatewayStage(stage.settleMs))
            .thenCompose(ignored -> executeRelayWorkflow(workflow, stageIndex + 1));
    }

    private CompletableFuture<org.json.JSONObject> finalizeRelayWorkflow(
        String method, QcNativeStateDecoder.PlannedGatewayWorkflow workflow
    ) {
        CompletableFuture<org.json.JSONObject> catalog;
        if (workflow.savedPresets.length() == 0) {
            catalog = CompletableFuture.completedFuture(null);
        } else {
            try {
                // Request a fresh File catalog on the current USB session. This
                // is the same eventual-consistency boundary used by Windows,
                // without replaying any persistent mutation.
                org.json.JSONObject readParams = new org.json.JSONObject()
                    .put("refresh", true).put("_freshUsbSession", true)
                    .put("setlistKey", workflow.setlistKey);
                // Android's high-volume File cache belongs to the USB session.
                // Rebuild it once after the persistent mutation, then keep all
                // eventual-consistency retries on that fresh session. The
                // mutation itself is never replayed.
                long verificationId = stateDecoder.nextRequestId();
                stateDecoder.catalogVerificationStarted(verificationId, monotonicMillis());
                catalog = relayReconnect("USB session refreshed for saved preset verification")
                    .thenCompose(ignored -> relayWorkflowCatalogRead(
                        workflow, readParams, verificationId))
                    .whenComplete((ignored, error) ->
                        stateDecoder.catalogVerificationCancelled(verificationId));
            } catch (Exception error) {
                return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
            }
        }
        return catalog.thenCompose(listing -> {
            try {
                String actualSavedName = workflow.savedName;
                if (listing != null) {
                    org.json.JSONArray presets = listing.optJSONArray("presets");
                    if (presets == null) throw new RelayException(
                        "READBACK_MISMATCH", "The QC returned no authoritative preset catalog after the save.");
                    for (int index = 0; index < workflow.savedPresets.length(); index++) {
                        org.json.JSONObject planned = workflow.savedPresets.optJSONObject(index);
                        if (planned == null) continue;
                        int position = planned.getInt("position");
                        org.json.JSONObject stored = null;
                        for (int presetIndex = 0; presetIndex < presets.length(); presetIndex++) {
                            org.json.JSONObject candidate = presets.optJSONObject(presetIndex);
                            if (candidate != null && candidate.optInt("position", -1) == position
                                && !candidate.optString("name", "").isEmpty()
                                && !"Unsaved".equals(candidate.optString("name"))) {
                                stored = candidate;
                                break;
                            }
                        }
                        if (stored == null) throw new RelayException(
                            "READBACK_MISMATCH", "The fresh QC catalog did not contain the saved preset at slot " + position + ".");
                        planned.put("name", stored.getString("name"));
                        if (position == workflow.position && !"device.duplicateSetlist".equals(method)) {
                            actualSavedName = stored.getString("name");
                        }
                    }
                }
                stateDecoder.recordSavedPreset(workflow);
                return CompletableFuture.completedFuture(new org.json.JSONObject()
                    .put("accepted", true).put("verified", true)
                    .put("verification", "authoritative_readback").put("detail", workflow.detail)
                    .put("savedName", actualSavedName).put("snapshot", stateDecoder.snapshot())
                    .put("observedAt", lastStateAt));
            } catch (Exception error) {
                return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
            }
        });
    }

    private CompletableFuture<org.json.JSONObject> relayWorkflowCatalogRead(
        QcNativeStateDecoder.PlannedGatewayWorkflow workflow,
        org.json.JSONObject readParams,
        long verificationId
    ) {
        final JSObject decision;
        try {
            decision = stateDecoder.catalogVerificationAdvance(
                verificationId, monotonicMillis());
        } catch (Exception error) {
            return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
        }
        String action = decision.getString("action", "failed");
        if ("failed".equals(action)) {
            return failedRelay("READBACK_MISMATCH",
                decision.getString("message", "The QC preset catalog verification timed out."));
        }
        if ("wait".equals(action)) {
            CompletableFuture<org.json.JSONObject> delayed = new CompletableFuture<>();
            keepalive.schedule(() -> relayWorkflowCatalogRead(
                    workflow, readParams, verificationId)
                .whenComplete((value, error) -> {
                    if (error == null) delayed.complete(value);
                    else delayed.completeExceptionally(error);
                }), Math.max(1L, decision.optLong("delayMs", 1L)), TimeUnit.MILLISECONDS);
            return delayed;
        }
        if ("complete".equals(action)) {
            return failedRelay("READBACK_MISMATCH",
                "The QC preset catalog verification completed without a retained listing.");
        }

        final CompletableFuture<org.json.JSONObject> read;
        try {
            read = relayPresetLibraryRead("device.listPresets", readParams);
        } catch (Exception error) {
            return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
        }
        return read.handle((listing, readError) -> {
            if (readError == null && listing != null) {
                boolean matches = relayCatalogConfirmsSavedPresets(listing, workflow);
                stateDecoder.catalogListingObserved(
                    verificationId, monotonicMillis(), matches);
                if (matches) {
                    return CompletableFuture.completedFuture(listing);
                }
            }
            return relayWorkflowCatalogRead(workflow, readParams, verificationId);
        }).thenCompose(value -> value);
    }

    private boolean relayCatalogConfirmsSavedPresets(
        org.json.JSONObject listing, QcNativeStateDecoder.PlannedGatewayWorkflow workflow
    ) {
        org.json.JSONArray presets = listing.optJSONArray("presets");
        if (presets == null) return false;
        for (int index = 0; index < workflow.savedPresets.length(); index++) {
            org.json.JSONObject planned = workflow.savedPresets.optJSONObject(index);
            if (planned == null) continue;
            int position = planned.optInt("position", -1);
            String requestedName = planned.optString("name", "");
            boolean found = false;
            for (int presetIndex = 0; presetIndex < presets.length(); presetIndex++) {
                org.json.JSONObject candidate = presets.optJSONObject(presetIndex);
                if (candidate != null && candidate.optInt("position", -1) == position
                    && stateDecoder.storedPresetNameMatches(requestedName, candidate.optString("name", ""))) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    private CompletableFuture<Void> settleGatewayStage(long settleMs) {
        if (settleMs <= 0) return CompletableFuture.completedFuture(null);
        CompletableFuture<Void> settled = new CompletableFuture<>();
        keepalive.schedule(() -> settled.complete(null), settleMs, TimeUnit.MILLISECONDS);
        return settled;
    }

    private interface RelayJsonRead { org.json.JSONObject get() throws Exception; }

    private CompletableFuture<org.json.JSONObject> relayPresetLibraryRead(
        String method, org.json.JSONObject params
    ) throws Exception {
        boolean refresh = params.optBoolean("refresh", false);
        if (refresh && !params.optBoolean("_freshUsbSession", false)) {
            org.json.JSONObject readParams = new org.json.JSONObject(params.toString())
                .put("_freshUsbSession", true);
            return relayReconnect("USB session refreshed for preset catalog").thenCompose(ignored -> {
                try { return relayPresetLibraryRead(method, readParams); }
                catch (Exception error) { return failedRelay("DEVICE_ERROR", error.getMessage()); }
            });
        }
        RelayJsonRead read = () -> {
            if ("device.listPresetFolders".equals(method)) return stateDecoder.presetFolders();
            if ("device.listPresetSlots".equals(method)) return stateDecoder.presetSlots();
            String requestedSetlist = firstText(params, "setlistKey", "setlist_key");
            String setlistKey = requestedSetlist == null ? currentSetlist : requestedSetlist;
            if (setlistKey == null) throw new IllegalStateException("No active preset setlist has been synchronized.");
            return stateDecoder.presetList(setlistKey);
        };
        if (!refresh) {
            try {
                org.json.JSONObject cached = read.get();
                org.json.JSONArray folders = cached.optJSONArray("folders");
                if (!"device.listPresetFolders".equals(method) || folders != null && folders.length() > 0)
                    return CompletableFuture.completedFuture(cached);
            } catch (Exception ignored) {}
        }
        long before = lastPresetLibraryAt;
        CompletableFuture<org.json.JSONObject> result = new CompletableFuture<>();
        QcPendingOperations.Entry<PendingPresetLibraryRead> pending = pendingOperations.register(
            new PendingPresetLibraryRead(read, before), result);
        commandIo.execute(() -> {
            try {
                if (!isReady()) throw new RelayException("NOT_CONNECTED", "Quad Cortex USB disconnected before the catalog read.");
                writeMessage(stateDecoder.readCommand(QcUsbProfile.MESSAGE_TYPE_FILE));
            } catch (Exception error) {
                pendingOperations.remove(pending);
                result.completeExceptionally(error);
            }
        });
        pendingOperations.timeout(pending, QcUsbProfile.PRESET_SYNC_TIMEOUT_MS, keepalive, () -> {
            android.util.Log.w("QcUsbPlugin", "Preset catalog timeout: sent=" + messagesSent
                + " received=" + messagesReceived + " lastType=" + lastMessageType
                + " decodeErrors=" + decodeErrors + " negativeReads=" + negativeReads
                + " includeReportId=" + includeReportId + " lastError=" + lastError);
            return new RelayException("READBACK_TIMEOUT", "The QC did not provide the requested preset catalog in time.");
        });
        return result.thenCompose(value -> {
            org.json.JSONArray folders = value.optJSONArray("folders");
            if ("device.listPresetFolders".equals(method)
                && folders != null && folders.length() == 0
                && !params.optBoolean("_emptyCatalogRetried", false)) {
                try {
                    // The first File reply after a fresh USB handshake can be a
                    // header-only frame. Request the catalog once more after its
                    // quiet period instead of publishing a false empty library.
                    org.json.JSONObject retryParams = new org.json.JSONObject(params.toString())
                        .put("_freshUsbSession", true)
                        .put("_emptyCatalogRetried", true);
                    return relayPresetLibraryRead(method, retryParams);
                } catch (Exception error) {
                    return QcUsbPlugin.<org.json.JSONObject>failedFuture(error);
                }
            }
            return CompletableFuture.completedFuture(value);
        });
    }

    private CompletableFuture<org.json.JSONObject> relayMidi(int controller, int value) {
        if (value < 0 || value > 127) return failedRelay("INVALID_ARGUMENT", "MIDI value is outside the supported range.");
        if (midiOutputEndpoint == null) return failedRelay("MIDI_NOT_AVAILABLE", "Quad Cortex USB-MIDI is unavailable.");
        CompletableFuture<org.json.JSONObject> result = new CompletableFuture<>();
        long queuedAtUnixMs = System.currentTimeMillis();
        long queuedAtMonotonicMs = monotonicMillis();
        midiIo.execute(() -> {
            try {
                long remaining = QcUsbProfile.PERFORMANCE_MIDI_GAP_MS
                    - (monotonicMillis() - lastMidiCommandAt);
                if (remaining > 0) Thread.sleep(remaining);
                byte[] packet = {
                    (byte) QcUsbProfile.MIDI_USB_EVENT_PACKET_HEADER,
                    (byte) QcUsbProfile.MIDI_CONTROL_CHANGE_STATUS,
                    (byte) controller,
                    (byte) value
                };
                UsbDeviceConnection activeMidiConnection = midiConnection;
                if (activeMidiConnection == null) throw new RelayException("MIDI_NOT_AVAILABLE", "Quad Cortex USB-MIDI disconnected before the write.");
                int written = activeMidiConnection.bulkTransfer(midiOutputEndpoint, packet, packet.length, MIDI_WRITE_TIMEOUT_MS);
                lastMidiCommandAt = monotonicMillis();
                if (written != packet.length) throw new RelayException("MIDI_WRITE_FAILED", "The complete MIDI packet was not written.");
                lastMidiQueueDelayMs = Math.max(0, monotonicMillis() - queuedAtMonotonicMs);
                maxMidiQueueDelayMs = Math.max(maxMidiQueueDelayMs, lastMidiQueueDelayMs);
                result.complete(new org.json.JSONObject()
                    .put("accepted", true).put("verified", false)
                    .put("verification", "accepted_unverified")
                    .put("hostStartedAtUnixMs", queuedAtUnixMs)
                    .put("dispatchLatencyMs", lastMidiQueueDelayMs)
                    .put("detail", "Performance MIDI command accepted; live USB state will reconcile the result."));
            } catch (Exception error) { result.completeExceptionally(error); }
        });
        return result;
    }

    private org.json.JSONObject relaySnapshot() throws Exception {
        org.json.JSONObject snapshot = stateDecoder.snapshot();
        snapshot.put("connected", isReady()).put("synchronized", stateDecoder.sessionSynchronized())
            .put("position", snapshot.optInt("presetPosition", currentPosition))
            .put("observedAt", lastStateAt);
        if (currentMasterVolume < 0) snapshot.put("masterVolume", org.json.JSONObject.NULL);
        return snapshot;
    }

    private static String firstText(org.json.JSONObject value, String... keys) {
        for (String key : keys) { String text = value.optString(key, "").trim(); if (!text.isEmpty()) return text; }
        return null;
    }

    private static int firstInt(org.json.JSONObject primary, org.json.JSONObject fallback, String... keys) {
        for (String key : keys) { if (primary.has(key)) return primary.optInt(key, -1); if (fallback.has(key)) return fallback.optInt(key, -1); }
        return -1;
    }

    @PluginMethod
    public void scan(PluginCall call) {
        JSArray found = new JSArray();
        for (UsbDevice candidate : manager.getDeviceList().values()) {
            if (!isQuadCortex(candidate)) continue;
            JSObject entry = new JSObject();
            entry.put("deviceId", candidate.getDeviceId());
            entry.put("name", candidate.getProductName() == null ? getContext().getString(R.string.device_name) : candidate.getProductName());
            entry.put("manufacturer", candidate.getManufacturerName());
            entry.put("permission", manager.hasPermission(candidate));
            entry.put("interfaces", candidate.getInterfaceCount());
            found.put(entry);
        }
        JSObject result = new JSObject();
        result.put("devices", found);
        result.put("connected", isReady());
        result.put("synchronized", isReady() && stateDecoder.sessionSynchronized() && currentSetlist != null);
        if (flight != null) flight.event(found.length() == 0 ? "scan-absent" : "scan-available");
        call.resolve(result);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (flight != null) flight.event("connect-requested");
        UsbDevice candidate = findQuadCortex();
        if (candidate == null) {
            call.reject("No Quad Cortex was found over USB.", "DEVICE_NOT_FOUND");
            return;
        }
        if (isReady() && device != null
            && device.getDeviceId() == candidate.getDeviceId()) {
            resolveConnected(call, candidate);
            return;
        }
        if (connecting) {
            call.reject("The Quad Cortex USB connection is already starting.", "CONNECT_IN_PROGRESS");
            return;
        }
        if (manager.hasPermission(candidate)) {
            openAndHandshake(candidate, call);
            return;
        }
        pendingConnect = call;
        if (flight != null) flight.event("usb-permission-requested");
        PendingIntent permissionIntent = PendingIntent.getBroadcast(
            getContext(), 0, new Intent(USB_PERMISSION).setPackage(getContext().getPackageName()),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        manager.requestPermission(candidate, permissionIntent);
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        if (flight != null) flight.event("disconnect-requested");
        closeConnection();
        call.resolve();
    }

    @PluginMethod
    public void diagnostics(PluginCall call) {
        JSObject result = usbDiagnostics();
        if (flight != null) result.put("flightRecorder", flight.snapshot());
        call.resolve(result);
    }

    private JSObject usbDiagnostics() {
        JSObject result = new JSObject();
        result.put("connected", connection != null);
        result.put("device", device == null || device.getProductName() == null ? getContext().getString(R.string.device_name) : device.getProductName());
        result.put("messagesReceived", messagesReceived);
        result.put("messagesReceivedByType", messageCountsJson(messagesReceivedByType));
        result.put("rawReportsReceived", rawReportsReceived);
        result.put("messagesSent", messagesSent);
        result.put("messagesSentByType", messageCountsJson(messagesSentByType));
        result.put("decodeErrors", decodeErrors);
        result.put("expectedWriteStalls", expectedWriteStalls);
        result.put("lastMessageType", lastMessageType);
        result.put("connectedAt", connectedAt);
        result.put("setlistKnown", currentSetlist != null);
        result.put("presetPosition", currentPosition);
        result.put("modelCount", stateDecoder.modelCount());
        result.put("readAttempts", readAttempts);
        result.put("negativeReads", negativeReads);
        result.put("interfaceId", selectedInterfaceId);
        result.put("inputEndpointAddress", selectedInputEndpointAddress);
        result.put("inputMaxPacketSize", selectedInputMaxPacketSize);
        result.put("reportBytes", includeReportId
            ? QcNativeStateDecoder.REPORT_SIZE
            : QcNativeStateDecoder.REPORT_SIZE - 1);
        result.put("midiAvailable", midiOutputEndpoint != null);
        result.put("separateMidiConnection", midiConnection != null && midiConnection != connection);
        result.put("midiInterfaceId", midiInterface == null ? -1 : midiInterface.getId());
        result.put("midiOutputEndpointAddress", midiOutputEndpoint == null ? -1 : midiOutputEndpoint.getAddress());
        result.put("lastMidiQueueDelayMs", lastMidiQueueDelayMs);
        result.put("maxMidiQueueDelayMs", maxMidiQueueDelayMs);
        result.put("lastStateAt", lastStateAt);
        result.put("lastHidWriteDurationMs", lastHidWriteDurationMs);
        result.put("maxHidWriteDurationMs", maxHidWriteDurationMs);
        result.put("lastHidWriteResult", lastHidWriteResult);
        result.put("lastHidWriteIncludedReportId", lastHidWriteIncludedReportId);
        result.put("gatewayReadRecoveries", gatewayReadRecoveries);
        result.put("gatewayWriteRecoveries", gatewayWriteRecoveries);
        if (lastGatewayReadMismatch != null) result.put("lastGatewayReadMismatch", lastGatewayReadMismatch);
        UsbRequest[] inputRequests = activeInputRequests;
        result.put("readerRequestActive", inputRequests != null && inputRequests.length > 0);
        result.put("readerRequestCount", inputRequests == null ? 0 : inputRequests.length);
        result.put("readerWaiting", readerWaiting);
        result.put("readerExitedAt", readerExitedAt);
        if (lastReaderError != null) result.put("lastReaderError", lastReaderError);
        if (lastError != null) result.put("lastError", lastError);
        return result;
    }

    private static JSObject messageCountsJson(ConcurrentHashMap<Integer, Long> counts) {
        JSObject result = new JSObject();
        counts.forEach((messageType, count) -> result.put(Integer.toString(messageType), count));
        return result;
    }

    @PluginMethod
    public void gatewayInvoke(PluginCall call) {
        String method = call.getString("method", "");
        if (!GeneratedGatewayMethods.contains(method)) {
            call.reject("The requested gateway method is not part of the generated contract.", "METHOD_NOT_ALLOWED");
            return;
        }
        JSObject params = call.getObject("params");
        JSObject expected = call.getObject("expectedState");
        relayInvoke(method, params == null ? new JSObject() : params,
            expected == null ? new JSObject() : expected).whenComplete((result, error) -> {
                if (error == null) {
                    try {
                        GeneratedGatewayMethods.validateResult(method, result);
                        call.resolve(JSObject.fromJSONObject(result));
                    }
                    catch (Exception conversionError) {
                        call.reject("The gateway result did not match the generated contract.", "MALFORMED_RESPONSE", conversionError);
                    }
                }
                else if (error instanceof RelayException) {
                    RelayException relayError = (RelayException) error;
                    call.reject(error.getMessage(), relayError.code, relayError,
                        new JSObject().put("retryable", relayError.retryable()));
                }
                else if (error instanceof Exception)
                    call.reject(error.getMessage() == null ? "The gateway operation failed." : error.getMessage(),
                        "DEVICE_ERROR", (Exception) error);
                else call.reject("The gateway operation failed.", "DEVICE_ERROR");
            });
    }

    private void openAndHandshake(UsbDevice candidate, PluginCall call) {
        synchronized (this) {
            if (isReady() && device != null
                && device.getDeviceId() == candidate.getDeviceId()) {
                resolveConnected(call, candidate);
                return;
            }
            if (connecting) {
                call.reject("The Quad Cortex USB connection is already starting.", "CONNECT_IN_PROGRESS");
                return;
            }
            connecting = true;
        }
        commandIo.execute(() -> {
            try {
                openDeviceAndHandshake(candidate, null);
                resolveConnected(call, candidate);
            } catch (Exception error) {
                lastError = error.getMessage();
                closeConnection();
                call.reject(error.getMessage(), "USB_CONNECT_FAILED", error);
            } finally {
                connecting = false;
            }
        });
    }

    private void openDeviceAndHandshake(
        UsbDevice candidate, QcPendingOperations.Entry<?> preservedOperation
    ) throws Exception {
        if (flight != null) flight.event("transport-open-started");
        closeConnection(preservedOperation);
        UsbInterface selected = null;
        UsbEndpoint selectedInput = null;
        for (int index = 0; index < candidate.getInterfaceCount(); index++) {
            UsbInterface iface = candidate.getInterface(index);
            if (iface.getInterfaceClass() != UsbConstants.USB_CLASS_HID) continue;
            UsbEndpoint candidateInput = null;
            for (int endpointIndex = 0; endpointIndex < iface.getEndpointCount(); endpointIndex++) {
                UsbEndpoint endpoint = iface.getEndpoint(endpointIndex);
                if (endpoint.getDirection() == UsbConstants.USB_DIR_IN && endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_INT) candidateInput = endpoint;
            }
            if (iface.getId() == 5) {
                selected = iface;
                selectedInput = candidateInput;
                break;
            }
            if (selected == null) {
                selected = iface;
                selectedInput = candidateInput;
            }
        }
        if (selected == null) throw new IllegalStateException("The Quad Cortex HID interface was not found.");
        if (selectedInput == null) throw new IllegalStateException("The Quad Cortex HID input endpoint was not found.");
        UsbDeviceConnection opened = manager.openDevice(candidate);
        if (opened == null || !opened.claimInterface(selected, true)) {
            if (opened != null) opened.close();
            throw new IllegalStateException("Could not claim the Quad Cortex HID interface.");
        }
        if (flight != null) flight.event("hid-interface-claimed");
        UsbInterface selectedMidi = null;
        UsbEndpoint selectedMidiOutput = null;
        for (int index = 0; index < candidate.getInterfaceCount(); index++) {
            UsbInterface iface = candidate.getInterface(index);
            if (iface.getInterfaceClass() != UsbConstants.USB_CLASS_AUDIO || iface.getInterfaceSubclass() != 3) continue;
            for (int endpointIndex = 0; endpointIndex < iface.getEndpointCount(); endpointIndex++) {
                UsbEndpoint endpoint = iface.getEndpoint(endpointIndex);
                if (endpoint.getDirection() == UsbConstants.USB_DIR_OUT && endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                    selectedMidi = iface;
                    selectedMidiOutput = endpoint;
                    break;
                }
            }
            if (selectedMidiOutput != null) break;
        }
        if (selectedMidi != null) {
            UsbDeviceConnection openedMidi = manager.openDevice(candidate);
            if (openedMidi != null && openedMidi.claimInterface(selectedMidi, true)) {
                midiConnection = openedMidi;
                midiInterface = selectedMidi;
                midiOutputEndpoint = selectedMidiOutput;
                if (flight != null) flight.event("midi-interface-claimed");
            } else if (openedMidi != null) {
                openedMidi.close();
            }
        }
        device = candidate;
        connection = opened;
        hidInterface = selected;
        inputEndpoint = selectedInput;
        selectedInterfaceId = selected.getId();
        selectedInputEndpointAddress = selectedInput.getAddress();
        selectedInputMaxPacketSize = selectedInput.getMaxPacketSize();
        messagesReceived = 0;
        messagesReceivedByType.clear();
        rawReportsReceived = 0;
        messagesSent = 0;
        messagesSentByType.clear();
        decodeErrors = 0;
        expectedWriteStalls = 0;
        lastMessageType = -1;
        lastError = null;
        readAttempts = 0;
        negativeReads = 0;
        connectedAt = System.currentTimeMillis();
        lastMidiCommandAt = 0;
        lastMidiQueueDelayMs = 0;
        maxMidiQueueDelayMs = 0;
        lastHidWriteDurationMs = 0;
        maxHidWriteDurationMs = 0;
        lastStateAt = 0;
        readerWaiting = false;
        readerExitedAt = 0;
        lastReaderError = null;
        lastPresetLibraryAt = 0;
        stateDecoder.sessionOpened(monotonicMillis());
        startReader();
        if (flight != null) flight.event("reader-started");
        performHandshake();
    }

    private void resolveConnected(PluginCall call, UsbDevice candidate) {
        JSObject result = new JSObject();
        result.put("connected", isReady());
        result.put("synchronized", initializationComplete && stateDecoder.sessionSynchronized() && currentSetlist != null);
        result.put("name", candidate.getProductName() == null ? getContext().getString(R.string.device_name) : candidate.getProductName());
        result.put("deviceId", candidate.getDeviceId());
        call.resolve(result);
    }

    private boolean isReady() {
        return connection != null && stateDecoder.sessionConnected();
    }

    private void performHandshake() {
        if (flight != null) flight.event("handshake-started");
        int attempts = 0;
        boolean answered = false;
        while (!answered) {
            String session = UUID.randomUUID().toString().replace("-", "");
            QcNativeStateDecoder.HandshakeDecision handshake =
                stateDecoder.handshakeAttempt(monotonicMillis(), session);
            if (handshake.kind == QcNativeStateDecoder.HandshakeDecision.TIMED_OUT) break;
            if (handshake.kind == QcNativeStateDecoder.HandshakeDecision.WAIT) {
                Thread.yield();
                continue;
            }
            attempts = handshake.attempt;
            if (flight != null) flight.event("handshake-attempt-" + attempts);
            // The shared transport selects the same 129-byte-first HID layout
            // probe on Windows and Android, retaining the 128-byte fallback for
            // Android stacks which omit the report-ID byte from SET_REPORT.
            includeReportId = handshake.includeReportId;
            resetReply = new CountDownLatch(1);
            try {
                QcNativeStateDecoder.StartupDecision entry = handshake.startup;
                startupActive = true;
                if (entry.kind != QcNativeStateDecoder.StartupDecision.SEND
                    || entry.messages.isEmpty()) {
                    throw new IllegalStateException("Native QC startup did not produce a reset command.");
                }
                writeMessages(entry.messages);
            } catch (Exception error) {
                throw new IllegalStateException("Could not encode the QC USB reset command.", error);
            }
            try {
                answered = resetReply.await(QcUsbProfile.HANDSHAKE_ATTEMPT_TIMEOUT_MS, TimeUnit.MILLISECONDS);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("The Quad Cortex USB handshake was interrupted.", error);
            } finally {
                resetReply = null;
            }
        }
        if (!answered) {
            if (flight != null) flight.event("handshake-failed");
            throw new IllegalStateException("The Quad Cortex did not answer after " + attempts + " USB handshake attempts.");
        }
        if (flight != null) flight.event("handshake-reply");
        if (flight != null) flight.event("session-validated");
    }

    private void dispatchStartupDecision(
        QcNativeStateDecoder.StartupDecision decision, int sourceMessageType
    ) {
        if (decision.kind == QcNativeStateDecoder.StartupDecision.WAIT) return;
        if (decision.kind == QcNativeStateDecoder.StartupDecision.INVALID
            || decision.kind == QcNativeStateDecoder.StartupDecision.FAILED) {
            startupActive = false;
            lastError = "QC startup " + decision.phase + ": "
                + (decision.error == null ? "unknown protocol error" : decision.error);
            if (flight != null) flight.event("startup-" + decision.phase);
            scheduleAutomaticReconnect(lastError);
            return;
        }
        if (decision.kind == QcNativeStateDecoder.StartupDecision.CONNECTED) {
            if (flight != null) flight.event("startup-connected");
            if (flight != null) flight.event("transport-ready");
            commandIo.execute(() -> {
                try {
                    writeMessage(stateDecoder.systemTimeCommand(System.currentTimeMillis()));
                    initializationComplete = false;
                    stateDecoder.postBootInitializationStarted(monotonicMillis());
                    if (flight != null) flight.event("post-boot-seed-started");
                    advanceInitialization();
                } catch (Exception error) {
                    lastError = "Could not start QC post-boot synchronization: " + error.getMessage();
                }
            });
            return;
        }
        commandIo.execute(() -> executeStartupWrites(decision, sourceMessageType));
    }

    private void executeStartupWrites(
        QcNativeStateDecoder.StartupDecision decision, int sourceMessageType
    ) {
        if (decision.kind != QcNativeStateDecoder.StartupDecision.SEND
            || connection == null) return;
        try {
            writeMessages(decision.messages);
            if (sourceMessageType == QcUsbProfile.MESSAGE_TYPE_MODULE_STATS
                && "booting".equals(decision.phase) && flight != null) {
                flight.event("initialization-sent");
            }
            if (decision.beginBuilding) {
                // SendThenBuild is also the in-session Connection(false)
                // transition. Downgrade readiness until a fresh seed proves
                // the rebuilt state is coherent.
                initializationComplete = false;
                stateDecoder.sessionStateObserved(monotonicMillis(), false);
                QcNativeStateDecoder.StartupDecision building =
                    stateDecoder.startupBeginBuilding();
                if (building.kind == QcNativeStateDecoder.StartupDecision.SEND) {
                    writeMessages(building.messages);
                } else {
                    dispatchStartupDecision(building, -1);
                }
            }
        } catch (Exception error) {
            lastError = "Could not write QC startup command: " + error.getMessage();
            scheduleAutomaticReconnect(lastError);
        }
    }

    private void advanceInitialization() {
        if (connection == null || !stateDecoder.startupConnected()) return;
        final QcNativeStateDecoder.InitializationDecision decision;
        try {
            decision = stateDecoder.initializationAdvance(monotonicMillis());
        } catch (Exception error) {
            lastError = "Could not advance QC initialization: " + error.getMessage();
            return;
        }
        if (decision.kind == QcNativeStateDecoder.InitializationDecision.COMPLETE) {
            boolean firstCompletion = !initializationComplete;
            boolean synchronizationChanged =
                stateDecoder.sessionSynchronized() != decision.synchronizedState;
            if (firstCompletion) {
                stateDecoder.sessionHandshakeComplete(
                    monotonicMillis(), decision.synchronizedState);
            } else if (synchronizationChanged) {
                stateDecoder.sessionStateObserved(
                    monotonicMillis(), decision.synchronizedState);
            }
            initializationComplete = true;
            if (firstCompletion || synchronizationChanged) {
                commandNotBeforeMs = monotonicMillis() + QcUsbProfile.POST_INITIALIZATION_WRITE_DELAY_MS;
                resolvePendingReady();
            }
            return;
        }
        if (decision.kind != QcNativeStateDecoder.InitializationDecision.SEND
            || decision.messages.isEmpty()) return;
        commandIo.execute(() -> {
            if (!isReady()) return;
            try {
                writeMessages(decision.messages);
            } catch (Exception error) {
                lastError = "Could not write QC initialization command: " + error.getMessage();
            }
        });
    }

    private void writeMessages(java.util.List<QcNativeStateDecoder.EncodedMessage> messages) {
        writeMessages(messages, 0);
    }

    private void writeMessages(
        java.util.List<QcNativeStateDecoder.EncodedMessage> messages,
        long interMessageIntervalMs
    ) {
        for (int index = 0; index < messages.size(); index++) {
            writeMessage(messages.get(index));
            if (interMessageIntervalMs > 0 && index + 1 < messages.size()) {
                try {
                    Thread.sleep(interMessageIntervalMs);
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("The QC screen gesture was interrupted.", error);
                }
            }
        }
    }

    private synchronized void writeMessage(QcNativeStateDecoder.EncodedMessage message) {
        writeMessage(message, includeReportId);
    }

    private synchronized void writeMessage(
        QcNativeStateDecoder.EncodedMessage message, boolean withReportId
    ) {
        long stabilizationDelayMs = commandNotBeforeMs - monotonicMillis();
        if (stabilizationDelayMs > 0) {
            try {
                Thread.sleep(stabilizationDelayMs);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("The first QC command was interrupted during stabilization.", error);
            }
        }
        commandNotBeforeMs = 0;
        List<byte[]> framedReports = stateDecoder.encodeReports(message, withReportId);
        if (flight != null) flight.outbound(message.messageType, framedReports.size());
        for (byte[] report : framedReports) {
            if (connection == null || hidInterface == null) throw new IllegalStateException("Quad Cortex USB disconnected during write.");
            long writeStartedAt = monotonicMillis();
            int written = connection.controlTransfer(0x21, 0x09, (2 << 8) | QcNativeStateDecoder.OUT_REPORT_ID, hidInterface.getId(), report, report.length, HID_WRITE_TIMEOUT_MS);
            lastHidWriteDurationMs = monotonicMillis() - writeStartedAt;
            maxHidWriteDurationMs = Math.max(maxHidWriteDurationMs, lastHidWriteDurationMs);
            lastHidWriteResult = written;
            lastHidWriteIncludedReportId = withReportId;
            // The QC accepts the complete 128-byte data stage, then deliberately
            // STALLs SET_REPORT's status stage. Android surfaces that as -1,
            // exactly as hidapi does on the hardware-verified desktop path.
            if (written < 0) expectedWriteStalls++;
            else if (written != report.length) {
                lastError = "USB HID write returned " + written + " of " + report.length + " bytes.";
                throw new IllegalStateException(lastError);
            }
        }
        messagesSent++;
        messagesSentByType.merge(message.messageType, 1L, Long::sum);
        stateDecoder.sessionOutbound(monotonicMillis());
    }

    private void startReader() {
        if (inputEndpoint == null) return;
        reading = true;
        long generation = connectionGeneration.incrementAndGet();
        readerIo.execute(() -> {
            UsbDeviceConnection activeConnection = connection;
            UsbEndpoint activeEndpoint = inputEndpoint;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                readInputReportsAsync(activeConnection, activeEndpoint, generation);
                return;
            }
            try {
                while (readerIsActive(activeConnection, generation)) {
                    byte[] buffer = new byte[QcNativeStateDecoder.REPORT_SIZE];
                    readAttempts++;
                    int count = activeConnection.bulkTransfer(activeEndpoint, buffer, buffer.length, 250);
                    if (count <= 0) {
                        if (count < 0) negativeReads++;
                        continue;
                    }
                    consumeInputReport(buffer, count);
                }
            } catch (Exception error) {
                if (readerIsActive(activeConnection, generation)) {
                    lastReaderError = error.getClass().getName() + ": " + error.getMessage();
                    lastError = "QC HID reader stopped: " + lastReaderError;
                    android.util.Log.e("QcUsbPlugin", lastError, error);
                }
            } finally {
                readerExitedAt = System.currentTimeMillis();
                recoverUnexpectedReaderExit(activeConnection, generation);
            }
        });
    }

    private boolean readerIsActive(UsbDeviceConnection activeConnection, long generation) {
        return reading && generation == connectionGeneration.get() && connection == activeConnection;
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private void readInputReportsAsync(
        UsbDeviceConnection activeConnection, UsbEndpoint activeEndpoint, long generation
    ) {
        UsbRequest[] requests = new UsbRequest[HID_INPUT_REQUEST_DEPTH];
        try {
            for (int index = 0; index < requests.length; index++) {
                UsbRequest request = new UsbRequest();
                if (!request.initialize(activeConnection, activeEndpoint)) {
                    lastError = "Could not initialize QC HID input request " + (index + 1) + ".";
                    return;
                }
                ByteBuffer buffer = ByteBuffer.allocateDirect(QcNativeStateDecoder.REPORT_SIZE);
                request.setClientData(buffer);
                requests[index] = request;
            }
            activeInputRequests = requests;
            for (int index = 0; index < requests.length; index++) {
                ByteBuffer buffer = (ByteBuffer) requests[index].getClientData();
                if (!requests[index].queue(buffer)) {
                    lastError = "Could not queue QC HID input request " + (index + 1) + ".";
                    return;
                }
            }
            while (readerIsActive(activeConnection, generation)) {
                readerWaiting = true;
                UsbRequest completed = null;
                while (completed == null && readerIsActive(activeConnection, generation)) {
                    readAttempts++;
                    try { completed = activeConnection.requestWait(); }
                    finally { readerWaiting = false; }
                }
                if (!readerIsActive(activeConnection, generation)) return;
                ByteBuffer buffer = (ByteBuffer) completed.getClientData();
                if (buffer == null) {
                    lastError = "The QC HID input request ended without a matching completion.";
                    return;
                }
                int count = buffer.position();
                if (count > 0) {
                    buffer.flip();
                    byte[] bytes = new byte[count];
                    buffer.get(bytes);
                    consumeInputReport(bytes, count);
                }
                buffer.clear();
                if (!completed.queue(buffer)) {
                    lastError = "Could not requeue a QC HID input request.";
                    return;
                }
            }
        } catch (Exception error) {
            if (readerIsActive(activeConnection, generation)) {
                lastReaderError = error.getClass().getName() + ": " + error.getMessage();
                lastError = "QC HID reader stopped: " + lastReaderError;
                android.util.Log.e("QcUsbPlugin", lastError, error);
            }
        } finally {
            boolean recoverReader = readerIsActive(activeConnection, generation);
            readerWaiting = false;
            readerExitedAt = System.currentTimeMillis();
            if (activeInputRequests == requests) activeInputRequests = null;
            for (UsbRequest request : requests) if (request != null) {
                try { request.cancel(); } catch (Exception ignored) {}
                try { request.close(); } catch (Exception ignored) {}
            }
            if (recoverReader) recoverUnexpectedReaderExit(activeConnection, generation);
        }
    }

    private void recoverUnexpectedReaderExit(
        UsbDeviceConnection activeConnection, long generation
    ) {
        if (!readerIsActive(activeConnection, generation)) return;
        if (flight != null) flight.event("reader-exited-unexpectedly");
        if (stateDecoder.sessionTerminalReadFailed()) {
            scheduleAutomaticReconnect("QC HID reader recovered after interruption");
        }
    }

    private void consumeInputReport(byte[] buffer, int count) {
        rawReportsReceived += 1;
        // UsbRequest may complete with a residual one-byte read while a queued
        // ring is being cancelled for reconnect. It cannot contain the HID
        // length + flags header, so reject it before crossing JNI.
        if (count < 2 || count > buffer.length) {
            decodeErrors++;
            lastError = "Discarded truncated QC HID report of " + count + " byte(s).";
            android.util.Log.w("QcUsbPlugin", lastError);
            return;
        }
        QcPendingOperations.Entry<PendingBackup> activeBackup = pendingBackup;
        if (activeBackup != null) {
            activeBackup.operation.rawReports += 1;
            activeBackup.operation.lastRawReportBytes = count;
        }
        // The shared Rust transport accepts both Android's 128-byte HID body
        // and the 129-byte report-id-prefixed form used by desktop HID APIs.
        byte[] report = Arrays.copyOf(buffer, count);
        DecodedMessage decoded = decodeMessage(report);
        if (decoded == null) return;
        if (activeBackup != null) activeBackup.operation.decodedMessages += 1;
        messagesReceived++;
        messagesReceivedByType.merge(decoded.messageType, 1L, Long::sum);
        if (flight != null) flight.inbound(decoded.messageType);
        lastMessageType = decoded.messageType;
        if (startupActive && decoded.messageType != QcUsbProfile.MESSAGE_TYPE_MODEL_REPO) {
            try {
                QcNativeStateDecoder.StartupDecision startup =
                    stateDecoder.startupObserved(decoded.messageType, decoded.payload);
                if (decoded.messageType == QcUsbProfile.MESSAGE_TYPE_RESET_COMMS_BUFFERS
                    && "versionValidating".equals(startup.phase) && resetReply != null) {
                    resetReply.countDown();
                }
                dispatchStartupDecision(startup, decoded.messageType);
            } catch (Exception error) {
                decodeErrors++;
                lastError = "Could not advance QC startup: " + error.getMessage();
            }
        }
        if (!stateDecoder.sessionSynchronized()) {
            stateDecoder.initializationObserved(decoded.messageType, decoded.payload);
        }
        advanceInitialization();
        if (decoded.messageType == QcUsbProfile.MESSAGE_TYPE_FILE) {
            android.util.Log.i("QcUsbPlugin", "Received preset catalog frame");
            lastPresetLibraryAt = monotonicMillis();
            schedulePresetLibrarySettlement();
        }
        dispatchGatewayResponse(decoded.messageType, decoded.payload);
        publishStateBatch(decoded.states, decoded.tempoClock);
    }

    private DecodedMessage decodeMessage(byte[] report) {
        try {
            QcNativeStateDecoder.DecodedFrame frame = stateDecoder.pushReport(report);
            if (frame == null) return null;
            int type = frame.messageType;
            byte[] payload = frame.payload;
            // ModelRepo expands on its own lane and installs atomically in the
            // same shared Rust decoder used for all realtime state.
            if (type == QcUsbProfile.MESSAGE_TYPE_MODEL_REPO) {
                scheduleModelCatalogDecode(payload, connectionGeneration.get());
                return new DecodedMessage(type, payload, new ArrayList<>(), null);
            }
            return new DecodedMessage(type, payload, stateDecoder.decode(type, payload),
                type == QcUsbProfile.MESSAGE_TYPE_GLOBAL_TEMPO ? stateDecoder.tempoClock(payload) : null);
        } catch (Exception error) {
            decodeErrors++;
            lastError = error.getMessage();
            android.util.Log.w("QcUsbPlugin", "Could not decode QC HID frame: " + lastError);
            return null;
        }
    }

    private static final class DecodedMessage {
        final int messageType;
        final byte[] payload;
        final List<JSObject> states;
        final JSObject tempoClock;

        DecodedMessage(int messageType, byte[] payload, List<JSObject> states, JSObject tempoClock) {
            this.messageType = messageType;
            this.payload = payload;
            this.states = states;
            this.tempoClock = tempoClock;
        }
    }

    private static final class PendingGatewayRead {
        final QcNativeStateDecoder.PlannedGatewayRead plan;

        PendingGatewayRead(QcNativeStateDecoder.PlannedGatewayRead plan) {
            this.plan = plan;
        }
    }

    private static final class PendingGatewayTransaction {
        final QcNativeStateDecoder.PlannedGatewayWrite plan;
        final long afterSequence;
        final long hostStartedAtUnixMs;
        final AtomicBoolean wakeScheduled = new AtomicBoolean();
        volatile long verificationId;
        volatile long dispatchLatencyMs;
        volatile boolean dispatched;

        PendingGatewayTransaction(
            QcNativeStateDecoder.PlannedGatewayWrite plan, long afterSequence,
            long hostStartedAtUnixMs
        ) {
            this.plan = plan;
            this.afterSequence = afterSequence;
            this.hostStartedAtUnixMs = hostStartedAtUnixMs;
        }
    }

    private static final class PendingPresetLibraryRead {
        final RelayJsonRead read;
        final long afterObservedAt;

        PendingPresetLibraryRead(RelayJsonRead read, long afterObservedAt) {
            this.read = read;
            this.afterObservedAt = afterObservedAt;
        }
    }

    private void resolvePendingGatewayTransactions(long observationSequence, long now) {
        for (QcPendingOperations.Entry<PendingGatewayTransaction> entry : pendingOperations.entries(PendingGatewayTransaction.class)) {
            if (entry.result.isDone()) {
                pendingOperations.remove(entry);
                continue;
            }
            advancePendingGatewayTransaction(entry, observationSequence, now);
        }
    }

    private void advancePendingGatewayTransaction(
        QcPendingOperations.Entry<PendingGatewayTransaction> entry,
        long observationSequence, long now
    ) {
        PendingGatewayTransaction pending = entry.operation;
        if (entry.result.isDone() || !pending.dispatched) return;
        try {
            org.json.JSONObject action = stateDecoder.gatewayVerificationAdvance(
                pending.verificationId, observationSequence, now);
            switch (action.getString("kind")) {
                case "wait":
                    long delayMs = action.getLong("delayMs");
                    if (pending.wakeScheduled.compareAndSet(false, true)) {
                        keepalive.schedule(() -> {
                            pending.wakeScheduled.set(false);
                            long latestSequence;
                            synchronized (stateEventLock) { latestSequence = nextStateSequence - 1; }
                            advancePendingGatewayTransaction(
                                entry, latestSequence, monotonicMillis());
                        }, delayMs, TimeUnit.MILLISECONDS);
                    }
                    break;
                case "refresh":
                    commandIo.execute(() -> {
                        if (entry.result.isDone() || !isReady()) return;
                        try {
                            dispatchGatewayRefresh(action.getString("method"));
                        } catch (Exception ignored) {
                            // Passive state updates and the native deadline remain active.
                        }
                        long latestSequence;
                        synchronized (stateEventLock) { latestSequence = nextStateSequence - 1; }
                        advancePendingGatewayTransaction(
                            entry, latestSequence, monotonicMillis());
                    });
                    break;
                case "verified":
                    if (!pendingOperations.remove(entry)) return;
                    pending.wakeScheduled.set(false);
                    try {
                        entry.result.complete(new org.json.JSONObject()
                            .put("accepted", true).put("verified", true)
                            .put("verification", "authoritative_readback")
                            .put("hostStartedAtUnixMs", pending.hostStartedAtUnixMs)
                            .put("dispatchLatencyMs", pending.dispatchLatencyMs)
                            .put("stateSequence", observationSequence).put("detail", pending.plan.detail));
                    } catch (Exception error) {
                        entry.result.completeExceptionally(error);
                    }
                    break;
                case "timedOut":
                    if (!pendingOperations.remove(entry)) return;
                    pending.wakeScheduled.set(false);
                    entry.result.completeExceptionally(new RelayException(
                        "READBACK_TIMEOUT", "The QC did not confirm the requested state in time."));
                    break;
                default:
                    throw new IllegalStateException(
                        "Native QC verification returned an unknown action: " + action);
            }
        } catch (Exception error) {
            if (pendingOperations.remove(entry)) {
                stateDecoder.gatewayVerificationCancelled(pending.verificationId);
                entry.result.completeExceptionally(error);
            }
        }
    }

    private void resolvePendingPresetLibraryReads(long observedAt) {
        for (QcPendingOperations.Entry<PendingPresetLibraryRead> entry : pendingOperations.entries(PendingPresetLibraryRead.class)) {
            PendingPresetLibraryRead pending = entry.operation;
            if (entry.result.isDone() || observedAt <= pending.afterObservedAt) continue;
            try {
                org.json.JSONObject value = pending.read.get();
                if (pendingOperations.remove(entry)) {
                    entry.result.complete(value);
                }
            } catch (Exception ignored) {
                // The decoder may still be assembling a multi-message catalog.
                // A later type-4 event will retry this read without polling.
            }
        }
    }

    private void schedulePresetLibrarySettlement() {
        if (!presetLibrarySettlementScheduled.compareAndSet(false, true)) return;
        keepalive.schedule(this::settlePresetLibraryReads,
            QcUsbProfile.PRESET_LIBRARY_SETTLEMENT_QUIET_MS, TimeUnit.MILLISECONDS);
    }

    private void settlePresetLibraryReads() {
        long observedAt = lastPresetLibraryAt;
        long quietFor = monotonicMillis() - observedAt;
        if (quietFor < QcUsbProfile.PRESET_LIBRARY_SETTLEMENT_QUIET_MS) {
            keepalive.schedule(this::settlePresetLibraryReads,
                QcUsbProfile.PRESET_LIBRARY_SETTLEMENT_QUIET_MS - quietFor,
                TimeUnit.MILLISECONDS);
            return;
        }
        presetLibrarySettlementScheduled.set(false);
        resolvePendingPresetLibraryReads(observedAt);
        // Do not lose a catalog frame that raced with clearing the scheduled flag.
        if (lastPresetLibraryAt > observedAt) schedulePresetLibrarySettlement();
    }

    private void dispatchGatewayResponse(int messageType, byte[] payload) {
        if (messageType == QcUsbProfile.MESSAGE_TYPE_LOCAL_BACKUP) {
            QcPendingOperations.Entry<PendingBackup> pending = pendingBackup;
            if (pending != null && !pending.operation.recoveryStarted) {
                try {
                    JSObject update = stateDecoder.consumeBackupChunk(
                        payload, pending.operation.name, monotonicMillis());
                    int chunks = update.getInteger("chunks", pending.operation.chunks);
                    int ignored = update.getInteger("ignoredPrefixChunks", pending.operation.ignoredPrefixChunks);
                    pending.operation.chunks = chunks;
                    pending.operation.ignoredPrefixChunks = ignored;
                    if (update.getBoolean("complete", false) && pendingBackup == pending) {
                        pending.operation.recoveryStarted = true;
                        org.json.JSONObject document = (org.json.JSONObject) update.get("backup");
                        metadataIo.execute(() -> {
                            try {
                                pending.operation.savedResult = saveBackupDocument(document, pending.operation.name);
                                recoverSessionAfterBackup(pending);
                            } catch (Exception error) {
                                failPendingBackupRecovery(pending, error);
                            }
                        });
                    }
                } catch (Exception error) {
                    failPendingBackupRecovery(pending, error);
                }
            }
        }
        for (QcPendingOperations.Entry<PendingGatewayRead> entry : pendingOperations.entries(PendingGatewayRead.class)) {
            PendingGatewayRead pending = entry.operation;
            if (entry.result.isDone()
                || !stateDecoder.gatewayResponseMatches(pending.plan, messageType, payload)) continue;
            try {
                org.json.JSONObject value = stateDecoder.decodeGatewayResponse(pending.plan, payload);
                lastGatewayReadMismatch = null;
                if (pendingOperations.remove(entry)) entry.result.complete(value);
            } catch (Exception error) {
                lastGatewayReadMismatch = "type " + messageType + ": " + error.getMessage();
                // A response type may be shared by unrelated or differently
                // correlated device messages. Keep waiting for this plan's
                // shared Rust projection to accept the matching reply.
            }
        }
    }

    private void publishStateBatch(List<JSObject> decodedStates, JSObject tempoClock) {
        if (decodedStates.isEmpty() && tempoClock == null) return;
        long observedAt = System.currentTimeMillis();
        lastStateAt = observedAt;
        long sequence;
        synchronized (stateEventLock) { sequence = nextStateSequence++; }
        JSArray states = new JSArray();
        for (JSObject state : decodedStates) {
            String kind = state.getString("kind", "");
            if ("master".equals(kind) && state.has("masterVolume")) {
                double volume = state.optDouble("masterVolume", -1);
                currentMasterVolume = volume < 0 ? -1 : (int) Math.round(volume <= 1 ? volume * 100 : volume);
            }
            else if ("position".equals(kind)) {
                currentSetlist = state.getString("setlistKey", currentSetlist);
                currentPosition = state.getInteger("position", currentPosition);
            }
            state.put("observedAt", observedAt);
            states.put(state);
        }
        resolvePendingReady();
        resolvePendingGatewayTransactions(sequence, monotonicMillis());
        JSObject frame = new JSObject();
        frame.put("observedAt", observedAt);
        frame.put("states", states);
        synchronized (stateEventLock) {
            frame.put("sequence", sequence);
            if (tempoClock != null) {
                frame.put("tempoClock", tempoClock);
                latestTempoClock = new JSObject()
                    .put("available", true)
                    .put("sequence", sequence)
                    .put("receivedAtUnixMs", observedAt)
                    .put("currentBeat", tempoClock.getInteger("currentBeat"))
                    .put("currentBar", tempoClock.getInteger("currentBar"))
                    .put("currentTick", tempoClock.getInteger("currentTick"));
            }
            stateEventLog.addLast(frame);
            while (stateEventLog.size() > QcDomain.STATE_EVENT_MAXIMUM_LIMIT) stateEventLog.removeFirst();
        }
        notifyListeners("qcStateBatch", frame, true);
    }

    private void recoverSessionAfterBackup(QcPendingOperations.Entry<PendingBackup> pending) {
        // Current QC firmware can remain only partially responsive after the
        // uncorrelated LocalBackup stream finishes. A same-session preset or
        // master-volume refresh is insufficient: compiler-state reads can
        // still time out. Remove the completed backup from the pending set so
        // reconnect can own the connection lifecycle, then report success only
        // after a fresh handshake and full preset synchronization.
        if (pendingBackup != pending || pending.operation.savedResult == null) return;
        pendingBackup = null;
        if (!pendingOperations.remove(pending)) return;
        org.json.JSONObject savedResult = pending.operation.savedResult;
        relayReconnect("USB session restored after device backup").whenComplete((ignored, error) -> {
            if (error != null) {
                pending.result.completeExceptionally(new RelayException(
                    "USB_CONNECT_FAILED",
                    "The backup was saved, but the Quad Cortex session did not recover: "
                        + (error.getMessage() == null ? error.toString() : error.getMessage())));
            } else {
                pending.result.complete(savedResult);
            }
        });
    }

    private void failPendingBackupRecovery(
        QcPendingOperations.Entry<PendingBackup> pending, Exception error
    ) {
        if (pendingBackup == pending) pendingBackup = null;
        stateDecoder.backupCancelled();
        if (pendingOperations.remove(pending)) pending.result.completeExceptionally(error);
    }

    private void scheduleModelCatalogDecode(byte[] payload, long generation) {
        metadataIo.execute(() -> {
            try {
                if (generation != connectionGeneration.get() || connection == null) return;
                List<JSObject> states = stateDecoder.installModelRepo(payload);
                if (generation != connectionGeneration.get()) return;
                publishStateBatch(states, null);
                if (startupActive) {
                    QcNativeStateDecoder.StartupDecision startup =
                        stateDecoder.startupObserved(QcUsbProfile.MESSAGE_TYPE_MODEL_REPO, payload);
                    dispatchStartupDecision(startup, QcUsbProfile.MESSAGE_TYPE_MODEL_REPO);
                }
            } catch (Exception error) {
                decodeErrors++;
                lastError = error.getMessage();
            }
        });
    }

    private UsbDevice findQuadCortex() {
        for (UsbDevice candidate : manager.getDeviceList().values()) if (isQuadCortex(candidate)) return candidate;
        return null;
    }

    private static boolean isQuadCortex(UsbDevice candidate) {
        return candidate.getVendorId() == QcUsbProfile.VENDOR_ID && candidate.getProductId() == QcUsbProfile.PRODUCT_ID;
    }

    private synchronized void closeConnection() {
        closeConnection(null);
    }

    private synchronized void closeConnection(QcPendingOperations.Entry<?> preservedOperation) {
        boolean hadSession = connection != null || reading;
        if (flight != null && hadSession) flight.event("transport-closing");
        reading = false;
        startupActive = false;
        initializationComplete = false;
        commandNotBeforeMs = 0;
        connectionGeneration.incrementAndGet();
        UsbRequest[] inputRequests = activeInputRequests;
        if (inputRequests != null) {
            activeInputRequests = null;
            for (UsbRequest inputRequest : inputRequests) if (inputRequest != null) {
                try { inputRequest.cancel(); } catch (Exception ignored) {}
                try { inputRequest.close(); } catch (Exception ignored) {}
            }
        }
        if (midiConnection != null) {
            if (midiInterface != null) midiConnection.releaseInterface(midiInterface);
            midiConnection.close();
        }
        midiConnection = null;
        if (connection != null) {
            if (hidInterface != null) connection.releaseInterface(hidInterface);
            connection.close();
        }
        connection = null;
        device = null;
        hidInterface = null;
        inputEndpoint = null;
        midiInterface = null;
        midiOutputEndpoint = null;
        currentSetlist = null;
        currentPosition = -1;
        currentMasterVolume = -1;
        pendingOperations.failAllExcept(preservedOperation, () -> new RelayException(
            "NOT_CONNECTED", "Quad Cortex USB disconnected during a pending operation."));
        pendingBackup = null;
        if (pendingReady != preservedOperation) pendingReady = null;
        synchronized (stateEventLock) {
            stateEventLog.clear();
            nextStateSequence = 1;
            latestTempoClock = null;
        }
        connectedAt = 0;
        lastPresetLibraryAt = 0;
        stateDecoder.sessionDisconnected(monotonicMillis());
        stateDecoder.reset();
        if (flight != null && hadSession) flight.event("transport-closed");
    }

    @Override
    protected void handleOnDestroy() {
        if (relaySession == this) relaySession = null;
        closeConnection();
        if (flight != null) flight.close();
        readerIo.shutdownNow();
        commandIo.shutdownNow();
        midiIo.shutdownNow();
        metadataIo.shutdownNow();
        keepalive.shutdownNow();
        try { getContext().unregisterReceiver(permissionReceiver); } catch (Exception ignored) {}
        try { getContext().unregisterReceiver(deviceReceiver); } catch (Exception ignored) {}
        super.handleOnDestroy();
    }
}
