import type { GridBlock } from "@qc-remote/client";
import { QC_COLORS } from "@qc-remote/theme";

export type OfficialBlockVisualKey =
  | "plugin" | "amp" | "capture" | "cab" | "overdrive" | "delay" | "reverb"
  | "compressor" | "pitch" | "modulation" | "morph" | "synth" | "filter"
  | "equalizer" | "ir-loader" | "wah" | "fx-loop" | "looper" | "utility";

export interface OfficialBlockVisual {
  key: OfficialBlockVisualKey;
  color: string;
}

export interface OfficialBlockCategory extends OfficialBlockVisual {
  label: string;
  meaning: string;
}

// CorOS 4.1 manual order. Every consumer renders the shared neutral vector
// registry; no category has a sprite or raster exception.
export const OFFICIAL_BLOCK_CATEGORIES: readonly OfficialBlockCategory[] = [
  { key: "plugin", label: "Plugins", color: QC_COLORS.category.plugin, meaning: "Compatible Neural DSP X plugin devices." },
  { key: "amp", label: "Amp", color: QC_COLORS.category.amp, meaning: "Amplifier devices for guitar and bass." },
  { key: "capture", label: "Neural Capture", color: QC_COLORS.category.capture, meaning: "Neural Capture devices." },
  { key: "cab", label: "Cab", color: QC_COLORS.category.cab, meaning: "Mono and stereo cabinet simulations with selectable microphones." },
  { key: "overdrive", label: "Overdrive", color: QC_COLORS.category.overdrive, meaning: "Boost, distortion, fuzz, and overdrive pedal devices." },
  { key: "delay", label: "Delay", color: QC_COLORS.category.delay, meaning: "Mono and stereo digital, analog, and tape delays." },
  { key: "reverb", label: "Reverb", color: QC_COLORS.category.reverb, meaning: "Digital and analog reverbs." },
  { key: "compressor", label: "Compressor", color: QC_COLORS.category.compressor, meaning: "Mono, stereo, and side-chain dynamics processors." },
  { key: "pitch", label: "Pitch", color: QC_COLORS.category.pitch, meaning: "Pitch shifter devices." },
  { key: "modulation", label: "Modulation", color: QC_COLORS.category.modulation, meaning: "Chorus, flanger, phaser, tremolo, and other modulation devices." },
  { key: "morph", label: "Morph", color: QC_COLORS.category.morph, meaning: "Complex audio processor devices." },
  { key: "synth", label: "Synth", color: QC_COLORS.category.synth, meaning: "Devices that generate sounds by shaping and manipulating waveforms." },
  { key: "filter", label: "Filter", color: QC_COLORS.category.filter, meaning: "Dynamic and fixed filter devices." },
  { key: "equalizer", label: "Equalizer", color: QC_COLORS.category.equalizer, meaning: "Graphic and parametric equalizers." },
  { key: "ir-loader", label: "IR Loader", color: QC_COLORS.category.irLoader, meaning: "Third-party impulse-response loaders." },
  { key: "wah", label: "Wah", color: QC_COLORS.category.wah, meaning: "Wah pedal devices." },
  { key: "fx-loop", label: "FX Loop", color: QC_COLORS.category.fxLoop, meaning: "External-device integration through Send and Return ports." },
  { key: "looper", label: "Looper", color: QC_COLORS.category.looper, meaning: "Real-time audio recording and layering." },
  { key: "utility", label: "Utility", color: QC_COLORS.category.utility, meaning: "Routing, mixing, gain, and other audio tools." }
];

export const OFFICIAL_BLOCK_VISUALS = Object.fromEntries(
  OFFICIAL_BLOCK_CATEGORIES.map(({ key, color }) => [key, { key, color }])
) as Record<OfficialBlockVisualKey, OfficialBlockVisual>;

export function officialBlockVisual(block: GridBlock): OfficialBlockVisual {
  const category = `${block.category ?? ""} ${block.kind ?? ""}`.toLowerCase();
  const name = block.name.toLowerCase();
  if (category.includes("plugin")) return OFFICIAL_BLOCK_VISUALS.plugin;
  if (category.includes("neural capture") || category.includes("capture")) return OFFICIAL_BLOCK_VISUALS.capture;
  if (category.includes("amplifier") || /(^|\s)amp(\s|$)/.test(category)) return OFFICIAL_BLOCK_VISUALS.amp;
  if (category.includes("looper")) return OFFICIAL_BLOCK_VISUALS.looper;
  if (category.includes("ir loader") || category.includes("irloader")) return OFFICIAL_BLOCK_VISUALS["ir-loader"];
  if (category.includes("cab") || category.includes("impulse response")) return OFFICIAL_BLOCK_VISUALS.cab;
  if (["overdrive", "distortion", "drive", "boost", "fuzz"].some((term) => category.includes(term))) return OFFICIAL_BLOCK_VISUALS.overdrive;
  if (category.includes("delay")) return OFFICIAL_BLOCK_VISUALS.delay;
  if (category.includes("reverb")) return OFFICIAL_BLOCK_VISUALS.reverb;
  if (category.includes("compressor")) return OFFICIAL_BLOCK_VISUALS.compressor;
  if (category.includes("pitch") || name.includes("octav")) return OFFICIAL_BLOCK_VISUALS.pitch;
  if (category.includes("modulation") || /(^|\s)mod(\s|$)/.test(category) || ["chorus", "flanger", "phaser", "tremolo", "vibrato"].some((term) => category.includes(term))) return OFFICIAL_BLOCK_VISUALS.modulation;
  if (category.includes("morph")) return OFFICIAL_BLOCK_VISUALS.morph;
  if (category.includes("synth")) return OFFICIAL_BLOCK_VISUALS.synth;
  if (category.includes("filter")) return OFFICIAL_BLOCK_VISUALS.filter;
  if (category.includes("equalizer") || /(^|\s)eq(\s|$)/.test(category)) return OFFICIAL_BLOCK_VISUALS.equalizer;
  if (category.includes("wah")) return OFFICIAL_BLOCK_VISUALS.wah;
  if (category.includes("fx loop") || category.includes("effects loop")) return OFFICIAL_BLOCK_VISUALS["fx-loop"];
  return OFFICIAL_BLOCK_VISUALS.utility;
}

/** Cortex Control's *NormalPlugin SVGs use a 30% category-color interior fill. */
export function blockUsesActiveFill(block: GridBlock): boolean {
  const category = `${block.category ?? ""}`.toLowerCase();
  return block.bypassed !== true && (block.plugin === true || category.includes("plugin"));
}

export { pluginBadge, PUBLISHED_PLUGIN_BADGES } from "./plugin-badges.ts";
export type { PublishedPluginBadge } from "./plugin-badges.ts";
