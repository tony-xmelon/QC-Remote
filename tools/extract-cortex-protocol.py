"""Extract the CorOS wire schema from the installed Cortex Control binary.

Interoperability extraction. Neural DSP ships the serialized protobuf
descriptors inside Cortex Control; they are the schema the Quad Cortex speaks,
and an independent controller needs them to talk to a device its owner already
has. Nothing here is copied into the product: the descriptors are compared with
the protos this repository already carries, so schema drift is visible rather
than silently absorbed.

Writes to references/cortex-protocol/:
  ProductionAutomation.desc, Preset.desc   the serialized FileDescriptorProto
  extraction.json                          where each blob was found
  message-types.json                       the CortexMessageType table
  coverage.json                            each type against this stack

Usage:
  python tools/extract-cortex-protocol.py [--exe PATH] [--evidence PATH]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from google.protobuf import descriptor_pb2

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXE = Path(r"C:\Program Files\Neural DSP\Cortex Control\Cortex Control.exe")
DEFAULT_EVIDENCE = REPOSITORY_ROOT / "artifacts/hardware-conformance/windows.json"
# Tracked, not an artifact: the release preflight verifies against these,
# so a clean checkout has to carry them.
OUTPUT = REPOSITORY_ROOT / "references/cortex-protocol"

# FileDescriptorProto: field number -> the wire type it must use. Fields 10 and
# 11 are repeated int32 and may arrive packed or unpacked, so they accept both.
FILE_FIELDS = {1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2,
               10: None, 11: None, 12: 2, 13: 2}

# Every source that can name a message type, including the ones that hand-encode
# a payload as raw bytes and so never mention its generated Rust name.
SCANNED_SOURCES = [
    "packages/rust/qc-protocol/src/commands.rs",
    "packages/rust/qc-protocol/src/state.rs",
    "packages/rust/qc-protocol/src/responses.rs",
    "packages/rust/qc-protocol/src/profile.rs",
    "packages/rust/qc-protocol/src/wire.rs",
    "packages/rust/qc-device-runtime/src/transport.rs",
    "packages/rust/qc-device-runtime/src/request.rs",
    "services/device-broker/src/worker.rs",
    "services/device-broker/src/rpc.rs",
]


def varint(data: bytes, index: int) -> tuple[int, int]:
    value = shift = 0
    while index < len(data):
        byte = data[index]
        value |= (byte & 0x7F) << shift
        index += 1
        if not byte & 0x80:
            return value, index
        shift += 7
        if shift > 63:
            raise ValueError("varint too long")
    raise ValueError("truncated varint")


def blob_end(data: bytes, start: int) -> int:
    """The descriptor has no length prefix, so walk fields until one is invalid.

    A truncated prefix does not parse, so a growing window never gets a
    foothold; the field walk finds the real end in one pass.
    """
    index = start
    while index < len(data):
        try:
            tag, after = varint(data, index)
        except ValueError:
            break
        field, wire = tag >> 3, tag & 7
        if field not in FILE_FIELDS:
            break
        expected = FILE_FIELDS[field]
        if expected is not None and wire != expected:
            break
        if wire == 2:
            try:
                length, payload = varint(data, after)
            except ValueError:
                break
            if payload + length > len(data):
                break
            index = payload + length
        elif wire == 0:
            try:
                _, index = varint(data, after)
            except ValueError:
                break
        else:
            break
    return index


def extract(data: bytes, name: bytes):
    for match in re.finditer(re.escape(name), data):
        header = match.start() - 2
        if header < 0 or data[header] != 0x0A or data[header + 1] != len(name):
            continue
        blob = data[header:blob_end(data, header)]
        proto = descriptor_pb2.FileDescriptorProto()
        try:
            consumed = proto.MergeFromString(blob)
        except Exception:  # noqa: BLE001 - a false positive is not fatal
            continue
        if consumed == len(blob) and proto.name == name.decode():
            return header, blob, proto
    return None


def repo_message_names(path: Path) -> set[str]:
    return set(re.findall(r"^message\s+([A-Za-z0-9_]+)\s*\{",
                          path.read_text(encoding="utf-8"), re.MULTILINE))


def nested_names(messages, prefix=""):
    for message in messages:
        yield f"{prefix}{message.name}"
        yield from nested_names(message.nested_type, f"{prefix}{message.name}.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path, default=DEFAULT_EXE)
    parser.add_argument("--evidence", type=Path, default=DEFAULT_EVIDENCE,
                        help="hardware conformance report, for observed wire types")
    args = parser.parse_args()

    if not args.exe.is_file():
        print(f"Cortex Control not found at {args.exe}", file=sys.stderr)
        return 2

    data = args.exe.read_bytes()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    summary = {"binary": str(args.exe), "bytes": len(data), "files": []}
    descriptors = {}

    for name, repo_proto in ((b"ProductionAutomation.proto", "ProductionAutomation.proto"),
                             (b"Preset.proto", "Preset.proto")):
        found = extract(data, name)
        if not found:
            print(f"{name.decode()}: no parsable descriptor found", file=sys.stderr)
            continue
        offset, blob, proto = found
        stem = name.decode().removesuffix(".proto")
        descriptors[stem] = proto
        (OUTPUT / f"{stem}.desc").write_bytes(blob)

        repo_path = REPOSITORY_ROOT / "packages/rust/qc-protocol/proto" / repo_proto
        mine = repo_message_names(repo_path) if repo_path.is_file() else set()
        top = {message.name for message in proto.message_type}
        nested = set(nested_names(proto.message_type))
        summary["files"].append({
            "name": proto.name,
            "package": proto.package,
            "offset": f"0x{offset:x}",
            "bytes": len(blob),
            "syntax": proto.syntax or "proto2",
            "messages": len(top),
            "repoMessages": len(mine),
            "inBinaryNotInRepo": sorted(top - mine),
            "inRepoNotInBinary": sorted(mine - nested),
        })
        print(f"{proto.name}: package={proto.package or '(none)'} at 0x{offset:x} "
              f"({len(blob):,} bytes, {len(top)} messages, syntax={proto.syntax or 'proto2'})")
        print(f"  vs repo: {len(mine)} messages, "
              f"missing here {sorted(top - mine) or 'none'}, "
              f"extra here {sorted(mine - nested) or 'none'}")

    (OUTPUT / "extraction.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    automation = descriptors.get("ProductionAutomation")
    if not automation:
        return 1

    types = {}
    for message in automation.message_type:
        if message.name == "CortexMessageType":
            for enum in message.enum_type:
                types = {value.number: value.name for value in enum.value}
    (OUTPUT / "message-types.json").write_text(
        json.dumps({str(k): v for k, v in sorted(types.items())}, indent=2) + "\n", encoding="utf-8")
    print(f"\nCortexMessageType: {len(types)} values")

    rust = "\n".join((REPOSITORY_ROOT / path).read_text(encoding="utf-8")
                     for path in SCANNED_SOURCES
                     if (REPOSITORY_ROOT / path).is_file())
    known = {int(n) for n in re.findall(r"OutboundMessage::encoded\(\s*(\d+)", rust)}
    known |= {int(n) for n in re.findall(r"message_type:\s*(\d+)", rust)}
    known |= {int(n) for n in re.findall(r"decode::<pa::[A-Za-z0-9_]+>\(\s*(\d+)", rust)}
    known |= {int(n) for n in re.findall(r"message\.message_type\s*==\s*(\d+)", rust)}
    known |= {int(n) for n in re.findall(r"response_type:\s*(\d+)", rust)}
    known |= {int(n) for n in re.findall(r"MESSAGE_TYPE_[A-Z_]+:\s*u16\s*=\s*(\d+)", rust)}
    for block in re.findall(r"REQUEST_ID_FIELD_ONE_TYPES[^=]*=\s*\[([0-9,\s]+)\]", rust):
        known |= {int(n) for n in re.findall(r"\d+", block)}

    registry = REPOSITORY_ROOT / "packages/rust/qc-protocol/src/message_registry.rs"
    decodable: set[int] = set()
    if registry.is_file():
        decodable = {int(number) for number in re.findall(
            r"^\s{8}(\d+) => pa::", registry.read_text(encoding="utf-8"), re.MULTILINE)}

    sent, received = set(), set()
    if args.evidence.is_file():
        report = json.loads(args.evidence.read_text(encoding="utf-8"))
        for entry in report.get("transportHealth", []):
            sent |= {int(key) for key in (entry.get("messagesSentByType") or {})}
            received |= {int(key) for key in (entry.get("messagesReceivedByType") or {})}

    rows = [{
        "number": number,
        "name": name,
        "decodable": number in decodable,
        "implemented": number in known,
        "sentOnWire": number in sent,
        "receivedOnWire": number in received,
    } for number, name in sorted(types.items())
        if name not in ("Undefined", "NumberOfMessageTypes")]

    covered = [row for row in rows if row["implemented"] or row["sentOnWire"] or row["receivedOnWire"]]
    observed = [row for row in rows if row["sentOnWire"] or row["receivedOnWire"]]
    undecodable = [row for row in rows if not row["decodable"]]
    (OUTPUT / "coverage.json").write_text(json.dumps({
        "messageTypes": len(rows),
        "decodable": len(rows) - len(undecodable),
        "observedOnWire": len(observed),
        "implementedOrObserved": len(covered),
        "evidence": str(args.evidence) if args.evidence.is_file() else None,
        "rows": rows,
    }, indent=2) + "\n", encoding="utf-8")

    print(f"decodable by the protocol layer: {len(rows) - len(undecodable)} of {len(rows)}")
    if undecodable:
        print("NOT decodable: " + ", ".join(f"{row['number']} {row['name']}"
                                            for row in undecodable))
    print(f"observed on the wire: {len(observed)} | driven by the application: {len(covered)} of {len(rows)}")
    print("not driven: " + ", ".join(f"{row['number']} {row['name']}"
                                     for row in rows if row not in covered))
    print(f"\nwrote {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
