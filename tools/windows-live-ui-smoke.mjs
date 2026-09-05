#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const playwrightModule = process.env.CODEX_WORKSPACE_NODE_MODULES
  ? pathToFileURL(join(process.env.CODEX_WORKSPACE_NODE_MODULES, "playwright", "index.mjs")).href
  : "playwright";
const { chromium } = await import(playwrightModule);

const argv = process.argv.slice(2);
const option = (name) => {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
};
const endpoint = option("--endpoint") ?? "http://127.0.0.1:9223";
const output = option("--output");
const timeoutMs = Number(option("--timeout-ms") ?? 5000);
const acknowledgement = "I_ACCEPT_QC_HARDWARE_MUTATIONS";

if (process.env.QC_HARDWARE_TEST_ACK !== acknowledgement) {
  throw new Error(`Set QC_HARDWARE_TEST_ACK=${acknowledgement} before running the physical UI smoke test.`);
}
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
  throw new Error("--timeout-ms must be at least 1000.");
}

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
const slider = page.getByRole("slider", { name: "Master volume knob" });
const observedVolume = () => page.evaluate(async () => ({
  gateway: (await window.__TAURI_INTERNALS__.invoke("gateway_invoke", {
    method: "device.masterVolume",
    params: {}
  })).value,
  ui: Number(document.querySelector('[aria-label="Master volume knob"]')?.getAttribute("aria-valuenow"))
}));
const waitForVolume = (expected) => page.waitForFunction(async (value) => {
  const ui = Number(document.querySelector('[aria-label="Master volume knob"]')?.getAttribute("aria-valuenow"));
  const gateway = (await window.__TAURI_INTERNALS__.invoke("gateway_invoke", {
    method: "device.masterVolume",
    params: {}
  })).value;
  return ui === value && gateway === value;
}, expected, { timeout: timeoutMs, polling: 25 });

const startedAt = new Date().toISOString();
let original;
let restoration;
try {
  await page.getByRole("button", { name: /QC READY; open connection details/ }).waitFor({ timeout: timeoutMs });
  const statusBefore = await invoke("system.status");
  if (!statusBefore.usbDiagnostics?.connected || !statusBefore.usbDiagnostics?.synchronized) {
    throw new Error("The Windows app does not have a synchronized Quad Cortex session.");
  }
  const initial = await observedVolume();
  if (!Number.isInteger(initial.gateway) || initial.gateway !== initial.ui) {
    throw new Error(`Initial Master Volume disagrees between gateway (${initial.gateway}) and UI (${initial.ui}).`);
  }
  original = initial.gateway;
  const increase = original < 100;
  const target = original + (increase ? 1 : -1);
  const changeKey = increase ? "ArrowUp" : "ArrowDown";
  const restoreKey = increase ? "ArrowDown" : "ArrowUp";

  await slider.focus();
  const changeStarted = performance.now();
  await slider.press(changeKey);
  await waitForVolume(target);
  const changeConverged = performance.now();
  await slider.press(restoreKey);
  await waitForVolume(original);
  const restorationConverged = performance.now();
  restoration = await observedVolume();
  const statusAfter = await invoke("system.status");
  const evidence = {
    schemaVersion: 1,
    startedAt,
    finishedAt: new Date().toISOString(),
    platform: "windows",
    appTitle: await page.title(),
    pageUrl: page.url(),
    result: "passed",
    control: "master-volume",
    original,
    target,
    restoration,
    changeConvergenceMs: Number((changeConverged - changeStarted).toFixed(1)),
    restorationConvergenceMs: Number((restorationConverged - changeConverged).toFixed(1)),
    usbDiagnostics: statusAfter.usbDiagnostics
  };
  if (output) await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  if (Number.isInteger(original) && (restoration?.gateway !== original || restoration?.ui !== original)) {
    const current = await invoke("device.masterVolume").catch(() => undefined);
    if (Number.isInteger(current?.value) && current.value !== original) {
      await invoke("device.setMasterVolume", { value: original, expectedValue: current.value }).catch(() => undefined);
    }
  }
}
