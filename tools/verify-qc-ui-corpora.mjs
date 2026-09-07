import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { classifyTree } from "./qc-tree-classifier.mjs";

const root = resolve(import.meta.dirname, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(payload) {
  return createHash("sha256").update(payload).digest("hex");
}

function pngDimensions(payload) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(payload.length >= 24 && payload.subarray(0, 8).equals(signature), "not a PNG");
  return [payload.readUInt32BE(16), payload.readUInt32BE(20)];
}

function verifyPngCorpus(relativePath) {
  const corpus = join(root, relativePath);
  const manifest = readJson(join(corpus, "manifest.json"));
  const ids = new Set();
  for (const capture of manifest.captures ?? []) {
    assert.ok(!ids.has(capture.id), `${capture.id}: duplicate id`);
    ids.add(capture.id);
    const payload = readFileSync(join(corpus, capture.image));
    const [width, height] = pngDimensions(payload);
    assert.equal(width, 800, `${capture.id}: expected width 800`);
    assert.equal(height, 480, `${capture.id}: expected height 480`);
    assert.equal(capture.sha256, sha256(payload), `${capture.id}: checksum mismatch`);
    assert.equal(capture.bytes, payload.length, `${capture.id}: byte count mismatch`);
    assert.equal(capture.width, width, `${capture.id}: stale width`);
    assert.equal(capture.height, height, `${capture.id}: stale height`);
    if (capture.graphicsTree) {
      const tree = readFileSync(join(corpus, capture.graphicsTree), "utf8");
      assert.equal(capture.screen, classifyTree(tree), `${capture.id}: stale screen classification`);
    }
  }
  console.log(`PASS ${ids.size} captures in ${basename(corpus)}; PNG geometry, checksums, and metadata match`);
}

function verifySvgCorpus(relativePath) {
  const corpus = join(root, relativePath);
  const manifest = readJson(join(corpus, "manifest.json"));
  const ids = new Set();
  const files = new Set(readdirSync(corpus).filter((name) => name.endsWith(".svg")));
  const manifestFiles = new Set();
  for (const asset of manifest.assets ?? []) {
    assert.ok(!ids.has(asset.id), `${asset.id}: duplicate id`);
    ids.add(asset.id);
    manifestFiles.add(asset.image);
    const payload = readFileSync(join(corpus, asset.image));
    assert.equal(asset.bytes, payload.length, `${asset.id}: byte count mismatch`);
    assert.equal(asset.sha256, sha256(payload), `${asset.id}: checksum mismatch`);
    const tag = payload.subarray(0, 2000).toString("utf8").match(/<svg\b[^>]*>/i)?.[0];
    assert.ok(tag, `${asset.id}: not an SVG`);
    assert.ok(tag.includes(`width="${asset.width}"`), `${asset.id}: width mismatch`);
    assert.ok(tag.includes(`height="${asset.height}"`), `${asset.id}: height mismatch`);
    assert.ok(tag.includes(`viewBox="${asset.viewBox}"`), `${asset.id}: viewBox mismatch`);
    assert.ok(asset.states?.length > 0, `${asset.id}: no canonical state mapping`);
  }
  assert.deepEqual([...files].sort(), [...manifestFiles].sort(), "manifest and SVG file set differ");
  console.log(`PASS ${ids.size} official SVG details; checksums, geometry, and state mappings match`);
}

verifyPngCorpus("references/qc-ui-corpus/coros-4.1.0");
verifyPngCorpus("references/qc-ui-official-manual/coros-4.1.0");
verifySvgCorpus("references/qc-ui-official-details/coros-4.1.0");
