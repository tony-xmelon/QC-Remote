import { createHash } from "node:crypto";

export async function retryTransientRead(read, {
  attempts = 3,
  intervalMs = 100
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? `${error.message} ${error.cause?.code ?? ""}` : String(error);
      if (!/terminated|fetch failed|ECONNRESET|UND_ERR_SOCKET|did not return a valid .* reply within/i.test(message) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, intervalMs));
    }
  }
  throw lastError;
}

export async function waitForPhysicalObservation(read, matches, {
  timeoutMs = 5000,
  intervalMs = 100,
  consecutiveMatches = 1,
  label = "physical device state"
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let matched = 0;
  do {
    const value = await read();
    matched = matches(value) ? matched + 1 : 0;
    if (matched >= consecutiveMatches) return value;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, Math.min(intervalMs, remaining)));
  } while (true);
  throw new Error(`Timed out waiting for ${label}.`);
}

export const MUTATION_ACK = "I_ACCEPT_QC_HARDWARE_MUTATIONS";
export const FULL_RUN_MINIMUM_TRANSPORT_TIMEOUT_MS = 210_000;
export const REPEATABLE_PHYSICAL_CONTROLS = Object.freeze([
  "footswitch_a", "footswitch_b", "footswitch_c", "footswitch_d",
  "footswitch_e", "footswitch_f", "footswitch_g", "footswitch_h",
  "up", "down", "mode", "scene", "tempo", "master_volume"
]);
export const MINIMUM_CONTROL_REPETITIONS = 20;
export const MINIMUM_RAPID_PAIRS = 5;
export const MAXIMUM_SEND_LATENCY_MS = 20;
export const MAXIMUM_EVENT_MEDIAN_MS = 50;
export const MAXIMUM_EVENT_P95_MS = 200;
export const MAXIMUM_NAVIGATION_P95_MS = 2_000;
export const NAVIGATION_CONTROLS = Object.freeze(["up", "down"]);
export const REALTIME_CONTROLS = Object.freeze(
  REPEATABLE_PHYSICAL_CONTROLS.filter((control) => !NAVIGATION_CONTROLS.includes(control))
);
export const realtimeControlEventP95Limit = (control) =>
  ["mode", "master_volume"].includes(control) ? 200 : 100;

export function summarizePerformanceSamples(samplesByControl) {
  const eventLatencies = [];
  const sendLatencies = [];
  const navigationLatencies = [];
  const percentile = (values, fraction) => {
    if (!values.length) return null;
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.ceil(fraction * sorted.length) - 1];
  };
  const controls = Object.fromEntries(REPEATABLE_PHYSICAL_CONTROLS.map((control) => {
    const samples = samplesByControl?.[control] ?? [];
    const controlSendLatencies = samples.map((sample) => sample.sendLatencyMs).filter(Number.isFinite);
    const controlEventLatencies = samples.map((sample) => sample.eventLatencyMs).filter(Number.isFinite);
    for (const sample of samples) {
      if (NAVIGATION_CONTROLS.includes(control)) {
        if (Number.isFinite(sample.eventLatencyMs)) navigationLatencies.push(sample.eventLatencyMs);
      } else {
        if (Number.isFinite(sample.sendLatencyMs)) sendLatencies.push(sample.sendLatencyMs);
        if (Number.isFinite(sample.eventLatencyMs)) eventLatencies.push(sample.eventLatencyMs);
      }
    }
    return [control, {
      repetitions: samples.length,
      rapidPairs: samples.filter((sample) => sample.rapidPair === true).length / 2,
      failures: samples.filter((sample) => sample.failed === true).length,
      sendLatencyMs: {
        sampleCount: controlSendLatencies.length,
        max: controlSendLatencies.length ? Math.max(...controlSendLatencies) : null
      },
      eventLatencyMs: {
        sampleCount: controlEventLatencies.length,
        median: percentile(controlEventLatencies, 0.5),
        p95: percentile(controlEventLatencies, 0.95),
        max: controlEventLatencies.length ? Math.max(...controlEventLatencies) : null
      }
    }];
  }));
  return {
    controls,
    sendLatencyMs: {
      sampleCount: sendLatencies.length,
      max: sendLatencies.length ? Math.max(...sendLatencies) : null
    },
    eventLatencyMs: {
      sampleCount: eventLatencies.length,
      median: percentile(eventLatencies, 0.5),
      p95: percentile(eventLatencies, 0.95),
      max: eventLatencies.length ? Math.max(...eventLatencies) : null
    },
    navigationLatencyMs: {
      sampleCount: navigationLatencies.length,
      median: percentile(navigationLatencies, 0.5),
      p95: percentile(navigationLatencies, 0.95),
      max: navigationLatencies.length ? Math.max(...navigationLatencies) : null
    }
  };
}

