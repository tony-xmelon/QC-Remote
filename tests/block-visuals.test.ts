import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { demoSnapshot, type GridBlock } from "../packages/typescript/qc-client/src/index.ts";
import { blockUsesActiveFill, OFFICIAL_BLOCK_CATEGORIES, officialBlockVisual, pluginBadge, PUBLISHED_PLUGIN_BADGES, type OfficialBlockVisualKey } from "../packages/typescript/qc-ui/src/block-visuals.ts";

const block = (name: string, category: string, kind = "utility"): GridBlock => ({ id: name, name, category, kind, row: 0, column: 0 });

const expectedCategories: Array<[OfficialBlockVisualKey, string, string]> = [
  ["plugin", "Plugins", "#ff7000"], ["amp", "Amp", "#ff2727"], ["capture", "Neural Capture", "#959595"],
  ["cab", "Cab", "#6954ff"], ["overdrive", "Overdrive", "#ff7000"], ["delay", "Delay", "#00ffdd"],
  ["reverb", "Reverb", "#00ffdd"], ["compressor", "Compressor", "#45f862"], ["pitch", "Pitch", "#ffd236"],
  ["modulation", "Modulation", "#3500f1"], ["morph", "Morph", "#87daff"], ["synth", "Synth", "#e44a5d"],
  ["filter", "Filter", "#87daff"], ["equalizer", "Equalizer", "#0a74e0"], ["ir-loader", "IR Loader", "#6954ff"],
  ["wah", "Wah", "#959595"], ["fx-loop", "FX Loop", "#959595"], ["looper", "Looper", "#ff2727"],
  ["utility", "Utility", "#959595"]
];

test("official plugin-folder panels fill the physical framebuffer", () => {
  const css = readFileSync("packages/typescript/qc-ui/src/official-plugin-folders.css", "utf8");
  assert.match(css, /\.plugin-folders-official > main \{[^}]*position: absolute;[^}]*inset: 7\.5cqw 0 0;/s);
  assert.doesNotMatch(css, /\.plugin-folders-official > main \{[^}]*height:\s*51\.5cqw;/s);
});

test("official directory panels retain the measured bottom edge", () => {
  const css = readFileSync("packages/typescript/qc-ui/src/official-directory.css", "utf8");
  assert.match(css, /\.directory-official > main \{[^}]*position: absolute;[^}]*inset: 7\.5cqw 0 0;/s);
  assert.doesNotMatch(css, /\.directory-search-official > main \{[^}]*height:\s*51\.5cqw;/s);
  assert.match(css, /\.directory-official\.is-plugins > main \{[^}]*bottom: 1cqw;/s);
});

