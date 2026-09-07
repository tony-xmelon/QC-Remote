import type { PresetSnapshot } from "@ndsp-qc/client";
import { QC_COLORS, QC_REFERENCE_ICON_RASTERS, QC_TYPOGRAPHY } from "@ndsp-qc/theme";

export type QcDirectoryIconName = "grid" | "download" | "cloud" | "cloud-upload" | "folder" | "new-folder" | "sort" | "filter" | "arrange" | "upload" | "search" | "trash" | "done";
export type QcEditorIconName = "save" | "change" | "copy" | "paste" | "reset" | "expression" | "looper" | "mute" | "model-update" | "model-downgrade" | "remove" | "assignment-expression" | "band-power" | "footswitch" | "scene-previous" | "scene-next" | "bypass" | "confirm" | "waveform";
export type QcHardwareIconName = "power" | "brand-pulse";
export type QcLibraryIconName = "capture-library" | "capture-header" | "heart" | "clock" | "binoculars" | "broken-heart" | "neural-mark";
export type QcScreenHeaderGlyphName = "undo" | "save" | "export" | "menu";
export type QcUiIconName = "add" | "subtract" | "previous" | "next" | "cab-previous" | "cab-next" | "up" | "down" | "more" | "check" | "close" | "refresh" | "backspace" | "microphone" | "attachment" | "file" | "send" | "stop" | "save-as" | "edit" | "midi" | "favorite" | "delete" | "capture" | "modes" | "tempo" | "cpu" | "settings";

type ReferenceRasterName = keyof typeof QC_REFERENCE_ICON_RASTERS;

function QcReferenceRaster({ icon, color, className, crisp = true }: { icon: ReferenceRasterName; color: string; className?: string; crisp?: boolean }) {
  const raster = QC_REFERENCE_ICON_RASTERS[icon];
  const path = (raster.paths as Record<string, string>)[color];
  return <svg className={className} viewBox={`0 0 ${raster.width} ${raster.height}`} shapeRendering={crisp ? "crispEdges" : "auto"} aria-hidden="true"><path d={path} fill={color} stroke="none" /></svg>;
}

function QcReferenceRasterLayers({ icon, className }: { icon: ReferenceRasterName; className?: string }) {
  const raster = QC_REFERENCE_ICON_RASTERS[icon];
  const shapeRendering = icon === "editor.scene-previous" || icon === "editor.scene-next" ? "auto" : "crispEdges";
  return <svg className={className} viewBox={`0 0 ${raster.width} ${raster.height}`} shapeRendering={shapeRendering} aria-hidden="true">{Object.entries(raster.paths).map(([color, path]) => <path key={color} d={path} fill={color} stroke="none" />)}</svg>;
}

function referencePath(icon: ReferenceRasterName, index = 0) {
  return Object.values(QC_REFERENCE_ICON_RASTERS[icon].paths)[index];
}

function directoryReferenceIcon(kind: QcDirectoryIconName): "directory.download" | "directory.cloud" | "directory.cloud-upload-header" | "directory.trash" | undefined {
  return kind === "download" ? "directory.download" : kind === "cloud" ? "directory.cloud" : kind === "cloud-upload" ? "directory.cloud-upload-header" : kind === "trash" ? "directory.trash" : undefined;
}

function editorReferenceIcon(kind: QcEditorIconName): ReferenceRasterName | undefined {
  const icons = {
    change: "editor.change", copy: "editor.copy", paste: "editor.paste", reset: "editor.reset",
    save: "editor.save", expression: "editor.expression", mute: "editor.mute",
    "model-update": "editor.model-update", "model-downgrade": "editor.model-downgrade",
    remove: "editor.remove", confirm: "editor.confirm", bypass: "editor.bypass",
    "scene-previous": "editor.scene-previous", "scene-next": "editor.scene-next"
  } as const;
  return kind in icons ? icons[kind as keyof typeof icons] : undefined;
}

export function QcPresetStackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Zm8 8-8 4-8-4m16 4-8 4-8-4" /></svg>;
}

