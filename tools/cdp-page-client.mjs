import { writeFile } from "node:fs/promises";

export async function connectCdpPage(endpoint, urlPrefixes = ["http://tauri.localhost/", "http://127.0.0.1:1420/"]) {
  const targetsUrl = `${endpoint.replace(/\/$/, "")}/json/list`;
  const response = await fetch(targetsUrl);
  if (!response.ok) throw new Error(`CDP target discovery failed with HTTP ${response.status}.`);
  const targets = await response.json();
  const target = targets.find((candidate) => candidate.type === "page"
    && urlPrefixes.some((prefix) => candidate.url?.startsWith(prefix)));
  if (!target?.webSocketDebuggerUrl) throw new Error("A debuggable QC Remote WebView was not found.");

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP WebSocket connection failed.")), { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data));
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description
        ?? result.exceptionDetails.text
        ?? "WebView evaluation failed.");
    }
    return result.result?.value;
  };
  const screenshot = async (path) => {
    const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    await writeFile(path, Buffer.from(result.data, "base64"));
  };
  return {
    evaluate,
    screenshot,
    close: () => socket.close(),
    target
  };
}
