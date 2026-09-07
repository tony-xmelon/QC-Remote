"""Account for every message type Cortex Control declares.

The schema is verified field for field elsewhere. This covers the other axis:
of the 72 real `CortexMessageType` values, which ones this stack actually
speaks, and - for the ones it does not - whether there is a reviewed reason
rather than an oversight.

A type must be either exercised (encoded or decoded here, or seen on the wire
during a hardware conformance run) or listed in
`references/cortex-protocol/message-type-plan.json` with a category. Anything
else fails, so a type discovered in a future Cortex Control cannot sit
unexamined, and a gap cannot quietly become permanent.

Usage:
  python tools/verify_cortex_protocol_message_types.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
COVERAGE = REPOSITORY_ROOT / "references/cortex-protocol/coverage.json"
PLAN = REPOSITORY_ROOT / "references/cortex-protocol/message-type-plan.json"


def main() -> int:
    if not COVERAGE.is_file():
        print(f"missing {COVERAGE}; run tools/extract-cortex-protocol.py", file=sys.stderr)
        return 2
    coverage = json.loads(COVERAGE.read_text(encoding="utf-8"))
    plan = json.loads(PLAN.read_text(encoding="utf-8"))

    categories = set(plan["categories"])
    excused = {entry["number"]: entry for entry in plan["types"]}
    problems: list[str] = []

    exercised = set()
    for row in coverage["rows"]:
        if row["implemented"] or row["sentOnWire"] or row["receivedOnWire"]:
            exercised.add(row["number"])

    for row in coverage["rows"]:
        number, name = row["number"], row["name"]
        if number in exercised:
            if number in excused:
                problems.append(
                    f"{number} {name}: exercised by this stack but still listed as a "
                    f"gap in message-type-plan.json; remove it from the plan")
            continue
        entry = excused.get(number)
        if entry is None:
            problems.append(f"{number} {name}: neither exercised nor explained; "
                            f"add it to message-type-plan.json or implement it")
            continue
        if entry["name"] != name:
            problems.append(f"{number}: the plan calls it {entry['name']!r}, "
                            f"the binary calls it {name!r}")
        if entry.get("category") not in categories:
            problems.append(f"{number} {name}: category "
                            f"{entry.get('category')!r} is not one of {sorted(categories)}")

    known = {row["number"] for row in coverage["rows"]}
    for number in sorted(set(excused) - known):
        problems.append(f"{number} {excused[number]['name']}: explained in the plan but "
                        f"the binary no longer declares it")

    for problem in problems:
        print(f"FAIL {problem}")
    if problems:
        return 1

    counts: dict[str, int] = {}
    for number, entry in excused.items():
        counts[entry["category"]] = counts.get(entry["category"], 0) + 1
    breakdown = ", ".join(f"{category}={count}" for category, count in sorted(counts.items()))
    print(f"PASS {len(exercised)} of {len(coverage['rows'])} message types are exercised; "
          f"the remaining {len(excused)} each carry a reviewed reason ({breakdown})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
