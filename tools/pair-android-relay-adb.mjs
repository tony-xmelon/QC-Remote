import { readFileSync } from "node:fs";
import { evaluateQcAndroid, parseLocalPort } from "./android-webview-adb.mjs";

const [serial, sessionPath, portArgument = "9226"] = process.argv.slice(2);
if (!serial || !sessionPath) {
  throw new Error("Usage: node tools/pair-android-relay-adb.mjs <adb-serial> <relay-session-json> [local-port]");
}
const session = JSON.parse(readFileSync(sessionPath, "utf8"));
if (typeof session.publicUrl !== "string" || typeof session.pairingCode !== "string") {
  throw new Error("Relay session JSON does not contain publicUrl and pairingCode.");
}
const port = parseLocalPort(portArgument);
const options = {
  endpoint: session.publicUrl,
  pairingCode: session.pairingCode,
  deviceName: "QC Remote on Android",
};

const payload = await evaluateQcAndroid(serial, port, `(async () => {
  const plugin = globalThis.Capacitor?.Plugins?.QcRelay;
  if (!plugin) throw new Error("QcRelay Capacitor plugin is unavailable");
  try {
    const before = await plugin.status();
    if (before.paired === true) await plugin.start();
    else await plugin.pair(${JSON.stringify(options)});
    const status = await plugin.status();
    return { paired: status.paired === true, state: status.state, accessMode: status.accessMode };
  } catch (error) {
    return { error: { code: error?.code, message: error?.message ?? String(error) } };
  }
})()`);
if (payload?.error) throw new Error(`Android relay pairing failed: ${JSON.stringify(payload.error)}`);
if (!payload?.paired) throw new Error(`Android relay did not report paired: ${JSON.stringify(payload)}`);
console.log(JSON.stringify(payload));