test("physical interaction fixtures preserve the captured CorOS overlay structures", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  const css = readFileSync("packages/typescript/qc-ui/src/fixture-live-surface.css", "utf8");
  const fixtureCss = readFileSync("packages/typescript/qc-ui/src/remaining-fixtures.css", "utf8");
  const remainingCss = readFileSync("packages/typescript/qc-ui/src/remaining-fixtures-fixes.css", "utf8");
  for (const marker of ["coros-physical-keyboard", "coros-physical-confirmation", "directory-context-scrim", "block-context-scrim"]) {
    assert.match(fixture, new RegExp(marker));
  }
  assert.match(fixture, /\["Edit", "Copy", "Cut", "Delete"\]/);
  assert.match(fixture, /DirectoryIcon kind="folder" number=\{4\}/);
  assert.match(fixture, /function PhysicalDirectoryStatusIcon/);
  assert.match(fixture, /function PluginLockIcon/);
  assert.match(fixture, /className="physical-preset-name">\{`2\$\{String\.fromCharCode\(65 \+ index\)\} \$\{name\}`\}/);
  assert.match(fixture, /"Save Current Parameters as\.\.\."/);
  assert.match(fixture, /function BlockContextIcon/);
  assert.match(fixture, /className="physical-eq-grid"/);
  for (const kind of ["change", "copy", "paste", "reset", "save", "expression", "bypass"]) {
    assert.match(fixture, new RegExp(`\\["${kind}"`));
  }
  assert.match(fixture, /dy=\{browserChrome \? -11 : 0\}/);
  assert.match(css, /\.qc-screen\.coros-block-context > aside \{[^}]*left: 30px;[^}]*width: 322px;/s);
  assert.match(css, /\.qc-screen\.coros-block-context > aside button \{[^}]*grid-template-columns: 57px 1fr;[^}]*font: 16px var\(--qc-font-device-plain\);/s);
  assert.match(css, /\.coros-block-context > \.block-context-scrim \{[^}]*rgba\(71,74,71,\.92\)/s);
  assert.match(css, /\.coros-block-context > aside button span svg \{[^}]*width: 24px;[^}]*height: 24px;/s);
  assert.match(css, /\.physical-eq-underlay header nav \.physical-eq-confirm \{[^}]*width: 98px;/s);
  assert.match(css, /\.physical-eq-underlay footer::before \{[^}]*top: -45px;/s);
  assert.match(css, /\.coros-directory-fixture \.directory-item-menu \{[^}]*left: 528px;[^}]*width: 256px;[^}]*height: 208px;/s);
  assert.match(css, /\.coros-directory-fixture\.is-physical-context > header > button:last-child \{[^}]*left: 694px;[^}]*width: 98px;[^}]*min-width: 98px;/s);
  assert.match(css, /\.coros-directory-fixture\.is-physical-context \.directory-fixture-items \{[^}]*gap: 0;/s);
  assert.match(css, /\.directory-fixture-folders \.folder-number \{[^}]*fill: #202421;[^}]*stroke: none;/s);
  assert.match(css, /\.directory-item-menu button:nth-child\(4\) \{[^}]*translateY\(-6px\)/s);
  assert.match(css, /\.coros-physical-confirmation > aside \{[^}]*left: 190px;[^}]*width: 420px;[^}]*height: 230px;/s);
  assert.match(css, /\.physical-keyboard-rows button \{[^}]*background: #212421;/s);
  assert.match(remainingCss, /\.splitter-panel>header>svg\{transform:translate\(-1\.625cqw,\.25cqw\)\}/);
  assert.match(remainingCss, /\.coros-splitter-physical:not\(\.coros-mixer-physical\) \.splitter-knob\{left:73\.375%;top:4\.5cqw;/);
  assert.match(remainingCss, /repeating-linear-gradient\(to bottom,#212421 0 \.5cqw,transparent \.5cqw 1\.25cqw\)/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.browser-fixture-panel>nav button\.is-active\{background:#181c18\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.browser-fixture-panel>nav button\.is-active i\{[^}]*background:#000;/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-license-lock svg[^}]*\{fill:currentColor;stroke:none\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-license-lock\{width:2\.5cqw;height:3\.25cqw;transform:translateX\(1px\)\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-grid-underlay main::before\{left:6\.875cqw\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-grid-underlay \.underlay-plus\{width:8\.375cqw\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-grid-underlay \.underlay-add\{left:40\.25cqw;top:12cqw;width:8\.75cqw;height:8\.875cqw\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-grid-underlay main i:not\(\.underlay-input\)::before\{width:3cqw;height:2px\}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-physical:not\(\.is-official-factory\):not\(\.is-official-actions\) section:nth-child\(2\) header \.preset-close\{[^}]*translateX\(\.25cqw\);font-size:0\}/);
  assert.match(fixtureCss, /\.input-gate-grid h1 \{[^}]*margin: 1\.625cqw 0 0 1\.575cqw;/s);
});

test("framebuffer capture drivers disable host LCD text artifacts", () => {
  for (const path of ["tools/capture_windows_ui.mjs", "tools/capture_android_ui.mjs", "tools/capture_qc_official_manual_ui.mjs"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /args: \["--disable-lcd-text"\]/, `${path} must use grayscale glyph antialiasing`);
    assert.match(source, /getSelection\(\)\?\.removeAllRanges\(\)/, `${path} must clear browser selection chrome`);
  }
});

test("official tuner retains the measured 440 Hz encoder geometry", () => {
  const css = readFileSync("packages/typescript/qc-ui/src/official-tuner.css", "utf8");
  assert.match(css, /\.tuner-official \.tuner-frequency > i \{[^}]*top: \.55cqw;[^}]*width: 7\.75cqw;[^}]*height: 7\.75cqw;/s);
  assert.match(css, /\.tuner-official > footer > section:last-child label \{[^}]*padding-left: 5\.5cqw;[^}]*translateY\(1\.25cqw\)/s);
  assert.match(css, /\.tuner-official > footer > section:last-child::before \{[^}]*left: 2cqw;[^}]*width: 3cqw;[^}]*height: 6cqw;/s);
  assert.match(css, /\.tuner-official > footer > section:last-child::after \{[^}]*border: \.375cqw solid #40f860;/s);
});

