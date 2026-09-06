"""Check our screen reconstructions against the device's own scene graph.

The reference corpus pairs each 800x480 capture with the CorOS graphics tree
that produced it. The PNG has always been scored for pixels; the tree was only
ever used to classify a capture into a screen family. It is a much stricter
oracle than that: it lists every string the device actually drew, so every one
of them can be required to exist in our reconstruction.

That catches what a pixel score cannot. Two examples this check found on its
first run: the Grid context menu was written `Save as…` with a typographic
ellipsis where CorOS draws `Save as...`, and the device-information screen
read `Zeniack FW app:` for the device's `Zenjack FW app:` while omitting four
further firmware rows entirely. Both sat inside a screen already scoring 97%
on colour similarity.

Text inside a data-driven list cell is excluded: those rows are model, plugin,
device-preset and Wi-Fi names the unit supplies at runtime, so they belong to
the catalog rather than to the reconstruction. Per-unit values on the device
information screen are excluded for the same reason, by an explicit list of the
labels whose *values* vary per device - the labels themselves are still required.

Usage:
  python tools/verify_screen_tree_coverage.py            # check, exit 1 on gaps
  python tools/verify_screen_tree_coverage.py --report   # list every gap
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import qc_screen_tree  # noqa: E402

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
CORPUS = REPOSITORY_ROOT / "references" / "qc-ui-corpus" / "coros-4.1.0"
SOURCE_ROOTS = (
    REPOSITORY_ROOT / "packages" / "typescript",
    REPOSITORY_ROOT / "contracts",
)
SOURCE_SUFFIXES = {".ts", ".tsx", ".css", ".json"}

# Rows whose text the unit fills in from its own hardware. The device supplies
# these at runtime, so a reconstruction owes the label, never the value.
DATA_CELLS = {
    "zenUI::ModelListCell",
    "zenUI::PluginModelListCell",
    "zenUI::ModelPresetListCell",
    "zenUI::WifiTableCell",
    # Gig View tiles are filled with the owner's own preset names.
    "zenUI::PresetGigViewButton",
}

# Values on the device information screen that differ per unit or per capture.
PER_UNIT_VALUE = re.compile(
    r"""^(
        \[redacted\]                     # the corpus redaction marker
      | [0-9a-f]{8,}                     # firmware hashes and MAC-like values
      | [a-f][0-9a-f]{3}                 # Zenjack/Zencoder build ids, e.g. d14e
      | Linux\ buildroot\ .*             # kernel banner
      | U-Boot\ [0-9].*                  # bootloader banner
      | .*\.\.\.\ /\ \d+[A-H]            # a truncated "folder / slot" label
      | \d{1,2}[A-H]\ .+                 # a Gig View title: slot address plus
                                         # the loaded preset's own name
    )$""",
    re.VERBOSE,
)


GLYPH_GAP = re.compile(r"\s{3,}")


def squash(value: str) -> str:
    """Compare ignoring layout: CorOS wraps with newlines, JSX with `<br />`."""
    return re.sub(r"\s+", "", re.sub(r"<br\s*/?>", "", value))


def fragments(value: str) -> list[str]:
    """Split a device string on the gaps CorOS leaves for an inline glyph.

    The Looper reads `USE         TO START RECORDING`, with a footswitch glyph
    drawn into that run of spaces. A reconstruction puts an element there, so
    the sentence never appears in source as one literal; each side of the gap
    does. Runs of three or more spaces mark those gaps - ordinary wrapping in
    these trees is a newline, not padding.
    """
    parts = [squash(part) for part in GLYPH_GAP.split(value)]
    return [part for part in parts if part]


BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
WHOLE_LINE_COMMENT = re.compile(r"^[ \t]*//.*$", re.MULTILINE)


def strip_comments(source: str) -> str:
    """Comments must not satisfy the check.

    This was not hypothetical: a comment added next to the `Save as...` fix,
    quoting the device string to explain it, kept the check green when the fix
    itself was reverted. Only whole-line `//` comments are removed, so a `//`
    inside a URL or a string literal is left alone.
    """
    return WHOLE_LINE_COMMENT.sub("", BLOCK_COMMENT.sub("", source))


def source_text() -> str:
    parts = []
    for root in SOURCE_ROOTS:
        for path in root.rglob("*"):
            if path.suffix not in SOURCE_SUFFIXES or "node_modules" in path.parts:
                continue
            parts.append(strip_comments(path.read_text(encoding="utf-8", errors="replace")))
    return squash("\n".join(parts))


def strings_with_context(node, ancestors=()):
    if node is None:
        return
    chain = ancestors + (node.widget,)
    if node.text and node.text.strip():
        yield node.text.strip(), chain
    for child in node.children:
        yield from strings_with_context(child, chain)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", action="store_true",
                        help="print every gap instead of only the summary")
    parser.add_argument("--corpus", type=Path, default=CORPUS)
    args = parser.parse_args()

    trees = sorted(args.corpus.glob("*.tree.txt"))
    if not trees:
        print(f"no graphics trees under {args.corpus}", file=sys.stderr)
        return 1

    haystack = source_text()
    checked = 0
    gaps: dict[str, list[tuple[str, str]]] = {}

    for path in trees:
        screen = path.name.removesuffix(".tree.txt")
        for text, chain in strings_with_context(qc_screen_tree.load(path).root):
            if DATA_CELLS & set(chain) or PER_UNIT_VALUE.match(text):
                continue
            checked += 1
            if all(part in haystack for part in fragments(text)):
                continue
            gaps.setdefault(screen, []).append((text, chain[-1]))

    missing = sum(len(entries) for entries in gaps.values())
    if args.report or gaps:
        for screen in sorted(gaps):
            print(f"{screen}:")
            for text, widget in gaps[screen]:
                print(f"    {text!r} drawn by {widget}")
    print(f"{checked} device strings checked across {len(trees)} screens; "
          f"{missing} not found in our reconstruction")
    return 1 if gaps else 0


if __name__ == "__main__":
    raise SystemExit(main())
