import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(root, "contracts/extracted-protocol-parity.v1.json"), "utf8"));
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
}

console.log(JSON.stringify({ verified: true, extensions: manifest.extensions.length, languages: ["rust", "python"] }));