/** Shared app/CorOS glyph vocabulary. Text characters must not be used as icons. */
export function QcUiIcon({ kind, className }: { kind: QcUiIconName; className?: string }) {
  const classes = `qc-ui-icon qc-ui-icon-${kind}${className ? ` ${className}` : ""}`;
  const referenceIcons = {
    add: "interface.add", file: "interface.file", midi: "interface.midi", modes: "interface.modes",
    tempo: "interface.tempo", settings: "interface.settings"
  } as const;
  if (kind in referenceIcons) return <QcReferenceRaster icon={referenceIcons[kind as keyof typeof referenceIcons]} color={QC_COLORS.captured.primaryText} className={classes} />;
  if (kind === "cab-previous" || kind === "cab-next") {
    const icon = kind === "cab-previous" ? "interface.previous-cab" : "interface.next-cab";
    return <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true"><path d={referencePath(icon, 0)} style={{ fill: QC_COLORS.captured.cabArrowDark, stroke: "none" }} /><path d={referencePath(icon, 1)} style={{ fill: QC_COLORS.captured.cabArrowLight, stroke: "none" }} /></svg>;
  }
  if (kind === "check")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M18 7h1v1h-1ZM16 8h4v1h-4ZM15 9h5v1h-5ZM14 10h4v1h-4ZM13 11h4v1h-4ZM5 12h2v1h-2ZM12 12h4v1h-4ZM4 13h4v1h-4ZM11 13h4v1h-4ZM5 14h4v1h-4ZM10 14h4v1h-4ZM6 15h7v1h-7ZM7 16h5v1h-5ZM8 17h3v1h-3ZM9 18h1v1h-1Z" />
      </svg>
    );
  if (kind === "down")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M5 8h14v1h-14ZM6 9h12v1h-12ZM6 10h12v1h-12ZM7 11h10v1h-10ZM8 12h8v1h-8ZM9 13h6v1h-6ZM10 14h5v1h-5ZM10 15h4v1h-4ZM11 16h2v1h-2Z" />
      </svg>
    );
  if (kind === "close")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M5 4h1v1h-1ZM18 4h1v1h-1ZM4 5h3v1h-3ZM17 5h3v1h-3ZM4 6h4v1h-4ZM16 6h4v1h-4ZM5 7h4v1h-4ZM15 7h4v1h-4ZM6 8h4v1h-4ZM14 8h4v1h-4ZM7 9h4v1h-4ZM13 9h4v1h-4ZM8 10h8v1h-8ZM9 11h6v1h-6ZM10 12h4v1h-4ZM9 13h6v1h-6ZM8 14h8v1h-8ZM7 15h4v1h-4ZM13 15h4v1h-4ZM6 16h4v1h-4ZM14 16h4v1h-4ZM5 17h4v1h-4ZM15 17h4v1h-4ZM4 18h4v1h-4ZM16 18h4v1h-4ZM4 19h3v1h-3ZM17 19h3v1h-3ZM5 20h1v1h-1ZM18 20h1v1h-1Z" />
      </svg>
    );
  if (kind === "backspace")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.keyboardGlyph} stroke="none" d="M7 4h16v1h-16ZM6 5h17v1h-17ZM5 6h4v1h-4ZM21 6h2v1h-2ZM5 7h3v1h-3ZM21 7h2v1h-2ZM4 8h4v1h-4ZM11 8h2v1h-2ZM15 8h2v1h-2ZM21 8h2v1h-2ZM3 9h4v1h-4ZM10 9h8v1h-8ZM21 9h2v1h-2ZM2 10h4v1h-4ZM10 10h8v1h-8ZM21 10h2v1h-2ZM1 11h4v1h-4ZM11 11h6v1h-6ZM21 11h2v1h-2ZM1 12h4v1h-4ZM11 12h6v1h-6ZM21 12h2v1h-2ZM2 13h4v1h-4ZM10 13h8v1h-8ZM21 13h2v1h-2ZM3 14h4v1h-4ZM10 14h8v1h-8ZM21 14h2v1h-2ZM4 15h4v1h-4ZM11 15h2v1h-2ZM15 15h2v1h-2ZM21 15h2v1h-2ZM5 16h3v1h-3ZM21 16h2v1h-2ZM5 17h4v1h-4ZM21 17h2v1h-2ZM6 18h17v1h-17ZM7 19h16v1h-16Z" />
      </svg>
    );
  if (kind === "favorite")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M3 2h7v1h-7ZM14 2h7v1h-7ZM2 3h9v1h-9ZM13 3h9v1h-9ZM1 4h5v1h-5ZM7 4h10v1h-10ZM18 4h5v1h-5ZM0 5h4v1h-4ZM9 5h6v1h-6ZM20 5h4v1h-4ZM0 6h3v1h-3ZM10 6h4v1h-4ZM21 6h3v1h-3ZM0 7h3v1h-3ZM11 7h2v1h-2ZM21 7h3v1h-3ZM0 8h2v1h-2ZM21 8h3v1h-3ZM0 9h3v1h-3ZM21 9h3v1h-3ZM0 10h3v1h-3ZM21 10h3v1h-3ZM0 11h4v1h-4ZM20 11h4v1h-4ZM1 12h4v1h-4ZM19 12h4v1h-4ZM2 13h4v1h-4ZM18 13h4v1h-4ZM3 14h4v1h-4ZM17 14h4v1h-4ZM4 15h4v1h-4ZM16 15h4v1h-4ZM5 16h4v1h-4ZM15 16h4v1h-4ZM6 17h4v1h-4ZM14 17h4v1h-4ZM7 18h4v1h-4ZM13 18h4v1h-4ZM8 19h8v1h-8ZM9 20h6v1h-6ZM10 21h4v1h-4ZM11 22h2v1h-2Z" />
      </svg>
    );
  if (kind === "save-as")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M1 0h17v1h-17ZM0 1h19v1h-19ZM0 2h3v1h-3ZM16 2h4v1h-4ZM0 3h2v1h-2ZM17 3h4v1h-4ZM0 4h2v1h-2ZM4 4h6v1h-6ZM12 4h3v1h-3ZM18 4h4v1h-4ZM0 5h2v1h-2ZM4 5h6v1h-6ZM12 5h3v1h-3ZM19 5h3v1h-3ZM0 6h2v1h-2ZM4 6h6v1h-6ZM12 6h3v1h-3ZM20 6h2v1h-2ZM0 7h2v1h-2ZM4 7h11v1h-11ZM20 7h2v1h-2ZM0 8h2v1h-2ZM4 8h11v1h-11ZM20 8h2v1h-2ZM0 9h2v1h-2ZM4 9h11v1h-11ZM20 9h2v1h-2ZM0 10h2v1h-2ZM21 10h1v1h-1ZM0 11h2v1h-2ZM16 11h2v1h-2ZM0 12h2v1h-2ZM16 12h3v1h-3ZM0 13h2v1h-2ZM17 13h4v1h-4ZM0 14h2v1h-2ZM18 14h4v1h-4ZM0 15h2v1h-2ZM19 15h4v1h-4ZM0 16h2v1h-2ZM11 16h13v1h-13ZM0 17h2v1h-2ZM11 17h13v1h-13ZM0 18h2v1h-2ZM11 18h13v1h-13ZM0 19h3v1h-3ZM19 19h4v1h-4ZM0 20h10v1h-10ZM18 20h4v1h-4ZM1 21h10v1h-10ZM17 21h4v1h-4ZM16 22h3v1h-3ZM16 23h2v1h-2Z" />
      </svg>
    );
  if (kind === "edit")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M2 1h11v1h-11ZM19 1h1v1h-1ZM1 2h12v1h-12ZM18 2h3v1h-3ZM1 3h3v1h-3ZM17 3h5v1h-5ZM1 4h2v1h-2ZM16 4h7v1h-7ZM1 5h2v1h-2ZM15 5h8v1h-8ZM1 6h2v1h-2ZM14 6h8v1h-8ZM1 7h2v1h-2ZM13 7h8v1h-8ZM1 8h2v1h-2ZM12 8h8v1h-8ZM1 9h2v1h-2ZM11 9h8v1h-8ZM1 10h2v1h-2ZM10 10h8v1h-8ZM1 11h2v1h-2ZM10 11h7v1h-7ZM1 12h2v1h-2ZM11 12h5v1h-5ZM1 13h2v1h-2ZM8 13h1v1h-1ZM12 13h3v1h-3ZM21 13h2v1h-2ZM1 14h2v1h-2ZM7 14h3v1h-3ZM13 14h1v1h-1ZM21 14h2v1h-2ZM1 15h2v1h-2ZM7 15h4v1h-4ZM21 15h2v1h-2ZM1 16h2v1h-2ZM7 16h5v1h-5ZM21 16h2v1h-2ZM1 17h2v1h-2ZM7 17h1v1h-1ZM21 17h2v1h-2ZM1 18h2v1h-2ZM21 18h2v1h-2ZM1 19h2v1h-2ZM21 19h2v1h-2ZM1 20h3v1h-3ZM20 20h3v1h-3ZM1 21h22v1h-22ZM2 22h20v1h-20Z" />
      </svg>
    );
  if (kind === "next")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M16 3h3v1h-3ZM17 4h3v1h-3ZM18 5h3v1h-3ZM19 6h3v1h-3ZM1 7h21v1h-21ZM18 8h3v1h-3ZM18 9h2v1h-2ZM17 10h2v1h-2ZM17 11h1v1h-1ZM5 13h3v1h-3ZM4 14h3v1h-3ZM3 15h3v1h-3ZM2 16h3v1h-3ZM2 17h21v1h-21ZM3 18h3v1h-3ZM4 19h2v1h-2ZM5 20h2v1h-2ZM6 21h1v1h-1Z" />
        <path fill={QC_COLORS.captured.editorMuted} stroke="none" d="M16 2h2v1h-2ZM16 4h1v1h-1ZM20 4h1v1h-1ZM17 5h1v1h-1ZM21 5h1v1h-1ZM1 6h18v1h-18ZM22 6h1v1h-1ZM22 7h1v1h-1ZM1 8h17v1h-17ZM21 8h1v1h-1ZM17 9h1v1h-1ZM20 9h1v1h-1ZM16 10h1v1h-1ZM19 10h1v1h-1ZM16 11h1v1h-1ZM18 11h1v1h-1ZM6 12h2v1h-2ZM17 12h1v1h-1ZM3 14h1v1h-1ZM7 14h1v1h-1ZM2 15h1v1h-1ZM6 15h1v1h-1ZM1 16h1v1h-1ZM5 16h18v1h-18ZM1 17h1v1h-1ZM2 18h1v1h-1ZM6 18h17v1h-17ZM3 19h1v1h-1ZM6 19h1v1h-1ZM4 20h1v1h-1ZM7 20h1v1h-1ZM5 21h1v1h-1ZM7 21h1v1h-1ZM6 22h1v1h-1Z" />
      </svg>
    );
  if (kind === "delete")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M9 0h6v1h-6ZM9 1h6v1h-6ZM2 2h20v1h-20ZM2 3h20v1h-20ZM3 6h18v1h-18ZM3 7h18v1h-18ZM3 8h2v1h-2ZM19 8h2v1h-2ZM3 9h2v1h-2ZM19 9h2v1h-2ZM3 10h2v1h-2ZM19 10h2v1h-2ZM3 11h2v1h-2ZM9 11h2v1h-2ZM13 11h2v1h-2ZM19 11h2v1h-2ZM3 12h2v1h-2ZM8 12h8v1h-8ZM19 12h2v1h-2ZM3 13h2v1h-2ZM9 13h6v1h-6ZM19 13h2v1h-2ZM3 14h2v1h-2ZM10 14h4v1h-4ZM19 14h2v1h-2ZM3 15h2v1h-2ZM9 15h6v1h-6ZM19 15h2v1h-2ZM3 16h2v1h-2ZM8 16h8v1h-8ZM19 16h2v1h-2ZM3 17h2v1h-2ZM8 17h3v1h-3ZM13 17h3v1h-3ZM19 17h2v1h-2ZM3 18h2v1h-2ZM9 18h1v1h-1ZM14 18h1v1h-1ZM19 18h2v1h-2ZM3 19h2v1h-2ZM19 19h2v1h-2ZM3 20h3v1h-3ZM18 20h3v1h-3ZM3 21h4v1h-4ZM17 21h4v1h-4ZM3 22h18v1h-18ZM4 23h16v1h-16Z" />
      </svg>
    );
  if (kind === "capture")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M12 0h2v1h-2ZM12 1h5v1h-5ZM12 5h10v1h-10ZM12 9h11v1h-11ZM12 13h11v1h-11ZM12 17h10v1h-10ZM12 21h7v1h-7Z" />
        <path fill={QC_COLORS.captured.contextCaptureLight} stroke="none" d="M12 4h4v1h-4ZM12 8h11v1h-11ZM12 12h11v1h-11ZM23 13h1v1h-1ZM12 16h5v1h-5ZM12 20h4v1h-4Z" />
        <path fill={QC_COLORS.captured.contextCaptureSoft} stroke="none" d="M14 0h1v1h-1ZM17 1h1v1h-1ZM16 4h5v1h-5ZM23 9h1v1h-1ZM23 12h1v1h-1ZM17 16h6v1h-6ZM22 17h1v1h-1ZM16 20h4v1h-4Z" />
        <path fill={QC_COLORS.captured.contextCaptureMuted} stroke="none" d="M15 0h1v1h-1ZM4 3h8v1h-8ZM21 4h1v1h-1ZM1 7h11v1h-11ZM23 8h1v1h-1ZM0 11h12v1h-12ZM1 15h11v1h-11ZM3 19h9v1h-9Z" />
        <path fill={QC_COLORS.captured.contextCaptureMid} stroke="none" d="M12 2h6v1h-6ZM12 6h10v1h-10ZM12 10h11v1h-11ZM12 14h11v1h-11ZM12 18h10v1h-10ZM19 21h1v1h-1ZM12 22h6v1h-6ZM11 23h1v1h-1Z" />
        <path fill={QC_COLORS.captured.contextCaptureDark} stroke="none" d="M5 2h7v1h-7ZM18 2h1v1h-1ZM1 6h11v1h-11ZM0 10h12v1h-12ZM23 10h1v1h-1ZM0 14h12v1h-12ZM23 14h1v1h-1ZM2 18h10v1h-10ZM20 20h1v1h-1ZM7 22h5v1h-5ZM9 23h2v1h-2Z" />
        <path fill={QC_COLORS.captured.contextCaptureBlack} stroke="none" d="M16 0h1v1h-1ZM18 1h1v1h-1ZM4 2h1v1h-1ZM3 3h1v1h-1ZM22 5h1v1h-1ZM22 6h1v1h-1ZM0 15h1v1h-1ZM2 19h1v1h-1ZM6 22h1v1h-1ZM18 22h1v1h-1ZM8 23h1v1h-1Z" />
      </svg>
    );
  if (kind === "cpu")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M7 0h2v1h-2ZM15 0h2v1h-2ZM7 1h2v1h-2ZM15 1h2v1h-2ZM3 2h18v1h-18ZM2 3h20v1h-20ZM2 4h3v1h-3ZM19 4h3v1h-3ZM2 5h2v1h-2ZM20 5h2v1h-2ZM2 6h2v1h-2ZM20 6h2v1h-2ZM0 7h4v1h-4ZM7 7h10v1h-10ZM20 7h4v1h-4ZM0 8h4v1h-4ZM7 8h10v1h-10ZM20 8h4v1h-4ZM2 9h2v1h-2ZM7 9h2v1h-2ZM15 9h2v1h-2ZM20 9h2v1h-2ZM2 10h2v1h-2ZM7 10h2v1h-2ZM15 10h2v1h-2ZM20 10h2v1h-2ZM2 11h2v1h-2ZM7 11h2v1h-2ZM15 11h2v1h-2ZM20 11h2v1h-2ZM2 12h2v1h-2ZM7 12h2v1h-2ZM15 12h2v1h-2ZM20 12h2v1h-2ZM2 13h2v1h-2ZM7 13h2v1h-2ZM15 13h2v1h-2ZM20 13h2v1h-2ZM2 14h2v1h-2ZM7 14h2v1h-2ZM15 14h2v1h-2ZM20 14h2v1h-2ZM0 15h4v1h-4ZM7 15h10v1h-10ZM20 15h4v1h-4ZM0 16h4v1h-4ZM7 16h10v1h-10ZM20 16h4v1h-4ZM2 17h2v1h-2ZM20 17h2v1h-2ZM2 18h2v1h-2ZM20 18h2v1h-2ZM2 19h3v1h-3ZM19 19h3v1h-3ZM2 20h20v1h-20ZM3 21h18v1h-18ZM7 22h2v1h-2ZM15 22h2v1h-2ZM7 23h2v1h-2ZM15 23h2v1h-2Z" />
      </svg>
    );
  if (kind === "subtract")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12h16" />
      </svg>
    );
  if (kind === "previous")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15 5-7 7 7 7" />
      </svg>
    );
  if (kind === "up")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 15 7-7 7 7" />
      </svg>
    );
  if (kind === "more")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
      </svg>
    );
  if (kind === "refresh")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.882 6.692A8 8 0 0 0 4 12.892C4 17.347 7.582 20.96 12 20.978V19l6 3.029-6 3.03v-2.06C6.474 22.981 2 18.463 2 12.892A10 10 0 0 1 4.912 5.774l1.97.918ZM14 3.209c4.564.965 8 5.167 8 10.206a10.19 10.19 0 0 1-2.337 6.689l-1.801-1.024A8.135 8.135 0 0 0 20 13.415c0-3.882-2.55-7.142-6-8.067V7l-6-3 6-3v2.209Z" />
      </svg>
    );
  if (kind === "microphone")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8.25" y="2.5" width="7.5" height="13" rx="3.75" />
        <path d="M5.5 11.25v.75a6.5 6.5 0 0 0 13 0v-.75M12 18.5v3M8.75 21.5h6.5" />
      </svg>
    );
  if (kind === "attachment")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="m8 12 6.7-6.7a3 3 0 0 1 4.3 4.2l-8.5 8.6a5 5 0 0 1-7.1-7.1l8-8" />
      </svg>
    );
  if (kind === "send")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 14 7-7 7 7M12 7v12" />
      </svg>
    );
  if (kind === "stop")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <rect className="qc-ui-icon-fill" x="6" y="6" width="12" height="12" rx="1" />
      </svg>
    );
  return null;
}

