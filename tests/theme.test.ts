import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { QC_BRAND, QC_COLORS, QC_GEOMETRY, QC_NATIVE_THEME, QC_SCREEN_ICON_VECTORS, QC_TYPOGRAPHY, QC_VISUAL_ASSETS } from "../packages/typescript/qc-theme/src/index.ts";

const read = (path: string) => readFileSync(path, "utf8");
const sha256 = (path: string) => createHash("sha256").update(path.endsWith(".svg")
  ? readFileSync(path, "utf8").replaceAll("\r\n", "\n")
  : readFileSync(path)).digest("hex");

test("device typography ships deterministic Windows and Android faces", () => {
  const themeCss = read("packages/typescript/qc-theme/src/theme.css");
  const deviceCss = read("packages/typescript/qc-ui/src/qc-device-typography.css");
  const themePackage = JSON.parse(read("packages/typescript/qc-theme/package.json"));
  for (const file of ["IBMPlexSans.ttf", "IBMPlexSans-Medium.ttf", "IBMPlexSans-Bold.ttf"]) {
    assert.match(themeCss, new RegExp(file.replace(".", "\\.")));
    assert.ok(existsSync(`packages/typescript/qc-theme/assets/fonts/${file}`));
  }
  assert.equal(themePackage.dependencies?.["@fontsource-variable/arimo"], undefined);
  assert.equal(themePackage.dependencies?.["@fontsource-variable/roboto"], undefined);
  assert.match(deviceCss, /html body #root#root \.qc-screen-bezel \*/);
  assert.match(deviceCss, /font-family: var\(--qc-font-device-plain\)/);
  assert.match(themeCss, /--qc-font-device-plain:\s*"QC CorOS IBM Plex Sans"/);
  assert.match(themeCss, /--qc-font-device-route:\s*"QC CorOS IBM Plex Sans"/);
});

test("shared theme retains every measured native QC color", () => {
  assert.deepEqual(QC_COLORS.captured, {
    screen: "#000000",
    routePill: "#101010",
    unsaved: "#313031",
    routeRail: "#c6c3c6",
    routeText: "#ffffff",
    routeGlyphSurface: "#292c29",
    utilityMark: "#949694",
    primaryText: "#ffffff",
    iconPrimary: "#f8fcf8",
    iconMuted: "#889088",
    iconToolbarMuted: "#606060",
    libraryMark: "#101010",
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
    captureModelAccent: "#00f05a",
    headerUndo: "#f6f8f6",
    headerSave: "#eceeec",
    headerMenu: "#ffffff",
    modeJoin: "#707c70",
    sceneBadge: "#ffd331",
    presetBrown: "#9b613c",
    ioHeaderShadow: "#424542",
    ioHeaderMid: "#7b7d7b",
    ioHeaderLow: "#737573",
    rotaryAccent: "#42fb63",
    rotaryTrack: "#192019",
    rotaryFace: "#212421",
    rotaryShadow: "#171a17",
    rotarySeparator: "#050605",
    rotaryFaceEdge: "#111411"
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
  assert.match(QC_TYPOGRAPHY.device, /QC CorOS IBM Plex Sans/);
});

test("theme CSS mirrors the typed tokens and is loaded by both apps", () => {
  const css = read("packages/typescript/qc-theme/src/theme.css");
  for (const color of Object.values(QC_COLORS.captured)) assert.ok(css.toLowerCase().includes(color), "CSS theme needs " + color);
  for (const entry of ["--qc-screen", "--qc-route-pill", "--qc-unsaved", "--qc-route-rail", "--qc-route-text", "--qc-utility-mark", "--qc-font-device", "--qc-font-app"]) assert.ok(css.includes(entry), "CSS theme needs " + entry);
  for (const entry of ["apps/windows/src/main.tsx", "apps/android/src/main.tsx"]) assert.match(read(entry), /@qc-remote\/theme\/theme\.css/, entry + " must load the shared theme");
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
  const categories = read("packages/typescript/qc-ui/src/device-category-glyph.tsx");
  const screenGlyphs = read("packages/typescript/qc-ui/src/screen-glyphs.tsx");
  assert.match(categories, /export function QcDeviceCategoryGlyph/);
  for (const component of ["QcScreenGlyph", "QcCaptureKindGlyph", "QcIoPortGlyph", "QcGigStompGlyph", "QcLooperActionGlyph"]) assert.ok(screenGlyphs.includes("export function " + component));
  assert.doesNotMatch(categories, /<image\b|data:image|base64/);
  assert.doesNotMatch(screenGlyphs, /<image\b|data:image|base64/);
  assert.doesNotMatch(read("packages/typescript/qc-ui/src/quad-cortex-surface.tsx"), /function (?:RoutePickerGlyph|DirectoryIcon|ModeGlyph)/);
  assert.doesNotMatch(read("packages/typescript/qc-ui/src/parameter-editor.tsx"), /function ParameterMenuIcon/);
  const fixtures = read("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx");
  assert.match(fixtures, /return <QcModeGlyph mode=\{mode\} \/>/, "fixture modes must delegate to the shared glyph registry");
  assert.match(fixtures, /return <QcDirectoryIcon kind=\{kind\} number=\{number\} \/>/, "fixture Directory icons must delegate to the shared glyph registry");
});

test("screen vector layers are ordered, semantic, theme-resolved, and neutral", () => {
  const registry = read("packages/typescript/qc-theme/src/screen-icon-vectors.ts");
  assert.doesNotMatch(registry, /library\.neural-mark|\bpaths:\s*\{|"#[0-9a-f]{3,8}"\s*:/i);
  for (const [icon, vector] of Object.entries(QC_SCREEN_ICON_VECTORS)) {
    assert.ok(vector.layers.length > 0, `${icon} needs at least one ordered layer`);
    for (const layer of vector.layers) {
      assert.match(layer.role, /^captured\.[A-Za-z][A-Za-z0-9]*$/);
      const token = layer.role.slice("captured.".length) as keyof typeof QC_COLORS.captured;
      assert.equal(typeof QC_COLORS.captured[token], "string", `${icon} uses unknown theme role ${layer.role}`);
      assert.ok(layer.path.length >= 8, `${icon} contains empty vector geometry`);
    }
  }
});

test("screen controls use shared vectors and theme-owned fonts without character or raster fallbacks", () => {
  const sourceFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "apps/windows/src", "apps/android/src", "packages/typescript/qc-ui/src"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter((file) => /\.(?:css|ts|tsx)$/.test(file) && existsSync(file));
  const iconCharacter = /[▲▼►▶◀◁▷‹›⌄⌃⋮＋✕✓✔✚⏵⏴■↵⇥✎☆⌫◇♩▥⚙▤↑↓⏻↶↻◉♜▰◴◫♞▣]/u;
  const jsxIconCharacter = />\s*[→⏻]\s*</u;
  const literalFont = /(font(?:-family)?|fontFamily)\s*[:=][^;\n}]*(?:Arial|Roboto|Helvetica|Segoe UI|sans-serif|system-ui)/i;
  for (const file of sourceFiles) {
    assert.doesNotMatch(read(file), iconCharacter, `${file} must render controls through shared SVG glyph components`);
    if (/\.tsx?$/.test(file)) assert.doesNotMatch(read(file), jsxIconCharacter, `${file} must not render character glyphs as controls`);
    assert.doesNotMatch(read(file), literalFont, `${file} must use shared typography tokens`);
  }

  const imageOwners = sourceFiles.flatMap((file) => [...read(file).matchAll(/<img\b/g)].map(() => file));
  assert.deepEqual(imageOwners.sort(), [
    "apps/android/src/App.tsx",
    "apps/windows/src/chat-dock.tsx",
    "packages/typescript/qc-ui/src/assistant-chat-primitives.tsx",
    "packages/typescript/qc-ui/src/quad-cortex-surface.tsx"
  ], "only the app mark, neutral chassis asset, and user-supplied chat images may use img elements");
});

test("production and comparison screens cannot select alternate icon artwork", () => {
  const sourceFiles = execFileSync("git", ["ls-files", "--", "apps", "packages", "tests"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter((file) => /\.(?:ts|tsx)$/.test(file) && existsSync(file));
  const fixtureOnlyVariant = new RegExp(["official", "Raster"].join(""));
  for (const file of sourceFiles) {
    assert.doesNotMatch(read(file), fixtureOnlyVariant, `${file} must use the same canonical artwork in production and comparisons`);
  }

  const icons = read("packages/typescript/qc-ui/src/theme-icons.tsx");
  assert.match(icons, /export function QcScreenHeaderGlyph\(\{\s*kind,?\s*\}: \{\s*kind: QcScreenHeaderGlyphName;?\s*\}\)/s);
  assert.match(icons, /if \(kind === "save"\) return <path shapeRendering="crispEdges" fill=\{QC_COLORS\.captured\.primaryText\}/);
  assert.match(icons, /\| "cab-previous"\s*\| "cab-next"/s, "genuinely distinct contextual artwork must have semantic names");
});

test("Directory toolbar glyphs use shared colors and the exact device geometry", () => {
  const colors = JSON.parse(read("packages/typescript/qc-theme/src/colors.json"));
  assert.equal(colors.captured.iconPrimary, "#f8fcf8");
  assert.equal(colors.captured.iconToolbarMuted, "#606060");
  const icons = read("packages/typescript/qc-ui/src/theme-icons.tsx") + read("packages/typescript/qc-theme/src/screen-icon-vectors.ts");
  for (const path of [
    "M14 4H1v2h13V4Z",
    "M22 4.254c0 .259-.101.508-.281.695",
    "M10 2a8 8 0 1 0 4.914 14.314",
  ]) assert.ok(icons.includes(path), `missing exact Directory vector: ${path}`);
  assert.doesNotMatch(icons, /fill=["']#(?:fff|ffffff|616161)["']/i, "toolbar colors must come from the shared palette");
});

test("all canonical visual assets match the theme fingerprints", () => {
  for (const [name, asset] of Object.entries(QC_VISUAL_ASSETS)) {
    assert.equal(sha256(asset.sourcePath), asset.sha256, `${name}: ${asset.sourcePath}`);
  }
});

test("canonical asset sources are shared neutral vectors or fonts, never rasters", () => {
  const canonicalExtensions = /\.(?:svg|woff2?|ttf|otf)$/i;
  const rasterExtensions = /\.(?:png|ico|webp|jpe?g|gif|avif)$/i;
  const sourcePaths = Object.values(QC_VISUAL_ASSETS).map((asset) => asset.sourcePath.replaceAll("\\", "/"));
  assert.deepEqual(sourcePaths.sort(), [
    "packages/typescript/qc-theme/assets/app-icon.svg",
    "packages/typescript/qc-theme/assets/fonts/IBMPlexSans-Bold.ttf",
    "packages/typescript/qc-theme/assets/fonts/IBMPlexSans-Medium.ttf",
    "packages/typescript/qc-theme/assets/fonts/IBMPlexSans.ttf",
    "packages/typescript/qc-theme/assets/qc-chassis-neutral.svg",
  ]);
  for (const path of sourcePaths) {
    assert.match(path, canonicalExtensions, `${path} must be an SVG or font source`);
    assert.doesNotMatch(path, rasterExtensions, `${path} must not make a raster canonical`);
    assert.ok(path.startsWith("packages/typescript/qc-theme/"), `${path} must live in the shared theme package`);
  }
});

test("every tracked visual, font, audio, or video asset is owned by the theme manifest", () => {
  const visualFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "*.png", "*.svg", "*.ico", "*.webp", "*.jpg", "*.jpeg", "*.gif", "*.avif", "*.woff", "*.woff2", "*.ttf", "*.otf", "*.mp3", "*.wav", "*.ogg", "*.mp4", "*.webm"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean).map((file) => file.replaceAll("\\", "/")).filter(existsSync);
  const exact = new Set<string>();
  const prefixes: string[] = [];
  for (const asset of Object.values(QC_VISUAL_ASSETS)) {
    exact.add(asset.sourcePath);
    if ("derivedPathPrefixes" in asset) prefixes.push(...asset.derivedPathPrefixes);
  }
  for (const file of visualFiles) assert.ok(exact.has(file) || prefixes.some((prefix) => file.startsWith(prefix)), `${file} is not owned by qc-theme/src/assets.json`);
  for (const file of visualFiles.filter((path) => /\.(?:png|ico|webp|jpe?g|gif|avif)$/i.test(path))) {
    assert.ok(prefixes.some((prefix) => file.startsWith(prefix)), `${file} raster must be a declared generated platform output`);
  }
});

test("product visual assets have no byte-for-byte duplicates", () => {
  const visualFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "*.png", "*.svg", "*.ico", "*.webp", "*.jpg", "*.jpeg", "*.gif", "*.avif", "*.woff", "*.woff2", "*.ttf", "*.otf", "*.mp3", "*.wav", "*.ogg", "*.mp4", "*.webm"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean).map((file) => file.replaceAll("\\", "/"))
    .filter((file) => existsSync(file) && !file.startsWith("references/"));
  const owners = new Map<string, string>();
  for (const file of visualFiles) {
    const fingerprint = sha256(file);
    assert.ok(!owners.has(fingerprint), `${file} duplicates canonical asset ${owners.get(fingerprint)}`);
    owners.set(fingerprint, file);
  }
});

test("authored vector geometry has one owner", () => {
  const sourceFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "apps/**/*.tsx", "packages/**/*.tsx"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter((file) => Boolean(file) && existsSync(file));
  const owners = new Map<string, string>();
  for (const file of sourceFiles) {
    for (const match of read(file).matchAll(/\bd="([^"]{8,})"/g)) {
      const location = `${file}:${read(file).slice(0, match.index).split("\n").length}`;
      assert.ok(!owners.has(match[1]), `${location} duplicates vector geometry owned by ${owners.get(match[1])}`);
      owners.set(match[1], location);
    }
  }
  const registryFile = "packages/typescript/qc-theme/src/screen-icon-vectors.ts";
  const registrySource = read(registryFile);
  for (const match of registrySource.matchAll(/(?:\bpath:\s*|\bconst\s+\w+_PATH\s*=\s*)"([^"]{8,})"/g)) {
    const location = `${registryFile}:${registrySource.slice(0, match.index).split("\n").length}`;
    assert.ok(!owners.has(match[1]), `${location} duplicates vector geometry owned by ${owners.get(match[1])}`);
    owners.set(match[1], location);
  }
  const components = sourceFiles.flatMap((file) => [...read(file).matchAll(/function\s+(?:Qc)?DeviceGlyph\b/g)].map(() => file));
  assert.deepEqual(components, ["packages/typescript/qc-ui/src/device-glyph.tsx"]);
});

test("shared SVG controls cannot regress to CSS pseudo-icons", () => {
  const cssFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "apps/**/*.css", "packages/**/*.css"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter((file) => Boolean(file) && existsSync(file));
  const css = cssFiles.map((file) => read(file)).join("\n");
  assert.doesNotMatch(css, /\.(?:device-pin|editor-power-icon)(?:::|:(?:before|after))/i);
  assert.doesNotMatch(css, /\.nav-arrow\s*\{[^}]*\bborder-(?:left|right|top|bottom)\s*:/i);
  assert.doesNotMatch(css, /\.connection-chevron\s*\{[^}]*\bborder-(?:left|right|top|bottom)\s*:/i);

  const jsxFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "apps/**/*.tsx", "packages/**/*.tsx"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter((file) => Boolean(file) && existsSync(file));
  const jsx = jsxFiles.map((file) => read(file)).join("\n");
  assert.doesNotMatch(jsx, /className="editor-power-icon"/);
  assert.doesNotMatch(jsx, /className="device-pin"\s*\/>/);
  assert.doesNotMatch(jsx, /<span\b[^>]*className="nav-arrow[^"}]*"[^>]*\/>/);
});

test("every declared icon is wired outside its registry and audit gallery", () => {
  const iconFile = "packages/typescript/qc-ui/src/theme-icons.tsx";
  const iconSource = read(iconFile);
  const fixtureFile = "packages/typescript/qc-ui/src/coros-screen-fixtures.tsx";
  const fixtureSource = read(fixtureFile).split("function IconographyAuditFixture")[0];
  const authoredSource = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "packages/**/*.tsx"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter((file) => existsSync(file) && file !== iconFile && file !== fixtureFile && !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
    .map(read).concat(fixtureSource).join("\n");
  for (const union of iconSource.matchAll(/export type \w+(?:IconName|GlyphName)\s*=\s*([^;]+);/g)) {
    for (const variant of union[1].matchAll(/"([^"]+)"/g)) {
      assert.match(authoredSource, new RegExp(`["']${variant[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`), `${variant[1]} is declared but not wired`);
    }
  }
});

test("product branding has one shared owner across web and native hosts", () => {
  assert.equal(QC_BRAND.appName, "QC Remote");
  assert.equal(QC_BRAND.deviceName, "Quad Cortex");
  for (const file of ["apps/windows/src/main.tsx", "apps/android/src/main.tsx", "apps/android/src/App.tsx", "packages/typescript/qc-ui/src/quad-cortex-surface.tsx"]) {
    assert.match(read(file), /QC_BRAND/, `${file} must consume shared branding`);
    assert.doesNotMatch(read(file), /["'>]QC Remote(?:[<"']|\ssettings)/, `${file} must not duplicate the app name`);
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

test("launcher branding remains at the approved device-layout baseline", () => {
  const svg = read("packages/typescript/qc-theme/assets/app-icon.svg");
  const generator = read("scripts/generate-app-branding.ps1");
  assert.match(svg, /original top-down floor-modeler symbol/i);
  assert.match(svg, /eight footswitches/i);
  assert.match(generator, /assets\\app-icon\.svg/);
  assert.doesNotMatch(generator, /System\.Drawing|app-icon-source\.png/);
});

test("release apps default to the neutral chassis vector skin", () => {
  const formFactors = read("packages/typescript/qc-form-factors/src/index.ts");
  const android = read("apps/android/src/App.tsx");
  assert.match(formFactors, /defaultSkinId: "neutral-svg"/);
  assert.match(android, /entry\.id === formFactor\.defaultSkinId/);
  assert.doesNotMatch(android, /entry\.id === "neutral-svg"/);
  assert.match(formFactors, /QC Chassis Vector/);
  const assets = read("packages/typescript/qc-theme/src/assets.json");
  assert.match(assets, /QC Remote neutral chassis vector/);
  assert.doesNotMatch(assets, /qc-block-samples|blockSprite/);
});

test("authored app and device sources cannot bypass the shared visual contract", () => {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).trim().split(/\r?\n/)
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => /^(?:apps|packages|services|scripts|tools|contracts)\//.test(file))
    .filter((file) => existsSync(file))
    .filter((file) => /\.(?:css|html|java|json|mjs|ps1|py|rs|ts|tsx|xml)$/.test(file))
    .filter((file) => !file.startsWith("packages/typescript/qc-theme/"))
    .filter((file) => !file.startsWith("packages/typescript/qc-ui/src/official-") && !file.startsWith("packages/typescript/qc-ui/src/remaining-fixtures") && !file.endsWith("/coros-screen-fixtures.tsx") && !file.endsWith("/coros-capture-connections.css") && !file.endsWith("/fixture-live-surface.css") && !file.endsWith("/reference-parameter-editor.css") && !file.endsWith("/qc-device-typography.css") && !file.endsWith("/settings-system-panes.css"))
    .filter((file) => !/^tools\/capture_.*\.mjs$/.test(file))
    .filter((file) => file !== "tools/generate-third-party-inventory.mjs")
    .filter((file) => file !== "tools/sweep_qc_font.mjs")
    .filter((file) => file !== "tools/compare_qc_font_candidates.py")
    .filter((file) => file !== "apps/android/capacitor.config.json")
    .filter((file) => !file.includes("/tests/") && !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
    .filter((file) => !/generated[-_]/i.test(file) && !file.endsWith("package-lock.json"));
  const colorLiteral = /#[0-9a-f]{3,8}\b|rgba?\s*\(|hsla?\s*\(/i;
  const deployedAssetUrl = /url\([^)]*\.(?:svg|png|webp|jpe?g|ico)\b/i;
  const literalFontStack = /["'](?:Arial Narrow|Arial|Helvetica Neue|Helvetica|Roboto Condensed|Roboto|DM Mono|Cascadia Mono|IBM Plex Sans|Segoe UI Variable|Segoe UI|Inter|Consolas)["']|fontFamily=["']|android:fontFamily">\s*(?!@(?:string|font)\/)[^<]+/mi;
  const iconCharacter = /[▲▼►▶◀◁▷‹›⌄⌃⋮＋✕✓✔✚⏵⏴■↵⇥✎☆⌫◇♩▥⚙▤↑↓⏻]/u;
  const jsxIconCharacter = />\s*[→⏻]\s*</u;
  for (const file of files) {
    const fullSource = read(file);
    if (/Generated by scripts\//.test(fullSource.slice(0, 300))) continue;
    const source = file.endsWith(".rs") ? fullSource.split("#[cfg(test)]")[0] : fullSource;
    assert.doesNotMatch(source, colorLiteral, `${file} must use @qc-remote/theme colors`);
    assert.doesNotMatch(source, deployedAssetUrl, `${file} must use @qc-remote/theme asset tokens`);
    assert.doesNotMatch(source, literalFontStack, `${file} must use @qc-remote/theme typography`);
    if (file.endsWith(".css")) assert.doesNotMatch(source.replaceAll("--qc-transparent", ""), /\btransparent\b/i, `${file} must use the shared transparent token`);
    if (/\.tsx?$/.test(file) && !file.endsWith("theme-icons.tsx")) {
      assert.doesNotMatch(source, iconCharacter, `${file} must reference a shared vector glyph instead of an icon character literal`);
      assert.doesNotMatch(source, jsxIconCharacter, `${file} must not render character glyphs as controls`);
    }
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
