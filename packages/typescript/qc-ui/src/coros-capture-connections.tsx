// The Neural Capture wizard's five connection steps, reconstructed from device
// framebuffers rather than imagined.
//
// The three fixtures this replaces were invented: an "intro" screen with an
// orbit and a GET STARTED button, a capture-type picker offering AMP + CAB /
// AMP / DRIVE / OTHER, and a routing diagram running QC SEND 1 into an
// amplifier and a cab back into QC RETURN 1. CorOS 4.1.0 shows none of that.
// It shows one rear-panel diagram five times, highlighting different jacks and
// changing the caption, and it asks for CAPTURE OUT into the target device with
// the target's output into INPUT 2 - Send/Return is what step 1 asks you to
// *disconnect*.
//
// They survived the scene-graph text check because CorOS draws these captions
// as images: the graphics trees for all five screens contain no text nodes at
// all, so a text oracle has nothing to compare and passes them silently. The
// corpus images `capture-intro`, `capture-monitoring`, `capture-connect-out`,
// `capture-connect-input-2` and `capture-routing` are the evidence here.

import type { ReactNode } from "react";
import "./coros-capture-connections.css";

export type CaptureConnectionView =
  | "capture-intro"
  | "capture-monitoring"
  | "capture-connect-out"
  | "capture-connect-input-2"
  | "capture-routing";

type JackKind = "usb" | "trs" | "din" | "xlr" | "input";
type Highlight = "green" | "white";

interface Jack {
  id: string;
  x: number;
  y: number;
  kind: JackKind;
  label?: string;
  labelAbove?: boolean;
}

// Positions are the device's own pixels in its 800x480 framebuffer; the
// stylesheet converts them to container units so the panel scales with the
// screen instead of being pinned to one host size.
const JACKS: Jack[] = [
  { id: "usb", x: 41, y: 207, kind: "usb", label: "USB" },
  { id: "exp2", x: 98, y: 207, kind: "trs", label: "EXP 2", labelAbove: true },
  { id: "exp1", x: 98, y: 268, kind: "trs", label: "EXP 1" },
  { id: "midi-out", x: 156, y: 207, kind: "din", label: "MIDI\nOUT" },
  { id: "midi-in", x: 213, y: 207, kind: "din", label: "MIDI\nIN" },
  { id: "out2", x: 279, y: 224, kind: "xlr", label: "OUT 2" },
  { id: "out1", x: 343, y: 224, kind: "xlr", label: "OUT 1" },
  { id: "phones", x: 418, y: 207, kind: "trs" },
  { id: "capture-out", x: 418, y: 268, kind: "trs", label: "CAPTURE\nOUT" },
  { id: "out4", x: 487, y: 207, kind: "trs", label: "OUT 4/R", labelAbove: true },
  { id: "out3", x: 487, y: 268, kind: "trs", label: "OUT 3/L" },
  { id: "ret2", x: 550, y: 207, kind: "trs", label: "RET 2", labelAbove: true },
  { id: "ret1", x: 550, y: 268, kind: "trs", label: "RET 1" },
  { id: "send2", x: 610, y: 207, kind: "trs", label: "SEND 2", labelAbove: true },
  { id: "send1", x: 610, y: 268, kind: "trs", label: "SEND 1" },
  { id: "input2", x: 677, y: 224, kind: "input", label: "INPUT 2" },
  { id: "input1", x: 749, y: 224, kind: "input", label: "INPUT 1" }
];

interface Annotation {
  x: number;
  y: number;
  text: string;
  direction: "up" | "down";
}

interface Step {
  caption: ReactNode;
  highlight: Partial<Record<string, Highlight>>;
  crossed?: string[];
  annotations?: Annotation[];
  footer?: ReactNode;
  warning?: boolean;
}

