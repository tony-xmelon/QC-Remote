import { evaluateQcAndroid, parseLocalPort } from "./android-webview-adb.mjs";

const [serial, method, paramsArgument = "{}", portArgument = "9225"] = process.argv.slice(2);
if (!serial || !method) {
  throw new Error("Usage: node tools/invoke-android-gateway-adb.mjs <adb-serial> <gateway-method> [params-json] [local-port]");
}
if (!/^(device|system)\.[A-Za-z0-9]+$/.test(method)) throw new Error("Invalid gateway method.");
const params = JSON.parse(paramsArgument);
const port = parseLocalPort(portArgument);

const payload = await evaluateQcAndroid(serial, port, `(async () => {
  const plugin = globalThis.Capacitor?.Plugins?.QcUsb;
  if (!plugin) throw new Error("QcUsb Capacitor plugin is unavailable");
  const before = await plugin.diagnostics();
  try {
    const result = await plugin.gatewayInvoke(${JSON.stringify({ method, params })});
    return { result, before, after: await plugin.diagnostics() };
  } catch (error) {
    return { error: { code: error?.code, message: error?.message ?? String(error) }, before, after: await plugin.diagnostics() };
  }
})()`, 180_000);
if (payload?.error) throw new Error(`Android gateway call failed: ${JSON.stringify(payload)}`);
console.log(JSON.stringify(payload));
