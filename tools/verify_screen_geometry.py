"""Check the screen geometry our stylesheets declare against the frames it claims.

`tests/block-visuals.test.ts` pins numbers like "the directory item menu is at
left 528, width 256, height 208" and "the System brightness values are
right-aligned". Those are claims about the device, but the tests read them out
of our own stylesheets, so they pass whether or not the device agrees: they
detect edits, not errors. That is how the item menu stayed 208 tall after the
device turned out to have five entries rather than four, and how the brightness
column stayed right-aligned when the device left-aligns it.

Everything here measures the frame instead. A measurement is only worth having
if it can fail, so each check derives its expectation from the stylesheet and
compares it against pixels; where a stylesheet value cannot be expressed in
screen coordinates the check says so rather than inventing an anchor.

Two reference sets are used, and they are not interchangeable:

  references/qc-ui-corpus            frames captured from the unit over USB
  references/qc-ui-official-manual   the published CorOS screenshots

`plugin-folders.png` and `official-plugin-folders.png` are different screens
despite the names; the `.plugin-folders-official` reconstruction follows the
second. Each check names the frame it is entitled to.

Usage:
  python tools/verify_screen_geometry.py [--report]
"""

from __future__ import annotations

import argparse
import re
from collections import Counter
from pathlib import Path
from urllib.parse import unquote

from PIL import Image

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
CORPUS = REPOSITORY_ROOT / "references/qc-ui-corpus/coros-4.1.0"
MANUAL = REPOSITORY_ROOT / "references/qc-ui-official-manual/coros-4.1.0"
STYLES = REPOSITORY_ROOT / "packages/typescript/qc-ui/src"

# Every frame is the device's own 800x480 framebuffer, so a container query unit
# on a full-width screen is exactly 8px.
CQW = 8
TOLERANCE = 2  # px, for antialiased edges and rounded corners
TEXT_TOLERANCE = 3  # px, our font is not the device's and bearings differ
ROUND_TOLERANCE = 3  # px, a circle or capsule fades out over its last row


# --------------------------------------------------------------------------
# stylesheet reading


def rule_bodies(sheet: str, selector: str) -> list[str]:
    """Every rule in the sheet whose selector list contains exactly this selector.

    Sheets here are a mix of hand-written and minified, and a selector often
    appears more than once - grouped with others in one rule, alone in another.
    Reading only the first match reads whichever happened to come first, so
    every body is returned in document order and the caller takes the last
    declaration, the way the cascade does.
    """
    wanted = normalised(selector)
    bodies = []
    for match in re.finditer(r"([^{}]+)\{([^}]*)\}", read(sheet)):
        if wanted in [normalised(part) for part in match.group(1).split(",")]:
            bodies.append(match.group(2))
    if not bodies:
        raise SystemExit(f"no rule for {selector} in {sheet}")
    return bodies


def normalised(selector: str) -> str:
    """One selector in a comparable form; these sheets mix minified and spaced."""
    return re.sub(r"\s*([>+~])\s*", r"", " ".join(selector.split()))


def rule_body(sheet: str, selector: str) -> str:
    return "".join(f"{body};" for body in rule_bodies(sheet, selector))


def declaration(sheet: str, selector: str, name: str) -> str | None:
    """The winning value for one property, or None if it is never declared."""
    found = re.findall(rf"(?<![\w-]){name}:\s*([^;]+);", rule_body(sheet, selector))
    return found[-1] if found else None


_sheets: dict[str, str] = {}


def read(sheet: str) -> str:
    """The sheet flattened for rule matching.

    Comments go first - a comma in prose is not a selector list. At-rule
    preludes go too: every one of these sheets is wrapped in
    `@scope (.qc-screen-fixture-root) { ... }`, and leaving the prelude in place
    makes the first rule inside it part of the at-rule's body instead of a rule
    of its own. Dropping the wrapper is safe here because nothing conditions a
    geometry on a media query; the leftover closing brace matches nothing.
    """
    if sheet not in _sheets:
        text = (STYLES / sheet).read_text(encoding="utf-8")
        text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        _sheets[sheet] = re.sub(r"@[\w-]+[^{}]*\{", "", text)
    return _sheets[sheet]