export const CASES = Object.freeze({
  reconnect_device: { phase: "system", hazard: "system" },
  reset_device_session: { phase: "system", hazard: "system" },
  disconnect_device: { phase: "system", hazard: "system" },
  get_current_preset: { phase: "read", hazard: "read" },
  get_state_events: { phase: "read", hazard: "read" },
  get_tempo_clock: { phase: "read", hazard: "read" },
  get_block_details: { phase: "read", hazard: "read" },
  get_lane_control_details: { phase: "read", hazard: "read" },
  list_models: { phase: "read", hazard: "read" },
  list_presets: { phase: "read", hazard: "read" },
  list_preset_folders: { phase: "read", hazard: "read" },
  list_preset_slots: { phase: "read", hazard: "read" },
  get_master_volume: { phase: "read", hazard: "read" },
  get_device_identity: { phase: "read", hazard: "read" },
  get_inhibited_modules: { phase: "read", hazard: "read" },
  get_tuner_settings: { phase: "read", hazard: "read" },
  set_tuner_input: { phase: "tuner", hazard: "tuner" },
  set_tuner_mute: { phase: "tuner", hazard: "tuner" },
  restore_tuner_audio: { phase: "tuner", hazard: "tuner" },
  set_tuner_reference: { phase: "tuner", hazard: "tuner" },
  get_general_settings: { phase: "read", hazard: "read" },
  get_io_settings: { phase: "read", hazard: "read" },
  get_global_eq: { phase: "read", hazard: "read" },
  get_mode_cycle: { phase: "read", hazard: "read" },
  get_global_tempo_settings: { phase: "read", hazard: "read" },
  get_looper_status: { phase: "read", hazard: "read" },
  list_recents: { phase: "read", hazard: "read" },
  list_favorites: { phase: "read", hazard: "read" },
  list_pinned_models: { phase: "read", hazard: "read" },
  list_captures: { phase: "read", hazard: "read" },
  list_irs: { phase: "read", hazard: "read" },
  get_preset_screenshot: { phase: "read", hazard: "read" },
  capture_screen: { phase: "read", hazard: "read" },
  preview_parameter: { phase: "modify", hazard: "live" },
  preview_lane_control_parameter: { phase: "modify", hazard: "live" },
  create_device_backup: { phase: "persistent", hazard: "persistent" },
  set_device_name: { phase: "system", hazard: "system" },
  undo_device: { phase: "modify", hazard: "live" },
  redo_device: { phase: "modify", hazard: "live" },
  tap_screen: { phase: "system", hazard: "screen" },
  select_scene: { phase: "performance", hazard: "live" },
  copy_scene: { phase: "modify", hazard: "live" },
  set_scene_label: { phase: "modify", hazard: "live" },
  set_scene_color: { phase: "modify", hazard: "live" },
  press_footswitch: { phase: "performance", hazard: "live" },
  tap_tempo: { phase: "performance", hazard: "live" },
  navigate_bank: { phase: "performance", hazard: "live" },
  show_tuner: { phase: "performance", hazard: "live" },
  show_gig_view: { phase: "performance", hazard: "live" },
  select_mode_slot: { phase: "performance", hazard: "live" },
  control_looper: { phase: "performance", hazard: "live" },
  set_master_volume: { phase: "performance", hazard: "live" },
  recall_preset: { phase: "modify", hazard: "live" },
  reload_preset: { phase: "modify", hazard: "live" },
  set_tempo: { phase: "performance", hazard: "live" },
  set_bypass: { phase: "modify", hazard: "live" },
  set_parameter: { phase: "modify", hazard: "live" },
  set_parameter_scene_mode: { phase: "modify", hazard: "live" },
  set_parameter_expression: { phase: "modify", hazard: "live" },
  set_lane_control_parameter: { phase: "modify", hazard: "live" },
  set_lane_control_scene_mode: { phase: "modify", hazard: "live" },
  set_expression_bypass: { phase: "modify", hazard: "live" },
  move_block: { phase: "modify", hazard: "live" },
  add_block: { phase: "modify", hazard: "live" },
  remove_block: { phase: "modify", hazard: "live" },
  load_capture: { phase: "modify", hazard: "live" },
  load_ir: { phase: "modify", hazard: "live" },
  set_block_footswitch: { phase: "modify", hazard: "live" },
  set_stomp_momentary: { phase: "modify", hazard: "live" },
  set_stomp_label: { phase: "modify", hazard: "live" },
  set_midi_out: { phase: "modify", hazard: "live" },
  set_preset_load_midi_out: { phase: "modify", hazard: "live" },
  set_chain_input: { phase: "modify", hazard: "live" },
  set_chain_output: { phase: "modify", hazard: "live" },
  set_chain_split: { phase: "modify", hazard: "live" },
  set_split_mute: { phase: "modify", hazard: "live" },
  save_preset_as: { phase: "persistent", hazard: "persistent" },
  rename_current_preset: { phase: "persistent", hazard: "persistent" },
  copy_preset: { phase: "persistent", hazard: "persistent" },
  set_general_integer: { phase: "persistent", hazard: "persistent" },
  set_general_toggle: { phase: "persistent", hazard: "persistent" },
  set_scene_bypass_behavior: { phase: "persistent", hazard: "persistent" },
  set_master_volume_assignment: { phase: "persistent", hazard: "persistent" },
  set_global_bypass: { phase: "persistent", hazard: "persistent" },
  set_input_port: { phase: "persistent", hazard: "persistent" },
  set_output_port: { phase: "persistent", hazard: "persistent" },
  set_usb_port: { phase: "persistent", hazard: "persistent" },
  set_midi_thru: { phase: "persistent", hazard: "persistent" },
  set_output_pairing: { phase: "persistent", hazard: "persistent" },
  set_global_eq_bypassed: { phase: "persistent", hazard: "persistent" },
  set_global_eq_band: { phase: "persistent", hazard: "persistent" },
  set_global_eq_output: { phase: "persistent", hazard: "persistent" },
  set_mode_cycle: { phase: "persistent", hazard: "persistent" },
  set_tempo_metronome: { phase: "persistent", hazard: "persistent" },
  set_tempo_mode: { phase: "persistent", hazard: "persistent" },
  set_favorite: { phase: "persistent", hazard: "persistent" },
  set_model_pinned: { phase: "persistent", hazard: "persistent" },
  create_setlist: { phase: "persistent", hazard: "persistent" },
  delete_setlist: { phase: "persistent", hazard: "persistent" },
  duplicate_setlist: { phase: "persistent", hazard: "persistent" },
  delete_preset: { phase: "persistent", hazard: "persistent" },
  move_preset: { phase: "persistent", hazard: "persistent" }
});

