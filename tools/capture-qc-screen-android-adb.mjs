import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { evaluateQcAndroid, parseLocalPort } from "./android-webview-adb.mjs";

const [serial, outputArgument, portArgument = "9223", ...flags] = process.argv.slice(2);
if (!serial || !outputArgument) {
  throw new Error("Usage: capture-qc-screen-android-adb.mjs <adb-serial> <output.png> [local-port]");
}

const port = parseLocalPort(portArgument);
const output = resolve(outputArgument);
const payload = await evaluateQcAndroid(serial, port, `(async () => {
  const plugin = globalThis.Capacitor?.Plugins?.QcUsb;
  if (!plugin) throw new Error("QcUsb Capacitor plugin is unavailable");
  const before = await plugin.diagnostics();
  try {
    const reconnect = ${JSON.stringify(flags.includes("--reconnect"))}
      ? await plugin.gatewayInvoke({ method: "device.reconnect", params: {} })
      : null;
    const image = await plugin.gatewayInvoke({ method: "device.captureScreen", params: {} });
    return { image, reconnect, before, after: await plugin.diagnostics() };
  } catch (error) {
    return {
      error: { code: error?.code, message: error?.message ?? String(error) },
      before,
      after: await plugin.diagnostics(),
    };
  }
})()`, 180_000);

if (payload?.error) throw new Error(`Android QC capture failed: ${JSON.stringify(payload)}`);
const image = payload?.image;
if (image?.width !== 800 || image?.height !== 480 || typeof image?.pngBase64 !== "string") {
  throw new Error(`Android returned an invalid framebuffer result: ${JSON.stringify(image)}`);
}

const png = Buffer.from(image.pngBase64, "base64");
if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
  throw new Error("Android framebuffer has an invalid PNG signature");
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, png);
console.log(JSON.stringify({
  output,
  width: image.width,
  height: image.height,
  bytes: png.length,
  transport: "android-adb-webview",
  diagnostics: payload.after,
}));
