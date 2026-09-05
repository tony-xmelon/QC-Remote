#!/usr/bin/env node
import { connectCdpPage } from "./cdp-page-client.mjs";

const page = await connectCdpPage(process.argv[2] ?? "http://127.0.0.1:9223");
const setlistKey = process.argv[3] ?? "/media/p4/Presets/My Presets";
const invoke = (method, params = {}) => page.evaluate(
  `window.__TAURI_INTERNALS__.invoke("gateway_invoke", { method: ${JSON.stringify(method)}, params: ${JSON.stringify(params)} })`
);
try {
  let value = await invoke("device.listPresets", { setlistKey, refresh: true });
  for (let attempt = 0; value.loading && attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    value = await invoke("device.listPresets", { setlistKey, refresh: false });
  }
  console.log(JSON.stringify({
    loading: value.loading,
    slots: value.presets?.filter((entry) => entry.position >= 28 && entry.position <= 33),
    testNames: value.presets?.filter((entry) => /QC-MCP-TEST/i.test(entry.name))
  }, null, 2));
} finally {
  page.close();
}
