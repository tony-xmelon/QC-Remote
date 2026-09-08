import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { demoSnapshot, type GridBlock } from "../packages/typescript/qc-client/src/index.ts";
import { blockUsesActiveFill, OFFICIAL_BLOCK_CATEGORIES, officialBlockVisual, pluginBadge, PUBLISHED_PLUGIN_BADGES, type OfficialBlockVisualKey } from "../packages/typescript/qc-ui/src/block-visuals.ts";

const block = (name: string, category: string, kind = "utility"): GridBlock => ({ id: name, name, category, kind, row: 0, column: 0 });

const expectedCategories: Array<[OfficialBlockVisualKey, string, [number, number], string]> = [
  ["plugin", "Plugins", [560, 0], "#ff7000"],
  ["amp", "Amp", [480, 0], "#ff2727"],
  ["capture", "Neural Capture", [640, 0], "#959595"],
  ["cab", "Cab", [80, 82], "#6954ff"],
  ["overdrive", "Overdrive", [400, 0], "#ff7000"],
  ["delay", "Delay", [240, 0], "#00ffdd"],
  ["reverb", "Reverb", [240, 82], "#00ffdd"],
  ["compressor", "Compressor", [400, 82], "#45f862"],
  ["pitch", "Pitch", [0, 82], "#ffd236"],
  ["modulation", "Modulation", [160, 0], "#3500f1"],
  ["morph", "Morph", [560, 82], "#87daff"],
  ["synth", "Synth", [480, 82], "#e44a5d"],
  ["filter", "Filter", [240, 0], "#87daff"],
  ["equalizer", "EQ", [80, 0], "#0a74e0"],
  ["ir-loader", "IR Loader", [160, 82], "#6954ff"],
  ["wah", "Wah", [320, 82], "#959595"],
  ["fx-loop", "FX Loop", [0, 0], "#959595"],
  ["looper", "Looper", [320, 0], "#ff2727"],
  ["utility", "Utility", [400, 82], "#959595"]
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
  // The device's item menu carries a Paste entry between Cut and Delete;
  // `directory-item-context.tree.txt` is the evidence.
  assert.match(fixture, /\["Edit", "Copy", "Cut", "Paste to replace", "Delete"\]/);
  assert.match(fixture, /DirectoryIcon kind="folder" number=\{4\}/);
  // Six directory frames show a plain white cloud-upload in that header slot;
  // the red signal-error glyph this used to draw is on none of them.
  assert.match(fixture, /itemContext \? <DirectoryIcon kind="cloud-upload" \/> : "☁"/);
  assert.doesNotMatch(fixture, /PhysicalDirectoryStatusIcon/);
  assert.match(fixture, /function PluginLockIcon/);
  // Every physical directory frame was captured in bank 4 of My Presets.
  assert.match(fixture, /className="physical-preset-name">\{`4\$\{String\.fromCharCode\(65 \+ index\)\} \$\{name\}`\}/);
  assert.match(fixture, /"Save Current Parameters as\.\.\."/);
  assert.match(fixture, /function BlockContextIcon/);
  // block-context.png shows the Grid above an editor action bar with an empty
  // parameter area below - not the full-screen EQ editor this used to draw,
  // which is a real CorOS layout but not the one behind this menu.
  assert.match(fixture, /physical-grid-underlay/);
  // scene-assignment.png and stomp-assignment.png draw the same Grid and
  // action bar, so all three share one component.
  assert.match(fixture, /<PhysicalEditorUnderlay slot="4" letter="E" title="QC MCP TEST_2" mode="PRESET" \/>/);
  assert.doesNotMatch(fixture, /physical-eq-/);
  for (const kind of ["change", "copy", "paste", "reset", "save", "expression", "bypass"]) {
    assert.match(fixture, new RegExp(`\\["${kind}"`));
  }
  assert.match(fixture, /dy=\{browserChrome \? -11 : 0\}/);
  assert.match(css, /\.qc-screen\.coros-block-context > aside \{[^}]*left: 32px;[^}]*width: 320px;/s);
  assert.match(css, /\.qc-screen\.coros-block-context > aside button \{[^}]*grid-template-columns: 57px 1fr;[^}]*font: 16px Roboto,Arial,sans-serif;/s);
  // Fitted over five elements in block-context.png whose undimmed colours are
  // known: rgba(71,74,71,.92) reproduced the page background exactly and
  // crushed everything brighter, which no check caught because none looked
  // past the background.
  assert.match(css, /\.coros-block-context > \.block-context-scrim \{[^}]*rgba\(85,88,85,\.72\)/s);
  assert.match(css, /\.coros-block-context > aside button span svg \{[^}]*width: 24px;[^}]*height: 24px;/s);
  assert.match(css, /\.physical-grid-underlay \.underlay-grid \{[^}]*height: 196px;/s);
  assert.match(css, /\.underlay-editor-bar \{[^}]*right: 8px;[^}]*top: 204px;[^}]*height: 44px;/s);
  // editor-parametric-8.png separates the tab strip from the parameter cards
  // with a 2px gap of page background, not with a rule 45px above the footer;
  // nothing is drawn at that height in it or in either block-context frame.
  assert.doesNotMatch(css, /\.physical-eq-underlay/);
  // Measured from references/qc-ui-corpus/coros-4.1.0/directory-item-context.png:
  // the menu is bottom-anchored at y=472 and the device's five items make it
  // 260 tall, not the 208 a four-item menu would be.
  assert.match(css, /\.coros-directory-fixture \.directory-item-menu \{[^}]*left: 528px;[^}]*width: 256px;[^}]*height: 260px;/s);
  assert.match(css, /\.coros-directory-fixture\.is-physical-context > header > button:last-child \{[^}]*left: 694px;[^}]*width: 98px;[^}]*min-width: 98px;/s);
  assert.match(css, /\.coros-directory-fixture\.is-physical-context \.directory-fixture-items \{[^}]*gap: 0;/s);
  assert.match(css, /\.directory-fixture-folders \.folder-number \{[^}]*fill: #202421;[^}]*stroke: none;/s);
  // directory-item-context.png puts the five entries on one 52px pitch, which
  // is exactly the 260px menu divided by five; the 54px buttons overran it and
  // three per-entry nudges were hiding the difference.
  assert.match(css, /\.coros-directory-fixture \.directory-item-menu button \{[^}]*height: 52px;/s);
  assert.doesNotMatch(css, /\.directory-item-menu button:nth-child\([235]\) \{[^}]*translateY/s);
  assert.match(css, /\.coros-physical-confirmation > aside \{[^}]*left: 190px;[^}]*width: 420px;[^}]*height: 230px;/s);
  assert.match(css, /\.physical-keyboard-rows button \{[^}]*background: #212421;/s);
  assert.match(remainingCss, /\.splitter-panel>header>svg\{transform:translate\(-1\.625cqw,\.25cqw\)\}/);
  assert.match(remainingCss, /\.coros-splitter-physical:not\(\.coros-mixer-physical\) \.splitter-knob\{left:73\.375%;top:4\.5cqw;/);
  assert.match(remainingCss, /repeating-linear-gradient\(to bottom,#212421 0 \.5cqw,transparent \.5cqw 1\.25cqw\)/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.browser-fixture-panel>nav button\.is-active\{background:#181c18\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.browser-fixture-panel>nav button\.is-active i\{[^}]*background:#102818;/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-license-lock svg[^}]*\{fill:currentColor;stroke:none\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-license-lock\{width:2\.5cqw;height:3\.25cqw;transform:translateX\(1px\)\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-grid-underlay main::before\{left:6\.875cqw\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-grid-underlay \.underlay-plus\{width:8\.375cqw\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-grid-underlay \.underlay-add\{left:40\.25cqw;top:12cqw;width:8\.75cqw;height:8\.875cqw\}/);
  assert.match(remainingCss, /\.is-physical-plugin-list \.plugin-grid-underlay main i:not\(\.underlay-input\)::before\{width:3cqw;height:2px\}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-physical:not\(\.is-official-factory\):not\(\.is-official-actions\) section:nth-child\(2\) header \.preset-close\{[^}]*translateX\(\.25cqw\);font-size:0\}/);
  // input-gate-control.png draws the preset name nearly as large as the number
  // - cap rows 31..74 against the number's 28..76 - not the half-height face a
  // 4.45cqw h1 produces, and it draws the letter blue rather than red.
  assert.match(fixtureCss, /\.input-gate-grid h1 \{[^}]*margin: \.75cqw 0 0 1\.575cqw;[^}]*font-size: 7\.25cqw;/s);
  assert.match(fixtureCss, /\.input-gate-grid > header > strong \{[^}]*color: #69b5d4;/s);
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
  // The LIVE TUNER track and its selection ring are measured against
  // tuner.png and tuner-live-enabled.png by tools/verify_screen_geometry.py.
  // The encoder itself is not: we draw it as a gradient annulus and the device
  // draws a ring with a pointer, so the two have no shared boundary to compare
  // at this precision. Its numbers below are a pin, not evidence.
  assert.match(css, /\.tuner-official \.tuner-frequency > i \{[^}]*top: \.55cqw;[^}]*width: 7\.75cqw;[^}]*height: 7\.75cqw;/s);
  assert.match(css, /\.tuner-official > footer > section:last-child label \{[^}]*padding-left: 5\.5cqw;[^}]*translateY\(1\.25cqw\)/s);
  assert.match(css, /\.tuner-official > footer > section:last-child::before \{[^}]*left: 2cqw;[^}]*width: 3cqw;[^}]*height: 6cqw;/s);
  assert.match(css, /\.tuner-official > footer > section:last-child::after \{[^}]*border: \.375cqw solid #40f860;/s);
});

