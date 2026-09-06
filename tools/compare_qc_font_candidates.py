"""Rank bundled font candidates against every authoritative QC screen."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).parent / "visual-regression"))
from qc_compare import metrics  # noqa: E402


def masked_metrics(reference_path: Path, rendered_path: Path, no_text_path: Path) -> dict[str, float] | None:
    reference = np.asarray(Image.open(reference_path).convert("RGB"))
    rendered = np.asarray(Image.open(rendered_path).convert("RGB"))
    no_text = np.asarray(Image.open(no_text_path).convert("RGB"))
    difference = np.max(np.abs(rendered.astype(np.int16) - no_text.astype(np.int16)), axis=2) > 2
    if not difference.any():
        return None
    mask = np.asarray(Image.fromarray(difference).filter(ImageFilter.MaxFilter(9)), dtype=bool)
    reference_masked = reference.copy()
    rendered_masked = rendered.copy()
    reference_masked[~mask] = 0
    rendered_masked[~mask] = 0
    score = metrics(Image.fromarray(reference_masked), Image.fromarray(rendered_masked))
    return {
        "structuralMatchPercent": round(score["edge_f1_2px"] * 100, 2),
        "colorMatchPercent": round((1 - score["mae"]) * 100, 2),
        "textPixels": int(difference.sum()),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path(".artifacts/font-corpus/report.json"))
    args = parser.parse_args()
    candidates = {
        "baseline": Path(".artifacts/typography-baseline"),
        "arimo": Path(".artifacts/font-corpus/arimo"),
        "roboto": Path(".artifacts/font-corpus/roboto"),
    }
    sources = {
        "physical": (Path("references/qc-ui-corpus/coros-4.1.0"), "corpus"),
        "official": (Path("references/qc-ui-official-manual/coros-4.1.0"), "official"),
    }
    screens = []
    missing = []
    for source, (reference_root, rendered_group) in sources.items():
        for reference_path in sorted(reference_root.glob("*.png")):
            screen_id = reference_path.stem
            results = {}
            for candidate, candidate_root in candidates.items():
                rendered_root = candidate_root / rendered_group / "windows"
                rendered_path = rendered_root / f"{screen_id}.png"
                no_text_path = rendered_root / f"{screen_id}.no-text.png"
                if not rendered_path.exists() or not no_text_path.exists():
                    missing.append(str(rendered_path if not rendered_path.exists() else no_text_path))
                    continue
                score = masked_metrics(reference_path, rendered_path, no_text_path)
                if score:
                    results[candidate] = score
            if results:
                winner = max(results, key=lambda item: (results[item]["structuralMatchPercent"], results[item]["colorMatchPercent"]))
                screens.append({"source": source, "screen": screen_id, "winner": winner, "candidates": results})
    summaries = {}
    for candidate in candidates:
        measurements = [screen["candidates"][candidate] for screen in screens if candidate in screen["candidates"]]
        summaries[candidate] = {
            "screens": len(measurements),
            "wins": sum(screen["winner"] == candidate for screen in screens),
            "meanStructuralMatchPercent": round(sum(item["structuralMatchPercent"] for item in measurements) / len(measurements), 2),
            "meanColorMatchPercent": round(sum(item["colorMatchPercent"] for item in measurements) / len(measurements), 2),
        }
    report = {"schemaVersion": 1, "screens": len(screens), "summaries": summaries, "missing": sorted(set(missing)), "results": screens}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"screens": len(screens), "summaries": summaries, "missing": len(report["missing"])}, indent=2))
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