def length(value: str) -> float:
    """One CSS length in device pixels."""
    text = value.strip()
    if text in ("0", "auto"):
        return 0.0
    if text.endswith("cqw"):
        return float(text[:-3]) * CQW
    if text.endswith("px"):
        return float(text[:-2])
    raise SystemExit(f"cannot convert the length {value!r} to device pixels")


def declared(sheet: str, selector: str, name: str) -> float | None:
    """A single longhand declaration, in pixels."""
    found = declaration(sheet, selector, name)
    return None if found is None else length(found)


def sides(sheet: str, selector: str, name: str) -> dict[str, float] | None:
    """A `top right bottom left` shorthand (inset, padding, margin), in pixels."""
    found = declaration(sheet, selector, name)
    if found is None:
        return None
    parts = [length(part) for part in found.split()]
    if len(parts) == 1:
        parts *= 4
    elif len(parts) == 2:
        parts = [parts[0], parts[1], parts[0], parts[1]]
    elif len(parts) == 3:
        parts = [parts[0], parts[1], parts[2], parts[1]]
    return dict(zip(("top", "right", "bottom", "left"), parts))


# --------------------------------------------------------------------------
# frame reading


def frame(directory: Path, name: str):
    image = Image.open(directory / name).convert("RGB")
    return image.load(), image.size


def spans(values):
    """Contiguous runs in a set of coordinates, as [start, end] pairs."""
    out: list[list[int]] = []
    for value in sorted(set(values)):
        if out and value == out[-1][1] + 1:
            out[-1][1] = value
        else:
            out.append([value, value])
    return out


def ink_box(pixels, predicate, region):
    left, top, right, bottom = region
    xs = [x for y in range(top, bottom) for x in range(left, right) if predicate(pixels[x, y])]
    ys = [y for y in range(top, bottom) for x in range(left, right) if predicate(pixels[x, y])]
    if not xs:
        return None
    return {"left": min(xs), "top": min(ys), "right": max(xs), "bottom": max(ys),
            "width": max(xs) - min(xs) + 1, "height": max(ys) - min(ys) + 1}


def panel_box(pixels, fill, size, column_share: float, row_share: float):
    """The extent of a solid panel, ignoring the text and icons drawn on it."""
    width, height = size
    columns = [x for x in range(width)
               if sum(1 for y in range(height) if fill(pixels[x, y])) > height * column_share]
    rows = [y for y in range(height)
            if sum(1 for x in range(width) if fill(pixels[x, y])) > width * row_share]
    if not columns or not rows:
        return None
    return {"left": columns[0], "top": rows[0],
            "width": columns[-1] - columns[0] + 1, "height": rows[-1] - rows[0] + 1}


# --------------------------------------------------------------------------
# SVG glyphs
#
# A `background: center / contain no-repeat url("data:image/svg+xml,...")` paints
# the artwork's ink at a size we can predict from the viewBox and the declared
# box, so the ink the device drew is a real constraint on the artwork we ship.

_COMMANDS = set("MmLlHhVvZz")