const STEPS: Record<CaptureConnectionView, Step> = {
  "capture-intro": {
    caption: <>Plug your instrument into <b>Input 1</b></>,
    highlight: { input1: "green" },
    crossed: ["ret1", "ret2", "send1", "send2"],
    annotations: [{ x: 749, y: 336, text: "Instrument", direction: "up" }],
    footer: <>For best results, please disconnect any devices<br />from <b>Send 1</b>, <b>Send 2</b>, and <b>Return 1</b>, <b>Return 2</b></>
  },
  "capture-monitoring": {
    caption: <>Connect your <b>headphones</b> and/or use Out 1 &amp; 2 or Out 3 &amp; 4 for monitoring.</>,
    highlight: { phones: "green", out1: "green", out2: "green", out3: "green", out4: "green", input1: "white" }
  },
  "capture-connect-out": {
    caption: <>Connect <b>Capture Out</b> to the input of the target device</>,
    highlight: { "capture-out": "green", phones: "white", input1: "white" },
    annotations: [{ x: 418, y: 385, text: "To the input of the\ntarget device", direction: "up" }]
  },
  "capture-connect-input-2": {
    caption: <>Position your mic in front of the cabinet and connect it to <b>Input 2</b>.<br />If you have an amplifier that has a D.I. Out or a reactive load box<br />you can opt to use that instead of a microphone</>,
    highlight: { input2: "green", phones: "white", "capture-out": "white" },
    annotations: [{ x: 677, y: 118, text: "From\nmic/amp", direction: "down" }],
    warning: true
  },
  "capture-routing": {
    caption: <>Once everything is connected correctly, you can proceed with<br />creating your Neural Capture</>,
    highlight: { input1: "white", input2: "white", "capture-out": "white", phones: "white" },
    annotations: [
      { x: 677, y: 118, text: "From\nmic/amp", direction: "down" },
      { x: 749, y: 336, text: "Instrument", direction: "up" },
      { x: 418, y: 385, text: "To the input of the\ntarget device", direction: "up" }
    ]
  }
};

const ORDER: CaptureConnectionView[] = [
  "capture-intro",
  "capture-monitoring",
  "capture-connect-out",
  "capture-connect-input-2",
  "capture-routing"
];

function JackGlyph({ kind }: { kind: JackKind }) {
  if (kind === "usb") return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="9" width="24" height="14" rx="2" /><rect x="10" y="14" width="12" height="4" rx="1" className="jack-core" /></svg>;
  if (kind === "din") return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" />{[[16, 7], [7, 14], [25, 14], [11, 24], [21, 24]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.6" className="jack-core" />)}</svg>;
  if (kind === "xlr") return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" />{[[16, 10], [11, 20], [21, 20]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.8" className="jack-core" />)}</svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" /><path d="M16 7.5 23.4 11.75 23.4 20.25 16 24.5 8.6 20.25 8.6 11.75Z" className="jack-core" /><circle cx="16" cy="16" r="3.2" className="jack-pin" /></svg>;
}

export function CorOsCaptureConnections({ view }: { view: CaptureConnectionView }) {
  const step = STEPS[view];
  const index = ORDER.indexOf(view);
  return <section className="qc-screen coros-capture-connections" aria-label={view.replaceAll("-", " ")}>
    <header>
      <button className="capture-connections-close" aria-label="Close">×</button>
      <button className="capture-connections-skip" aria-label="Skip">»</button>
      <span />
      {index > 0 && <button className="capture-connections-back" aria-label="Back">←</button>}
      <button className={`capture-connections-next${index === 0 ? " is-wide" : ""}`} aria-label="Next">→</button>
    </header>
    <p className="capture-connections-caption">{step.caption}</p>
    <div className="capture-connections-panel">
      {JACKS.map((jack) => {
        const highlight = step.highlight[jack.id];
        return <span
          key={jack.id}
          className={`capture-jack capture-jack-${jack.kind}${highlight ? ` is-${highlight}` : ""}${step.crossed?.includes(jack.id) ? " is-crossed" : ""}`}
          style={{ left: `${jack.x / 8}cqw`, top: `${jack.y / 8}cqw` }}
        >
          <JackGlyph kind={jack.kind} />
          {jack.label && <small className={jack.labelAbove ? "is-above" : undefined}>{jack.label}</small>}
        </span>;
      })}
      <svg className="capture-phones-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="2.5" y="14" width="5" height="7" rx="2" /><rect x="16.5" y="14" width="5" height="7" rx="2" /></svg>
      {step.annotations?.map((annotation) => <span
        key={annotation.text}
        className={`capture-annotation is-${annotation.direction}`}
        style={{ left: `${annotation.x / 8}cqw`, top: `${annotation.y / 8}cqw` }}
      >{annotation.text}</span>)}
      {step.warning && <aside className="capture-tube-warning">
        <strong>TUBE AMPLIFIER WARNING</strong>
        <p>Connecting the speaker output from a tube amplifier to Quad Cortex could damage both units. Ensure you are using a D. I. Out and your amplifier is still connected to a cabinet or reactive load box.</p>
        <svg viewBox="0 0 40 60" aria-hidden="true"><rect x="8" y="6" width="24" height="40" rx="12" /><path d="M14 46h12M16 52h8M20 14v24M16 20v14M24 20v14" /></svg>
      </aside>}
    </div>
    {step.footer && <p className="capture-connections-footer">{step.footer}</p>}
    <nav className="capture-connections-dots" aria-hidden="true">
      {ORDER.map((id, dot) => <i key={id} className={dot === index ? "is-active" : ""} />)}
    </nav>
  </section>;
}
