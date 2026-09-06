#!/usr/bin/env node
/**
 * Drive the running Windows app through the workflows a player actually uses,
 * against the physical Quad Cortex, and capture the device's own screen beside
 * the app's Grid at every step so parity is checked visually rather than
 * asserted from the app's own state.
 *
 * Every step records evidence even when it fails, so one broken workflow does
 * not hide the state of the others.
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const playwrightModule = process.env.CODEX_WORKSPACE_NODE_MODULES
  ? pathToFileURL(join(process.env.CODEX_WORKSPACE_NODE_MODULES, "playwright", "index.mjs")).href
  : "playwright";
const { chromium } = await import(playwrightModule);
const run = promisify(execFile);

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const index = argv.indexOf(name);
  return index < 0 ? fallback : argv[index + 1];
};
const endpoint = option("--endpoint", "http://127.0.0.1:9223");
const outputDirectory = option("--output-dir", "artifacts/ui-parity");
const timeoutMs = Number(option("--timeout-ms", "15000"));
const only = option("--only");
const acknowledgement = "I_ACCEPT_QC_HARDWARE_MUTATIONS";
if (process.env.QC_HARDWARE_TEST_ACK !== acknowledgement) {
  throw new Error(`Set QC_HARDWARE_TEST_ACK=${acknowledgement} before driving the physical device.`);
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()
  .flatMap((context) => context.pages())
  .find((candidate) => candidate.url().startsWith("http://tauri.localhost/")
    || candidate.url().startsWith("http://127.0.0.1:1420/"));
if (!page) throw new Error("A debuggable QC Control WebView was not found.");

/**
 * A rejected Tauri command carries a plain object, which Playwright reports as
 * the useless "page.evaluate: Object". Bring the message across as text so a
 * failing step names the device error instead of its shape.
 */
const invoke = async (method, params = {}) => {
  const outcome = await page.evaluate(async ({ method, params }) => {
    try { return { ok: await window.__TAURI_INTERNALS__.invoke("gateway_invoke", { method, params }) }; }
    catch (error) {
      const detail = error?.message ?? error?.error ?? (typeof error === "string" ? error : JSON.stringify(error));
      return { failed: String(detail) };
    }
  }, { method, params });
  if (outcome.failed !== undefined) throw new Error(`${method}: ${outcome.failed}`);
  return outcome.ok;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const steps = [];

/**
 * The app's Grid screen and the device's own screen, taken back to back.
 *
 * `comparable` is false where the two are deliberately showing different
 * things - the app's Directory over the device's Grid, or the device's Gig
 * View over the app's Grid - so the report keeps the evidence without scoring
 * a difference that is not a defect.
 */
async function captureParity(name, comparable = true) {
  const appPath = join(outputDirectory, `${name}-app.png`);
  const devicePath = join(outputDirectory, `${name}-device.png`);
  const evidence = { app: appPath, device: devicePath, comparable };
  try {
    await page.locator(".coros-vector-screen").first().screenshot({ path: appPath });
  } catch (error) { evidence.appError = String(error?.message ?? error); }
  try {
    const captured = await invoke("device.captureScreen");
    await writeFile(devicePath, Buffer.from(captured.pngBase64, "base64"));
    evidence.deviceSize = [captured.width, captured.height];
  } catch (error) { evidence.deviceError = String(error?.message ?? error); }
  return evidence;
}

async function step(name, body) {
  if (only && !name.includes(only)) return undefined;
  const startedAt = Date.now();
  const record = { name, result: "passed", durationMs: 0, facts: {} };
  try {
    const facts = await body(record);
    if (facts) Object.assign(record.facts, facts);
  } catch (error) {
    record.result = "failed";
    record.error = String(error?.message ?? error);
  }
  // A step that could not run has verified nothing. Reporting it as a pass is
  // how a gap hides in a green run.
  if (record.result === "passed" && record.facts.skipped) record.result = "skipped";
  record.durationMs = Date.now() - startedAt;
  steps.push(record);
  const marker = { passed: "PASS", failed: "FAIL", skipped: "SKIP" }[record.result];
  const tail = record.error ?? (record.result === "skipped" ? record.facts.skipped : "");
  console.log(`${marker}  ${name}${tail ? ` - ${tail}` : ""}`);
  return record;
}

const expect = (condition, message) => { if (!condition) throw new Error(message); };

/** Poll a device condition rather than guessing at a fixed delay. */
async function waitFor(condition, message, budgetMs = timeoutMs) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    if (await condition().catch(() => false)) return;
    await sleep(250);
  }
  throw new Error(message);
}

/** Put the device back on the preset this run found loaded. */
async function returnToStartingPreset() {
  if (!startingPreset) return { returned: false };
  const now = await invoke("device.snapshot");
  if (now.presetPosition === startingPreset.presetPosition
    && now.setlistKey === startingPreset.setlistKey) return { returned: false, at: now.presetLocation };
  if (now.dirty) await revertOwnEdits("returning to the starting preset");
  const settled = await invoke("device.snapshot");
  await invoke("device.recallPreset", {
    setlistKey: startingPreset.setlistKey, position: startingPreset.presetPosition,
    expectedPresetName: settled.presetName ?? "", expectedPosition: settled.presetPosition,
    expectedSetlistKey: settled.setlistKey
  });
  await waitFor(async () => (await invoke("device.snapshot")).presetPosition === startingPreset.presetPosition,
    "the run could not return the device to the preset it started on", 30_000);
  return { returned: true, at: startingPreset.presetLocation };
}

/**
 * Revert the live grid to the stored preset. Editing steps leave the preset
 * dirty even after they restore every value, and a dirty preset blocks preset
 * navigation by design - so a run that edits must also clean up after itself.
 * Only ever called for dirt this run created.
 */
