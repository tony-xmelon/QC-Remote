"""Audit CorOS typography metadata and text-region raster parity on every screen."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).parent / "visual-regression"))
from qc_compare import metrics  # noqa: E402


STYLE_FIELDS = (
    "normalizedText", "fontFamily", "resolvedFontFamily", "fontSize", "fontWeight",
    "fontStyle", "fontStretch", "lineHeight", "letterSpacing", "wordSpacing", "color",
    "backgroundColor", "textAlign", "textTransform", "whiteSpace", "overflowWrap",
    "direction", "writingMode", "textOrientation",
)


def parse_color(value: str | None) -> tuple[int, int, int] | None:
    if not value:
        return None
    if value.startswith("#") and len(value) in (4, 7):
        value = value[1:]
        if len(value) == 3:
            value = "".join(part * 2 for part in value)
        return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))
    match = re.match(r"rgba?\(\s*(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)", value)
    return tuple(round(float(part)) for part in match.groups()) if match else None


def representative_colors(pixels: np.ndarray, limit: int = 3) -> list[tuple[int, int, int]]:
    """Return stable paint colors while collapsing subpixel antialias shades."""
    if not len(pixels):
        return []
    quantized = np.clip(np.round(pixels / 8) * 8, 0, 255).astype(np.uint8)
    counts = Counter(map(tuple, quantized.tolist()))
    return [tuple(int(channel) for channel in color) for color, _ in counts.most_common(limit)]


def palette_delta(reference_pixels: np.ndarray, expected: list[tuple[int, int, int]]) -> float | None:
    """Measure whether the renderer's actual paint palette occurs in the reference."""
    if not len(reference_pixels) or not expected:
        return None
    reference_pixels = reference_pixels.astype(np.float32)
    deltas = []
    for color in expected:
        distances = np.linalg.norm(reference_pixels - np.asarray(color, dtype=np.float32), axis=1)
        # A low percentile is robust to glyph-shape differences without accepting a
        # single coincidental antialias pixel as a color match.
        deltas.append(float(np.percentile(distances, 2)))
    return round(sum(deltas) / len(deltas), 2)


def direct_palette_delta(left: list[tuple[int, int, int]], right: list[tuple[int, int, int]]) -> float | None:
    if not left or not right:
        return None
    return round(float(np.linalg.norm(np.asarray(left[0], dtype=np.float32) - np.asarray(right[0], dtype=np.float32))), 2)


def masked_screen(reference: Image.Image, rendered: Image.Image, no_text: Image.Image) -> dict[str, float] | None:
    reference_array = np.asarray(reference.convert("RGB"))
    rendered_array = np.asarray(rendered.convert("RGB"))
    no_text_array = np.asarray(no_text.convert("RGB"))
    difference = np.max(np.abs(rendered_array.astype(np.int16) - no_text_array.astype(np.int16)), axis=2) > 2
    if not difference.any():
        return None
    mask = np.asarray(Image.fromarray(difference).filter(ImageFilter.MaxFilter(9)), dtype=bool)
    reference_array = reference_array.copy()
    rendered_array = rendered_array.copy()
    reference_array[~mask] = 0
    rendered_array[~mask] = 0
    return metrics(Image.fromarray(reference_array), Image.fromarray(rendered_array))


def box_for_run(image: Image.Image, run: dict, padding: int = 6) -> tuple[int, int, int, int]:
    lines = run.get("lines", [])
    left = max(0, int(min(line["x"] for line in lines)) - padding)
    top = max(0, int(min(line["y"] for line in lines)) - padding)
    right = min(image.width, int(np.ceil(max(line["x"] + line["width"] for line in lines))) + padding)
    bottom = min(image.height, int(np.ceil(max(line["y"] + line["height"] for line in lines))) + padding)
    return left, top, max(left + 1, right), max(top + 1, bottom)


