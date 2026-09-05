import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  CASES,
  FULL_RUN_MINIMUM_TRANSPORT_TIMEOUT_MS,
  MAXIMUM_EVENT_MEDIAN_MS,
  MAXIMUM_EVENT_P95_MS,
  MAXIMUM_SEND_LATENCY_MS,
  MINIMUM_CONTROL_REPETITIONS,
  MINIMUM_RAPID_PAIRS,
  MUTATION_ACK,
  REPEATABLE_PHYSICAL_CONTROLS,
  actionPlan,
  assertDisposableSlots,
  assertMutationAcknowledged,
  contractDigest,
  gatewayArguments,
  markPhysicalResultVerified,
  pngSignatureIsValid,
  redactEvidence,
  retryTransientRead,
  summarizePhysicalResults,
  validateConfig,
  validateCoverage,
  validatePerformanceEvidence,
  validateReleaseReports,
  validateTransportHealthEvidence,
  waitForPhysicalObservation
} from "../tools/hardware-conformance-lib.mjs";

test("physical HTTP reads retry transient relay disconnects without retrying ordinary failures", async () => {
  let attempts = 0;
  const recovered = await retryTransientRead(async () => {
    attempts += 1;
    if (attempts < 3) throw new TypeError("terminated");
    return "ready";
  }, { attempts: 3, intervalMs: 0 });
  assert.equal(recovered, "ready");
  assert.equal(attempts, 3);

  attempts = 0;
  await assert.rejects(
    retryTransientRead(async () => {
      attempts += 1;
      throw new Error("device rejected request");
    }, { attempts: 3, intervalMs: 0 }),
    /device rejected request/
  );
  assert.equal(attempts, 1);
});

const contract = JSON.parse(readFileSync(new URL("../contracts/qc-actions.v1.json", import.meta.url), "utf8"));
const example = JSON.parse(readFileSync(new URL("../tools/hardware-conformance.example.json", import.meta.url), "utf8"));

test("physical suite has exactly one case for every MCP device action", () => {
  assert.deepEqual(new Set(validateCoverage(contract)), new Set(Object.keys(CASES)));
  assert.equal(actionPlan(contract, new Set(["read"])).filter((item) => item.enabled).length, contract.actions.filter((action: { classification: string }) => action.classification === "read").length);
});