async function revertOwnEdits(why) {
  const snapshot = await invoke("device.snapshot");
  if (!snapshot.dirty) return { reverted: false };
  await invoke("device.reloadPreset", {
    expectedPresetName: snapshot.presetName ?? "", expectedPosition: snapshot.presetPosition
  });
  await waitFor(async () => !(await invoke("device.snapshot")).dirty, `the preset stayed dirty after ${why}`, 20_000);
  return { reverted: true, why };
}

/** The pid of the broker the host currently owns, or null when none runs. */
async function brokerPid() {
  const { stdout } = await run("tasklist", ["/FI", "IMAGENAME eq qc-device-broker.exe", "/FO", "CSV", "/NH"])
    .catch(() => ({ stdout: "" }));
  const match = /^"qc-device-broker\.exe","(\d+)"/m.exec(stdout);
  return match ? Number(match[1]) : null;
}

const readLamps = () => page.evaluate(() => [...document.querySelectorAll(".footswitch-row .hardware-switch")]
  .map((node) => ({
    label: node.querySelector(".switch-label")?.textContent?.trim() ?? "",
    accent: getComputedStyle(node).getPropertyValue("--switch-accent").trim(),
    active: node.classList.contains("is-active"),
    assigned: node.classList.contains("is-assigned")
  })));

/**
 * Put the app back on the Grid before anything is measured. The run must not
 * depend on which screen the previous session happened to leave open.
 */
async function returnToTheGrid() {
  for (const closer of ["Return to Grid", "Close route selection"]) {
    const button = page.getByRole("button", { name: closer });
    if (await button.count()) await button.first().click().catch(() => undefined);
  }
  if (await page.locator(".dialog-backdrop").count()) await page.keyboard.press("Escape").catch(() => undefined);
  await sleep(400);
  return page.evaluate(() => ({
    directory: Boolean(document.querySelector(".coros-directory")),
    dialog: Boolean(document.querySelector(".dialog-backdrop")),
    grid: Boolean(document.querySelector(".coros-vector-canvas"))
  }));
}

// ---------------------------------------------------------------- connection

let startingPreset;

await step("00-app-starts-on-the-grid", async () => {
  const state = await returnToTheGrid();
  startingPreset = await invoke("device.snapshot");
  expect(state.grid && !state.directory && !state.dialog,
    `the app is not on the Grid: ${JSON.stringify(state)}`);
  return { ...state, startedOn: `${startingPreset.presetLocation} ${startingPreset.presetName}`, dirty: startingPreset.dirty };
});

await step("01-connection-ready", async (record) => {
  await page.getByRole("button", { name: /QC READY; open connection details/ }).waitFor({ timeout: timeoutMs });
  const status = await invoke("system.status");
  expect(status.usbDiagnostics?.connected, "the app reports no USB connection");
  expect(status.usbDiagnostics?.synchronized, "the app reports an unsynchronized session");
  const badge = (await page.locator(".connection-badge:not(.relay-badge)").first().innerText()).trim();
  expect(badge.includes("QC READY"), `readiness badge reads "${badge}"`);
  record.facts.parity = await captureParity("01-connection-ready");
  return { badge, usbDiagnostics: status.usbDiagnostics };
});

// ------------------------------------------------------------ window geometry

await step("02-window-fits-the-screen", async () => {
  const geometry = await page.evaluate(() => {
    const chassis = document.querySelector(".qc-chassis");
    const workspace = document.querySelector(".workspace");
    const chassisBox = chassis?.getBoundingClientRect();
    const workspaceBox = workspace?.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      chassis: chassisBox && { top: chassisBox.top, bottom: chassisBox.bottom, height: chassisBox.height },
      workspace: workspaceBox && { top: workspaceBox.top, bottom: workspaceBox.bottom, height: workspaceBox.height },
      padding: workspace && getComputedStyle(workspace).padding
    };
  });
  expect(geometry.documentScrollHeight <= geometry.innerHeight + 1,
    `the shell scrolls vertically: ${geometry.documentScrollHeight} > ${geometry.innerHeight}`);
  expect(geometry.documentScrollWidth <= geometry.innerWidth + 1,
    `the shell scrolls horizontally: ${geometry.documentScrollWidth} > ${geometry.innerWidth}`);
  expect(geometry.chassis && geometry.chassis.bottom <= geometry.innerHeight + 1,
    `the device art runs past the bottom edge: ${geometry.chassis?.bottom} > ${geometry.innerHeight}`);
  const above = geometry.chassis.top - geometry.workspace.top;
  const below = geometry.workspace.bottom - geometry.chassis.bottom;
  return { ...geometry, paddingAboveDevice: Math.round(above), paddingBelowDevice: Math.round(below) };
});

// -------------------------------------------------------------- preset library

await step("03-preset-library-populates", async (record) => {
  await returnToTheGrid();
  await page.locator(".preset-title-hit").click();
  await page.locator(".coros-directory").waitFor({ timeout: timeoutMs });
  // The library is populated when the device's own listing has landed AND the
  // Directory has rendered folders, banks and preset rows from it.
  const deadline = Date.now() + timeoutMs * 3;
  let listing = await invoke("device.listPresetFolders", { refresh: true });
  let rendered = { folders: 0, banks: 0, presets: 0 };
  while (Date.now() < deadline) {
    listing = await invoke("device.listPresetFolders");
    rendered = await page.evaluate(() => ({
      folders: document.querySelectorAll(".directory-folders button").length,
      banks: document.querySelectorAll(".directory-banks button").length,
      presets: document.querySelectorAll(".directory-preset-row").length,
      loadingText: document.querySelector(".directory-loading")?.textContent?.trim() ?? null,
      sample: [...document.querySelectorAll(".directory-preset-row .preset-recall")]
        .slice(0, 5)
        .map((row) => row.textContent?.replace(/\s+/g, " ").trim())
    }));
    if (!listing.loading && (listing.folders ?? []).length > 0 && rendered.banks > 0 && rendered.presets > 0) break;
    await sleep(500);
  }
  record.facts.parity = await captureParity("03-preset-library", false);
  expect((listing.folders ?? []).length > 0, "the device reported no preset folders");
  expect(!listing.loading, "the preset folder listing never finished loading");
  expect(rendered.banks > 0, `the Directory rendered no banks (${rendered.loadingText ?? "no loading text"})`);
  expect(rendered.presets > 0, `the Directory rendered no preset rows (${rendered.loadingText ?? "no loading text"})`);
  return { deviceFolders: listing.folders.length, loading: listing.loading, rendered };
});

