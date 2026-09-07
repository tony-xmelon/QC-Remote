// Classify every assertion in the test suite by what it is evidence of.
//
// Two defects found in this repository motivated this. A fixture that drew a
// screen the device does not have passed its checks for years because the
// checks only compared message *names* and, separately, because the screen's
// captions are drawn as images so the text oracle had nothing to compare. And a
// test pinned the directory item menu as ["Edit","Copy","Cut","Delete"] - our
// own invention - so the device's actual menu, which carries a Paste entry,
// made the test fail rather than the fixture.
//
// The distinction that matters is what an assertion is anchored to:
//
//   device     reads references/qc-ui-corpus, references/cortex-protocol or
//              artifacts captured from hardware. Cannot pass while disagreeing
//              with the unit.
//   contract   reads contracts/ or a generated file. Anchored to a declaration
//              both sides derive from.
//   self       reads our own source under packages/ or apps/ and asserts its
//              text. Passes if the implementation is wrong and fails if it is
//              refactored: a change detector, not evidence.
//   behaviour  calls the code and asserts on the result. The ordinary kind.
//
// `self` is not automatically wrong - some of it pins a hard-won detail - but
// every one of them is a claim with nothing behind it, so they are worth
// counting and worth reviewing when the device says something new.
//
// Usage: node tools/audit_test_evidence.mjs [--list self]

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const TESTS = "tests";
const wanted = process.argv.includes("--list")
  ? process.argv[process.argv.indexOf("--list") + 1]
  : null;

const DEVICE = /references\/qc-ui-corpus|references\/cortex-protocol|references\/qc-ui-official|artifacts\//;
const CONTRACT = /contracts\/|generated[-_]/;
const OURS = /readFileSync\(\s*"(packages|apps|services|scripts|tools)\//;

const files = readdirSync(TESTS).filter((name) => name.endsWith(".test.ts") || name.endsWith(".spec.ts"));
const rows = [];

for (const file of files) {
  const source = readFileSync(join(TESTS, file), "utf8");
  const lines = source.split(/\r?\n/);

  // Which files each test block reads decides what its assertions are anchored
  // to, so track the enclosing test and the reads seen inside it.
  let current = null;
  const blocks = [];
  for (const [index, line] of lines.entries()) {
    const opened = line.match(/^\s*test\(\s*"([^"]+)"/);
    if (opened) {
      current = { file, name: opened[1], line: index + 1, reads: [], assertions: 0 };
      blocks.push(current);
    }
    if (!current) continue;
    // Any repository path mentioned in the block, however it is read: several
    // suites go through a `read()` helper rather than readFileSync directly.
    for (const path of line.matchAll(/"((?:packages|apps|services|scripts|tools|contracts|references|artifacts|docs)\/[^"]*)"/g)) {
      current.reads.push(path[1]);
    }
    if (/\bassert[.(]/.test(line)) current.assertions += 1;
  }

  for (const block of blocks) {
    const joined = block.reads.join(" ");
    const sourceText = lines.slice(block.line - 1, block.line + 60).join("\n");
    let kind = "behaviour";
    if (DEVICE.test(joined)) kind = "device";
    else if (CONTRACT.test(joined)) kind = "contract";
    else if (block.reads.some((path) => /^(packages|apps|services|scripts|tools)\//.test(path))) kind = "self";
    rows.push({ ...block, kind });
  }
}

const counts = {};
for (const row of rows) counts[row.kind] = (counts[row.kind] ?? 0) + 1;

if (wanted) {
  for (const row of rows.filter((row) => row.kind === wanted)) {
    console.log(`${row.file}:${row.line}  ${row.name}`);
  }
} else {
  console.log(`${rows.length} test blocks across ${files.length} files`);
  for (const [kind, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kind.padEnd(10)} ${String(count).padStart(3)}`);
  }
  const byFile = {};
  for (const row of rows.filter((row) => row.kind === "self")) {
    byFile[row.file] = (byFile[row.file] ?? 0) + 1;
  }
  console.log("\nself-anchored blocks by file:");
  for (const [file, count] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)}  ${file}`);
  }
}
