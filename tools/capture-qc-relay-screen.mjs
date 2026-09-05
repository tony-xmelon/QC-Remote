#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const argv = process.argv.slice(2);
const option = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};
const has = (name) => argv.includes(name);

const sessionPath = resolve(option("--session") ?? "tmp/android-relay-session.json");
const outputPath = resolve(option("--output") ?? ".artifacts/qc-relay-screen.png");
const tapValue = option("--tap");
const waitMs = Number(option("--wait-ms") ?? 350);

if (has("--help")) {
  console.log("Usage: node tools/capture-qc-relay-screen.mjs [--session FILE] [--output PNG] [--tap X,Y] [--wait-ms MS]");
  process.exit(0);
}

if (!Number.isFinite(waitMs) || waitMs < 0 || waitMs > 10_000) {
  throw new Error("--wait-ms must be between 0 and 10000");
}

let tap;
if (tapValue !== undefined) {
  const match = /^(\d+),(\d+)$/.exec(tapValue);
  if (!match) throw new Error("--tap must use X,Y integer coordinates");
  tap = { x: Number(match[1]), y: Number(match[2]) };
  if (tap.x > 799 || tap.y > 479) throw new Error("--tap must remain inside the 800x480 framebuffer");
}

const session = JSON.parse(await readFile(sessionPath, "utf8"));
if (typeof session.mcpEndpoint !== "string" || typeof session.bearerToken !== "string") {
  throw new Error("Relay session must contain mcpEndpoint and bearerToken");
}

let nextId = 1;
let mcpSessionId;
const protocolVersion = "2025-03-26";

async function post(method, params, notification = false) {
  const id = notification ? undefined : nextId++;
  const headers = {
    Authorization: `Bearer ${session.bearerToken}`,
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "MCP-Protocol-Version": protocolVersion,
  };
  if (mcpSessionId) headers["Mcp-Session-Id"] = mcpSessionId;
  const response = await fetch(session.mcpEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      ...(id === undefined ? {} : { id }),
      method,
      ...(params === undefined ? {} : { params }),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`MCP ${method} returned HTTP ${response.status}: ${await response.text()}`);
  mcpSessionId ??= response.headers.get("mcp-session-id") ?? undefined;
  if (notification) return undefined;
  const text = await response.text();
  const messages = response.headers.get("content-type")?.includes("text/event-stream")
    ? text.split(/\r?\n/).filter((line) => line.startsWith("data:") && line.slice(5).trim()).map((line) => JSON.parse(line.slice(5).trim()))
    : [JSON.parse(text)];
  const message = messages.find((candidate) => candidate.id === id) ?? messages.at(-1);
  if (message?.error) throw new Error(`${message.error.code}: ${message.error.message}`);
  return message?.result;
}

async function call(name, args = {}) {
  const result = await post("tools/call", { name, arguments: args });
  if (result?.isError) {
    throw new Error(result.content?.map((item) => item.text).filter(Boolean).join("\n") || `${name} failed`);
  }
  if (result?.structuredContent !== undefined) return result.structuredContent;
  const text = result?.content?.find((item) => item.type === "text")?.text;
  return text ? JSON.parse(text) : result;
}

try {
  await post("initialize", {
    protocolVersion,
    capabilities: {},
    clientInfo: { name: "qc-relay-corpus-capture", version: "1.0.0" },
  });
  await post("notifications/initialized", undefined, true);
  if (tap) {
    await call("tap_screen", tap);
    if (waitMs > 0) await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
  }
  const screen = await call("capture_screen");
  const png = Buffer.from(screen?.pngBase64 ?? "", "base64");
  if (screen?.width !== 800 || screen?.height !== 480 || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Relay did not return a valid 800x480 QC framebuffer");
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, png);
  console.log(JSON.stringify({ output: outputPath, width: screen.width, height: screen.height, bytes: png.length, tapped: tap ?? null }));
} finally {
  if (mcpSessionId) {
    await fetch(session.mcpEndpoint, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.bearerToken}`, "Mcp-Session-Id": mcpSessionId },
    }).catch(() => undefined);
  }
}
