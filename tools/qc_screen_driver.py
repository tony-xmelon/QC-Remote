"""Drive the Quad Cortex touchscreen safely, with the session's hard-won rules
enforced rather than remembered.

Three mistakes were made repeatedly while building the CorOS 4.1.0 reference
corpus. Each one is now impossible to make with this driver rather than being
a thing to keep in mind.

**1. Never toggle Gig View.** The gateway's `wake_remote_control` revives a
dormant framebuffer stream by flipping Gig View on and off. That changes what
the unit's owner is looking at and closes any dialog they have open. This module
refuses to import it and revives the stream with a RemoteControl mouse MOVE,
which presses nothing and leaves the screen untouched.

**2. One connection per sequence.** Connecting runs the session handshake, which
resets the device UI. A screenshot taken in one process and a tap sent from the
next therefore act on *different screens*: the tap lands wherever the reset left
things. Every gesture and every capture in a run share one connection, so a
screen observed here is the screen acted on here.

**3. No gesture or capture without a verified screen.** `expect` must succeed
immediately before any tap, hold, swipe, drag or capture. A gesture with no
fresh verification is refused, because a tap aimed at a dialog that had already
closed once landed on the Grid and silently edited a preset that was not the
scratch one; a capture is refused for the same reason, because naming a frame
asserts what it shows, and six settings panes were once written into the corpus
under names for a menu the dialog was not showing. `expect` matches any text in
the tree, so verify content - `expect Global Bypass` - not just the widget
class, which cannot tell two categories of the same dialog apart.

**4. Scroll by dragging the scrollbar, never by swiping the list.** A gesture
that releases over a row can be taken as a tap on it, and the atomic DRAG is the
worse of the two. `drag 740 170 740 430` moves a popup's own scrollbar instead
and has not activated a row.

**5. The unit has its own input, and it will move under you.** Screens appeared
mid-run that nothing in the script asked for - the Grid became the metronome
editor between a refused tap and the next `expect`, and a settings menu became
Gig View - which is the unit's footswitches, not the script. The animated
metronome screen then stops the framebuffer stream, and `--no-framebuffer`
connects on the graphics tree alone to navigate off it, the only recovery that
does not toggle Gig View. This is why rule 3 says *immediately* before: a
verification from four commands ago is worth nothing here.

Commands are read from stdin, one per line:

    expect zenUI::MainMenuPopup     verify the screen; required before a gesture
    tap X Y                         only valid straight after a passing expect
    hold X Y [SECONDS]
    swipe X Y TOX TOY
    drag X Y TOX TOY [HOLD] [STEPS] press, hold, move, release
    shot PATH                       settled screenshot (no verification needed)
    capture SLUG "LABEL"            write PNG + tree + manifest entry
    capture! SLUG "LABEL"           same, but for a screen that never settles
    record DIR SECONDS              save every distinct frame + tree to DIR
    tree                            print a summary of the current screen
    wait SECONDS

Exit status is non-zero if any command failed, so a batch cannot look like it
worked when it did not.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import shlex
import struct
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "services" / "device-gateway" / "src"))
sys.path.insert(0, str(REPOSITORY_ROOT / "tools"))

import pyquadcortex  # noqa: E402
import qc_screen_tree  # noqa: E402
from qc_device_gateway.remote_control import (  # noqa: E402
    capture_graphics_tree,
    capture_screen,
    capture_settled_screen,
    hold_screen,
    install_remote_control_compat,
    swipe_screen,
    tap_screen,
)

_spec = importlib.util.spec_from_file_location(
    "corpus_classify", REPOSITORY_ROOT / "tools" / "verify_qc_ui_corpus.py")
_classify = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_classify)

CORPUS = REPOSITORY_ROOT / "references" / "qc-ui-corpus" / "coros-4.1.0"
GESTURES = {"tap", "hold", "swipe", "drag"}
# A capture writes a frame into the corpus under a name. Naming a frame is
# an assertion about what it shows, so it needs the same fresh verification
# a gesture does - six Device settings panes were once written under names
# that described a menu the dialog was not even showing.
VERIFIED = GESTURES | {"capture", "capture!"}


def write_capture(slug: str, label: str, png: bytes, tree: str,
                  actions: list[dict[str, object]] | None = None) -> tuple[int, int]:
    """Write a PNG, its graphics tree and a manifest entry into the corpus.

    The screen family is classified from the tree with the corpus verifier's own
    rules rather than hardcoded, because a hardcoded family that disagrees with
    the verifier is rejected as stale.
    """
    width, height = struct.unpack(">II", png[16:24])
    (CORPUS / f"{slug}.png").write_bytes(png)
    (CORPUS / f"{slug}.tree.txt").write_text(tree, encoding="utf-8")

    path = CORPUS / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["captures"] = [c for c in manifest["captures"] if c["id"] != slug]
    manifest["captures"].append({
        "id": slug,
        "label": label,
        "screen": _classify.classify_tree(tree),
        "image": f"{slug}.png",
        "graphicsTree": f"{slug}.tree.txt",
        "sha256": hashlib.sha256(png).hexdigest(),
        "bytes": len(png),
        "width": width,
        "height": height,
        "capturedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "actions": list(actions or []),
    })
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return width, height


class Driver:
    def __init__(self, framebuffer: bool = True) -> None:
        install_remote_control_compat()
        self.qc = pyquadcortex.connect()
        self.message = install_remote_control_compat()
        self.verified: str | None = None
        self.actions: list[dict[str, object]] = []
        self.failures = 0
        self.framebuffer = framebuffer
        if framebuffer:
            self.revive()

    # -- stream ----------------------------------------------------------
    def revive(self, timeout: float = 3.0) -> bytes:
        """Wake a dormant framebuffer without altering the screen (rule 1)."""
        for attempt in range(6):
            try:
                return capture_screen(self.qc, timeout=timeout if attempt == 0 else 6.0)
            except Exception:
                self.qc._t.send(self.message(
                    action=1, mouse={"x": 400, "y": 240, "type": 2}))
                time.sleep(0.6)
        raise TimeoutError("framebuffer did not revive without a Gig View toggle")

    # -- verification ----------------------------------------------------
    def expect(self, marker: str) -> bool:
        """Confirm the screen. The tree lags a gesture, so retry before failing."""
        text = ""
        for _ in range(6):
            try:
                text = capture_graphics_tree(self.qc)
            except Exception:
                self.revive()
                continue
            if marker in text:
                self.verified = marker
                print(f"  ok: screen contains {marker!r}", flush=True)
                return True
            time.sleep(0.7)
        self.verified = None
        widgets = sorted(set(qc_screen_tree.parse(text).widgets))[:12]
        print(f"  FAIL: {marker!r} not on screen; widgets are {widgets}", flush=True)
        return False

    def require_verified(self, verb: str) -> bool:
        if self.verified is not None:
            return True
        print(f"  REFUSED: {verb} without a passing 'expect' immediately before it",
              flush=True)
        return False

    # -- capture ---------------------------------------------------------
    def capture(self, slug: str, label: str, settle: bool = True) -> None:
        # A progress screen never settles: its spinner and percentage change
        # every frame, so waiting for two identical frames waits forever.
        # `capture!` takes the next frame as-is for exactly those states.
        png = capture_settled_screen(self.qc) if settle else capture_screen(self.qc)
        tree = capture_graphics_tree(self.qc)
        width, height = write_capture(slug, label, png, tree, self.actions)
        self.actions.clear()
        print(f"  captured {slug}: {width}x{height}, {len(png)} bytes", flush=True)

    def record(self, directory: str, seconds: float) -> None:
        """Save every distinct frame, with its tree, for a one-shot sequence.

        A Neural Capture runs once and cannot be paused, so its progress and
        result screens cannot be composed for and then captured deliberately.
        Recording every changed frame turns a transient sequence into files
        that can be reviewed afterwards and promoted into the corpus with
        `promote_recorded_frame.py`, which reuses `write_capture` below - so a
        promoted frame is indistinguishable from one captured live.
        """
        out = Path(directory)
        out.mkdir(parents=True, exist_ok=True)
        seen: set[str] = set()
        index = 0
        deadline = time.time() + seconds
        while time.time() < deadline:
            try:
                png = capture_screen(self.qc)
            except Exception:
                time.sleep(0.8)
                continue
            digest = hashlib.sha256(png).hexdigest()
            if digest in seen:
                time.sleep(0.35)
                continue
            seen.add(digest)
            stem = out / f"frame-{index:03d}-{digest[:8]}"
            stem.with_suffix(".png").write_bytes(png)
            try:
                tree = capture_graphics_tree(self.qc)
            except Exception:
                tree = ""
            stem.with_suffix(".tree.txt").write_text(tree, encoding="utf-8")
            print(f"  {stem.name}.png ({len(png)} bytes, tree {len(tree)} chars)",
                  flush=True)
            index += 1
        print(f"  recorded {index} distinct frame(s) into {out}", flush=True)


def main() -> int:
    # An animated screen - the metronome editor is the one that keeps doing it -
    # can leave the framebuffer stream dormant in a way MOVE will not wake. The
    # graphics tree keeps answering, so --no-framebuffer connects on the tree
    # alone: enough to see where the unit is and navigate off the animation,
    # which is the only recovery that does not toggle Gig View.
    framebuffer = "--no-framebuffer" not in sys.argv[1:]
    driver = Driver(framebuffer=framebuffer)
    print("connected" if framebuffer else "connected (tree only)", flush=True)

    for raw in sys.stdin:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = shlex.split(line)
        verb, values = parts[0], parts[1:]
        print(f"> {line}", flush=True)
        try:
            if verb in VERIFIED and not driver.require_verified(verb):
                driver.failures += 1
                driver.verified = None
                continue

            if verb == "expect":
                if not driver.expect(" ".join(values)):
                    driver.failures += 1
            elif verb == "wait":
                time.sleep(float(values[0]))
            elif verb == "tree":
                text = capture_graphics_tree(driver.qc)
                parsed = qc_screen_tree.parse(text)
                print(f"  family={_classify.classify_tree(text)}", flush=True)
                print(f"  text: {qc_screen_tree.visible_text(parsed)[:24]}", flush=True)
            elif verb in ("shot", "capture", "capture!") and not driver.framebuffer:
                print("  REFUSED: --no-framebuffer has no pixels to write", flush=True)
                driver.failures += 1
            elif verb == "shot":
                Path(values[0]).write_bytes(capture_settled_screen(driver.qc))
                print(f"  wrote {values[0]}", flush=True)
            elif verb == "record":
                driver.record(values[0], float(values[1]))
            elif verb in ("capture", "capture!"):
                driver.capture(values[0], " ".join(values[1:]) or values[0],
                               settle=(verb == "capture"))
            elif verb == "tap":
                x, y = float(values[0]), float(values[1])
                tap_screen(driver.qc, x, y)
                driver.actions.append({"type": "tap", "x": x, "y": y})
                driver.verified = None       # rule 3: re-verify before the next one
                time.sleep(1.6)
            elif verb == "hold":
                x, y = float(values[0]), float(values[1])
                seconds = float(values[2]) if len(values) > 2 else 1.2
                hold_screen(driver.qc, x, y, seconds)
                driver.actions.append({"type": "hold", "x": x, "y": y,
                                       "duration": seconds})
                driver.verified = None
                time.sleep(1.6)
            elif verb == "swipe":
                coords = [float(v) for v in values[:4]]
                swipe_screen(driver.qc, *coords)
                driver.actions.append({"type": "swipe", "from": coords[:2],
                                       "to": coords[2:]})
                driver.verified = None
                time.sleep(1.6)
            elif verb == "drag":
                x1, y1, x2, y2 = (float(v) for v in values[:4])
                seconds = float(values[4]) if len(values) > 4 else 0.9
                steps = int(values[5]) if len(values) > 5 else 12
                driver.qc._t.send(driver.message(
                    action=1, mouse={"x": x1, "y": y1, "type": 1}))
                time.sleep(seconds)
                for step in range(1, steps + 1):
                    driver.qc._t.send(driver.message(action=1, mouse={
                        "x": x1 + (x2 - x1) * step / steps,
                        "y": y1 + (y2 - y1) * step / steps,
                        "type": 2,
                    }))
                    time.sleep(0.06)
                time.sleep(0.4)
                driver.qc._t.send(driver.message(
                    action=1, mouse={"x": x2, "y": y2, "type": 0}))
                driver.actions.append({"type": "drag", "from": [x1, y1], "to": [x2, y2]})
                driver.verified = None
                time.sleep(1.6)
            else:
                print(f"  unknown command {verb!r}", flush=True)
                driver.failures += 1
        except Exception as error:
            print(f"  ERROR: {error}", flush=True)
            driver.failures += 1
            driver.verified = None

    if driver.failures:
        print(f"{driver.failures} command(s) failed", flush=True)
    return 1 if driver.failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
