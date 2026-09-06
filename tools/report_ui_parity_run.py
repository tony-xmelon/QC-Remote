"""Score the app/device screen pairs captured by windows-ui-parity-run.mjs.

The harness records what the app rendered and what the Quad Cortex was showing
at the same moment. This turns each pair into the same normalized metrics the
screen corpus uses, and writes a side-by-side sheet so the difference can be
looked at rather than only measured.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from PIL import Image

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "tools" / "visual-regression"))

from qc_compare import metrics, normalize  # noqa: E402

GRID_SIZE = (800, 480)


def side_by_side(device: Image.Image, app: Image.Image, path: Path) -> None:
    sheet = Image.new("RGB", (GRID_SIZE[0], GRID_SIZE[1] * 2), (0, 0, 0))
    sheet.paste(device, (0, 0))
    sheet.paste(app, (0, GRID_SIZE[1]))
    sheet.save(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, default=Path("artifacts/ui-parity/ui-parity-run.json"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/ui-parity/parity-report.json"))
    args = parser.parse_args()

    run = json.loads(args.run.read_text(encoding="utf-8"))
    directory = args.run.parent
    comparisons = []
    for entry in run["steps"]:
        parity = entry.get("facts", {}).get("parity")
        for candidate in ([parity] if isinstance(parity, dict) else []) + (
            [entry["facts"]["gigView"]] if isinstance(entry.get("facts", {}).get("gigView"), dict) else []
        ):
            app_path = Path(candidate.get("app", ""))
            device_path = Path(candidate.get("device", ""))
            if not app_path.is_file() or not device_path.is_file():
                comparisons.append({
                    "step": entry["name"],
                    "skipped": candidate.get("appError") or candidate.get("deviceError") or "a capture is missing",
                })
                continue
            app_image = normalize(Image.open(app_path), GRID_SIZE)
            device_image = normalize(Image.open(device_path), GRID_SIZE)
            scores = metrics(device_image, app_image)
            sheet = directory / f"{app_path.stem.removesuffix('-app')}-side-by-side.png"
            side_by_side(device_image, app_image, sheet)
            comparisons.append({
                "step": entry["name"],
                "app": str(app_path),
                "device": str(device_path),
                "sideBySide": str(sheet),
                **scores,
            })

    report = {
        "schemaVersion": 1,
        "run": str(args.run),
        "passed": run["passed"],
        "failed": run["failed"],
        "comparisons": comparisons,
    }
    args.output.write_text(f"{json.dumps(report, indent=2)}\n", encoding="utf-8")
    for comparison in comparisons:
        if "mae" in comparison:
            print(f"{comparison['step']:<48} mae={comparison['mae']:.4f}  edge_f1={comparison['edge_f1_2px']:.4f}")
        else:
            print(f"{comparison['step']:<48} skipped: {comparison['skipped']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
