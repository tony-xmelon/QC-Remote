import { evaluateQcAndroid, parseLocalPort } from "./android-webview-adb.mjs";

const [serial, portArgument = "9228"] = process.argv.slice(2);
if (!serial) {
  throw new Error("Usage: node tools/open-android-usb-session-adb.mjs <adb-serial> [local-port]");
}
if (process.env.QC_ANDROID_USB_SESSION_ACK !== "I_ACCEPT_QC_USB_SESSION") {
  throw new Error("Opening a persistent USB session requires QC_ANDROID_USB_SESSION_ACK=I_ACCEPT_QC_USB_SESSION");
}
const port = parseLocalPort(portArgument);

const payload = await evaluateQcAndroid(serial, port, `(async () => {
  const plugin = globalThis.Capacitor?.Plugins?.QcUsb;
  if (!plugin) throw new Error("QcUsb Capacitor plugin is unavailable");
  const before = await plugin.diagnostics();
  if (before.connected) return { alreadyConnected: true, before, after: before };
  const scan = await plugin.scan();
  if (!Array.isArray(scan.devices) || scan.devices.length !== 1) {
    throw new Error("Persistent session requires exactly one attached Quad Cortex");
  }
  try {
    const opened = await plugin.connect();
    const deadline = Date.now() + 35000;
    let after = await plugin.diagnostics();
    while (!(after.connected && after.setlistKnown && after.presetPosition >= 0) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      after = await plugin.diagnostics();
    }
    if (!(after.connected && after.setlistKnown && after.presetPosition >= 0)) {
      throw new Error("Quad Cortex did not reach authoritative ready state within 35 seconds");
    }
    return { alreadyConnected: false, scan, before, opened, after };
  } catch (error) {
    await plugin.disconnect().catch(() => undefined);
    throw error;
  }
})()`, 45_000);

console.log(JSON.stringify(payload));