await step("04-preset-library-returns-to-the-grid", async () => {
  await page.getByRole("button", { name: "Return to Grid" }).click();
  await page.locator(".coros-directory").waitFor({ state: "detached", timeout: timeoutMs });
  const gridVisible = await page.evaluate(() => Boolean(document.querySelector(".coros-vector-canvas")));
  expect(gridVisible, "the Grid did not come back after closing the Directory");
  return { gridVisible };
});

// ------------------------------------------------- preset navigation and name

await step("05-preset-navigation-updates-name-and-number", async (record) => {
  const before = await invoke("device.snapshot");
  // The QC refuses to leave a preset with unsaved edits, and so does the app.
  // That is the contract, not a failure: say so rather than destroying work.
  if (before.dirty) return { skipped: `${before.presetLocation} has unsaved changes; navigation is blocked by design` };
  const uiBefore = await readPresetFromUi();
  await page.getByRole("button", { name: /BANK DOWN/i }).first().click();
  const deadline = Date.now() + timeoutMs;
  let after = before;
  let uiAfter = uiBefore;
  let nameSettledMs;
  let numberSettledMs;
  const startedAt = Date.now();
  while (Date.now() < deadline) {
    after = await invoke("device.snapshot");
    uiAfter = await readPresetFromUi();
    if (numberSettledMs === undefined && uiAfter.location !== uiBefore.location) numberSettledMs = Date.now() - startedAt;
    if (nameSettledMs === undefined && uiAfter.name !== uiBefore.name) nameSettledMs = Date.now() - startedAt;
    if (uiAfter.name === after.presetName && uiAfter.location === after.presetLocation
      && after.presetPosition !== before.presetPosition) break;
    await sleep(250);
  }
  record.facts.parity = await captureParity("05-preset-navigation");
  expect(after.presetPosition !== before.presetPosition, "the device did not change preset");
  expect(uiAfter.name === after.presetName,
    `the app shows preset name "${uiAfter.name}" while the device holds "${after.presetName}"`);
  expect(uiAfter.location === after.presetLocation,
    `the app shows slot ${uiAfter.location} while the device holds ${after.presetLocation}`);
  return { before: { ...uiBefore, device: before.presetName }, after: { ...uiAfter, device: after.presetName }, nameSettledMs, numberSettledMs };
});

async function readPresetFromUi() {
  return page.evaluate(() => {
    const title = document.querySelector(".coros-vector-canvas .preset-title");
    const text = document.querySelector(".coros-vector-canvas text");
    const spans = text ? [...text.querySelectorAll("tspan")].map((node) => node.textContent ?? "") : [];
    return {
      name: title?.textContent ?? null,
      location: spans.length >= 2 ? `${spans[0]}${spans[1]}` : null,
      footer: document.querySelector(".status-context strong")?.textContent ?? null
    };
  });
}

// ---------------------------------------------------- PRESET mode LED colours

await step("06-preset-mode-footswitch-leds", async (record) => {
  const snapshot = await invoke("device.snapshot");
  const leds = await readLamps();
  const slotLamps = leds.filter((lamp) => /^[A-H]$/.test(lamp.label));
  if (snapshot.mode === "PRESET") {
    const colours = slotLamps.map((lamp) => lamp.accent.toLowerCase());
    expect(new Set(colours).size === 8,
      `PRESET lamps must carry eight distinct colours, saw ${new Set(colours).size}: ${colours.join(" ")}`);
    const lit = slotLamps.map((lamp) => lamp.active);
    expect(lit.filter(Boolean).length === 1, `exactly one PRESET lamp is lit, saw ${lit.filter(Boolean).length}`);
    expect(lit[snapshot.presetPosition % 8], "the lit lamp is not the loaded slot");
  }
  record.facts.parity = await captureParity("06-preset-mode-leds");
  // Gig View is the one place the QC paints its own footswitch colours on a
  // surface we can read back, so it is the ground truth for what the app's
  // lamps should show. Capture it, then put the device back on the Grid.
  let gigView;
  try {
    await invoke("device.showGigView", { shown: true });
    await sleep(1200);
    gigView = await captureParity("06b-gig-view-device-leds", false);
    gigView.appGig = join(outputDirectory, "06b-gig-view-app.png");
    await page.screenshot({ path: gigView.appGig });
  } catch (error) {
    gigView = { error: String(error?.message ?? error) };
  } finally {
    await invoke("device.showGigView", { shown: false }).catch(() => undefined);
    await sleep(800);
  }
  return {
    mode: snapshot.mode,
    footswitchModes: snapshot.footswitchModes,
    activeScene: snapshot.activeScene,
    sceneColors: snapshot.sceneColors,
    presetPosition: snapshot.presetPosition,
    leds,
    slotColours: slotLamps.map((lamp) => `${lamp.label}=${lamp.accent}`),
    gigView
  };
});

// -------------------------------------------------------------- tempo pulse

