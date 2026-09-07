import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { writeTypographyMask, writeTypographySnapshot } from "./qc-typography-snapshot.mjs";

const playwrightModule = process.env.CODEX_WORKSPACE_NODE_MODULES
  ? pathToFileURL(join(process.env.CODEX_WORKSPACE_NODE_MODULES, "playwright", "index.mjs")).href
  : "playwright";
const { chromium } = await import(playwrightModule);
const baseUrl = process.argv[2] ?? "http://127.0.0.1:1420/";
const outputDirectory = process.argv[3] ?? ".artifacts/ui-windows-corpus";
const requestedIds = new Set((process.env.QC_CAPTURE_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean));
const forcedFont = process.env.QC_FORCE_FONT?.trim();
const shouldCapture = (id) => !requestedIds.size || requestedIds.has(id);
let captureCount = 0;
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: process.env.QC_BROWSER_EXECUTABLE, args: ["--disable-lcd-text"] });
const page = await browser.newPage({ viewport: { width: 802, height: 482 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(10000);
const captureCss = `
  html, body, #root { width: 802px !important; height: 482px !important; overflow: hidden !important; }
  .menu-bar, .status-strip, .chat-dock, .restore-chat, .dialog-backdrop { display: none !important; }
  .app-content, .workspace { display: block !important; width: 802px !important; height: 482px !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; }
  .qc-chassis { position: relative !important; width: 802px !important; min-width: 802px !important; max-width: 802px !important; height: 482px !important; min-height: 482px !important; max-height: 482px !important; aspect-ratio: auto !important; overflow: hidden !important; border: 1px solid transparent !important; border-radius: 0 !important; }
  .qc-chassis::before, .qc-chassis::after, .official-svg-viewport, .chassis-edge, .master-volume, .device-plate, .screen-nav-control, .footswitch-deck { display: none !important; }
  .qc-screen-bezel, .skin-official-svg .qc-screen-bezel { position: absolute !important; inset: 1px !important; width: 800px !important; height: 480px !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; background: #050506 !important; box-shadow: none !important; }
  .qc-screen-bezel::after { display: none !important; }
`;

async function load(extra = {}) {
  const url = new URL(baseUrl);
  url.searchParams.set("fixture", "coros410");
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  await page.goto(url.href, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: captureCss });
  await page.evaluate(() => document.fonts.ready);
  if (forcedFont) {
    await page.addStyleTag({ content: `html body .qc-screen-bezel, html body .qc-screen-bezel * { font-family: ${JSON.stringify(forcedFont)} !important; }` });
    await page.evaluate(() => document.fonts.ready);
  }
  await page.locator(".dialog-close").click({ timeout: 1000 }).catch(() => undefined);
}

async function capture(id) {
  if (!shouldCapture(id)) return;
  const screen = page.locator(".qc-screen-bezel");
  const box = await screen.boundingBox();
  if (!box || Math.round(box.width) !== 800 || Math.round(box.height) !== 480) throw new Error(`${id}: expected 800x480, got ${box?.width}x${box?.height}`);
  const viewport = page.viewportSize();
  if (viewport) await page.mouse.move(viewport.width - 1, viewport.height - 1);
  // Browser focus/selection chrome is not part of the physical touchscreen UI.
  // Clear it after the scripted interaction so corpus captures stay deterministic.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.getSelection()?.removeAllRanges();
  });
  await writeTypographySnapshot(page, screen, `${outputDirectory}/${id}.typography.json`, "windows", id);
  await screen.screenshot({ path: `${outputDirectory}/${id}.png`, animations: "disabled", timeout: 15000 });
  await writeTypographyMask(page, screen, `${outputDirectory}/${id}.no-text.png`);
  captureCount += 1;
  console.log(`Captured Windows ${id}`);
}

async function gridState(id, action, extra = {}) {
  if (!shouldCapture(id)) return;
  await load(extra);
  if (action) await action();
  await capture(id);
}