def masked_run(reference: Image.Image, rendered: Image.Image, no_text: Image.Image, run: dict) -> tuple[Image.Image, Image.Image, np.ndarray, np.ndarray, list[tuple[int, int, int]], list[tuple[int, int, int]]]:
    box = box_for_run(rendered, run)
    reference_crop = reference.crop(box)
    rendered_crop = rendered.crop(box)
    no_text_crop = no_text.crop(box)
    rendered_array = np.asarray(rendered_crop.convert("RGB"))
    no_text_array = np.asarray(no_text_crop.convert("RGB"))
    difference_strength = np.max(np.abs(rendered_array.astype(np.int16) - no_text_array.astype(np.int16)), axis=2)
    exact_mask = difference_strength > 2
    mask = np.asarray(Image.fromarray(exact_mask).filter(ImageFilter.MaxFilter(9)), dtype=bool)
    reference_pixels = np.asarray(reference_crop.convert("RGB")).copy()
    rendered_pixels = rendered_array.copy()
    reference_pixels[~mask] = 0
    rendered_pixels[~mask] = 0
    changed_strengths = difference_strength[exact_mask]
    paint_threshold = max(8, float(np.percentile(changed_strengths, 75))) if len(changed_strengths) else 8
    paint_mask = difference_strength >= paint_threshold
    foreground = representative_colors(rendered_array[paint_mask], limit=1)
    background = representative_colors(no_text_array.reshape(-1, 3), limit=1)
    return Image.fromarray(reference_pixels), Image.fromarray(rendered_pixels), mask, exact_mask, foreground, background


def rounded_mean(values: list[float], scale: float = 1.0) -> float | None:
    return round(sum(values) / len(values) * scale, 2) if values else None


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def run_signature(run: dict) -> tuple:
    return (
        run.get("kind"),
        run.get("normalizedText"),
        tuple((round(line["x"], 1), round(line["y"], 1), round(line["width"], 1), round(line["height"], 1)) for line in run.get("lines", [])),
    )


def metadata_parity(windows: dict, android: dict) -> dict:
    left = windows.get("textRuns", [])
    right = android.get("textRuns", [])
    pairs = zip(left, right)
    mismatches = []
    matched_fields = 0
    total_fields = max(len(left), len(right)) * (len(STYLE_FIELDS) + 1)
    for index, (win, android_run) in enumerate(pairs):
        if run_signature(win) == run_signature(android_run):
            matched_fields += 1
        else:
            mismatches.append({"run": index + 1, "field": "text-or-position", "windows": run_signature(win), "android": run_signature(android_run)})
        for field in STYLE_FIELDS:
            if win.get(field) == android_run.get(field):
                matched_fields += 1
            else:
                mismatches.append({"run": index + 1, "field": field, "windows": win.get(field), "android": android_run.get(field)})
    return {
        "windowsRuns": len(left),
        "androidRuns": len(right),
        "matchPercent": round(matched_fields / max(total_fields, 1) * 100, 2),
        "mismatches": mismatches[:40],
    }


def tree_tokens(path: Path) -> set[str]:
    if not path.exists():
        return set()
    values = re.findall(r"text\s*:\s*'(.*?)'", path.read_text(encoding="utf-8"), flags=re.DOTALL)
    return {token.casefold() for value in values for token in re.findall(r"[\w.%-]+", value, flags=re.UNICODE)}