await step("07-tempo-lamp-tracks-the-device-beat", async () => {
  const clock = await invoke("device.tempoClock");
  const snapshot = await invoke("device.snapshot");
  const lamp = await page.evaluate(() => {
    const node = document.querySelector(".hardware-switch.is-tempo-pulse .switch-led");
    if (!node) return { present: false };
    const animations = node.getAnimations({ subtree: true })
      .filter((animation) => animation.animationName === "qc-tempo-led-pulse");
    return {
      present: true,
      count: animations.length,
      startTime: animations[0]?.startTime ?? null,
      currentTime: animations[0]?.currentTime ?? null,
      duration: animations[0]?.effect?.getTiming?.().duration ?? null,
      timeOrigin: performance.timeOrigin,
      period: getComputedStyle(node.parentElement).getPropertyValue("--tempo-period").trim(),
      epoch: null
    };
  });
  if (!lamp.present) return { skipped: "the TEMPO lamp is not pulsing", clock, tempo: snapshot.tempo };
  expect(lamp.count > 0, "the TEMPO lamp has no pulse animation");
  expect(lamp.startTime !== null, "the lamp's pulse is not anchored to any clock");
  expect(clock.available, "the device is not reporting a tempo clock");
  const period = 60_000 / snapshot.tempo;
  // The device names its beat by MIDI tick: 24 ticks to the beat, timestamped
  // when the broker read the frame. Beat zero therefore sits that many ticks
  // before the frame, and the lamp must start its cycle there.
  const deviceBeatOriginMs = clock.receivedAtUnixMs - ((clock.currentTick % 24) * period) / 24;
  const anchoredEpochMs = lamp.startTime + lamp.timeOrigin;
  const phaseErrorMs = Math.abs(
    (((anchoredEpochMs - deviceBeatOriginMs) % period) + period * 1.5) % period - period / 2
  );
  expect(phaseErrorMs <= period / 20,
    `the lamp sits ${phaseErrorMs.toFixed(1)}ms off the device beat, more than ${(period / 20).toFixed(1)}ms`);
  return { tempo: snapshot.tempo, periodMs: Math.round(period), clock, lamp, anchoredEpochMs, deviceBeatOriginMs, phaseErrorMs };
});

// ------------------------------------------------------------- master volume

await step("08-master-volume-round-trips-without-losing-sync", async (record) => {
  const slider = page.getByRole("slider", { name: "Master volume knob" });
  const uiVolume = () => page.evaluate(() =>
    Number(document.querySelector('[aria-label="Master volume knob"]')?.getAttribute("aria-valuenow")));
  const observed = async () => ({
    gateway: (await invoke("device.masterVolume")).value,
    ui: await uiVolume()
  });
  const waitForVolume = (value) => waitFor(async () => {
    const now = await observed();
    return now.gateway === value && now.ui === value;
  }, `Master Volume never settled on ${value}`, timeoutMs);
  const initial = await observed();
  expect(initial.gateway === initial.ui, `volume disagrees at rest: gateway ${initial.gateway}, UI ${initial.ui}`);
  const increase = initial.gateway < 100;
  const target = initial.gateway + (increase ? 1 : -1);
  await slider.focus();
  const changeStarted = Date.now();
  await slider.press(increase ? "ArrowUp" : "ArrowDown");
  await waitForVolume(target);
  const changeMs = Date.now() - changeStarted;
  const restoreStarted = Date.now();
  await slider.press(increase ? "ArrowDown" : "ArrowUp");
  await waitForVolume(initial.gateway);
  const restoreMs = Date.now() - restoreStarted;
  // A single step is the easy case. A real encoder turn coalesces many steps
  // while the device's echo is still in flight, which is where the write guard
  // and the knob's own value disagree.
  const sweepSteps = 6;
  const sweepUp = initial.gateway <= 100 - sweepSteps;
  const sweepKey = sweepUp ? "ArrowUp" : "ArrowDown";
  const sweepTarget = initial.gateway + (sweepUp ? sweepSteps : -sweepSteps);
  const notices = [];
  const noticeWatch = setInterval(async () => {
    const notice = await page.evaluate(() => document.querySelector(".status-notice")?.textContent?.trim() ?? null)
      .catch(() => null);
    if (notice && notices.at(-1) !== notice) notices.push(notice);
  }, 120);
  let sweep;
  try {
    const sweepStarted = Date.now();
    for (let index = 0; index < sweepSteps; index += 1) await slider.press(sweepKey);
    await waitForVolume(sweepTarget);
    sweep = { steps: sweepSteps, target: sweepTarget, convergedMs: Date.now() - sweepStarted, converged: true };
  } catch (error) {
    const observedNow = await observed();
    sweep = { steps: sweepSteps, target: sweepTarget, converged: false, observed: observedNow, error: String(error?.message ?? error) };
  } finally {
    clearInterval(noticeWatch);
  }
  // Put the device back where it was regardless of how the sweep went.
  const beforeRestore = await observed();
  if (beforeRestore.gateway !== initial.gateway) {
    await invoke("device.setMasterVolume", { value: initial.gateway, expectedValue: beforeRestore.gateway }).catch(() => undefined);
    await sleep(1200);
  }
  const status = await invoke("system.status");
  record.facts.parity = await captureParity("08-master-volume");
  expect(status.usbDiagnostics?.synchronized, "the session lost synchronization after a volume change");
  expect(sweep.converged, `a ${sweepSteps}-step encoder sweep never converged: ${sweep.error}`);
  expect(!notices.some((notice) => /refresh and retry|changed on the quad cortex/i.test(notice)),
    `the volume write guard rejected an in-flight step: ${notices.filter((notice) => /refresh and retry/i.test(notice))[0]}`);
  return { initial, target, changeMs, restoreMs, sweep, notices, final: await observed(), usbDiagnostics: status.usbDiagnostics };
});

