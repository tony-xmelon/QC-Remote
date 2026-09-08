import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateQcAndroid, parseLocalPort } from "./android-webview-adb.mjs";

const args = process.argv.slice(2);
const serial = args.shift();
if (!serial) {
  throw new Error("Usage: node tools/probe-android-usb-adb.mjs <adb-serial> [--connect] [--output <json>] [--port <port>]");
}
let connect = false;
let output;
let port = 9227;
while (args.length) {
  const argument = args.shift();
  if (argument === "--connect") connect = true;
  else if (argument === "--output") {
    const value = args.shift();
    if (!value) throw new Error("--output requires a path");
    output = resolve(value);
  } else if (argument === "--port") {
    const value = args.shift();
    if (!value) throw new Error("--port requires a value");
    port = parseLocalPort(value);
  }
  else throw new Error(`Unknown argument: ${argument}`);
}
if (connect && process.env.QC_ANDROID_USB_HANDSHAKE_ACK !== "I_ACCEPT_QC_USB_HANDSHAKE") {
  throw new Error("--connect requires QC_ANDROID_USB_HANDSHAKE_ACK=I_ACCEPT_QC_USB_HANDSHAKE");
}

const payload = await evaluateQcAndroid(serial, port, `(async () => {
  const plugin = globalThis.Capacitor?.Plugins?.QcUsb;
  if (!plugin) throw new Error("QcUsb Capacitor plugin is unavailable");
  const scan = await plugin.scan();
  const before = await plugin.diagnostics();
  if (!${JSON.stringify(connect)}) return { mode: "status", scan, before };
  if (before.connected) throw new Error("Refusing handshake probe because a USB session is already active");
  if (!Array.isArray(scan.devices) || scan.devices.length !== 1) {
    throw new Error("Handshake probe requires exactly one attached Quad Cortex");
  }
  let connected;
  let after;
  try {
    connected = await plugin.connect();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    after = await plugin.diagnostics();
    return { mode: "connect-once", scan, before, connected, after };
  } finally {
    await plugin.disconnect().catch(() => undefined);
  }
})()`, 60_000);

const finalDiagnostics = connect
  ? await evaluateQcAndroid(serial, port, `(async () => {
      const plugin = globalThis.Capacitor?.Plugins?.QcUsb;
      if (!plugin) throw new Error("QcUsb Capacitor plugin is unavailable");
      return plugin.diagnostics();
    })()`, 30_000)
  : undefined;

const document = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  ...payload,
  ...(finalDiagnostics === undefined ? {} : { final: finalDiagnostics }),
};
const json = JSON.stringify(document, null, 2);
if (output) writeFileSync(output, `${json}\n`);
console.log(json);
