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
import math
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

_COMMANDS = set("MmLlHhVvZzAa")


def arc_points(x0, y0, rx, ry, rotation, large_arc, sweep, x1, y1, samples=48):
    """Points along an SVG elliptical arc, enough to bound it.

    Sampling rather than solving for the extrema: the tolerance here is a
    couple of pixels and an arc a hundredth of its length off is far inside it.
    """
    if rx == 0 or ry == 0 or (x0, y0) == (x1, y1):
        return [(x1, y1)]
    rx, ry = abs(rx), abs(ry)
    phi = math.radians(rotation)
    dx, dy = (x0 - x1) / 2, (y0 - y1) / 2
    xp = math.cos(phi) * dx + math.sin(phi) * dy
    yp = -math.sin(phi) * dx + math.cos(phi) * dy
    oversize = xp * xp / (rx * rx) + yp * yp / (ry * ry)
    if oversize > 1:
        rx *= math.sqrt(oversize)
        ry *= math.sqrt(oversize)
    denominator = rx * rx * yp * yp + ry * ry * xp * xp
    numerator = rx * rx * ry * ry - denominator
    factor = math.sqrt(max(0.0, numerator / denominator)) * (-1 if large_arc == sweep else 1)
    cxp, cyp = factor * rx * yp / ry, -factor * ry * xp / rx
    cx = math.cos(phi) * cxp - math.sin(phi) * cyp + (x0 + x1) / 2
    cy = math.sin(phi) * cxp + math.cos(phi) * cyp + (y0 + y1) / 2
    start = math.atan2((yp - cyp) / ry, (xp - cxp) / rx)
    end = math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx)
    sweep_angle = end - start
    if not sweep and sweep_angle > 0:
        sweep_angle -= 2 * math.pi
    elif sweep and sweep_angle < 0:
        sweep_angle += 2 * math.pi
    points = []
    for step in range(samples + 1):
        theta = start + sweep_angle * step / samples
        points.append((
            cx + rx * math.cos(theta) * math.cos(phi) - ry * math.sin(theta) * math.sin(phi),
            cy + rx * math.cos(theta) * math.sin(phi) + ry * math.sin(theta) * math.cos(phi),
        ))
    return points