export function QcHardwareIcon({ kind, className }: { kind: QcHardwareIconName; className?: string }) {
  if (kind === "power")
    return (
      <svg className={className} viewBox="3 2 18 20" aria-hidden="true">
        <path d="M12 3v8M7.3 6.4a7.5 7.5 0 1 0 9.4 0" fill="none" stroke={QC_COLORS.hardware.whiteLed} />
      </svg>
    );
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9 1 3.5 8H7l-1 7 6.5-8H9z" fill={QC_COLORS.hardware.whiteLed} stroke="none" />
    </svg>
  );
}

export function QcScreenHeaderGlyph({ kind }: { kind: QcScreenHeaderGlyphName }) {
  if (kind === "undo") return <path shapeRendering="crispEdges" fill={QC_COLORS.captured.headerUndo} d="M619 12h2v1h-2ZM617 13h5v1h-5ZM616 14h8v1h-8ZM615 15h11v1h-11ZM615 16h13v1h-13ZM617 17h5v1h-5ZM623 17h6v1h-6ZM619 18h2v1h-2ZM625 18h4v1h-4ZM626 19h4v1h-4ZM627 20h3v1h-3ZM628 21h3v1h-3ZM628 22h3v1h-3ZM628 23h3v1h-3ZM609 24h2v1h-2ZM628 24h4v1h-4ZM608 25h4v1h-4ZM628 25h4v1h-4ZM608 26h4v1h-4ZM628 26h4v1h-4ZM609 27h3v1h-3ZM628 27h3v1h-3ZM609 28h3v1h-3ZM628 28h3v1h-3ZM609 29h4v1h-4ZM627 29h4v1h-4ZM610 30h4v1h-4ZM626 30h4v1h-4ZM610 31h5v1h-5ZM625 31h5v1h-5ZM611 32h5v1h-5ZM624 32h5v1h-5ZM612 33h16v1h-16ZM613 34h14v1h-14ZM615 35h10v1h-10ZM619 36h2v1h-2Z" />;
  if (kind === "save") return <path shapeRendering="crispEdges" fill={QC_COLORS.captured.primaryText} d="M706 13h17v1h-17ZM705 14h19v1h-19ZM705 15h2v18h-2ZM722 15h3v1h-3ZM723 16h3v1h-3ZM709 17h6v3h-6ZM717 17h3v3h-3ZM724 17h3v1h-3ZM725 18h2v15h-2ZM709 20h11v3h-11ZM705 33h22v1h-22ZM706 34h20v1h-20Z" />;
  if (kind === "export") return <path shapeRendering="crispEdges" fill={QC_COLORS.captured.headerSave} d={referencePath("screen-header.export")} transform="translate(704 10)" />;
  return <path shapeRendering="crispEdges" fill={QC_COLORS.captured.headerMenu} d="M765 13h1v1h-1ZM764 14h3v1h-3ZM763 15h5v1h-5ZM764 16h3v1h-3ZM765 17h1v1h-1ZM765 21h1v1h-1ZM764 22h3v1h-3ZM763 23h5v1h-5ZM764 24h3v1h-3ZM765 25h1v1h-1ZM765 29h1v1h-1ZM764 30h3v1h-3ZM763 31h5v1h-5ZM764 32h3v1h-3ZM765 33h1v1h-1Z" />;
}

