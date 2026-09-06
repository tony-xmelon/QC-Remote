"""Measure individual reconstructed QC glyphs against authoritative screen crops."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def parse_hex_color(value: str) -> tuple[int, int, int]:
    value = value.removeprefix("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def dominant_background(image: Image.Image) -> tuple[int, int, int]:
    pixels = np.asarray(image.convert("RGB")).reshape(-1, 3)
    colors, counts = np.unique(pixels, axis=0, return_counts=True)
    return tuple(int(part) for part in colors[counts.argmax()])


def foreground_mask(image: Image.Image, background: tuple[int, int, int], threshold: float = 24.0) -> np.ndarray:
    pixels = np.asarray(image.convert("RGB"), dtype=np.float32)
    background_pixel = np.asarray(background, dtype=np.float32)
    return np.linalg.norm(pixels - background_pixel, axis=2) >= threshold


def edge(mask: np.ndarray) -> np.ndarray:
    padded = np.pad(mask, 1, constant_values=False)
    eroded = np.ones_like(mask)
    for y in range(3):
        for x in range(3):
            eroded &= padded[y:y + mask.shape[0], x:x + mask.shape[1]]
    return mask & ~eroded


def structural_match(reference: Image.Image, renderer: Image.Image, reference_background: tuple[int, int, int], renderer_background: tuple[int, int, int]) -> float:
    reference_edge = edge(foreground_mask(reference, reference_background))
    renderer_edge = edge(foreground_mask(renderer, renderer_background))
    if not reference_edge.any() and not renderer_edge.any():
        return 1.0
    if not reference_edge.any() or not renderer_edge.any():
        return 0.0
    reference_near = np.asarray(Image.fromarray(reference_edge).filter(ImageFilter.MaxFilter(5)), dtype=bool)
    renderer_near = np.asarray(Image.fromarray(renderer_edge).filter(ImageFilter.MaxFilter(5)), dtype=bool)
    precision = float((renderer_edge & reference_near).sum() / max(renderer_edge.sum(), 1))
    recall = float((reference_edge & renderer_near).sum() / max(reference_edge.sum(), 1))
    return 2 * precision * recall / max(precision + recall, 1e-9)


def shifted(image: Image.Image, dx: int, dy: int, background: tuple[int, int, int]) -> Image.Image:
    result = Image.new("RGB", image.size, background)
    result.paste(image, (dx, dy))
    return result


def best_alignment(reference: Image.Image, renderer: Image.Image, reference_background: tuple[int, int, int], renderer_background: tuple[int, int, int]) -> dict[str, object]:
    candidates = [
        (structural_match(reference, shifted(renderer, dx, dy, renderer_background), reference_background, renderer_background), dx, dy)
        for dy in range(-3, 4)
        for dx in range(-3, 4)
    ]
    score, dx, dy = max(candidates)
    return {"dx": dx, "dy": dy, "structuralMatchPercent": round(score * 100, 2)}


def contains_exact_color(image: Image.Image, color: tuple[int, int, int]) -> bool:
    pixels = np.asarray(image.convert("RGB"))
    return bool(np.all(pixels == color, axis=2).any())


def dominant_colors(image: Image.Image, limit: int = 12) -> list[dict[str, object]]:
    counts = Counter(image.convert("RGB").get_flattened_data())
    return [
        {"color": "#" + "".join(f"{channel:02x}" for channel in color), "pixels": pixels}
        for color, pixels in counts.most_common(limit)
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path("references/qc-ui-iconography/coros-4.1.0/manifest.json"))
    parser.add_argument("--references", type=Path, default=Path("references/qc-ui-official-manual/coros-4.1.0"))
    parser.add_argument("--rendered", type=Path, default=Path(".artifacts/iconography-preview/official-rendered"))
    parser.add_argument("--corpus-references", type=Path, default=Path("references/qc-ui-corpus/coros-4.1.0"))
    parser.add_argument("--corpus-rendered", type=Path, default=Path(".artifacts/iconography-preview/corpus-rendered"))
    parser.add_argument("--app-references", type=Path, default=Path("references/qc-ui-app-golden/v1"))
    parser.add_argument("--app-rendered", type=Path, default=Path(".artifacts/iconography-preview/app-rendered"))
    parser.add_argument("--output", type=Path, default=Path(".artifacts/iconography-comparison"))
    parser.add_argument("--require-exact-colors", action="store_true")
    parser.add_argument("--write-debug-crops", action="store_true")
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    results: list[dict[str, object]] = []
    failures: list[str] = []
    for measurement in manifest["screenMeasurements"]:
        x, y, width, height = measurement["crop"]
        source_set = measurement.get("sourceSet", "official")
        reference_roots = {"official": args.references, "corpus": args.corpus_references, "app-golden": args.app_references}
        renderer_roots = {"official": args.rendered, "corpus": args.corpus_rendered, "app-golden": args.app_rendered}
        if source_set not in reference_roots:
            failures.append(f'{measurement["icon"]}: unknown source set {source_set}')
            continue
        reference_root = reference_roots[source_set]
        renderer_root = renderer_roots[source_set]
        reference_path = reference_root / f'{measurement["screen"]}.png'
        reference = Image.open(reference_path).convert("RGB").crop((x, y, x + width, y + height))
        reference_colors = {color: contains_exact_color(reference, parse_hex_color(color)) for color in measurement["expectedColors"]}
        if not all(reference_colors.values()):
            failures.append(f'{measurement["icon"]}: declared color absent from reference')
        for host in ("windows", "android"):
            renderer_path = renderer_root / host / f'{measurement["screen"]}.png'
            renderer = Image.open(renderer_path).convert("RGB").crop((x, y, x + width, y + height))
            if args.write_debug_crops:
                debug_root = args.output / "crops" / host
                debug_root.mkdir(parents=True, exist_ok=True)
                safe_name = measurement["icon"].replace(".", "-")
                reference.resize((width * 10, height * 10), Image.Resampling.NEAREST).save(debug_root / f"{safe_name}-reference.png")
                renderer.resize((width * 10, height * 10), Image.Resampling.NEAREST).save(debug_root / f"{safe_name}-renderer.png")
            renderer_colors = {color: contains_exact_color(renderer, parse_hex_color(color)) for color in measurement["expectedColors"]}
            matched_colors = sum(renderer_colors.values())
            color_match = matched_colors / max(len(renderer_colors), 1)
            reference_background = parse_hex_color(measurement["referenceBackground"])
            renderer_background = parse_hex_color(measurement["rendererBackground"])
            # Category `-tile` entries anchor the exact outline palette; the
            # corresponding glyph entry owns structural scoring for the same
            # registered variant.
            compare_structure = measurement.get("compareStructure", not measurement["icon"].endswith("-tile"))
            structure = structural_match(reference, renderer, reference_background, renderer_background) if compare_structure else None
            result = {
                "icon": measurement["icon"],
                "host": host,
                "screen": measurement["screen"],
                "sourceSet": source_set,
                "crop": measurement["crop"],
                "referenceBackground": measurement["referenceBackground"],
                "rendererBackground": measurement["rendererBackground"],
                "expectedColors": measurement["expectedColors"],
                "exactColorPresence": renderer_colors,
                "referenceDominantColors": dominant_colors(reference),
                "rendererDominantColors": dominant_colors(renderer),
                "colorMatchPercent": round(color_match * 100, 2),
                "structuralMatchPercent": round(structure * 100, 2) if structure is not None else None,
                "bestTranslation": best_alignment(reference, renderer, reference_background, renderer_background) if compare_structure else None,
            }
            results.append(result)
            if args.require_exact_colors and color_match != 1.0:
                failures.append(f'{host}/{measurement["icon"]}: exact color mismatch')

    args.output.mkdir(parents=True, exist_ok=True)
    structural_results = [item for item in results if item["structuralMatchPercent"] is not None]
    report = {
        "schemaVersion": 1,
        "measurements": len(results),
        "icons": len(manifest["screenMeasurements"]),
        "meanColorMatchPercent": round(sum(item["colorMatchPercent"] for item in results) / len(results), 2),
        "structuralMeasurements": len(structural_results),
        "meanStructuralMatchPercent": round(sum(item["structuralMatchPercent"] for item in structural_results) / len(structural_results), 2),
        "results": results,
    }
    gates = manifest["qualityGates"]
    if report["meanColorMatchPercent"] != gates["exactColorMatchPercent"]:
        failures.append(f'mean color match {report["meanColorMatchPercent"]}% is below exact gate {gates["exactColorMatchPercent"]}%')
    if report["meanStructuralMatchPercent"] < gates["minimumMeanStructuralMatchPercent"]:
        failures.append(f'mean structural match {report["meanStructuralMatchPercent"]}% is below gate {gates["minimumMeanStructuralMatchPercent"]}%')
    for item in results:
        if item["structuralMatchPercent"] is not None and item["structuralMatchPercent"] < gates["minimumIndividualStructuralMatchPercent"]:
            failures.append(f'{item["host"]}/{item["icon"]}: structural match {item["structuralMatchPercent"]}% is below gate {gates["minimumIndividualStructuralMatchPercent"]}%')
    (args.output / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("measurements", "icons", "meanColorMatchPercent", "meanStructuralMatchPercent")}, indent=2))
    if failures:
        print("\n".join(failures))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