for (const id of ["grid-base", "grid-restored", "grid-scene-a-restored"]) await gridState(id);
await gridState("capture-type", undefined, { variant: "capture-type" });
await gridState("grid-scene-selector", async () => page.getByLabel("Select scene").click());
await gridState("grid-context-menu", async () => page.getByLabel("Open Grid menu").click());
await gridState("grid-context-menu-bottom", async () => { await page.getByLabel("Open Grid menu").click(); await page.locator(".coros-screen-menu").evaluate((element) => { element.scrollTop = element.scrollHeight; }); }, { variant: "reference-browser" });
await gridState("grid-context-menu-favorite", async () => { await page.getByLabel("Open Grid menu").click(); await page.locator(".coros-screen-menu").evaluate((element) => { element.scrollTop = element.scrollHeight - element.clientHeight - 60; }); }, { variant: "reference-modal" });
await gridState("grid-scene-b", async () => { await page.getByLabel("Select scene").click(); await page.getByRole("menuitem").nth(1).click(); });
for (const [id, screen] of [["copy-scene-destination", "fixture-copy-scene"], ["swap-scene-destination", "fixture-swap-scene"]]) {
  if (!shouldCapture(id)) continue;
  await load({ screen, ...(screen === "tempo" ? { tempo: "56" } : {}) });
  await capture(id);
}
await gridState("preset-directory", async () => page.getByLabel(/Open preset Directory/).click());
await gridState("input-route-selector-top", async () => page.getByLabel("Edit row 1 input").click(), { variant: "reference-modal" });
await gridState("input-route-selector", async () => { await page.getByLabel("Edit row 1 input").click(); await page.locator(".coros-route-options, .route-picker-list").evaluate((element) => { element.scrollTop = element.scrollHeight - element.clientHeight - 20; }); });
await gridState("output-route-selector-top", async () => page.getByLabel("Edit row 1 output").click(), { variant: "reference-modal" });
await gridState("output-route-selector", async () => { await page.getByLabel("Edit row 1 output").click(); await page.locator(".coros-route-options, .route-picker-list").evaluate((element) => { element.scrollTop = element.scrollHeight - 14; }); });
for (const [id, screen] of [["device-browser-root", "corpus-device-browser-root"], ["device-browser-models", "corpus-device-browser-models"], ["device-browser-models-clean", "corpus-device-browser-models-clean"]]) {
  if (!shouldCapture(id)) continue;
  await load({ screen, variant: "reference-browser" });
  await capture(id);
}
for (const [id, name] of [["editor-simple-gate", "Simple Gate"], ["editor-chief-ds1", "Chief DS1"], ["editor-digital-flanger", "Digital Flanger"], ["editor-ukc30-topboost", "UK C30 TopBoost"], ["editor-ukc30-cab", "212 UK C30 65 (M)"], ["editor-parametric-8", "Parametric-8"], ["editor-ambience", "Ambience"]]) {
  if (!shouldCapture(id)) continue;
  await load();
  await page.getByLabel(`Row 1, ${name}`).click();
  await page.locator(".coros-parameter-editor").waitFor({ state: "visible" });
  await capture(id);
}
for (const [id, mode] of [["gig-view", "STOMP"], ["gig-view-preset", "PRESET"], ["gig-view-scene", "SCENE"]]) {
  if (!shouldCapture(id)) continue;
  await load({ screen: "gig", mode });
  await capture(id);
}
for (const [id, screen] of [["device-browser-plugin-list", "plugin-list"], ["device-browser-plugin-models", "plugin-models"], ["device-browser-plugin-locked", "plugin-locked"], ["plugin-browser-ready", "plugin-list"], ["overlay-busy", "plugin-refresh"], ["device-browser-base", "corpus-device-browser-root"], ["device-browser-top", "corpus-device-browser-root"], ["device-browser-middle-deep", "corpus-device-browser-root"], ["device-browser-middle-reverb", "corpus-device-browser-root"], ["device-browser-neural-capture", "device-browser-neural-capture"], ["device-favorites", "device-favorites"], ["device-recents", "device-recents"], ["device-search-entry", "device-search-entry"], ["device-search", "device-search-suggestions"], ["device-search-results", "device-search-results"], ["overlay-error", "device-search-results"], ["io-overview", "io-overview"], ["io-output", "io-output"], ["io-send-return", "io-send-return"], ["io-headphones", "io-headphones"], ["fixture-editor-capture", "fixture-editor-capture"], ["device-presets-exotic-z-boost", "device-presets"], ["device-presets-user", "device-presets-user"], ["device-preset-actions", "device-preset-actions"], ["block-context", "block-context"], ["block-context-bottom", "block-context"], ["device-preset-save", "device-preset-save"], ["onscreen-keyboard", "overlay-keyboard"], ["directory-item-context", "directory-item-context"], ["delete-confirmation", "fixture-delete"], ["generic-confirmation", "overlay-confirmation"], ["splitter-editor", "splitter-editor"], ["mixer-editor", "mixer-editor"], ["input-gate-control", "fixture-input-gate"], ["tempo-metronome", "tempo"], ["tuner", "tuner"], ["tuner-live-enabled", "tuner-live-enabled"], ["gig-view-live-tuner", "gig-live-tuner"], ["preset-midi-out", "midi-out"], ["modes-configuration", "modes"], ["save-as-editor", "save-as"], ["edit-details-editor", "edit-details"], ["settings-support", "settings-support"], ["settings-info", "settings-info"], ["settings-diagnostics", "settings-diagnostics"], ["settings-wifi", "settings-wifi"], ["settings-storage", "settings-storage"]]) {
  if (!shouldCapture(id)) continue;
  const browserVariant = id === "device-browser-middle-deep" || id === "device-browser-middle-reverb" ? "deep-browser" : "reference-browser";
  await load({ screen: id === "block-context-bottom" ? "block-context-bottom" : screen, ...(screen === "tempo" ? { tempo: "56" } : {}), ...(screen === "corpus-device-browser-root" ? { variant: browserVariant } : {}) });
  if (id === "device-browser-base") await page.locator(".coros-device-browser > nav").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  if (id === "device-browser-middle-deep") await page.locator(".coros-device-browser > nav").evaluate((element) => { element.scrollTop = 554; });
  if (id === "device-browser-middle-reverb") await page.locator(".coros-device-browser > nav").evaluate((element) => { element.scrollTop = 242; });
  if (id === "block-context-bottom") await page.locator(".coros-block-context > aside").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await capture(id);
}
for (const [id, mode] of [["official-gig-view-stomp", "STOMP"], ["official-gig-view-preset", "PRESET"], ["official-gig-view-scene", "SCENE"], ["official-gig-view-hybrid", "HYBRID"]]) {
  if (!shouldCapture(id)) continue;
  await load({ screen: `gig-official-${mode.toLowerCase()}` });
  await capture(id);
}

for (const [id, screen] of [["official-directory-presets", "directory-presets"], ["official-directory-captures", "directory-captures"], ["official-directory-favorites", "directory-favorites"], ["official-directory-irs", "directory-irs"], ["official-directory-nested", "directory-nested"], ["official-directory-plugin-presets", "directory-plugins"], ["official-directory-search-results", "directory-search-results"], ["official-directory-upload", "directory-cloud-upload"]]) {
  if (!shouldCapture(id)) continue;
  await load({ screen });
  await capture(id);
}

for (const [id, screen] of [["official-device-browser-amp", "device-browser-amp-official"], ["official-looper", "looper-editor"], ["official-plugin-devices", "plugin-devices-official"], ["official-plugin-folders", "plugin-folders"]]) {
  if (!shouldCapture(id)) continue;
  await load({ screen });
  await capture(id);
}

if (shouldCapture("iconography-audit")) {
  await load({ screen: "iconography-audit" });
  await capture("iconography-audit");
}

await browser.close();
console.log(`Captured ${captureCount} Windows corpus states in ${outputDirectory}`);