const ROUTE_STEREO_OUTPUT_RASTER = "M23 3h2v1h-2ZM22 4h4v1h-4ZM23 5h3v1h-3ZM24 6h3v1h-3ZM24 7h4v1h-4ZM4 8h25v1h-25ZM4 9h25v1h-25ZM24 10h4v1h-4ZM24 11h3v1h-3ZM23 12h3v1h-3ZM22 13h4v1h-4ZM23 14h2v1h-2ZM23 17h2v1h-2ZM22 18h4v1h-4ZM23 19h3v1h-3ZM24 20h3v1h-3ZM24 21h4v1h-4ZM4 22h25v1h-25ZM4 23h25v1h-25ZM24 24h4v1h-4ZM24 25h3v1h-3ZM23 26h3v1h-3ZM22 27h4v1h-4ZM23 28h2v1h-2Z";

/** Shared CorOS routing glyph vocabulary used by both app hosts. */
export function QcRouteGlyph({ side, label }: { side: "input" | "output"; label: string }) {
  if (side === "input" && /^(?:In|Input) \d+$/.test(label))
    return (
      <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
        <path d={referencePath("route.analog-input")} fill={QC_COLORS.captured.primaryText} stroke="none" />
      </svg>
    );
  if (label === "Internal")
    return (
      <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M4 2h24v1h-24ZM3 3h26v1h-26ZM2 4h2v1h-2ZM28 4h2v1h-2ZM1 5h2v1h-2ZM29 5h2v1h-2ZM1 6h2v1h-2ZM29 6h2v1h-2ZM1 7h2v1h-2ZM29 7h2v1h-2ZM1 8h2v1h-2ZM29 8h2v1h-2ZM1 9h2v1h-2ZM29 9h2v1h-2ZM1 10h2v1h-2ZM29 10h2v1h-2ZM1 11h2v1h-2ZM29 11h2v1h-2ZM1 12h2v1h-2ZM29 12h2v1h-2ZM1 13h2v1h-2ZM29 13h2v1h-2ZM1 14h2v1h-2ZM29 14h2v1h-2ZM1 15h2v1h-2ZM29 15h2v1h-2ZM1 16h2v1h-2ZM29 16h2v1h-2ZM1 17h2v1h-2ZM29 17h2v1h-2ZM1 18h2v1h-2ZM29 18h2v1h-2ZM1 19h2v1h-2ZM29 19h2v1h-2ZM1 20h2v1h-2ZM29 20h2v1h-2ZM1 21h2v1h-2ZM29 21h2v1h-2ZM1 22h2v1h-2ZM29 22h2v1h-2ZM1 23h2v1h-2ZM29 23h2v1h-2ZM1 24h2v1h-2ZM29 24h2v1h-2ZM1 25h2v1h-2ZM29 25h2v1h-2ZM1 26h2v1h-2ZM29 26h2v1h-2ZM1 27h2v1h-2ZM29 27h2v1h-2ZM1 28h2v1h-2ZM29 28h2v1h-2ZM2 29h2v1h-2ZM28 29h2v1h-2ZM3 30h26v1h-26ZM4 31h24v1h-24Z" fill={QC_COLORS.captured.routeGlyphSurface} stroke="none" />
        <path d="M15 10h2v1h-2ZM15 11h2v1h-2ZM15 12h2v1h-2ZM15 13h2v1h-2ZM15 14h2v1h-2ZM15 15h2v1h-2ZM9 16h14v1h-14ZM9 17h14v1h-14ZM15 18h2v1h-2ZM15 19h2v1h-2ZM15 20h2v1h-2ZM15 21h2v1h-2ZM15 22h2v1h-2ZM15 23h2v1h-2Z" fill={QC_COLORS.captured.utilityMark} stroke="none" />
      </svg>
    );
  if (label.startsWith("USB "))
    return (
      <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M15 2h2v1h-2ZM14 3h1v1h-1ZM17 3h1v1h-1ZM14 4h1v1h-1ZM17 4h1v1h-1ZM13 5h1v1h-1ZM18 5h1v1h-1ZM12 6h1v1h-1ZM19 6h1v1h-1ZM11 8h10v1h-10ZM15 9h2v1h-2ZM22 9h5v1h-5ZM15 10h2v1h-2ZM21 10h1v1h-1ZM6 11h1v1h-1ZM8 11h2v1h-2ZM15 11h2v1h-2ZM21 11h1v1h-1ZM5 12h1v1h-1ZM15 12h2v1h-2ZM21 12h1v1h-1ZM10 13h1v1h-1ZM15 13h2v1h-2ZM21 13h1v1h-1ZM15 14h2v1h-2ZM21 14h1v1h-1ZM5 15h1v1h-1ZM9 15h1v1h-1ZM15 15h2v1h-2ZM23 15h3v1h-3ZM6 16h3v1h-3ZM15 16h2v1h-2ZM23 16h3v1h-3ZM6 17h3v1h-3ZM15 17h2v1h-2ZM22 17h3v1h-3ZM6 18h3v1h-3ZM15 18h2v1h-2ZM20 18h4v1h-4ZM6 19h3v1h-3ZM15 19h9v1h-9ZM7 20h2v1h-2ZM15 20h7v1h-7ZM7 21h3v1h-3ZM15 21h2v1h-2ZM8 22h4v1h-4ZM15 22h2v1h-2ZM8 23h9v1h-9ZM10 24h7v1h-7ZM15 25h2v1h-2ZM15 26h2v1h-2ZM13 27h1v1h-1ZM18 27h1v1h-1ZM12 29h1v1h-1ZM19 29h1v1h-1ZM13 31h1v1h-1ZM18 31h1v1h-1Z" fill={QC_COLORS.captured.utilityMark} stroke="none" />
        <path d="M15 3h2v1h-2ZM15 4h2v1h-2ZM14 5h4v1h-4ZM13 6h6v1h-6ZM12 7h8v1h-8ZM22 10h5v1h-5ZM7 11h1v1h-1ZM22 11h5v1h-5ZM6 12h4v1h-4ZM22 12h5v1h-5ZM5 13h5v1h-5ZM22 13h5v1h-5ZM5 14h5v1h-5ZM22 14h5v1h-5ZM6 15h3v1h-3ZM14 27h4v1h-4ZM13 28h6v1h-6ZM13 29h6v1h-6ZM13 30h6v1h-6ZM14 31h4v1h-4Z" fill={QC_COLORS.captured.primaryText} stroke="none" />
      </svg>
    );
  if (label.startsWith("Return "))
    return (
      <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M4 2h24v1h-24ZM3 3h26v1h-26ZM2 4h2v1h-2ZM28 4h2v1h-2ZM1 5h2v1h-2ZM29 5h2v1h-2ZM1 6h2v1h-2ZM29 6h2v1h-2ZM1 7h2v1h-2ZM29 7h2v1h-2ZM7 12h2v1h-2ZM11 12h1v1h-1ZM14 12h1v1h-1ZM27 13h1v1h-1ZM3 14h4v1h-4ZM12 14h1v1h-1ZM3 15h1v1h-1ZM15 15h1v1h-1ZM30 15h1v1h-1ZM31 16h1v1h-1ZM3 18h1v1h-1ZM15 18h1v1h-1ZM30 18h1v1h-1ZM3 19h1v1h-1ZM9 19h1v1h-1ZM12 19h1v1h-1ZM3 20h1v1h-1ZM27 20h1v1h-1ZM3 21h1v1h-1ZM11 21h1v1h-1ZM17 21h1v1h-1ZM1 26h2v1h-2ZM29 26h2v1h-2ZM1 27h2v1h-2ZM29 27h2v1h-2ZM1 28h2v1h-2ZM29 28h2v1h-2ZM2 29h2v1h-2ZM28 29h2v1h-2ZM3 30h26v1h-26ZM4 31h24v1h-24Z" fill={QC_COLORS.captured.routeGlyphSurface} stroke="none" />
        <path d="M1 12h6v1h-6ZM9 12h2v1h-2ZM15 12h2v1h-2ZM25 12h1v1h-1ZM1 13h7v1h-7ZM9 13h3v1h-3ZM14 13h3v1h-3ZM25 13h2v1h-2ZM1 14h2v1h-2ZM10 14h2v1h-2ZM13 14h3v1h-3ZM25 14h4v1h-4ZM1 15h2v1h-2ZM10 15h5v1h-5ZM25 15h5v1h-5ZM1 16h6v1h-6ZM11 16h4v1h-4ZM25 16h6v1h-6ZM1 17h6v1h-6ZM11 17h4v1h-4ZM25 17h7v1h-7ZM1 18h2v1h-2ZM10 18h5v1h-5ZM25 18h5v1h-5ZM1 19h2v1h-2ZM10 19h2v1h-2ZM13 19h3v1h-3ZM25 19h4v1h-4ZM1 20h2v1h-2ZM9 20h3v1h-3ZM14 20h3v1h-3ZM25 20h2v1h-2ZM1 21h2v1h-2ZM8 21h3v1h-3ZM14 21h3v1h-3ZM25 21h1v1h-1Z" fill={QC_COLORS.captured.primaryText} stroke="none" />
      </svg>
    );
  if (label === "Multi Out" || label === "Multiple Outputs")
    return (
      <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
        <path d={ROUTE_STEREO_OUTPUT_RASTER} fill={QC_COLORS.captured.primaryText} stroke="none" />
      </svg>
    );
  if (label.startsWith("Send "))
    return (
      <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
        <path d={referencePath("route.send")} fill={QC_COLORS.captured.primaryText} stroke="none" />
      </svg>
    );
  if (label === "Out 1/2")
    return (
      <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
        <path d={ROUTE_STEREO_OUTPUT_RASTER} fill={QC_COLORS.captured.primaryText} stroke="none" />
      </svg>
    );
  if (label === "Out 1" || label === "Out 2")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="7.6" r="1.15" />
        <circle cx="8.2" cy="14.2" r="1.15" />
        <circle cx="15.8" cy="14.2" r="1.15" />
      </svg>
    );
  if (label.startsWith("Out "))
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 5.5a7 7 0 1 0 0 13" />
        <path d="M8 12h12m-3-3 3 3-3 3" />
      </svg>
    );
  if (label.startsWith("Row "))
    return (
      <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M26 3h2v1h-2ZM26 4h3v1h-3ZM26 5h4v1h-4ZM2 6h30v1h-30ZM2 7h30v1h-30ZM26 8h5v1h-5ZM26 9h3v1h-3ZM26 10h2v1h-2ZM30 16h2v1h-2ZM30 17h2v1h-2ZM30 18h2v1h-2ZM30 19h2v1h-2ZM30 20h2v1h-2ZM6 21h2v1h-2ZM30 21h2v1h-2ZM5 22h3v1h-3ZM30 22h2v1h-2ZM4 23h4v1h-4ZM30 23h2v1h-2ZM2 24h30v1h-30ZM2 25h30v1h-30ZM3 26h5v1h-5ZM5 27h3v1h-3ZM6 28h2v1h-2Z" fill={QC_COLORS.captured.primaryText} stroke="none" />
      </svg>
    );
  if (label.includes("/"))
    return (
      <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
        <path d={ROUTE_STEREO_OUTPUT_RASTER} fill={QC_COLORS.captured.primaryText} stroke="none" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="7" cy="12" r="3" />
      <path d={side === "input" ? "M10 12h10l-3-3m3 3-3 3" : "M14 12H4l3-3m-3 3 3 3"} />
    </svg>
  );
}

