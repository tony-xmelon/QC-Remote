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
  return `| ${escapeCell(item.state)} | ${escapeCell(item.source)} | ${escapeCell(item.screen)} | ${item.runs} | ${percent(item.structuralMatchPercent)} | ${percent(item.colorMatchPercent)} | ${percent(item.foregroundColorPresencePercent)} | ${percent(item.backgroundColorPresencePercent)} | ${percent(parity)} |`;
}).join("\n");

const markdown = `# Quad Cortex typography parity — CorOS 4.1.0

Generated from the complete ${report.canonicalStates}-state canonical screen manifest. Every visible text run is measured for resolved face, font availability, size, weight/style, line boxes, position, color, local background, direction, writing mode, wrapping, and line breaks on both Windows and Android.

## Result

- Canonical states measured: ${report.measuredStates}/${report.canonicalStates}
- Authoritative raster comparisons: ${report.authoritativeRasterMeasurements}
- Windows/Android paired measurements: ${report.crossHostMeasurements}
- Cross-host computed-style parity: ${percent(report.crossHostStyleParityPercent)}
- Primary face availability: ${percent(report.primaryFaceAvailabilityPercent)}
- Mean text-mask structural match: ${percent(report.meanStructuralMatchPercent)}
- Mean text-region color match: ${percent(report.meanColorMatchPercent)}
- Exact reference foreground-palette presence: ${percent(report.textColorPresencePercent)}
- Exact reference local-background-palette presence: ${percent(report.backgroundColorPresencePercent)}
- Missing canonical states: ${report.missing.length}
- Quality gate: ${report.qualityGate?.passed ? "PASS" : "FAIL"}

The structural and color scores compare only text-bearing regions, using the paired no-text render to isolate typography from iconography and controls. Palette-presence values are stricter diagnostics: antialiasing and the lack of source metadata in physical screenshots can lower them even when the perceived text color is correct.

## Bundled font availability

${availability}

## Every authoritative screen

| State | Source | Screen | Runs | Structure | Region color | Foreground present | Background present | Host parity |
|---|---|---|---:|---:|---:|---:|---:|---:|
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
