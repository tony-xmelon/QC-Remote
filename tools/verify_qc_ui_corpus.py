"""Validate and optionally normalize a captured Quad Cortex UI corpus."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which("node") or "node"


def png_dimensions(payload: bytes) -> tuple[int, int]:
    if not payload.startswith(b"\x89PNG\r\n\x1a\n") or len(payload) < 24:
        raise ValueError("not a PNG")
    return struct.unpack(">II", payload[16:24])


CLASSIFIER = REPOSITORY_ROOT / "tools" / "qc-tree-classifier.mjs"


def classify_tree(tree: str) -> str:
    """Classify a CorOS graphics tree by the shared rules in the JS classifier.

    The rules used to be duplicated here. The copies drifted, and a screen the
    corpus verifier called `busy-progress` was written into the manifest as
    `unknown` - so a capture failed verification the instant it was taken.
    Shelling out costs a node start-up per capture and keeps that impossible.
    """
    with tempfile.NamedTemporaryFile("w", suffix=".tree.txt", encoding="utf-8",
                                     delete=False) as handle:
        handle.write(tree)
        path = handle.name
    try:
        result = subprocess.run([NODE, str(CLASSIFIER), path],
                                capture_output=True, text=True, check=True)
    finally:
        os.unlink(path)
    return result.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("corpus", type=Path)
    parser.add_argument("--rewrite", action="store_true", help="Normalize derived manifest fields")
    args = parser.parse_args()
    manifest_path = args.corpus / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    failures: list[str] = []
    seen: set[str] = set()

    for capture in manifest.get("captures", []):
        capture_id = capture["id"]
        if capture_id in seen:
            failures.append(f"{capture_id}: duplicate id")
        seen.add(capture_id)
        image_path = args.corpus / capture["image"]
        tree_name = capture.get("graphicsTree")
        tree_path = args.corpus / tree_name if tree_name else None
        if not image_path.is_file() or (tree_path is not None and not tree_path.is_file()):
            failures.append(f"{capture_id}: missing image or graphics tree")
            continue
        payload = image_path.read_bytes()
        try:
            width, height = png_dimensions(payload)
        except ValueError as error:
            failures.append(f"{capture_id}: {error}")
            continue
        derived = {
            "sha256": hashlib.sha256(payload).hexdigest(),
            "bytes": len(payload),
            "width": width,
            "height": height,
        }
        if tree_path is not None:
            derived["screen"] = classify_tree(tree_path.read_text(encoding="utf-8"))
        if width != 800 or height != 480:
            failures.append(f"{capture_id}: expected 800x480, got {width}x{height}")
        for field, value in derived.items():
            if args.rewrite:
                capture[field] = value
            elif capture.get(field) != value:
                failures.append(f"{capture_id}: stale {field} ({capture.get(field)!r} != {value!r})")

    if args.rewrite:
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    if failures:
        for failure in failures:
            print(f"FAIL {failure}")
        return 1
    print(f"PASS {len(seen)} captures; all PNGs are 800x480 and manifest metadata matches")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