test("official device-preset actions draw the observed sixth category glyph", () => {
  const css = readFileSync("packages/typescript/qc-ui/src/official-device-browser.css", "utf8");
  assert.match(css, /\.coros-device-presets\.is-official-actions > nav button:nth-child\(6\) i > span \{[^}]*width: 5cqw;[^}]*data:image\/svg\+xml/);
  // official-device-preset-actions.png draws Reverb as two squares joined at
  // their corners - a cabinet projection with a square 30x30 ink box - not the
  // isometric hexagon that used to stand here, which would paint 30x33.5.
  for (const path of ["M5 12h15v15H5z", "M12.5 4.5h15v15h-15z"]) {
    assert.ok(css.includes(path), `the Reverb glyph must draw ${path}`);
  }
  assert.doesNotMatch(css, /M5 10 16 4l11 6v13l-11 6-11-6Z/);
});

test("official low-score refinements retain their measured geometry and glyphs", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  const officialManifest = readFileSync("references/qc-ui-official-manual/coros-4.1.0/manifest.json", "utf8");
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
  assert.match(browserCss, /\.device-browser-grid \.amp-mode::before \{[^}]*width: 2\.875cqw;[^}]*height: 2\.875cqw;[^}]*data:image\/svg\+xml/);
  assert.match(browserCss, /\.device-browser-grid \.amp-mode::after \{[^}]*content: "PRESET";[^}]*left: 4\.5cqw;/);
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
  assert.match(fixture, /className="capture-level-label">\s*<IoHeadphonesGlyph \/>\s*LEVEL/);
  assert.match(captureCss, /\.capture-official-result \.capture-result-actions \.capture-target-icon \{ transform: translateY\(-1\.625cqw\); \}/);
  assert.match(captureCss, /\.capture-official-result > main > section:last-child > button \{ transform: translateY\(\.5cqw\); \}/);
  assert.match(captureCss, /\.capture-official-progress \.capture-official-progress-bar b \{ width: 31\.25%; \}/);
  assert.match(captureCss, /\.capture-official-progress section > em \{[^}]*width: 2\.75cqw;[^}]*border-top-color: #eee;[^}]*rotate\(-17deg\)/);
  assert.match(captureCss, /\.capture-official-progress > main > nav div:last-child b \{ color: #eee; \}/);
  assert.match(captureCss, /\.coros-global-eq \.global-eq-tabs \{ height: 10\.42%; \}/);
  assert.match(captureCss, /\.global-eq-controls \{ margin-top: \.5cqw; \}/);
  assert.match(captureCss, /\.global-eq-controls \.io-dial-wrap \{ inset: 4\.625cqw 1cqw auto; height: 8cqw; \}/);
  assert.match(settingsCss, /\.coros-settings-official\.settings-system,\.coros-settings-official\.settings-system \* \{ font-family: Roboto, Arial, sans-serif; \}/);
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
  assert.match(fixture, /className="settings-edit"[\s\S]*?M11 14 20 5l-3-3-9 9-1 4 4-1Z/);
  assert.match(captureCss, /\.global-eq-controls \.io-dial \{ right: -\.1875cqw; width: 8\.375cqw; height: 8\.375cqw; \}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-factory section:nth-child\(2\) header \.preset-close\{[^}]*transform:translateX\(\.75cqw\);font-size:0\}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-factory section:nth-child\(2\) header \.preset-confirm\{[^}]*transform:translateX\(\.25cqw\);font-size:0\}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-actions::after\{[^}]*background:transparent;/);
  assert.match(remainingCss, /\.qc-screen\.coros-device-presets\.is-official-actions,\.coros-device-presets\.is-official-actions>nav\{background:#1e1e1e\}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-actions>main>section,\.coros-device-presets\.is-official-actions section>button\{background:#2e2e2e\}/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-factory section:first-child header button\.is-active::before\{[^}]*background:#f8d030;/);
  assert.match(remainingCss, /\.coros-device-presets\.is-official-factory section:nth-child\(2\) header \.preset-confirm\{background:#1838f8\}/);
  assert.match(fixture, /function DevicePresetGlyph\(\)[\s\S]*?<g fill="currentColor">[\s\S]*?m6 10 10-6 10 6-10 6Z/);
  assert.match(fixture, /get\("tempoState"\) === "official"/);
  assert.match(fixture, /beat === \(official \? 1 : 0\)/);
  assert.match(fixture, /className=\{official \? "is-active" : ""\} \/>Global/);
  assert.match(fixture, /className=\{official \? "" : "is-active"\} \/>Preset/);
  assert.match(remainingCss, /\.coros-tempo\.tempo-official>header \.tempo-scene\{display:none\}/);
  assert.match(remainingCss, /\.coros-tempo:not\(\.tempo-official\)>header button\{margin-left:2\.25cqw\}/);
  assert.match(remainingCss, /\.tempo-official \.tempo-display i:nth-child\(3\)::after\{content:"";/);
  assert.match(officialManifest, /"tempoState": "official"/);
});

test("official MIDI Out retains the measured disabled header action", () => {
  const css = readFileSync("packages/typescript/qc-ui/src/official-settings-midi.css", "utf8");
  const fixtureCss = readFileSync("packages/typescript/qc-ui/src/remaining-fixtures-fixes.css", "utf8");
  assert.match(css, /\.coros-midi-out > header > span \{[^}]*translateY\(-1px\)/);
  // preset-midi-out.png fills that button with #081008, not the #101510 this
  // claimed to have measured; the width was right at 66px.
  assert.match(css, /\.coros-midi-out > header \.midi-trash \{[^}]*width: 8\.25cqw;[^}]*translateX\(-\.375cqw\);[^}]*background: #081008;/);
  assert.match(fixtureCss, /\.coros-midi-out \.midi-expression label div\{[^}]*clip-path:polygon\(1% 0,99% 0,100% 2%,91% 98%,89% 100%,11% 100%,9% 98%,0 2%\)/);
  assert.match(fixtureCss, /\.coros-midi-out \.midi-expression label div>i\{[^}]*left:\.75cqw;right:\.75cqw;[^}]*clip-path:polygon/);
});

test("official Account and MIDI settings retain the captured navigation content", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  assert.match(fixture, /<h1>Device linked to<\/h1>/);
  assert.doesNotMatch(fixture, /Device linked to \[redacted\]/);
  assert.match(
    fixture,
    /view === "settings-midi"[\s\S]*?active: 6,[\s\S]*?"Hold Timing"[\s\S]*?"Swap Tempo and Tuner"[\s\S]*?"Gig View Access"[\s\S]*?"Latency Compensation"[\s\S]*?"MIDI"/,
  );
});