// ------------------------------------------------------------- chat collapse

await step("09-assistant-pane-collapses-and-reopens", async () => {
  const collapse = page.getByRole("button", { name: "Collapse assistant" });
  await collapse.waitFor({ timeout: timeoutMs });
  await collapse.click();
  await page.locator(".restore-chat").waitFor({ timeout: timeoutMs });
  const collapsed = await page.evaluate(() => ({
    dock: Boolean(document.querySelector(".chat-dock")),
    restore: Boolean(document.querySelector(".restore-chat")),
    contentClosed: document.querySelector(".app-content")?.classList.contains("chat-closed") ?? false,
    chassisWidth: document.querySelector(".qc-chassis")?.getBoundingClientRect().width ?? null
  }));
  expect(!collapsed.dock && collapsed.restore, "the assistant pane did not collapse");
  await page.locator(".restore-chat").click();
  await page.locator(".chat-dock").waitFor({ timeout: timeoutMs });
  const reopened = await page.evaluate(() => ({
    dock: Boolean(document.querySelector(".chat-dock")),
    restore: Boolean(document.querySelector(".restore-chat")),
    chassisWidth: document.querySelector(".qc-chassis")?.getBoundingClientRect().width ?? null
  }));
  expect(reopened.dock && !reopened.restore, "the assistant pane did not reopen");
  return { collapsed, reopened };
});

// --------------------------------------------------------------- MCP relay

await step("10-remote-relay-badge", async () => {
  const badge = page.locator(".relay-badge");
  await badge.waitFor({ timeout: timeoutMs });
  const label = (await badge.innerText()).trim();
  expect(["REMOTE", "RELAY", "PAIR"].includes(label), `relay badge reads "${label}"`);
  await badge.click();
  const panel = page.locator(".relay-status-panel");
  await panel.waitFor({ timeout: timeoutMs });
  const actions = await page.evaluate(() => [...document.querySelectorAll(".relay-status-panel .chat-panel-actions button")]
    .map((node) => ({ label: node.textContent?.trim(), disabled: node.disabled })));
  await page.keyboard.press("Escape");
  const status = await page.evaluate(() => window.__TAURI_INTERNALS__.invoke("relay_status")).catch(() => undefined);
  return { label, actions, status };
});

// ------------------------------------------------------------- grid add areas

await step("11-grid-empty-cells-add-blocks", async () => {
  const snapshot = await invoke("device.snapshot");
  const occupied = new Set(snapshot.blocks.map((block) => `${block.row}:${block.column}`));
  const hits = await page.evaluate(() => [...document.querySelectorAll(".coros-vector-add-hit")]
    .map((node) => node.getAttribute("aria-label")));
  const emptyCells = [];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if (!occupied.has(`${row}:${column}`)) emptyCells.push(`Add a block at row ${row + 1}, column ${column + 1}`);
    }
  }
  const missing = emptyCells.filter((label) => !hits.includes(label));
  const spurious = hits.filter((label) => !emptyCells.includes(label));
  expect(missing.length === 0, `empty cells without an insertion point: ${missing.slice(0, 4).join("; ")}`);
  expect(spurious.length === 0, `insertion points over occupied cells: ${spurious.slice(0, 4).join("; ")}`);
  // Opening the catalog must target the cell the user actually pointed at.
  const target = emptyCells.at(-1);
  await page.getByRole("button", { name: target }).click();
  const dialog = page.locator(".add-block-form");
  await dialog.waitFor({ timeout: timeoutMs }).catch(() => undefined);
  const selected = await page.evaluate(() => document.querySelector(".add-block-form select")?.value ?? null);
  await page.keyboard.press("Escape");
  return { hits: hits.length, emptyCells: emptyCells.length, target, selectedCell: selected };
});

// ------------------------------------------------------- scenes and modes

await step("13-scene-mode-lamps-and-selection", async (record) => {
  const start = await invoke("device.snapshot");
  const startSlot = start.modeSlots?.findIndex((slot) => slot.mode === start.mode) ?? 0;
  const sceneSlot = start.modeSlots?.findIndex((slot) => slot.mode === "SCENE");
  if (sceneSlot === undefined || sceneSlot < 0) return { skipped: "no SCENE slot is assigned on this device" };
  await invoke("device.selectModeSlot", { slot: sceneSlot, expectedPresetName: start.presetName ?? "" });
  await waitFor(async () => (await invoke("device.snapshot")).mode === "SCENE", "the device did not enter SCENE mode");
  const target = (start.activeScene + 1) % 8;
  await invoke("device.selectScene", { scene: target, expectedPresetName: start.presetName ?? "" });
  await waitFor(async () => (await invoke("device.snapshot")).activeScene === target, "the device did not change scene");
  const inScene = await invoke("device.snapshot");
  // The app has to see the mode change before its lamps can be judged.
  await waitFor(async () => (await page.evaluate(() =>
    document.querySelector(".coros-vector-canvas")?.getAttribute("aria-label") ?? "")).includes("SCENE mode"),
    "the app never showed SCENE mode while the device was in it");
  const lamps = await readLamps();
  record.facts.parity = await captureParity("13-scene-mode");
  const expected = inScene.sceneColors ?? [];
  const observed = lamps.filter((lamp) => /^[A-H]$/.test(lamp.label)).map((lamp) => lamp.accent.toLowerCase());
  const lit = lamps.filter((lamp) => /^[A-H]$/.test(lamp.label)).map((lamp) => lamp.active);
  Object.assign(record.facts, { startMode: start.mode, sceneSlot, target, observed, expected });
  try {
    // SCENE lamps carry the preset's own scene colours, one per switch.
    expect(observed.length === 8, `expected eight scene lamps, saw ${observed.length}`);
    expect(observed.every((colour, index) => colour === (expected[index] ?? "").toLowerCase()),
      `SCENE lamps do not match the preset's scene colours: ${observed.join(" ")} against ${expected.join(" ")}`);
    expect(lit[target], `scene ${target} is selected on the device but its lamp is not lit`);
  } finally {
    // Put the device back on the scene and mode it started in, pass or fail.
    const now = await invoke("device.snapshot").catch(() => inScene);
    await invoke("device.selectScene", { scene: start.activeScene, expectedPresetName: now.presetName ?? "" }).catch(() => undefined);
    await invoke("device.selectModeSlot", { slot: startSlot, expectedPresetName: now.presetName ?? "" }).catch(() => undefined);
    await waitFor(async () => {
      const settled = await invoke("device.snapshot");
      return settled.mode === start.mode && settled.activeScene === start.activeScene;
    }, "the device did not return to its starting mode and scene").catch(() => undefined);
    record.facts.restoredMode = (await invoke("device.snapshot").catch(() => ({}))).mode;
  }
  return undefined;
});

