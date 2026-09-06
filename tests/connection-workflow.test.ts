import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { qcConnectionPresentation, qcReadyLabel } from "../packages/typescript/qc-ui/src/use-qc-connection-workflow.ts";
import { isQcConnectionFailure, qcConnectionIsVerified, qcDeviceStatusDetail, qcVisibleStatusNotice, runtimeHasSynchronizedQc } from "../apps/windows/src/qc-readiness.ts";

test("connection presentation is identical for native hosts", () => {
  assert.deepEqual(qcConnectionPresentation({ phase: "ready", detail: "ready", demo: false }), {
    connected: true, busy: false, label: "USB", appearance: "connected"
  });
  assert.deepEqual(qcConnectionPresentation({ phase: "syncing", detail: "syncing", demo: false }), {
    connected: false, busy: true, label: "SYNC", appearance: "syncing"
  });
  assert.equal(qcConnectionPresentation({ phase: "opening", detail: "opening", demo: true }).label, "WAIT");
  assert.equal(qcConnectionPresentation({ phase: "needs-attention", detail: "failed", demo: true }).appearance, "error");
  assert.equal(qcConnectionPresentation({ phase: "disconnected", detail: "absent", demo: true }).appearance, "absent");
});

test("both hosts read one device-readiness vocabulary", () => {
  // Windows verifies readiness separately, Android reads the phase alone. The
  // same device state must still be spelled the same way on both.
  const ready = { phase: "ready" as const, detail: "ready", demo: false };
  assert.equal(qcReadyLabel(ready, true), "QC READY", "Windows: verified device");
  assert.equal(qcReadyLabel(ready), "QC READY", "Android: ready transport is ready");
  assert.equal(qcReadyLabel(ready, false), "CHECKING QC", "Windows only: transport up, device unverified");
  assert.equal(qcReadyLabel(ready, true, 40), "SYNCING 40%");
  assert.equal(qcReadyLabel(ready, false, 0), "SYNCING 0%", "a zero-percent sync is still a sync, not a check");
  for (const deviceReady of [undefined, false]) {
    assert.equal(qcReadyLabel({ phase: "syncing", detail: "", demo: false }, deviceReady), "SYNCING");
    assert.equal(qcReadyLabel({ phase: "needs-attention", detail: "", demo: true }, deviceReady), "QC OFFLINE");
    assert.equal(qcReadyLabel({ phase: "degraded", detail: "", demo: true }, deviceReady), "QC OFFLINE");
    assert.equal(qcReadyLabel({ phase: "disconnected", detail: "", demo: true }, deviceReady), "DISCONNECTED");
    assert.equal(qcReadyLabel({ phase: "handshaking", detail: "", demo: true }, deviceReady), "HANDSHAKING");
  }
  assert.equal(qcReadyLabel({ phase: "ready", detail: "", demo: true }, undefined), "READY", "a demo session is never QC READY");
});

test("neither host spells device readiness on its own", () => {
  const windowsMenu = readFileSync(new URL("../apps/windows/src/menu-bar.tsx", import.meta.url), "utf8");
  const android = readFileSync(new URL("../apps/android/src/App.tsx", import.meta.url), "utf8");
  assert.match(windowsMenu, /qcReadyLabel\(connection, deviceReady, syncing \? syncProgress : undefined\)/);
  assert.match(android, /qcReadyLabel\(connection\)/);
  for (const [host, source] of [["windows", windowsMenu], ["android", android]] as const) {
    assert.doesNotMatch(source, /"QC READY"|"QC OFFLINE"|"CHECKING QC"/, `${host} must not restate readiness wording locally`);
  }
});

const liveRuntime = {
  platform: "Rust device gateway",
  gatewayAvailable: true,
  message: "Shared Rust QC engine active",
  usbDiagnostics: {
    phase: "ready",
    detail: "Active preset synchronized",
    connected: true,
    synchronized: true
  }
};

test("Windows QC ready requires a live gateway and a synchronized preset", () => {
  const synchronized = { phase: "ready" as const, detail: "ready", demo: false, lastSync: "2026-09-05T10:00:00.000Z" };
  assert.equal(qcConnectionIsVerified(synchronized, liveRuntime), true);
  assert.equal(qcConnectionIsVerified({ ...synchronized, lastSync: undefined }, liveRuntime), false);
  assert.equal(qcConnectionIsVerified(synchronized, { ...liveRuntime, gatewayAvailable: false }), false);
  assert.equal(qcConnectionIsVerified(synchronized, { ...liveRuntime, usbDiagnostics: { ...liveRuntime.usbDiagnostics, phase: "searching" } }), false);
  assert.equal(qcConnectionIsVerified(synchronized, { ...liveRuntime, usbDiagnostics: { ...liveRuntime.usbDiagnostics, connected: false } }), false);
  assert.equal(qcConnectionIsVerified(synchronized, { ...liveRuntime, usbDiagnostics: { ...liveRuntime.usbDiagnostics, synchronized: false } }), false);
  assert.equal(qcConnectionIsVerified(synchronized, liveRuntime, 72), false);
  assert.equal(runtimeHasSynchronizedQc({ ...liveRuntime, usbDiagnostics: undefined }), false, "missing device diagnostics must never produce a green Ready state");
});

