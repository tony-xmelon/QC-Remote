import { QC_SCENE_COLORS, type GridBlock, type PresetSnapshot } from "@ndsp-qc/client";
import { QC_COLORS } from "@ndsp-qc/theme";

export type CorOsScreenView = "grid" | "grid-official-brit" | "corpus-device-browser-root" | "corpus-device-browser-models" | "corpus-device-browser-models-clean" | "gig" | "gig-live-tuner" | "gig-official-preset" | "gig-official-scene" | "gig-official-stomp" | "gig-official-hybrid" | "tuner" | "tuner-live-enabled" | "tempo" | "midi-out" | "cpu-monitor" | "io-overview" | "io-input" | "io-output" | "io-send-return" | "io-usb" | "io-headphones" | "global-eq" | "power-overlay" | "splitter-placement" | "splitter-editor" | "mixer-editor" | "empty-slot" | "device-search" | "device-search-entry" | "device-search-suggestions" | "device-search-results" | "device-favorites" | "device-recents" | "device-browser-neural-capture" | "device-browser-amp-official" | "plugin-devices-official" | "plugin-folders" | "plugin-list" | "plugin-models" | "plugin-locked" | "plugin-refresh" | "looper-editor" | "device-presets" | "device-presets-user" | "device-presets-official" | "device-preset-actions" | "device-preset-actions-official" | "device-preset-save" | "stomp-assignment" | "scene-assignment" | "expression-parameter" | "expression-bypass" | "block-context" | "block-context-bottom" | "directory-presets" | "directory-categories" | "directory-captures" | "directory-irs" | "directory-plugins" | "directory-favorites" | "directory-search" | "directory-search-results" | "directory-sort" | "directory-filter" | "directory-arrange" | "directory-copy" | "directory-nested" | "directory-new-folder" | "directory-item-context" | "directory-cloud-upload" | "capture-intro" | "capture-type" | "capture-routing" | "capture-calibration" | "capture-progress" | "capture-result" | "capture-save" | "settings-account" | "settings-system" | "settings-device" | "settings-support" | "settings-wifi" | "settings-update" | "settings-storage" | "settings-midi" | "settings-info" | "settings-diagnostics" | "recovery-entry" | "recovery-options" | "overlay-keyboard" | "overlay-confirmation" | "overlay-error" | "overlay-busy" | "fixture-boot" | "fixture-shutdown" | "fixture-copy-scene" | "fixture-swap-scene" | "fixture-delete" | "fixture-input-gate" | "fixture-editor-pages" | "fixture-editor-cab" | "fixture-editor-eq" | "fixture-editor-capture" | "fixture-warning-clip" | "fixture-warning-dsp" | "modes" | "modes-official" | "save-as" | "edit-details";

function officialBrit2203Snapshot(base: PresetSnapshot): PresetSnapshot {
  const blocks: GridBlock[] = [
    { id: "brit-gate", name: "Adaptive Gate", kind: "utility", category: "Gate", row: 0, column: 0, bypassed: true },
    { id: "brit-wah", name: "Wah", kind: "utility", category: "Wah", row: 0, column: 1, bypassed: true },
    { id: "brit-plugin", name: "Plugin Drive", kind: "utility", category: "Plugin", row: 0, column: 2, bypassed: true },
    { id: "brit-drive-a", name: "Drive", kind: "utility", category: "Overdrive", row: 0, column: 3, bypassed: true },
    { id: "brit-drive-b", name: "Boost", kind: "utility", category: "Overdrive", row: 0, column: 4, bypassed: true },
    { id: "brit-amp", name: "Brit 2203", kind: "amp", category: "Amp", row: 0, column: 5 },
    { id: "brit-utility", name: "Utility", kind: "utility", category: "Utility", row: 0, column: 6 },
    { id: "brit-cab", name: "412 Brit", kind: "cab", category: "Cab", row: 0, column: 7 },
    { id: "brit-row3-ir", name: "IR Loader", kind: "utility", category: "IR Loader", row: 2, column: 1, bypassed: true },
    { id: "brit-row3-utility", name: "Utility", kind: "utility", category: "Utility", row: 2, column: 2 },
    { id: "brit-delay-a", name: "Reference Delay A", kind: "delay", category: "Delay", row: 2, column: 3, bypassed: true },
    { id: "brit-delay-b", name: "Reference Delay B", kind: "delay", category: "Delay", row: 2, column: 4, bypassed: true },
    { id: "brit-row3-reverb", name: "Reverb", kind: "utility", category: "Reverb", row: 2, column: 5 },
    { id: "brit-looper", name: "Looper X", kind: "utility", category: "Looper", row: 2, column: 7 }
  ];
  return { ...base, presetLocation: "1A", presetPosition: 0, presetName: "Brit 2203", mode: "PRESET", activeScene: 0, dirty: false, blocks, routes: [{ row: 0, input: "In 1", output: "Row 3", splitMuted: false }, { row: 1, input: "", output: "", splitMuted: false }, { row: 2, input: "Prev. Row", output: "Multi Out", splitMuted: false }, { row: 3, input: "", output: "", splitMuted: false }] };
}

