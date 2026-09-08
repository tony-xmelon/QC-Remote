"""Create a conservative, reproducible inventory of Cortex Control internals.

This tool does not decompile code or copy embedded content.  It records a
small allow-listed set of behavior-bearing strings, relevant MSVC RTTI class
names/method names, and PE import counts.  Protocol schemas and the USB state
machine are extracted by the companion extract-cortex-protocol.py and
extract-cortex-control-behavior.py tools.

Usage:
  python tools/extract-cortex-control-inventory.py [--exe PATH]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

import pefile


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXE = Path(r"C:\Program Files\Neural DSP\Cortex Control\Cortex Control.exe")
OUTPUT = ROOT / "artifacts/cortex-protocol" / "binary-inventory.json"

# Exact strings are intentionally allow-listed.  In particular, arbitrary
# URLs, headers, tokens, user data, and embedded factory-library content are
# not emitted into the report.
INDICATORS = {
    "version": "4.1.0",
    "futureCompatibilityVersion": "4.2.0",
    "internetSocketProbe": "8.8.8.8",
    "windowsAdapterProbe": (
        'powershell -NoProfile -NonInteractive -Command "Get-NetAdapter | '
        "Where-Object { $_.Status -eq 'Up' -and $_.InterfaceDescription "
        "-notmatch 'Bluetooth' -and $_.InterfaceDescription -notmatch "
        "'Loopback' } | Measure-Object | ForEach-Object {Write-Output $_.Count}\""
    ),
    "encryptionManager": "ZencryptionManager",
    "encryptionHelper": "ZencryptionHelper",
    "hidLogger": "HidLogger",
    "protobufLogger": "ProtobufLogger",
    "deviceReportStream": "DeviceReportStream",
    "deviceReportLogger": "DeviceReportLogger",
    "localBackupLoader": "LocalBackupLoaderThread",
    "backupTooNewFlow": "showLocalBackupTooNewModal",
    "remoteControl": "RemoteControl",
    "diagnostics": "DiagnosticsMessage",
    "productionMode": "ProductionAutomationMode",
}

RELEVANT_WORDS = (
    "Backup",
    "Forward",
    "RemoteControl",
    "Diagnostics",
    "Report",
    "Logger",
    "Zencryption",
    "Updater",
    "Production",
    "TestFarm",
    "Calibration",
    "Serialization",
)


def printable_ascii(data: bytes):
    for match in re.finditer(rb"[\x20-\x7e]{4,}", data):
        yield match.start(), match.group().decode("ascii")


def first_offset(data: bytes, value: str) -> str | None:
    offset = data.find(value.encode("ascii"))
    return None if offset < 0 else f"0x{offset:x}"


def relevant_rtti(strings: list[tuple[int, str]]) -> tuple[list[dict], list[dict]]:
    classes: dict[str, int] = {}
    methods: dict[str, int] = {}
    class_pattern = re.compile(
        r"\.\?AV([A-Za-z0-9_]+)@(usb|common)@cortex@neural@@"
    )
    method_pattern = re.compile(
        r"\?\?([A-Za-z0-9_]+)@([A-Za-z0-9_]+)@(?:usb|common)@cortex@neural@@"
    )
    for offset, value in strings:
        if not any(word.lower() in value.lower() for word in RELEVANT_WORDS):
            continue
        for match in class_pattern.finditer(value):
            name = match.group(1)
            classes.setdefault(name, offset + match.start())
        for match in method_pattern.finditer(value):
            name = f"{match.group(2)}.{match.group(1)}"
            methods.setdefault(name, offset + match.start())
    return (
        [{"name": name, "offset": f"0x{offset:x}"} for name, offset in sorted(classes.items())],
        [{"name": name, "offset": f"0x{offset:x}"} for name, offset in sorted(methods.items())],
    )


def imports(pe: pefile.PE) -> dict[str, int]:
    pe.parse_data_directories(
        directories=[pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_IMPORT"]]
    )
    counts = Counter()
    for entry in getattr(pe, "DIRECTORY_ENTRY_IMPORT", []):
        counts[entry.dll.decode("ascii", errors="replace")] += len(entry.imports)
    return dict(sorted(counts.items(), key=lambda item: item[0].lower()))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path, default=DEFAULT_EXE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    if not args.exe.is_file():
        print(f"Cortex Control not found at {args.exe}", file=sys.stderr)
        return 2

    data = args.exe.read_bytes()
    strings = list(printable_ascii(data))
    classes, methods = relevant_rtti(strings)
    report = {
        "binary": {
            "path": str(args.exe),
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest().upper(),
        },
        "method": "allow-listed printable strings + MSVC RTTI names + PE imports",
        "privacyBoundary": (
            "No arbitrary URLs, request headers, credentials, user data, or embedded "
            "factory-library content are copied into this report."
        ),
        "indicators": {
            key: {"value": value, "firstOffset": first_offset(data, value)}
            for key, value in INDICATORS.items()
        },
        "relevantRttiClasses": classes,
        "relevantRttiMethods": methods,
        "importsByLibrary": imports(pefile.PE(data=data, fast_load=True)),
        "confidence": {
            "directEvidence": [
                "binary identity",
                "exact allow-listed strings and first offsets",
                "retained RTTI class and method names",
                "PE imported-library symbol counts",
            ],
            "notEstablishedByThisTool": [
                "call order or control flow",
                "wire framing or encryption algorithm",
                "whether firmware enables a discovered feature",
                "endpoint semantics or authentication",
            ],
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.output}")
    print(f"relevant RTTI: {len(classes)} classes, {len(methods)} methods")
    return 0


if __name__ == "__main__":
    sys.exit(main())
