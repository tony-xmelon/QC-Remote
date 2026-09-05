#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { connectCdpPage } from "./cdp-page-client.mjs";

const argv = process.argv.slice(2);
const option = (name) => {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
};
const endpoint = option("--endpoint") ?? "http://127.0.0.1:9223";
const output = option("--output") ?? "artifacts/hardware-conformance/windows-app-current.png";
const stateOutput = option("--state-output") ?? output.replace(/\.png$/i, ".json");

await mkdir(dirname(output), { recursive: true });
await mkdir(dirname(stateOutput), { recursive: true });
const page = await connectCdpPage(endpoint);
await page.screenshot(output);
const state = await page.evaluate(`(async () => {
  const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\\s+/g, " ").trim() ?? null;
  const invoke = window.__TAURI_INTERNALS__?.invoke;
  const runtime = invoke
    ? await invoke("gateway_invoke", { method: "system.status", params: {} }).catch((error) => ({ error: String(error) }))
    : null;
  const snapshot = invoke
    ? await invoke("gateway_invoke", { method: "device.snapshot", params: {} }).catch((error) => ({ error: String(error) }))
    : null;
  return {
    capturedAt: new Date().toISOString(),
    title: document.title,
    url: location.href,
    connectionBadge: text(".connection-badge"),
    connectionPanel: text(".connection-panel"),
    footer: text(".status-strip"),
    presetTitle: text(".preset-name, .coros-preset-name"),
    runtime,
    snapshot
  };
})()`);
await writeFile(stateOutput, `${JSON.stringify(state, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, stateOutput, state }, null, 2));
page.close();
