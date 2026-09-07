"""Check the overlay geometry in our CSS against the device frames it claims.

`tests/block-visuals.test.ts` pins numbers like "the directory item menu is at
left 528, width 256, height 208". Those are claims about the unit, but the test
reads them out of our own stylesheet, so it passes whether or not the device
agrees: it detects edits, not errors. That is how the menu stayed 208 tall after
the device turned out to have five items rather than four.

This measures the overlay in the captured frame and compares it with the rule in
the stylesheet, so the number has to match the hardware. An overlay is a solid
panel over a dimmed background, so its box is the extent of pixels matching the
panel's fill.

Usage:
  python tools/verify_overlay_geometry.py [--report]
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from PIL import Image

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
CORPUS = REPOSITORY_ROOT / "references/qc-ui-corpus/coros-4.1.0"
STYLESHEET = REPOSITORY_ROOT / "packages/typescript/qc-ui/src/fixture-live-surface.css"

# A panel's fill, as a predicate over an RGB pixel. `column_share` and
# `row_share` are how much of a column or row must match before it counts as
# part of the panel: enough to ignore text and icons drawn on top of it.
OVERLAYS = [
    {
        "capture": "directory-item-context.png",
        "selector": ".coros-directory-fixture .directory-item-menu",
        "fill": lambda p: max(p) < 40,
        "column_share": 0.25,
        "row_share": 0.12,
    },
    {
        "capture": "generic-confirmation.png",
        "selector": ".coros-physical-confirmation > aside",
        "fill": lambda p: p[0] > 180 and p[1] < 140 and p[2] < 130,
        "column_share": 0.25,
        "row_share": 0.12,
    },
    {
        "capture": "block-context.png",
        "selector": ".qc-screen.coros-block-context > aside",
        "fill": lambda p: max(p) < 40,
        "column_share": 0.5,
        "row_share": 0.25,
    },
]

TOLERANCE = 2  # px, for antialiased edges and rounded corners


def measure(path: Path, fill, column_share: float, row_share: float):
    image = Image.open(path).convert("RGB")
    pixels = image.load()
    width, height = image.size
    columns = [x for x in range(width)
               if sum(1 for y in range(height) if fill(pixels[x, y])) > height * column_share]
    rows = [y for y in range(height)
            if sum(1 for x in range(width) if fill(pixels[x, y])) > width * row_share]
    if not columns or not rows:
        return None
    return {
        "left": columns[0],
        "top": rows[0],
        "width": columns[-1] - columns[0] + 1,
        "height": rows[-1] - rows[0] + 1,
    }


def declared(selector: str) -> dict[str, int]:
    text = STYLESHEET.read_text(encoding="utf-8")
    pattern = re.escape(selector) + r"\s*\{([^}]*)\}"
    match = re.search(pattern, text)
    if not match:
        raise SystemExit(f"no rule for {selector} in {STYLESHEET.name}")
    body = match.group(1)
    values = {}
    for name in ("left", "top", "width", "height"):
        found = re.search(rf"(?<![\w-]){name}:\s*(-?\d+)px", body)
        if found:
            values[name] = int(found.group(1))
    return values


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", action="store_true",
                        help="print every measurement, not just the mismatches")
    arguments = parser.parse_args()

    problems: list[str] = []
    checked = 0
    for overlay in OVERLAYS:
        capture = CORPUS / overlay["capture"]
        if not capture.is_file():
            problems.append(f"{overlay['capture']}: missing from the corpus")
            continue
        measured = measure(capture, overlay["fill"],
                           overlay["column_share"], overlay["row_share"])
        if measured is None:
            problems.append(f"{overlay['capture']}: no panel matched the fill predicate")
            continue
        rule = declared(overlay["selector"])
        if arguments.report:
            print(f"{overlay['selector']}")
            print(f"  device: {measured}")
            print(f"  css:    {rule}")
        for name, value in rule.items():
            if name not in measured:
                continue
            checked += 1
            if abs(measured[name] - value) > TOLERANCE:
                problems.append(
                    f"{overlay['selector']}: css says {name} {value}px, "
                    f"{overlay['capture']} measures {measured[name]}px")

    for problem in problems:
        print(f"FAIL {problem}")
    if problems:
        return 1
    print(f"PASS {checked} overlay measurement(s) across {len(OVERLAYS)} captured screens "
          f"match the stylesheet within {TOLERANCE}px")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