export function QcModeGlyph({ mode }: { mode: PresetSnapshot["mode"] }) {
  if (mode === "PRESET")
    return (
      <g fill="currentColor">
        {[0, 8, 16].map((y) => (
          <g key={y} transform={`translate(0 ${y})`}>
            <rect x="0" y="1" width="6" height="6" rx=".8" />
            <rect x="9" y="1" width="6" height="6" rx=".8" />
            <rect x="18" y="1" width="6" height="6" rx=".8" />
            <rect x="5" y="3" width="5" height="2" />
            <rect x="14" y="3" width="5" height="2" />
          </g>
        ))}
      </g>
    );
  if (mode === "SCENE")
    return (
      <g fill="currentColor" fontFamily={QC_TYPOGRAPHY.devicePlain} fontWeight="800" fontSize="7.5" textAnchor="middle">
        <rect x="0" y="0" width="11" height="11" />
        <rect x="13" y="0" width="11" height="11" />
        <rect x="0" y="13" width="11" height="11" />
        <rect x="13" y="13" width="11" height="11" />
        <text x="5.5" y="8" fill={QC_COLORS.device.panel}>
          A
        </text>
        <text x="18.5" y="8" fill={QC_COLORS.device.panel}>
          B
        </text>
        <text x="5.5" y="21" fill={QC_COLORS.device.panel}>
          C
        </text>
        <text x="18.5" y="21" fill={QC_COLORS.device.panel}>
          D
        </text>
      </g>
    );
  if (mode === "HYBRID")
    return (
      <g>
        <g transform="scale(.68)">
          <QcModeGlyph mode="SCENE" />
        </g>
        <g transform="translate(9 8) scale(.62)">
          <QcModeGlyph mode="STOMP" />
        </g>
      </g>
    );
  return (
    <g transform="translate(-525 -78)" fill="currentColor">
      <path d="M535.723 79.2008C532.977 81.2508 530.778 82.8924 529.127 84.1255L528.27 84.7656C527.385 85.4269 526.705 85.9358 526.228 86.2924C525.319 86.9726 524.915 87.9041 525.015 89.087L542.055 84.521C541.833 83.0083 542.929 81.2361 545.255 79.1766C544.988 78.8037 544.691 78.4115 544.363 78C542.639 80.0488 540.862 81.2219 539.031 81.5192C537.2 81.8165 536.097 81.0437 535.723 79.2008ZM543.102 84.2407L547.01 83.1933C547.096 82.4398 546.701 81.3799 545.825 80.0139C543.899 81.7499 543.016 83.1667 543.102 84.2407ZM547.559 85.3468L525.619 91.2257C525.399 90.7294 525.237 90.2624 525.135 89.8246L525.201 90.0724L547.243 84.1663L547.559 85.3468ZM529.966 92.3084L533.966 91.2257V94.675L536.966 94.675V98.675H526.966V94.675L529.966 94.675V92.3084Z" />
    </g>
  );
}

