#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import process from "node:process";
import {
  CASES,
  actionPlan,
  assertDisposableSlots,
  assertMutationAcknowledged,
  contractDigest,
  gatewayArguments,
  markPhysicalResultVerified,
  pngSignatureIsValid,
  redactEvidence,
  retryTransientRead,
  resultSnapshot,
  summarizePerformanceSamples,
  summarizePhysicalResults,
  usbMessageCountDelta,
  validateConfig,
  validateCoverage,
  validatePerformanceEvidence,
  waitForPhysicalObservation
} from "./hardware-conformance-lib.mjs";

const root = resolve(import.meta.dirname, "..");
const contract = JSON.parse(await readFile(resolve(root, "contracts/qc-actions.v1.json"), "utf8"));
const themeColors = JSON.parse(await readFile(resolve(root, "packages/typescript/qc-theme/src/colors.json"), "utf8"));
const argv = process.argv.slice(2);
const option = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};
const has = (name) => argv.includes(name);
const configPath = resolve(option("--config") ?? resolve(root, "tools/hardware-conformance.example.json"));
const execute = has("--execute");
const discover = has("--discover");
const prepare = has("--prepare");
const requireAll = has("--require-all");
const stressOnly = has("--stress-only");
const stressEnabled = has("--stress") || stressOnly || requireAll;
const releaseCandidatePath = option("--release-candidate");
const backupEnabled = has("--backup") || has("--all");
const enabledHazards = new Set(["read"]);
if (has("--live")) enabledHazards.add("live");
if (has("--persistent")) enabledHazards.add("persistent");
if (has("--system")) enabledHazards.add("system");
if (has("--screen-tap")) enabledHazards.add("screen");
if (has("--tuner")) enabledHazards.add("tuner");
if (has("--all")) ["live", "persistent", "system", "screen", "tuner"].forEach((value) => enabledHazards.add(value));

class FramedStdioTransport {
  constructor(config) {
    this.config = config;
    this.nextId = 1;
    this.buffer = Buffer.alloc(0);
    this.pending = new Map();
  }

  async start() {
    const command = resolve(root, this.config.command);
    this.child = spawn(command, this.config.args ?? ["--stdio"], { cwd: root, stdio: ["pipe", "pipe", "inherit"] });
    this.child.stdout.on("data", (chunk) => this.onData(chunk));
    this.child.once("exit", (code) => {
      for (const { reject } of this.pending.values()) reject(new Error(`Gateway exited with code ${code}.`));
      this.pending.clear();
    });
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 4) {
      const length = this.buffer.readUInt32BE(0);
      if (this.buffer.length < length + 4) return;
      const response = JSON.parse(this.buffer.subarray(4, length + 4).toString("utf8"));
      this.buffer = this.buffer.subarray(length + 4);
      const waiter = this.pending.get(response.id);
      if (!waiter) continue;
      this.pending.delete(response.id);
      clearTimeout(waiter.timeout);
      response.error ? waiter.reject(new Error(`${response.error.code ?? "GATEWAY_ERROR"}: ${response.error.message}`)) : waiter.resolve(response.result);
    }
  }

  request(method, params = {}) {
    const id = this.nextId++;
    const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    const header = Buffer.alloc(4);
    header.writeUInt32BE(body.length);
    return new Promise((resolveRequest, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out after ${this.config.timeoutMs ?? 60000} ms.`));
      }, this.config.timeoutMs ?? 60000);
      this.pending.set(id, { resolve: resolveRequest, reject, timeout });
      this.child.stdin.write(Buffer.concat([header, body]));
    });
  }

  status() { return this.request("system.status"); }
  call(name, args) {
    const action = contract.actions.find((candidate) => candidate.name === name);
    if (!action) throw new Error(`Unknown action ${name}.`);
    const invoke = () => this.request(action.rpc, gatewayArguments(name, args));
    return CASES[name]?.hazard === "read"
      ? retryTransientRead(invoke, { attempts: 2, intervalMs: 250 })
      : invoke();
  }
  async close() {
    const child = this.child;
    if (!child || child.exitCode !== null) return;
    const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
    child.stdin.end();
    await Promise.race([exited, new Promise((resolveWait) => setTimeout(resolveWait, 2000))]);
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([exited, new Promise((resolveWait) => setTimeout(resolveWait, 2000))]);
    }
    if (child.exitCode === null) throw new Error("Gateway process did not exit after transport close.");
  }
}

class McpHttpTransport {
  constructor(config) {
    this.config = config;
    this.nextId = 1;
  }

  async post(method, params, notification = false) {
    const id = notification ? undefined : this.nextId++;
    const bearer = process.env[this.config.bearerTokenEnv ?? "QC_MCP_BEARER_TOKEN"];
    if (!bearer) throw new Error(`Set ${this.config.bearerTokenEnv ?? "QC_MCP_BEARER_TOKEN"} for MCP HTTP testing.`);
    const headers = {
      Authorization: `Bearer ${bearer}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": this.config.protocolVersion ?? "2025-03-26"
    };
    if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;
    const response = await fetch(this.config.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", ...(id === undefined ? {} : { id }), method, ...(params === undefined ? {} : { params }) }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 60000)
    });
    if (!response.ok) throw new Error(`MCP ${method} returned HTTP ${response.status}: ${await response.text()}`);
    this.sessionId ??= response.headers.get("mcp-session-id") ?? undefined;
    if (notification) return undefined;
    const text = await response.text();
    const messages = response.headers.get("content-type")?.includes("text/event-stream")
      ? text.split(/\r?\n/)
        .filter((line) => line.startsWith("data:") && line.slice(5).trim())
        .map((line) => JSON.parse(line.slice(5).trim()))
      : [JSON.parse(text)];
    const message = messages.find((candidate) => candidate.id === id) ?? messages.at(-1);
    if (message?.error) throw new Error(`${message.error.code}: ${message.error.message}`);
    return message?.result;
  }

  async start() {
    await this.post("initialize", {
      protocolVersion: this.config.protocolVersion ?? "2025-03-26",
      capabilities: {},
      clientInfo: { name: "qc-hardware-conformance", version: "1.0.0" }
    });
    await this.post("notifications/initialized", undefined, true);
  }

  async call(name, args) {
    const invoke = () => this.post("tools/call", { name, arguments: args ?? {} });
    const result = CASES[name]?.hazard === "read"
      ? await retryTransientRead(invoke)
      : await invoke();
    if (result?.isError) throw new Error(result.content?.map((item) => item.text).filter(Boolean).join("\n") || `${name} failed.`);
    if (result?.structuredContent !== undefined) return result.structuredContent;
    const text = result?.content?.find((item) => item.type === "text")?.text;
    try { return text ? JSON.parse(text) : result; } catch { return { detail: text ?? `${name} completed.` }; }
  }

  async status() {
    const result = await retryTransientRead(
      () => this.post("resources/read", { uri: "qc://status" })
    );
    const text = result?.contents?.[0]?.text;
    return typeof text === "string" ? JSON.parse(text) : result;
  }

  async close() {
    if (!this.sessionId) return;
    const bearer = process.env[this.config.bearerTokenEnv ?? "QC_MCP_BEARER_TOKEN"];
    await fetch(this.config.endpoint, { method: "DELETE", headers: { Authorization: `Bearer ${bearer}`, "Mcp-Session-Id": this.sessionId } }).catch(() => {});
  }
}

function fail(message) { throw new Error(message); }
function assert(condition, message) { if (!condition) fail(message); }
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const timestamp = () => new Date().toISOString();
const uniqueName = (prefix, suffix) => `${prefix}-${Date.now().toString(36)}-${suffix}`.slice(0, 63);
const screenDigest = (screen) => createHash("sha256").update(screen?.pngBase64 ?? "").digest("hex");
function evidenceFor(name, value) {
  if (name === "get_current_preset") return redactEvidence({ presetName: value?.presetName, presetLocation: value?.presetLocation, presetPosition: value?.presetPosition, setlistKey: value?.setlistKey, activeScene: value?.activeScene, tempo: value?.tempo, masterVolume: value?.masterVolume, dirty: value?.dirty, blockCount: value?.blocks?.length, routeCount: value?.routes?.length });
  if (name === "get_state_events") return { native: value?.native, frameCount: value?.frames?.length ?? 0, latestSequence: value?.frames?.at(-1)?.sequence };
  if (name === "get_block_details") return { row: value?.row, column: value?.column, modelId: value?.modelId, name: value?.name, parameterCount: value?.parameters?.length ?? 0, writableParameterCount: value?.parameters?.filter((parameter) => parameter.writable)?.length ?? 0 };
  if (name === "list_models") return { modelCount: value?.models?.length ?? 0, audit: redactEvidence(value?.audit) };
  if (name === "list_presets") return { presetCount: value?.presets?.length ?? 0, setlistKey: value?.setlistKey };
  if (name === "list_preset_folders") return { folderCount: value?.folders?.length ?? 0 };
  if (name === "list_preset_slots") return { slotCount: value?.slots?.length ?? 0, emptyCount: value?.slots?.filter((slot) => slot.occupied === false)?.length ?? 0 };
  if (name === "capture_screen" || name === "get_preset_screenshot") return { width: value?.width, height: value?.height, pngSignatureValid: pngSignatureIsValid(value, value?.width, value?.height) };
  if (name === "create_device_backup") return { type: value?.type, creator: value?.creator, name: value?.name };
  return redactEvidence(value);
}

