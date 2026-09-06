"""Promote a frame recorded by `qc_screen_driver.py record` into the corpus.

A one-shot sequence - a Neural Capture, a factory reset, a firmware update -
cannot be re-staged to capture a screen that was missed, so the driver's
`record` verb saves every distinct frame with its graphics tree. This promotes
one of those frames into the reference corpus once it has been reviewed.

    python tools/promote_recorded_frame.py FRAME_STEM SLUG "LABEL"

FRAME_STEM is the recorded frame without its extension, e.g.

    .../scratchpad/nc-run/frame-004-1a2b3c4d

The manifest entry is written by `qc_screen_driver.write_capture`, the same
function a live capture uses, so a promoted frame is not a second-class entry.

Refuses to overwrite an existing corpus capture: `capture-type` was destroyed
once by writing a new screenshot over a slug that was already a reference for
another state. Pass --replace when overwriting is genuinely intended.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "tools"))

import qc_screen_driver  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stem", help="recorded frame path without its extension")
    parser.add_argument("slug", help="corpus capture id to write")
    parser.add_argument("label", help="human-readable label for the manifest")
    parser.add_argument("--replace", action="store_true",
                        help="overwrite an existing capture with this id")
    arguments = parser.parse_args()

    stem = Path(arguments.stem)
    png_path = stem.with_suffix(".png")
    tree_path = Path(f"{stem}.tree.txt")
    if not png_path.exists():
        print(f"no such frame: {png_path}", file=sys.stderr)
        return 1

    manifest_path = qc_screen_driver.CORPUS / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    existing = next((c for c in manifest["captures"] if c["id"] == arguments.slug), None)
    if existing is not None and not arguments.replace:
        print(f"refusing to overwrite existing capture {arguments.slug!r} "
              f"({existing['label']}); pass --replace if that is intended",
              file=sys.stderr)
        return 1

    tree = tree_path.read_text(encoding="utf-8") if tree_path.exists() else ""
    width, height = qc_screen_driver.write_capture(
        arguments.slug, arguments.label, png_path.read_bytes(), tree)
    print(f"promoted {png_path.name} as {arguments.slug}: {width}x{height}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
