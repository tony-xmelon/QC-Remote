"""Reach a named CorOS screen and capture it, retrying around the unit itself.

`qc_screen_driver.py` runs a fixed list of commands and refuses anything it
cannot verify, which is the right shape for a scripted sequence but the wrong
one here. The unit takes its own input - during one capture session the Grid
became the metronome editor between a refused tap and the next check, and a
settings menu became Gig View - so a straight-line script reaches its third step
perhaps half the time, and the later steps never run.

This walks instead of marching. Every step reads the graphics tree, decides what
the unit is showing, and either advances, waits for a screen that dismisses
itself, or dismisses one that does not. It never toggles Gig View: if Gig View
is showing, it waits, because that is the owner's screen and not ours to close.

    python tools/qc_screen_walk.py --plan tools/qc_screen_walk_plans.json
    python tools/qc_screen_walk.py --list

A plan entry names the route and the words that prove arrival:

    {"slug": "settings-system-power",
     "label": "Settings > System > Power Functions",
     "route": ["grid", "menu", "settings"],
     "rows": [[140, 270]],
     "marker": "Power Button Sensitivity"}
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "services" / "device-gateway" / "src"))
sys.path.insert(0, str(REPOSITORY_ROOT / "tools"))

import pyquadcortex  # noqa: E402
from qc_device_gateway.remote_control import (  # noqa: E402
    capture_graphics_tree,
    capture_screen,
    capture_settled_screen,
    install_remote_control_compat,
    swipe_screen,
    tap_screen,
)

import qc_screen_driver  # noqa: E402

# The screens that appear on their own, and what to do about each. Gig View is
# never closed from here: rule 1 of the driver, and it is the owner's screen.
TRANSIENT = ("zenUI::MetronomeEditor", "zenUI::GigView", "zenUI::TunerDialog")
MENU_BUTTON = (764, 24)
DONE_BUTTON = (743, 30)
SETTINGS_ROW = (600, 406)
MENU_SCROLLBAR = (740, 170, 740, 430)


class Walk:
    def __init__(self, settle: float = 1.2) -> None:
        install_remote_control_compat()
        self.qc = pyquadcortex.connect()
        self.message = install_remote_control_compat()
        self.settle = settle

    # -- observation -----------------------------------------------------
    def tree(self, attempts: int = 4) -> str:
        """The graphics tree, which answers even when the framebuffer does not."""
        for attempt in range(attempts):
            try:
                return capture_graphics_tree(self.qc)
            except Exception:
                if attempt + 1 == attempts:
                    return ""
                time.sleep(1.0)
        return ""

    def describe(self) -> str:
        """What the unit is showing, in the fewest words that identify it."""
        tree = self.tree(attempts=1)
        widgets = sorted({line.strip() for line in tree.splitlines()
                          if line.strip().startswith("zenUI::")})
        interesting = [name for name in widgets if name.endswith(("Dialog", "Settings", "Popup", "View", "Editor", "Menu"))]
        return ", ".join(interesting[:6]) or (widgets[:4] and ", ".join(widgets[:4])) or "nothing answered"

    def showing(self, marker: str, seconds: float = 6.0) -> bool:
        deadline = time.time() + seconds
        while True:
            if marker in self.tree(attempts=1):
                return True
            if time.time() >= deadline:
                return False
            time.sleep(0.6)

    # -- movement --------------------------------------------------------
    def tap(self, x: int, y: int) -> None:
        tap_screen(self.qc, x, y)
        time.sleep(self.settle)

    def drag(self, x1: int, y1: int, x2: int, y2: int, hold: float = 0.2, steps: int = 18) -> None:
        """Press, move, release. A release over a row can be read as a tap on it,
        so drags here run along a scrollbar, never across a list."""
        self.qc._t.send(self.message(action=1, mouse={"x": x1, "y": y1, "type": 1}))
        time.sleep(hold)
        for step in range(1, steps + 1):
            self.qc._t.send(self.message(action=1, mouse={
                "x": x1 + (x2 - x1) * step / steps,
                "y": y1 + (y2 - y1) * step / steps,
                "type": 2,
            }))
            time.sleep(0.05)
        time.sleep(0.3)
        self.qc._t.send(self.message(action=1, mouse={"x": x2, "y": y2, "type": 0}))
        time.sleep(self.settle)

    def swipe(self, x1: int, y1: int, x2: int, y2: int) -> None:
        """CorOS's own atomic DRAG. It scrolls a list where dragging a
        scrollbar sometimes misses it, and is sometimes read as a tap on the row
        under it instead - which is why every caller checks where it landed."""
        swipe_screen(self.qc, x1, y1, x2, y2)
        time.sleep(self.settle)

    def settle_screen(self, seconds: float = 25.0) -> str:
        """Wait out whatever the unit put on screen by itself."""
        deadline = time.time() + seconds
        while time.time() < deadline:
            tree = self.tree()
            if not any(marker in tree for marker in TRANSIENT):
                return tree
            time.sleep(1.5)
        return self.tree()

    def to_grid(self, attempts: int = 8) -> bool:
        """Close whatever is open. A wrong tap lands on some other dialog often
        enough that closing only the two expected ones leaves the walk stuck."""
        for _ in range(attempts):
            tree = self.settle_screen()
            if "zenUI::MainMenuPopup" in tree:
                self.tap(*MENU_BUTTON)
                continue
            if any(line.strip().endswith("Dialog") for line in tree.splitlines()):
                self.tap(*DONE_BUTTON)
                continue
            if "zenUI::NavMenuBlock" in tree and "zenUI::Grid" in tree:
                return True
            time.sleep(1.5)
        return False

    def to_menu(self, attempts: int = 5) -> bool:
        for _ in range(attempts):
            tree = self.settle_screen()
            if "zenUI::MainMenuPopup" in tree:
                return True
            if not self.to_grid():
                continue
            self.tap(*MENU_BUTTON)
        return "zenUI::MainMenuPopup" in self.settle_screen()

    def to_settings(self, attempts: int = 5) -> bool:
        for _ in range(attempts):
            tree = self.settle_screen()
            if "zenUI::SettingsDialog" in tree:
                return True
            if not self.to_menu():
                continue
            # The tree lists every menu row whether or not it is scrolled into
            # view, so it cannot say where Settings is. Drag the scrollbar to
            # the foot twice - the second is a no-op once it is there - and let
            # the loop notice if the tap still landed on something else.
            self.drag(*MENU_SCROLLBAR)
            self.swipe(600, 420, 600, 150)
            if "Settings" not in self.settle_screen():
                continue
            self.tap(*SETTINGS_ROW)
        return "zenUI::SettingsDialog" in self.settle_screen()

    # The category selector is drawn for some categories and not others - it is
    # absent from the frame and from the tree while System is showing - so this
    # leg reports failure rather than tapping where a control is not.
    CATEGORY_ROWS = {"account": 90, "system": 150, "device": 210, "support": 270}

    def to_category(self, name: str, attempts: int = 4) -> bool:
        for _ in range(attempts):
            if not self.to_settings():
                continue
            tree = self.settle_screen()
            if "zenUI::ComboBoxWithSelector" not in tree:
                print("    no category selector is drawn on this pane")
                return False
            self.tap(140, 30)
            if "Support" not in self.settle_screen():
                continue
            self.tap(140, self.CATEGORY_ROWS[name])
            time.sleep(1.0)
            return True
        return False

    ROUTES = {
        "grid": to_grid,
        "menu": to_menu,
        "settings": to_settings,
        "account": lambda self: self.to_category("account"),
        "system": lambda self: self.to_category("system"),
        "device": lambda self: self.to_category("device"),
        "support": lambda self: self.to_category("support"),
    }

    # -- capture ---------------------------------------------------------
    def capture(self, slug: str, label: str, marker: str, settle: bool = True) -> bool:
        """Write the frame only while its own words are on screen, and prove the
        tree that lands beside it still shows them."""
        if not self.showing(marker, seconds=4.0):
            print(f"    {marker!r} is not on screen; {self.describe()}")
            return False
        try:
            png = capture_settled_screen(self.qc) if settle else capture_screen(self.qc)
        except Exception as error:
            print(f"    framebuffer: {error}")
            return False
        tree = self.tree()
        if marker not in tree:
            print("    the screen moved between the pixels and the tree; not written")
            return False
        width, height = qc_screen_driver.write_capture(slug, label, png, tree)
        print(f"    captured {slug}: {width}x{height}, {len(png)} bytes")
        return True


def run_plan(walk: Walk, entry: dict, attempts: int = 3) -> bool:
    slug = entry["slug"]
    for attempt in range(1, attempts + 1):
        print(f"  {slug} attempt {attempt}")
        ok = True
        for leg in entry.get("route", []):
            if not Walk.ROUTES[leg](walk):
                print(f"    could not reach {leg}")
                ok = False
                break
        if not ok:
            continue
        for x, y in entry.get("rows", []):
            walk.tap(x, y)
        if walk.capture(slug, entry["label"], entry["marker"], settle=entry.get("settles", True)):
            return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", default="tools/qc_screen_walk_plans.json")
    parser.add_argument("--only", nargs="*", help="capture just these slugs")
    parser.add_argument("--list", action="store_true", help="print the plan and stop")
    parser.add_argument("--attempts", type=int, default=3)
    arguments = parser.parse_args()

    plan = json.loads((REPOSITORY_ROOT / arguments.plan).read_text(encoding="utf-8"))
    entries = [entry for entry in plan["captures"]
               if not arguments.only or entry["slug"] in arguments.only]
    if arguments.list:
        for entry in entries:
            print(f"{entry['slug']:34} {entry['label']}")
        return 0

    walk = Walk()
    print(f"connected; {len(entries)} screen(s) to capture")
    written, missed = [], []
    for entry in entries:
        (written if run_plan(walk, entry, arguments.attempts) else missed).append(entry["slug"])
    print(f"captured {len(written)}/{len(entries)}")
    if missed:
        print("missed: " + ", ".join(missed))
    return 1 if missed else 0


if __name__ == "__main__":
    raise SystemExit(main())