def path_extent(commands: str) -> tuple[float, float, float, float]:
    """Bounding box of a straight-line path, in viewBox units.

    Only the straight-line commands are understood. Anything else raises rather
    than returning a plausible-looking wrong answer - a glyph this cannot
    measure must fail loudly, not silently pass.
    """
    tokens = re.findall(r"[A-Za-z]|-?\d*\.?\d+", commands)
    xs: list[float] = []
    ys: list[float] = []
    x = y = 0.0
    start = (0.0, 0.0)
    command = ""
    index = 0
    if not tokens or not tokens[0].isalpha():
        raise SystemExit(f"path data does not begin with a command: {commands!r}")
    while index < len(tokens):
        token = tokens[index]
        if token.isalpha():
            if token not in _COMMANDS:
                raise SystemExit(f"path command {token!r} is not a straight line; "
                                 f"verify_screen_geometry.py cannot measure this glyph")
            command = token
            index += 1
            if command in "Zz":
                x, y = start
                xs.append(x)
                ys.append(y)
                continue
        elif command in "Mm":
            # A second coordinate pair after a moveto is an implicit lineto.
            command = "L" if command == "M" else "l"
        if command in "Zz":
            raise SystemExit("unexpected number after a closepath")
        if command in "Hh":
            value = float(tokens[index])
            x = value if command == "H" else x + value
            index += 1
        elif command in "Vv":
            value = float(tokens[index])
            y = value if command == "V" else y + value
            index += 1
        else:
            first, second = float(tokens[index]), float(tokens[index + 1])
            x = first if command.isupper() else x + first
            y = second if command.isupper() else y + second
            index += 2
        if command in "Mm":
            start = (x, y)
        xs.append(x)
        ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def glyph_ink(sheet: str, selector: str) -> dict[str, float]:
    """The ink box the declared background artwork paints, in device pixels."""
    box_width = declared(sheet, selector, "width")
    box_height = declared(sheet, selector, "height")
    url = re.search(r'url\("data:image/svg\+xml,(.*?)"\)', rule_body(sheet, selector), re.S)
    if not url:
        raise SystemExit(f"{selector} declares no inline SVG background")
    svg = unquote(url.group(1))
    view = re.search(r"viewBox='([\d.\s-]+)'", svg) or re.search(r'viewBox="([\d.\s-]+)"', svg)
    _, _, view_width, view_height = [float(part) for part in view.group(1).split()]
    stroke = re.search(r"stroke-width='([\d.]+)'", svg)
    half = float(stroke.group(1)) / 2 if stroke else 0.0
    extents = [path_extent(match) for match in re.findall(r"\bd='([^']+)'", svg)]
    if not extents:
        raise SystemExit(f"{selector} declares an SVG with no paths")
    left = min(extent[0] for extent in extents) - half
    top = min(extent[1] for extent in extents) - half
    right = max(extent[2] for extent in extents) + half
    bottom = max(extent[3] for extent in extents) + half
    # `contain` fits the viewBox inside the box, preserving the aspect ratio.
    scale = min(box_width / view_width, box_height / view_height)
    return {"width": (right - left) * scale, "height": (bottom - top) * scale}


# --------------------------------------------------------------------------
# the checks

problems: list[str] = []
measurements = 0
report = False


def compare(label: str, measured: float, expected: float, tolerance: int = TOLERANCE) -> None:
    global measurements
    measurements += 1
    if report:
        print(f"  {label}: frame {measured:g}, stylesheet {expected:g}")
    if abs(measured - expected) > tolerance:
        problems.append(f"{label}: the stylesheet says {expected:g}px, the frame measures {measured:g}px")


def check_overlays() -> None:
    """Panels drawn over a dimmed screen, positioned in screen coordinates."""
    overlays = [
        ("directory-item-context.png", "fixture-live-surface.css",
         ".coros-directory-fixture .directory-item-menu",
         lambda p: max(p) < 40, 0.25, 0.12),
        ("generic-confirmation.png", "fixture-live-surface.css",
         ".coros-physical-confirmation > aside",
         lambda p: p[0] > 180 and p[1] < 140 and p[2] < 130, 0.25, 0.12),
        ("block-context.png", "fixture-live-surface.css",
         ".qc-screen.coros-block-context > aside",
         lambda p: max(p) < 40, 0.5, 0.25),
    ]
    for capture, sheet, selector, fill, column_share, row_share in overlays:
        pixels, size = frame(CORPUS, capture)
        measured = panel_box(pixels, fill, size, column_share, row_share)
        if measured is None:
            problems.append(f"{capture}: no panel matched the fill predicate")
            continue
        for name in ("left", "top", "width", "height"):
            expected = declared(sheet, selector, name)
            if expected is not None:
                compare(f"{selector} {name} ({capture})", measured[name], expected)


def check_content_panels() -> None:
    """Screens whose card column runs between a header and the frame's bottom.

    The card fill is what the eye sees as the panel, so its vertical extent is
    the content box of `main`: the declared inset plus the declared padding.
    """
    panels = [
        ("official-plugin-folders.png", "official-plugin-folders.css",
         ".plugin-folders-official > main", None),
        ("official-directory-presets.png", "official-directory.css",
         ".directory-official > main", None),
        ("official-directory-plugin-presets.png", "official-directory.css",
         ".directory-official > main", ".directory-official.is-plugins > main"),
    ]
    for capture, sheet, selector, override in panels:
        pixels, _ = frame(MANUAL, capture)
        inset = sides(sheet, selector, "inset")
        padding = sides(sheet, selector, "padding")
        if inset is None or padding is None:
            problems.append(f"{selector}: expected both an inset and a padding shorthand")
            continue
        bottom_inset, bottom_padding = inset["bottom"], padding["bottom"]
        if override:
            explicit_bottom = declared(sheet, override, "bottom")
            explicit_padding = declared(sheet, override, "padding-bottom")
            if explicit_bottom is not None:
                bottom_inset = explicit_bottom
            if explicit_padding is not None:
                bottom_padding = explicit_padding
        expected_top = inset["top"] + padding["top"]
        expected_bottom = 480 - bottom_inset - bottom_padding
        for column in (150, 700):
            lit = spans([y for y in range(480) if max(pixels[column, y]) > 20])
            card = [span for span in lit if span[1] - span[0] > 100]
            if not card:
                problems.append(f"{capture}: no card column at x={column}")
                continue
            compare(f"{selector} content top (x={column}, {capture})", card[0][0], expected_top)
            compare(f"{selector} content bottom (x={column}, {capture})", card[0][1] + 1, expected_bottom)