const requiredFixturePaths = [
  "target",
  "safety.expectedSerialSuffix",
  "scratchPreset.setlistKey",
  "scratchPreset.position",
  "scratchPreset.requiredNamePrefix",
  "presetScreenshot.folderName",
  "presetScreenshot.position",
  "parameter.row",
  "parameter.column",
  "parameter.index",
  "parameter.testValue",
  "temporaryBlock.modelId",
  "temporaryBlock.row",
  "temporaryBlock.addColumn",
  "temporaryBlock.moveColumn",
  "temporaryBlock.footswitch",
  "library.pinnedModelId",
  "library.capture.key",
  "library.capture.name",
  "library.capture.modelId",
  "library.ir.key",
  "library.ir.name",
  "library.ir.modelId",
  "library.ir.slot",
  "routing.row",
  "routing.testInputId",
  "routing.testOutputId",
  "routing.testSplitColumn",
  "routing.testMixColumn",
  "performance.scene",
  "performance.sceneCopyDestination",
  "performance.sceneTestLabel",
  "performance.sceneTestColor",
  "performance.footswitchIndex",
  "performance.modeSlot",
  "performance.restoreModeSlot",
  "performance.tempo",
  "performance.masterVolume",
  "persistent.slotA.setlistKey",
  "persistent.slotA.position",
  "persistent.slotB.setlistKey",
  "persistent.slotB.position",
  "persistent.namePrefix",
  "system.temporaryDeviceName",
  "screenTap.x",
  "screenTap.y",
  "screenTap.restoreX",
  "screenTap.restoreY"
];