test("preset/session transport failures revoke ready immediately", () => {
  assert.equal(isQcConnectionFailure("No Quad Cortex preset has been synchronized yet"), true);
  assert.equal(isQcConnectionFailure("No QC preset has been synced yet"), true);
  assert.equal(isQcConnectionFailure("Gateway closed: pipe ended"), true);
  assert.equal(isQcConnectionFailure("Device transport is busy"), false);
  assert.equal(isQcConnectionFailure("Parameter is unavailable"), false);
});

test("connection details cannot repeat stale synchronized text after readiness is revoked", () => {
  assert.equal(qcDeviceStatusDetail({ phase: "disconnected", detail: "Active preset synchronized", demo: false }, false), "Disconnected");
  assert.equal(qcDeviceStatusDetail({ phase: "needs-attention", detail: "Active preset synchronized", demo: false }, false), "Offline");
  assert.equal(qcDeviceStatusDetail({ phase: "ready", detail: "Active preset synchronized", demo: false }, false), "Synchronizing active preset");
  assert.equal(qcDeviceStatusDetail({ phase: "ready", detail: "ready", demo: false }, true), "Live and synchronized");
  assert.equal(qcVisibleStatusNotice("No QC preset has been synced yet", true, "6B · Test"), "Quad Cortex live and synchronized · 6B · Test");
  assert.equal(qcVisibleStatusNotice("Tempo set to 120 BPM", true, "6B · Test"), "Tempo set to 120 BPM");
  assert.equal(qcVisibleStatusNotice("No QC preset has been synced yet", false, "6B · Test"), "No QC preset has been synced yet");
});

test("a broker replacing a failed one restores the session without being asked", () => {
  const host = readFileSync(new URL("../apps/windows/src-tauri/src/lib.rs", import.meta.url), "utf8");
  const brokerMain = readFileSync(new URL("../services/device-broker/src/main.rs", import.meta.url), "utf8");

  // The host kills the broker on any transport failure, and the call that
  // spawns the replacement is an ordinary device poll rather than a connection
  // step. Without this, nothing ever asks the replacement to open a session and
  // every later device call answers "not connected" for the life of the process.
  assert.match(host, /let replacing = self\.started_once;[\s\S]{0,120}GatewayProcess::start\(self\.event_tx\.clone\(\), replacing\)/);
  assert.match(host, /if auto_connect \{[\s\S]{0,80}--auto-connect/);

  // The first broker still starts idle so it cannot race the client's own
  // connection flow; only a replacement connects on its own.
  assert.match(brokerMain, /if auto_connect \{[\s\S]{0,160}DeviceController::start\(\)[\s\S]{0,160}DeviceController::start_disconnected\(\)/);

  // Reconnecting is the replacement's own job: device.reconnect waits for
  // readiness, so issuing it inline would stall the poll that triggered it.
  assert.doesNotMatch(host, /GatewayProcess::start\([\s\S]{0,200}request\(rpc::RECONNECT/);
});

test("a malformed gateway result is a protocol fault, not a dropped session", () => {
  const host = readFileSync(new URL("../apps/windows/src-tauri/src/lib.rs", import.meta.url), "utf8");
  const broker = readFileSync(new URL("../services/device-broker/src/rpc.rs", import.meta.url), "utf8");

  // Only the transport arm may clear the process. Classifying a contract
  // violation as a transport fault killed a broker that was alive, answering
  // and correctly framed, on every preset change.
  assert.match(host, /validate_result\(method, result\)\.map_err\([\s\S]{0,200}GatewayRequestFailure::Remote/);
  assert.doesNotMatch(host, /validate_result\(method, result\)\.map_err\(GatewayRequestFailure::Transport\)/);

  // recallPreset, navigateBank and reloadPreset share one result builder and are
  // all contracted as DeviceActionResult, so it must carry verification
  // semantics. It performs an authoritative readback, so this is accurate.
  assert.match(broker, /"accepted": true,[\s\S]{0,160}"verification": "authoritative_readback",[\s\S]{0,120}"snapshot": after/);

  // The broker's stderr must reach disk: discarding it left a dying broker
  // indistinguishable from one the host killed.
  assert.doesNotMatch(host, /\.stderr\(Stdio::null\(\)\)/);
  assert.match(host, /fn broker_stderr_sink\(\)/);

  // The health record must keep the reason, not just the status.
  assert.match(host, /"lastDetail": detail/);
});