function captureTypeSnapshot(base: PresetSnapshot): PresetSnapshot {
  return {
    ...base,
    presetLocation: "2E",
    presetPosition: 12,
    presetName: "QC MCP TEST",
    mode: "PRESET",
    footswitchModes: ["PRESET", "PRESET"],
    activeScene: 0,
    sceneColors: [QC_SCENE_COLORS[6], ...QC_SCENE_COLORS.slice(1)],
    dirty: false,
    blocks: [{ id: "capture-type", name: "Neural Capture", kind: "capture", category: "Neural Capture", row: 0, column: 0 }],
    routes: [
      { row: 0, inputId: 1, outputId: 19, input: "In 1", output: "Multi Out", splitMuted: false },
      { row: 1, inputId: 0, outputId: 0, input: "", output: "", splitMuted: false },
      { row: 2, inputId: 0, outputId: 0, input: "", output: "", splitMuted: false },
      { row: 3, inputId: 0, outputId: 0, input: "", output: "", splitMuted: false }
    ]
  };
}

function referenceModalSnapshot(base: PresetSnapshot): PresetSnapshot {
  return {
    ...base,
    presetLocation: "5C",
    presetPosition: 34,
    presetName: "Ilia",
    mode: "PRESET",
    footswitchModes: ["PRESET", "PRESET"],
    activeScene: 0,
    sceneColors: [QC_COLORS.captured.presetBrown, ...QC_SCENE_COLORS.slice(1)],
    dirty: false,
    footswitchStates: [{ index: 2, active: true, assigned: true, color: QC_COLORS.captured.presetBrown }],
    blocks: [
      { id: "ilia-reverb", name: "Reverb", kind: "reverb", category: "Reverb", row: 0, column: 1, bypassed: true },
      { id: "ilia-looper", name: "Looper", kind: "utility", category: "Looper", row: 0, column: 2, bypassed: true }
    ],
    routes: [
      { row: 0, inputId: 1, outputId: 19, input: "In 1", output: "Multi Out", splitMuted: false },
      { row: 1, inputId: 0, outputId: 0, input: "", output: "", splitMuted: false },
      { row: 2, inputId: 0, outputId: 0, input: "", output: "", splitMuted: false },
      { row: 3, inputId: 0, outputId: 0, input: "", output: "", splitMuted: false }
    ]
  };
}

function referenceBrowserSnapshot(base: PresetSnapshot): PresetSnapshot {
  return {
    ...captureTypeSnapshot(base),
    presetLocation: "2F",
    presetPosition: 13
  };
}

function deepBrowserSnapshot(base: PresetSnapshot): PresetSnapshot {
  const block = (id: string, category: string, row: number, column: number): GridBlock => ({
    id, name: id, kind: category === "Amp" ? "amp" : category === "Delay" ? "delay" : category === "Reverb" ? "reverb" : "utility", category, row, column
  });
  return {
    ...base,
    presetLocation: "3C",
    presetPosition: 18,
    presetName: "12 String B",
    mode: "PRESET",
    activeScene: 0,
    sceneColors: [QC_COLORS.captured.presetBrown, ...QC_SCENE_COLORS.slice(1)],
    dirty: false,
    blocks: [
      block("r1-gate", "Utility", 0, 0), block("r1-mod", "Modulation", 0, 1), block("r1-morph", "Morph", 0, 2), block("r1-filter", "Filter", 0, 3),
      block("r2-gate", "Utility", 1, 0), block("r2-mod", "Modulation", 1, 1), block("r2-morph", "Morph", 1, 2), block("r2-filter", "Filter", 1, 3),
      block("r3-morph", "Morph", 2, 2), block("r3-amp", "Amp", 2, 3),
      block("r4-gate", "Utility", 3, 0), block("r4-morph", "Morph", 3, 2)
    ],
    routes: [
      { row: 0, input: "In 1", output: "Multi Out", splitMuted: false },
      { row: 1, input: "In 1", output: "Multi Out", splitMuted: false },
      { row: 2, input: "Prev. Row", output: "Multi Out", splitMuted: false },
      { row: 3, input: "In 1", output: "Multi Out", splitMuted: false }
    ]
  };
}