def rendered_tokens(metadata: dict) -> set[str]:
    return {
        token.casefold()
        for run in metadata.get("textRuns", [])
        for token in re.findall(r"[\w.%-]+", run.get("normalizedText", ""), flags=re.UNICODE)
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path("references/qc-ui-typography/coros-4.1.0/manifest.json"))
    parser.add_argument("--baseline", type=Path, default=Path(".artifacts/typography-baseline"))
    parser.add_argument("--physical", type=Path, default=Path("references/qc-ui-corpus/coros-4.1.0"))
    parser.add_argument("--official", type=Path, default=Path("references/qc-ui-official-manual/coros-4.1.0"))
    parser.add_argument("--output", type=Path, default=Path(".artifacts/typography-comparison"))
    args = parser.parse_args()

    manifest = load_json(args.manifest)
    bundled_families = set(manifest["bundledFamilies"])
    coverage = load_json(Path(manifest["coverageLedger"]))
    roots = {
        "physical": (args.physical, args.baseline / "corpus"),
        "official": (args.official, args.baseline / "official"),
        "smoke": (None, args.baseline / "smoke"),
    }
    state_results = []
    raster_results = []
    parity_results = []
    availability = Counter()
    missing = []

    for state in coverage["states"]:
        candidates = [
            *(('physical', item) for item in state.get("physical", [])),
            *(('official', item) for item in state.get("official", [])),
            *(('smoke', item) for item in state.get("smoke", [])),
        ]
        state_sources = []
        for source, screen_id in candidates:
            reference_root, rendered_root = roots[source]
            metadata_paths = {host: rendered_root / host / f"{screen_id}.typography.json" for host in ("windows", "android")}
            if not all(path.exists() for path in metadata_paths.values()):
                continue
            metadata = {host: load_json(path) for host, path in metadata_paths.items()}
            parity = metadata_parity(metadata["windows"], metadata["android"])
            parity_results.append({"state": state["id"], "screen": screen_id, "source": source, **parity})
            for host in ("windows", "android"):
                for run in metadata[host].get("textRuns", []):
                    availability[(run.get("primaryFontFamily", ""), bool(run.get("primaryFontAvailable")))] += 1
            source_result = {"source": source, "screen": screen_id, "runs": len(metadata["windows"].get("textRuns", [])), "authoritative": reference_root is not None}
            if reference_root is not None:
                reference_path = reference_root / f"{screen_id}.png"
                if not reference_path.exists():
                    missing.append(str(reference_path))
                    continue
                reference = Image.open(reference_path).convert("RGB")
                for host in ("windows", "android"):
                    rendered_path = rendered_root / host / f"{screen_id}.png"
                    if not rendered_path.exists():
                        missing.append(str(rendered_path))
                        continue
                    rendered = Image.open(rendered_path).convert("RGB")
                    no_text_path = rendered_root / host / f"{screen_id}.no-text.png"
                    if not no_text_path.exists():
                        missing.append(str(no_text_path))
                        continue
                    no_text = Image.open(no_text_path).convert("RGB")
                    screen_score = masked_screen(reference, rendered, no_text)
                    run_results = []
                    for run in metadata[host].get("textRuns", []):
                        reference_crop, rendered_crop, text_mask, exact_mask, foreground, background = masked_run(reference, rendered, no_text, run)
                        score = metrics(reference_crop, rendered_crop)
                        reference_array = np.asarray(reference.crop(box_for_run(reference, run)).convert("RGB"))
                        foreground_delta = palette_delta(reference_array[text_mask], foreground)
                        background_pixels = reference_array[~text_mask] if (~text_mask).any() else reference_array.reshape(-1, 3)
                        reference_background = representative_colors(background_pixels, limit=1)
                        reference_candidates = representative_colors(reference_array[text_mask], limit=20)
                        if reference_background:
                            reference_candidates = [color for color in reference_candidates if np.linalg.norm(
                                np.asarray(color, dtype=np.float32) - np.asarray(reference_background[0], dtype=np.float32)
                            ) > 8]
                        if foreground and reference_candidates:
                            reference_foreground = [min(reference_candidates, key=lambda color: np.linalg.norm(
                                np.asarray(color, dtype=np.float32) - np.asarray(foreground[0], dtype=np.float32)
                            ))]
                        else:
                            reference_foreground = reference_candidates[:1]
                        foreground_delta = direct_palette_delta(foreground, reference_foreground)
                        background_delta = direct_palette_delta(background, reference_background)
                        run_results.append({
                            "text": run.get("normalizedText"),
                            "lines": run.get("lines"),
                            "font": run.get("resolvedFontFamily"),
                            "fontSize": run.get("fontSize"),
                            "color": run.get("color"),
                            "backgroundColor": run.get("backgroundColor"),
                            "renderedForegroundColors": ["#" + "".join(f"{channel:02x}" for channel in color) for color in foreground],
                            "renderedBackgroundColors": ["#" + "".join(f"{channel:02x}" for channel in color) for color in background],
                            "referenceForegroundColors": ["#" + "".join(f"{channel:02x}" for channel in color) for color in reference_foreground],
                            "referenceBackgroundColors": ["#" + "".join(f"{channel:02x}" for channel in color) for color in reference_background],
                            "structuralMatchPercent": round(score["edge_f1_2px"] * 100, 2),
                            "colorMatchPercent": round((1 - score["mae"]) * 100, 2),
                            "referenceForegroundPaletteDelta": foreground_delta,
                            "referenceBackgroundPaletteDelta": background_delta,
                        })
                    tree = tree_tokens(reference_root / f"{screen_id}.tree.txt") if source == "physical" else set()
                    tokens = rendered_tokens(metadata[host])
                    raster_results.append({
                        "state": state["id"], "source": source, "screen": screen_id, "host": host,
                        "runs": len(run_results),
                        "structuralMatchPercent": round(screen_score["edge_f1_2px"] * 100, 2) if screen_score else None,
                        "colorMatchPercent": round((1 - screen_score["mae"]) * 100, 2) if screen_score else None,
                        "meanRunStructuralMatchPercent": rounded_mean([item["structuralMatchPercent"] for item in run_results]),
                        "meanRunColorMatchPercent": rounded_mean([item["colorMatchPercent"] for item in run_results]),
                        "foregroundColorPresencePercent": rounded_mean([item["referenceForegroundPaletteDelta"] <= 12 for item in run_results if item["referenceForegroundPaletteDelta"] is not None], 100),
                        "backgroundColorPresencePercent": rounded_mean([item["referenceBackgroundPaletteDelta"] <= 12 for item in run_results if item["referenceBackgroundPaletteDelta"] is not None], 100),
                        "referenceTextTokenCoveragePercent": round(len(tree & tokens) / len(tree) * 100, 2) if tree else None,
                        "runResults": run_results,
                    })
            state_sources.append(source_result)
        if not state_sources:
            missing.append(state["id"])
        state_results.append({"id": state["id"], "renderer": state["renderer"], "sources": state_sources})

    all_runs = sum(count for (_, _), count in availability.items())
    available_runs = sum(count for (_, available), count in availability.items() if available)
    report = {
        "schemaVersion": 2,
        "canonicalStates": len(coverage["states"]),
        "measuredStates": sum(bool(item["sources"]) for item in state_results),
        "authoritativeRasterMeasurements": len(raster_results),
        "crossHostMeasurements": len(parity_results),
        "crossHostStyleParityPercent": rounded_mean([item["matchPercent"] for item in parity_results]),
        "primaryFaceAvailabilityPercent": round(available_runs / max(all_runs, 1) * 100, 2),
        "meanStructuralMatchPercent": rounded_mean([item["structuralMatchPercent"] for item in raster_results if item["structuralMatchPercent"] is not None]),
        "meanColorMatchPercent": rounded_mean([item["colorMatchPercent"] for item in raster_results if item["colorMatchPercent"] is not None]),
        "textColorPresencePercent": rounded_mean([item["foregroundColorPresencePercent"] for item in raster_results if item["foregroundColorPresencePercent"] is not None]),
        "backgroundColorPresencePercent": rounded_mean([item["backgroundColorPresencePercent"] for item in raster_results if item["backgroundColorPresencePercent"] is not None]),
        "fontAvailability": [{"font": font, "available": available, "runs": count} for (font, available), count in sorted(availability.items())],
        "missing": sorted(set(missing)),
        "states": state_results,
        "crossHost": parity_results,
        "raster": raster_results,
    }
    quality_failures = []
    if report["measuredStates"] != report["canonicalStates"]:
        quality_failures.append("canonical typography coverage is incomplete")
    if report["crossHostStyleParityPercent"] < 100:
        quality_failures.append("Windows/Android computed typography styles are not identical")
    if report["primaryFaceAvailabilityPercent"] < 100:
        quality_failures.append("a primary typography face is unavailable")
    system_font_runs = sum(item["runs"] for item in report["fontAvailability"] if item["font"] not in bundled_families)
    if system_font_runs:
        quality_failures.append(f"{system_font_runs} text runs still depend on a system font")
    if report["meanStructuralMatchPercent"] < 95:
        quality_failures.append("mean authoritative text-mask structure is below 95%")
    report["qualityGate"] = {
        "passed": not quality_failures,
        "minimumMeanStructuralMatchPercent": 95,
        "requiredCrossHostStyleParityPercent": 100,
        "requiredPrimaryFaceAvailabilityPercent": 100,
        "requiredSystemFontRuns": 0,
        "failures": quality_failures,
    }
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    summary_keys = ("canonicalStates", "measuredStates", "authoritativeRasterMeasurements", "crossHostMeasurements", "crossHostStyleParityPercent", "primaryFaceAvailabilityPercent", "meanStructuralMatchPercent", "meanColorMatchPercent", "textColorPresencePercent", "backgroundColorPresencePercent")
    print(json.dumps({key: report[key] for key in summary_keys}, indent=2))
    return 1 if report["missing"] or quality_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
