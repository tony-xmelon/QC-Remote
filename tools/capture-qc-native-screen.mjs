#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const argv = process.argv.slice(2);
const option = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};

const brokerPath = resolve(option("--broker") ?? "services/device-broker/target/release/qc-device-broker.exe");
const outputPath = resolve(option("--output") ?? ".artifacts/qc-native-screen.png");
const tapValue = option("--tap");
const recallSetlist = option("--recall-setlist");
const recallPositionValue = option("--recall-position");
const reloadCurrent = argv.includes("--reload-current");
const waitMs = Number(option("--wait-ms") ?? 350);

if (argv.includes("--help")) {
  console.log("Usage: node tools/capture-qc-native-screen.mjs [--broker EXE] [--output PNG] [--tap X,Y] [--reload-current] [--recall-setlist KEY --recall-position N] [--wait-ms MS]");
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

let recall;
if (recallSetlist !== undefined || recallPositionValue !== undefined) {
  const position = Number(recallPositionValue);
  if (!recallSetlist || !Number.isInteger(position) || position < 0 || position > 255) {
    throw new Error("Preset recall requires --recall-setlist KEY and --recall-position 0..255");
  }
  recall = { setlistKey: recallSetlist, position };
}

const child = spawn(brokerPath, ["--stdio"], { stdio: ["pipe", "pipe", "inherit"] });
let nextId = 1;
let buffered = Buffer.alloc(0);
const pending = new Map();

child.stdout.on("data", (chunk) => {
  buffered = Buffer.concat([buffered, chunk]);
  while (buffered.length >= 4) {
    const length = buffered.readUInt32BE(0);
    if (buffered.length < length + 4) return;
    const message = JSON.parse(buffered.subarray(4, length + 4).toString("utf8"));
    buffered = buffered.subarray(length + 4);
    const waiter = pending.get(message.id);
    if (!waiter) continue;
    pending.delete(message.id);
    clearTimeout(waiter.timeout);
    message.error ? waiter.reject(new Error(`${message.error.code ?? "GATEWAY_ERROR"}: ${message.error.message}`)) : waiter.resolve(message.result);
  }
});

child.once("exit", (code) => {
  for (const waiter of pending.values()) {
    clearTimeout(waiter.timeout);
    waiter.reject(new Error(`QC broker exited with code ${code}`));
  }
  pending.clear();
});

function request(method, params = {}) {
  const id = nextId++;
  const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length);
  return new Promise((resolveRequest, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, 60_000);
    pending.set(id, { resolve: resolveRequest, reject, timeout });
    child.stdin.write(Buffer.concat([header, body]));
  });
}

try {
  const connection = await request("device.reconnect");
  if (connection?.phase !== "ready") throw new Error(`QC did not become ready: ${connection?.detail ?? "unknown state"}`);
  if (reloadCurrent) {
    const before = await request("device.snapshot");
    await request("device.reloadPreset", {
      expectedPresetName: before.presetName,
      expectedPosition: before.presetPosition,
    });
    if (waitMs > 0) await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
  }
  if (recall) {
    const before = await request("device.snapshot");
    if (before?.dirty) throw new Error("Refusing preset recall because the current preset is dirty");
    await request("device.recallPreset", {
      ...recall,
      expectedPresetName: before.presetName,
      expectedPosition: before.presetPosition,
      expectedSetlistKey: before.setlistKey,
    });
    if (waitMs > 0) await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
  }
  if (tap) {
    await request("device.tapScreen", tap);
    if (waitMs > 0) await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
  }
  const screen = await request("device.captureScreen");
  const png = Buffer.from(screen?.pngBase64 ?? "", "base64");
  if (screen?.width !== 800 || screen?.height !== 480 || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Native broker did not return a valid 800x480 QC framebuffer");
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, png);
  console.log(JSON.stringify({ output: outputPath, width: screen.width, height: screen.height, bytes: png.length, tapped: tap ?? null, recalled: recall ?? null }));
} finally {
  await request("device.disconnect").catch(() => undefined);
  child.stdin.end();
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    new Promise((resolveWait) => setTimeout(resolveWait, 2_000)),
  ]);
  if (child.exitCode === null) child.kill();
}
