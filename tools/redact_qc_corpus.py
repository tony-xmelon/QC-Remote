"""Deterministically remove device and network identifiers from QC frames.

The physical capture tool retains raw device output only in the local artifact
directory.  This publisher replaces identifier-bearing pixels and graphics-tree
values before a frame enters the versioned reference corpus, then refreshes the
manifest checksum so corpus verification continues to cover the published bytes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re

from PIL import Image, ImageDraw


REDACTIONS = {
    "settings-info": {
        "boxes": [
            (480, 116, 620, 145),
            (480, 184, 620, 213),
        ],
        "tree_patterns": [
            r"(?m)^(\s*text : )'QA[^']*'$",
            r"(?m)^(\s*text : )'[0-9a-f]{2}(?::[0-9a-f]{2}){5}'$",
        ],
        "fields": ["device serial", "device MAC address"],
    },
    "settings-wifi": {
        "boxes": [
            (310, 127, 630, 153),
            (290, 153, 630, 176),
            (408, 178, 630, 201),
            (307, 221, 630, 246),
            (286, 246, 630, 270),
        ],
        "tree_patterns": [
            r"(?m)^(\s*text : )'(?!Internet Connected|Weak connection|IP address)[^']*(?:FiberNet|Darvo)[^']*'$",
            r"(?m)^(\s*text : )'[0-9a-f]{2}(?::[0-9a-f]{2}){5},[^']*'$",
            r"(?m)^(\s*text : )'IP address [^']*'$",
        ],
        "fields": ["Wi-Fi SSIDs", "access-point MAC addresses", "local IP address"],
    },
    # The Account page names the Cortex Cloud account the unit is linked to.
    # As everywhere else here the whole text value becomes '[redacted]', so the
    # surrounding "Device linked to ..." sentence goes with it; the pixels are
    # covered only over the address itself.
    "settings-account": {
        "boxes": [
            (431, 76, 660, 106),
        ],
        "tree_patterns": [
            r"(?m)^(\s*text : )'Device linked to \[[^\]']*\]'$",
        ],
        "fields": ["Cortex Cloud account address"],
    },
}


def redact(corpus: Path, capture_id: str) -> None:
    profile = REDACTIONS[capture_id]
    manifest_path = corpus / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    entry = next((item for item in manifest["captures"] if item["id"] == capture_id), None)
    if entry is None:
        raise KeyError(f"capture {capture_id!r} is absent from {manifest_path}")

    image_path = corpus / entry["image"]
    with Image.open(image_path) as source:
        image = source.convert("RGB")
    draw = ImageDraw.Draw(image)
    for left, top, right, bottom in profile["boxes"]:
        # The upper-left corner is measured clear background in every capture
        # region. Sampling it preserves the device's exact native color without
        # introducing a second authored palette outside @ndsp-qc/theme.
        draw.rectangle((left, top, right, bottom), fill=image.getpixel((left, top)))
    image.save(image_path, format="PNG", optimize=True)

    tree_path = corpus / entry["graphicsTree"]
    tree = tree_path.read_text(encoding="utf-8")
    for pattern in profile["tree_patterns"]:
        tree = re.sub(pattern, r"\1'[redacted]'", tree, flags=re.IGNORECASE)
    tree_path.write_text(tree, encoding="utf-8")

    payload = image_path.read_bytes()
    entry["sha256"] = hashlib.sha256(payload).hexdigest()
    entry["bytes"] = len(payload)
    entry["redactions"] = profile["fields"]
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("corpus", type=Path)
    parser.add_argument("capture_ids", nargs="+", choices=sorted(REDACTIONS))
    args = parser.parse_args()
    for capture_id in args.capture_ids:
        redact(args.corpus, capture_id)
        print(f"Redacted {capture_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
