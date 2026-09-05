#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const argv = process.argv.slice(2);
const option = (name) => {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
};
const output = resolve(option("--output") ?? "artifacts/hardware-fixtures/QC-MCP-TEST-IR.wav");
const sampleRate = 48_000;
const sampleCount = 1_024;
const channelCount = 1;
const bitsPerSample = 24;
const bytesPerSample = bitsPerSample / 8;
const dataSize = sampleCount * channelCount * bytesPerSample;
const wav = Buffer.alloc(44 + dataSize);

wav.write("RIFF", 0, "ascii");
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVE", 8, "ascii");
wav.write("fmt ", 12, "ascii");
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); // Integer PCM.
wav.writeUInt16LE(channelCount, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
wav.writeUInt16LE(channelCount * bytesPerSample, 32);
wav.writeUInt16LE(bitsPerSample, 34);
wav.write("data", 36, "ascii");
wav.writeUInt32LE(dataSize, 40);

// A short, deterministic, low-level decay is enough to exercise IR library
// ingestion without embedding third-party audio or producing a loud test file.
let state = 0x51434d43;
for (let index = 0; index < sampleCount; index += 1) {
  state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
  const noise = (state / 0xffff_ffff) * 2 - 1;
  const amplitude = index === 0 ? 0.25 : noise * 0.035 * Math.exp(-index / 120);
  const sample = Math.max(-8_388_608, Math.min(8_388_607, Math.round(amplitude * 8_388_607)));
  wav.writeUIntLE(sample < 0 ? sample + 0x1_000_000 : sample, 44 + index * bytesPerSample, bytesPerSample);
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, wav);
console.log(JSON.stringify({
  output,
  format: "PCM",
  channels: channelCount,
  sampleRate,
  bitsPerSample,
  sampleCount,
  durationMs: Number((sampleCount / sampleRate * 1000).toFixed(3)),
  bytes: wav.length,
  sha256: createHash("sha256").update(wav).digest("hex")
}, null, 2));
