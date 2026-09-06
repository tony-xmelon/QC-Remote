import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("references/qc-ui-typography/coros-4.1.0/manifest.json", "utf8"));
const coverage = JSON.parse(readFileSync(manifest.coverageLedger, "utf8"));
assert.equal(manifest.corosVersion, coverage.corosVersion, "typography and screen ledgers target different CorOS versions");
assert.deepEqual(manifest.coordinateSpace, { width: 800, height: 480 });
for (const dimension of ["text", "lineBreaks", "fontFamily", "resolvedFontFamily", "fontSize", "color", "backgroundColor", "position", "direction", "writingMode"]) {
  assert.ok(manifest.dimensions.includes(dimension), `missing typography dimension ${dimension}`);
}

for (const script of ["tools/capture_windows_ui.mjs", "tools/capture_android_ui.mjs", "tools/capture_qc_official_manual_ui.mjs"]) {
  const source = readFileSync(script, "utf8");
  assert.match(source, /writeTypographySnapshot/, `${script} does not emit typography sidecars`);
}

const roots = {
  corpus: ".artifacts/typography-baseline/corpus",
  official: ".artifacts/typography-baseline/official",
  smoke: ".artifacts/typography-baseline/smoke"
};
const hostPath = (root, host, id) => `${root}/${host}/${id}.typography.json`;
const candidates = (state) => [
  ...(state.physical ?? []).map((id) => ({ root: roots.corpus, id, evidence: "physical" })),
  ...(state.official ?? []).map((id) => ({ root: roots.official, id, evidence: "official" })),
  ...(state.smoke ?? []).map((id) => ({ root: roots.smoke, id, evidence: "smoke" }))
];
const results = coverage.states.map((state) => {
  const paths = candidates(state);
  const windows = paths.filter(({ root, id }) => existsSync(hostPath(root, "windows", id)));
  const android = paths.filter(({ root, id }) => existsSync(hostPath(root, "android", id)));
  return { id: state.id, renderer: state.renderer, windows, android };
});
const dualHost = results.filter((result) => result.windows.length && result.android.length);
const missing = results.filter((result) => !result.windows.length || !result.android.length).map(({ id, renderer }) => ({ id, renderer }));
const report = {
  verified: missing.length === 0,
  canonicalStates: results.length,
  dualHostStates: dualHost.length,
  dualHostMetadataPercent: Math.round(dualHost.length / Math.max(results.length, 1) * 10000) / 100,
  missing
};
console.log(JSON.stringify(report));
if (missing.length) process.exitCode = 1;
