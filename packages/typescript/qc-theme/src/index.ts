import nativeTheme from "./native-theme.json" with { type: "json" };
import colorTheme from "./colors.json" with { type: "json" };
import visualAssets from "./assets.json" with { type: "json" };
import brand from "./brand.json" with { type: "json" };

export { QC_LEGAL } from "./legal.ts";
/**
 * Shared visual contract for the Windows and Android QC Remote apps.
 *
 * `captured` values are measured from the native 800×480 Quad Cortex PNGs in
 * artifacts/hardware-ui. Category colors come from the CorOS 4.1 device
 * taxonomy and are shared with physical LED fallback behavior.
 */
export const QC_COLORS = colorTheme;

export const QC_TYPOGRAPHY = {
  device: '"Arimo Variable", Arial, Helvetica, sans-serif',
  devicePlain: '"Arimo Variable", Arial, Helvetica, sans-serif',
  deviceRoute: '"Arimo Variable", Arial, Helvetica, sans-serif',
  control: '"Arimo Variable", Arial, sans-serif',
  app: 'Inter, "Segoe UI Variable", "Segoe UI", sans-serif',
  mono: '"DM Mono", "Cascadia Mono", Consolas, monospace'
} as const;

export const QC_GEOMETRY = {
  screen: { width: 800, height: 480, aspectRatio: 800 / 480 },
  chassis: { widthCm: 29, heightCm: 19.5, aspectRatio: 29 / 19.5 },
  grid: { rows: 4, columns: 6, routePillWidth: 44, routePillHeight: 78, blockSize: 64 },
  footswitches: { performance: 8, navigation: 2, tempo: 1 }
} as const;

export const QC_VISUAL_ASSETS = {
  ...visualAssets,
  chassisVector: {
    ...visualAssets.chassisVector,
    url: new URL("../assets/qc-chassis-neutral.svg", import.meta.url).href
  },
  appIcon: {
    ...visualAssets.appIcon,
    url: new URL("../assets/app-icon.svg", import.meta.url).href
  }
} as const;

export const QC_NATIVE_THEME = nativeTheme;
export const QC_BRAND = brand;

export type QcCategoryColor = keyof typeof QC_COLORS.category;

export const QC_THEME = {
  colors: QC_COLORS,
  typography: QC_TYPOGRAPHY,
  geometry: QC_GEOMETRY,
  assets: QC_VISUAL_ASSETS,
  native: QC_NATIVE_THEME,
  brand: QC_BRAND
} as const;