def check_midi_trash() -> None:
    """The disabled MIDI Out header action: its width and its fill."""
    sheet, selector = "official-settings-midi.css", ".coros-midi-out > header .midi-trash"
    fill = declaration(sheet, selector, "background")
    if fill is None or not re.fullmatch(r"#[0-9a-f]{6}", fill.strip()):
        problems.append(f"{selector}: no flat background colour declared")
        return
    hex_fill = fill.strip()[1:]
    colour = tuple(int(hex_fill[index:index + 2], 16) for index in (0, 2, 4))
    pixels, _ = frame(CORPUS, "preset-midi-out.png")
    measured = ink_box(pixels, lambda p: p == colour, (540, 0, 700, 62))
    if measured is None:
        problems.append(f"{selector}: preset-midi-out.png has no region filled with "
                        f"the declared #{hex_fill}")
        return
    compare(f"{selector} width (preset-midi-out.png)", measured["width"],
            declared(sheet, selector, "width"))


def check_tuner_toggle() -> None:
    """The LIVE TUNER toggle: the track, the selection ring, and which end it is on.

    The sizes are comparable with the stylesheet; the offsets are relative to a
    footer section whose origin no rule states in screen coordinates, so they
    are deliberately not checked here.
    """
    sheet = "official-tuner.css"
    track_rule = ".tuner-official > footer > section:last-child::before"
    ring_rule = ".tuner-official > footer > section:last-child::after"
    border = declaration(sheet, ring_rule, "border")
    if border is None:
        problems.append(f"{ring_rule}: no border declared")
        return
    stroke_px = length(border.split()[0])

    for capture, ring_at_top in (("tuner-live-enabled.png", True), ("tuner.png", False)):
        pixels, _ = frame(CORPUS, capture)
        region = (485, 370, 545, 470)
        track = ink_box(pixels, lambda p: max(p) < 26, region)
        ring = ink_box(pixels, lambda p: p[1] > 140 and p[0] < 130 and p[2] < 140, region)
        if track is None or ring is None:
            problems.append(f"{capture}: the LIVE TUNER toggle did not resolve")
            continue
        for rule, box in ((track_rule, track), (ring_rule, ring)):
            for name in ("width", "height"):
                compare(f"{rule} {name} ({capture})", box[name],
                        declared(sheet, rule, name), ROUND_TOLERANCE)

        middle = (ring["top"] + ring["bottom"]) // 2
        run = spans([x for x in range(region[0], region[2])
                     if pixels[x, middle][1] > 140 and pixels[x, middle][0] < 130])
        if len(run) != 2:
            problems.append(f"{capture}: the selection ring is not a ring "
                            f"({len(run)} green run(s) across its middle)")
        else:
            compare(f"{ring_rule} stroke ({capture})", run[0][1] - run[0][0] + 1, stroke_px)

        # Which end of the track the ring sits on is the whole state of the
        # control: on top for Yes, at the bottom for No.
        global measurements
        measurements += 1
        on_top = (ring["top"] + ring["bottom"]) / 2 < (track["top"] + track["bottom"]) / 2
        if report:
            print(f"  selection ring on top ({capture}): {on_top}")
        if on_top is not ring_at_top:
            where = "top" if ring_at_top else "bottom"
            problems.append(f"{capture}: the selection ring should sit at the {where} of the track")