export function QcDirectoryIcon({ kind, number }: { kind: QcDirectoryIconName; number?: number }) {
  const classes = `qc-directory-icon qc-directory-icon-${kind}`;
  const referenceIcon = directoryReferenceIcon(kind);
  if (referenceIcon) return <QcReferenceRaster icon={referenceIcon} color={QC_COLORS.captured.iconPrimary} className={classes} />;
  if (kind === "grid")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        {[0, 8, 16].map((y) => (
          <g key={y} transform={`translate(0 ${y})`}>
            <rect x="0" y="1" width="6" height="6" rx=".8" />
            <rect x="9" y="1" width="6" height="6" rx=".8" />
            <rect x="18" y="1" width="6" height="6" rx=".8" />
            <rect x="5" y="3" width="5" height="2" />
            <rect x="14" y="3" width="5" height="2" />
          </g>
        ))}
      </svg>
    );
  if (kind === "folder")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M0 0h10l3 4.5h11V20H0Z" />
        {number !== undefined && (
          <text className="folder-number" x="12" y="14" textAnchor="middle" fontFamily={QC_TYPOGRAPHY.devicePlain} fontSize={number === 0 ? "8" : "9"} fontWeight="700" transform={number === 0 ? "translate(0 -2.8) scale(1 1.4)" : undefined}>
            {number}
          </text>
        )}
      </svg>
    );
  // The following toolbar geometry is normalized directly from Neural DSP's
  // CorOS 4.1 manual vectors (the documented 24px glyph area is x=31..55,
  // y=10..34 inside each 66x44 toolbar button).
  if (kind === "new-folder")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 10c.379 0 .725.214.895.553L13.618 14H22c1.105 0 2 .895 2 2v13c0 1.105-.895 2-2 2H12v-2h10V16h-9c-.379 0-.725-.214-.895-.553L10.382 12H2v8H0v-8c0-1.105.895-2 2-2h9Z" transform="translate(0 -10)" />
        <path d="M7 25h4v2H7v4H5v-4H1v-2h4v-4h2v4Z" transform="translate(0 -10)" />
      </svg>
    );
  if (kind === "sort")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 4H1v2h13V4Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" />
        <path d="M23 3.195 19.342 8 16 5.367l1.263-1.555 1.713 1.349L21.383 2 23 3.195Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" />
        <path d="M14 11H1v2h13v-2Z" fill={QC_COLORS.captured.iconToolbarMuted} stroke="none" />
        <path d="M14 18H1v2h13v-2Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" />
        <path d="M23 17.195 19.342 22 16 19.367l1.263-1.555 1.713 1.349L21.383 16 23 17.195Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" />
      </svg>
    );
  if (kind === "arrange" || kind === "upload")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15 6 4-5 4 5h-8ZM23 14l-4 5-4-5h8ZM18 5v9h2V5h-2ZM5 1H1v2h4V1ZM9 7H1v2h8V7ZM13 14H1v2h12v-2ZM23 21H1v2h22v-2Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" />
      </svg>
    );
  if (kind === "filter")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M22 4.254c0 .259-.101.508-.281.695l-6.438 6.658a1 1 0 0 0-.281.695v6.832a1 1 0 0 1-.521.878l-4 2.181A1 1 0 0 1 9 21.316v-9.014a1 1 0 0 0-.281-.695L2.281 4.949A1 1 0 0 1 2 4.254V4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v.254ZM4.176 5 11 12.058v7.573l2-1.091v-6.482L19.824 5H4.176Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" />
      </svg>
    );
  if (kind === "search")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M10 2a8 8 0 1 0 4.914 14.314L19.6 21 21 19.6l-4.686-4.686A8 8 0 0 0 10 2Zm-6 8a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" />
      </svg>
    );
  return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M8 3h8M5 8h14v14H5ZM9 12l6 7m0-7-6 7" fill="none" />
      </svg>
    );
  return (
    <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 13 5 5L20 6" fill="none" />
    </svg>
  );
}