export function coros410FixtureSnapshot(base: PresetSnapshot, overrides: Partial<Pick<PresetSnapshot, "tempo" | "mode">> = {}): PresetSnapshot {
  return {
    ...base,
    presetName: "pyquadcortex scratch",
    presetLocation: "32H",
    presetPosition: 255,
    setlistKey: "coros-4.1.0-corpus",
    setlistName: "My Presets",
    mode: "STOMP",
    footswitchModes: ["STOMP", "STOMP"],
    activeScene: 0,
    scenes: ["Default scene", "Scene B", "Scene C", "Scene D", "Scene E", "Scene F", "Scene G", "Scene H"],
    tempo: 120,
    tempoLedEnabled: true,
    masterVolume: 40,
    dirty: false,
    routes: [
      { row: 0, inputId: 1, outputId: 0, input: "In 1", output: "Multi Out", splitMuted: false },
      { row: 1, inputId: 0, outputId: 0, input: "", output: "", splitMuted: false },
      { row: 2, inputId: 0, outputId: 0, input: "", output: "", splitMuted: false },
      { row: 3, inputId: 0, outputId: 0, input: "", output: "", splitMuted: false }
    ],
    ioPorts: [{ kind: "input", id: 1, label: "In 1", plugged: false }],
    footswitchStates: [{ index: 7, active: true, assigned: true, color: QC_SCENE_COLORS[0] }],
    blocks: [
      { id: "simple-gate", modelId: 1, name: "Simple Gate", kind: "utility", category: "Utility", row: 0, column: 0, footswitch: 0 },
      { id: "chief-ds1", modelId: 2, name: "Chief DS1", kind: "utility", category: "Guitar Overdrive", row: 0, column: 1, footswitch: 1 },
      { id: "digital-flanger", modelId: 3, name: "Digital Flanger", kind: "mod", category: "Modulation", row: 0, column: 2, footswitch: 2, bypassed: true },
      { id: "ukc30-topboost", modelId: 4, name: "UK C30 TopBoost", kind: "amp", category: "Amp", row: 0, column: 3, footswitch: 3 },
      { id: "ukc30-cab", modelId: 5, name: "212 UK C30 65 (M)", kind: "cab", category: "Cab", row: 0, column: 4, footswitch: 4 },
      { id: "parametric-8", modelId: 6, name: "Parametric-8", kind: "utility", category: "EQ", row: 0, column: 5, footswitch: 5 },
      { id: "ambience", modelId: 7, name: "Ambience", kind: "reverb", category: "Reverb", row: 0, column: 6, footswitch: 6 }
    ],
    ...overrides
  };
}

export interface CorOsFixtureConfiguration {
  enabled: boolean;
  initialSnapshot: PresetSnapshot;
  screenView: CorOsScreenView | null;
}

/** Resolve the visual-conformance URL once so every host captures identical state. */
export function corosFixtureConfiguration(search: string, base: PresetSnapshot): CorOsFixtureConfiguration {
  const params = new URLSearchParams(search);
  const enabled = params.get("fixture") === "coros410";
  const mode = params.get("mode");
  const tempo = Number(params.get("tempo"));
  const overrides: Partial<Pick<PresetSnapshot, "tempo" | "mode">> = {
    ...(Number.isFinite(tempo) && tempo > 0 ? { tempo } : {}),
    ...(["PRESET", "SCENE", "STOMP", "HYBRID"].includes(mode ?? "")
      ? { mode: mode as PresetSnapshot["mode"] }
      : {})
  };
  const initialSnapshot = enabled ? coros410FixtureSnapshot(base, overrides) : base;
  return {
    enabled,
    initialSnapshot: enabled && params.get("variant") === "capture-type"
      ? captureTypeSnapshot(initialSnapshot)
      : enabled && params.get("variant") === "reference-modal"
        ? referenceModalSnapshot(initialSnapshot)
        : enabled && params.get("variant") === "reference-browser"
          ? referenceBrowserSnapshot(initialSnapshot)
          : enabled && params.get("variant") === "deep-browser"
            ? deepBrowserSnapshot(initialSnapshot)
          : initialSnapshot,
    screenView: params.get("screen") as CorOsScreenView | null
  };
}

export function fixtureSnapshot(view: CorOsScreenView, snapshot: PresetSnapshot): PresetSnapshot {
  return view === "grid-official-brit" ? officialBrit2203Snapshot(snapshot) : snapshot;
}
