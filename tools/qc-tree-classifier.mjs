// The single definition of "which screen is this CorOS graphics tree?".
//
// This used to be implemented twice - once here in the corpus verifier and once
// again in Python for the capture tools - and the two drifted: a screen the
// verifier classified as `busy-progress` was written into the manifest as
// `unknown`, so a freshly captured screen failed verification the moment it was
// captured. Both callers now share this file; `verify_qc_ui_corpus.py` invokes
// the CLI mode below rather than keeping a second copy of the rules.
//
//   node tools/qc-tree-classifier.mjs TREE_FILE [TREE_FILE...]
//
// prints one classification per line, in argument order.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function classifyTree(tree) {
  if (tree.includes("Refreshing the list can take 10-20 seconds.") || tree.includes("zenUI::RotatingBusyIndicator")) return "busy-progress";
  if (tree.includes("zenUI::SearchResultsDialog") && tree.includes("zenUI::MessageDialog")) return "error-overlay";
  if (tree.includes("zenUI::SearchResultsDialog")) return "device-search-results";
  if (tree.includes("zenUI::SearchDialog")) return "device-search-entry";
  if (tree.includes("zenUI::CheatSheetDialog")) return "io-settings";
  if (tree.includes("zenUI::NCModelEditor")) return "neural-capture-editor";
  if (tree.includes("zenUI::Tuner")) return "tuner";
  if (tree.includes("zenUI::MetronomeEditor")) return "tempo";
  if (tree.includes("zenUI::HybridModeConfigDialog")) return "modes-configuration";
  if (tree.includes("zenUI::PresetSaveDialog") && tree.includes("zenUI::KeyboardTextInput")) return "preset-name-editor";
  if (tree.includes("zenUI::MidiMatrixDialog")) return "midi-out";
  if (tree.includes("zenUI::CopySceneDialog")) return "scene-destination";
  if (tree.includes("zenUI::DirectoryDialog") && tree.includes("Save to...")) return "save-as-editor";
  if (tree.includes("zenUI::GigView")) return "gig-view";
  if (tree.includes("zenUI::Directory")) return "directory";
  if (tree.includes("Device information")) return "settings-info";
  if (tree.includes("DSP Diagnostics")) return "settings-diagnostics";
  if (tree.includes("Internet Connected") || tree.includes("RESET WI-FI SETTINGS")) return "settings-wifi";
  if (tree.split("Device Storage").length - 1 >= 2) return "settings-storage";
  if (tree.includes("About and Contact") && tree.includes("zenUI::ContactUsMenu")) return "settings-support";
  if (tree.includes("zenUI::SplitControlPointGrid") && tree.includes("zenUI::ContainerWithSplitter") && tree.includes("zenUI::ParameterControl")) {
    return tree.split("zenUI::ParameterControl").length - 1 === 6 ? "mixer-editor" : "splitter-editor";
  }
  if (tree.includes("zenUI::ParameterEditor") || tree.includes("Parameter Editor")) return "parameter-editor";
  if (tree.includes("Create New") && tree.includes("Preset MIDI Out")) return "grid-context-menu";
  if (tree.includes("Default scene") && tree.includes("Scene H")) return "scene-selector";
  if (tree.includes("Not In Use")) return "route-selector";
  if (tree.includes("zenUI::ModelMenu")) return "device-browser";
  const categories = ["Neural Capture", "Overdrive", "Reverb", "Pitch", "Utility"];
  if (categories.filter((label) => tree.includes(label)).length >= 3) return "device-browser";
  if (tree.includes("zenUI::Grid")) return "grid";
  return "unknown";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const path of process.argv.slice(2)) {
    process.stdout.write(`${classifyTree(readFileSync(path, "utf8"))}\n`);
  }
}
