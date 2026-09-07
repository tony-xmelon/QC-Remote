"""Parse live device traffic with the schema extracted from Cortex Control.

The descriptor comparison proves our .proto files match the ones Cortex Control
ships. It cannot prove those descriptors describe what the Quad Cortex actually
puts on the wire - only the device can say that.

This listens to a connected unit, keeps the raw payload of every message it
pushes, and parses each one against a descriptor pool built from
`references/cortex-protocol/*.desc`. Two things are then reportable:

  * a payload that fails to parse - the schema is wrong about a field's type
  * a payload that parses but leaves unknown fields - the device sends
    something the shipped schema does not declare, i.e. our copy is older than
    the firmware

Both are real findings. Silence across a busy session is the evidence that the
extracted schema is the one the device speaks.

Usage:
  python tools/verify_cortex_schema_against_device.py [--seconds 30]
"""

from __future__ import annotations

import argparse
import gzip
import sys
import time
from collections import Counter
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "services" / "device-gateway" / "src"))

from google.protobuf import descriptor_pb2, descriptor_pool, message_factory  # noqa: E402

DESCRIPTORS = REPOSITORY_ROOT / "references/cortex-protocol"

# Their trailer flags a non-protobuf body, so parsing them as protobuf is
# meaningless rather than a schema failure. Cortex Control treats them the same
# way; see the "raw payload" note in docs/CORTEX_PROTOCOL.md.
NOT_PROTOBUF = {18: "CloudLogin", 58: "License"}

GZIP_MAGIC = bytes((0x1F, 0x8B))


def build_pool() -> tuple[descriptor_pool.DescriptorPool, dict[str, type]]:
    pool = descriptor_pool.DescriptorPool()
    # Preset.proto first: ProductionAutomation.proto imports it.
    for stem in ("Preset", "ProductionAutomation"):
        proto = descriptor_pb2.FileDescriptorProto()
        proto.ParseFromString((DESCRIPTORS / f"{stem}.desc").read_bytes())
        pool.Add(proto)
    classes: dict[str, type] = {}
    for stem in ("Preset", "ProductionAutomation"):
        file_descriptor = pool.FindFileByName(f"{stem}.proto")
        for name, descriptor in file_descriptor.message_types_by_name.items():
            classes[name] = message_factory.GetMessageClass(descriptor)
    return pool, classes


def varint(data: bytes, index: int) -> tuple[int, int]:
    value = shift = 0
    while index < len(data):
        byte = data[index]
        value |= (byte & 0x7F) << shift
        index += 1
        if not byte & 0x80:
            return value, index
        shift += 7
    raise ValueError("truncated varint")


def top_level_fields(payload: bytes) -> set[int]:
    """Field numbers present at the top level of a payload, schema-free."""
    numbers: set[int] = set()
    index = 0
    while index < len(payload):
        tag, index = varint(payload, index)
        number, wire = tag >> 3, tag & 7
        numbers.add(number)
        if wire == 0:
            _, index = varint(payload, index)
        elif wire == 2:
            length, index = varint(payload, index)
            index += length
        elif wire == 5:
            index += 4
        elif wire == 1:
            index += 8
        else:
            raise ValueError(f"unsupported wire type {wire}")
    return numbers


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seconds", type=float, default=30.0)
    arguments = parser.parse_args()

    _, classes = build_pool()

    import pyquadcortex
    from pyquadcortex import framing, registry, transport

    # pyquadcortex maps a type number to its own generated class; only its
    # *name* is borrowed, so every payload is parsed with the schema lifted out
    # of Cortex Control rather than with pyquadcortex's copy.
    names: dict[int, str] = {}
    for number, message_class in registry._BY_TYPE.items():
        names[number] = message_class.DESCRIPTOR.name

    seen: list[tuple[int, bytes]] = []
    original = transport.Transport._handle_message

    def spy(self, reports):
        try:
            message_type, payload = framing.decode_reports(reports)
            seen.append((message_type, bytes(payload)))
        except Exception:  # noqa: BLE001 - never break the read thread
            pass
        return original(self, reports)

    transport.Transport._handle_message = spy

    qc = pyquadcortex.connect()
    print(f"connected; listening for {arguments.seconds:.0f}s", flush=True)
    # Ask for a spread of state so the sample is not just idle chatter.
    for probe in ("device_identity", "global_eq", "io_settings", "tempo", "modes"):
        try:
            getattr(qc, probe)
        except Exception:  # noqa: BLE001 - a missing accessor is not the point
            pass
    time.sleep(arguments.seconds)

    counts: Counter[str] = Counter()
    failures: list[str] = []
    unknown: list[str] = []
    checked = 0

    for message_type, payload in seen:
        if message_type in NOT_PROTOBUF:
            counts[f"{message_type} {NOT_PROTOBUF[message_type]} (raw body, not protobuf)"] += 1
            continue
        name = names.get(message_type)
        message_class = classes.get(name) if name else None
        if message_class is None:
            counts[f"{message_type} (no name for this type)"] += 1
            continue
        counts[f"{message_type} {name}"] += 1
        # The device gzips some frames whole - a full BinaryPreset push, a
        # library listing. The transport inflates before parsing and so must
        # this.
        if payload[:2] == GZIP_MAGIC:
            try:
                payload = gzip.decompress(payload)
            except OSError as error:
                failures.append(f"{message_type} {name}: gzip body would not inflate ({error})")
                continue
        instance = message_class()
        try:
            instance.ParseFromString(payload)
        except Exception as error:  # noqa: BLE001 - the report is the point
            failures.append(f"{message_type} {name}: {error} [{payload[:48].hex()}]")
            continue
        checked += 1
        # This protobuf build has no unknown-field accessor, so the payload's
        # own top-level tags are walked and compared with what the descriptor
        # declares. Nested messages are not descended into; a top-level gap is
        # what a firmware newer than the extracted schema shows first.
        declared = {field.number for field in message_class.DESCRIPTOR.fields}
        for number in top_level_fields(payload):
            if number not in declared:
                unknown.append(f"{message_type} {name}: undeclared field {number}")

    print(f"\nobserved {len(seen)} message(s) across {len(counts)} type(s):")
    for label, count in sorted(counts.items(), key=lambda item: -item[1]):
        print(f"  {count:5d}  {label}")

    for failure in failures:
        print(f"FAIL parse: {failure}")
    for entry in sorted(set(unknown)):
        print(f"FAIL undeclared: {entry}")

    if failures or unknown:
        print(f"\n{len(failures)} parse failure(s), {len(set(unknown))} type(s) with "
              f"fields the extracted schema does not declare")
        return 1
    print(f"\nPASS {checked} payload(s) parsed cleanly against the schema extracted "
          f"from Cortex Control, with no undeclared fields")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