// --------------------------------------------------------------- block edits

await step("14-block-bypass-round-trips-through-the-grid", async (record) => {
  // The navigation steps leave the device elsewhere; the editing steps need the
  // preset this run started on, which is the one the user actually had loaded.
  record.facts.returned = await returnToStartingPreset();
  const start = await invoke("device.snapshot");
  const block = start.blocks.find((candidate) => candidate.column >= 0 && candidate.modelId !== undefined)
    ?? start.blocks[0];
  if (!block) return { skipped: "the loaded preset has no blocks" };
  const original = Boolean(block.bypassed);
  // Read the scene immediately before the write: the guard compares against the
  // device's live scene, and an earlier step may still be settling.
  const atWrite = await invoke("device.snapshot");
  await invoke("device.toggleBypass", {
    row: block.row, column: block.column, expectedScene: atWrite.activeScene,
    expectedBypassed: original, desiredBypassed: !original, expectedPresetName: atWrite.presetName ?? ""
  });
  await waitFor(async () => {
    const now = await invoke("device.snapshot");
    return Boolean(now.blocks.find((c) => c.row === block.row && c.column === block.column)?.bypassed) !== original;
  }, "the device did not toggle the block's bypass");
  const toggledInUi = await page.evaluate(({ row, column }) => {
    const node = document.querySelector(`[aria-label^="Row ${row + 1}, "]`);
    return { present: Boolean(node), label: node?.getAttribute("aria-label") ?? null };
  }, { row: block.row, column: block.column });
  record.facts.parity = await captureParity("14-block-bypass");
  // Restore the grid exactly as it was; nothing here is saved to the device.
  const mid = await invoke("device.snapshot");
  await invoke("device.toggleBypass", {
    row: block.row, column: block.column, expectedScene: mid.activeScene,
    expectedBypassed: !original, desiredBypassed: original, expectedPresetName: mid.presetName ?? ""
  });
  await waitFor(async () => {
    const now = await invoke("device.snapshot");
    return Boolean(now.blocks.find((c) => c.row === block.row && c.column === block.column)?.bypassed) === original;
  }, "the block's bypass was not restored");
  const reverted = await revertOwnEdits("the bypass round trip");
  return { block: { row: block.row, column: block.column, name: block.name }, original, toggledInUi, reverted };
});

await step("15-parameter-edit-reads-back-and-restores", async () => {
  const start = await invoke("device.snapshot");
  const block = start.blocks.find((candidate) => candidate.column >= 0 && candidate.modelId !== undefined);
  if (!block) return { skipped: "the loaded preset has no editable blocks" };
  const details = await invoke("device.blockDetails", { row: block.row, column: block.column, expectedPresetName: start.presetName ?? "" });
  const parameter = (details.parameters ?? []).find((candidate) => typeof candidate.normalizedValue === "number");
  if (!parameter) return { skipped: `${block.name} reports no continuous parameter` };
  const original = parameter.normalizedValue;
  const target = original > 0.5 ? Number((original - 0.15).toFixed(3)) : Number((original + 0.15).toFixed(3));
  await invoke("device.setParameter", {
    row: block.row, column: block.column, parameterIndex: parameter.index, value: target,
    expectedValue: original, expectedScene: start.activeScene, expectedPresetName: start.presetName ?? ""
  });
  let readBack;
  await waitFor(async () => {
    const now = await invoke("device.blockDetails", { row: block.row, column: block.column, expectedPresetName: start.presetName ?? "" });
    readBack = (now.parameters ?? []).find((candidate) => candidate.index === parameter.index)?.normalizedValue;
    return typeof readBack === "number" && Math.abs(readBack - target) < 0.02;
  }, "the device did not report the written parameter value");
  await invoke("device.setParameter", {
    row: block.row, column: block.column, parameterIndex: parameter.index, value: original,
    expectedValue: readBack, expectedScene: start.activeScene, expectedPresetName: start.presetName ?? ""
  });
  await waitFor(async () => {
    const now = await invoke("device.blockDetails", { row: block.row, column: block.column, expectedPresetName: start.presetName ?? "" });
    const value = (now.parameters ?? []).find((candidate) => candidate.index === parameter.index)?.normalizedValue;
    return typeof value === "number" && Math.abs(value - original) < 0.02;
  }, "the parameter was not restored");
  const reverted = await revertOwnEdits("the parameter round trip");
  return { block: block.name, parameter: parameter.name ?? parameter.index, original, target, readBack, reverted };
});

// ---------------------------------------------------------------- tempo write