test("official device-preset actions use the shared sixth category glyph", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  const css = readFileSync("packages/typescript/qc-ui/src/official-device-browser.css", "utf8");
  assert.match(fixture, /categories\.map[\s\S]*?<DeviceCategoryGlyph label=\{label\}/);
  assert.doesNotMatch(css, /data:image\/svg\+xml|nth-child\(6\) i > span/);
});

test("official low-score refinements retain their measured geometry and glyphs", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  const screenGlyphs = readFileSync("packages/typescript/qc-ui/src/screen-glyphs.tsx", "utf8");
  const themeIcons = readFileSync("packages/typescript/qc-ui/src/theme-icons.tsx", "utf8");
  const browserCss = readFileSync("packages/typescript/qc-ui/src/official-device-browser.css", "utf8");
  const gigCss = readFileSync("packages/typescript/qc-ui/src/official-gig.css", "utf8");
  const ioCss = readFileSync("packages/typescript/qc-ui/src/official-io.css", "utf8");
  const captureCss = readFileSync("packages/typescript/qc-ui/src/official-looper-eq.css", "utf8");
  const settingsCss = readFileSync("packages/typescript/qc-ui/src/official-settings-device.css", "utf8");
  const remainingCss = readFileSync("packages/typescript/qc-ui/src/remaining-fixtures-fixes.css", "utf8");
  assert.match(browserCss, /\.device-browser-official:not\(\.is-plugins\) nav button:nth-child\(2\) svg \{ transform: scale\(1\.07, 1\.23\); \}/);
  assert.match(browserCss, /\.device-browser-official:not\(\.is-plugins\) nav button\.is-active i \{ border-color: #f82420; background: #101010; \}/);
  assert.match(browserCss, /\.device-browser-official:not\(\.is-plugins\) \.device-browser-grid main i:first-of-type \{ background: #101010; \}/);
  assert.match(browserCss, /\.device-browser-official:not\(\.is-plugins\) \.device-browser-list > button \{ padding-left: 2\.125cqw;[^}]*font-size: 2cqw; \}/);
  assert.match(browserCss, /\.device-browser-grid \.amp-mode > svg \{[^}]*width: 2\.875cqw;[^}]*height: 2\.875cqw;/);
  assert.match(browserCss, /\.device-browser-grid \.amp-mode > span \{[^}]*left: 4\.5cqw;[^}]*font: 700 3cqw\/1/);
  assert.match(browserCss, /\.device-browser-grid main i:first-of-type \{[^}]*height: 8\.875cqw;/);
  assert.match(browserCss, /\.device-browser-official\.is-plugins \.device-browser-list header \{ background: #101010; color: #b0b4b0; \}/);
  assert.match(browserCss, /\.device-browser-official\.is-plugins nav button\.is-active i \{ border-color: #40f860; \}/);
  assert.match(browserCss, /\.device-browser-official\.is-plugins \.device-browser-grid \.grid-block\.b2 \{ border-color: #804c48; \}/);
  assert.match(browserCss, /\.device-browser-official\.is-plugins \.device-browser-grid \.grid-block\.b6 \{ border-color: #408878; \}/);
  assert.match(browserCss, /\.device-browser-official:not\(\.is-plugins\) \.device-browser-grid main i:nth-of-type\(1\)::before,[\s\S]*?width: 3cqw; height: 2px; background: #909790;/);
  assert.match(browserCss, /\.device-browser-official:not\(\.is-plugins\) \.device-browser-grid main i:nth-of-type\(1\)::after,[\s\S]*?width: 2px; height: 3cqw; background: #909790;/);
  assert.match(gigCss, /\.gig-official\.is-stomp \.gig-official-tiles article:nth-child\(1\) > b::after,[\s\S]*?top: calc\(50% - \.25cqw\); height: 1px; background: #c0c0c0;/);
  assert.match(fixture, /\{ id: "send-return", label: "", sub: "MIDI OUT", kind: "midi" \}/);
  assert.match(fixture, /\{ id: "send-return", label: "", sub: "MIDI IN", kind: "midi" \}/);
  assert.match(ioCss, /\.coros-io-settings:not\(\.is-usb\) \.io-ports button:nth-child\(1\) > i \{ color: #f8fcf8; \}/);
  assert.match(ioCss, /\.coros-io-settings > header \{[^}]*background: #101010;/);
  assert.match(fixture, /className="capture-level-label"><IoHeadphonesGlyph \/>LEVEL/);
  assert.match(captureCss, /\.capture-official-result \.capture-result-actions \.capture-target-icon \{ transform: translateY\(-1\.625cqw\); \}/);
  assert.match(captureCss, /\.capture-official-result > main > section:last-child > button \{ transform: translateY\(\.5cqw\); \}/);
  assert.match(captureCss, /\.capture-official-progress \.capture-official-progress-bar b \{ width: 31\.25%; \}/);
  assert.match(captureCss, /\.capture-official-progress section > em \{[^}]*width: 2\.75cqw;[^}]*border-top-color: #eee;[^}]*rotate\(-17deg\)/);
  assert.match(captureCss, /\.capture-official-progress > main > nav div:last-child b \{ color: #eee; \}/);
  assert.match(captureCss, /\.coros-global-eq \.global-eq-tabs \{ height: 10\.42%; \}/);
  assert.match(captureCss, /\.global-eq-controls \{ margin-top: \.5cqw; \}/);
  assert.match(captureCss, /\.global-eq-controls \.io-dial-wrap \{ inset: 4\.625cqw 1cqw auto; height: 8cqw; \}/);
  assert.match(settingsCss, /\.coros-settings-official\.settings-system,\.coros-settings-official\.settings-system \* \{ font-family: var\(--qc-font-device-plain\); \}/);
  assert.match(settingsCss, /\.coros-settings-official\.settings-system > main > nav button\.is-active \{ background: #181c18; color: #40f860; \}/);
  assert.match(settingsCss, /\.coros-settings-official\.settings-system \.settings-system-detail > div i b\.is-on \{ background: #40f860; \}/);
  assert.match(fixture, /function CorOsCapturedSettings[\s\S]*?className=\{`qc-screen coros-settings-official coros-settings-captured/);
  assert.match(fixture, /\["DSP Diagnostics", "Footswitch Statistics", "USB Statistics"\]/);
  assert.match(fixture, /\["presets", "My Presets", "270\/3072", 9\]/);
  assert.match(fixture, /const SUPPORT_QR = \[[\s\S]*?"11111111011111001101011111111"/);
  assert.match(settingsCss, /\.storage-captured > div > span \{ height: 7\.625cqw;/);
  assert.match(settingsCss, /\.support-qr \{[^}]*grid-template-columns: repeat\(29, \.375cqw\);/);
  assert.match(settingsCss, /\.settings-support \.captured-settings-detail > h1 \{ margin-bottom: 2\.125cqw; \}/);
  assert.match(settingsCss, /\.settings-info \.captured-settings-detail > h1:nth-of-type\(2\) \{ margin-bottom: 2\.5cqw; \}/);
  assert.match(settingsCss, /\.settings-info \.information-table:last-child > span:nth-child\(2\),[\s\S]*?min-height: 6\.125cqw;/);
  assert.match(settingsCss, /\.coros-settings-captured \.settings-edit > svg \{ width: 3cqw; height: 3cqw;/);
  assert.match(fixture, /className="settings-edit"[\s\S]*?<QcScreenGlyph kind="edit" \/>/);
  assert.match(screenGlyphs, /kind === "edit"[\s\S]*?M11 14 20 5l-3-3-9 9-1 4 4-1Z/);
  assert.match(captureCss, /\.global-eq-controls \.io-dial \{ right: -\.1875cqw; width: 8\.375cqw; height: 8\.375cqw; \}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-factory section:nth-child\(2\) header \.preset-close\{[^}]*transform:translateX\(\.75cqw\);font-size:0\}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-factory section:nth-child\(2\) header \.preset-confirm\{[^}]*transform:translateX\(\.25cqw\);font-size:0\}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-actions::after\{[^}]*background:transparent;/);
  assert.match(remainingCss, /\.qc-screen\.coros-device-presets\.is-official-actions,\.coros-device-presets\.is-official-actions>nav\{background:#1e1e1e\}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-actions>main>section,\.coros-device-presets\.is-official-actions section>button\{background:#2e2e2e\}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-factory section:first-child header button\.is-active::before\{[^}]*background:#f8d030;/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-factory section:nth-child\(2\) header \.preset-confirm\{background:#1838f8\}/);
  assert.match(fixture, /function DevicePresetGlyph\(\)[\s\S]*?<QcPresetStackIcon \/>/);
  assert.match(themeIcons, /function QcPresetStackIcon\(\)[\s\S]*?<path d="m12 3 8 4-8 4-8-4 8-4Zm8 8-8 4-8-4m16 4-8 4-8-4" \/>/);
  assert.match(fixture, /get\("tempoState"\) === "official"/);
  assert.match(fixture, /beat === \(official \? 1 : 0\)/);
  assert.match(fixture, /className=\{official \? "is-active" : ""\} \/>Global/);
  assert.match(fixture, /className=\{official \? "" : "is-active"\} \/>Preset/);
  assert.match(remainingCss, /\.coros-tempo\.tempo-official>header \.tempo-scene\{display:none\}/);
  assert.match(remainingCss, /\.coros-tempo:not\(\.tempo-official\)>header button\{margin-left:2\.25cqw\}/);
  assert.match(remainingCss, /\.tempo-official \.tempo-display i:nth-child\(3\)::after\{content:"";/);
});

test("official MIDI Out retains the measured disabled header action", () => {
  const css = readFileSync("packages/typescript/qc-ui/src/official-settings-midi.css", "utf8");
  const fixtureCss = readFileSync("packages/typescript/qc-ui/src/remaining-fixtures-fixes.css", "utf8");
  assert.match(css, /\.coros-midi-out > header > span \{[^}]*translateY\(-1px\)/);
  assert.match(css, /\.coros-midi-out > header \.midi-trash \{[^}]*width: 8\.25cqw;[^}]*translateX\(-\.375cqw\);[^}]*background: #101510;/);
  assert.match(fixtureCss, /\.coros-midi-out \.midi-expression label div\{[^}]*clip-path:polygon\(1% 0,99% 0,100% 2%,91% 98%,89% 100%,11% 100%,9% 98%,0 2%\)/);
  assert.match(fixtureCss, /\.coros-midi-out \.midi-expression label div>i\{[^}]*left:\.75cqw;right:\.75cqw;[^}]*clip-path:polygon/);
});

test("official System brightness values remain right-aligned", () => {
  const css = readFileSync("packages/typescript/qc-ui/src/official-settings-device.css", "utf8");
  assert.match(css, /\.settings-system-detail > div span \{ position: relative; top: 1\.375cqw; \}/);
  assert.match(css, /\.settings-system-detail > div strong \{ position: absolute; right: 1\.75cqw; top: 1\.375cqw; \}/);
});

test("runtime block glyphs use only the shared neutral vector registry", () => {
  const renderer = readFileSync("packages/typescript/qc-ui/src/device-glyph.tsx", "utf8");
  const registry = readFileSync("packages/typescript/qc-ui/src/device-category-glyph.tsx", "utf8");
  assert.match(renderer, /<QcDeviceCategoryGlyph\b/);
  assert.doesNotMatch(renderer + registry, /<image\b|data:image|base64|QC_VISUAL_ASSETS|REFERENCE_BLOCK_ICONS/);
  for (const [, label] of expectedCategories) assert.match(registry, new RegExp(`label === "${label}"`));
});

test("plugin badges are generated overlays, separate from base block vectors", () => {
  const renderer = readFileSync("packages/typescript/qc-ui/src/device-glyph.tsx", "utf8");
  const categories = readFileSync("packages/typescript/qc-ui/src/device-category-glyph.tsx", "utf8");
  const badges = readFileSync("packages/typescript/qc-ui/src/plugin-badge-glyph.tsx", "utf8");
  const catalog = readFileSync("packages/typescript/qc-ui/src/plugin-badges.ts", "utf8");
  assert.match(renderer, /<QcPluginBadgeGlyph abbreviation=\{badge\}/);
  assert.doesNotMatch(categories, /official-plugin-badge|abbreviation|PUBLISHED_PLUGIN_BADGES/);
  assert.match(badges, /<rect[\s\S]*<text/);
  assert.match(catalog, /export const PUBLISHED_PLUGIN_BADGES/);
});

test("Morph, Filter, Utility Gate, and Pitch remain attached to the right shared glyph", () => {
  assert.equal(officialBlockVisual(block("Freeze", "Morph")).key, "morph");
  assert.equal(officialBlockVisual(block("Envelope Filter", "Filter")).key, "filter");
  assert.equal(officialBlockVisual(block("Adaptive Gate", "Utility")).key, "utility");
  assert.equal(officialBlockVisual(block("Dual Octaver", "Pitch")).key, "pitch");
});

test("category registry matches the complete CorOS manual order, icon, color, and meaning", () => {
  assert.equal(OFFICIAL_BLOCK_CATEGORIES.length, 19);
  assert.deepEqual(
    OFFICIAL_BLOCK_CATEGORIES.map(({ key, label, color }) => [key, label, color]),
    expectedCategories
  );
  for (const category of OFFICIAL_BLOCK_CATEGORIES) assert.ok(category.meaning.length > 12, `${category.label} needs a meaning`);
});

test("official category mapping covers every Quad Cortex virtual-device family", () => {
  const names = [
    "Plugin Device", "US DLX", "Capture", "112 US DLX", "Rodent Drive", "Analog Delay", "Mind Hall",
    "Jewel", "Poly Octaver", "Phaser", "Freeze", "Synth", "Envelope", "Parametric-8", "IR",
    "Crying Wah", "FX Loop 2", "Looper X", "Gain"
  ];
  expectedCategories.forEach(([expected, category], index) => {
    assert.equal(officialBlockVisual(block(names[index], category)).key, expected, `${category} should use ${expected}`);
  });
});

test("category aliases keep device-list terminology attached to the correct family", () => {
  const cases: Array<[string, string, OfficialBlockVisualKey]> = [
    ["Chief Fuzz", "Fuzz pedals", "overdrive"],
    ["Graphic-9", "Equalizer", "equalizer"],
    ["Vintage Tremolo", "Mod", "modulation"],
    ["Dual Octaver", "", "pitch"],
    ["Plugin Device", "Plugins", "plugin"],
    ["Looper X", "Looper", "looper"]
  ];
  for (const [name, category, expected] of cases) assert.equal(officialBlockVisual(block(name, category)).key, expected);
});

test("Adaptive Gate uses official gray Utility artwork rather than the yellow Pitch glyph", () => {
  const visual = officialBlockVisual(block("Adaptive Gate", "Utility"));
  assert.equal(visual.key, "utility");
  assert.equal(visual.color, "#959595");
});

test("only enabled plugin devices use Cortex Control's colored interior fill", () => {
  assert.equal(blockUsesActiveFill({ ...block("British 2203", "Amp", "amp"), plugin: false }), false);
  assert.equal(blockUsesActiveFill({ ...block("Plugin Amp", "Amp", "amp"), plugin: true }), true);
  assert.equal(blockUsesActiveFill({ ...block("Plugin Device", "Plugins"), bypassed: false }), true);
  assert.equal(blockUsesActiveFill({ ...block("Plugin Device", "Plugins"), plugin: true, bypassed: true }), false);
});

test("all published CorOS 4.1 plugins use Cortex Control's exact Grid abbreviations", () => {
  const expected = new Map([
    ["plini-x", "PLI"], ["gojira-x", "GOJ"], ["slo100-x", "SLO"], ["nameless-x", "NAM"],
    ["cory-x", "WON"], ["nolly-x", "NLY"], ["parallax-x", "PLX"], ["mayer-x", "MAY"],
    ["petrucci-x", "PET"], ["misha-x", "MSH"], ["rabea-x", "RAB"], ["henson-x", "HEN"]
  ]);
  assert.equal(PUBLISHED_PLUGIN_BADGES.length, expected.size);
  for (const [pluginId, abbreviation] of expected) {
    assert.equal(pluginBadge({ ...block("Generic plugin device", "Amp", "amp"), plugin: true, pluginId }), abbreviation);
  }
  assert.equal(pluginBadge({ ...block("Plini Drive", "Overdrive"), plugin: false, pluginId: "plini-x" }), undefined);
});

test("the reference registry includes all 19 categories and all official Grid colors", () => {
  assert.deepEqual(OFFICIAL_BLOCK_CATEGORIES.map(({ key }) => key), expectedCategories.map(([key]) => key));
  assert.deepEqual(new Set(OFFICIAL_BLOCK_CATEGORIES.map(({ color }) => color)), new Set([
    "#ff7000", "#ff2727", "#959595", "#6954ff", "#ffd236", "#00ffdd",
    "#45f862", "#3500f1", "#e44a5d", "#87daff", "#0a74e0"
  ]));
});

test("the startup reference preset begins with the Gate shown first in Brit 2203", () => {
  const firstEffect = demoSnapshot.blocks.find((item) => item.kind !== "input" && item.kind !== "output");
  assert.equal(firstEffect?.name, "Adaptive Gate");
  assert.equal(firstEffect && officialBlockVisual(firstEffect).key, "utility");
});

test("all 272 catalog devices resolve to their official category artwork", () => {
  const audit = JSON.parse(readFileSync("docs/reference/qc-parameter-catalog.json", "utf8")) as {
    models: Array<{ id: number; name: string; category: string }>;
  };
  const categoryKeys: Record<string, OfficialBlockVisualKey> = {
    "Bass Amplifier": "amp",
    "Bass Overdrive": "overdrive",
    Compressor: "compressor",
    Delay: "delay",
    Equalizer: "equalizer",
    Filter: "filter",
    "FX Loop": "fx-loop",
    "Guitar Amplifier": "amp",
    "Guitar Overdrive": "overdrive",
    IRLoaders: "ir-loader",
    Loopers: "looper",
    Modulation: "modulation",
    Morph: "morph",
    Pitch: "pitch",
    Reverb: "reverb",
    Synth: "synth",
    Utility: "utility",
    Wah: "wah"
  };
  assert.equal(audit.models.length, 272);
  for (const model of audit.models) {
    const expected = categoryKeys[model.category];
    assert.ok(expected, `catalog category ${model.category} needs an explicit visual mapping`);
    assert.equal(officialBlockVisual(block(model.name, model.category)).key, expected, `${model.id} ${model.name}`);
  }
});
