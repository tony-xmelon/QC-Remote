import type { GridBlock } from "@ndsp-qc/client";
import { QC_COLORS, QC_REFERENCE_ICON_RASTERS, QC_TYPOGRAPHY, QC_VISUAL_ASSETS, REFERENCE_BLOCK_ICONS } from "@ndsp-qc/theme";
import { blockUsesActiveFill, officialBlockVisual, pluginBadge } from "./block-visuals";

/** The single block-tile renderer used by live and reference surfaces. */
export function QcDeviceGlyph({ block, x, y, size = 64, selected = false }: { block: GridBlock; x: number; y: number; size?: number; selected?: boolean }) {
  const visual = officialBlockVisual(block);
  const [tileX, tileY] = visual.tile;
  const visualColor = block.color ?? visual.color;
  const badge = pluginBadge(block);
  const fill = blockUsesActiveFill(block) ? <rect
    className="official-block-active-fill"
    x={x - size / 2}
    y={y - size / 2}
    width={size}
    height={size}
    rx={size * .2}
    fill={visualColor}
    fillOpacity=".3"
    style={{ mixBlendMode: "screen" }}
    pointerEvents="none"
    aria-hidden="true"
  /> : null;
  const pluginLabel = badge ? <g className="official-plugin-badge" aria-hidden="true">
    <rect x={x - size * .225} y={y - size * .565} width={size * .45} height={size * .205} rx={size * .065} fill={visualColor} />
    <text x={x} y={y - size * .405} textAnchor="middle" fill={QC_COLORS.device.blockLabel} stroke="none" fontFamily={QC_TYPOGRAPHY.devicePlain} fontWeight="900" fontSize={size * .145}>{badge}</text>
  </g> : null;
  if (block.glyph === "capture-wave") {
    const raster = QC_REFERENCE_ICON_RASTERS["block.capture-wave"];
    return <g className="official-block-tile" aria-hidden="true">
      <rect x={x - size / 2} y={y - size / 2} width={size} height={size} fill={QC_COLORS.captured.screen} />
      <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox={`0 0 ${raster.width} ${raster.height}`} shapeRendering="crispEdges" overflow="visible">
        {Object.entries(raster.paths).map(([color, path]) => <path key={color} d={path} fill={color} stroke="none" />)}
      </svg>
      {selected && <rect x={x - size / 2 + 2} y={y - size / 2 + 2} width={size - 4} height={size - 4} rx={size * .2} fill="none" stroke={visualColor} strokeWidth="5.5" />}
    </g>;
  }
  if (visual.referenceAsset) return <g><image className="official-block-tile" x={x - size / 2} y={y - size / 2} width={size} height={size} href={REFERENCE_BLOCK_ICONS[visual.referenceAsset]} preserveAspectRatio="xMidYMid meet" aria-hidden="true" />{fill}{pluginLabel}</g>;
  return <g><svg className="official-block-tile" x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox={`${tileX} ${tileY} 70 70`} preserveAspectRatio="xMidYMid meet" overflow="hidden" aria-hidden="true">
    <image href={QC_VISUAL_ASSETS.blockSprite.url} x="0" y="0" width="710" height="152" />
    <rect x={tileX + 3} y={tileY + 3} width="64" height="64" rx="14" fill="none" stroke={QC_COLORS.captured.screen} strokeWidth="5" />
    <rect x={tileX + 3} y={tileY + 3} width="64" height="64" rx="14" fill="none" stroke={visualColor} strokeWidth={selected ? 5.5 : 2.4} />
  </svg>{fill}{pluginLabel}</g>;
}