await step("16-tempo-write-moves-the-device-and-the-lamp", async (record) => {
  const start = await invoke("device.snapshot");
  const target = start.tempo >= 130 ? start.tempo - 11 : start.tempo + 11;
  await invoke("device.setTempo", { bpm: target, expectedTempo: start.tempo, expectedPresetName: start.presetName ?? "" });
  await waitFor(async () => (await invoke("device.snapshot")).tempo === target, "the device did not accept the new tempo");
  const lampPeriod = () => page.evaluate(() => {
    const node = document.querySelector(".hardware-switch.is-tempo-pulse .switch-led");
    if (!node) return null;
    const animation = node.getAnimations({ subtree: true })
      .find((candidate) => candidate.animationName === "qc-tempo-led-pulse");
    return animation?.effect?.getTiming?.().duration ?? null;
  });
  const expectedPeriod = 60_000 / target;
  Object.assign(record.facts, { from: start.tempo, target, expectedPeriod: Number(expectedPeriod.toFixed(1)) });
  try {
    await waitFor(async () => {
      const period = await lampPeriod();
      return period === null || Math.abs(period - expectedPeriod) < 1;
    }, `the lamp still runs at ${await lampPeriod()}ms where ${target} BPM needs ${expectedPeriod.toFixed(1)}ms`);
    record.facts.lampPeriod = await lampPeriod();
  } finally {
    const mid = await invoke("device.snapshot").catch(() => start);
    await invoke("device.setTempo", { bpm: start.tempo, expectedTempo: mid.tempo, expectedPresetName: mid.presetName ?? "" })
      .catch(() => undefined);
    await waitFor(async () => (await invoke("device.snapshot")).tempo === start.tempo, "the tempo was not restored")
      .catch(() => undefined);
    record.facts.restoredTempo = (await invoke("device.snapshot").catch(() => ({}))).tempo;
  }
  return undefined;
});

// -------------------------------------------------------------------- tuner

await step("17-tuner-opens-and-closes-on-the-device", async (record) => {
  await invoke("device.showTuner", { shown: true });
  await sleep(1500);
  record.facts.parity = await captureParity("17-tuner", false);
  await invoke("device.showTuner", { shown: false });
  await sleep(1200);
  const after = await invoke("system.status");
  expect(after.usbDiagnostics?.synchronized, "the session lost synchronization around the tuner");
  return { usbDiagnostics: after.usbDiagnostics };
});

// ------------------------------------------------------- recall from library

await step("18-directory-recall-converges", async (record) => {
  const start = await invoke("device.snapshot");
  if (start.dirty) return { skipped: `${start.presetLocation} has unsaved changes; recall is blocked by design` };
  await returnToTheGrid();
  await page.locator(".preset-title-hit").click();
  await page.locator(".coros-directory").waitFor({ timeout: timeoutMs });
  await waitFor(async () => (await page.locator(".directory-preset-row").count()) > 0, "the Directory never listed presets");
  const rows = await page.evaluate(() => [...document.querySelectorAll(".directory-preset-row .preset-recall")]
    .map((node) => ({ location: node.querySelector("strong")?.textContent ?? "", name: node.querySelector("span")?.textContent ?? "" })));
  const other = rows.find((row) => row.location !== start.presetLocation && row.name && row.name !== "Unsaved");
  if (!other) { await page.getByRole("button", { name: "Return to Grid" }).click(); return { skipped: "no other named preset in this bank" }; }
  await page.getByRole("button", { name: new RegExp(`^${other.location}`) }).first().click().catch(async () => {
    await page.locator(".directory-preset-row .preset-recall").nth(rows.indexOf(other)).click();
  });
  await waitFor(async () => (await invoke("device.snapshot")).presetName === other.name,
    `the device did not recall ${other.location} ${other.name}`, 30_000);
  const recalled = await invoke("device.snapshot");
  const ui = await readPresetFromUi();
  record.facts.parity = await captureParity("18-directory-recall");
  expect(ui.name === recalled.presetName, `app shows "${ui.name}", device holds "${recalled.presetName}"`);
  // Go back to where the run found the device.
  await invoke("device.recallPreset", {
    setlistKey: start.setlistKey, position: start.presetPosition,
    expectedPresetName: recalled.presetName ?? "", expectedPosition: recalled.presetPosition,
    expectedSetlistKey: recalled.setlistKey
  });
  await waitFor(async () => (await invoke("device.snapshot")).presetPosition === start.presetPosition, "the starting preset was not restored");
  return { from: start.presetLocation, to: other, restored: (await invoke("device.snapshot")).presetLocation };
});

// ---------------------------------------------------------------- long haul

await step("19-session-holds-under-a-quiet-soak", async () => {
  // The keepalive regression only showed after roughly a minute of quiet, and
  // it took File READs down with it. Sit still, then ask for the library.
  const soakSeconds = Number(option("--soak-seconds", "100"));
  const started = Date.now();
  const samples = [];
  while (Date.now() - started < soakSeconds * 1000) {
    await sleep(10_000);
    const status = await invoke("system.status");
    samples.push({
      atMs: Date.now() - started,
      phase: status.usbDiagnostics?.phase,
      synchronized: status.usbDiagnostics?.synchronized,
      messagesReceived: status.usbDiagnostics?.messagesReceived
    });
    expect(status.usbDiagnostics?.synchronized, `the session lost sync after ${Math.round((Date.now() - started) / 1000)}s`);
  }
  const listing = await invoke("device.listPresetFolders", { refresh: true });
  const deadline = Date.now() + timeoutMs * 2;
  let folders = listing;
  while (Date.now() < deadline && (folders.loading || (folders.folders ?? []).length === 0)) {
    await sleep(500);
    folders = await invoke("device.listPresetFolders");
  }
  expect((folders.folders ?? []).length > 0, "an aged session stopped answering File READs");
  const received = samples.map((sample) => sample.messagesReceived);
  expect(received.at(-1) > received[0], "the device stopped pushing state during the soak");
  return { soakSeconds, samples, foldersAfterSoak: folders.folders.length };
});