test("physical multi-select and stomp assignment labels retain measured spacing", () => {
  const liveCss = readFileSync("packages/typescript/qc-ui/src/fixture-live-surface.css", "utf8");
  const fixesCss = readFileSync("packages/typescript/qc-ui/src/remaining-fixtures-fixes.css", "utf8");
  assert.match(liveCss, /button:has\(> \.preset-select\) \{ grid-template-columns: 44px 1fr; padding-left: 22px; \}/);
  assert.match(fixesCss, /\.assignment-stomp-latch button\{width:128px;height:45px;padding-left:20px\}/);
});

test("USB I/O keeps separate measured dial geometry for level and headphone source", () => {
  const ioCss = readFileSync("packages/typescript/qc-ui/src/official-io.css", "utf8");
  assert.match(ioCss, /section:first-child \.io-dial \{ right: -\.5625cqw; width: 9\.375cqw; height: 9\.375cqw; transform: translateY\(-\.1875cqw\); \}/);
  assert.match(ioCss, /section:nth-child\(2\) \.io-dial \{ right: \.0625cqw; width: 8\.125cqw; height: 8\.125cqw; transform: translateY\(1cqw\); \}/);
});

test("manual IR Directory keeps device-status rows separate from action tiles", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  const directoryCss = readFileSync("packages/typescript/qc-ui/src/official-directory.css", "utf8");
  const icons = readFileSync("packages/typescript/qc-ui/src/theme-icons.tsx", "utf8");
  assert.match(fixture, /directory-on-device-check[^<]*<QcUiIcon kind="check" monochrome \/>/);
  assert.match(fixture, /className="directory-ir-mark">I<\/em>/);
  assert.match(directoryCss, /is-manual-reference \.directory-official-list > button \{ height: 6\.5cqw;[^}]*background: transparent;/);
  assert.match(directoryCss, /directory-official-list > button > i b \{ background: #181c18; \}/);
  assert.match(icons, /kind === "check" && monochrome[\s\S]*?referencePath\("interface\.check"\)[\s\S]*?fill="currentColor"/);
});

test("official Directory search header uses the shared icon vocabulary", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  const icons = readFileSync("packages/typescript/qc-ui/src/theme-icons.tsx", "utf8");
  assert.match(fixture, /directory-search-tab is-active"><QcModeGlyph mode="PRESET" \/>/);
  assert.match(fixture, /directory-search-tab"><CaptureHeaderIcon \/>/);
  assert.match(fixture, /directory-search-tab"><QcLibraryIcon kind="impulse-response" \/>/);
  assert.match(fixture, /DEVICE DIRECTORIES <b><QcUiIcon kind="collapse" \/><\/b>/);
  assert.doesNotMatch(fixture, /directory-search-tab[^\n]*[▦◉≋]/);
  assert.match(icons, /QcUiIconName = [^;]*"collapse"/);
});

test("official System brightness values keep the alignment the device uses", () => {
  const css = readFileSync("packages/typescript/qc-ui/src/official-settings-device.css", "utf8");
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  assert.match(css, /\.settings-system-detail > div span \{ position: relative; top: 1\.375cqw; \}/);
  // settings-system.png draws 16, 32 and 2 all beginning at x=743. Right
  // alignment agrees with the device only while every value has the same digit
  // count, which is why `right: 1.75cqw` looked measured for so long.
  assert.match(css, /\.settings-system-detail > div strong \{ position: absolute; left: 56\.75cqw; right: auto; top: 1\.375cqw; \}/);
  assert.doesNotMatch(css, /\.settings-system-detail > div strong \{[^}]*right: 1\.75cqw/);
  // The same frame shows the LEDs row at 32 of 32 bars, not 16.
  assert.match(fixture, /\["LEDs", "32", 32\]/);
});

test("official Account manual fixture opens Backups without changing the physical My Account capture", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  const manifest = readFileSync("references/qc-ui-official-manual/coros-4.1.0/manifest.json", "utf8");
  assert.match(fixture, /settings-account-official[\s\S]*?<CorOsOfficialSettings view="settings-account" manualAccount/);
  assert.match(fixture, /manualAccount \? 1 : 0/);
  assert.match(fixture, /Cloud Backups[^<]*<span>3\/5<\/span>/);
  assert.match(fixture, /NEW CLOUD BACKUP/);
  assert.match(manifest, /"id": "official-settings-account"[\s\S]*?"screen": "settings-account-official"/);
});

test("official Capture process preserves the manual progress state separately", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  const css = readFileSync("packages/typescript/qc-ui/src/official-looper-eq.css", "utf8");
  const manifest = readFileSync("references/qc-ui-official-manual/coros-4.1.0/manifest.json", "utf8");
  assert.match(fixture, /capture-progress-official[\s\S]*?<CorOsOfficialCapture view="capture-progress" manualProgress/);
  assert.match(fixture, /manualProgress \? "30%" : "88 %"/);
  assert.match(css, /\.capture-official-progress\.is-manual-progress \.capture-official-progress-bar b \{ width: 31\.25%; \}/);
  assert.match(manifest, /"id": "official-capture-process"[\s\S]*?"screen": "capture-progress-official"/);
});

test("official Expression bypass keeps the manual amp parameter set separate", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  const css = readFileSync("packages/typescript/qc-ui/src/official-expression.css", "utf8");
  const manifest = readFileSync("references/qc-ui-official-manual/coros-4.1.0/manifest.json", "utf8");
  assert.match(fixture, /manualAmp[\s\S]*?\[\["GAIN", false\], \["BASS", false\], \["MID", false\], \["TREBLE", false\], \["LEVEL", false\], \["BYPASS", false\]\]/);
  assert.match(fixture, /expression-bypass-official[\s\S]*?<ExpressionChooser trim=\{false\} manualAmp/);
  assert.match(css, /\.expression-bypass-official\.is-manual-amp \.expression-switch-panel > section:first-child > button/);
  assert.match(manifest, /"id": "official-expression-bypass"[\s\S]*?"screen": "expression-bypass-official"/);
});

