import { spawnSync } from "node:child_process";

export function adb(serial, ...args) {
  const result = spawnSync("adb", ["-s", serial, ...args], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `adb ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

export function parseLocalPort(value) {
  if (!/^\d+$/.test(String(value))) {
    throw new Error("local-port must be between 1024 and 65535");
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("local-port must be between 1024 and 65535");
  }
  return port;
}

export async function withQcAndroidWebView(serial, port, action, timeoutMs = 30_000) {
  const pid = adb(serial, "shell", "pidof", "com.qccontrol.mobile").split(/\s+/)[0];
  if (!/^\d+$/.test(pid)) throw new Error("QC Remote is not running on the Android device");
  const forwarding = `tcp:${port}`;
  let socket;
  try {
    adb(serial, "forward", forwarding, `localabstract:webview_devtools_remote_${pid}`);
    const response = await fetch(`http://127.0.0.1:${port}/json`, {
      signal: AbortSignal.timeout(Math.min(timeoutMs, 30_000)),
    });
    if (!response.ok) throw new Error(`Android WebView target discovery returned HTTP ${response.status}`);
    const targets = await response.json();
    if (!Array.isArray(targets)) throw new Error("Android WebView target discovery returned an invalid response");
    const target = targets.find((candidate) =>
      candidate.type === "page" && candidate.url?.startsWith("https://localhost/"));
    if (!target?.webSocketDebuggerUrl) throw new Error("QC app WebView target was not found");

    socket = new WebSocket(target.webSocketDebuggerUrl);
    const pending = new Map();
    let nextId = 1;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id === undefined) return;
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (!request) return;
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`));
      else request.resolve(message.result);
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Android WebView debugger connection timed out")), Math.min(timeoutMs, 30_000));
      socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      socket.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("could not connect to the Android WebView debugger"));
      }, { once: true });
    });

    const failPending = () => {
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error(`${request.method}: Android WebView debugger disconnected`));
      }
      pending.clear();
    };
    socket.addEventListener("close", failPending);
    socket.addEventListener("error", failPending);

    const cdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      pending.set(id, { method, resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
    return await action({ cdp, pid });
  } finally {
    socket?.close();
    try { adb(serial, "forward", "--remove", forwarding); } catch {}
  }
}

export async function evaluateQcAndroid(serial, port, expression, timeoutMs) {
  return withQcAndroidWebView(serial, port, async ({ cdp }) => {
    const evaluated = await cdp("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (evaluated.exceptionDetails) {
      throw new Error(evaluated.exceptionDetails.exception?.description || evaluated.exceptionDetails.text);
    }
    return evaluated.result?.value;
  }, timeoutMs);
}