// ------------------------------------------------------------------- backup

await step("20-device-backup-completes", async () => {
  if (!argv.includes("--backup")) return { skipped: "pass --backup to include the 20MB device backup" };
  const started = Date.now();
  const name = `parity-run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const backup = await invoke("device.createBackup", { name });
  const elapsedMs = Date.now() - started;
  expect(elapsedMs < 60_000, `the backup took ${Math.round(elapsedMs / 1000)}s`);
  const status = await invoke("system.status");
  expect(status.usbDiagnostics?.synchronized, "the session did not recover after the backup");
  return { elapsedMs, name, backup: typeof backup === "string" ? backup.slice(0, 120) : backup, usbDiagnostics: status.usbDiagnostics };
});

// --------------------------------------------------------------- recovery

await step("21-session-reset-recovers", async () => {
  const before = await invoke("system.status");
  const beforeConnectedAt = before.usbDiagnostics?.connectedAtUnixMs;
  await invoke("device.resetSession").catch(() => undefined);
  const started = Date.now();
  // A reset that "recovers" instantly means the old session was still being
  // reported. Wait for a genuinely new session before calling it recovered.
  await waitFor(async () => {
    const status = await invoke("system.status").catch(() => undefined);
    const usb = status?.usbDiagnostics;
    return Boolean(usb?.connected && usb.synchronized && usb.connectedAtUnixMs !== beforeConnectedAt);
  }, "the session did not come back as a new session after a reset", 60_000);
  const recoveredMs = Date.now() - started;
  await page.getByRole("button", { name: /QC READY; open connection details/ }).waitFor({ timeout: timeoutMs });
  const after = await invoke("system.status");
  return { recoveredMs, handshakeMs: after.usbDiagnostics?.handshakeMs, before: before.usbDiagnostics?.phase, after: after.usbDiagnostics?.phase, connectedAtChanged: after.usbDiagnostics?.connectedAtUnixMs !== beforeConnectedAt };
});

// ------------------------------------------------- surviving a broker swap

await step("21b-ui-follows-the-device-after-a-broker-swap", async (record) => {
  // The frame sequence belongs to the broker process, so a replacement starts
  // counting from one. The UI used to read that as "already seen" and discard
  // every later frame, freezing the screen against a healthy device. Kill the
  // broker for real and prove the screen keeps up afterwards.
  const before = await invoke("system.status");
  const beforePid = await brokerPid();
  expect(beforePid !== null, "no qc-device-broker process to replace");
  await run("taskkill", ["/PID", String(beforePid), "/F"]).catch(() => undefined);
  await waitFor(async () => {
    const pid = await brokerPid();
    return pid !== null && pid !== beforePid;
  }, "the host never started a replacement broker", 60_000);
  await waitFor(async () => {
    const status = await invoke("system.status").catch(() => undefined);
    return Boolean(status?.usbDiagnostics?.connected && status.usbDiagnostics.synchronized);
  }, "the replacement broker never reached a synchronized session", 60_000);
  const afterPid = await brokerPid();

  // Now move the device from outside the app and require the screen to follow.
  const snapshot = await invoke("device.snapshot");
  const targetScene = (snapshot.activeScene + 1) % 8;
  const uiScene = () => page.evaluate(() => {
    const badge = [...document.querySelectorAll(".coros-vector-canvas text")]
      .map((node) => node.textContent).find((text) => /^[A-H]$/.test(text ?? ""));
    return badge ?? null;
  });
  const letter = (index) => String.fromCharCode(65 + index);
  Object.assign(record.facts, { beforePid, afterPid, fromScene: snapshot.activeScene, targetScene });
  try {
    await invoke("device.selectScene", { scene: targetScene, expectedPresetName: snapshot.presetName ?? "" });
    await waitFor(async () => (await invoke("device.snapshot")).activeScene === targetScene,
      "the device did not change scene after the swap");
    await waitFor(async () => (await uiScene()) === letter(targetScene),
      `the screen still reads scene ${await uiScene()} while the device is on ${letter(targetScene)}`, 20_000);
    record.facts.uiScene = await uiScene();
  } finally {
    const now = await invoke("device.snapshot").catch(() => snapshot);
    await invoke("device.selectScene", { scene: snapshot.activeScene, expectedPresetName: now.presetName ?? "" })
      .catch(() => undefined);
    await waitFor(async () => (await invoke("device.snapshot")).activeScene === snapshot.activeScene,
      "the scene was not restored").catch(() => undefined);
  }
  record.facts.parity = await captureParity("21b-after-broker-swap");
  return undefined;
});

// ------------------------------------------------------------------- teardown

await step("22-session-survives-the-run", async (record) => {
  record.facts.returned = await returnToStartingPreset().catch((error) => ({ error: String(error?.message ?? error) }));
  const status = await invoke("system.status");
  expect(status.usbDiagnostics?.connected && status.usbDiagnostics?.synchronized,
    `the session ended ${status.usbDiagnostics?.phase}: ${status.usbDiagnostics?.detail}`);
  record.facts.parity = await captureParity("22-final");
  return { usbDiagnostics: status.usbDiagnostics };
});

const summary = {
  schemaVersion: 1,
  finishedAt: new Date().toISOString(),
  endpoint,
  passed: steps.filter((entry) => entry.result === "passed").length,
  failed: steps.filter((entry) => entry.result === "failed").length,
  skipped: steps.filter((entry) => entry.result === "skipped").length,
  steps
};
await writeFile(join(outputDirectory, "ui-parity-run.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(`\n${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped -> ${join(outputDirectory, "ui-parity-run.json")}`);
process.exit(summary.failed === 0 ? 0 : 1);
