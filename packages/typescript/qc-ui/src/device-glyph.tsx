import type { GridBlock } from "@qc-remote/client";
import { QC_COLORS, QC_TYPOGRAPHY } from "@qc-remote/theme";
import { blockUsesActiveFill, officialBlockVisual, pluginBadge } from "./block-visuals";

/** The single block-tile renderer used by live and reference surfaces. */
export function QcDeviceGlyph({ block, x, y, size = 64, selected = false }: { block: GridBlock; x: number; y: number; size?: number; selected?: boolean }) {
  const visual = officialBlockVisual(block);
  const badge = pluginBadge(block);
  const fill = blockUsesActiveFill(block) ? <rect
    className="official-block-active-fill"
    x={x - size / 2}
    y={y - size / 2}
    width={size}
    height={size}
    rx={size * .2}
    fill={visual.color}
    fillOpacity=".3"
    style={{ mixBlendMode: "screen" }}
    pointerEvents="none"
    aria-hidden="true"
  /> : null;
  const pluginLabel = badge ? <g className="official-plugin-badge" aria-hidden="true">
    <rect x={x - size * .225} y={y - size * .565} width={size * .45} height={size * .205} rx={size * .065} fill={visual.color} />
    <text x={x} y={y - size * .405} textAnchor="middle" fill={QC_COLORS.device.blockLabel} stroke="none" fontFamily={QC_TYPOGRAPHY.devicePlain} fontWeight="900" fontSize={size * .145}>{badge}</text>
  </g> : null;
  const mark = ({ plugin: "PLG", amp: "AMP", capture: "CAP", cab: "CAB", overdrive: "DRV", delay: "DLY", reverb: "RVB", compressor: "CMP", pitch: "PIT", modulation: "MOD", morph: "MRF", synth: "SYN", filter: "FLT", equalizer: "EQ", "ir-loader": "IR", wah: "WAH", "fx-loop": "FX", looper: "LOP", utility: "UTL" } as const)[visual.key];
  return <g><svg className="official-block-tile" x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 70 70" preserveAspectRatio="xMidYMid meet" overflow="hidden" aria-hidden="true">
    <rect x="4" y="4" width="62" height="62" rx="14" fill={QC_COLORS.captured.screen} stroke={visual.color} strokeWidth={selected ? 5.5 : 2.4} />
    <circle cx="35" cy="26" r="8" fill="none" stroke={visual.color} strokeWidth="2.5" />
    <path d="M20 43h30M25 49h20" fill="none" stroke={QC_COLORS.captured.primaryText} strokeWidth="2.2" strokeLinecap="round" />
    <text x="35" y="29.5" textAnchor="middle" fill={QC_COLORS.captured.primaryText} fontFamily={QC_TYPOGRAPHY.devicePlain} fontWeight="800" fontSize="7.5">{mark}</text>
  </svg>{fill}{pluginLabel}</g>;
}
