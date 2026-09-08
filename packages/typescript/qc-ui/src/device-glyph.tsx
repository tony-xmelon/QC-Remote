import type { GridBlock } from "@qc-remote/client";
import { QC_COLORS } from "@qc-remote/theme";
import { blockUsesActiveFill, officialBlockVisual, OFFICIAL_BLOCK_CATEGORIES } from "./block-visuals";
import { QcDeviceCategoryGlyph } from "./device-category-glyph";
import { QcPluginBadgeGlyph } from "./plugin-badge-glyph";
import { pluginBadge } from "./plugin-badges";

/** The single block-tile renderer used by live and reference surfaces. */
export function QcDeviceGlyph({ block, x, y, size = 64, selected = false }: { block: GridBlock; x: number; y: number; size?: number; selected?: boolean }) {
  const visual = officialBlockVisual(block);
  const category = OFFICIAL_BLOCK_CATEGORIES.find((candidate) => candidate.key === visual.key);
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
  const iconSize = size * .625;
  return <g className={`official-block-tile official-block-tile-${visual.key}`}>
    <rect x={x - size / 2} y={y - size / 2} width={size} height={size} rx={size * .21875} fill={QC_COLORS.captured.screen} stroke={visual.color} strokeWidth={selected ? 5.5 : 2.4} />
    {fill}
    <QcDeviceCategoryGlyph label={category?.label ?? "Utility"} x={x - iconSize / 2} y={y - iconSize / 2} width={iconSize} height={iconSize} />
    {badge && <QcPluginBadgeGlyph abbreviation={badge} color={visual.color} x={x} y={y} tileSize={size} />}
  </g>;
}