function atPath(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

export function validateCoverage(contract) {
  const names = contract.actions.map((action) => action.name);
  const missing = names.filter((name) => !CASES[name]);
  const stale = Object.keys(CASES).filter((name) => !names.includes(name));
  if (missing.length || stale.length) {
    throw new Error(`Hardware case drift. Missing: ${missing.join(", ") || "none"}; stale: ${stale.join(", ") || "none"}.`);
  }
  return names;
}

export function validateConfig(config, { requireAll = false } = {}) {
  if (!config || typeof config !== "object") throw new Error("A hardware conformance config object is required.");
  if (!config.transport || !["gateway-stdio", "mcp-http"].includes(config.transport.kind)) {
    throw new Error("transport.kind must be gateway-stdio or mcp-http.");
  }
  if (!config.target || !["windows", "android"].includes(config.target)) throw new Error("target must be windows or android.");
  if (config.transport.kind === "gateway-stdio" && !config.transport.command) throw new Error("gateway-stdio requires transport.command.");
  if (config.transport.kind === "mcp-http" && !config.transport.endpoint) throw new Error("mcp-http requires transport.endpoint.");
  const missing = requiredFixturePaths.filter((path) => atPath(config, path) === undefined || atPath(config, path) === "");
  if (requireAll && missing.length) throw new Error(`Full physical coverage requires config values: ${missing.join(", ")}`);
  if (requireAll) {
    if (!Number.isFinite(config.transport.timeoutMs)
        || config.transport.timeoutMs < FULL_RUN_MINIMUM_TRANSPORT_TIMEOUT_MS) {
      throw new Error(`Full physical coverage requires transport.timeoutMs >= ${FULL_RUN_MINIMUM_TRANSPORT_TIMEOUT_MS} so the shared 180-second native backup window can complete.`);
    }
    if (!Number.isInteger(config.library.pinnedModelId) || config.library.pinnedModelId < 0) {
      throw new Error("library.pinnedModelId must be a non-negative integer.");
    }
    if (!Number.isInteger(config.library.capture.modelId) || config.library.capture.modelId < 0) {
      throw new Error("library.capture.modelId must be a non-negative integer.");
    }
    if (!Number.isInteger(config.library.ir.modelId) || config.library.ir.modelId < 0) {
      throw new Error("library.ir.modelId must be a non-negative integer.");
    }
    if (![0, 1].includes(config.library.ir.slot)) {
      throw new Error("library.ir.slot must be 0 or 1.");
    }
  }
  return missing;
}

export function contractDigest(contract) {
  return createHash("sha256").update(JSON.stringify(contract)).digest("hex");
}

export function validateTransportHealthEvidence(target, transportHealth) {
  const errors = [];
  if (!Array.isArray(transportHealth)) return [`${target} report has no USB transport-health evidence`];
  const byStage = new Map(transportHealth.map((entry) => [entry?.stage, entry]));
  for (const stage of ["before-system-recovery", "final"]) {
    const health = byStage.get(stage);
    if (!health) {
      errors.push(`${target} report has no ${stage} USB health sample`);
      continue;
    }
    if (health.connected !== true) errors.push(`${target} USB was not connected at ${stage}`);
    if (health.synchronized !== true) errors.push(`${target} USB was not synchronized at ${stage}`);
    if (!(Number.isFinite(health.messagesReceived) && health.messagesReceived > 0)) {
      errors.push(`${target} USB observed no device messages at ${stage}`);
    }
    if (!(Number.isFinite(health.messagesSent) && health.messagesSent > 0)) {
      errors.push(`${target} USB observed no outbound messages at ${stage}`);
    }
    if (!(Number.isFinite(health.maxHidWriteDurationMs) && health.maxHidWriteDurationMs <= 20)) {
      errors.push(`${target} USB HID write latency exceeded or lacked the 20 ms gate at ${stage}`);
    }
    if (target === "android") {
      if (health.decodeErrors !== 0) errors.push(`${target} USB decoder was not clean at ${stage}`);
      if (health.readerRequestActive !== true || !(health.readerRequestCount > 0)) {
        errors.push(`${target} USB reader was not active at ${stage}`);
      }
      if (!(Number.isFinite(health.maxMidiQueueDelayMs) && health.maxMidiQueueDelayMs <= 20)) {
        errors.push(`${target} performance MIDI queue latency exceeded or lacked the 20 ms gate at ${stage}`);
      }
      if (health.lastReaderError) errors.push(`${target} USB reader reported an error at ${stage}`);
    }
  }
  return errors;
}

export function validatePerformanceEvidence(target, performance) {
  const errors = [];
  if (!performance || typeof performance !== "object") return [`${target} report has no physical performance evidence`];
  for (const control of REPEATABLE_PHYSICAL_CONTROLS) {
    const evidence = performance.controls?.[control];
    if (!evidence) {
      errors.push(`${target} report has no repetition evidence for ${control}`);
      continue;
    }
    if (!(Number.isInteger(evidence.repetitions) && evidence.repetitions >= MINIMUM_CONTROL_REPETITIONS)) {
      errors.push(`${target} ${control} was not exercised ${MINIMUM_CONTROL_REPETITIONS} times`);
    }
    if (!(Number.isInteger(evidence.rapidPairs) && evidence.rapidPairs >= MINIMUM_RAPID_PAIRS)) {
      errors.push(`${target} ${control} did not complete ${MINIMUM_RAPID_PAIRS} rapid pairs`);
    }
    if (evidence.failures !== 0) errors.push(`${target} ${control} repetition evidence contains failures`);
    if (REALTIME_CONTROLS.includes(control)) {
      const limit = realtimeControlEventP95Limit(control);
      if (!(Number.isFinite(evidence.eventLatencyMs?.p95) && evidence.eventLatencyMs.p95 <= limit)) {
        errors.push(`${target} ${control} event-latency p95 exceeded or lacked the ${limit} ms gate`);
      }
    }
  }
  if (!(Number.isFinite(performance.sendLatencyMs?.max) && performance.sendLatencyMs.max <= MAXIMUM_SEND_LATENCY_MS)) {
    errors.push(`${target} direct-control send latency exceeded or lacked the ${MAXIMUM_SEND_LATENCY_MS} ms gate`);
  }
  const minimumEventSamples = REALTIME_CONTROLS.length * MINIMUM_CONTROL_REPETITIONS;
  if (!(Number.isInteger(performance.sendLatencyMs?.sampleCount)
      && performance.sendLatencyMs.sampleCount >= minimumEventSamples)) {
    errors.push(`${target} direct-control send-latency evidence has fewer than ${minimumEventSamples} samples`);
  }
  if (!(Number.isInteger(performance.eventLatencyMs?.sampleCount)
      && performance.eventLatencyMs.sampleCount >= minimumEventSamples)) {
    errors.push(`${target} event-latency evidence has fewer than ${minimumEventSamples} samples`);
  }
  if (!(Number.isFinite(performance.eventLatencyMs?.median)
      && performance.eventLatencyMs.median <= MAXIMUM_EVENT_MEDIAN_MS)) {
    errors.push(`${target} event-latency median exceeded or lacked the ${MAXIMUM_EVENT_MEDIAN_MS} ms gate`);
  }
  if (!(Number.isFinite(performance.eventLatencyMs?.p95)
      && performance.eventLatencyMs.p95 <= MAXIMUM_EVENT_P95_MS)) {
    errors.push(`${target} event-latency p95 exceeded or lacked the ${MAXIMUM_EVENT_P95_MS} ms gate`);
  }
  const minimumNavigationSamples = NAVIGATION_CONTROLS.length * MINIMUM_CONTROL_REPETITIONS;
  if (!(Number.isInteger(performance.navigationLatencyMs?.sampleCount)
      && performance.navigationLatencyMs.sampleCount >= minimumNavigationSamples)) {
    errors.push(`${target} preset-navigation evidence has fewer than ${minimumNavigationSamples} samples`);
  }
  if (!(Number.isFinite(performance.navigationLatencyMs?.p95)
      && performance.navigationLatencyMs.p95 <= MAXIMUM_NAVIGATION_P95_MS)) {
    errors.push(`${target} preset-navigation p95 exceeded or lacked the ${MAXIMUM_NAVIGATION_P95_MS} ms gate`);
  }
  return errors;
}

export function validateReleaseReports(contract, reports, manifest) {
  const expectedNames = validateCoverage(contract);
  const expectedDigest = contractDigest(contract);
  const byTarget = new Map(reports.map((report) => [report.target, report]));
  const errors = [];
  if (!manifest || manifest.source?.dirty !== false || !manifest.source?.commit) {
    errors.push("release manifest does not identify a clean source commit");
  }
  for (const target of ["windows", "android"]) {
    const report = byTarget.get(target);
    if (!report) { errors.push(`missing ${target} report`); continue; }
    const candidates = manifest?.artifacts?.filter((artifact) => artifact.path?.replaceAll("\\", "/").startsWith(`artifacts/${target}/`)) ?? [];
    if (candidates.length !== 1) {
      errors.push(`release manifest must contain exactly one ${target} candidate`);
    } else {
      const candidate = report.releaseCandidate;
      if (!candidate) errors.push(`${target} report has no release candidate identity`);
      else {
        if (candidate.platform !== target) errors.push(`${target} report candidate platform does not match`);
        if (candidate.sourceCommit !== manifest.source.commit) errors.push(`${target} report source commit does not match`);
        if (candidate.sha256 !== candidates[0].sha256) errors.push(`${target} report candidate digest does not match`);
        if (candidate.size !== candidates[0].size) errors.push(`${target} report candidate size does not match`);
      }
    }
    if (report.contractSha256 !== expectedDigest) errors.push(`${target} contract digest does not match`);
    if (report.summary?.complete !== true) errors.push(`${target} report is incomplete`);
    const passed = new Set(report.results?.filter((result) => result.status === "passed").map((result) => result.name));
    for (const name of ["system.status", ...expectedNames]) if (!passed.has(name)) errors.push(`${target} did not pass ${name}`);
    if (report.restoration?.some((item) => item.status !== "passed")) errors.push(`${target} restoration failed`);
    errors.push(...validateTransportHealthEvidence(target, report.transportHealth));
    errors.push(...validatePerformanceEvidence(target, report.performanceEvidence));
  }
  if (errors.length) throw new Error(`Hardware release gate failed: ${errors.join("; ")}.`);
  return { targets: ["windows", "android"], sourceCommit: manifest.source.commit, contractSha256: expectedDigest, actionsPerTarget: expectedNames.length };
}

export function snakeToCamel(value) {
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function gatewayArguments(actionName, args) {
  const output = {};
  for (const [key, value] of Object.entries(args ?? {})) {
    if (key === "confirm_risky_operation" || key === "confirm_persistent_write") continue;
    // Both MCP implementations apply the user-facing model query after the
    // parameterless device.listModels read. Keep direct-gateway hardware runs
    // on that same canonical projection instead of leaking the MCP-only input
    // into the native broker boundary.
    if (actionName === "list_models" && key === "query") continue;
    const target = actionName === "rename_current_preset" && key === "new_name" ? "name" : snakeToCamel(key);
    output[target] = value;
  }
  if (actionName === "rename_current_preset") output.confirmRename = true;
  return output;
}

export function redactEvidence(value) {
  if (Array.isArray(value)) return value.map(redactEvidence);
  if (!value || typeof value !== "object") return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/serial|credential|token|authorization/i.test(key)) {
      output[key] = typeof item === "string" && item ? `sha256:${createHash("sha256").update(item).digest("hex").slice(0, 12)}` : "[redacted]";
    } else if (/pngBase64|data|payloadBase64/i.test(key) && typeof item === "string") {
      output[key] = `[binary ${Buffer.byteLength(item, "base64")} bytes]`;
    } else {
      output[key] = redactEvidence(item);
    }
  }
  return output;
}

