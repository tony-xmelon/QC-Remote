import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { QC_BRAND, QC_COLORS, QC_GEOMETRY, QC_NATIVE_THEME, QC_TYPOGRAPHY, QC_VISUAL_ASSETS } from "../packages/typescript/qc-theme/src/index.ts";

const read = (path: string) => readFileSync(path, "utf8");
const sha256 = (path: string) => createHash("sha256").update(path.endsWith(".svg")
  ? readFileSync(path, "utf8").replaceAll("\r\n", "\n")
  : readFileSync(path)).digest("hex");

test("device typography ships deterministic Windows and Android faces", () => {
  const themeCss = read("packages/typescript/qc-theme/src/theme.css");
  const deviceCss = read("packages/typescript/qc-ui/src/qc-device-typography.css");
  const themePackage = JSON.parse(read("packages/typescript/qc-theme/package.json"));
  assert.match(themeCss, /@fontsource-variable\/arimo/);
  assert.match(themeCss, /@fontsource-variable\/roboto/);
  assert.equal(themePackage.dependencies["@fontsource-variable/arimo"], "^5.3.0");
  assert.equal(themePackage.dependencies["@fontsource-variable/roboto"], "^5.3.0");
  assert.match(deviceCss, /html body #root#root \.qc-screen-bezel \*/);
  assert.match(deviceCss, /font-family: "Arimo Variable"/);
  assert.match(deviceCss, /font-family: "Roboto Variable"/);
});

test("shared theme retains every measured native QC color", () => {
  assert.deepEqual(QC_COLORS.captured, {
    screen: "#000000",
    routePill: "#101010",
    unsaved: "#313031",
    routeRail: "#c6c3c6",
    routeText: "#dedfde",
    routeGlyphSurface: "#292c29",
    utilityMark: "#949694",
    primaryText: "#ffffff",
    iconPrimary: "#f8fcf8",
    iconMuted: "#889088",
    iconToolbarMuted: "#606060",
    keyboardGlyph: "#f7f3f7",
    cabArrowDark: "#848684",
    cabArrowLight: "#9c9e9c",
    editorMuted: "#8c8a8c",
    editorDisabled: "#101410",
    editorDisabledShadow: "#080c08",
    editorDisabledAccent: "#081008",
    editorDisabledEdge: "#081010",
    editorSaveMid: "#cecbce",
    editorSaveDark: "#5a5d5a",
    contextCaptureBlack: "#181c18",
    contextCaptureDark: "#393c39",
    contextCaptureMid: "#4a4d4a",
    contextCaptureMuted: "#525152",
    contextCaptureSoft: "#bdbebd",
    contextCaptureLight: "#c6c7c6",
    sceneControlMuted: "#505050",
    looperRing: "#909490",
    categoryTrail: "#909490",
    categoryCaptureMuted: "#505050",
    categorySpriteMuted: "#959595",
    captureStripeLow: "#283028",
    captureStripeShadow: "#404040",
    captureStripeDark: "#505050",
    captureStripeMuted: "#586058",
    captureStripeSoft: "#c0c0c0",
    captureStripeLight: "#c8c8c8",
    headerUndo: "#f6f8f6",
    headerSave: "#eceeec",
    headerMenu: "#ffffff",
    modeJoin: "#707c70",
    sceneBadge: "#ffd331",
    presetBrown: "#9b613c"
  });
  assert.deepEqual(QC_COLORS.browserCategory, {
    plugin: "#42fb63", amp: "#ff2421", capture: "#949694", cab: "#6b55ff", overdrive: "#ff7100",
    delay: "#00ffde", reverb: "#00ffde", compressor: "#42fb63", pitch: "#ffd331", modulation: "#3100f7",
    morph: "#949694", synth: "#e7495a", filter: "#84dbff", equalizer: "#0875e7", irLoader: "#6b55ff",
    wah: "#949694", fxLoop: "#949694", looper: "#ff2421", utility: "#949694"
  });
  assert.equal(QC_GEOMETRY.screen.width, 800);
  assert.equal(QC_GEOMETRY.screen.height, 480);
  assert.equal(QC_GEOMETRY.grid.rows, 4);
  assert.equal(QC_GEOMETRY.grid.columns, 6);
  assert.match(QC_TYPOGRAPHY.device, /Arimo Variable/);
});

test("theme CSS mirrors the typed tokens and is loaded by both apps", () => {
  const css = read("packages/typescript/qc-theme/src/theme.css");
  for (const color of Object.values(QC_COLORS.captured)) assert.ok(css.toLowerCase().includes(color), "CSS theme needs " + color);
  for (const entry of ["--qc-screen", "--qc-route-pill", "--qc-unsaved", "--qc-route-rail", "--qc-route-text", "--qc-utility-mark", "--qc-font-device", "--qc-font-app"]) assert.ok(css.includes(entry), "CSS theme needs " + entry);
  for (const entry of ["apps/windows/src/main.tsx", "apps/android/src/main.tsx"]) assert.match(read(entry), /@ndsp-qc\/theme\/theme\.css/, entry + " must load the shared theme");
});

test("core behavior and UI artwork consume one category palette", () => {
  assert.match(read("packages/typescript/qc-core/src/footswitch.ts"), /QC_COLORS\.category/);
  assert.match(read("packages/typescript/qc-ui/src/block-visuals.ts"), /QC_COLORS\.category/);
  assert.doesNotMatch(read("packages/typescript/qc-core/src/footswitch.ts"), /return "#(?:ff7000|ff2727|ffd236|00ffdd|45f862|3500f1|87daff|e44a5d|0a74e0)"/);
  for (const file of [
    "packages/typescript/qc-ui/src/quad-cortex-surface.tsx",
    "packages/typescript/qc-ui/src/parameter-editor.tsx",
    "packages/typescript/qc-ui/src/parameter-model.ts",
    "packages/typescript/qc-ui/src/qc-parameter-editor-bindings.ts",
    "packages/typescript/qc-ui/src/theme-icons.tsx"
  ]) assert.doesNotMatch(read(file), /#[0-9a-f]{3,8}\b/i, file + " must use shared theme colors");
});

test("shared glyph registry covers hardware, routing, directory, editing, and communication", () => {
  const icons = read("packages/typescript/qc-ui/src/theme-icons.tsx");
  for (const component of ["QcRouteGlyph", "QcModeGlyph", "QcDirectoryIcon", "QcEditorIcon", "QcUiIcon"]) assert.ok(icons.includes("export function " + component));
  assert.equal(readdirSync("packages/typescript/qc-ui/src").filter((entry) => /icon/i.test(entry)).join(","), "theme-icons.tsx");
  assert.doesNotMatch(read("packages/typescript/qc-ui/src/quad-cortex-surface.tsx"), /function (?:RoutePickerGlyph|DirectoryIcon|ModeGlyph)/);
  assert.doesNotMatch(read("packages/typescript/qc-ui/src/parameter-editor.tsx"), /function ParameterMenuIcon/);
  const fixtures = read("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx");
  assert.match(fixtures, /return <QcModeGlyph mode=\{mode\} \/>/, "fixture modes must delegate to the shared glyph registry");
  assert.match(fixtures, /return <QcDirectoryIcon kind=\{kind\} number=\{number\} \/>/, "fixture Directory icons must delegate to the shared glyph registry");
});

test("production and comparison screens cannot select alternate icon artwork", () => {
  const sourceFiles = execFileSync("git", ["ls-files", "--", "apps", "packages", "tests"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter((file) => /\.(?:ts|tsx)$/.test(file));
  const fixtureOnlyVariant = new RegExp(["official", "Raster"].join(""));
  for (const file of sourceFiles) {
    assert.doesNotMatch(read(file), fixtureOnlyVariant, `${file} must use the same canonical artwork in production and comparisons`);
  }

  const icons = read("packages/typescript/qc-ui/src/theme-icons.tsx");
  assert.match(icons, /export function QcScreenHeaderGlyph\(\{\s*kind,?\s*\}: \{\s*kind: QcScreenHeaderGlyphName;?\s*\}\)/s);
  assert.match(icons, /if \(kind === "save"\) return <path shapeRendering="crispEdges" fill=\{QC_COLORS\.captured\.primaryText\}/);
  assert.match(icons, /\| "cab-previous"\s*\| "cab-next"/s, "genuinely distinct contextual artwork must have semantic names");
});

test("official Directory toolbar glyphs retain exact CorOS vector colors and geometry", () => {
  const colors = JSON.parse(read("packages/typescript/qc-theme/src/colors.json"));
  assert.equal(colors.captured.iconPrimary, "#f8fcf8");
  assert.equal(colors.captured.iconToolbarMuted, "#606060");
  const icons = read("packages/typescript/qc-ui/src/theme-icons.tsx");
  for (const path of [
    "M14 4H1v2h13V4Z",
    "m15 6 4-5 4 5h-8Z",
    "M22 4.254c0 .259-.101.508-.281.695",
    "M10 2a8 8 0 1 0 4.914 14.314",
  ]) assert.ok(icons.includes(path), `missing official Directory vector: ${path}`);
  assert.doesNotMatch(icons, /fill=["']#(?:fff|ffffff|616161)["']/i, "official colors must come from the shared measured palette");
});

test("all canonical visual assets match the theme fingerprints", () => {
  for (const [name, asset] of Object.entries(QC_VISUAL_ASSETS)) {
    assert.equal(sha256(asset.sourcePath), asset.sha256, `${name}: ${asset.sourcePath}`);
  }
});

test("every tracked visual, font, audio, or video asset is owned by the theme manifest", () => {
  const visualFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "*.png", "*.svg", "*.ico", "*.webp", "*.jpg", "*.jpeg", "*.gif", "*.avif", "*.woff", "*.woff2", "*.ttf", "*.otf", "*.mp3", "*.wav", "*.ogg", "*.mp4", "*.webm"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean).map((file) => file.replaceAll("\\", "/"));
  const exact = new Set<string>();
  const prefixes: string[] = [];
  for (const asset of Object.values(QC_VISUAL_ASSETS)) {
    exact.add(asset.sourcePath);
    if ("derivedPathPrefixes" in asset) prefixes.push(...asset.derivedPathPrefixes);
  }
  for (const file of visualFiles) assert.ok(file.startsWith("references/") || exact.has(file) || prefixes.some((prefix) => file.startsWith(prefix)), `${file} is not owned by qc-theme/src/assets.json`);
});

test("product visual assets have no byte-for-byte duplicates", () => {
  const visualFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "*.png", "*.svg", "*.ico", "*.webp", "*.jpg", "*.jpeg", "*.gif", "*.avif", "*.woff", "*.woff2", "*.ttf", "*.otf", "*.mp3", "*.wav", "*.ogg", "*.mp4", "*.webm"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean).map((file) => file.replaceAll("\\", "/"))
    .filter((file) => !file.startsWith("references/"));
  const owners = new Map<string, string>();
  for (const file of visualFiles) {
    const fingerprint = sha256(file);
    assert.ok(!owners.has(fingerprint), `${file} duplicates canonical asset ${owners.get(fingerprint)}`);
    owners.set(fingerprint, file);
  }
});

test("authored vector geometry has one owner", () => {
  const sourceFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "apps/**/*.tsx", "packages/**/*.tsx"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean);
  const owners = new Map<string, string>();
  for (const file of sourceFiles) {
    for (const match of read(file).matchAll(/\bd="([^"]{8,})"/g)) {
      const location = `${file}:${read(file).slice(0, match.index).split("\n").length}`;
      assert.ok(!owners.has(match[1]), `${location} duplicates vector geometry owned by ${owners.get(match[1])}`);
      owners.set(match[1], location);
    }
  }
  const components = sourceFiles.flatMap((file) => [...read(file).matchAll(/function\s+(?:Qc)?DeviceGlyph\b/g)].map(() => file));
  assert.deepEqual(components, ["packages/typescript/qc-ui/src/device-glyph.tsx"]);
});

test("every declared icon is wired outside its registry and audit gallery", () => {
  const iconFile = "packages/typescript/qc-ui/src/theme-icons.tsx";
  const iconSource = read(iconFile);
  const fixtureFile = "packages/typescript/qc-ui/src/coros-screen-fixtures.tsx";
  const fixtureSource = read(fixtureFile).split("function IconographyAuditFixture")[0];
  const authoredSource = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "packages/**/*.tsx"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter((file) => file !== iconFile && file !== fixtureFile && !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
    .map(read).concat(fixtureSource).join("\n");
  for (const union of iconSource.matchAll(/export type \w+(?:IconName|GlyphName)\s*=\s*([^;]+);/g)) {
    for (const variant of union[1].matchAll(/"([^"]+)"/g)) {
      assert.match(authoredSource, new RegExp(`["']${variant[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`), `${variant[1]} is declared but not wired`);
    }
  }
});

test("product branding has one shared owner across web and native hosts", () => {
  assert.equal(QC_BRAND.appName, "QC Control");
  assert.equal(QC_BRAND.deviceName, "Quad Cortex");
  for (const file of ["apps/windows/src/main.tsx", "apps/android/src/main.tsx", "apps/android/src/App.tsx", "packages/typescript/qc-ui/src/quad-cortex-surface.tsx"]) {
    assert.match(read(file), /QC_BRAND/, `${file} must consume shared branding`);
    assert.doesNotMatch(read(file), /["'>]QC Control(?:[<"']|\ssettings)/, `${file} must not duplicate the app name`);
  }
  for (const file of ["apps/windows/index.html", "apps/android/index.html"]) assert.match(read(file), /<title><\/title>/);
  const tauri = JSON.parse(read("apps/windows/src-tauri/tauri.conf.json"));
  assert.equal(tauri.productName, QC_BRAND.appName);
  assert.equal(tauri.identifier, QC_BRAND.windowsIdentifier);
  assert.ok(tauri.app.windows.every((window: { title: string }) => window.title === QC_BRAND.appName));
  const capacitor = JSON.parse(read("apps/android/capacitor.config.json"));
  assert.equal(capacitor.appId, QC_BRAND.androidPackage);
  assert.equal(capacitor.appName, QC_BRAND.appName);
  assert.equal(capacitor.backgroundColor, QC_NATIVE_THEME.android.background);
  assert.equal(capacitor.android.backgroundColor, QC_NATIVE_THEME.android.background);
  assert.equal(capacitor.plugins.StatusBar.backgroundColor, QC_NATIVE_THEME.android.background);
  const strings = read("apps/android/android/app/src/main/res/values/strings.xml");
  assert.match(strings, /Generated by scripts\/sync-theme-assets\.mjs/);
  assert.ok(strings.includes(`<string name="app_name">${QC_BRAND.appName}</string>`));
  assert.ok(strings.includes(`<string name="app_font_family">${QC_NATIVE_THEME.android.appFontFamily}</string>`));
  assert.match(read("apps/android/android/app/src/main/res/values/styles.xml"), /android:fontFamily">@string\/app_font_family/);
  assert.match(read("scripts/generate-android-branding.ps1"), /brand\.appWordmark/);
});

test("authored app and device sources cannot bypass the shared visual contract", () => {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).trim().split(/\r?\n/)
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => /^(?:apps|packages|services|scripts|tools|contracts)\//.test(file))
    .filter((file) => existsSync(file))
    .filter((file) => /\.(?:css|html|java|json|mjs|ps1|py|rs|ts|tsx|xml)$/.test(file))
    .filter((file) => !file.startsWith("packages/typescript/qc-theme/"))
    .filter((file) => !file.startsWith("packages/typescript/qc-ui/src/official-") && !file.startsWith("packages/typescript/qc-ui/src/remaining-fixtures") && !file.endsWith("/coros-screen-fixtures.tsx") && !file.endsWith("/fixture-live-surface.css") && !file.endsWith("/reference-parameter-editor.css") && !file.endsWith("/qc-device-typography.css"))
    .filter((file) => !/^tools\/capture_.*\.mjs$/.test(file))
    .filter((file) => file !== "tools/sweep_qc_font.mjs")
    .filter((file) => file !== "tools/compare_qc_font_candidates.py")
    .filter((file) => file !== "apps/android/capacitor.config.json")
    .filter((file) => !file.includes("/tests/") && !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
    .filter((file) => !/generated[-_]/i.test(file) && !file.endsWith("package-lock.json"));
  const colorLiteral = /#[0-9a-f]{3,8}\b|rgba?\s*\(|hsla?\s*\(/i;
  const deployedAssetUrl = /url\([^)]*\.(?:svg|png|webp|jpe?g|ico)\b/i;
  const literalFontStack = /["'](?:Arial Narrow|Arial|Helvetica Neue|Helvetica|Roboto Condensed|Roboto|DM Mono|Cascadia Mono|IBM Plex Sans|Segoe UI Variable|Segoe UI|Inter|Consolas)["']|fontFamily=["']|android:fontFamily">\s*(?!@(?:string|font)\/)[^<]+/mi;
  const iconCharacter = /[▲▼►▶◀◁▷‹›⌄⌃⋮＋✕✓✔✚⏵⏴■↵⇥✎☆⌫◇♩▥⚙▤↑↓]/u;
  for (const file of files) {
    const fullSource = read(file);
    if (/Generated by scripts\//.test(fullSource.slice(0, 300))) continue;
    const source = file.endsWith(".rs") ? fullSource.split("#[cfg(test)]")[0] : fullSource;
    assert.doesNotMatch(source, colorLiteral, `${file} must use @ndsp-qc/theme colors`);
    assert.doesNotMatch(source, deployedAssetUrl, `${file} must use @ndsp-qc/theme asset tokens`);
    assert.doesNotMatch(source, literalFontStack, `${file} must use @ndsp-qc/theme typography`);
    if (file.endsWith(".css")) assert.doesNotMatch(source.replaceAll("--qc-transparent", ""), /\btransparent\b/i, `${file} must use the shared transparent token`);
    if (/\.tsx?$/.test(file) && !file.endsWith("theme-icons.tsx")) assert.doesNotMatch(source, iconCharacter, `${file} must reference a shared vector glyph instead of an icon character literal`);
  }
  assert.doesNotMatch(read("scripts/sync-theme-assets.mjs"), /copyFile|assetCopies|deployedPaths/);
  assert.match(read("scripts/generate-qc-domain.mjs"), /colors\.json/);
});

test("device capture comparison covers every checked screenshot and visual family", () => {
  const manifest = JSON.parse(read("tests/fixtures/qc-theme-reference.json")) as { screenshots: string[]; commonPalette: Array<{ name: string }>; regions: Array<{ name: string }> };
  assert.equal(manifest.screenshots.length, 8);
  assert.deepEqual(manifest.commonPalette.map((entry) => entry.name), ["screen", "routePill", "routeRail", "utilityMark", "primaryText"]);
  for (const region of ["undoGlyph", "sceneBadge", "saveGlyph", "menuGlyph", "modeGlyph", "inputPill", "addBlock", "routeRail", "unsavedTitle"]) assert.ok(manifest.regions.some((entry) => entry.name === region), "capture comparison needs " + region);
});
