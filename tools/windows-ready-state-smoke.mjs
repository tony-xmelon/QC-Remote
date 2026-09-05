#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { connectCdpPage } from "./cdp-page-client.mjs";

const argv = process.argv.slice(2);
const option = (name) => {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
};
const endpoint = option("--endpoint") ?? "http://127.0.0.1:9223";
const output = option("--output") ?? "artifacts/hardware-conformance/windows-ready-state-smoke.json";
const artifactDirectory = dirname(output);
const acknowledgement = "I_ACCEPT_QC_HARDWARE_MUTATIONS";
if (process.env.QC_HARDWARE_TEST_ACK !== acknowledgement) {
  throw new Error(`Set QC_HARDWARE_TEST_ACK=${acknowledgement} before changing the physical QC session.`);
}

await mkdir(artifactDirectory, { recursive: true });
const page = await connectCdpPage(endpoint);
const js = (value) => JSON.stringify(value);
const invoke = (method, params = {}) => page.evaluate(
  `window.__TAURI_INTERNALS__.invoke("gateway_invoke", { method: ${js(method)}, params: ${js(params)} })`
);
const visibleState = () => page.evaluate(`(() => ({
  badge: document.querySelector(".connection-badge")?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
  badgeClass: document.querySelector(".connection-badge")?.className ?? "",
  qcDetail: [...document.querySelectorAll(".connection-panel dl > div")]
    .find((row) => row.querySelector("dt")?.textContent?.trim() === "Quad Cortex")
    ?.querySelector("dd")?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
  panelSummary: document.querySelector(".connection-panel > p")?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
  footer: document.querySelector(".status-strip")?.textContent?.replace(/\\s+/g, " ").trim() ?? ""
}))()`);
const clickButton = (text) => page.evaluate(`(() => {
  const expected = ${js(text)};
  const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.replace(/\\s+/g, " ").trim() === expected);
  if (!button) throw new Error("Button not found: " + expected);
  button.click();
  return true;
})()`);
const waitFor = async (expression, timeoutMs) => {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    if (await page.evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out after ${timeoutMs} ms waiting for ${expression}`);
};
const assertReady = async (requirePanel = false) => {
  const visible = await visibleState();
  const runtime = await invoke("system.status");
  if (visible.badge !== "QC READY" || !visible.badgeClass.includes("phase-ready")
    || (requirePanel && (visible.qcDetail !== "Live and synchronized" || visible.panelSummary !== "Live and synchronized"))
    || !visible.footer.includes("LIVE") || /not (?:synchronized|synced)|offline|disconnected/i.test(visible.footer)) {
    throw new Error(`Ready surfaces disagree: ${JSON.stringify(visible)}`);
  }
  if (!runtime.gatewayAvailable || runtime.usbDiagnostics?.phase !== "ready"
    || !runtime.usbDiagnostics?.connected || !runtime.usbDiagnostics?.synchronized) {
    throw new Error(`Ready badge lacks a synchronized live QC: ${JSON.stringify(runtime.usbDiagnostics)}`);
  }
  return { visible, runtime };
};

let needsReconnect = false;
const evidence = { schemaVersion: 1, startedAt: new Date().toISOString(), result: "pending" };
try {
  await waitFor(`document.querySelector(".connection-badge")?.textContent?.includes("QC READY")`, 10000);
  if (await page.evaluate(`Boolean(document.querySelector('.connection-panel'))`)) {
    await page.evaluate(`document.querySelector(".connection-badge")?.click()`);
  }
  evidence.before = await assertReady();
  await page.evaluate(`document.querySelector(".connection-badge")?.click()`);
  await waitFor(`Boolean(document.querySelector(".connection-panel"))`, 2000);
  evidence.beforePanel = await assertReady(true);
  const disconnectStarted = performance.now();
  await clickButton("Disconnect");
  needsReconnect = true;
  await waitFor(`(() => {
    const badge = document.querySelector(".connection-badge")?.textContent ?? "";
    const footer = document.querySelector(".status-strip")?.textContent ?? "";
    return !badge.includes("QC READY") && footer.includes("OFFLINE");
  })()`, 10000);
  evidence.offlineLatencyMs = Number((performance.now() - disconnectStarted).toFixed(1));
  evidence.disconnected = { visible: await visibleState(), runtime: await invoke("system.status") };
  await page.screenshot(join(artifactDirectory, "windows-ready-disconnected.png"));
  if (evidence.disconnected.visible.badge.includes("READY")
    || evidence.disconnected.visible.badgeClass.includes("phase-ready")
    || evidence.disconnected.visible.qcDetail !== "Disconnected"
    || evidence.disconnected.visible.footer.includes("LIVE")
    || /handshake complete|preset synchronized/i.test(evidence.disconnected.visible.footer)) {
    throw new Error(`A Ready surface remained green after disconnect: ${JSON.stringify(evidence.disconnected.visible)}`);
  }

  const reconnectStarted = performance.now();
  await clickButton("Connect");
  await waitFor(`document.querySelector(".connection-badge")?.textContent?.includes("QC READY")`, 60000);
  evidence.reconnectLatencyMs = Number((performance.now() - reconnectStarted).toFixed(1));
  evidence.reconnected = await assertReady(true);
  evidence.snapshot = await invoke("device.snapshot");
  await page.screenshot(join(artifactDirectory, "windows-ready-reconnected.png"));
  if (await page.evaluate(`Boolean(document.querySelector('.connection-panel'))`)) {
    await page.evaluate(`document.querySelector(".connection-badge")?.click()`);
  }
  needsReconnect = false;
  evidence.result = "passed";
} finally {
  if (needsReconnect) {
    const connectVisible = await page.evaluate(`
      [...document.querySelectorAll("button")]
        .some((button) => button.textContent?.replace(/\\s+/g, " ").trim() === "Connect")
    `).catch(() => false);
    if (connectVisible) {
      await clickButton("Connect").catch(() => undefined);
      await waitFor(`document.querySelector(".connection-badge")?.textContent?.includes("QC READY")`, 60000).catch(() => undefined);
    }
  }
  evidence.finishedAt = new Date().toISOString();
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  page.close();
}

console.log(JSON.stringify(evidence, null, 2));