test("physical runner executes every contract action instead of only registering metadata", () => {
  const runner = readFileSync(new URL("../tools/hardware-conformance.mjs", import.meta.url), "utf8");
  const invoked = new Set([...runner.matchAll(/call\("([^"]+)"/g)].map((match) => match[1]));
  assert.deepEqual(
    contract.actions.map((action: { name: string }) => action.name).filter((name: string) => !invoked.has(name)),
    []
  );
});

test("physical summaries count unique contract methods instead of repeated restore calls", () => {
  const summary = summarizePhysicalResults(
    [
      { name: "system.status", status: "passed" },
      { name: "recall_preset", status: "passed" },
      { name: "recall_preset", status: "passed" },
      { name: "get_current_preset", status: "passed" },
      { name: "load_ir", status: "skipped" }
    ],
    ["recall_preset", "get_current_preset", "load_ir"],
    undefined,
    new Set(["recall_preset", "get_current_preset"])
  );
  assert.deepEqual(summary, { passed: 3, failed: 0, skipped: 1, complete: false });
});

test("full execution requires explicit fixtures and distinct disposable slots", () => {
  assert.deepEqual(validateConfig(example, { requireAll: true }), []);
  assert.equal(example.transport.timeoutMs, 240_000);
  assert.ok(example.transport.timeoutMs >= FULL_RUN_MINIMUM_TRANSPORT_TIMEOUT_MS);
  assert.throws(
    () => validateConfig({ ...example, transport: { ...example.transport, timeoutMs: 60_000 } }, { requireAll: true }),
    /shared 180-second native backup window/
  );
  assert.doesNotThrow(() => assertDisposableSlots(example, [example.persistent.slotA, example.persistent.slotB]));
  assert.throws(() => assertDisposableSlots(example, [example.persistent.slotA, example.persistent.slotA]), /distinct/);
});

test("partial configs expose missing physical fixtures without weakening the full gate", () => {
  const partial = structuredClone(example);
  delete partial.library.ir;
  assert.deepEqual(validateConfig(partial), [
    "library.ir.key", "library.ir.name", "library.ir.modelId", "library.ir.slot"
  ]);
  assert.throws(() => validateConfig(partial, { requireAll: true }), /library\.ir\.key/);
});

test("full dry run validates and identifies the exact staged candidate", () => {
  const directory = mkdtempSync(join(tmpdir(), "qc-hardware-candidate-"));
  try {
    const candidate = join(directory, "QC-Control-Windows-test.exe");
    const bytes = Buffer.from("immutable release candidate");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    writeFileSync(candidate, bytes);
    writeFileSync(`${candidate}.source.json`, JSON.stringify({
      schemaVersion: 1,
      platform: "windows",
      sourceCommit: "candidate-source",
      sourceDirty: false,
      size: bytes.length,
      sha256
    }));
    const runner = fileURLToPath(new URL("../tools/hardware-conformance.mjs", import.meta.url));
    const args = [runner, "--all", "--require-all", "--release-candidate", candidate];
    const accepted = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(accepted.status, 0, accepted.stderr);
    const plan = JSON.parse(accepted.stdout);
    assert.equal(plan.dryRun, true);
    assert.equal(plan.releaseCandidate.sha256, sha256);
    assert.equal(plan.plan.filter((item: { enabled: boolean }) => item.enabled).length, contract.actions.length);

    writeFileSync(candidate, Buffer.from("tampered release candidate"));
    const rejected = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /size|SHA-256/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("mutations require an exact out-of-band acknowledgement", () => {
  assert.throws(() => assertMutationAcknowledged({}), /QC_HARDWARE_TEST_ACK/);
  assert.doesNotThrow(() => assertMutationAcknowledged({ QC_HARDWARE_TEST_ACK: MUTATION_ACK }));
});

test("persistent coverage cannot invoke backup without separate backup consent", () => {
  const runner = fileURLToPath(new URL("../tools/hardware-conformance.mjs", import.meta.url));
  const persistent = spawnSync(process.execPath, [runner, "--config", fileURLToPath(new URL("../tools/hardware-conformance.example.json", import.meta.url)), "--live", "--persistent"], { encoding: "utf8" });
  assert.equal(persistent.status, 0, persistent.stderr);
  const persistentPlan = JSON.parse(persistent.stdout);
  assert.equal(persistentPlan.plan.find((item: { name: string }) => item.name === "create_device_backup")?.enabled, false);

  const explicit = spawnSync(process.execPath, [runner, "--config", fileURLToPath(new URL("../tools/hardware-conformance.example.json", import.meta.url)), "--live", "--persistent", "--backup"], { encoding: "utf8" });
  assert.equal(explicit.status, 0, explicit.stderr);
  const explicitPlan = JSON.parse(explicit.stdout);
  assert.equal(explicitPlan.plan.find((item: { name: string }) => item.name === "create_device_backup")?.enabled, true);
});

test("physical observation waits fail closed instead of returning stale state", async () => {
  await assert.rejects(
    waitForPhysicalObservation(
      async () => ({ connected: true, tempo: 100 }),
      (value) => value.tempo === 120,
      { timeoutMs: 0, intervalMs: 0, label: "tempo 120" }
    ),
    /Timed out waiting for tempo 120/
  );

  const observations = [false, true, true];
  const confirmed = await waitForPhysicalObservation(
    async () => ({ confirmed: observations.shift() }),
    (value) => value.confirmed === true,
    { timeoutMs: 100, intervalMs: 0, consecutiveMatches: 2 }
  );
  assert.equal(confirmed.confirmed, true);
});

test("direct gateway argument mapping matches the MCP adapter boundary", () => {
  assert.deepEqual(gatewayArguments("set_parameter", { parameter_index: 2, expected_value: 0.4, confirm_risky_operation: true }), { parameterIndex: 2, expectedValue: 0.4 });
  assert.deepEqual(gatewayArguments("preview_parameter", { parameter_index: 2, expected_value: 0.4 }), { parameterIndex: 2, expectedValue: 0.4 });
  assert.deepEqual(gatewayArguments("load_capture", { model_id: 14000, expected_model_id: null }), { modelId: 14000, expectedModelId: null });
  assert.deepEqual(gatewayArguments("rename_current_preset", { new_name: "Test", confirm_persistent_write: true }), { name: "Test", confirmRename: true });
});

test("evidence redacts identities and binary payloads", () => {
  const redacted = redactEvidence({ serial: "secret", pngBase64: Buffer.from("hello").toString("base64"), nested: { token: "bearer" } });
  assert.match(redacted.serial, /^sha256:/);
  assert.equal(redacted.pngBase64, "[binary 5 bytes]");
  assert.match(redacted.nested.token, /^sha256:/);
  assert.equal(pngSignatureIsValid({ width: 800, height: 480, pngBase64: "iVBORw0KGgo=" }, 800, 480), true);
});

test("release gate requires complete Windows and Android evidence for the current contract", () => {
  const results = ["system.status", ...contract.actions.map((action: { name: string }) => action.name)].map((name) => ({ name, status: "passed" }));
  const manifest = {
    source: { commit: "abc123", dirty: false },
    artifacts: [
      { path: "artifacts/windows/QC-Control-Windows.exe", size: 10, sha256: "win" },
      { path: "artifacts/android/QC-Control-Android.apk", size: 20, sha256: "android" }
    ]
  };
  const windowsHealth = ["before-system-recovery", "final"].map((stage) => ({
    stage, connected: true, synchronized: true, messagesReceived: 10, messagesSent: 10,
    maxHidWriteDurationMs: 5
  }));
  const androidHealth = ["before-system-recovery", "final"].map((stage) => ({
    stage, connected: true, synchronized: true, messagesReceived: 10, messagesSent: 10, decodeErrors: 0,
    readerRequestActive: true, readerRequestCount: 32, maxHidWriteDurationMs: 5,
    maxMidiQueueDelayMs: 2
  }));
  const performanceEvidence = {
    controls: Object.fromEntries(REPEATABLE_PHYSICAL_CONTROLS.map((control) => [control, {
      repetitions: MINIMUM_CONTROL_REPETITIONS, rapidPairs: MINIMUM_RAPID_PAIRS, failures: 0
    }])),
    sendLatencyMs: { max: MAXIMUM_SEND_LATENCY_MS },
    eventLatencyMs: {
      sampleCount: REPEATABLE_PHYSICAL_CONTROLS.length * MINIMUM_CONTROL_REPETITIONS,
      median: MAXIMUM_EVENT_MEDIAN_MS,
      p95: MAXIMUM_EVENT_P95_MS
    }
  };
  const base = { contractSha256: contractDigest(contract), results, restoration: [{ name: "starting-preset", status: "passed" }], summary: { complete: true } };
  const windows = { ...base, target: "windows", transportHealth: windowsHealth, performanceEvidence, releaseCandidate: { platform: "windows", sourceCommit: "abc123", size: 10, sha256: "win" } };
  const android = { ...base, target: "android", transportHealth: androidHealth, performanceEvidence, releaseCandidate: { platform: "android", sourceCommit: "abc123", size: 20, sha256: "android" } };
  const result = validateReleaseReports(contract, [windows, android], manifest);
  assert.equal(result.actionsPerTarget, contract.actions.length);
  assert.equal(result.sourceCommit, "abc123");
  assert.throws(() => validateReleaseReports(contract, [windows], manifest), /missing android report/);
  assert.throws(() => validateReleaseReports(contract, [windows, { ...android, summary: { complete: false } }], manifest), /android report is incomplete/);
  assert.throws(() => validateReleaseReports(contract, [windows, { ...android, releaseCandidate: { ...android.releaseCandidate, sha256: "stale" } }], manifest), /android report candidate digest does not match/);
  assert.throws(() => validateReleaseReports(contract, [windows, android], { ...manifest, source: { commit: "abc123", dirty: true } }), /clean source commit/);
  assert.throws(() => validateReleaseReports(contract, [{ ...windows, transportHealth: [] }, android], manifest), /windows report has no before-system-recovery USB health sample/);
  assert.throws(() => validateReleaseReports(contract, [windows, { ...android, transportHealth: androidHealth.map((entry) => ({ ...entry, maxHidWriteDurationMs: 21 })) }], manifest), /Android USB HID write latency exceeded/i);
  assert.throws(() => validateReleaseReports(contract, [{ ...windows, performanceEvidence: undefined }, android], manifest), /windows report has no physical performance evidence/);
});

test("later physical observations upgrade immediate acknowledgements without adding duplicate action rows", () => {
  const results = [{
    name: "set_tempo", status: "passed",
    evidence: { accepted: true, verified: false, verification: "accepted_unverified" }
  }];
  const row = markPhysicalResultVerified(results, "set_tempo", {
    tempo: 123, stateSequence: 42, serial: "private"
  });
  assert.equal(results.length, 1);
  assert.equal(row.evidence.verified, true);
  assert.equal(row.evidence.verification, "authoritative_physical_observation");
  assert.equal(row.evidence.physicalObservation.tempo, 123);
  assert.match(row.evidence.physicalObservation.serial, /^sha256:/);
  assert.throws(() => markPhysicalResultVerified(results, "missing", {}), /has no passed result/);
});

test("physical transport health rejects disconnected, unsynchronized, stale, and slow evidence", () => {
  const healthy = ["before-system-recovery", "final"].map((stage) => ({
    stage, connected: true, synchronized: true, messagesReceived: 1, messagesSent: 1, decodeErrors: 0,
    readerRequestActive: true, readerRequestCount: 32, maxHidWriteDurationMs: 3,
    maxMidiQueueDelayMs: 1
  }));
  assert.deepEqual(validateTransportHealthEvidence("android", healthy), []);
  assert.deepEqual(validateTransportHealthEvidence("windows", healthy), []);
  const errors = validateTransportHealthEvidence("android", healthy.map((entry) => ({
    ...entry, connected: false, synchronized: false, messagesReceived: 0, messagesSent: 0, decodeErrors: 1,
    readerRequestActive: false, maxHidWriteDurationMs: 25, maxMidiQueueDelayMs: 30,
    lastReaderError: "reader stopped"
  })));
  assert.ok(errors.some((error) => error.includes("not connected")));
  assert.ok(errors.some((error) => error.includes("not synchronized")));
  assert.ok(errors.some((error) => error.includes("no device messages")));
  assert.ok(errors.some((error) => error.includes("no outbound messages")));
  assert.ok(errors.some((error) => error.includes("decoder was not clean")));
  assert.ok(errors.some((error) => error.includes("reader was not active")));
  assert.ok(errors.some((error) => error.includes("HID write latency")));
  assert.ok(errors.some((error) => error.includes("MIDI queue latency")));
  assert.ok(errors.some((error) => error.includes("reader reported an error")));
});

test("physical performance evidence enforces repetitions, rapid pairs, and latency percentiles", () => {
  const controls = Object.fromEntries(REPEATABLE_PHYSICAL_CONTROLS.map((control) => [control, {
    repetitions: 20, rapidPairs: 5, failures: 0
  }]));
  const healthy = {
    controls,
    sendLatencyMs: { max: 20 },
    eventLatencyMs: { sampleCount: 280, median: 50, p95: 100 }
  };
  assert.deepEqual(validatePerformanceEvidence("android", healthy), []);
  const broken = structuredClone(healthy);
  broken.controls.footswitch_a = { repetitions: 19, rapidPairs: 4, failures: 1 };
  broken.sendLatencyMs.max = 21;
  broken.eventLatencyMs = { sampleCount: 279, median: 51, p95: 101 };
  const errors = validatePerformanceEvidence("android", broken);
  assert.ok(errors.some((error) => error.includes("footswitch_a was not exercised")));
  assert.ok(errors.some((error) => error.includes("rapid pairs")));
  assert.ok(errors.some((error) => error.includes("contains failures")));
  assert.ok(errors.some((error) => error.includes("send latency")));
  assert.ok(errors.some((error) => error.includes("fewer than 280 samples")));
  assert.ok(errors.some((error) => error.includes("median")));
  assert.ok(errors.some((error) => error.includes("p95")));
});
