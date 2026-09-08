// Find assertions that can pass without testing anything.
//
// This repository has been bitten by checks that passed for the wrong reason
// more than once: a source grep satisfied by a comment that mentioned the very
// string it was looking for, a schema comparison that only ever compared
// message names, a text oracle that reported success on screens carrying no
// text. All three were green while the thing they guarded was broken.
//
// The mechanical version of that mistake is an assertion that never runs: a
// loop over a collection that can be empty, with nothing asserting it was not.
//
// Only loops over a *computed* collection are reported. Iterating a literal
// array is safe by construction - it cannot be empty unless someone empties the
// literal in front of them - and flagging those buries the real ones. String
// literals are stripped before matching, because a test named "... while the
// device is offline" is not a loop.
//
// Usage: node tools/audit_vacuous_assertions.mjs [--verbose]

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const TESTS = "tests";
const verbose = process.argv.includes("--verbose");
const files = readdirSync(TESTS).filter((name) => /\.(test|spec)\.ts$/.test(name));

/** Blank out string and template literals so their contents never match. */
function withoutLiterals(line) {
  return line
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

/** A collection that cannot be empty unless the source itself is edited. */
function isLiteralCollection(expression, source) {
  const trimmed = expression.trim();
  if (trimmed.startsWith("[")
    || /^Object\.(entries|keys|values)\(\s*\{/.test(trimmed)
    || /^Object\.(entries|keys|values)\(\s*[A-Z_]+\s*\)/.test(trimmed)) return true;
  // A bare identifier bound to an array literal in the same file is just as
  // safe, and those are usually declared across several lines. Reporting them
  // buries the real findings, and an audit nobody trusts is not an audit.
  if (!/^[A-Za-z_$][\w$]*$/.test(trimmed)) return false;
  return new RegExp(`\\b(?:const|let)\\s+${trimmed}\\b[^=\\n]*=\\s*\\[`).test(source);
}

const findings = [];

for (const file of files) {
  const wholeFile = readFileSync(join(TESTS, file), "utf8");
  const raw = wholeFile.split(/\r?\n/);
  const lines = raw.map(withoutLiterals);

  let test = null;
  let testStart = 0;
  const stack = [];

  for (const [index, line] of lines.entries()) {
    const opened = raw[index].match(/^\s*test\(\s*"([^"]+)"/);
    if (opened) {
      test = opened[1];
      testStart = index + 1;
      stack.length = 0;
    }
    if (!test) continue;

    const forOf = line.match(/\bfor\s*\(\s*(?:const|let|var)\s+.*?\s+of\s+(.+?)\s*\)\s*\{/);
    const forEach = line.match(/(.+?)\.forEach\s*\(/);
    if (forOf) {
      stack.push({ line: index + 1, expression: forOf[1], safe: isLiteralCollection(forOf[1], wholeFile) });
    } else if (forEach && /\{\s*$/.test(line)) {
      stack.push({ line: index + 1, expression: forEach[1], safe: isLiteralCollection(forEach[1], wholeFile) });
    } else if (/^\s*\}/.test(line) && stack.length) {
      stack.pop();
    }

    if (!/\bassert[.(]/.test(line)) continue;
    const enclosing = stack[stack.length - 1];
    if (!enclosing || enclosing.safe) continue;

    // The whole test, not just the lines above: a loop can equally be guarded
    // by counting what it visited and asserting that count afterwards.
    const nextTest = raw.findIndex((text, at) => at > index && /^\s*test\(\s*"/.test(text));
    const body = raw.slice(testStart, nextTest === -1 ? raw.length : nextTest).join("\n");
    // Either shape counts: asserting the collection's size before the loop, or
    // counting what the loop visited and asserting that afterwards.
    const guardsSize =
      /assert[^\n]*\.(length|size)\b/.test(body) ||
      /assert[^\n]*\b(length|size|count)\b/.test(body);
    const counters = [...body.matchAll(/\b([A-Za-z_$][\w$]*)\s*(?:\+=\s*1|\+\+)/g)].map((m) => m[1]);
    // A counter is guarded whether it is compared (`assert.ok(seen > 20)`) or
    // asserted as a total (`assert.deepEqual({ seen }, { seen: 164 })`); an
    // empty collection leaves it at zero and fails either way.
    const guardsCounter = counters.some((name) =>
      new RegExp(`assert[^\\n]*\\b${name}\\b\\s*>=?\\s*\\d`).test(body)
      || new RegExp(`assert[^\\n]*\\b${name}\\b[^\\n]*[1-9]`).test(body));
    const guarded = guardsSize || guardsCounter;
    if (!guarded) {
      findings.push({ file, test, line: index + 1, expression: enclosing.expression.slice(0, 70) });
    }
  }
}

console.log(`${findings.length} assertion(s) inside a loop over a computed collection `
  + `with nothing asserting the collection is non-empty`);

const seen = new Set();
for (const finding of findings) {
  const key = `${finding.file}:${finding.test}`;
  if (!verbose && seen.has(key)) continue;
  seen.add(key);
  console.log(`  ${finding.file}:${finding.line}  ${finding.test}`);
  console.log(`      iterates: ${finding.expression}`);
}

// Clean today, so a new one is a regression rather than a backlog entry.
process.exitCode = findings.length ? 1 : 0;