export function QcLibraryIcon({ kind, className }: { kind: QcLibraryIconName; className?: string }) {
  const classes = `qc-library-icon qc-library-icon-${kind}${className ? ` ${className}` : ""}`;
  const heartPath = "M12 21 4.4 13.7C.5 9.8 3 4 7.4 4c2.1 0 3.4 1.2 4.6 2.7C13.2 5.2 14.5 4 16.6 4 21 4 23.5 9.8 19.6 13.7Z";
  if (kind === "clock") return <QcReferenceRaster icon="library.clock" color={QC_COLORS.captured.iconPrimary} className={classes} />;
  if (kind === "neural-mark") return <QcReferenceRaster icon="library.neural-mark" color={QC_COLORS.captured.libraryMark} className={classes} />;
  if (kind === "capture-library")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 2v20M6 5v17M10 2v20M14 4l7 18" fill="none" stroke={QC_COLORS.captured.iconPrimary} strokeWidth="2" strokeLinecap="butt" />
      </svg>
    );
  if (kind === "capture-header")
    return (
      <svg className={classes} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M3 4h9v1H3ZM0 8h12v1H0ZM0 12h12v1H0ZM1 16h11v1H1ZM4 20h8v1H4Z" fill={QC_COLORS.captured.captureStripeLow} stroke="none" />
        <path d="M5 2h7v1H5ZM2 6h10v1H2ZM1 10h11v1H1ZM1 14h11v1H1ZM3 18h9v1H3ZM8 22h4v1H8Z" fill={QC_COLORS.captured.captureStripeShadow} stroke="none" />
        <path d="M18 2h1v1h-1ZM4 3h8v1H4ZM1 7h11v1H1ZM23 10h1v1h-1ZM0 11h12v1H0ZM23 14h1v1h-1ZM1 15h11v1H1ZM3 19h9v1H3ZM20 20h1v1h-1Z" fill={QC_COLORS.captured.captureStripeDark} stroke="none" />
        <path d="M12 2h3v1h-3ZM12 6h10v1H12ZM12 10h11v1H12ZM12 14h11v1H12ZM12 18h10v1H12ZM19 21h1v1h-1ZM12 22h6v1H12Z" fill={QC_COLORS.captured.captureStripeMuted} stroke="none" />
        <path d="M16 4h5v1h-5ZM17 16h5v1h-5ZM16 20h3v1h-3Z" fill={QC_COLORS.captured.captureStripeSoft} stroke="none" />
        <path d="M12 4h4v1h-4ZM12 8h11v1H12ZM12 12h11v1H12ZM12 16h5v1H12ZM12 20h4v1H12Z" fill={QC_COLORS.captured.captureStripeLight} stroke="none" />
        <path d="M12 1h4v1h-4ZM12 5h9v1h-9ZM12 9h11v1H12ZM12 13h11v1H12ZM12 17h10v1H12ZM12 21h6v1H12Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" />
      </svg>
    );
  if (kind === "binoculars") return <QcReferenceRaster icon="library.binoculars" color={QC_COLORS.captured.iconPrimary} className={classes} crisp={false} />;
  if (kind === "broken-heart")
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
        <path d={heartPath} />
        <path d="m13 6-3 5h3l-2 5" fill="none" stroke={QC_COLORS.device.panelRaised} strokeWidth="2" />
      </svg>
    );
  return (
    <svg className={classes} viewBox="0 0 24 24" aria-hidden="true">
      <path d={heartPath} fill="none" />
    </svg>
  );
}

