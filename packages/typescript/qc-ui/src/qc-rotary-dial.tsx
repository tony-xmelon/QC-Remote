import type { CSSProperties } from "react";
import { QC_COLORS } from "@ndsp-qc/theme";
import "./qc-rotary-dial.css";

export type QcRotaryDialProps = {
  className?: string;
  progress?: number;
  angle?: number;
  accent?: string;
  track?: string;
  face?: string;
  pointer?: string;
  pointerStart?: number;
};

/**
 * The single CorOS rotary construction used by screen fixtures and live editors.
 * Geometry is held in this component; callers only supply the displayed state.
 */
export function QcRotaryDial({
  className,
  progress = 59,
  angle = -14,
  accent = QC_COLORS.captured.rotaryAccent,
  track = QC_COLORS.captured.rotaryTrack,
  face = QC_COLORS.captured.rotaryFace,
  pointer = QC_COLORS.captured.iconPrimary,
  pointerStart = 43
}: QcRotaryDialProps) {
  const style = {
    "--qc-rotary-progress": Math.max(0, Math.min(74, progress)),
    "--qc-rotary-angle": `${angle}deg`,
    "--qc-rotary-accent": accent,
    "--qc-rotary-track": track,
    "--qc-rotary-face": face,
    "--qc-rotary-pointer": pointer
  } as CSSProperties;

  return <svg className={`qc-rotary${className ? ` ${className}` : ""}`} viewBox="0 0 72 72" style={style} aria-hidden="true">
    <ellipse className="qc-rotary-shadow" cx="39" cy="36" rx="29" ry="26" />
    <circle className="qc-rotary-track" cx="36" cy="36" r="32" pathLength="100" />
    <circle className="qc-rotary-progress" cx="36" cy="36" r="32" pathLength="100" />
    <circle className="qc-rotary-separator" cx="36" cy="36" r="27.5" />
    <circle className="qc-rotary-face" cx="36" cy="36" r="24.5" />
    <line className="qc-rotary-pointer" x1={pointerStart} y1="36" x2="61" y2="36" />
  </svg>;
}
