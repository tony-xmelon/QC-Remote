import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const input = process.argv[2] ?? ".artifacts/typography-comparison/report.json";
const output = process.argv[3] ?? "references/qc-ui-typography/coros-4.1.0/report.md";
const report = JSON.parse(await readFile(input, "utf8"));
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const percent = (value) => value == null ? "—" : `${value.toFixed(2)}%`;
const escapeCell = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");

const hostParity = new Map();
for (const item of report.crossHost) {
  const list = hostParity.get(item.state) ?? [];
  list.push(item.matchPercent);
  hostParity.set(item.state, list);
}

const rows = report.raster
  .filter((item) => item.host === "windows")
  .sort((left, right) => left.state.localeCompare(right.state) || left.source.localeCompare(right.source) || left.screen.localeCompare(right.screen));
const availability = report.fontAvailability
  .map((item) => `- ${item.font}: ${item.available ? "available" : "missing"} (${item.runs} runs)`)
  .join("\n");
const table = rows.map((item) => {
  const parity = mean(hostParity.get(item.state) ?? []);
  return `| ${escapeCell(item.state)} | ${escapeCell(item.source)} | ${escapeCell(item.screen)} | ${item.runs} | ${escapeCell(item.contentIdentity)} | ${percent(item.contentParityPercent)} | ${percent(item.glyphShapeMatchPercent)} | ${percent(item.placementMatchPercent)} | ${percent(item.foregroundColorMatchPercent)} | ${percent(item.backgroundColorMatchPercent)} | ${percent(parity)} |`;
}).join("\n");

const markdown = `# Quad Cortex typography parity — CorOS 4.1.0

Generated from the complete ${report.canonicalStates}-state canonical screen manifest. Every visible text run is measured for resolved face, font availability, size, weight/style, line boxes, position, color, local background, direction, writing mode, wrapping, and line breaks on both Windows and Android.

## Result

- Canonical states measured: ${report.measuredStates}/${report.canonicalStates}
- Authoritative raster comparisons: ${report.authoritativeRasterMeasurements}
- Windows/Android paired measurements: ${report.crossHostMeasurements}
- Cross-host computed-style parity: ${percent(report.crossHostStyleParityPercent)}
- Primary face availability: ${percent(report.primaryFaceAvailabilityPercent)}
- Independent-score population: ${report.independentScorePopulation}
- Content identity: ${report.contentIdentity.verified} verified / ${report.contentIdentity.mismatch} mismatch / ${report.contentIdentity.unverified} unverified
- Mean reference-content coverage: ${percent(report.meanContentParityPercent)}
- Mean glyph-shape match (placement normalized): ${percent(report.meanGlyphShapeMatchPercent)}
- Mean placement match: ${percent(report.meanPlacementMatchPercent)}
- Mean foreground-color match: ${percent(report.meanForegroundColorMatchPercent)}
- Mean local-background-color match: ${percent(report.meanBackgroundColorMatchPercent)}
- Missing canonical states: ${report.missing.length}
- Quality gate: ${report.qualityGate?.passed ? "PASS" : "FAIL"}
${report.qualityGate?.failures?.length ? `- Gate failures: ${report.qualityGate.failures.join("; ")}` : ""}

These dimensions are intentionally independent. Content identity uses screenshot-verified anchor tokens from the manifest; screens without explicit anchors are marked unverified. ZenUI object-tree token coverage remains a separate diagnostic because the tree can contain hidden labels. Glyph shape is scored after normalizing position; placement is measured from localized glyph-template x/y displacement at the native 800×480 scale; and foreground/background color scores compare their palettes separately. Purely symbolic runs do not influence typography means. The older combined masked-region scores remain in the JSON only for historical trend continuity and are not presented as fidelity scores.

## Bundled font availability

${availability}

## Every authoritative screen

| State | Source | Screen | Runs | Identity | Content | Glyph shape | Placement | Foreground | Background | Host parity |
|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
${table}

## Reproduce

1. Capture both hosts with the Windows and Android corpus drivers plus the official/manual drivers.
2. Run \`npm run verify:qc-typography\`.
3. Run \`npm run compare:qc-typography\`.
4. Run \`npm run report:qc-typography\`.
`;

await mkdir(dirname(output), { recursive: true });
await writeFile(output, markdown, "utf8");
console.log(`Wrote ${rows.length} authoritative screen rows to ${output}`);
