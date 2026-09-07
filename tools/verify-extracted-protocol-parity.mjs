import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(root, "contracts/extracted-protocol-parity.v1.json"), "utf8"));
const gateway = JSON.parse(await readFile(resolve(root, "contracts/gateway-methods.v1.json"), "utf8"));
const irImport = JSON.parse(await readFile(resolve(root, "contracts/cortex-control-ir-import.v1.json"), "utf8"));
const schema = await readFile(resolve(root, "packages/rust/qc-protocol/proto/ProductionAutomation.proto"), "utf8");
const ids = new Set();

assert.equal(manifest.version, 1, "extracted protocol parity contract version changed");
assert.ok(Array.isArray(manifest.extensions) && manifest.extensions.length > 0,
  "extracted protocol parity contract must list extensions");

const functionPattern = (language, symbol) => language === "rust"
  ? new RegExp(`\\b(?:pub\\s+)?fn\\s+${symbol}\\s*\\(`)
  : new RegExp(`^def\\s+${symbol}\\s*\\(`, "m");
const schemaMessage = (name) => {
  const start = schema.search(new RegExp(`^message\\s+${name}\\s*\\{`, "m"));
  if (start < 0) return null;
  const tail = schema.slice(start);
  const next = tail.slice(1).search(/^(?:message|enum)\s+/m);
  return next < 0 ? tail : tail.slice(0, next + 1);
};

for (const extension of manifest.extensions) {
  assert.ok(extension.id && !ids.has(extension.id), `duplicate or empty extension id: ${extension.id}`);
  ids.add(extension.id);
  assert.ok(Number.isInteger(extension.messageType) && extension.messageType > 0,
    `${extension.id}: invalid message type`);
  const message = schemaMessage(extension.schemaMessage);
  assert.ok(message, `${extension.id}: ${extension.schemaMessage} is absent from the extracted schema`);
  for (const field of extension.schemaFields) {
    assert.match(message, new RegExp(`\\b${field}\\s*=`),
      `${extension.id}: schema field ${field} is absent`);
  }
  for (const [side, evidence] of Object.entries(extension).filter(([key]) => key.startsWith("rust") || key === "python")) {
    const source = await readFile(resolve(root, evidence.path), "utf8");
    const language = side.startsWith("rust") ? "rust" : "python";
    for (const symbol of evidence.symbols) {
      assert.match(source, functionPattern(language, symbol),
        `${extension.id}: ${language} parity symbol ${symbol} is absent from ${evidence.path}`);
    }
  }
  if (extension.gatewayRpc) {
    const method = gateway.methods.find(({ rpc }) => rpc === extension.gatewayRpc);
    assert.ok(method, `${extension.id}: gateway RPC ${extension.gatewayRpc} is absent`);
    assert.notEqual(method.python, false,
      `${extension.id}: gateway RPC ${extension.gatewayRpc} is incorrectly marked Rust-only`);
    assert.ok(gateway.capabilities.includes(extension.capability),
      `${extension.id}: Rust capability ${extension.capability} is absent`);
    assert.ok(gateway.pythonCapabilities.includes(extension.capability),
      `${extension.id}: Python capability ${extension.capability} is absent`);
  }
}

assert.equal(irImport.version, 1, "IR import capture contract version changed");
assert.equal(irImport.source.synthetic, true, "IR import evidence must use synthetic audio");
assert.equal(irImport.source.containsPrivateContent, false,
  "IR import evidence must not retain private content");
assert.equal(irImport.fileMessage.messageType, 4, "IR import must use FileMessage type 4");
assert.equal(irImport.fileMessage.action.value, 0, "IR import must use CREATE");
assert.equal(irImport.fileMessage.action.encoded, false,
  "captured CREATE is the omitted proto3 default");
assert.equal(irImport.fileMessage.type, 1, "IR import FileMessage category must be 1");
assert.ok(irImport.fileMessage.presentFields.includes("ir_payload"),
  "IR import capture must retain ir_payload presence");
assert.ok(irImport.fileMessage.absentFields.includes("total_bulk_create_count"),
  "official IR import evidence must record the absent bulk count");
assert.deepEqual(
  [irImport.irPayload.audioFormat, irImport.irPayload.channels,
    irImport.irPayload.sampleRate, irImport.irPayload.bitsPerSample,
    irImport.irPayload.sampleCount],
  [3, 1, 48_000, 32, 1_024],
  "captured Cortex Control IR conversion shape changed",
);
const data = irImport.irPayload.chunks.find(({ id }) => id === "data");
assert.equal(data.size, irImport.irPayload.sampleCount * irImport.irPayload.blockAlign,
  "IR payload data size must match its sample count and block alignment");
assert.equal(irImport.irPayload.bytes, data.dataOffset + data.size,
  "IR payload byte count must end exactly after its data chunk");

console.log(JSON.stringify({
  verified: true,
  extensions: manifest.extensions.length,
  languages: ["rust", "python"],
  irImportCapture: true,
}));
