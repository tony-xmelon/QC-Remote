"""Parse a CorOS graphics tree into the structure a reconstruction must match.

`RemoteControlGraphicsTree` returns the device's live zenUI scene graph as
indented text. Each line is either a widget class, a `text : '...'` value, or an
`image: '...'` asset path, and text values may span lines:

    zenUI::NavMenuBlock
      zenUI::ModeButton
        text : 'PRESET'
        image: 'icons/navigationBar/modes/preset.png'

The tree carries no geometry, so it is an oracle for *what* a screen shows -
its widgets, its wording and its icons - and the paired PNG stays the oracle
for where those things sit.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

CLASS_LINE = re.compile(r"^(\s*)(zenUI::\w+)\s*$")
TEXT_LINE = re.compile(r"^(\s*)text\s*:\s*'(.*)$")
IMAGE_LINE = re.compile(r"^(\s*)image:\s*'(.*?)'\s*$")


@dataclass
class Node:
    widget: str
    depth: int
    text: str | None = None
    image: str | None = None
    children: list["Node"] = field(default_factory=list)


@dataclass
class ScreenTree:
    root: Node | None
    widgets: list[str]
    texts: list[str]
    images: list[str]

    @property
    def widget_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for widget in self.widgets:
            counts[widget] = counts.get(widget, 0) + 1
        return counts


def parse(source: str) -> ScreenTree:
    """Parse tree text. Multi-line `text : '...'` values are joined with \\n."""
    lines = source.splitlines()
    root: Node | None = None
    stack: list[Node] = []
    widgets: list[str] = []
    texts: list[str] = []
    images: list[str] = []

    index = 0
    while index < len(lines):
        line = lines[index]
        index += 1

        match = CLASS_LINE.match(line)
        if match:
            indent, widget = len(match.group(1)), match.group(2)
            node = Node(widget=widget, depth=indent)
            widgets.append(widget)
            while stack and stack[-1].depth >= indent:
                stack.pop()
            if stack:
                stack[-1].children.append(node)
            elif root is None:
                root = node
            stack.append(node)
            continue

        match = IMAGE_LINE.match(line)
        if match:
            asset = match.group(2)
            images.append(asset)
            if stack:
                stack[-1].image = asset
            continue

        match = TEXT_LINE.match(line)
        if match:
            body = match.group(2)
            # A value that does not close on this line continues until one does.
            while not body.endswith("'") and index < len(lines):
                body += "\n" + lines[index]
                index += 1
            value = body[:-1] if body.endswith("'") else body
            texts.append(value)
            if stack:
                stack[-1].text = value

    return ScreenTree(root=root, widgets=widgets, texts=texts, images=images)


def load(path: Path) -> ScreenTree:
    return parse(path.read_text(encoding="utf-8", errors="replace"))


def visible_text(tree: ScreenTree) -> list[str]:
    """Text a person actually reads: blank and whitespace-only nodes dropped."""
    seen: list[str] = []
    for value in tree.texts:
        cleaned = value.strip()
        if cleaned and cleaned not in seen:
            seen.append(cleaned)
    return seen