export function markPhysicalResultVerified(results, name, observation) {
  const row = [...results].reverse().find((result) => result.name === name && result.status === "passed");
  if (!row) throw new Error(`Cannot attach physical verification: ${name} has no passed result.`);
  row.evidence = {
    ...(row.evidence ?? {}),
    verified: true,
    verification: "authoritative_physical_observation",
    physicalObservation: redactEvidence(observation)
  };
  return row;
}

export function actionPlan(contract, enabledHazards = new Set(["read"])) {
  return validateCoverage(contract).map((name) => ({
    name,
    ...CASES[name],
    enabled: enabledHazards.has(CASES[name].hazard)
  }));
}

export function summarizePhysicalResults(results, contractActionNames, failure, performedNames) {
  const expectedNames = ["system.status", ...contractActionNames];
  const rowsFor = (name) => results.filter((result) => result.name === name);
  const failedNames = expectedNames.filter((name) => rowsFor(name).some((result) => result.status === "failed"));
  const passedNames = expectedNames.filter((name) => {
    const rows = rowsFor(name);
    return rows.some((result) => result.status === "passed")
      && rows.every((result) => result.status === "passed");
  });
  const failed = failedNames.length + (failure && failedNames.length === 0 ? 1 : 0);
  return {
    passed: passedNames.length,
    failed,
    skipped: expectedNames.length - passedNames.length - failedNames.length,
    complete: failed === 0
      && rowsFor("system.status").some((result) => result.status === "passed")
      && contractActionNames.every((name) => performedNames.has(name))
  };
}

export function assertMutationAcknowledged(environment = process.env) {
  if (environment.QC_HARDWARE_TEST_ACK !== MUTATION_ACK) {
    throw new Error(`Mutation execution requires QC_HARDWARE_TEST_ACK=${MUTATION_ACK}.`);
  }
}

export function assertDisposableSlots(config, slots) {
  const seen = new Set();
  for (const slot of slots) {
    const key = `${slot.setlistKey}:${slot.position}`;
    if (seen.has(key)) throw new Error("Persistent-test slots A and B must be distinct.");
    seen.add(key);
    if (slot.setlistKey === config.scratchPreset.setlistKey && slot.position === config.scratchPreset.position) {
      throw new Error("A disposable persistent-test slot cannot be the source scratch preset.");
    }
  }
}

export function resultSnapshot(result) {
  return result?.snapshot && typeof result.snapshot === "object" ? result.snapshot : undefined;
}

export function pngSignatureIsValid(image, expectedWidth, expectedHeight) {
  if (image?.width !== expectedWidth || image?.height !== expectedHeight || typeof image?.pngBase64 !== "string") return false;
  return Buffer.from(image.pngBase64, "base64").subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
}
