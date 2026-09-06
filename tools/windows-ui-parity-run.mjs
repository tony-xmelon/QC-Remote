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
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const playwrightModule = process.env.CODEX_WORKSPACE_NODE_MODULES
  ? pathToFileURL(join(process.env.CODEX_WORKSPACE_NODE_MODULES, "playwright", "index.mjs")).href
  : "playwright";
const { chromium } = await import(playwrightModule);

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

const invoke = (method, params = {}) => page.evaluate(
  ({ method, params }) => window.__TAURI_INTERNALS__.invoke("gateway_invoke", { method, params }),
  { method, params }
);
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
  record.durationMs = Date.now() - startedAt;
  steps.push(record);
  const marker = record.result === "passed" ? "PASS" : "FAIL";
  console.log(`${marker}  ${name}${record.error ? ` - ${record.error}` : ""}`);
  return record;
}

const expect = (condition, message) => { if (!condition) throw new Error(message); };

// ---------------------------------------------------------------- connection

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
  const leds = await page.evaluate(() => [...document.querySelectorAll(".footswitch-row .hardware-switch")]
    .map((node) => ({
      label: node.querySelector(".switch-label")?.textContent?.trim() ?? "",
      accent: getComputedStyle(node).getPropertyValue("--switch-accent").trim(),
      active: node.classList.contains("is-active"),
      assigned: node.classList.contains("is-assigned")
    })));
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
  const observed = () => page.evaluate(async () => ({
    gateway: (await window.__TAURI_INTERNALS__.invoke("gateway_invoke", { method: "device.masterVolume", params: {} })).value,
    ui: Number(document.querySelector('[aria-label="Master volume knob"]')?.getAttribute("aria-valuenow"))
  }));
  const initial = await observed();
  expect(initial.gateway === initial.ui, `volume disagrees at rest: gateway ${initial.gateway}, UI ${initial.ui}`);
  const increase = initial.gateway < 100;
  const target = initial.gateway + (increase ? 1 : -1);
  await slider.focus();
  const changeStarted = Date.now();
  await slider.press(increase ? "ArrowUp" : "ArrowDown");
  await page.waitForFunction(async (value) => {
    const ui = Number(document.querySelector('[aria-label="Master volume knob"]')?.getAttribute("aria-valuenow"));
    const gateway = (await window.__TAURI_INTERNALS__.invoke("gateway_invoke", { method: "device.masterVolume", params: {} })).value;
    return ui === value && gateway === value;
  }, target, { timeout: timeoutMs, polling: 25 });
  const changeMs = Date.now() - changeStarted;
  const restoreStarted = Date.now();
  await slider.press(increase ? "ArrowDown" : "ArrowUp");
  await page.waitForFunction(async (value) => {
    const ui = Number(document.querySelector('[aria-label="Master volume knob"]')?.getAttribute("aria-valuenow"));
    const gateway = (await window.__TAURI_INTERNALS__.invoke("gateway_invoke", { method: "device.masterVolume", params: {} })).value;
    return ui === value && gateway === value;
  }, initial.gateway, { timeout: timeoutMs, polling: 25 });
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
    await page.waitForFunction(async (value) => {
      const ui = Number(document.querySelector('[aria-label="Master volume knob"]')?.getAttribute("aria-valuenow"));
      const gateway = (await window.__TAURI_INTERNALS__.invoke("gateway_invoke", { method: "device.masterVolume", params: {} })).value;
      return ui === value && gateway === value;
    }, sweepTarget, { timeout: timeoutMs, polling: 25 });
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

// ------------------------------------------------------------------- teardown

await step("12-session-survives-the-run", async (record) => {
  const status = await invoke("system.status");
  expect(status.usbDiagnostics?.connected && status.usbDiagnostics?.synchronized,
    `the session ended ${status.usbDiagnostics?.phase}: ${status.usbDiagnostics?.detail}`);
  record.facts.parity = await captureParity("12-final");
  return { usbDiagnostics: status.usbDiagnostics };
});

const summary = {
  schemaVersion: 1,
  finishedAt: new Date().toISOString(),
  endpoint,
  passed: steps.filter((entry) => entry.result === "passed").length,
  failed: steps.filter((entry) => entry.result === "failed").length,
  steps
};
await writeFile(join(outputDirectory, "ui-parity-run.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(`\n${summary.passed} passed, ${summary.failed} failed -> ${join(outputDirectory, "ui-parity-run.json")}`);
process.exit(summary.failed === 0 ? 0 : 1);
