"""Summarize a local Cortex Control HID trace without dumping private values.

The trace is the raw concatenation of 129-byte HID output reports captured by
`tools/capture_cortex_hid_writes.py`. This reassembles them into protobuf
messages, names each one from `CortexMessageType`, and prints them in wire
order so a capture can be read against the UI actions that produced it.

Long strings and known-private fields are replaced with a digest, so a trace
summary can be pasted into notes without leaking account data or preset blobs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

from google.protobuf.json_format import MessageToDict
from google.protobuf.message import DecodeError
from pyquadcortex import framing, registry
from pyquadcortex.proto import ProductionAutomation_pb2 as pa


REPORT_BYTES = 129
PRIVATE_KEYS = {"author_id", "author_username", "token", "access_token", "email"}


def clean(value):
    if isinstance(value, dict):
        return {
            key: "<redacted>" if key.casefold() in PRIVATE_KEYS else clean(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [clean(item) for item in value]
    if isinstance(value, str) and len(value) > 256:
        return {
            "chars": len(value),
            "sha256": hashlib.sha256(value.encode("utf-8")).hexdigest(),
            "prefix": value[:64],
        }
    return value


def messages_from(data: bytes):
    pending: list[bytes] = []
    for offset in range(0, len(data) - (len(data) % REPORT_BYTES), REPORT_BYTES):
        report = data[offset : offset + REPORT_BYTES]
        if report[2] & framing.FLAG_FIRST:
            pending = []
        pending.append(report)
        if framing.is_complete(pending):
            yield framing.decode_reports(pending)
            pending = []


def type_name(message_type: int) -> str:
    try:
        return pa.CortexMessageType.Enum.Name(message_type)
    except ValueError:
        return f"Unknown({message_type})"


def describe(message_type: int, payload: bytes) -> str:
    try:
        message = registry.class_for(message_type)()
        message.ParseFromString(payload)
    except (KeyError, ValueError, DecodeError) as error:
        return f"<undecoded: {error}> hex={payload[:64].hex()}"
    return json.dumps(clean(MessageToDict(message, preserving_proto_field_name=True)))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("trace", type=Path)
    parser.add_argument("--keepalive", action="store_true",
                        help="print each KeepAlive instead of collapsing runs")
    parser.add_argument("--width", type=int, default=600,
                        help="truncate each decoded message to this many characters")
    args = parser.parse_args()

    counts: Counter[str] = Counter()
    collapsed = 0
    for message_type, payload in messages_from(args.trace.read_bytes()):
        name = type_name(message_type)
        counts[name] += 1
        if name == "KeepAlive" and not args.keepalive:
            collapsed += 1
            continue
        if collapsed:
            print(f"      ... {collapsed} x KeepAlive")
            collapsed = 0
        body = describe(message_type, payload)
        print(f"{message_type:4d} {name:<28} {len(payload):5d}B {body[: args.width]}")
    if collapsed:
        print(f"      ... {collapsed} x KeepAlive")

    print()
    print("totals:", json.dumps(dict(counts.most_common())))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