def check_brightness_column() -> None:
    """The System brightness values: what they are aligned on, and where.

    settings-system.png shows 16, 32 and 2. Two-digit values cannot tell left
    alignment from right alignment; the single-digit one can, and it decides it.
    """
    global measurements
    sheet, selector = "official-settings-device.css", ".settings-system-detail > div strong"
    pixels, _ = frame(CORPUS, "settings-system.png")
    bands = ((198, 216), (277, 295), (356, 374))
    boxes = []
    for top, bottom in bands:
        box = ink_box(pixels, lambda p: min(p) > 120, (700, top, 800, bottom))
        if box is None:
            problems.append(f"settings-system.png: no value ink in rows {top}-{bottom}")
            return
        boxes.append(box)

    measurements += 1
    lefts = {box["left"] for box in boxes}
    rights = {box["right"] for box in boxes}
    if report:
        print(f"  brightness value ink: lefts {sorted(lefts)}, rights {sorted(rights)}")
    if len(lefts) != 1:
        problems.append(f"settings-system.png: the values do not share a left edge ({sorted(lefts)}); "
                        f"this check assumes the device left-aligns them")
        return
    if len(rights) == 1:
        problems.append("settings-system.png: the values share a right edge too, so this frame "
                        "cannot tell the two alignments apart - it needs a single-digit value")
        return

    offset = declared(sheet, selector, "left")
    if offset is None:
        problems.append(f"{selector}: the device left-aligns these values at a fixed offset, "
                        f"so the rule must position them from the left, not the right")
        return
    # The `strong` sits in the detail card's content box: the card's own left
    # edge in this frame, plus the padding the section rule declares.
    card = min(span[0] for span in
               spans([x for x in range(200, 800) if max(pixels[x, 100]) > 30])
               if span[0] > 264)
    padding = sides("remaining-fixtures-fixes.css", ".coros-settings-official>main>section", "padding")
    compare(f"{selector} left (settings-system.png)",
            boxes[0]["left"], card + padding["left"] + offset, TEXT_TOLERANCE)


def check_keyboard_keys() -> None:
    """The on-screen keyboard's key fill, which covers most of the lower screen."""
    global measurements
    sheet, selector = "fixture-live-surface.css", ".physical-keyboard-rows button"
    fill = declaration(sheet, selector, "background")
    if fill is None or not re.fullmatch(r"#[0-9a-f]{6}", fill.strip()):
        problems.append(f"{selector}: no flat background colour declared")
        return
    hex_fill = fill.strip()[1:]
    colour = tuple(int(hex_fill[index:index + 2], 16) for index in (0, 2, 4))
    pixels, _ = frame(CORPUS, "onscreen-keyboard.png")
    tally = Counter(pixels[x, y] for y in range(300, 470, 3) for x in range(20, 780, 3))
    common = tally.most_common(1)[0][0]
    measurements += 1
    if report:
        print(f"  {selector} fill (onscreen-keyboard.png): frame {as_hex(common)}, "
              f"stylesheet #{hex_fill}")
    if common != colour:
        problems.append(f"{selector}: the stylesheet says #{hex_fill}, "
                        f"onscreen-keyboard.png is mostly {as_hex(common)}")


def as_hex(colour) -> str:
    return "#{:02x}{:02x}{:02x}".format(*colour)


def check_preset_action_glyph() -> None:
    """The sixth device-preset category glyph, against the screen that shows it."""
    sheet = "official-device-browser.css"
    selector = ".coros-device-presets.is-official-actions > nav button:nth-child(6) i > span"
    pixels, _ = frame(MANUAL, "official-device-preset-actions.png")
    measured = ink_box(pixels, lambda p: max(p) > 100, (10, 410, 95, 465))
    if measured is None:
        problems.append("official-device-preset-actions.png: the sixth rail glyph did not resolve")
        return
    painted = glyph_ink(sheet, selector)
    compare(f"{selector} ink width", measured["width"], painted["width"])
    compare(f"{selector} ink height", measured["height"], painted["height"])


def main() -> int:
    global report
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", action="store_true",
                        help="print every measurement, not just the mismatches")
    report = parser.parse_args().report

    check_overlays()
    check_content_panels()
    check_midi_trash()
    check_tuner_toggle()
    check_brightness_column()
    check_keyboard_keys()
    check_preset_action_glyph()

    for problem in problems:
        print(f"FAIL {problem}")
    if problems:
        return 1
    print(f"PASS {measurements} geometry measurement(s) taken from captured frames "
          f"agree with the stylesheets that claim them")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
