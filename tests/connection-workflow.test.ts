import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { qcConnectionPresentation } from "../packages/typescript/qc-ui/src/use-qc-connection-workflow.ts";
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
