import { QC_COLORS, QC_TYPOGRAPHY } from "@qc-remote/theme";
import { QcDeviceCategoryGlyph } from "./device-category-glyph";

export type QcScreenGlyphName =
  | "about" | "backup" | "brightness" | "capture-target" | "cloud" | "copy"
  | "device" | "diagnostics" | "edit" | "factory" | "gig-view" | "global-bypass"
  | "headphones" | "hold" | "info" | "latency" | "licenses" | "link" | "lock" | "midi" | "power" | "power-functions" | "report" | "scene-bypass"
  | "status" | "stomp-bypass" | "storage" | "swap" | "system" | "updates" | "user"
  | "volume" | "wifi" | "progress" | "shift" | "pin"
  | "route-input" | "route-output" | "route-row" | "route-usb";

export function QcScreenGlyph({ kind, className }: { kind: QcScreenGlyphName; className?: string }) {
  const frame = { className: `qc-screen-glyph qc-screen-glyph-${kind}${className ? ` ${className}` : ""}`, viewBox: "0 0 24 24", "data-qc-screen-glyph": kind, "aria-hidden": true } as const;
  const cloud = "M4 18h14a4 4 0 0 0 .5-8A7 7 0 0 0 5 9a4.5 4.5 0 0 0-1 9Z";
  if (kind === "status") return <svg {...frame}><path className="status-error" d="m2 3 6 6m0-6L2 9" /><path className="status-bars" d="M3 20v-3m4 3v-6m4 6v-9m4 9V8m4 12V5" /></svg>;
  if (kind === "capture-target") return <svg {...frame}><circle cx="12" cy="12" r="8" /><path d="M12 3v18M3 12h18" /></svg>;
  if (kind === "user") return <svg {...frame}><circle cx="12" cy="7" r="4" /><path d="M5 22v-5a7 7 0 0 1 14 0v5" /></svg>;
  if (kind === "backup") return <svg {...frame}><path d={cloud} /><path d="m8 12-3 3 3 3m8-6 3 3-3 3M5 15h5m9 0h-5" /></svg>;
  if (kind === "cloud") return <svg {...frame}><path d={cloud} /></svg>;
  if (kind === "global-bypass") return <svg {...frame}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M4 5 2.5 3.5M20 5l1.5-1.5M4 19l-1.5 1.5M20 19l1.5 1.5" /></svg>;
  if (kind === "scene-bypass") return <svg {...frame}><path d="M12 3v8" /><path d="M6.5 6.5a8 8 0 1 0 11 0" /></svg>;
  if (kind === "stomp-bypass") return <svg {...frame}><path d="M4 15.5 14.5 11l5.5 2.4-10.5 4.5L4 15.5Zm3.5-2.2 1.3-4.8 7.4-3 1.3 5.4M5 19h9M7 19v2h5v-2" /><circle cx="18.5" cy="18.5" r="1.5" /></svg>;
  if (kind === "hold") return <svg {...frame}><circle cx="12" cy="12" r="9" /><path d="M12 12V5a7 7 0 0 1 7 7Z" fill="currentColor" stroke="none" /></svg>;
  if (kind === "latency") return <svg {...frame}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
  if (kind === "midi") return <svg {...frame}><circle cx="12" cy="12" r="9" />{[[8,10],[12,8],[16,10],[9,15],[15,15]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.2" fill="currentColor" />)}</svg>;
  if (kind === "headphones") return <svg {...frame}><path d="M4 16v-4a8 8 0 0 1 16 0v4" /><rect x="2" y="14" width="5" height="7" rx="2" /><rect x="17" y="14" width="5" height="7" rx="2" /></svg>;
  if (kind === "swap") return <svg {...frame}><path d="M3 8h16m0 0-3.5-3.5M19 8l-3.5 3.5M21 16H5m0 0 3.5-3.5M5 16l3.5 3.5" /></svg>;
  if (kind === "gig-view") return <svg {...frame}><g className="settings-scene-cells"><rect x="2" y="3" width="8" height="8" /><rect x="14" y="3" width="8" height="8" /><rect x="2" y="13" width="8" height="8" /><rect x="14" y="13" width="8" height="8" /></g><path d="M10 7h4M10 17h4" /></svg>;
  if (kind === "power") return <svg {...frame}><path d="M12 2v9M6.35 5.35a8 8 0 1 0 11.3 0" /></svg>;
  if (kind === "device") return <svg {...frame}><rect x="4" y="2" width="16" height="20" rx="2" /><rect x="7" y="5" width="10" height="5" /><path d="M8 14h1m3 0h1m3 0h1M8 18h1m3 0h1m3 0h1" /></svg>;
  if (kind === "system" || kind === "brightness") return <svg {...frame}><circle cx="12" cy="12" r="4" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>;
  if (kind === "about") return <svg {...frame}><path d="m3 16 4-10 4 13 4-8 3 5h3" /></svg>;
  if (kind === "info") return <svg {...frame}><circle cx="12" cy="12" r="10" /><path d="M12 10v7M12 7h.01" /></svg>;
  if (kind === "report") return <svg {...frame}><circle cx="12" cy="12" r="7" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M19 5l-3 3M8 16l-3 3" /></svg>;
  if (kind === "diagnostics") return <svg {...frame}><path d="M10 3h4v18h-4zM3 10h18v4H3z" fill="currentColor" stroke="none" /></svg>;
  if (kind === "licenses") return <svg {...frame}><path d="M5 2h9l5 5v15H5zM8 12h8M8 16h8M8 8h3" /></svg>;
  if (kind === "wifi") return <svg {...frame}><path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0" /><circle cx="12" cy="20" r="1" fill="currentColor" /></svg>;
  if (kind === "updates") return <svg {...frame}><path d="M18 7V2l-3 3a8 8 0 1 0 4 13M6 17v5l3-3" /></svg>;
  if (kind === "power-functions") return <svg {...frame}><rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" stroke="none" /><path d="m13 4-6 10h5l-1 6 6-10h-5z" stroke={QC_COLORS.device.panelRaised} /></svg>;
  if (kind === "volume") return <svg {...frame}><circle cx="12" cy="12" r="8" /><path d="M12 12 18 6" /></svg>;
  if (kind === "storage") return <svg {...frame}><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" /><path d="M12 2v10h10" stroke={QC_COLORS.device.panelRaised} /></svg>;
  if (kind === "factory") return <svg {...frame}><path d="M3 7h18v15H3zM7 2v8m5-8v8m5-8v8M7 16v2m5-2v2m5-2v2" /></svg>;
  if (kind === "edit") return <svg {...frame}><path d="M4 5v15h15v-8M11 14 20 5l-3-3-9 9-1 4 4-1Z" /></svg>;
  if (kind === "copy") return <svg {...frame}><rect x="3" y="7" width="14" height="14" rx="2" /><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" /></svg>;
  if (kind === "progress") return <svg {...frame}><path d="M12 3a9 9 0 1 1-6.36 2.64" /><path d="M5.64 2.8v2.84H2.8" /></svg>;
  if (kind === "shift") return <svg {...frame}><path d="m4 11 8-8 8 8h-5v9H9v-9Z" /></svg>;
  if (kind === "pin") return <svg {...frame}><path d="m14 2 8 8-4 1-4 4v4l-2 2-3-6-6-3 2-2h4l4-4Z" /></svg>;
  if (kind === "route-usb") return <svg {...frame}><path d="M12 21V3m0 0L8 7m4-4 4 4m-4 5H7m0 0-3-3m3 3-3 3m8 4h6m0 0v-4m0 4 3-3" /></svg>;
  if (kind === "route-input") return <svg {...frame}><path d="M2 8h20m0 0-4-4m4 4-4 4M2 16h20m0 0-4-4m4 4-4 4" /></svg>;
  if (kind === "route-row") return <svg {...frame}><path d="M2 7h20l-4-4m4 4-4 4M22 17H2l4-4m-4 4 4 4" /></svg>;
  if (kind === "route-output") return <svg {...frame}><path d="M2 12h20m0 0-5-5m5 5-5 5" /></svg>;
  if (kind === "link") return <svg {...frame}><path d="M7 3H4v18h3M17 3h3v18h-3M9 12h6" /><rect x="7" y="9" width="2" height="6" /><rect x="15" y="9" width="2" height="6" /></svg>;
  return <svg {...frame}><path d="M4 10V7a8 8 0 0 1 16 0v3" /><rect x="2" y="10" width="20" height="12" rx="2" fill="currentColor" /></svg>;
}

export type QcLooperActionGlyphName = "duplicate" | "one-shot" | "half-speed" | "punch-in" | "record" | "play" | "reverse" | "undo";

export function QcLooperActionGlyph({ kind }: { kind: QcLooperActionGlyphName }) {
  const frame = { className: `qc-looper-action-glyph qc-looper-action-glyph-${kind}`, viewBox: "0 0 24 24", "data-qc-looper-action-glyph": kind, "aria-hidden": true } as const;
  if (kind === "duplicate") return <svg {...frame}><path d="M4 7h11v11H4zM9 3h11v11M8 11h3m-1.5-1.5v3" /></svg>;
  if (kind === "one-shot") return <svg {...frame}><path d="M18 7V3l3 3-3 3M20 6a8 8 0 1 0 1 9" /></svg>;
  if (kind === "half-speed") return <svg {...frame}><path d="M5 6h5l-5 6h5M14 5v14M18 7h2l-2 4h2" /></svg>;
  if (kind === "punch-in") return <svg {...frame}><path d="M5 5h14v14H5z" fill="currentColor" stroke="none" /><path d="M9 9h6v6H9z" stroke={QC_COLORS.captured.routePill} /></svg>;
  if (kind === "record") return <svg {...frame}><circle cx="12" cy="12" r="7" fill="currentColor" /></svg>;
  if (kind === "play") return <svg {...frame}><path d="m7 4 12 8-12 8Z" fill="currentColor" /></svg>;
  if (kind === "reverse") return <svg {...frame}><path d="m12 5-8 7 8 7Zm8 0-8 7 8 7Z" fill="currentColor" /></svg>;
  return <svg {...frame}><path d="M8 7H3v-5M4 7a9 9 0 1 1-1 10" /></svg>;
}

export function QcCaptureKindGlyph({ index }: { index: number }) {
  const frame = { viewBox: "0 0 48 48", "data-qc-capture-kind": index, "aria-hidden": true } as const;
  if (index === 0) return <svg {...frame}><circle cx="24" cy="24" r="19" /><path d="M11 16h26M8 20h32M6 24h36M8 28h32M11 32h26" /></svg>;
  if (index === 1) return <svg {...frame}><rect x="6" y="15" width="36" height="19" rx="1" /><path d="M10 19h28" /></svg>;
  if (index === 2) return <svg {...frame}><rect x="7" y="13" width="34" height="23" rx="1" /><path d="M10 17h28M31 22h6" /></svg>;
  if (index === 3) return <svg {...frame}><rect x="7" y="10" width="34" height="30" rx="1" /><path d="M12 6h24v7" /><circle cx="24" cy="25" r="9" /></svg>;
  if (index === 4) return <svg {...frame}><circle cx="24" cy="24" r="13" /><circle cx="9" cy="9" r="2" /><circle cx="39" cy="9" r="2" /><circle cx="9" cy="39" r="2" /><circle cx="39" cy="39" r="2" /><circle cx="24" cy="24" r="3" /></svg>;
  return <svg {...frame}><rect x="12" y="8" width="24" height="33" rx="3" /><circle cx="18" cy="15" r="2" /><circle cx="30" cy="15" r="2" /><circle cx="24" cy="27" r="5" /></svg>;
}

export function QcIoPortGlyph({ kind = "jack", primary = false }: { kind?: "square" | "midi" | "input" | "combo" | "jack"; primary?: boolean }) {
  const frame = { viewBox: "0 0 48 48", "data-qc-io-port": kind, "aria-hidden": true } as const;
  if (kind === "square") return <svg {...frame}><rect className="usb-port-core" x="12" y="16" width="24" height="14" rx="1" /></svg>;
  if (kind === "midi") return <svg {...frame}><circle cx="24" cy="24" r="18" /><path d="M10 13a20 20 0 0 0 28 0" />{[[16,20],[24,17],[32,20],[18,29],[30,29]].map(([x,y]) => <circle key={`${x}-${y}`} className="port-hole" cx={x} cy={y} r="2.3" />)}</svg>;
  if (kind === "input" || kind === "combo") return <svg {...frame}><circle cx="24" cy="24" r="17" />{primary && <circle className="port-core" cx="24" cy="24" r="13" />}{[[17,18],[31,18],[24,29]].map(([x,y]) => <circle key={`${x}-${y}`} className="port-hole" cx={x} cy={y} r="3" />)}<path d="M13 35l4-4m18 4-4-4" /></svg>;
  return <svg {...frame}><path d="M13 7h22l7 10v15L34 42H14L6 32V17Z" /><circle cx="24" cy="24" r="12" /><circle className="port-hole" cx="24" cy="24" r="4" /></svg>;
}

export function QcHeadphonesGlyph() {
  return <svg className="qc-screen-glyph qc-screen-glyph-headphones" viewBox="0 0 24 24" data-qc-screen-glyph="headphones" aria-hidden="true"><path d="M4 13v-2a8 8 0 0 1 16 0v2M4 12H2v7h4v-7H4Zm16 0h2v7h-4v-7h2Z" /></svg>;
}

export function QcGigStompGlyph({ index }: { index: number }) {
  const categories = ["Wah", "Overdrive", "Overdrive", "Overdrive", "Looper", "Pitch", "Utility", "Reverb"] as const;
  const labels = ["WAH", "DRV", "DRV", "DRV", "LOP", "PIT", "MULTI", "RVB"];
  const colors = [QC_COLORS.category.wah, QC_COLORS.category.overdrive, QC_COLORS.category.overdrive, QC_COLORS.category.overdrive, QC_COLORS.category.looper, QC_COLORS.category.pitch, QC_COLORS.category.utility, QC_COLORS.category.reverb];
  return <svg className="qc-gig-stomp-glyph" viewBox="0 0 70 70" data-qc-gig-stomp={index} aria-hidden="true"><rect x="4" y="4" width="62" height="62" rx="14" fill={QC_COLORS.captured.screen} stroke={colors[index]} strokeWidth="2.4" /><QcDeviceCategoryGlyph label={categories[index]} x={20} y={12} width={30} height={30} /><text x="35" y="54" textAnchor="middle" fill={QC_COLORS.captured.primaryText} fontFamily={QC_TYPOGRAPHY.devicePlain} fontSize="8" fontWeight="800">{labels[index]}</text></svg>;
}
