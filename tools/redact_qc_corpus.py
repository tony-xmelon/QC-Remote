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
    # The search screens carry what this unit's owner has searched for. The
    # chips live under RecentInputBox and the query under the search PushButton,
    # so both are removed structurally - a regex naming the terms would have to
    # write them into this file to strip them from the corpus.
    "device-search-entry": {
        "boxes": [(12, 176, 218, 210)],
        "tree_widgets": ["zenUI::RecentInputBox"],
        "fields": ["recent search history"],
    },
    "directory-search": {
        "boxes": [(12, 176, 218, 210)],
        "tree_widgets": ["zenUI::RecentInputBox"],
        "fields": ["recent search history"],
    },
    "device-search-results": {
        "boxes": [(38, 12, 196, 48)],
        "tree_widgets": ["zenUI::PushButton"],
        "fields": ["search query"],
    },
    "overlay-error": {
        "boxes": [(38, 12, 196, 48)],
        "tree_widgets": ["zenUI::PushButton"],
        "fields": ["search query"],
    },
}


CLASS_LINE = re.compile(r"^(\s*)(zenUI::\w+)\s*$")
TEXT_LINE = re.compile(r"^(\s*)(text\s*:\s*)'(.*)$")


def redact_tree_widgets(tree: str, widgets: set[str]) -> str:
    """Replace every text value drawn beneath one of `widgets`.

    Keyed on the scene graph rather than on the strings themselves, which
    matters for search history: a regex listing the user's own past queries
    would put those queries into this file to get them out of the corpus.
    """
    lines = tree.splitlines(keepends=True)
    output: list[str] = []
    stack: list[tuple[int, str]] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        index += 1

        match = CLASS_LINE.match(line.rstrip("\n"))
        if match:
            indent = len(match.group(1))
            while stack and stack[-1][0] >= indent:
                stack.pop()
            stack.append((indent, match.group(2)))
            output.append(line)
            continue

        match = TEXT_LINE.match(line.rstrip("\n"))
        if match:
            indent, prefix, body = len(match.group(1)), match.group(2), match.group(3)
            consumed = [line]
            while not body.rstrip("\n").endswith("'") and index < len(lines):
                consumed.append(lines[index])
                body = lines[index]
                index += 1
            covered = any(
                widget in widgets for depth, widget in stack if depth < indent
            )
            if covered:
                output.append(f"{' ' * indent}{prefix}'[redacted]'\n")
            else:
                output.extend(consumed)
            continue

        output.append(line)
    return "".join(output)


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
        # introducing a second authored palette outside @qc-remote/theme.
        draw.rectangle((left, top, right, bottom), fill=image.getpixel((left, top)))
    image.save(image_path, format="PNG", optimize=True)

    tree_path = corpus / entry["graphicsTree"]
    tree = tree_path.read_text(encoding="utf-8")
    for pattern in profile.get("tree_patterns", ()):
        tree = re.sub(pattern, r"\1'[redacted]'", tree, flags=re.IGNORECASE)
    if profile.get("tree_widgets"):
        tree = redact_tree_widgets(tree, set(profile["tree_widgets"]))
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