def path_extent(commands: str) -> tuple[float, float, float, float]:
    """Bounding box of a path, in viewBox units.

    Lines and elliptical arcs are understood. Anything else raises rather than
    returning a plausible-looking wrong answer - a glyph this cannot measure
    must fail loudly, not silently pass.
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
                raise SystemExit(f"path command {token!r} is neither a line nor an arc; "
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
        if command in "Aa":
            rx, ry, rotation = (float(tokens[index + offset]) for offset in (0, 1, 2))
            large_arc, sweep = (int(float(tokens[index + offset])) for offset in (3, 4))
            end_x, end_y = float(tokens[index + 5]), float(tokens[index + 6])
            if command == "a":
                end_x, end_y = x + end_x, y + end_y
            for point in arc_points(x, y, rx, ry, rotation, large_arc, sweep, end_x, end_y):
                xs.append(point[0])
                ys.append(point[1])
            x, y = end_x, end_y
            index += 7
        elif command in "Hh":
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


def stroke_width(markup: str) -> float:
    """A stroke-width, in either the CSS or the JSX spelling."""
    found = re.search(r"""(?:stroke-width|strokeWidth)=["']([\d.]+)["']""", markup)
    return float(found.group(1)) if found else 0.0


def number(markup: str, name: str, fallback: float = 0.0) -> float:
    found = re.search(rf"""\b{name}=["']([-\d.]+)["']""", markup)
    return float(found.group(1)) if found else fallback


def svg_extents(svg: str, described: str):
    """Every drawable's bounding box in one SVG, in viewBox units.

    A stroke straddles the geometry it follows, so half of it belongs to the
    ink; a shape that only declares a fill has none to add. Getting that wrong
    reads the padlock two pixels wider than the artwork can draw it, which is
    exactly the size of error these checks exist to catch.
    """
    inherited = stroke_width(svg)
    extents = []
    for element in re.finditer(r"<(path|rect)\b([^>]*?)/?>", svg):
        kind, attributes = element.group(1), element.group(2)
        own = stroke_width(attributes)
        if own:
            half = own / 2
        elif "stroke=" in attributes:
            half = inherited / 2
        elif "fill=" in attributes:
            half = 0.0
        else:
            half = inherited / 2
        if kind == "path":
            found = re.search(r"""\bd=["']([^"']+)["']""", attributes)
            if not found:
                continue
            left, top, right, bottom = path_extent(found.group(1))
        else:
            left, top = number(attributes, "x"), number(attributes, "y")
            right = left + number(attributes, "width")
            bottom = top + number(attributes, "height")
        extents.append((left - half, top - half, right + half, bottom + half))
    if not extents:
        raise SystemExit(f"{described} declares an SVG with nothing drawable in it")
    return extents


def component_svg(name: str) -> str:
    """The SVG a named fixture component returns."""
    source = (STYLES / "coros-screen-fixtures.tsx").read_text(encoding="utf-8")
    body = re.search(rf"function {name}\(\)[^{{]*\{{(.*?)\n\}}", source, re.S)
    if not body:
        raise SystemExit(f"no component named {name} in coros-screen-fixtures.tsx")
    svg = re.search(r"<svg\b.*?</svg>", body.group(1), re.S)
    if not svg:
        raise SystemExit(f"{name} does not return an SVG")
    return svg.group(0)


def glyph_ink(sheet: str, selector: str) -> dict[str, float]:
    """The ink box the declared background artwork paints, in device pixels."""
    box_width = declared(sheet, selector, "width")
    box_height = declared(sheet, selector, "height")
    url = re.search(r'url\("data:image/svg\+xml,(.*?)"\)', rule_body(sheet, selector), re.S)
    if not url:
        raise SystemExit(f"{selector} declares no inline SVG background")
    svg = unquote(url.group(1))
    view = re.search(r"""viewBox=["']([\d.\s-]+)["']""", svg)
    _, _, view_width, view_height = [float(part) for part in view.group(1).split()]
    extents = svg_extents(svg, selector)
    left = min(extent[0] for extent in extents)
    top = min(extent[1] for extent in extents)
    right = max(extent[2] for extent in extents)
    bottom = max(extent[3] for extent in extents)
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


# --------------------------------------------------------------------------
# reading tiles, text and fills out of a frame


def colour_runs(pixels, y, x0, x1, minimum=4):
    """Contiguous same-colour runs along one row, as (start, end, colour)."""
    out, current, start = [], None, x0
    for x in range(x0, x1):
        colour = pixels[x, y]
        if colour != current:
            if current is not None and x - start >= minimum:
                out.append((start, x - 1, current))
            current, start = colour, x
    if x1 - start >= minimum:
        out.append((start, x1 - 1, current))
    return out


def tile_extent(pixels, y, x0, x1):
    """The extent of the lightest tile crossing a row.

    A button carries a glyph, which splits its fill into several runs; the tile
    is the whole span between the first and last run of that fill, not the
    widest single run.
    """
    runs = colour_runs(pixels, y, x0, x1)
    if not runs:
        return None
    fill = max(runs, key=lambda run: sum(run[2]))[2]
    matching = [run for run in runs if run[2] == fill]
    return matching[0][0], matching[-1][1], fill


def text_rows(pixels, region, threshold=140):
    """The vertical bands a line of light text occupies."""
    x0, y0, x1, y1 = region
    lit = {y for y in range(y0, y1) for x in range(x0, x1) if min(pixels[x, y]) > threshold}
    return spans(lit)


def as_hex(colour) -> str:
    return "#{:02x}{:02x}{:02x}".format(*colour)


def parse_hex(value: str):
    """A #rgb or #rrggbb literal as a colour triple."""
    text = value.strip().lstrip("#")
    if len(text) == 3:
        text = "".join(digit * 2 for digit in text)
    if len(text) != 6:
        raise SystemExit(f"{value!r} is not a hex colour this can compare")
    return tuple(int(text[index:index + 2], 16) for index in (0, 2, 4))


def dominant(pixels, region, step=2):
    x0, y0, x1, y1 = region
    tally = Counter(pixels[x, y] for y in range(y0, y1, step) for x in range(x0, x1, step))
    return tally.most_common(1)[0][0]


def compare_colour(label: str, measured, expected) -> None:
    global measurements
    measurements += 1
    if report:
        print(f"  {label}: frame {as_hex(measured)}, stylesheet {as_hex(expected)}")
    if measured != expected:
        problems.append(f"{label}: the stylesheet says {as_hex(expected)}, "
                        f"the frame is {as_hex(measured)}")


# --------------------------------------------------------------------------
# the checks, second pass


def check_directory_context_header() -> None:
    """The Done button on the dimmed directory header."""
    sheet = "fixture-live-surface.css"
    selector = ".coros-directory-fixture.is-physical-context > header > button:last-child"
    pixels, _ = frame(CORPUS, "directory-item-context.png")
    # The button is the lightest tile in the header's right half.
    button = tile_extent(pixels, 30, 560, 800)
    if button is None:
        problems.append("directory-item-context.png: no header button resolved")
        return
    compare(f"{selector} left (directory-item-context.png)", button[0],
            declared(sheet, selector, "left"))
    compare(f"{selector} width (directory-item-context.png)", button[1] - button[0] + 1,
            declared(sheet, selector, "width"))


def check_item_menu_rows() -> None:
    """The item menu's five entries sit on one pitch: the declared button height."""
    global measurements
    sheet = "fixture-live-surface.css"
    menu = ".coros-directory-fixture .directory-item-menu"
    button = ".coros-directory-fixture .directory-item-menu button"
    pixels, _ = frame(CORPUS, "directory-item-context.png")
    left = declared(sheet, menu, "left")
    top = declared(sheet, menu, "top")
    width = declared(sheet, menu, "width")
    height = declared(sheet, menu, "height")
    bands = text_rows(pixels, (int(left) + 12, int(top), int(left + width) - 12, int(top + height)))
    measurements += 1
    if report:
        print(f"  {menu} entry tops: {[band[0] for band in bands]}")
    if len(bands) != 5:
        problems.append(f"directory-item-context.png: the menu shows {len(bands)} entries, "
                        f"and the stylesheet lays out {height / declared(sheet, button, 'height'):g}")
        return
    pitch = declared(sheet, button, "height")
    tops = [band[0] for band in bands]
    for index, (first, second) in enumerate(zip(tops, tops[1:]), start=1):
        compare(f"{button} pitch, entries {index}-{index + 1} (directory-item-context.png)",
                second - first, pitch)
    # Five entries at that pitch have to be the menu's whole height, or the
    # last one is clipped: that is what the 54px buttons were doing.
    compare(f"{menu} height against five entries", height, pitch * 5)


def check_block_context_menu() -> None:
    """The menu's icon column, and the scrim it is drawn over."""
    sheet = "fixture-live-surface.css"
    aside = ".qc-screen.coros-block-context > aside"
    button = ".qc-screen.coros-block-context > aside button"
    scrim = ".coros-block-context > .block-context-scrim"
    pixels, _ = frame(CORPUS, "block-context.png")
    left = declared(sheet, aside, "left")

    tracks = declaration(sheet, button, "grid-template-columns")
    if tracks is None:
        problems.append(f"{button}: no grid-template-columns declared")
        return
    icon_column = length(tracks.split()[0])
    # The label column starts one icon column in from the menu's left edge.
    bands = text_rows(pixels, (int(left) + 4, 40, int(left + declared(sheet, aside, "width")), 80))
    label_ink = min((x for y in range(bands[0][0], bands[0][1] + 1)
                     for x in range(int(left) + 40, int(left) + 200)
                     if min(pixels[x, y]) > 140), default=None)
    if label_ink is None:
        problems.append("block-context.png: no label ink in the first entry")
        return
    compare(f"{button} icon column (block-context.png)", label_ink - left,
            icon_column, TEXT_TOLERANCE)

    fill = declaration(sheet, scrim, "background")
    match = re.search(r"rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)", fill or "")
    if not match:
        problems.append(f"{scrim}: no rgba background declared")
        return
    tint = tuple(int(match.group(index)) for index in (1, 2, 3))
    alpha = float(match.group(4))
    # What the scrim is drawn over, taken from the sheet rather than assumed.
    under = parse_hex(declaration(sheet, ".physical-eq-underlay", "background"))
    expected = tuple(int(alpha * tint[index] + (1 - alpha) * under[index]) for index in range(3))
    compare_colour(f"{scrim} over the dimmed screen (block-context.png)",
                   dominant(pixels, (400, 60, 780, 440)), expected)


def check_editor_underlay() -> None:
    """The EQ editor our block-context underlay reconstructs.

    editor-parametric-8.png is that screen: the underlay's header sits at the
    top of the frame and its confirm button is 98px, neither of which is true
    of the editor visible behind the menu in block-context.png.
    """
    sheet = "fixture-live-surface.css"
    root = ".physical-eq-underlay"
    confirm = ".physical-eq-underlay header nav .physical-eq-confirm"
    footer = ".physical-eq-underlay footer"
    pixels, _ = frame(CORPUS, "editor-parametric-8.png")

    button = tile_extent(pixels, 30, 600, 800)
    if button is None:
        problems.append("editor-parametric-8.png: no confirm button resolved")
        return
    compare(f"{confirm} width (editor-parametric-8.png)", button[1] - button[0] + 1,
            declared(sheet, confirm, "width"))
    compare_colour(f"{confirm} fill (editor-parametric-8.png)", button[2],
                   parse_hex(declaration(sheet, confirm, "background")))
    compare_colour(f"{root} background (editor-parametric-8.png)",
                   dominant(pixels, (300, 100, 700, 140)),
                   parse_hex(declaration(sheet, root, "background")))

    band = parse_hex(declaration(sheet, footer, "background"))
    compare_colour(f"{footer} fill (editor-parametric-8.png)",
                   dominant(pixels, (20, 380, 150, 420)), band)
    # The selected tab shares the footer's fill and joins onto it, so read the
    # band by width: the footer spans the frame, one tab does not.
    left = int(declared(sheet, footer, "left"))
    right = 800 - int(declared(sheet, footer, "right"))
    rows = spans([y for y in range(280, 480)
                  if sum(1 for x in range(left, right) if pixels[x, y] == band)
                  > (right - left) * 0.5])
    rows = [run for run in rows if run[1] - run[0] > 40]
    if not rows:
        problems.append("editor-parametric-8.png: the footer band did not resolve")
        return
    top = rows[-1][0]
    # Knobs and dropdowns break up the lower rows, so walk down from the top for
    # as long as the band's fill is present at all.
    bottom = top
    while bottom < 479 and any(pixels[x, bottom + 1] == band for x in range(left, right)):
        bottom += 1
    compare(f"{footer} top (editor-parametric-8.png)", top,
            480 - declared(sheet, footer, "bottom") - declared(sheet, footer, "height"))
    compare(f"{footer} bottom (editor-parametric-8.png)", bottom + 1,
            480 - declared(sheet, footer, "bottom"))


def check_plugin_underlay() -> None:
    """The dimmed Grid behind the plugin browser.

    This underlay paints the dimmed appearance rather than drawing a scrim, so
    every colour it declares is one the frame shows directly.
    """
    sheet = "remaining-fixtures-fixes.css"
    # The plugin-list fixture overrides most of the underlay, so each check has
    # to read the rule that actually wins in this frame, not the base one.
    physical = ".coros-browser-fixture.is-physical-plugin-list .plugin-grid-underlay"
    root = f"{physical}"
    main = ".plugin-grid-underlay main"
    rule = ".plugin-grid-underlay main::before"
    rule_left = f"{physical} main::before"
    slot = f"{physical} main i"
    plus = f"{physical} .underlay-plus"
    add = f"{physical} .underlay-add"
    add_fill_rule = f"{physical} main .underlay-add"
    stroke = f"{physical} main i:not(.underlay-input)::before"
    tile = ".coros-browser-fixture.is-physical-plugin-list .browser-fixture-panel>nav button.is-active i"
    pixels, _ = frame(CORPUS, "device-browser-plugin-list.png")

    compare_colour(f"{root} background", dominant(pixels, (100, 300, 300, 400)),
                   parse_hex(declaration(sheet, root, "background")))
    # `main` is inset from the top by a percentage of the frame's height.
    main_top = round(480 * float(declaration(sheet, main, "inset").split()[0].rstrip("%")) / 100)

    # The row rule: a 2px line from its declared left to the underlay's edge.
    thickness = length(declaration(sheet, rule, "border-top").split()[0])
    colour = parse_hex(declaration(sheet, rule, "border-top").split()[-1])
    lit = [y for y in range(main_top, main_top + 80)
           if len([x for x in range(200, 380) if pixels[x, y] == colour]) > 100]
    if not lit:
        problems.append(f"{rule}: no {as_hex(colour)} rule found below the underlay's main")
        return
    compare(f"{rule} top (device-browser-plugin-list.png)", min(lit),
            main_top + declared(sheet, rule, "top"))
    compare(f"{rule} thickness (device-browser-plugin-list.png)", len(lit), thickness)
    row = spans([x for x in range(0, 400) if pixels[x, min(lit)] == colour])
    compare(f"{rule_left} left (device-browser-plugin-list.png)", row[0][0],
            declared(sheet, rule_left, "left"))

    slot_fill = parse_hex(declaration(sheet, slot, "background"))
    compare_colour(f"{slot} background", dominant(pixels, (80, 120, 130, 170)), slot_fill)
    # The empty-slot tile covers the row rule, so where the rule resumes is the
    # tile's right edge - a harder edge to read than its antialiased corner.
    resume = [run for run in spans([x for x in range(0, 400) if pixels[x, min(lit)] == colour])
              if run[1] - run[0] > 6]
    plus_left = declared(sheet, ".plugin-grid-underlay .underlay-plus", "left")
    covering = [run for run in resume if run[0] > plus_left]
    if covering:
        compare(f"{plus} width (device-browser-plugin-list.png)", covering[0][0] - plus_left,
                declared(sheet, plus, "width"))

    add_fill = parse_hex(declaration(sheet, add_fill_rule, "background"))
    box = ink_box(pixels, lambda c: c == add_fill, (250, main_top, 400, 400))
    if box is None:
        problems.append(f"{add}: no {as_hex(add_fill)} tile in the underlay")
        return
    compare(f"{add} left (device-browser-plugin-list.png)", box["left"],
            declared(sheet, add, "left"))
    compare(f"{add} top (device-browser-plugin-list.png)", box["top"],
            main_top + declared(sheet, add, "top"))
    compare(f"{add} width (device-browser-plugin-list.png)", box["width"],
            declared(sheet, add, "width"))
    compare(f"{add} height (device-browser-plugin-list.png)", box["height"],
            declared(sheet, add, "height"))

    tile_left = int(declared(sheet, ".plugin-grid-underlay .underlay-plus", "left"))
    tile_right = tile_left + int(declared(sheet, plus, "width"))
    glyph = ink_box(pixels, lambda c: max(c) > 100 and c != slot_fill,
                    (tile_left + 2, main_top, tile_right - 2, main_top + 80))
    if glyph:
        compare(f"{stroke} width (device-browser-plugin-list.png)", glyph["width"],
                declared(sheet, stroke, "width"))
        compare(f"{stroke} height (device-browser-plugin-list.png)", glyph["height"],
                declared(sheet, stroke, "width"))

    compare_colour(f"{tile} background", dominant(pixels, (432, 30, 470, 64)),
                   parse_hex(declaration(sheet, tile, "background")))


def check_plugin_lock() -> None:
    """The padlock beside a locked plugin, against the box the stylesheet gives it."""
    sheet = "remaining-fixtures-fixes.css"
    selector = ".coros-browser-fixture.is-physical-plugin-list .plugin-license-lock"
    svg = component_svg("PluginLockIcon")
    view = re.search(r"""viewBox=["']([\d.\s-]+)["']""", svg)
    _, _, view_width, view_height = [float(part) for part in view.group(1).split()]
    extents = svg_extents(svg, selector)
    left = min(extent[0] for extent in extents)
    top = min(extent[1] for extent in extents)
    right = max(extent[2] for extent in extents)
    bottom = max(extent[3] for extent in extents)
    box_width = declared(sheet, selector, "width")
    box_height = declared(sheet, selector, "height")
    # An inline SVG meets its box the same way `contain` does.
    scale = min(box_width / view_width, box_height / view_height)

    pixels, _ = frame(CORPUS, "device-browser-plugin-list.png")
    measured = ink_box(pixels, lambda c: max(c) > 110, (515, 130, 550, 172))
    if measured is None:
        problems.append("device-browser-plugin-list.png: the licence padlock did not resolve")
        return
    compare(f"{selector} ink width (device-browser-plugin-list.png)",
            measured["width"], (right - left) * scale)
    compare(f"{selector} ink height (device-browser-plugin-list.png)",
            measured["height"], (bottom - top) * scale)


def check_tuner_footer() -> None:
    """The tuner's footer card, whose fill the encoder rules are drawn on."""
    sheet, selector = "official-tuner.css", ".tuner-official > footer"
    pixels, _ = frame(CORPUS, "tuner.png")
    compare_colour(f"{selector} background (tuner.png)",
                   dominant(pixels, (200, 380, 460, 460)),
                   parse_hex(declaration(sheet, selector, "background")))


def check_expression_treadle() -> None:
    """The MIDI Out expression pedal's taper.

    The clip-path is written in percentages of a box no rule places in screen
    coordinates, and the box is not the treadle's widest row either - the rule
    carries a margin and a border the clip is applied inside. Comparing widths
    would mean inventing that box. The ratio between the treadle's width at
    three-quarters of its height and at one-quarter needs no box at all, so that
    is what is compared: a 3% difference in it is about 3px on this treadle.
    """
    global measurements
    sheet = "remaining-fixtures-fixes.css"
    selector = ".coros-midi-out .midi-expression label div"
    clip = declaration(sheet, selector, "clip-path")
    inside = re.search(r"polygon\(([^)]*)\)", clip or "")
    if not inside:
        problems.append(f"{selector}: no polygon to compare")
        return
    polygon = []
    for pair in inside.group(1).split(","):
        parts = pair.split()
        if len(parts) != 2 or not all(part.endswith("%") or part == "0" for part in parts):
            problems.append(f"{selector}: {pair.strip()!r} is not a percentage point")
            return
        polygon.append(tuple(0.0 if part == "0" else float(part.rstrip("%")) for part in parts))
    if len(polygon) < 4:
        problems.append(f"{selector}: the polygon has too few points to compare")
        return

    def polygon_width(fraction: float) -> float:
        """The polygon's horizontal extent at a given fraction of its height."""
        crossings = []
        for (x0, y0), (x1, y1) in zip(polygon, polygon[1:] + polygon[:1]):
            if (y0 <= fraction <= y1) or (y1 <= fraction <= y0):
                if y0 == y1:
                    crossings += [x0, x1]
                else:
                    crossings.append(x0 + (x1 - x0) * (fraction - y0) / (y1 - y0))
        return max(crossings) - min(crossings) if crossings else 0.0

    pixels, _ = frame(CORPUS, "preset-midi-out.png")
    fill = dominant(pixels, (540, 200, 610, 360))
    rows = [y for y in range(120, 430)
            if len([x for x in range(505, 650) if pixels[x, y] == fill]) > 20]
    if not rows:
        problems.append("preset-midi-out.png: the expression treadle did not resolve")
        return
    top, height = min(rows), max(rows) - min(rows) + 1

    def frame_width(fraction: float) -> int:
        y = min(max(rows), top + round(height * fraction))
        run = [span for span in spans([x for x in range(505, 650) if pixels[x, y] == fill])
               if span[1] - span[0] > 20]
        return run[0][1] - run[0][0] + 1 if run else 0

    measured = frame_width(0.75) / frame_width(0.25)
    declared_ratio = polygon_width(75) / polygon_width(25)
    measurements += 1
    if report:
        print(f"  {selector} taper: frame {measured:.3f}, stylesheet {declared_ratio:.3f}")
    # A percent of the treadle's widest row is about 0.9px, so 3% is ~3px.
    if abs(measured - declared_ratio) > 0.03:
        problems.append(f"{selector}: the polygon narrows to {declared_ratio:.1%} of its "
                        f"quarter-height width by three-quarter height, the treadle in "
                        f"preset-midi-out.png to {measured:.1%}")


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
    check_directory_context_header()
    check_item_menu_rows()
    check_block_context_menu()
    check_editor_underlay()
    check_plugin_underlay()
    check_plugin_lock()
    check_tuner_footer()
    check_expression_treadle()

    for problem in problems:
        print(f"FAIL {problem}")
    if problems:
        return 1
    print(f"PASS {measurements} geometry measurement(s) taken from captured frames "
          f"agree with the stylesheets that claim them")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
