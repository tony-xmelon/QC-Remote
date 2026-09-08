import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, "references/qc-ui-iconography/coros-4.1.0/manifest.json"), "utf8"));
const iconsSource = readFileSync(join(root, "packages/typescript/qc-ui/src/theme-icons.tsx"), "utf8");
const deviceGlyphSource = readFileSync(join(root, "packages/typescript/qc-ui/src/device-glyph.tsx"), "utf8");
const fixtureSource = readFileSync(join(root, "packages/typescript/qc-ui/src/coros-screen-fixtures.tsx"), "utf8");
const colors = JSON.parse(readFileSync(join(root, "packages/typescript/qc-theme/src/colors.json"), "utf8"));
const appGoldenRoot = join(root, "references/qc-ui-app-golden/v1");
const appGolden = JSON.parse(readFileSync(join(appGoldenRoot, "manifest.json"), "utf8"));

const failures = [];
const requireCompleteCoverage = process.argv.includes("--require-complete-coverage");
const union = (name) => {
  const match = iconsSource.match(new RegExp(`export type ${name} =\\s*([^;]+);`));
  if (!match) return failures.push(`missing exported union ${name}`), [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
};
const token = (path) => path.split(".").reduce((value, key) => value?.[key], colors);

for (const family of manifest.families) {
  if (family.type.startsWith("Qc") && family.type.endsWith("Name")) {
    const declared = union(family.type);
    const expected = [...family.variants];
    if (JSON.stringify(declared) !== JSON.stringify(expected)) failures.push(`${family.type} manifest drift: source=${declared.join(",")} manifest=${expected.join(",")}`);
  }
  if (!family.sources.length) failures.push(`${family.type} has no authoritative source`);
  for (const paletteToken of family.paletteTokens) if (!token(paletteToken)) failures.push(`${family.type} has unknown palette token ${paletteToken}`);
}

if (!deviceGlyphSource.includes("export function QcDeviceGlyph")) failures.push("missing canonical device glyph owner");
const categoryGlyphSource = readFileSync(join(root, "packages/typescript/qc-ui/src/device-category-glyph.tsx"), "utf8");
if (!deviceGlyphSource.includes("QcDeviceCategoryGlyph") || /<image\b|data:image|base64/.test(deviceGlyphSource + categoryGlyphSource)) failures.push("device glyphs must use the shared neutral vector registry without sprite or raster exceptions");

for (const measurement of manifest.screenMeasurements) {
  const measuredTokens = measurement.paletteTokens.map((paletteToken) => token(paletteToken)?.toLowerCase());
  const expectedColors = measurement.expectedColors.map((color) => color.toLowerCase());
  if (JSON.stringify(measuredTokens) !== JSON.stringify(expectedColors)) failures.push(`${measurement.icon} palette tokens do not equal measured screen colors`);
}
const measuredPaletteTokens = new Set(manifest.screenMeasurements.flatMap((measurement) => measurement.paletteTokens));
for (const family of manifest.families) {
  for (const paletteToken of family.paletteTokens) {
    if (!measuredPaletteTokens.has(paletteToken)) failures.push(`${family.type} palette token ${paletteToken} has no screengrab anchor`);
  }
}

const appGoldenById = new Map(appGolden.captures.map((capture) => [capture.id, capture]));
for (const measurement of manifest.screenMeasurements.filter((entry) => entry.sourceSet === "app-golden")) {
  const capture = appGoldenById.get(measurement.screen);
  if (!capture) {
    failures.push(`${measurement.icon} references unknown app golden ${measurement.screen}`);
    continue;
  }
  if (capture.authority !== "app-owned-golden") failures.push(`${capture.id} has invalid authority ${capture.authority}`);
  const bytes = readFileSync(join(appGoldenRoot, capture.image));
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== capture.bytes) failures.push(`${capture.id} byte count drift: ${bytes.length} != ${capture.bytes}`);
  if (digest !== capture.sha256) failures.push(`${capture.id} checksum drift: ${digest} != ${capture.sha256}`);
}

const familyPrefixes = {
  QcUiIconName: "interface",
  QcDirectoryIconName: "directory",
  QcEditorIconName: "editor",
  QcEqIconName: "eq",
  QcHardwareIconName: "hardware",
  QcIoIconName: "io",
  QcLibraryIconName: "library",
  QcCaptureFilterIconName: "capture-filter",
  QcScreenHeaderGlyphName: "screen-header",
  QcSettingsIconName: "settings",
  QcModeGlyph: "mode",
  QcRouteGlyph: "route",
  DeviceCategoryGlyph: "device-category",
};
const canonicalVariant = (value) => value.toLowerCase().replaceAll(" ", "-");
const uncovered = {};
for (const family of manifest.families) {
  const prefix = familyPrefixes[family.type];
  const measured = new Set(manifest.screenMeasurements
    .filter((measurement) => measurement.icon.startsWith(`${prefix}.`))
    .map((measurement) => canonicalVariant(measurement.variant)));
  const missing = family.variants.filter((variant) => !measured.has(canonicalVariant(variant)));
  if (missing.length) uncovered[family.type] = missing;
}
if (requireCompleteCoverage && Object.keys(uncovered).length) {
  for (const [family, variants] of Object.entries(uncovered)) failures.push(`${family} lacks screengrab measurements for: ${variants.join(", ")}`);
}

if (!fixtureSource.includes("<QcDirectoryIcon") || !fixtureSource.includes("<QcLibraryIcon") || !fixtureSource.includes("<QcModeGlyph")) failures.push("fixtures do not consume every shared navigation registry");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

const variants = manifest.families.reduce((sum, family) => sum + family.variants.length, 0);
const coveredVariants = variants - Object.values(uncovered).reduce((sum, missing) => sum + missing.length, 0);
console.log(JSON.stringify({ verified: true, coverageComplete: Object.keys(uncovered).length === 0, families: manifest.families.length, variants, screenMeasuredVariants: coveredVariants, neutralVectorRegistry: true, paletteAnchors: [...new Set(manifest.families.flatMap((family) => family.paletteTokens))].length, uncovered }));
