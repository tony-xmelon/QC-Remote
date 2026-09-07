import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [serial, sessionPath, portArgument = "9226"] = process.argv.slice(2);
if (!serial || !sessionPath) {
  throw new Error("Usage: node tools/pair-android-relay-adb.mjs <adb-serial> <relay-session-json> [local-port]");
}
const session = JSON.parse(readFileSync(sessionPath, "utf8"));
if (typeof session.publicUrl !== "string" || typeof session.pairingCode !== "string") {
  throw new Error("Relay session JSON does not contain publicUrl and pairingCode.");
}
const port = Number.parseInt(portArgument, 10);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("local-port must be between 1024 and 65535");
}

function adb(...args) {
  const result = spawnSync("adb", ["-s", serial, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `adb ${args.join(" ")} failed`);
  return result.stdout.trim();
}

let nextId = 1;
const pending = new Map();
function cdp(socket, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, 30_000);
    pending.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else resolve(message.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

let forwarded = false;
let socket;
try {
  const pid = adb("shell", "pidof", "com.qccontrol.mobile").split(/\s+/)[0];
  if (!/^\d+$/.test(pid)) throw new Error("QC Remote is not running on the Android device");
  adb("forward", `tcp:${port}`, `localabstract:webview_devtools_remote_${pid}`);
  forwarded = true;
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const target = targets.find((candidate) =>
    candidate.type === "page" && candidate.url?.startsWith("https://localhost/"));
  if (!target?.webSocketDebuggerUrl) throw new Error("QC app WebView target was not found");

  socket = new WebSocket(target.webSocketDebuggerUrl);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id === undefined) return;
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("could not connect to the Android WebView debugger")), { once: true });
  });

  const options = {
    endpoint: session.publicUrl,
    pairingCode: session.pairingCode,
    deviceName: "QC Remote on Android",
  };
  const evaluated = await cdp(socket, "Runtime.evaluate", {
    expression: `(async () => {
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
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (evaluated.exceptionDetails) {
    throw new Error(evaluated.exceptionDetails.exception?.description || evaluated.exceptionDetails.text);
  }
  const payload = evaluated.result?.value;
  if (payload?.error) throw new Error(`Android relay pairing failed: ${JSON.stringify(payload.error)}`);
  if (!payload?.paired) throw new Error(`Android relay did not report paired: ${JSON.stringify(payload)}`);
  console.log(JSON.stringify(payload));
} finally {
  socket?.close();
  if (forwarded) {
    try { adb("forward", "--remove", `tcp:${port}`); } catch {}
  }
}