test("official Looper keeps the manual all-actions state separate", () => {
  const fixture = readFileSync("packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", "utf8");
  const manifest = readFileSync("references/qc-ui-official-manual/coros-4.1.0/manifest.json", "utf8");
  assert.match(fixture, /looper-editor-official[\s\S]*?<CorOsLooperEditor manualReference/);
  assert.match(fixture, /AVAILABLE \{manualReference \? "4:38" : "4:43"\}/);
  assert.match(fixture, /!manualReference && index !== 2 && index !== 4 \? "is-dim"/);
  assert.match(manifest, /"id": "official-looper"[\s\S]*?"screen": "looper-editor-official"/);
});

// Every rule above pins a number that is supposed to have come off a device
// frame, but a test that reads our own stylesheet cannot tell a measurement from
// an invention - that is how the item menu kept a four-entry height and the
// brightness column kept an alignment the device does not use. The measuring is
// done by tools/verify_screen_geometry.py against the frames themselves; this
// keeps the two lists tied together, so a new pinned number without a
// measurement, or a measurement whose frame has gone missing, fails here.
test("every pinned device geometry is measured against a captured frame", () => {
  const verifier = readFileSync("tools/verify_screen_geometry.py", "utf8");
  // The tool builds a few of its selectors from a shared prefix, so the link is
  // on the part that identifies the element rather than on the whole string.
  const claims = [
    ".coros-directory-fixture .directory-item-menu",
    ".coros-physical-confirmation > aside",
    ".qc-screen.coros-block-context > aside",
    ".coros-block-context > .block-context-scrim",
    ".coros-directory-fixture.is-physical-context > header > button:last-child",
    ".plugin-folders-official > main",
    ".directory-official > main",
    ".coros-midi-out > header .midi-trash",
    ".coros-midi-out .midi-expression label div",
    ".tuner-official > footer",
    ".tuner-official > footer > section:last-child::before",
    ".tuner-official > footer > section:last-child::after",
    ".settings-system-detail > div strong",
    ".physical-keyboard-rows button",
    ".physical-grid-underlay .underlay-grid",
    ".physical-grid-underlay .underlay-editor-bar",
    ".physical-grid-underlay .underlay-cable",
    ".plugin-grid-underlay main::before",
    ".underlay-plus",
    ".underlay-add",
    ".plugin-license-lock",
    "button.is-active i",
    ".coros-device-presets.is-official-actions > nav button:nth-child(6) i > span"
  ];
  for (const selector of claims) {
    assert.ok(verifier.includes(selector), `${selector} pins device geometry with no frame measurement`);
  }
  const frames = [
    "references/qc-ui-corpus/coros-4.1.0/directory-item-context.png",
    "references/qc-ui-corpus/coros-4.1.0/generic-confirmation.png",
    "references/qc-ui-corpus/coros-4.1.0/block-context.png",
    "references/qc-ui-corpus/coros-4.1.0/preset-midi-out.png",
    "references/qc-ui-corpus/coros-4.1.0/settings-system.png",
    "references/qc-ui-corpus/coros-4.1.0/tuner.png",
    "references/qc-ui-corpus/coros-4.1.0/tuner-live-enabled.png",
    "references/qc-ui-corpus/coros-4.1.0/onscreen-keyboard.png",
    "references/qc-ui-official-manual/coros-4.1.0/official-plugin-folders.png",
    "references/qc-ui-official-manual/coros-4.1.0/official-directory-presets.png",
    "references/qc-ui-official-manual/coros-4.1.0/official-directory-plugin-presets.png",
    "references/qc-ui-official-manual/coros-4.1.0/official-device-preset-actions.png",
    "references/qc-ui-corpus/coros-4.1.0/block-context.png",
    "references/qc-ui-corpus/coros-4.1.0/device-browser-plugin-list.png"
  ];
  for (const frame of frames) {
    assert.ok(verifier.includes(frame.split("/").pop()!), `${frame} is not measured`);
    assert.ok(readFileSync(frame).length > 0, `${frame} is missing from the corpus`);
  }
  assert.equal(claims.length + frames.length, 37);
});