async function readReleaseCandidate(path, platform) {
  const absolutePath = resolve(path);
  let bytes;
  let metadata;
  try {
    [bytes, metadata] = await Promise.all([
      readFile(absolutePath),
      readFile(`${absolutePath}.source.json`, "utf8").then(JSON.parse)
    ]);
  } catch (error) {
    throw new Error(`Release candidate or its .source.json metadata could not be read: ${error?.message ?? error}`);
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  assert(metadata.schemaVersion === 1, "Release candidate metadata schema is unsupported.");
  assert(metadata.platform === platform, `Release candidate metadata is for ${metadata.platform}, not ${platform}.`);
  assert(metadata.sourceDirty === false, "Release candidate metadata records a dirty source tree.");
  assert(metadata.size === bytes.length, "Release candidate size no longer matches its staged metadata.");
  assert(metadata.sha256 === digest, "Release candidate SHA-256 no longer matches its staged metadata.");
  return { platform, fileName: basename(absolutePath), sourceCommit: metadata.sourceCommit, size: bytes.length, sha256: digest };
}

async function main() {
  validateCoverage(contract);
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const missingFixtures = validateConfig(config, { requireAll });
  const plan = actionPlan(contract, enabledHazards).map((item) => item.name === "create_device_backup"
    ? { ...item, enabled: item.enabled && backupEnabled }
    : item);
  if (requireAll) {
    assert(enabledHazards.size === 6, "--require-all must be combined with --all.");
    assert(backupEnabled, "--require-all requires explicit backup coverage through --all.");
    assert(missingFixtures.length === 0, "Full execution requires every fixture.");
    assert(releaseCandidatePath, "Full release evidence requires --release-candidate with a staged app artifact.");
  }
  const releaseCandidate = releaseCandidatePath ? await readReleaseCandidate(releaseCandidatePath, config.target) : undefined;
  if (!execute) {
    console.log(JSON.stringify({ dryRun: true, contractActions: contract.actions.length, enabledHazards: [...enabledHazards], missingFixtures, releaseCandidate, plan }, null, 2));
    return;
  }
  if ([...enabledHazards].some((value) => value !== "read")) assertMutationAcknowledged();
  if ((enabledHazards.has("persistent") || enabledHazards.has("system") || enabledHazards.has("screen")) && !enabledHazards.has("live")) {
    throw new Error("Persistent, system, and screen cases require --live because safe scratch-preset entry and restoration use live actions.");
  }
  if (stressEnabled && !enabledHazards.has("live")) {
    throw new Error("--stress requires --live because every performance control changes live device state.");
  }
  if (enabledHazards.has("persistent")) assertDisposableSlots(config, [config.persistent.slotA, config.persistent.slotB]);

  const transport = config.transport.kind === "gateway-stdio"
    ? new FramedStdioTransport(config.transport)
    : new McpHttpTransport(config.transport);
  if (prepare) {
    if (!execute) throw new Error("--prepare requires --execute.");
    if (discover || [...enabledHazards].some((value) => value !== "read")) throw new Error("--prepare cannot be combined with --discover or mutation-group flags.");
    assertMutationAcknowledged();
    for (const path of ["sourcePreset.setlistKey", "sourcePreset.position", "sourcePreset.expectedName", "scratchPreset.setlistKey", "scratchPreset.position", "scratchPreset.requiredNamePrefix"]) {
      if (path.split(".").reduce((value, key) => value?.[key], config) === undefined) throw new Error(`Fixture preparation requires ${path}.`);
    }
    let initial;
    try {
      await transport.start();
      let status = await transport.status();
      if (status?.phase !== "ready" && status?.connected !== true) await transport.call("reconnect_device", { confirm_risky_operation: true });
      const deadline = Date.now() + 30000;
      while (!initial && Date.now() < deadline) {
        try { initial = await transport.call("get_current_preset", {}); }
        catch { await sleep(250); }
      }
      if (!initial) throw new Error("The QC did not synchronize a starting preset.");
      const identity = await transport.call("get_device_identity", {});
      assert(typeof identity.serial === "string" && identity.serial.endsWith(config.safety.expectedSerialSuffix), "Connected QC serial does not match expectedSerialSuffix.");
      const slots = await transport.call("list_preset_slots", {});
      const target = (slots.slots ?? []).find((slot) => slot.position === config.scratchPreset.position);
      assert(target && (target.occupied === false || !target.name), "Configured scratch destination is not empty; preparation refuses to overwrite it.");
      await transport.call("recall_preset", {
        setlist_key: config.sourcePreset.setlistKey, position: config.sourcePreset.position,
        expected_preset_name: initial.presetName, expected_position: initial.presetPosition,
        expected_setlist_key: initial.setlistKey
      });
      const source = await transport.call("get_current_preset", {});
      assert(source.presetName === config.sourcePreset.expectedName, "Recalled source preset name does not match expectedName.");
      let selectedBlock;
      let selectedParameter;
      for (const block of source.blocks ?? []) {
        if (!Number.isInteger(block.modelId)) continue;
        const details = await transport.call("get_block_details", { row: block.row, column: block.column, expected_preset_name: source.presetName });
        const candidate = details.parameters?.find((parameter) => parameter.writable && parameter.enabled && Number.isFinite(parameter.normalizedValue));
        if (candidate) { selectedBlock = block; selectedParameter = candidate; break; }
      }
      assert(selectedBlock && selectedParameter, "Source preset has no writable parameter suitable for reversible testing.");
      const occupied = new Set((source.blocks ?? []).map((block) => `${block.row}:${block.column}`));
      let emptyPair;
      for (let row = 3; row >= 0 && !emptyPair; row -= 1) {
        const empty = Array.from({ length: 8 }, (_, column) => column).filter((column) => !occupied.has(`${row}:${column}`));
        if (empty.length >= 2) emptyPair = { row, addColumn: empty.at(-2), moveColumn: empty.at(-1) };
      }
      assert(emptyPair, "Source preset has no row with two empty cells for add/move/remove testing.");
      await transport.call("save_preset_as", {
        setlist_key: config.scratchPreset.setlistKey, position: config.scratchPreset.position,
        name: config.scratchPreset.requiredNamePrefix, expected_preset_name: source.presetName,
        expected_position: source.presetPosition, confirm_overwrite: false, confirm_persistent_write: true
      });
      const saved = await transport.call("get_current_preset", {});
      assert(saved.presetPosition === config.scratchPreset.position && saved.presetName.startsWith(config.scratchPreset.requiredNamePrefix), "Prepared scratch preset did not verify at its destination.");
      const route = saved.routes?.find((candidate) => candidate.inputId > 0 && candidate.outputId > 0)
        ?? saved.routes?.[0];
      assert(route, "Prepared scratch preset has no route suitable for reversible routing tests.");
      const modelCatalog = await transport.call("list_models", { query: null });
      const temporaryModel = modelCatalog.models?.find((model) => model.category === "Compressor")
        ?? modelCatalog.models?.find((model) => !["Utility", "Input", "Output", "Cab", "Bass Cab"].includes(model.category));
      assert(Number.isInteger(temporaryModel?.id), "Model catalog has no placement-safe temporary block candidate.");
      const originalValue = selectedParameter.normalizedValue;
      const testValue = Math.abs(originalValue - 0.55) >= 0.1 ? 0.55 : 0.35;
      console.log(JSON.stringify({
        prepared: true,
        target: config.target,
        scratchPreset: config.scratchPreset,
        suggestedFixtures: {
          presetScreenshot: { folderName: saved.setlistName, position: saved.presetPosition, isFactory: false },
          parameter: { row: selectedBlock.row, column: selectedBlock.column, index: selectedParameter.index, testValue },
          temporaryBlock: { modelId: temporaryModel.id, modelName: temporaryModel.name, ...emptyPair, footswitch: 7 },
          routing: { row: route.row, testInputId: route.inputId === 1 ? 2 : 1, testOutputId: route.outputId === 1 ? 2 : 1, testSplitColumn: 2, testMixColumn: 6 }
        }
      }, null, 2));
    } finally {
      if (initial) {
        try {
          const current = await transport.call("get_current_preset", {});
          if (current.setlistKey !== initial.setlistKey || current.presetPosition !== initial.presetPosition) {
            await transport.call("recall_preset", {
              setlist_key: initial.setlistKey, position: initial.presetPosition,
              expected_preset_name: current.presetName, expected_position: current.presetPosition,
              expected_setlist_key: current.setlistKey
            });
          }
        } catch {}
      }
      await transport.close().catch(() => {});
    }
    return;
  }
  if (discover) {
    if (!execute) throw new Error("--discover requires --execute.");
    if ([...enabledHazards].some((value) => value !== "read")) throw new Error("--discover cannot be combined with mutation flags.");
    try {
      await transport.start();
      let status = await transport.status();
      if (status?.phase !== "ready" && status?.connected !== true) {
        await transport.call("reconnect_device", { confirm_risky_operation: true });
      }
      const deadline = Date.now() + 30000;
      let snapshot;
      let masterVolume;
      while ((!snapshot || !masterVolume) && Date.now() < deadline) {
        if (!snapshot) {
          try { snapshot = await transport.call("get_current_preset", {}); }
          catch { /* The preset handshake is still in progress. */ }
        }
        if (!masterVolume) {
          try { masterVolume = await transport.call("get_master_volume", {}); }
          catch { /* Master Volume is published independently from the preset. */ }
        }
        if (!snapshot || !masterVolume) await sleep(250);
      }
      if (!snapshot) throw new Error("The QC did not publish a synchronized preset within 30 seconds.");
      if (!masterVolume) throw new Error("The QC did not publish authoritative Master Volume within 30 seconds.");
      snapshot = { ...snapshot, masterVolume: masterVolume.value };
      status = await transport.status();
      const identity = await transport.call("get_device_identity", {});
      let folders = await transport.call("list_preset_folders", { refresh: true });
      const slots = await transport.call("list_preset_slots", {});
      const models = await transport.call("list_models", { query: null });
      const pinned = await transport.call("list_pinned_models", {});
      const captures = await transport.call("list_captures", {});
      const irs = await transport.call("list_irs", { folder: null });
      let presets = await transport.call("list_presets", { refresh: false, setlist_key: snapshot.setlistKey });
      const screen = await transport.call("capture_screen", {});
      const libraryDeadline = Date.now() + 10000;
      while (((folders.folders?.length ?? 0) === 0 || (presets.presets?.length ?? 0) === 0) && Date.now() < libraryDeadline) {
        await sleep(500);
        if ((folders.folders?.length ?? 0) === 0) folders = await transport.call("list_preset_folders", { refresh: false });
        if ((presets.presets?.length ?? 0) === 0) presets = await transport.call("list_presets", { refresh: false, setlist_key: snapshot.setlistKey });
      }
      const emptySlots = (slots.slots ?? []).filter((slot) => slot.occupied === false || slot.name === "" || slot.name === "Unsaved").slice(0, 20);
      if (config.discoveryScreenPath && typeof screen.pngBase64 === "string") {
        const screenPath = resolve(root, config.discoveryScreenPath);
        await mkdir(dirname(screenPath), { recursive: true });
        await writeFile(screenPath, Buffer.from(screen.pngBase64, "base64"));
      }
      const irLoaderModel = (models.models ?? []).find((model) =>
        /ir loader|impulse response/i.test(`${model.category ?? ""} ${model.name ?? ""}`));
      const suggestedIr = irs.entries?.[0];
      console.log(JSON.stringify({
        discovery: true,
        target: config.target,
        status: redactEvidence(status),
        identity: { ...redactEvidence(identity), serialSuffix: typeof identity.serial === "string" ? identity.serial.slice(-4) : undefined },
        activePreset: redactEvidence(snapshot),
        folders: redactEvidence(folders.folders ?? []),
        scratchPresetCandidates: redactEvidence((presets.presets ?? []).filter((preset) => preset.name && !/^Unsaved$/i.test(preset.name)).slice(0, 30)),
        candidateDisposableSlots: redactEvidence(emptySlots),
        modelCount: models.models?.length ?? 0,
        suggestedLibraryFixtures: {
          pinnedModelId: pinned.models?.[0] ?? models.models?.[0]?.id,
          capture: redactEvidence(captures.entries?.[0]),
          ir: suggestedIr ? {
            ...redactEvidence(suggestedIr),
            modelId: irLoaderModel?.id,
            slot: 0
          } : undefined
        }
      }, null, 2));
    } finally {
      await transport.close().catch(() => {});
    }
    return;
  }
  const report = {
    schemaVersion: 1,
    startedAt: timestamp(),
    target: config.target,
    transport: config.transport.kind,
    contractVersion: contract.version,
    contractSha256: contractDigest(contract),
    contractActions: contract.actions.length,
    ...(releaseCandidate ? { releaseCandidate } : {}),
    enabledHazards: [...enabledHazards],
    results: []
  };
  let currentSnapshot;
  let originalSnapshot;
  let identity;
  let parameter;
  let originalMasterVolume;
  let originalTunerSettings;
  let originalGeneralSettings;
  let originalIoSettings;
  let originalGlobalEq;
  let originalModeCycle;
  let originalGlobalTempoSettings;
  let originalFavorites;
  let originalPinnedModels;
  let presetFolders;
  let baselineDeviceScreen;
  let pendingLaneRestore;
  const pendingTemporarySetlists = new Set();
  let transportStarted = false;
  let deviceAuthorized = false;
  let firstScreenTapSent = false;
  const performed = new Set();

  const recordTransportHealth = async (stage) => {
    const status = await transport.status();
    const diagnostics = status?.usbDiagnostics;
    if (!diagnostics || typeof diagnostics !== "object") return;
    report.transportHealth ??= [];
    report.transportHealth.push({
      stage,
      synchronized: status?.synchronized ?? diagnostics.synchronized,
      ...redactEvidence(diagnostics)
    });
    assert(diagnostics.connected === true, `USB transport was disconnected at ${stage}.`);
    assert(diagnostics.synchronized !== false, `USB state was not synchronized at ${stage}.`);
    if (Number.isFinite(diagnostics.decodeErrors)) {
      assert(diagnostics.decodeErrors === 0, `USB decoder reported ${diagnostics.decodeErrors} errors at ${stage}.`);
      assert(
        diagnostics.readerRequestActive === true && diagnostics.readerRequestCount > 0,
        `USB request reader was not active at ${stage}.`
      );
      assert(
        diagnostics.maxHidWriteDurationMs <= 20,
        `USB HID write latency reached ${diagnostics.maxHidWriteDurationMs} ms at ${stage}.`
      );
      assert(
        diagnostics.maxMidiQueueDelayMs <= 20,
        `Performance MIDI queue delay reached ${diagnostics.maxMidiQueueDelayMs} ms at ${stage}.`
      );
      assert(!diagnostics.lastReaderError, `USB reader reported an error at ${stage}: ${diagnostics.lastReaderError}`);
    } else {
      assert(diagnostics.messagesReceived > 0, `Windows USB worker observed no device messages at ${stage}.`);
    }
  };

  const skip = (name, reason) => {
    if (report.results.some((result) => result.name === name)) return;
    const metadata = CASES[name];
    report.results.push({ name, phase: metadata.phase, hazard: metadata.hazard, status: "skipped", reason });
  };
  const verified = (name, observation) => markPhysicalResultVerified(report.results, name, observation);

  const call = async (name, args = {}, verify) => {
    const metadata = CASES[name];
    if (!metadata) fail(`No physical case metadata for ${name}.`);
    if (!enabledHazards.has(metadata.hazard)) {
      report.results.push({ name, phase: metadata.phase, hazard: metadata.hazard, status: "skipped", reason: `Enable --${metadata.hazard}.` });
      return undefined;
    }
    const started = Date.now();
    process.stdout.write(`RUN ${name} ... `);
    try {
      const wireBefore = await transport.status().catch(() => undefined);
      const value = await transport.call(name, args);
      if (verify) await verify(value);
      const wireAfter = await transport.status().catch(() => undefined);
      const usbMessages = usbMessageCountDelta(wireBefore, wireAfter);
      performed.add(name);
      report.results.push({
        name,
        phase: metadata.phase,
        hazard: metadata.hazard,
        status: "passed",
        durationMs: Date.now() - started,
        evidence: {
          ...evidenceFor(name, value),
          ...(usbMessages ? { usbMessages } : {})
        }
      });
      console.log("PASS");
      return value;
    } catch (error) {
      report.results.push({ name, phase: metadata.phase, hazard: metadata.hazard, status: "failed", durationMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
      console.log("FAIL");
      throw error;
    }
  };
  const snapshot = async () => {
    const value = await transport.call("get_current_preset", {});
    assert(value && Array.isArray(value.blocks) && Array.isArray(value.routes), "Snapshot is missing blocks or routes.");
    currentSnapshot = value;
    return value;
  };
  // One full native handshake can time out while Windows releases a prior HID
  // owner; allow the broker's scheduled second attempt to prove recovery.
  const stableSnapshot = async (timeoutMs = 75000) => {
    let previousIdentity;
    let repeated = 0;
    const observed = await waitForPhysicalObservation(
      async () => {
        let value;
        try {
          value = await transport.call("get_current_preset", {});
        } catch (error) {
          if (/not connected|has not been synchronized|No Quad Cortex preset has been synchronized|Opening native QC USB session/i.test(
            error instanceof Error ? error.message : String(error)
          )) return { value: undefined, stable: false };
          throw error;
        }
        const identityKey = value?.setlistKey && Number.isInteger(value?.presetPosition)
          ? `${value.setlistKey}\u0000${value.presetPosition}\u0000${value.presetName}`
          : undefined;
        repeated = identityKey && identityKey === previousIdentity ? repeated + 1 : 1;
        previousIdentity = identityKey;
        return { value, stable: Boolean(identityKey) && repeated >= 2 };
      },
      (value) => value.stable,
      { timeoutMs, intervalMs: 250, label: "two identical complete QC preset identities" }
    );
    currentSnapshot = observed.value;
    return observed.value;
  };
  const waitForSnapshot = async (predicate, timeoutMs = 5000) => {
    return waitForPhysicalObservation(snapshot, predicate, {
      timeoutMs, intervalMs: 100, consecutiveMatches: 2, label: "two stable QC preset snapshots"
    });
  };
  const latestStateSequence = async () => {
    const value = await transport.call("get_state_events", { after_sequence: 0, limit: 256 });
    return value.frames?.at(-1)?.sequence ?? 0;
  };
  const waitForOrderedStateFrames = async (afterSequence, predicates, timeoutMs = 2000) => {
    return waitForPhysicalObservation(
      async () => {
        const value = await transport.call("get_state_events", {
          after_sequence: afterSequence,
          limit: 256
        });
        const matched = [];
        for (const frame of value.frames ?? []) {
          if (predicates[matched.length]?.(frame)) matched.push(frame);
          if (matched.length === predicates.length) break;
        }
        return matched;
      },
      (matched) => matched.length === predicates.length,
      { timeoutMs, intervalMs: 5, label: `${predicates.length} ordered QC state event${predicates.length === 1 ? "" : "s"}` }
    );
  };
  const waitForMasterVolume = async (expected, timeoutMs = 5000) => {
    return waitForPhysicalObservation(
      () => transport.call("get_master_volume", {}),
      (value) => value?.value === expected,
      { timeoutMs, intervalMs: 100, consecutiveMatches: 2, label: `master volume ${expected}` }
    );
  };
  const waitForGeneralSettings = async (predicate, timeoutMs = 12000) => {
    return waitForPhysicalObservation(
      () => transport.call("get_general_settings", {}), predicate,
      { timeoutMs, intervalMs: 500, label: "QC general settings" }
    );
  };
  const waitForIoSettings = async (predicate, timeoutMs = 20000) => {
    return waitForPhysicalObservation(
      () => transport.call("get_io_settings", {}), predicate,
      { timeoutMs, intervalMs: 1000, label: "QC I/O settings" }
    );
  };
  const waitForGlobalEq = async (predicate, timeoutMs = 12000) => {
    return waitForPhysicalObservation(
      () => transport.call("get_global_eq", {}), predicate,
      { timeoutMs, intervalMs: 500, label: "QC global EQ" }
    );
  };
  const waitForModeCycle = async (predicate, timeoutMs = 12000) => {
    return waitForPhysicalObservation(
      () => transport.call("get_mode_cycle", {}), predicate,
      { timeoutMs, intervalMs: 500, label: "QC mode-cycle settings" }
    );
  };
  const waitForGlobalTempoSettings = async (predicate, timeoutMs = 12000) => {
    return waitForPhysicalObservation(
      () => transport.call("get_global_tempo_settings", {}), predicate,
      { timeoutMs, intervalMs: 500, label: "QC global tempo settings" }
    );
  };
  const waitForFavorites = async (predicate, timeoutMs = 12000) => {
    return waitForPhysicalObservation(
      () => transport.call("list_favorites", {}), predicate,
      { timeoutMs, intervalMs: 500, label: "QC favorites" }
    );
  };
  const waitForPinnedModels = async (predicate, timeoutMs = 12000) => {
    return waitForPhysicalObservation(
      () => transport.call("list_pinned_models", {}), predicate,
      { timeoutMs, intervalMs: 500, label: "QC pinned models" }
    );
  };
  const waitForPresetFolders = async (predicate, timeoutMs = 45000) => {
    const cached = await transport.call("list_preset_folders", { refresh: false });
    if (!cached.loading && predicate(cached)) return cached;
    const refreshed = await transport.call("list_preset_folders", { refresh: true });
    if (!refreshed.loading && predicate(refreshed)) return refreshed;
    return waitForPhysicalObservation(
      () => transport.call("list_preset_folders", { refresh: true }),
      (value) => !value.loading && predicate(value),
      { timeoutMs, intervalMs: 250, label: "QC preset folders" }
    );
  };
  const waitForPresets = async (setlistKey, predicate, timeoutMs = 45000) => {
    const cached = await transport.call("list_presets", { refresh: false, setlist_key: setlistKey });
    if (!cached.loading && predicate(cached)) return cached;
    const refreshed = await transport.call("list_presets", { refresh: true, setlist_key: setlistKey });
    if (!refreshed.loading && predicate(refreshed)) return refreshed;
    return waitForPhysicalObservation(
      () => transport.call("list_presets", { refresh: true, setlist_key: setlistKey }),
      (value) => !value.loading && predicate(value),
      { timeoutMs, intervalMs: 250, label: "QC preset catalog" }
    );
  };
  const waitForBlockDetails = async (row, column, predicate, timeoutMs = 5000) => {
    return waitForPhysicalObservation(
      () => transport.call("get_block_details", {
        row,
        column,
        expected_preset_name: currentSnapshot.presetName
      }), predicate,
      { timeoutMs, intervalMs: 100, consecutiveMatches: 2, label: `QC block ${row}:${column} details` }
    );
  };
  const waitForLaneControlDetails = async (row, control, predicate, timeoutMs = 5000) => {
    return waitForPhysicalObservation(
      () => transport.call("get_lane_control_details", {
        row,
        control,
        expected_preset_name: currentSnapshot.presetName
      }), predicate,
      { timeoutMs, intervalMs: 100, consecutiveMatches: 2, label: `QC lane ${row} ${control} details` }
    );
  };
  const recall = async (preset, expected = currentSnapshot) => {
    const result = await call("recall_preset", {
      setlist_key: preset.setlistKey,
      position: preset.position,
      expected_preset_name: expected.presetName,
      expected_position: expected.presetPosition,
      expected_setlist_key: expected.setlistKey
    });
    currentSnapshot = resultSnapshot(result) ?? await snapshot();
    return currentSnapshot;
  };
  const restoreScratch = async () => {
    if (currentSnapshot.dirty) {
      await transport.call("reload_preset", {
        expected_preset_name: currentSnapshot.presetName,
        expected_position: currentSnapshot.presetPosition,
        confirm_risky_operation: true
      });
      currentSnapshot = await waitForSnapshot((value) => !value.dirty);
      assert(!currentSnapshot.dirty, "Scratch preset did not revert before restoration.");
    }
    if (currentSnapshot.setlistKey !== config.scratchPreset.setlistKey || currentSnapshot.presetPosition !== config.scratchPreset.position) {
      await recall(config.scratchPreset);
    }
    assert(currentSnapshot.presetName.startsWith(config.scratchPreset.requiredNamePrefix), "Scratch preset name does not match requiredNamePrefix.");
  };
  const performanceSamples = Object.fromEntries([
    "footswitch_a", "footswitch_b", "footswitch_c", "footswitch_d",
    "footswitch_e", "footswitch_f", "footswitch_g", "footswitch_h",
    "up", "down", "mode", "scene", "tempo", "master_volume"
  ].map((control) => [control, []]));
  const exerciseRealtime = async (control, operations, rapidPair = false) => {
    const afterSequence = await latestStateSequence();
    const attempts = [];
    for (const { name, args, predicate } of operations) {
      const startedAt = Date.now();
      attempts.push({
        startedAt,
        predicate,
        promise: transport.call(name, args).then((value) => ({
          value,
          completedAt: Date.now()
        }))
      });
      if (rapidPair && attempts.length < operations.length) await sleep(25);
    }
    try {
      const completed = await Promise.all(attempts.map((attempt) => attempt.promise));
      const frames = await waitForOrderedStateFrames(
        afterSequence,
        attempts.map((attempt) => (frame) =>
          Number(frame.observedAt) >= attempt.startedAt && attempt.predicate(frame))
      );
      attempts.forEach((attempt, index) => {
        const result = completed[index];
        const sendLatencyMs = Number.isFinite(result.value?.dispatchLatencyMs)
          ? result.value.dispatchLatencyMs
          : result.completedAt - attempt.startedAt;
        const eventLatencyMs = Number(frames[index].observedAt) - attempt.startedAt;
        assert(eventLatencyMs >= 0, `${control} state event predates its physical send.`);
        performanceSamples[control].push({
          sendLatencyMs,
          eventLatencyMs,
          rapidPair,
          failed: false
        });
      });
    } catch (error) {
      for (let index = 0; index < operations.length; index += 1) {
        performanceSamples[control].push({ rapidPair, failed: true });
      }
      throw new Error(`${control} physical performance sample failed: ${error instanceof Error ? error.message : error}`);
    }
  };
  const exerciseNavigation = async (control, direction, rapidPair) => {
    const startedAt = Date.now();
    try {
      const value = await transport.call("navigate_bank", {
        direction,
        expected_preset_name: currentSnapshot.presetName,
        expected_position: currentSnapshot.presetPosition
      });
      const completedAt = Date.now();
      currentSnapshot = resultSnapshot(value) ?? await snapshot();
      performanceSamples[control].push({
        eventLatencyMs: completedAt - startedAt,
        rapidPair,
        failed: false
      });
    } catch (error) {
      performanceSamples[control].push({ rapidPair, failed: true });
      throw error;
    }
  };

  try {
    await transport.start();
    transportStarted = true;
    const statusStarted = Date.now();
    const status = await transport.status();
    report.results.push({ name: "system.status", phase: "read", hazard: "read", status: "passed", durationMs: Date.now() - statusStarted, evidence: redactEvidence(status) });
    assert(status?.phase === "ready" || status?.connected === true || status?.gatewayAvailable === true, "Target is not connected and ready.");

    // A freshly spawned local broker reports process availability before its
    // USB session exists. Establishing that session is test setup, not the
    // separately recorded reconnect_device system case.
    if (status?.gatewayAvailable === true && status?.phase === undefined && status?.connected === undefined) {
      await transport.call("reconnect_device", { confirm_risky_operation: true });
    }
    if (!discover && config.preflightResetSession === true && enabledHazards.has("system")) {
      await transport.call("reset_device_session", { confirm_risky_operation: true });
    }

    await stableSnapshot();
    originalSnapshot = await call("get_current_preset", {}, (value) => {
      assert(Array.isArray(value.blocks) && Array.isArray(value.routes), "Preset snapshot is incomplete.");
      assert(value.setlistKey && Number.isInteger(value.presetPosition), "Preset identity is incomplete.");
    });
    currentSnapshot = originalSnapshot;
    identity = await call("get_device_identity", {}, (value) => assert(typeof value.serial === "string" && value.serial.endsWith(config.safety.expectedSerialSuffix), "Connected QC serial does not match expectedSerialSuffix."));
    deviceAuthorized = true;
    if (enabledHazards.has("tuner") && enabledHazards.has("live")) {
      // A previously interrupted tuner-setting run can leave CorOS's invisible
      // tuner session active even though its preferences were restored.
      await transport.call("show_tuner", { shown: false });
    }
    await call("get_state_events", { after_sequence: 0, limit: 256 }, (value) => assert(Array.isArray(value.frames), "State event result has no frames array."));
    if (!stressOnly) {
    await call("get_tempo_clock", {}, (value) => assert(typeof value.available === "boolean", "Tempo clock availability is missing."));
    await call("get_inhibited_modules", {}, (value) => assert(typeof value.globalGate === "boolean" && typeof value.globalEq === "boolean", "Inhibited module state is invalid."));
    originalTunerSettings = await call("get_tuner_settings", {}, (value) => assert(
      Number.isInteger(value.inputPortId) && Number.isFinite(value.referenceHz)
        && Number.isFinite(value.referenceOffsetHz) && typeof value.muted === "boolean",
      "Tuner settings are invalid."
    ));

    if (enabledHazards.has("tuner")) {
      assert(originalTunerSettings.muted === false,
        "Tuner mutation testing requires mute-while-tuning to start disabled; disable it and physically close the tuner first.");
      const testInput = originalTunerSettings.inputPortId === 1 ? 2 : 1;
      await call("set_tuner_input", {
        input_port_id: testInput,
        confirm_tuner_activation: true,
        confirm_risky_operation: true
      });
      let tuner = await transport.call("get_tuner_settings", {});
      assert(tuner.inputPortId === testInput, "Tuner input did not round-trip.");
      await transport.call("set_tuner_input", {
        input_port_id: originalTunerSettings.inputPortId,
        confirm_tuner_activation: true,
        confirm_risky_operation: true
      });

      const testOffset = originalTunerSettings.referenceOffsetHz + 1;
      await call("set_tuner_reference", {
        reference_offset_hz: testOffset,
        confirm_tuner_activation: true,
        confirm_risky_operation: true
      });
      tuner = await transport.call("get_tuner_settings", {});
      assert(Math.abs(tuner.referenceOffsetHz - testOffset) < 0.01,
        "Tuner reference offset did not round-trip.");
      await transport.call("set_tuner_reference", {
        reference_offset_hz: originalTunerSettings.referenceOffsetHz,
        confirm_tuner_activation: true,
        confirm_risky_operation: true
      });

      await call("set_tuner_mute", {
        muted: true,
        confirm_tuner_activation: true,
        confirm_risky_operation: true
      });
      tuner = await transport.call("get_tuner_settings", {});
      assert(tuner.muted === true, "Tuner mute preference did not round-trip.");
      await call("restore_tuner_audio", {
        confirm_preference_reset: true,
        confirm_risky_operation: true
      });
      tuner = await transport.call("get_tuner_settings", {});
      assert(tuner.muted === false, "restore_tuner_audio did not clear the mute preference.");
      await call("set_tuner_meter", {
        enabled: true,
        confirm_tuner_activation: true,
        confirm_risky_operation: true
      });
      await transport.call("set_tuner_meter", {
        enabled: false,
        confirm_tuner_activation: true,
        confirm_risky_operation: true
      });
      report.manualActionRequired = "Open and close the tuner once on the physical QC to release the invisible tuner session.";
      if (enabledHazards.has("live")) {
        await transport.call("show_tuner", { shown: true });
        await transport.call("show_tuner", { shown: false });
        delete report.manualActionRequired;
      }
    }
    originalGeneralSettings = await call("get_general_settings", {}, (value) => assert(
      Number.isInteger(value.sceneBypassBehavior === "alwaysOverwrite" ? 0 : value.sceneBypassBehavior === "nonstompOverwrite" ? 1 : value.sceneBypassBehavior === "neverOverwrite" ? 2 : NaN),
      "General settings did not include a valid scene bypass behavior."
    ));
    originalIoSettings = await call("get_io_settings", {}, (value) => assert(
      Array.isArray(value.inputs) && value.inputs.length > 0 && Array.isArray(value.outputs),
      "I/O settings did not include input and output port arrays."
    ));
    originalGlobalEq = await call("get_global_eq", {}, (value) => assert(
      Array.isArray(value.parameters) && value.parameters.length > 0,
      "Global EQ did not include its parameter array."
    ));
    originalModeCycle = await call("get_mode_cycle", {}, (value) => assert(
      Array.isArray(value.slots) && value.slots.length >= 1 && value.slots.length <= 3,
      "Mode cycle did not include one through three slots."
    ));
    await call("get_global_tempo_settings", {}, (value) => assert(
      ["PRESET", "GLOBAL"].includes(value.mode) && Array.isArray(value.beats) && value.beats.length === 13,
      "Global tempo settings did not include a valid mode and thirteen beat cells."
    ));
    await call("get_looper_status", {}, (value) => assert(value && typeof value === "object", "Looper status is invalid."));
    await call("list_recents", {}, (value) => assert(Array.isArray(value.entries), "Recent preset list is invalid."));
    originalFavorites = await call("list_favorites", {}, (value) => assert(Array.isArray(value.entries), "Favorite preset list is invalid."));
    originalPinnedModels = await call("list_pinned_models", {}, (value) => assert(
      Array.isArray(value.models) && Array.isArray(value.captures), "Pinned model list is invalid."
    ));
    await call("list_captures", {}, (value) => assert(Array.isArray(value.entries), "Capture library list is invalid."));
    await call("list_irs", { folder: null }, (value) => assert(Array.isArray(value.entries), "IR library list is invalid."));
    const capturedScreen = await call("capture_screen", {}, (value) => assert(pngSignatureIsValid(value, 800, 480), "Live screen PNG is invalid."));
    await call("get_graphics_tree", {}, (value) => assert(
      typeof value.tree === "string" && value.tree.includes("zenUI::"),
      "Graphics tree did not contain the live zenUI structure."
    ));
    baselineDeviceScreen = capturedScreen;
    if (config.discoveryScreenPath && typeof capturedScreen?.pngBase64 === "string") {
      const screenPath = resolve(root, config.discoveryScreenPath);
      await mkdir(dirname(screenPath), { recursive: true });
      await writeFile(screenPath, Buffer.from(capturedScreen.pngBase64, "base64"));
    }
    await call("get_preset_screenshot", {
      folder_name: config.presetScreenshot.folderName,
      position: config.presetScreenshot.position,
      is_factory: Boolean(config.presetScreenshot.isFactory)
    }, (value) => assert(pngSignatureIsValid(value, 800, 384), "Preset screenshot PNG is invalid."));
    presetFolders = await call("list_preset_folders", { refresh: true }, (value) => assert(Array.isArray(value.folders), "Preset folder list is invalid."));
    await call("list_presets", { refresh: false, setlist_key: config.scratchPreset.setlistKey }, (value) => assert(Array.isArray(value.presets), "Preset list is invalid."));
    await call("list_preset_slots", {}, (value) => assert(Array.isArray(value.slots), "Preset slot list is invalid."));
    await call("list_models", { query: null }, (value) => assert(Array.isArray(value.models) && value.models.length > 0, "Model list is empty."));
    const masterState = await call("get_master_volume", {}, (value) => assert(Number.isFinite(value.value), "Master volume is invalid."));
    originalMasterVolume = masterState.value;
    } else {
      const masterState = await call("get_master_volume", {}, (value) => assert(Number.isFinite(value.value), "Master volume is invalid."));
      originalMasterVolume = masterState.value;
    }

    if (enabledHazards.has("live") || enabledHazards.has("persistent") || enabledHazards.has("system") || enabledHazards.has("screen")) {
      const scratchAlreadyActive = currentSnapshot.setlistKey === config.scratchPreset.setlistKey
        && currentSnapshot.presetPosition === config.scratchPreset.position;
      if (scratchAlreadyActive && currentSnapshot.dirty) {
        await transport.call("reload_preset", {
          expected_preset_name: currentSnapshot.presetName,
          expected_position: currentSnapshot.presetPosition,
          confirm_risky_operation: true
        });
        currentSnapshot = await waitForSnapshot((value) => !value.dirty);
        assert(!currentSnapshot.dirty, "Configured scratch preset could not be reverted during preflight.");
        originalSnapshot = currentSnapshot;
      } else if (!scratchAlreadyActive) {
        await recall(config.scratchPreset);
      }
      assert(currentSnapshot.presetName.startsWith(config.scratchPreset.requiredNamePrefix), "Refusing mutations: active preset is not the configured scratch preset.");
      const block = currentSnapshot.blocks.find((candidate) => candidate.row === config.parameter.row && candidate.column === config.parameter.column);
      assert(block, "Configured parameter block is not occupied in the scratch preset.");
      const details = await call("get_block_details", { row: block.row, column: block.column, expected_preset_name: currentSnapshot.presetName });
      parameter = details.parameters?.find((candidate) => candidate.index === config.parameter.index);
      assert(parameter?.writable && Number.isFinite(parameter.normalizedValue), "Configured test parameter is not writable or has no normalized value.");
      const laneDetails = await call("get_lane_control_details", { row: config.parameter.row, control: "inputGate", expected_preset_name: currentSnapshot.presetName });
      const laneParameter = laneDetails.parameters?.find((candidate) => candidate.writable && Number.isFinite(candidate.normalizedValue));
      assert(laneParameter, "Scratch preset Input Gate has no writable normalized parameter.");
      config.runtimeLaneParameter = { row: config.parameter.row, control: "inputGate", parameter: laneParameter };
      if (enabledHazards.has("live")) {
        const laneOriginalValue = laneParameter.normalizedValue;
        const laneTestValue = Math.abs(laneOriginalValue - 0.55) >= 0.1 ? 0.55 : 0.35;
        pendingLaneRestore = {
          row: config.parameter.row,
          control: "inputGate",
          parameterIndex: laneParameter.index,
          value: laneOriginalValue
        };
        await call("preview_lane_control_parameter", {
          row: config.parameter.row, control: "inputGate", parameter_index: laneParameter.index,
          value: laneTestValue, expected_value: laneOriginalValue, expected_preset_name: currentSnapshot.presetName
        });
        const previewedLaneParameter = await waitForLaneControlDetails(config.parameter.row, "inputGate", (value) =>
          Math.abs(value.parameters?.find((candidate) => candidate.index === laneParameter.index)?.normalizedValue - laneTestValue) < 0.002);
        verified("preview_lane_control_parameter", {
          row: config.parameter.row, control: "inputGate", parameterIndex: laneParameter.index,
          normalizedValue: previewedLaneParameter.parameters?.find((candidate) => candidate.index === laneParameter.index)?.normalizedValue,
          observedAt: previewedLaneParameter.observedAt
        });
        await call("set_lane_control_parameter", {
          row: config.parameter.row, control: "inputGate", parameter_index: laneParameter.index,
          value: laneOriginalValue, expected_value: laneTestValue, expected_preset_name: currentSnapshot.presetName
        });
        const restoredLaneParameter = await waitForLaneControlDetails(config.parameter.row, "inputGate", (value) =>
          Math.abs(value.parameters?.find((candidate) => candidate.index === laneParameter.index)?.normalizedValue - laneOriginalValue) < 0.002);
        verified("set_lane_control_parameter", {
          row: config.parameter.row, control: "inputGate", parameterIndex: laneParameter.index,
          normalizedValue: restoredLaneParameter.parameters?.find((candidate) => candidate.index === laneParameter.index)?.normalizedValue,
          observedAt: restoredLaneParameter.observedAt
        });
        pendingLaneRestore = undefined;

        const laneOriginalSceneMode = Boolean(laneParameter.sceneMode);
        await call("set_lane_control_scene_mode", {
          row: config.parameter.row, control: "inputGate", parameter_index: laneParameter.index,
          enabled: !laneOriginalSceneMode, expected_preset_name: currentSnapshot.presetName
        });
        await waitForLaneControlDetails(config.parameter.row, "inputGate", (value) =>
          value.parameters?.find((candidate) => candidate.index === laneParameter.index)?.sceneMode === !laneOriginalSceneMode);
        await transport.call("set_lane_control_scene_mode", {
          row: config.parameter.row, control: "inputGate", parameter_index: laneParameter.index,
          enabled: laneOriginalSceneMode, expected_preset_name: currentSnapshot.presetName
        });
        await waitForLaneControlDetails(config.parameter.row, "inputGate", (value) =>
          value.parameters?.find((candidate) => candidate.index === laneParameter.index)?.sceneMode === laneOriginalSceneMode);
      }
    } else {
      const block = originalSnapshot.blocks.find((candidate) => candidate.modelId !== undefined);
      if (block) await call("get_block_details", { row: block.row, column: block.column, expected_preset_name: originalSnapshot.presetName }, (value) => assert(Array.isArray(value.parameters), "Block details are invalid."));
      else report.results.push({ name: "get_block_details", phase: "read", hazard: "read", status: "skipped", reason: "Active preset has no occupied model block." });
      await call("get_lane_control_details", { row: 0, control: "inputGate", expected_preset_name: originalSnapshot.presetName }, (value) => assert(Array.isArray(value.parameters), "Input Gate details are invalid."));
    }

    if (enabledHazards.has("live") && !stressOnly) {
      const originalScene = currentSnapshot.activeScene;
      const selectedScene = config.performance.scene === originalScene
        ? (originalScene + 1) % 8
        : config.performance.scene;
      await call("select_scene", { scene: selectedScene, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.activeScene === selectedScene);
      assert(currentSnapshot.activeScene === selectedScene, "Scene selection did not persist to snapshot.");
      verified("select_scene", { activeScene: currentSnapshot.activeScene, observedAt: currentSnapshot.observedAt });
      await transport.call("select_scene", { scene: originalScene, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.activeScene === originalScene);

      const sceneDestination = config.performance.sceneCopyDestination;
      assert(sceneDestination !== originalScene, "sceneCopyDestination must differ from the starting scene.");
      await call("copy_scene", { from_scene: originalScene, to_scene: sceneDestination, swap: true, expected_preset_name: currentSnapshot.presetName });
      await transport.call("copy_scene", { from_scene: originalScene, to_scene: sceneDestination, swap: true, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await snapshot();

      const originalSceneLabel = currentSnapshot.scenes[originalScene];
      await call("set_scene_label", { scene: originalScene, label: config.performance.sceneTestLabel, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.scenes?.[originalScene] === config.performance.sceneTestLabel);
      await transport.call("set_scene_label", { scene: originalScene, label: originalSceneLabel, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.scenes?.[originalScene] === originalSceneLabel);

      const originalSceneColor = currentSnapshot.sceneColors?.[originalScene];
      await call("set_scene_color", { scene: originalScene, color: config.performance.sceneTestColor, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await snapshot();
      if (originalSceneColor) {
        const restoreColor = Math.max(0, themeColors.scene.indexOf(originalSceneColor));
        await transport.call("set_scene_color", { scene: originalScene, color: restoreColor, expected_preset_name: currentSnapshot.presetName });
        currentSnapshot = await snapshot();
      }

      await call("show_tuner", { shown: true });
      const tunerScreen = await transport.call("capture_screen", {});
      assert(pngSignatureIsValid(tunerScreen, 800, 480), "Tuner device-screen verification returned an invalid PNG.");
      assert(screenDigest(tunerScreen) !== screenDigest(baselineDeviceScreen), "Opening the tuner did not change the physical QC screen.");
      verified("show_tuner", { width: tunerScreen.width, height: tunerScreen.height, sha256: screenDigest(tunerScreen) });
      await transport.call("show_tuner", { shown: false });
      delete report.manualActionRequired;
      await call("show_gig_view", { shown: true });
      const gigScreen = await transport.call("capture_screen", {});
      assert(pngSignatureIsValid(gigScreen, 800, 480), "Gig View device-screen verification returned an invalid PNG.");
      assert(screenDigest(gigScreen) !== screenDigest(baselineDeviceScreen), "Opening Gig View did not change the physical QC screen.");
      verified("show_gig_view", { width: gigScreen.width, height: gigScreen.height, sha256: screenDigest(gigScreen) });
      await transport.call("show_gig_view", { shown: false });

      const modeBySlot = new Map(
        (currentSnapshot.modeSlots ?? []).map((entry) => [entry.slot, entry.mode])
      );
      const selectedMode = modeBySlot.get(config.performance.modeSlot);
      const restoredMode = modeBySlot.get(config.performance.restoreModeSlot);
      assert(selectedMode, `The QC did not report configured mode slot ${config.performance.modeSlot}.`);
      assert(restoredMode, `The QC did not report configured restore mode slot ${config.performance.restoreModeSlot}.`);
      await call("select_mode_slot", { slot: config.performance.modeSlot, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.mode === selectedMode);
      assert(currentSnapshot.mode === selectedMode, "Mode-slot selection did not reach authoritative device state.");
      verified("select_mode_slot", { mode: currentSnapshot.mode, observedAt: currentSnapshot.observedAt });
      await transport.call("select_mode_slot", { slot: config.performance.restoreModeSlot, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.mode === restoredMode);
      assert(currentSnapshot.mode === restoredMode, "Mode-slot restoration did not reach authoritative device state.");

      await call("control_looper", { command: "open", value: null });
      const looperScreen = await transport.call("capture_screen", {});
      assert(pngSignatureIsValid(looperScreen, 800, 480), "Looper device-screen verification returned an invalid PNG.");
      assert(screenDigest(looperScreen) !== screenDigest(baselineDeviceScreen), "Opening Looper X did not change the physical QC screen.");
      verified("control_looper", { width: looperScreen.width, height: looperScreen.height, sha256: screenDigest(looperScreen) });
      await transport.call("control_looper", { command: "close", value: null });
      currentSnapshot = await snapshot();
      const volumeAfterScreenRecovery = await transport.call("get_master_volume", {});
      report.highVolumeRecovery = {
        masterVolumeBefore: originalMasterVolume,
        masterVolumeAfter: volumeAfterScreenRecovery.value,
        observedAt: volumeAfterScreenRecovery.observedAt
      };
      assert(Math.abs(volumeAfterScreenRecovery.value - originalMasterVolume) <= 1,
        `High-volume screen verification changed Master Volume by more than one quantization step (${originalMasterVolume} to ${volumeAfterScreenRecovery.value}).`);

      const originalVolume = volumeAfterScreenRecovery.value;
      await call("set_master_volume", { value: config.performance.masterVolume, expected_value: originalVolume, confirm_risky_operation: true });
      const changedVolume = await waitForMasterVolume(config.performance.masterVolume);
      assert(changedVolume?.value === config.performance.masterVolume, "Master volume did not reach the configured test value.");
      verified("set_master_volume", changedVolume);
      await transport.call("set_master_volume", { value: originalMasterVolume, expected_value: config.performance.masterVolume, confirm_risky_operation: true });
      const restoredVolume = await waitForMasterVolume(originalMasterVolume);
      assert(restoredVolume?.value === originalMasterVolume, "Master volume did not restore to its authoritative starting value.");

      const originalTempo = currentSnapshot.tempo;
      await call("set_tempo", { bpm: config.performance.tempo, expected_tempo: originalTempo, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.tempo === config.performance.tempo);
      verified("set_tempo", { tempo: currentSnapshot.tempo, observedAt: currentSnapshot.observedAt });
      await call("tap_tempo", { expected_mode: currentSnapshot.mode, expected_preset_name: currentSnapshot.presetName });
      await sleep(350);
      await transport.call("tap_tempo", { expected_mode: currentSnapshot.mode, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.tempo !== config.performance.tempo);
      verified("tap_tempo", { tempo: currentSnapshot.tempo, observedAt: currentSnapshot.observedAt });
      await transport.call("set_tempo", { bpm: originalTempo, expected_tempo: currentSnapshot.tempo, expected_preset_name: currentSnapshot.presetName });

      const originalBypass = Boolean(currentSnapshot.blocks.find((candidate) => candidate.row === config.parameter.row && candidate.column === config.parameter.column)?.bypassed);
      await call("set_bypass", {
        row: config.parameter.row, column: config.parameter.column, desired_bypassed: !originalBypass,
        expected_bypassed: originalBypass, expected_scene: currentSnapshot.activeScene, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.blocks.some((block) => block.row === config.parameter.row && block.column === config.parameter.column && Boolean(block.bypassed) === !originalBypass));
      verified("set_bypass", {
        row: config.parameter.row, column: config.parameter.column, bypassed: !originalBypass,
        observedAt: currentSnapshot.observedAt
      });
      await transport.call("set_bypass", {
        row: config.parameter.row, column: config.parameter.column, desired_bypassed: originalBypass,
        expected_bypassed: !originalBypass, expected_scene: currentSnapshot.activeScene, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.blocks.some((block) => block.row === config.parameter.row && block.column === config.parameter.column && Boolean(block.bypassed) === originalBypass));

      const originalValue = parameter.normalizedValue;
      await call("preview_parameter", {
        row: config.parameter.row, column: config.parameter.column, parameter_index: parameter.index,
        value: config.parameter.testValue, expected_value: originalValue, expected_scene: currentSnapshot.activeScene, expected_preset_name: currentSnapshot.presetName
      });
      const previewedParameter = await waitForBlockDetails(config.parameter.row, config.parameter.column, (value) => Math.abs(value.parameters?.find((candidate) => candidate.index === parameter.index)?.normalizedValue - config.parameter.testValue) < 0.002);
      verified("preview_parameter", {
        row: config.parameter.row, column: config.parameter.column, parameterIndex: parameter.index,
        normalizedValue: previewedParameter.parameters?.find((candidate) => candidate.index === parameter.index)?.normalizedValue,
        observedAt: previewedParameter.observedAt
      });
      await transport.call("set_parameter", {
        row: config.parameter.row, column: config.parameter.column, parameter_index: parameter.index,
        value: originalValue, expected_value: config.parameter.testValue, expected_scene: currentSnapshot.activeScene, expected_preset_name: currentSnapshot.presetName
      });
      await waitForBlockDetails(config.parameter.row, config.parameter.column, (value) => Math.abs(value.parameters?.find((candidate) => candidate.index === parameter.index)?.normalizedValue - originalValue) < 0.002);

      const originalSceneMode = Boolean(parameter.sceneMode);
      await call("set_parameter_scene_mode", {
        row: config.parameter.row, column: config.parameter.column, parameter_index: parameter.index,
        enabled: !originalSceneMode, expected_preset_name: currentSnapshot.presetName
      });
      await waitForBlockDetails(config.parameter.row, config.parameter.column, (value) => value.parameters?.find((candidate) => candidate.index === parameter.index)?.sceneMode === !originalSceneMode);
      await transport.call("set_parameter_scene_mode", {
        row: config.parameter.row, column: config.parameter.column, parameter_index: parameter.index,
        enabled: originalSceneMode, expected_preset_name: currentSnapshot.presetName
      });
      await waitForBlockDetails(config.parameter.row, config.parameter.column, (value) => value.parameters?.find((candidate) => candidate.index === parameter.index)?.sceneMode === originalSceneMode);

      assert(parameter.expressionAssignable, "Configured hardware-test parameter must support expression assignment.");
      const originalPedal = Number(parameter.expression ?? 0);
      const originalMinimum = Number(parameter.expressionMinimum ?? 0);
      const originalMaximum = Number(parameter.expressionMaximum ?? 1);
      await call("set_parameter_expression", {
        row: config.parameter.row, column: config.parameter.column, parameter_index: parameter.index,
        pedal: 1, minimum: 0.1, maximum: 0.9, expected_preset_name: currentSnapshot.presetName
      });
      await waitForBlockDetails(config.parameter.row, config.parameter.column, (value) => {
        const item = value.parameters?.find((candidate) => candidate.index === parameter.index);
        return item?.expression === 1 && Math.abs(item.expressionMinimum - 0.1) < 0.002 && Math.abs(item.expressionMaximum - 0.9) < 0.002;
      });
      await transport.call("set_parameter_expression", {
        row: config.parameter.row, column: config.parameter.column, parameter_index: parameter.index,
        pedal: originalPedal, minimum: originalMinimum, maximum: originalMaximum, expected_preset_name: currentSnapshot.presetName
      });
      await waitForBlockDetails(config.parameter.row, config.parameter.column, (value) => Number(value.parameters?.find((candidate) => candidate.index === parameter.index)?.expression ?? 0) === originalPedal);

      const midiSource = config.performance.footswitchIndex;
      const originalMidiOut = currentSnapshot.midiOut?.find((group) => group.source === midiSource)?.messages ?? [];
      const testMidiOut = [{ type: 1, channel: 16, param1: 119, param2: 1, param3: 0 }];
      await call("set_midi_out", {
        source: midiSource, messages: testMidiOut, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.midiOut?.find((group) => group.source === midiSource)?.messages?.[0]?.param1 === 119);
      await transport.call("set_midi_out", {
        source: midiSource, messages: originalMidiOut, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => JSON.stringify(value.midiOut?.find((group) => group.source === midiSource)?.messages ?? []) === JSON.stringify(originalMidiOut));

      const originalPresetLoadMidiOut = currentSnapshot.presetLoadMidiOut ?? [];
      await call("set_preset_load_midi_out", {
        messages: testMidiOut, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.presetLoadMidiOut?.[0]?.param1 === 119);
      await transport.call("set_preset_load_midi_out", {
        messages: originalPresetLoadMidiOut, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => JSON.stringify(value.presetLoadMidiOut ?? []) === JSON.stringify(originalPresetLoadMidiOut));

      const temp = config.temporaryBlock;
      assert(!currentSnapshot.blocks.some((block) => block.row === temp.row && (block.column === temp.addColumn || block.column === temp.moveColumn)), "Temporary block cells are not empty.");
      await call("add_block", { row: temp.row, column: temp.addColumn, model_id: temp.modelId, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.blocks.some((block) => block.row === temp.row && block.column === temp.addColumn && block.modelId === temp.modelId));
      await sleep(1000);
      currentSnapshot = await snapshot();
      assert(currentSnapshot.blocks.some((block) => block.row === temp.row && block.column === temp.addColumn && block.modelId === temp.modelId), "Configured temporary block model was rejected by the QC after its initial echo.");
      await call("set_expression_bypass", {
        row: temp.row, column: temp.addColumn, pedal: 1, mode: 1, invert: false,
        delay_ms: 250, latch_emulation: true, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => {
        const block = value.blocks.find((candidate) => candidate.row === temp.row && candidate.column === temp.addColumn);
        return block?.bypassExpression?.pedal === 1 && block.bypassExpression.mode === 1
          && block.bypassExpression.delayMs === 250 && block.bypassExpression.latchEmulation === true;
      });
      await call("move_block", { row: temp.row, from_column: temp.addColumn, to_column: temp.moveColumn, expected_model_id: temp.modelId, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.blocks.some((block) => block.row === temp.row && block.column === temp.moveColumn && block.modelId === temp.modelId));
      await sleep(1000);
      currentSnapshot = await snapshot();
      assert(currentSnapshot.blocks.some((block) => block.row === temp.row && block.column === temp.moveColumn && block.modelId === temp.modelId), "Moved temporary block did not remain stable on the QC.");
      await call("set_block_footswitch", {
        row: temp.row, column: temp.moveColumn, footswitch: temp.footswitch, expected_footswitch: null,
        expected_model_id: temp.modelId, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.blocks.some((block) => block.row === temp.row && block.column === temp.moveColumn && block.footswitch === temp.footswitch));
      await call("set_stomp_momentary", {
        footswitch: temp.footswitch, momentary: true, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.footswitchStates?.some((state) => state.index === temp.footswitch && state.momentary === true));
      await transport.call("set_stomp_momentary", {
        footswitch: temp.footswitch, momentary: false, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.footswitchStates?.some((state) => state.index === temp.footswitch && state.momentary === false));
      await call("set_stomp_label", {
        footswitch: temp.footswitch, label: "QC TEST", expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.footswitchStates?.some((state) => state.index === temp.footswitch && state.label === "QC TEST"));
      await transport.call("set_block_footswitch", {
        row: temp.row, column: temp.moveColumn, footswitch: null, expected_footswitch: temp.footswitch,
        expected_model_id: temp.modelId, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.blocks.some((block) => block.row === temp.row && block.column === temp.moveColumn && block.footswitch == null));
      await call("remove_block", { row: temp.row, column: temp.moveColumn, expected_model_id: temp.modelId, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => !value.blocks.some((block) => block.row === temp.row && block.column === temp.moveColumn));

      const capture = config.library?.capture;
      if (capture?.key && capture?.name && Number.isInteger(capture?.modelId)) {
        await call("load_capture", {
          row: temp.row, column: temp.addColumn, key: capture.key, name: capture.name,
          model_id: capture.modelId, expected_model_id: null,
          expected_preset_name: currentSnapshot.presetName
        });
        currentSnapshot = await waitForSnapshot((value) => value.blocks.some(
          (block) => block.row === temp.row && block.column === temp.addColumn && block.modelId === capture.modelId));
        await transport.call("remove_block", {
          row: temp.row, column: temp.addColumn, expected_model_id: capture.modelId,
          expected_preset_name: currentSnapshot.presetName
        });
        currentSnapshot = await waitForSnapshot((value) => !value.blocks.some(
          (block) => block.row === temp.row && block.column === temp.addColumn));
      } else {
        skip("load_capture", "No physically discovered capture fixture is configured.");
      }

      const ir = config.library?.ir;
      if (ir?.key && ir?.name && Number.isInteger(ir?.modelId) && [0, 1].includes(ir?.slot)) {
        await call("load_ir", {
          row: temp.row, column: temp.addColumn, key: ir.key, name: ir.name,
          slot: ir.slot, model_id: ir.modelId, expected_model_id: null,
          expected_preset_name: currentSnapshot.presetName
        });
        currentSnapshot = await waitForSnapshot((value) => value.blocks.some(
          (block) => block.row === temp.row && block.column === temp.addColumn && block.modelId === ir.modelId));
        await transport.call("remove_block", {
          row: temp.row, column: temp.addColumn, expected_model_id: ir.modelId,
          expected_preset_name: currentSnapshot.presetName
        });
        currentSnapshot = await waitForSnapshot((value) => !value.blocks.some(
          (block) => block.row === temp.row && block.column === temp.addColumn));
      } else {
        skip("load_ir", "The connected QC exposes no loadable IR fixture.");
      }

      const route = currentSnapshot.routes.find((candidate) => candidate.row === config.routing.row);
      assert(route && Number.isInteger(route.inputId) && Number.isInteger(route.outputId), "Configured route has no restorable input/output IDs.");
      await call("set_chain_input", { row: route.row, input_id: config.routing.testInputId, expected_input_id: route.inputId, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.routes.some((candidate) => candidate.row === route.row && candidate.inputId === config.routing.testInputId));
      await transport.call("set_chain_input", { row: route.row, input_id: route.inputId, expected_input_id: config.routing.testInputId, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.routes.some((candidate) => candidate.row === route.row && candidate.inputId === route.inputId));
      await call("set_chain_output", { row: route.row, output_id: config.routing.testOutputId, expected_output_id: route.outputId, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.routes.some((candidate) => candidate.row === route.row && candidate.outputId === config.routing.testOutputId));
      await transport.call("set_chain_output", { row: route.row, output_id: route.outputId, expected_output_id: config.routing.testOutputId, expected_preset_name: currentSnapshot.presetName });
      currentSnapshot = await waitForSnapshot((value) => value.routes.some((candidate) => candidate.row === route.row && candidate.outputId === route.outputId));
      await call("set_chain_split", {
        row: route.row, split_column: config.routing.testSplitColumn, mix_column: config.routing.testMixColumn,
        expected_split_column: route.splitColumn ?? null, expected_mix_column: route.mixColumn ?? null, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.routes.some((candidate) => candidate.row === route.row && candidate.splitColumn === config.routing.testSplitColumn && candidate.mixColumn === config.routing.testMixColumn));
      await transport.call("set_chain_split", {
        row: route.row, split_column: route.splitColumn ?? null, mix_column: route.mixColumn ?? null,
        expected_split_column: config.routing.testSplitColumn, expected_mix_column: config.routing.testMixColumn, expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.routes.some((candidate) => candidate.row === route.row && (candidate.splitColumn ?? null) === (route.splitColumn ?? null) && (candidate.mixColumn ?? null) === (route.mixColumn ?? null)));

      const originalSplitMuted = Boolean(currentSnapshot.routes.find((candidate) => candidate.row === route.row)?.splitMuted);
      await call("set_split_mute", {
        row: route.row, muted: !originalSplitMuted, expected_muted: originalSplitMuted,
        expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.routes.some((candidate) => candidate.row === route.row && candidate.splitMuted === !originalSplitMuted));
      await transport.call("set_split_mute", {
        row: route.row, muted: originalSplitMuted, expected_muted: !originalSplitMuted,
        expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.routes.some((candidate) => candidate.row === route.row && candidate.splitMuted === originalSplitMuted));

      await call("set_parameter", {
        row: config.parameter.row, column: config.parameter.column, parameter_index: parameter.index,
        value: config.parameter.testValue, expected_value: originalValue, expected_scene: currentSnapshot.activeScene, expected_preset_name: currentSnapshot.presetName
      });
      await waitForBlockDetails(config.parameter.row, config.parameter.column, (value) => Math.abs(value.parameters?.find((candidate) => candidate.index === parameter.index)?.normalizedValue - config.parameter.testValue) < 0.002);
      await call("undo_device", { confirm_risky_operation: true });
      const undoneParameter = await waitForBlockDetails(config.parameter.row, config.parameter.column, (value) => Math.abs(value.parameters?.find((candidate) => candidate.index === parameter.index)?.normalizedValue - originalValue) < 0.002);
      verified("undo_device", {
        parameterIndex: parameter.index,
        normalizedValue: undoneParameter.parameters?.find((candidate) => candidate.index === parameter.index)?.normalizedValue,
        observedAt: undoneParameter.observedAt
      });
      await call("redo_device", { confirm_risky_operation: true });
      const redoneParameter = await waitForBlockDetails(config.parameter.row, config.parameter.column, (value) => Math.abs(value.parameters?.find((candidate) => candidate.index === parameter.index)?.normalizedValue - config.parameter.testValue) < 0.002);
      verified("redo_device", {
        parameterIndex: parameter.index,
        normalizedValue: redoneParameter.parameters?.find((candidate) => candidate.index === parameter.index)?.normalizedValue,
        observedAt: redoneParameter.observedAt
      });
      await transport.call("set_parameter", {
        row: config.parameter.row, column: config.parameter.column, parameter_index: parameter.index,
        value: originalValue, expected_value: config.parameter.testValue, expected_scene: currentSnapshot.activeScene, expected_preset_name: currentSnapshot.presetName
      });
      await waitForBlockDetails(config.parameter.row, config.parameter.column, (value) => Math.abs(value.parameters?.find((candidate) => candidate.index === parameter.index)?.normalizedValue - originalValue) < 0.002);

      await call("reload_preset", { expected_preset_name: currentSnapshot.presetName, expected_position: currentSnapshot.presetPosition, confirm_risky_operation: true });
      currentSnapshot = await snapshot();

      const modeBeforeFootswitch = currentSnapshot.mode;
      if (modeBeforeFootswitch !== "STOMP") {
        await transport.call("select_mode_slot", {
          slot: modeBySlot.indexOf("STOMP"), expected_preset_name: currentSnapshot.presetName
        });
        currentSnapshot = await waitForSnapshot((value) => value.mode === "STOMP");
      }
      let assignedFootswitchBlock = currentSnapshot.blocks.find((block) => {
        if (!Number.isInteger(block.footswitch)) return false;
        const state = currentSnapshot.footswitchStates?.find((candidate) => candidate.index === block.footswitch);
        return state?.momentary !== true;
      });
      if (!assignedFootswitchBlock) {
        const occupiedFootswitches = new Set(currentSnapshot.blocks
          .map((block) => block.footswitch)
          .filter(Number.isInteger));
        const temporaryFootswitch = Array.from({ length: 8 }, (_, index) => index)
          .find((index) => !occupiedFootswitches.has(index));
        const temporaryBlock = currentSnapshot.blocks.find((block) =>
          Number.isInteger(block.modelId) && block.column >= 0 && block.column <= 7);
        assert(Number.isInteger(temporaryFootswitch) && temporaryBlock,
          "Scratch preset has no block and free A-H footswitch for authoritative testing.");
        await transport.call("set_block_footswitch", {
          row: temporaryBlock.row, column: temporaryBlock.column,
          footswitch: temporaryFootswitch, expected_footswitch: temporaryBlock.footswitch ?? null,
          expected_model_id: temporaryBlock.modelId, expected_preset_name: currentSnapshot.presetName
        });
        currentSnapshot = await waitForSnapshot((value) => value.blocks.some((block) =>
          block.row === temporaryBlock.row && block.column === temporaryBlock.column
            && block.footswitch === temporaryFootswitch));
        const temporaryState = currentSnapshot.footswitchStates?.find((state) => state.index === temporaryFootswitch);
        if (temporaryState?.momentary === true) {
          await transport.call("set_stomp_momentary", {
            footswitch: temporaryFootswitch, momentary: false,
            expected_preset_name: currentSnapshot.presetName
          });
          currentSnapshot = await waitForSnapshot((value) =>
            value.footswitchStates?.some((state) => state.index === temporaryFootswitch && state.momentary === false));
        }
        assignedFootswitchBlock = currentSnapshot.blocks.find((block) =>
          block.row === temporaryBlock.row && block.column === temporaryBlock.column);
      }
      const assignedFootswitchBypass = Boolean(assignedFootswitchBlock.bypassed);
      await call("press_footswitch", {
        index: assignedFootswitchBlock.footswitch,
        expected_mode: currentSnapshot.mode,
        expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.blocks.some((block) =>
        block.row === assignedFootswitchBlock.row && block.column === assignedFootswitchBlock.column
          && Boolean(block.bypassed) !== assignedFootswitchBypass));
      verified("press_footswitch", {
        index: assignedFootswitchBlock.footswitch,
        row: assignedFootswitchBlock.row,
        column: assignedFootswitchBlock.column,
        bypassed: !assignedFootswitchBypass,
        observedAt: currentSnapshot.observedAt
      });
      await transport.call("press_footswitch", {
        index: assignedFootswitchBlock.footswitch,
        expected_mode: currentSnapshot.mode,
        expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.blocks.some((block) =>
        block.row === assignedFootswitchBlock.row && block.column === assignedFootswitchBlock.column
          && Boolean(block.bypassed) === assignedFootswitchBypass));
      if (modeBeforeFootswitch !== "STOMP") {
        await transport.call("select_mode_slot", {
          slot: modeBySlot.indexOf(modeBeforeFootswitch), expected_preset_name: currentSnapshot.presetName
        });
        currentSnapshot = await waitForSnapshot((value) => value.mode === modeBeforeFootswitch);
      }
      await restoreScratch();

      await call("navigate_bank", { direction: 1, expected_preset_name: currentSnapshot.presetName, expected_position: currentSnapshot.presetPosition });
      currentSnapshot = await snapshot();
      await restoreScratch();
    }

    if (stressEnabled) {
      process.stdout.write("STRESS 14 physical performance controls ... ");
      await restoreScratch();
      const modeBySlot = new Map(currentSnapshot.modeSlots.map((slot) => [slot.slot, slot.mode]));
      if (currentSnapshot.mode !== "STOMP") {
        const stompSlot = currentSnapshot.modeSlots.find((slot) => slot.mode === "STOMP")?.slot;
        assert(Number.isInteger(stompSlot), "Performance stress requires a configured STOMP mode slot.");
        await transport.call("select_mode_slot", {
          slot: stompSlot,
          expected_preset_name: currentSnapshot.presetName
        });
        currentSnapshot = await waitForSnapshot((value) => value.mode === "STOMP");
      }

      const occupied = new Set(currentSnapshot.blocks.map((block) => `${block.row}:${block.column}`));
      const emptyCells = [];
      for (let row = 3; row >= 0; row -= 1) {
        for (let column = 0; column < 8; column += 1) {
          if (!occupied.has(`${row}:${column}`)) emptyCells.push({ row, column });
        }
      }
      assert(emptyCells.length >= 8, "Performance stress requires eight temporary Grid cells for A-H verification.");
      const stressBlocks = [];
      for (let footswitch = 0; footswitch < 8; footswitch += 1) {
        const cell = emptyCells[footswitch];
        await transport.call("add_block", {
          row: cell.row,
          column: cell.column,
          model_id: config.temporaryBlock.modelId,
          expected_preset_name: currentSnapshot.presetName
        });
        currentSnapshot = await waitForSnapshot((value) => value.blocks.some((block) =>
          block.row === cell.row && block.column === cell.column
            && block.modelId === config.temporaryBlock.modelId));
        const block = currentSnapshot.blocks.find((candidate) =>
          candidate.row === cell.row && candidate.column === cell.column);
        await transport.call("set_block_footswitch", {
          row: cell.row,
          column: cell.column,
          footswitch,
          expected_footswitch: block.footswitch ?? null,
          expected_model_id: block.modelId,
          expected_preset_name: currentSnapshot.presetName
        });
        currentSnapshot = await waitForSnapshot((value) => value.blocks.some((candidate) =>
          candidate.row === cell.row && candidate.column === cell.column
            && candidate.footswitch === footswitch));
        const state = currentSnapshot.footswitchStates?.find((candidate) => candidate.index === footswitch);
        if (state?.momentary === true) {
          await transport.call("set_stomp_momentary", {
            footswitch,
            momentary: false,
            expected_preset_name: currentSnapshot.presetName
          });
          currentSnapshot = await waitForSnapshot((value) => value.footswitchStates?.some((candidate) =>
            candidate.index === footswitch && candidate.momentary === false));
        }
        const assignedBlock = currentSnapshot.blocks.find((candidate) =>
          candidate.row === cell.row && candidate.column === cell.column);
        assert(assignedBlock, `Temporary footswitch ${footswitch} block disappeared during assignment.`);
        stressBlocks.push({ ...cell, bypassed: Boolean(assignedBlock.bypassed) });
      }
      const bypassFrame = (block, bypassed) => (frame) => frame.states?.some((state) =>
        state.kind === "bypassBatch" && state.bypassUpdates?.some((update) =>
          update.row === block.row && update.column === block.column
            && Boolean(update.bypassed) === bypassed));
      for (let footswitch = 0; footswitch < 8; footswitch += 1) {
        const control = `footswitch_${String.fromCharCode(97 + footswitch)}`;
        const block = stressBlocks[footswitch];
        let bypassed = block.bypassed;
        for (let repetition = 0; repetition < 10; repetition += 1) {
          bypassed = !bypassed;
          await exerciseRealtime(control, [{
            name: "press_footswitch",
            args: { index: footswitch, expected_mode: "STOMP", expected_preset_name: currentSnapshot.presetName },
            predicate: bypassFrame(block, bypassed)
          }]);
        }
        for (let pair = 0; pair < 5; pair += 1) {
          const first = !bypassed;
          const second = bypassed;
          await exerciseRealtime(control, [{
            name: "press_footswitch",
            args: { index: footswitch, expected_mode: "STOMP", expected_preset_name: currentSnapshot.presetName },
            predicate: bypassFrame(block, first)
          }], true);
          await exerciseRealtime(control, [{
            name: "press_footswitch",
            args: { index: footswitch, expected_mode: "STOMP", expected_preset_name: currentSnapshot.presetName },
            predicate: bypassFrame(block, second)
          }], true);
        }
      }
      await transport.call("reload_preset", {
        expected_preset_name: currentSnapshot.presetName,
        expected_position: currentSnapshot.presetPosition,
        confirm_risky_operation: true
      });
      currentSnapshot = await waitForSnapshot((value) => !value.dirty);

      const exerciseAlternating = async ({ control, name, values, args, predicate, guardedPair = false }) => {
        let current = values[0];
        for (let repetition = 0; repetition < 10; repetition += 1) {
          const target = current === values[0] ? values[1] : values[0];
          await exerciseRealtime(control, [{
            name,
            args: args(target, current),
            predicate: predicate(target)
          }]);
          current = target;
        }
        for (let pair = 0; pair < 5; pair += 1) {
          const first = current === values[0] ? values[1] : values[0];
          if (guardedPair) {
            await exerciseRealtime(control, [
              { name, args: args(first, current), predicate: predicate(first) }
            ], true);
            await exerciseRealtime(control, [
              { name, args: args(current, first), predicate: predicate(current) }
            ], true);
          } else {
            await exerciseRealtime(control, [
              { name, args: args(first, current), predicate: predicate(first) },
              { name, args: args(current, first), predicate: predicate(current) }
            ], true);
          }
        }
        return current;
      };

      const baseScene = currentSnapshot.activeScene;
      const alternateScene = baseScene === 0 ? 1 : 0;
      await exerciseAlternating({
        control: "scene",
        name: "select_scene",
        values: [baseScene, alternateScene],
        args: (scene) => ({ scene, expected_preset_name: currentSnapshot.presetName }),
        predicate: (scene) => (frame) => frame.states?.some((state) =>
          state.kind === "scene" && state.activeScene === scene)
      });

      const distinctModes = currentSnapshot.modeSlots
        .filter((slot, index, slots) => slots.findIndex((candidate) => candidate.mode === slot.mode) === index)
        .slice(0, 2);
      assert(distinctModes.length === 2, "Performance stress requires two distinct configured mode slots.");
      await transport.call("select_mode_slot", {
        slot: distinctModes[0].slot,
        expected_preset_name: currentSnapshot.presetName
      });
      currentSnapshot = await waitForSnapshot((value) => value.mode === distinctModes[0].mode);
      await exerciseAlternating({
        control: "mode",
        name: "select_mode_slot",
        values: [distinctModes[0].slot, distinctModes[1].slot],
        args: (slot) => ({ slot, expected_preset_name: currentSnapshot.presetName }),
        predicate: (slot) => (frame) => frame.states?.some((state) =>
          state.kind === "mode" && state.mode === modeBySlot.get(slot))
      });

      currentSnapshot = await snapshot();
      const originalStressTempo = currentSnapshot.tempo;
      const alternateTempo = originalStressTempo === 120 ? 121 : 120;
      await exerciseAlternating({
        control: "tempo",
        name: "set_tempo",
        values: [originalStressTempo, alternateTempo],
        args: (bpm, expectedTempo) => ({
          bpm,
          expected_tempo: expectedTempo,
          expected_preset_name: currentSnapshot.presetName
        }),
        predicate: (bpm) => (frame) => frame.states?.some((state) =>
          state.kind === "tempo" && state.tempo === bpm),
        guardedPair: true
      });

      const originalStressVolume = (await transport.call("get_master_volume", {})).value;
      const safeVolumes = [1, 2];
      if (originalStressVolume !== safeVolumes[0]) {
        await transport.call("set_master_volume", {
          value: safeVolumes[0],
          expected_value: originalStressVolume,
          confirm_risky_operation: true
        });
        await waitForMasterVolume(safeVolumes[0]);
      }
      await exerciseAlternating({
        control: "master_volume",
        name: "set_master_volume",
        values: safeVolumes,
        args: (value, expectedValue) => ({
          value,
          expected_value: expectedValue,
          confirm_risky_operation: true
        }),
        predicate: (value) => (frame) => frame.states?.some((state) =>
          state.kind === "master" && Math.round(Number(state.masterVolume) * 100) === value),
        guardedPair: true
      });
      await transport.call("set_master_volume", {
        value: originalStressVolume,
        expected_value: safeVolumes[0],
        confirm_risky_operation: true
      });
      await waitForMasterVolume(originalStressVolume);

      await transport.call("set_tempo", {
        bpm: originalStressTempo,
        expected_tempo: originalStressTempo,
        expected_preset_name: currentSnapshot.presetName
      });
      for (let repetition = 0; repetition < 20; repetition += 1) {
        const rapidPair = repetition < 10;
        await exerciseNavigation("up", 1, rapidPair);
        await exerciseNavigation("down", -1, rapidPair);
        await restoreScratch();
      }
      report.performanceEvidence = {
        ...summarizePerformanceSamples(performanceSamples),
        methodology: {
          ordinaryRepetitionsPerControl: 10,
          rapidPairsPerControl: 5,
          eventSource: "timestamped native QC state frames",
          navigation: "UP/DOWN preset recalls are measured separately from realtime controls"
        }
      };
      const performanceErrors = validatePerformanceEvidence(config.target, report.performanceEvidence);
      assert(performanceErrors.length === 0, performanceErrors.join("; "));
      console.log("PASS");
    }

    if (enabledHazards.has("persistent")) {
      await restoreScratch();
      originalGlobalTempoSettings = await transport.call("get_global_tempo_settings", {});
      assert(
        ["PRESET", "GLOBAL"].includes(originalGlobalTempoSettings.mode)
          && typeof originalGlobalTempoSettings.ledEnabled === "boolean",
        "Restorable global tempo mode and LED settings are required."
      );
      const testTempoLed = !originalGlobalTempoSettings.ledEnabled;
      await call("set_tempo_metronome", {
        led_enabled: testTempoLed,
        volume_db: null,
        running: null,
        pan: null,
        time_signature: null,
        subdivision: null,
        sound: null,
        routing: null,
        beats: null,
        confirm_persistent_write: true
      });
      let tempoSettings = await waitForGlobalTempoSettings((value) => value.ledEnabled === testTempoLed);
      assert(tempoSettings.ledEnabled === testTempoLed, "Tempo LED setting did not read back.");
      await transport.call("set_tempo_metronome", {
        led_enabled: originalGlobalTempoSettings.ledEnabled,
        volume_db: null,
        running: null,
        pan: null,
        time_signature: null,
        subdivision: null,
        sound: null,
        routing: null,
        beats: null,
        confirm_persistent_write: true
      });
      tempoSettings = await waitForGlobalTempoSettings(
        (value) => value.ledEnabled === originalGlobalTempoSettings.ledEnabled
      );
      assert(
        tempoSettings.ledEnabled === originalGlobalTempoSettings.ledEnabled,
        "Tempo LED setting was not restored."
      );

      const testTempoMode = originalGlobalTempoSettings.mode === "GLOBAL" ? "PRESET" : "GLOBAL";
      await call("set_tempo_mode", { mode: testTempoMode, confirm_persistent_write: true });
      tempoSettings = await waitForGlobalTempoSettings((value) => value.mode === testTempoMode);
      assert(tempoSettings.mode === testTempoMode, "Tempo mode did not read back.");
      await transport.call("set_tempo_mode", {
        mode: originalGlobalTempoSettings.mode,
        confirm_persistent_write: true
      });
      tempoSettings = await waitForGlobalTempoSettings(
        (value) => value.mode === originalGlobalTempoSettings.mode
      );
      assert(tempoSettings.mode === originalGlobalTempoSettings.mode, "Tempo mode was not restored.");

      assert(Number.isInteger(originalGlobalTempoSettings.globalBpm),
        "A restorable device-global BPM value is required.");
      if (tempoSettings.mode !== "GLOBAL") {
        await transport.call("set_tempo_mode", { mode: "GLOBAL", confirm_persistent_write: true });
        tempoSettings = await waitForGlobalTempoSettings((value) => value.mode === "GLOBAL");
      }
      const originalGlobalBpm = tempoSettings.globalBpm;
      const testGlobalBpm = originalGlobalBpm >= 240 ? 239 : originalGlobalBpm + 1;
      await call("set_global_tempo", {
        bpm: testGlobalBpm,
        expected_mode: "GLOBAL",
        expected_global_bpm: originalGlobalBpm,
        confirm_persistent_write: true
      });
      tempoSettings = await waitForGlobalTempoSettings((value) => value.globalBpm === testGlobalBpm);
      assert(tempoSettings.globalBpm === testGlobalBpm, "Global tempo BPM did not read back.");
      await transport.call("set_global_tempo", {
        bpm: originalGlobalBpm,
        expected_mode: "GLOBAL",
        expected_global_bpm: testGlobalBpm,
        confirm_persistent_write: true
      });
      tempoSettings = await waitForGlobalTempoSettings((value) => value.globalBpm === originalGlobalBpm);
      if (originalGlobalTempoSettings.mode !== "GLOBAL") {
        await transport.call("set_tempo_mode", {
          mode: originalGlobalTempoSettings.mode,
          confirm_persistent_write: true
        });
        tempoSettings = await waitForGlobalTempoSettings(
          (value) => value.mode === originalGlobalTempoSettings.mode
        );
      }

      const originalHold = originalGeneralSettings.holdTimingIndex;
      assert(Number.isInteger(originalHold) && originalHold >= 0 && originalHold <= 5, "A restorable hold timing is required.");
      const testHold = originalHold === 5 ? 4 : originalHold + 1;
      await call("set_general_integer", { setting: "holdTiming", value: testHold, confirm_persistent_write: true });
      let settings = await waitForGeneralSettings((value) => value.holdTimingIndex === testHold);
      assert(settings.holdTimingIndex === testHold, "Hold timing setting did not read back.");
      await transport.call("set_general_integer", { setting: "holdTiming", value: originalHold, confirm_persistent_write: true });

      const originalToggle = originalGeneralSettings.stompModeAutoAssign;
      assert(typeof originalToggle === "boolean", "A restorable STOMP auto-assign setting is required.");
      await call("set_general_toggle", { setting: "stompModeAutoAssign", enabled: !originalToggle, confirm_persistent_write: true });
      settings = await waitForGeneralSettings((value) => value.stompModeAutoAssign === !originalToggle);
      assert(settings.stompModeAutoAssign === !originalToggle, "STOMP auto-assign setting did not read back.");
      await transport.call("set_general_toggle", { setting: "stompModeAutoAssign", enabled: originalToggle, confirm_persistent_write: true });

      const bypassBehaviors = ["alwaysOverwrite", "nonstompOverwrite", "neverOverwrite"];
      const originalBehavior = originalGeneralSettings.sceneBypassBehavior;
      const testBehavior = bypassBehaviors[(bypassBehaviors.indexOf(originalBehavior) + 1) % bypassBehaviors.length];
      await call("set_scene_bypass_behavior", { behavior: testBehavior, confirm_persistent_write: true });
      settings = await waitForGeneralSettings((value) => value.sceneBypassBehavior === testBehavior);
      assert(settings.sceneBypassBehavior === testBehavior, "Scene bypass behavior did not read back.");
      await transport.call("set_scene_bypass_behavior", { behavior: originalBehavior, confirm_persistent_write: true });

      const master = originalGeneralSettings.masterVolumeAssignment;
      assert(master && [master.out12, master.out34, master.send12, master.headphones].every((value) => typeof value === "boolean"), "Restorable Master Volume assignments are required.");
      await call("set_master_volume_assignment", { out12: !master.out12, out34: master.out34, send12: master.send12, headphones: master.headphones, confirm_persistent_write: true });
      settings = await waitForGeneralSettings((value) => value.masterVolumeAssignment?.out12 === !master.out12);
      assert(settings.masterVolumeAssignment?.out12 === !master.out12, "Master Volume assignment did not read back.");
      await transport.call("set_master_volume_assignment", { ...master, confirm_persistent_write: true });

      const bypassRows = (rows) => [rows.row1, rows.row2, rows.row3, rows.row4];
      const cab = bypassRows(originalGeneralSettings.globalBypassCab);
      const ir = bypassRows(originalGeneralSettings.globalBypassIr);
      const testCab = [!cab[0], ...cab.slice(1)];
      await call("set_global_bypass", { cab: testCab, ir, confirm_persistent_write: true });
      settings = await waitForGeneralSettings((value) => value.globalBypassCab?.row1 === testCab[0]);
      assert(settings.globalBypassCab?.row1 === testCab[0], "Global Cab bypass did not read back.");
      await transport.call("set_global_bypass", { cab, ir, confirm_persistent_write: true });

      const input = originalIoSettings.inputs.find((port) => Number.isFinite(port.levelDb));
      assert(input, "A restorable input gain is required for I/O conformance.");
      const testInputDb = input.levelDb > 58 ? input.levelDb - 1 : input.levelDb + 1;
      await call("set_input_port", {
        input_port_id: input.inputPortId, level_db: testInputDb,
        impedance: null, input_type: null, ground_lift: null,
        confirm_persistent_write: true
      });
      let io = await waitForIoSettings((value) => value.inputs?.some(
        (port) => port.inputPortId === input.inputPortId && Math.abs(port.levelDb - testInputDb) < .002));
      assert(io.inputs.some((port) => port.inputPortId === input.inputPortId && Math.abs(port.levelDb - testInputDb) < .002), "Input gain did not read back.");
      await transport.call("set_input_port", {
        input_port_id: input.inputPortId, level_db: input.levelDb,
        impedance: null, input_type: null, ground_lift: null,
        confirm_persistent_write: true
      });

      const output = originalIoSettings.outputs.find((port) => typeof port.muted === "boolean");
      assert(output, "A restorable output mute is required for I/O conformance.");
      await call("set_output_port", {
        output_port_id: output.outputPortId, level: null, ground_lift: null,
        mute: !output.muted, confirm_persistent_write: true
      });
      io = await waitForIoSettings((value) => value.outputs?.some(
        (port) => port.outputPortId === output.outputPortId && port.muted === !output.muted));
      assert(io.outputs.some((port) => port.outputPortId === output.outputPortId && port.muted === !output.muted), "Output mute did not read back.");
      await transport.call("set_output_port", {
        output_port_id: output.outputPortId, level: null, ground_lift: null,
        mute: output.muted, confirm_persistent_write: true
      });

      assert(Number.isFinite(originalIoSettings.usb?.level), "A restorable USB level is required for I/O conformance.");
      const testUsbLevel = originalIoSettings.usb.level > .98 ? .97 : originalIoSettings.usb.level + .01;
      await call("set_usb_port", {
        level: testUsbLevel, headphones_source: null, dry_wet: null,
        confirm_persistent_write: true
      });
      io = await waitForIoSettings((value) => Math.abs(value.usb?.level - testUsbLevel) < .002);
      assert(Math.abs(io.usb?.level - testUsbLevel) < .002, "USB level did not read back.");
      await transport.call("set_usb_port", {
        level: originalIoSettings.usb.level, headphones_source: null, dry_wet: null,
        confirm_persistent_write: true
      });

      const originalMidiThru = Number(originalIoSettings.midi?.thru) >= .5;
      await call("set_midi_thru", { enabled: !originalMidiThru, confirm_persistent_write: true });
      io = await waitForIoSettings((value) => (Number(value.midi?.thru) >= .5) === !originalMidiThru);
      assert((Number(io.midi?.thru) >= .5) === !originalMidiThru, "MIDI Thru did not read back.");
      await transport.call("set_midi_thru", { enabled: originalMidiThru, confirm_persistent_write: true });

      assert(typeof originalIoSettings.xlr12Linked === "boolean", "A restorable output-pairing value is required.");
      await call("set_output_pairing", {
        xlr12_linked: !originalIoSettings.xlr12Linked, out34_linked: null,
        confirm_persistent_write: true
      });
      io = await waitForIoSettings((value) => value.xlr12Linked === !originalIoSettings.xlr12Linked);
      assert(io.xlr12Linked === !originalIoSettings.xlr12Linked, "Output pairing did not read back.");
      await transport.call("set_output_pairing", {
        xlr12_linked: originalIoSettings.xlr12Linked, out34_linked: null,
        confirm_persistent_write: true
      });

      assert(typeof originalGlobalEq.bypassed === "boolean", "A restorable Global EQ bypass state is required.");
      await call("set_global_eq_bypassed", {
        bypassed: !originalGlobalEq.bypassed, confirm_persistent_write: true
      });
      let globalEq = await waitForGlobalEq((value) => value.bypassed === !originalGlobalEq.bypassed);
      assert(globalEq.bypassed === !originalGlobalEq.bypassed, "Global EQ bypass did not read back.");
      await transport.call("set_global_eq_bypassed", {
        bypassed: originalGlobalEq.bypassed, confirm_persistent_write: true
      });

      const eqValue = (index) => originalGlobalEq.parameters.find((parameter) => parameter.parameterIndex === index)?.value;
      const originalBandGain = eqValue(0);
      assert(Number.isFinite(originalBandGain), "A restorable Global EQ band gain is required.");
      const testBandGain = originalBandGain > .98 ? .97 : originalBandGain + .01;
      await call("set_global_eq_band", {
        band: 1, gain: testBandGain, frequency: null, q: null, filter_type: null, enabled: null,
        confirm_persistent_write: true
      });
      globalEq = await waitForGlobalEq((value) => Math.abs(value.parameters?.find((item) => item.parameterIndex === 0)?.value - testBandGain) < .002);
      assert(Math.abs(globalEq.parameters.find((item) => item.parameterIndex === 0).value - testBandGain) < .002, "Global EQ band did not read back.");
      await transport.call("set_global_eq_band", {
        band: 1, gain: originalBandGain, frequency: null, q: null, filter_type: null, enabled: null,
        confirm_persistent_write: true
      });

      const originalOutputLevel = eqValue(25);
      assert(Number.isFinite(originalOutputLevel), "A restorable Global EQ output level is required.");
      const testOutputLevel = originalOutputLevel > .98 ? .97 : originalOutputLevel + .01;
      await call("set_global_eq_output", {
        level: testOutputLevel, out12: null, out34: null, confirm_persistent_write: true
      });
      globalEq = await waitForGlobalEq((value) => Math.abs(value.parameters?.find((item) => item.parameterIndex === 25)?.value - testOutputLevel) < .002);
      assert(Math.abs(globalEq.parameters.find((item) => item.parameterIndex === 25).value - testOutputLevel) < .002, "Global EQ output did not read back.");
      await transport.call("set_global_eq_output", {
        level: originalOutputLevel, out12: null, out34: null, confirm_persistent_write: true
      });

      const testCycle = originalModeCycle.slots.length > 1
        ? [...originalModeCycle.slots].reverse()
        : [originalModeCycle.slots[0], originalModeCycle.slots[0] === 0 ? 1 : 0];
      await call("set_mode_cycle", { slots: testCycle, confirm_persistent_write: true });
      const modeCycle = await waitForModeCycle((value) => JSON.stringify(value.slots) === JSON.stringify(testCycle));
      assert(JSON.stringify(modeCycle.slots) === JSON.stringify(testCycle), "Mode cycle did not read back.");
      await transport.call("set_mode_cycle", { slots: originalModeCycle.slots, confirm_persistent_write: true });

      const scratchFolder = presetFolders.folders.find(
        (folder) => folder.key?.replace(/\/$/, "") === config.scratchPreset.setlistKey.replace(/\/$/, ""));
      assert(scratchFolder, "Scratch preset setlist metadata is unavailable for Favorites conformance.");
      const originallyFavorite = originalFavorites.entries.some((entry) =>
        entry.name === currentSnapshot.presetName
          && entry.folderKey?.replace(/\/$/, "") === config.scratchPreset.setlistKey.replace(/\/$/, ""));
      await call("set_favorite", {
        name: currentSnapshot.presetName, folder_key: config.scratchPreset.setlistKey,
        folder_name: scratchFolder.name, is_factory: Boolean(scratchFolder.isFactory),
        favorite: !originallyFavorite, confirm_persistent_write: true
      });
      let favorites = await waitForFavorites((value) => value.entries.some((entry) =>
        entry.name === currentSnapshot.presetName
          && entry.folderKey?.replace(/\/$/, "") === config.scratchPreset.setlistKey.replace(/\/$/, "")) === !originallyFavorite);
      assert(favorites.entries.some((entry) => entry.name === currentSnapshot.presetName
        && entry.folderKey?.replace(/\/$/, "") === config.scratchPreset.setlistKey.replace(/\/$/, "")) === !originallyFavorite,
      "Favorite mutation did not read back.");
      await transport.call("set_favorite", {
        name: currentSnapshot.presetName, folder_key: config.scratchPreset.setlistKey,
        folder_name: scratchFolder.name, is_factory: Boolean(scratchFolder.isFactory),
        favorite: originallyFavorite, confirm_persistent_write: true
      });
      favorites = await waitForFavorites((value) => value.entries.some((entry) =>
        entry.name === currentSnapshot.presetName
          && entry.folderKey?.replace(/\/$/, "") === config.scratchPreset.setlistKey.replace(/\/$/, "")) === originallyFavorite);
      assert(favorites.entries.some((entry) => entry.name === currentSnapshot.presetName
        && entry.folderKey?.replace(/\/$/, "") === config.scratchPreset.setlistKey.replace(/\/$/, "")) === originallyFavorite,
      "Favorite restoration did not read back.");

      const pinnedModelId = config.library.pinnedModelId;
      const originallyPinned = originalPinnedModels.models.includes(pinnedModelId);
      await call("set_model_pinned", {
        model_id: pinnedModelId, pinned: !originallyPinned, confirm_persistent_write: true
      });
      let pinned = await waitForPinnedModels((value) => value.models.includes(pinnedModelId) === !originallyPinned);
      assert(pinned.models.includes(pinnedModelId) === !originallyPinned, "Pinned-model mutation did not read back.");
      await transport.call("set_model_pinned", {
        model_id: pinnedModelId, pinned: originallyPinned, confirm_persistent_write: true
      });
      pinned = await waitForPinnedModels((value) => value.models.includes(pinnedModelId) === originallyPinned);
      assert(pinned.models.includes(pinnedModelId) === originallyPinned, "Pinned-model restoration did not read back.");

      const emptySetlistName = uniqueName(config.persistent.namePrefix, "empty");
      pendingTemporarySetlists.add(emptySetlistName);
      await call("create_setlist", { name: emptySetlistName, confirm_persistent_write: true });
      let setlists = await waitForPresetFolders((value) => value.folders.some((folder) => folder.name === emptySetlistName));
      assert(setlists.folders.some((folder) => folder.name === emptySetlistName), "Created setlist did not appear in the device library.");
      await call("delete_setlist", { name: emptySetlistName, confirm_persistent_write: true });
      setlists = await waitForPresetFolders((value) => !value.folders.some((folder) => folder.name === emptySetlistName));
      assert(!setlists.folders.some((folder) => folder.name === emptySetlistName), "Deleted setlist remained in the device library.");
      pendingTemporarySetlists.delete(emptySetlistName);

      const duplicateName = uniqueName(config.persistent.namePrefix, "copy");
      pendingTemporarySetlists.add(duplicateName);
      const duplicated = await call("duplicate_setlist", {
        source_setlist_key: config.scratchPreset.setlistKey,
        destination_name: duplicateName,
        limit: 1,
        expected_preset_name: currentSnapshot.presetName,
        expected_position: currentSnapshot.presetPosition,
        confirm_persistent_write: true
      });
      currentSnapshot = resultSnapshot(duplicated) ?? await snapshot();
      const duplicateKey = `/media/p4/Presets/${duplicateName}`;
      const duplicatePresets = await waitForPresets(duplicateKey, (value) => value.presets.some(
        (preset) => preset.position === 0 && preset.name === currentSnapshot.presetName));
      assert(duplicatePresets.presets.some((preset) => preset.position === 0), "Duplicated setlist did not contain its copied preset.");
      await transport.call("recall_preset", {
        setlist_key: config.scratchPreset.setlistKey,
        position: config.scratchPreset.position,
        expected_preset_name: currentSnapshot.presetName,
        expected_position: currentSnapshot.presetPosition,
        expected_setlist_key: currentSnapshot.setlistKey
      });
      currentSnapshot = await waitForSnapshot((value) =>
        value.setlistKey === config.scratchPreset.setlistKey
          && value.presetPosition === config.scratchPreset.position);
      await transport.call("delete_setlist", { name: duplicateName, confirm_persistent_write: true });
      setlists = await waitForPresetFolders((value) => !value.folders.some((folder) => folder.name === duplicateName));
      assert(!setlists.folders.some((folder) => folder.name === duplicateName), "Duplicated setlist was not deleted during restoration.");
      pendingTemporarySetlists.delete(duplicateName);

      const nameA = uniqueName(config.persistent.namePrefix, "A");
      const nameRenamed = uniqueName(config.persistent.namePrefix, "R");
      report.disposableSlotsModified = [config.persistent.slotA, config.persistent.slotB];
      await call("save_preset_as", {
        setlist_key: config.persistent.slotA.setlistKey, position: config.persistent.slotA.position, name: nameA,
        expected_preset_name: currentSnapshot.presetName, expected_position: currentSnapshot.presetPosition,
        confirm_overwrite: true, confirm_persistent_write: true
      });
      currentSnapshot = await snapshot();
      await call("rename_current_preset", {
        new_name: nameRenamed, expected_preset_name: currentSnapshot.presetName,
        expected_position: currentSnapshot.presetPosition, confirm_persistent_write: true
      });
      const renamedLibrary = await transport.call("list_presets", {
        refresh: true,
        setlist_key: config.persistent.slotA.setlistKey
      });
      assert(
        renamedLibrary.presets?.some((preset) => preset.position === config.persistent.slotA.position && preset.name === nameRenamed),
        "Renamed preset was not present in the authoritative preset catalog."
      );
      currentSnapshot = await snapshot();
      const copySource = {
        setlistKey: config.persistent.slotA.setlistKey,
        position: config.persistent.slotA.position,
        name: nameRenamed
      };
      await recall({
        setlistKey: config.persistent.slotB.setlistKey,
        position: config.persistent.slotB.position
      });
      const copied = await call("copy_preset", {
        source_setlist_key: copySource.setlistKey, source_position: copySource.position, source_name: copySource.name,
        destination_setlist_key: config.persistent.slotB.setlistKey, destination_position: config.persistent.slotB.position,
        expected_preset_name: currentSnapshot.presetName, expected_position: currentSnapshot.presetPosition,
        confirm_overwrite: true, confirm_persistent_write: true
      });
      const copiedStoredName = copied.savedName || copySource.name;
      currentSnapshot = resultSnapshot(copied) ?? await snapshot();
      await sleep(500);
      currentSnapshot = await snapshot();
      await call("delete_preset", {
        setlist_key: config.persistent.slotA.setlistKey,
        name: nameRenamed,
        confirm_persistent_write: true
      });
      let destinationPresets = await waitForPresets(config.persistent.slotA.setlistKey,
        (value) => !value.presets.some((preset) => preset.name === nameRenamed));
      assert(!destinationPresets.presets.some((preset) => preset.name === nameRenamed), "Deleted preset remained in its setlist.");
      await call("move_preset", {
        setlist_key: config.persistent.slotB.setlistKey,
        name: copiedStoredName,
        position: config.persistent.slotA.position,
        confirm_persistent_write: true
      });
      destinationPresets = await waitForPresets(config.persistent.slotB.setlistKey,
        (value) => value.presets.some((preset) => preset.name === copiedStoredName && preset.position === config.persistent.slotA.position));
      assert(destinationPresets.presets.some((preset) => preset.name === copiedStoredName
        && preset.position === config.persistent.slotA.position), "Moved preset did not read back at its destination.");
      await call("delete_preset", {
        setlist_key: config.persistent.slotB.setlistKey,
        name: copiedStoredName,
        confirm_persistent_write: true
      });
      destinationPresets = await waitForPresets(config.persistent.slotB.setlistKey,
        (value) => !value.presets.some((preset) => preset.name === copiedStoredName));
      assert(!destinationPresets.presets.some((preset) => preset.name === copiedStoredName), "Moved preset was not deleted during restoration.");
    }

    await recordTransportHealth("before-system-recovery");

    if (enabledHazards.has("system")) {
      await restoreScratch();
      await call("set_device_name", { name: config.system.temporaryDeviceName, confirm_persistent_write: true });
      const originalDeviceName = identity.customName?.trim() || originalSnapshot.deviceName;
      assert(originalDeviceName && originalDeviceName !== config.system.temporaryDeviceName, "A distinct original device name is required for the restore check.");
      await transport.call("set_device_name", { name: originalDeviceName, confirm_persistent_write: true });
      await call("reset_device_session", { confirm_risky_operation: true });
      currentSnapshot = await snapshot();
      await call("disconnect_device", { confirm_risky_operation: true });
      await call("reconnect_device", { confirm_risky_operation: true });
      currentSnapshot = await snapshot();
    }

    if (enabledHazards.has("screen")) {
      await call("swipe_screen", {
        x: config.screenTap.x,
        y: config.screenTap.y,
        to_x: config.screenTap.restoreX,
        to_y: config.screenTap.restoreY,
        confirm_risky_operation: true
      });
      const afterSwipe = await transport.call("capture_screen", {});
      assert(pngSignatureIsValid(afterSwipe, 800, 480), "Screen-swipe follow-up returned an invalid PNG.");
      const swipeRestore = await transport.call("reload_preset", {
        expected_preset_name: currentSnapshot.presetName,
        expected_position: currentSnapshot.presetPosition,
        confirm_risky_operation: true
      });
      currentSnapshot = resultSnapshot(swipeRestore) ?? await snapshot();
      const screenBeforeTap = await transport.call("capture_screen", {});
      assert(pngSignatureIsValid(screenBeforeTap, 800, 480), "Screen-tap baseline returned an invalid PNG.");
      await call("tap_screen", { x: config.screenTap.x, y: config.screenTap.y, confirm_risky_operation: true });
      firstScreenTapSent = true;
      const screenAfterTap = await waitForPhysicalObservation(
        () => transport.call("capture_screen", {}),
        (value) => pngSignatureIsValid(value, 800, 480)
          && screenDigest(value) !== screenDigest(screenBeforeTap),
        { timeoutMs: 5000, intervalMs: 150, label: "QC framebuffer change after tap_screen" }
      );
      verified("tap_screen", {
        x: config.screenTap.x, y: config.screenTap.y,
        beforeSha256: screenDigest(screenBeforeTap), afterSha256: screenDigest(screenAfterTap)
      });
      const restoreTaps = Number.isInteger(config.screenTap.restoreTaps)
        ? Math.max(1, Math.min(4, config.screenTap.restoreTaps))
        : 1;
      for (let index = 0; index < restoreTaps; index += 1) {
        await transport.call("tap_screen", {
          x: config.screenTap.restoreX,
          y: config.screenTap.restoreY,
          confirm_risky_operation: true
        });
      }
      firstScreenTapSent = false;
      await waitForPhysicalObservation(
        () => transport.call("capture_screen", {}),
        (value) => pngSignatureIsValid(value, 800, 480)
          && screenDigest(value) !== screenDigest(screenAfterTap),
        { timeoutMs: 5000, intervalMs: 150, label: "QC framebuffer restoration after tap_screen" }
      );
      // A second tap only proves another framebuffer transition; it does not
      // prove that an arbitrary overlay closed. LocalBackup is accepted only
      // while the QC Grid is visible, so force the known scratch preset back
      // onto the Grid before testing the backup stream.
      const gridRestored = await transport.call("reload_preset", {
        expected_preset_name: currentSnapshot.presetName,
        expected_position: currentSnapshot.presetPosition,
        confirm_risky_operation: true
      });
      currentSnapshot = resultSnapshot(gridRestored) ?? await snapshot();
    }

    // Backup is intentionally last: it is the longest operation and a bulk
    // transport failure must not hide evidence for the other actions.
    if (enabledHazards.has("persistent") && backupEnabled) {
      await call("create_device_backup", { name: uniqueName(config.persistent.namePrefix, "backup"), confirm_persistent_write: true });
    } else if (enabledHazards.has("persistent")) {
      skip("create_device_backup", "Backup requires the separate --backup flag and was not invoked.");
    }

    if (currentSnapshot && originalSnapshot && (currentSnapshot.setlistKey !== originalSnapshot.setlistKey || currentSnapshot.presetPosition !== originalSnapshot.presetPosition)) {
      await recall({ setlistKey: originalSnapshot.setlistKey, position: originalSnapshot.presetPosition });
    }
  } catch (error) {
    report.failure = error instanceof Error ? error.message : String(error);
  } finally {
    if (transportStarted && deviceAuthorized && originalSnapshot && [...enabledHazards].some((value) => value !== "read")) {
      const restoration = [];
      const restoreAttempt = async (name, operation) => {
        try { await operation(); restoration.push({ name, status: "passed" }); }
        catch (error) { restoration.push({ name, status: "failed", error: error instanceof Error ? error.message : String(error) }); }
      };
      if (firstScreenTapSent) {
        await restoreAttempt("screen", async () => {
          const restoreTaps = Number.isInteger(config.screenTap.restoreTaps)
            ? Math.max(1, Math.min(4, config.screenTap.restoreTaps))
            : 1;
          for (let index = 0; index < restoreTaps; index += 1) {
            await transport.call("tap_screen", {
              x: config.screenTap.restoreX,
              y: config.screenTap.restoreY,
              confirm_risky_operation: true
            });
          }
        });
      }
      if (enabledHazards.has("system")) {
        await restoreAttempt("connection", () => transport.call("reconnect_device", { confirm_risky_operation: true }));
        const originalDeviceName = identity?.customName?.trim() || originalSnapshot.deviceName;
        if (originalDeviceName) await restoreAttempt("device-name", () => transport.call("set_device_name", { name: originalDeviceName, confirm_persistent_write: true }));
      }
      if (enabledHazards.has("live") && Number.isFinite(originalMasterVolume)) {
        await restoreAttempt("master-volume", async () => {
          const current = await transport.call("get_master_volume", {});
          if (current.value !== originalMasterVolume) {
            await transport.call("set_master_volume", { value: originalMasterVolume, expected_value: current.value, confirm_risky_operation: true });
          }
        });
      }
      if (enabledHazards.has("tuner") && originalTunerSettings) {
        await restoreAttempt("tuner-settings", async () => {
          await transport.call("set_tuner_input", {
            input_port_id: originalTunerSettings.inputPortId,
            confirm_tuner_activation: true,
            confirm_risky_operation: true
          });
          await transport.call("set_tuner_reference", {
            reference_offset_hz: originalTunerSettings.referenceOffsetHz,
            confirm_tuner_activation: true,
            confirm_risky_operation: true
          });
          await transport.call("restore_tuner_audio", {
            confirm_preference_reset: true,
            confirm_risky_operation: true
          });
          await transport.call("set_tuner_meter", {
            enabled: false,
            confirm_tuner_activation: true,
            confirm_risky_operation: true
          });
        });
      }
      if (enabledHazards.has("persistent") && originalGeneralSettings) {
        await restoreAttempt("general-settings", async () => {
          const settings = originalGeneralSettings;
          if (Number.isInteger(settings.holdTimingIndex)) await transport.call("set_general_integer", { setting: "holdTiming", value: settings.holdTimingIndex, confirm_persistent_write: true });
          if (typeof settings.stompModeAutoAssign === "boolean") await transport.call("set_general_toggle", { setting: "stompModeAutoAssign", enabled: settings.stompModeAutoAssign, confirm_persistent_write: true });
          if (settings.sceneBypassBehavior) await transport.call("set_scene_bypass_behavior", { behavior: settings.sceneBypassBehavior, confirm_persistent_write: true });
          if (settings.masterVolumeAssignment) await transport.call("set_master_volume_assignment", { ...settings.masterVolumeAssignment, confirm_persistent_write: true });
          if (settings.globalBypassCab && settings.globalBypassIr) {
            const rows = (value) => [value.row1, value.row2, value.row3, value.row4];
            await transport.call("set_global_bypass", { cab: rows(settings.globalBypassCab), ir: rows(settings.globalBypassIr), confirm_persistent_write: true });
          }
        });
      }
      if (enabledHazards.has("persistent") && originalIoSettings) {
        await restoreAttempt("io-settings", async () => {
          for (const input of originalIoSettings.inputs ?? []) {
            if (!Number.isFinite(input.levelDb)) continue;
            await transport.call("set_input_port", {
              input_port_id: input.inputPortId, level_db: input.levelDb,
              impedance: null, input_type: null, ground_lift: null,
              confirm_persistent_write: true
            });
          }
          for (const output of originalIoSettings.outputs ?? []) {
            if (typeof output.muted !== "boolean") continue;
            await transport.call("set_output_port", {
              output_port_id: output.outputPortId, level: null, ground_lift: null,
              mute: output.muted, confirm_persistent_write: true
            });
          }
          if (Number.isFinite(originalIoSettings.usb?.level)) await transport.call("set_usb_port", {
            level: originalIoSettings.usb.level, headphones_source: null, dry_wet: null,
            confirm_persistent_write: true
          });
          if (originalIoSettings.midi?.thru !== undefined) await transport.call("set_midi_thru", {
            enabled: Number(originalIoSettings.midi.thru) >= .5, confirm_persistent_write: true
          });
          if (typeof originalIoSettings.xlr12Linked === "boolean" || typeof originalIoSettings.out34Linked === "boolean") {
            await transport.call("set_output_pairing", {
              xlr12_linked: originalIoSettings.xlr12Linked ?? null,
              out34_linked: originalIoSettings.out34Linked ?? null,
              confirm_persistent_write: true
            });
          }
        });
      }
      if (enabledHazards.has("persistent") && originalGlobalEq) {
        await restoreAttempt("global-eq", async () => {
          if (typeof originalGlobalEq.bypassed === "boolean") {
            await transport.call("set_global_eq_bypassed", {
              bypassed: originalGlobalEq.bypassed, confirm_persistent_write: true
            });
          }
          for (let band = 1; band <= 5; band += 1) {
            const base = (band - 1) * 5;
            const value = (index) => originalGlobalEq.parameters?.find((item) => item.parameterIndex === index)?.value;
            await transport.call("set_global_eq_band", {
              band, gain: value(base), frequency: value(base + 1), q: value(base + 2),
              filter_type: Number.isFinite(value(base + 3)) ? Math.round(value(base + 3) * 4) : null,
              enabled: Number.isFinite(value(base + 4)) ? value(base + 4) >= .5 : null,
              confirm_persistent_write: true
            });
          }
          await transport.call("set_global_eq_output", {
            level: originalGlobalEq.parameters?.find((item) => item.parameterIndex === 25)?.value ?? null,
            out12: Number(originalGlobalEq.parameters?.find((item) => item.parameterIndex === 26)?.value) >= .5,
            out34: Number(originalGlobalEq.parameters?.find((item) => item.parameterIndex === 27)?.value) >= .5,
            confirm_persistent_write: true
          });
        });
      }
      if (enabledHazards.has("persistent") && originalModeCycle?.slots) {
        await restoreAttempt("mode-cycle", () => transport.call("set_mode_cycle", {
          slots: originalModeCycle.slots, confirm_persistent_write: true
        }));
      }
      if (enabledHazards.has("persistent") && originalGlobalTempoSettings) {
        await restoreAttempt("global-tempo-settings", async () => {
          let currentTempoSettings = await transport.call("get_global_tempo_settings", {});
          if (Number.isInteger(originalGlobalTempoSettings.globalBpm)) {
            if (currentTempoSettings.mode !== "GLOBAL") {
              await transport.call("set_tempo_mode", {
                mode: "GLOBAL",
                confirm_persistent_write: true
              });
              currentTempoSettings = await transport.call("get_global_tempo_settings", {});
            }
            if (currentTempoSettings.globalBpm !== originalGlobalTempoSettings.globalBpm) {
              await transport.call("set_global_tempo", {
                bpm: originalGlobalTempoSettings.globalBpm,
                expected_mode: "GLOBAL",
                expected_global_bpm: currentTempoSettings.globalBpm,
                confirm_persistent_write: true
              });
            }
          }
          await transport.call("set_tempo_metronome", {
            led_enabled: originalGlobalTempoSettings.ledEnabled ?? null,
            volume_db: originalGlobalTempoSettings.volumeDb ?? null,
            running: originalGlobalTempoSettings.running ?? null,
            pan: originalGlobalTempoSettings.pan ?? null,
            time_signature: originalGlobalTempoSettings.timeSignature ?? null,
            subdivision: originalGlobalTempoSettings.subdivision ?? null,
            sound: originalGlobalTempoSettings.sound ?? null,
            routing: originalGlobalTempoSettings.routing ?? null,
            beats: Array.isArray(originalGlobalTempoSettings.beats)
              ? originalGlobalTempoSettings.beats
              : null,
            confirm_persistent_write: true
          });
          await transport.call("set_tempo_mode", {
            mode: originalGlobalTempoSettings.mode,
            confirm_persistent_write: true
          });
        });
      }
      if (pendingTemporarySetlists.size > 0) {
        await restoreAttempt("temporary-setlists", async () => {
          let current = await transport.call("get_current_preset", {});
          if (current.dirty) {
            await transport.call("reload_preset", {
              expected_preset_name: current.presetName,
              expected_position: current.presetPosition,
              confirm_risky_operation: true
            });
            current = await waitForSnapshot((value) => !value.dirty);
          }
          if (current.setlistKey !== originalSnapshot.setlistKey || current.presetPosition !== originalSnapshot.presetPosition) {
            await transport.call("recall_preset", {
              setlist_key: originalSnapshot.setlistKey,
              position: originalSnapshot.presetPosition,
              expected_preset_name: current.presetName,
              expected_position: current.presetPosition,
              expected_setlist_key: current.setlistKey
            });
            current = await waitForSnapshot((value) =>
              value.setlistKey === originalSnapshot.setlistKey
                && value.presetPosition === originalSnapshot.presetPosition);
          }
          const folders = await transport.call("list_preset_folders", { refresh: true });
          for (const name of [...pendingTemporarySetlists]) {
            if (folders.folders?.some((folder) => folder.name === name)) {
              await transport.call("delete_setlist", { name, confirm_persistent_write: true });
              await waitForPresetFolders((value) => !value.folders.some((folder) => folder.name === name));
            }
            pendingTemporarySetlists.delete(name);
          }
        });
      }
      if (pendingLaneRestore) {
        await restoreAttempt("lane-control-parameter", async () => {
          let current = await transport.call("get_current_preset", {});
          if (current.setlistKey !== config.scratchPreset.setlistKey || current.presetPosition !== config.scratchPreset.position) {
            await transport.call("recall_preset", {
              setlist_key: config.scratchPreset.setlistKey,
              position: config.scratchPreset.position,
              expected_preset_name: current.presetName,
              expected_position: current.presetPosition,
              expected_setlist_key: current.setlistKey
            });
            current = await transport.call("get_current_preset", {});
          }
          const details = await transport.call("get_lane_control_details", {
            row: pendingLaneRestore.row,
            control: pendingLaneRestore.control,
            expected_preset_name: current.presetName
          });
          const parameter = details.parameters?.find((candidate) => candidate.index === pendingLaneRestore.parameterIndex);
          assert(Number.isFinite(parameter?.normalizedValue), "Lane-control restoration could not read the current parameter value.");
          if (Math.abs(parameter.normalizedValue - pendingLaneRestore.value) >= 0.002) {
            await transport.call("set_lane_control_parameter", {
              row: pendingLaneRestore.row,
              control: pendingLaneRestore.control,
              parameter_index: pendingLaneRestore.parameterIndex,
              value: pendingLaneRestore.value,
              expected_value: parameter.normalizedValue,
              expected_preset_name: current.presetName
            });
          }
          pendingLaneRestore = undefined;
        });
      }
      await restoreAttempt("starting-preset", async () => {
        let current = await transport.call("get_current_preset", {});
        if (current.dirty) {
          await transport.call("reload_preset", {
            expected_preset_name: current.presetName,
            expected_position: current.presetPosition,
            confirm_risky_operation: true
          });
          current = await waitForSnapshot((value) => !value.dirty);
          assert(!current.dirty, "Dirty preset did not revert during failure restoration.");
        }
        if (current.setlistKey !== originalSnapshot.setlistKey || current.presetPosition !== originalSnapshot.presetPosition) {
          await transport.call("recall_preset", {
            setlist_key: originalSnapshot.setlistKey,
            position: originalSnapshot.presetPosition,
            expected_preset_name: current.presetName,
            expected_position: current.presetPosition,
            expected_setlist_key: current.setlistKey
          });
        }
      });
      report.restoration = restoration;
      if (restoration.some((item) => item.status === "failed")) report.failure ??= "One or more restoration checks failed.";
    }
    if (transportStarted) {
      try { await recordTransportHealth("final"); }
      catch (error) { report.failure ??= error instanceof Error ? error.message : String(error); }
    }
    report.finishedAt = timestamp();
    for (const action of contract.actions) {
      if (!report.results.some((result) => result.name === action.name)) {
        const metadata = CASES[action.name];
        report.results.push({ name: action.name, phase: metadata.phase, hazard: metadata.hazard, status: "not-run", reason: report.failure ? "Suite stopped after failure." : "Scenario prerequisite was not enabled." });
      }
    }
    report.summary = summarizePhysicalResults(
      report.results,
      contract.actions.map((action) => action.name),
      report.failure,
      performed
    );
    const outputPath = resolve(option("--output") ?? resolve(root, "artifacts/hardware-conformance", `${new Date().toISOString().replace(/[:.]/g, "-")}-${config.target}.json`));
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    await transport.close().catch(() => {});
    console.log(`Evidence: ${outputPath}`);
    console.log(JSON.stringify(report.summary));
    if (report.failure || (requireAll && !report.summary.complete)) process.exitCode = 1;
  }
}

await main();