export function QcEditorIcon({ kind }: { kind: QcEditorIconName }) {
  const referenceIcon = editorReferenceIcon(kind);
  if (referenceIcon) return <QcReferenceRasterLayers icon={referenceIcon} />;
  if (kind === "looper") {
    return <svg viewBox="0 0 26 24" shapeRendering="crispEdges" aria-hidden="true"><path d={referencePath("editor.looper", 1)} fill={QC_COLORS.captured.looperRing} stroke="none" /><path d={referencePath("editor.looper", 0)} fill={QC_COLORS.captured.iconPrimary} stroke="none" /></svg>;
  }
  if (kind === "band-power")
    return (
      <svg viewBox="0 0 24 24" shapeRendering="crispEdges" data-qc-icon={kind} aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M11 6h2v1h-2ZM6 7h2v1h-2ZM11 7h2v1h-2ZM16 7h2v1h-2ZM5 8h3v1h-3ZM11 8h2v1h-2ZM16 8h3v1h-3ZM4 9h4v1h-4ZM11 9h2v1h-2ZM16 9h4v1h-4ZM3 10h4v1h-4ZM11 10h2v1h-2ZM17 10h4v1h-4ZM3 11h3v1h-3ZM11 11h2v1h-2ZM18 11h3v1h-3ZM2 12h3v1h-3ZM11 12h2v1h-2ZM19 12h3v1h-3ZM2 13h3v1h-3ZM11 13h2v1h-2ZM19 13h3v1h-3ZM2 14h3v1h-3ZM11 14h2v1h-2ZM19 14h3v1h-3ZM2 15h2v1h-2ZM20 15h2v1h-2ZM2 16h2v1h-2ZM20 16h2v1h-2ZM2 17h3v1h-3ZM19 17h3v1h-3ZM2 18h3v1h-3ZM19 18h3v1h-3ZM2 19h3v1h-3ZM19 19h3v1h-3ZM3 20h3v1h-3ZM18 20h3v1h-3ZM3 21h4v1h-4ZM17 21h4v1h-4ZM4 22h4v1h-4ZM16 22h4v1h-4ZM5 23h6v1h-6ZM13 23h6v1h-6Z" />
      </svg>
    );
  if (kind === "footswitch")
    return (
      <svg viewBox="0 0 24 24" shapeRendering="crispEdges" data-qc-icon={kind} aria-hidden="true">
        <path fill={QC_COLORS.captured.primaryText} stroke="none" d="M18 3h2v1h-2ZM10 4h1v1h-1ZM17 4h3v1h-3ZM8 5h4v1h-4ZM16 5h6v1h-6ZM7 6h15v1h-15ZM6 7h16v1h-16ZM4 8h18v1h-18ZM3 9h14v1h-14ZM18 9h5v1h-5ZM2 10h13v1h-13ZM16 10h7v1h-7ZM1 11h10v1h-10ZM12 11h8v1h-8ZM0 12h7v1h-7ZM8 12h8v1h-8ZM0 13h4v1h-4ZM5 13h7v1h-7ZM1 14h8v1h-8ZM0 15h5v1h-5ZM6 16h3v1h-3ZM5 17h4v1h-4ZM5 18h4v1h-4ZM2 19h10v1h-10ZM2 20h10v1h-10ZM2 21h10v1h-10ZM2 22h10v1h-10ZM2 23h10v1h-10Z" />
      </svg>
    );
  if (kind === "assignment-expression")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 18h12l-1.6-8.4H8.1L6 18Zm2.2-8.4 1-3.6h5.7l1.5 3.6M9 21h6" />
      </svg>
    );
  return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="m8 16.5 5.2 5.1L24.5 10" />
      </svg>
    );
  return (
    <svg viewBox="0 0 80 32" aria-hidden="true">
      <path d="M2 16h11l7-12 14 24L48 4l7 12h23" />
    </svg>
  );
}