test("runtime block glyphs are original code-drawn marks without reference artwork", () => {
  const renderer = readFileSync("packages/typescript/qc-ui/src/device-glyph.tsx", "utf8");
  assert.match(renderer, /const mark = \(\{ plugin: "PLG"/);
  assert.doesNotMatch(renderer, /<image\b|QC_VISUAL_ASSETS|REFERENCE_BLOCK_ICONS|data:image/);
});

test("Morph, Filter, Utility Gate, and Pitch remain attached to their verified vector glyphs", () => {
  assert.deepEqual(officialBlockVisual(block("Freeze", "Morph")).tile, [560, 82]);
  assert.deepEqual(officialBlockVisual(block("Envelope Filter", "Filter")).tile, [240, 0]);
  assert.deepEqual(officialBlockVisual(block("Adaptive Gate", "Utility")).tile, [400, 82]);
  assert.equal(officialBlockVisual(block("Adaptive Gate", "Utility")).referenceAsset, undefined);
  assert.equal(officialBlockVisual(block("Dual Octaver", "Pitch")).referenceAsset, "pitch");
});

test("category registry matches the complete CorOS manual order, icon, color, and meaning", () => {
  assert.equal(OFFICIAL_BLOCK_CATEGORIES.length, 19);
  assert.deepEqual(
    OFFICIAL_BLOCK_CATEGORIES.map(({ key, label, tile, color }) => [key, label, tile, color]),
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
  assert.deepEqual(visual.tile, [400, 82]);
  assert.equal(visual.referenceAsset, undefined);
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
