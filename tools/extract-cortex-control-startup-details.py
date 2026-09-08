"""Reproduce Cortex Control 4.1.0 startup payload/timer evidence.

This complements extract-cortex-control-behavior.py.  It records the complete
machine-code bodies which build state-entry messages, extracts scalar constants
from those bodies, and inventories controller timer call sites.  The Markdown
report keeps mechanically extracted facts separate from protobuf-level review.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import sys
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXE = Path(r"C:\Program Files\Neural DSP\Cortex Control\Cortex Control.exe")
OUTPUT = ROOT / "artifacts" / "cortex-protocol"


def load_behavior_module():
    path = ROOT / "tools" / "extract-cortex-control-behavior.py"
    spec = importlib.util.spec_from_file_location("cortex_behavior", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


# Payloads whose exact bytes follow from the recovered constructor call order,
# scalar setter evidence, and the embedded protobuf descriptors. Dynamic reset
# values are represented symbolically.
ENTRY_PAYLOADS = {
    "DeviceSessionValidatingState": [(52, "08 <request-id> 12 <session-id>")],
    "DeviceVersionValidatingState": [(10, "0803")],
    "DeviceDisconnectedState": [(26, "0802 10 <request-id>"), (49, "1000")],
    "DeviceBuildingState": [(49, "1001"), (51, "0803")],
    "DeviceInitializingState": [(35, "0803")],
    "DeviceBootingState": [
        (26, "10 <request-id>"), (58, "0803"), (21, "0803"), (3, "0803"),
        (9, "0803"), (24, "0803"), (14, "0803"), (38, "0803"),
        (17, "0803"), (4, "0803 30 <runtime-bool>"), (71, "0803"),
        (46, "0803 4200"),
        (20, "0803"), (20, "08031801"), (42, "0803"), (15, "0803"),
        (50, "0803"), (54, "0803"), (19, "0803"), (33, "0803"),
        (2, "0803"), (34, "0803"), (13, "0803"), (57, "0803"),
        (60, "0803"),
    ],
}

CONTROLLER_TYPES = (
    ".?AVDeviceStateController@common@cortex@neural@@",
    ".?AVConnectionStateController@common@cortex@neural@@",
)
SUPPORT_FUNCTIONS = (0x141AAE390,)


def instruction_record(instruction):
    immediates = [
        int(value, 0)
        for value in re.findall(r"(?:^|, |\+ |\- )(0x[0-9a-f]+|\d+)(?:$|,)", instruction.op_str)
    ]
    return {
        "address": f"0x{instruction.address:x}",
        "mnemonic": instruction.mnemonic,
        "operands": instruction.op_str,
        "immediates": immediates,
    }


def locate_vtable_for_type(binary, decorated_name: str) -> int:
    string_offset = binary.data.find(decorated_name.encode() + b"\0")
    if string_offset < 16:
        raise RuntimeError(f"RTTI type not found: {decorated_name}")
    type_rva = binary.offset_to_rva(string_offset - 16)
    for match in re.finditer(re.escape(struct.pack("<I", type_rva)), binary.data):
        offset = match.start() - 12
        if offset < 0:
            continue
        signature, _, _, pointer_to_type, _, pointer_to_self = struct.unpack_from(
            "<6I", binary.data, offset
        )
        try:
            locator_rva = binary.offset_to_rva(offset)
        except Exception:
            continue
        if signature == 1 and pointer_to_type == type_rva and pointer_to_self == locator_rva:
            reference = binary.data.find(struct.pack("<Q", binary.base + locator_rva))
            if reference >= 0:
                return binary.base + binary.offset_to_rva(reference + 8)
    raise RuntimeError(f"vtable not found: {decorated_name}")


def controller_candidates(binary):
    text = next(section for section in binary.pe.sections if section.Name.rstrip(b"\0") == b".text")
    low = binary.base + text.VirtualAddress
    high = low + text.Misc_VirtualSize
    controllers = []
    for decorated_name in CONTROLLER_TYPES:
        vtable = locate_vtable_for_type(binary, decorated_name)
        functions = []
        for slot in range(40):
            address = binary.qwords(vtable + slot * 8, 1)[0]
            if not low <= address < high:
                break
            function = binary.function_at(address) or binary.leaf_function(address, starts_here=True)
            instructions = [instruction_record(item) for item in binary.instructions(function)]
            timing_immediates = sorted({
                value
                for item in instructions
                for value in item["immediates"]
                if 10 <= value <= 300_000
            })
            functions.append({
                "slot": slot,
                "address": f"0x{address:x}",
                "timingCandidateImmediates": timing_immediates,
                "instructions": instructions,
            })
        controllers.append({
            "type": decorated_name,
            "vtable": f"0x{vtable:x}",
            "virtualFunctions": functions,
        })
    return controllers


def direct_callers(binary, target: int):
    text = next(section for section in binary.pe.sections if section.Name.rstrip(b"\0") == b".text")
    raw = binary.data[text.PointerToRawData:text.PointerToRawData + text.SizeOfRawData]
    text_va = binary.base + text.VirtualAddress
    callers = {}
    for match in re.finditer(b"\xe8", raw):
        offset = match.start()
        if offset + 5 > len(raw):
            continue
        call_va = text_va + offset
        destination = call_va + 5 + struct.unpack_from("<i", raw, offset + 1)[0]
        if destination != target:
            continue
        function = binary.function_at(call_va)
        if function is None:
            continue
        callers[function.start] = function
    result = []
    for function in callers.values():
        instructions = [instruction_record(item) for item in binary.instructions(function)]
        result.append({
            "address": f"0x{function.start:x}",
            "end": f"0x{function.end:x}",
            "timingCandidateImmediates": sorted({
                value for item in instructions for value in item["immediates"]
                if 10 <= value <= 300_000
            }),
            "instructions": instructions,
        })
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path, default=DEFAULT_EXE)
    args = parser.parse_args()
    behavior = load_behavior_module()
    binary = behavior.Binary(args.exe)
    states = []
    constructors = {}
    for class_name in behavior.STATE_CLASSES:
        vtable = behavior.locate_vtable(binary, class_name)
        constructor, _, _ = behavior.find_constructor(binary, vtable)
        constructors[class_name] = constructor.start
        entries = behavior.entry_messages(binary, constructor)
        functions = []
        for address in dict.fromkeys(int(entry["function"], 16) for entry in entries):
            function = binary.function_at(address) or binary.leaf_function(address, starts_here=True)
            instructions = [instruction_record(item) for item in binary.instructions(function)]
            functions.append({
                "address": f"0x{function.start:x}",
                "end": f"0x{function.end:x}",
                "instructions": instructions,
            })
        expected = ENTRY_PAYLOADS.get(class_name, [])
        actual_types = [entry["messageType"] for entry in entries]
        if [message_type for message_type, _ in expected] != actual_types:
            raise RuntimeError(f"reviewed payload table is stale for {class_name}")
        states.append({
            "state": class_name,
            "entryMessages": [
                {"messageType": message_type, "payloadHex": payload}
                for message_type, payload in expected
            ],
            "builderFunctions": functions,
        })

    report = {
        "binary": {
            "path": str(args.exe),
            "sha256": hashlib.sha256(binary.data).hexdigest().upper(),
        },
        "evidence": {
            "mechanicallyExtracted": [
                "state entry message order",
                "entry builder function bounds and complete disassembly",
                "scalar constants and protobuf envelope type assignments",
            ],
            "reviewedAgainstEmbeddedDescriptors": [
                "exact protobuf payload bytes",
                "dynamic ResetCommsBuffers field layout",
            ],
            "notRecovered": [
                "outer-controller timer durations",
                "retry counts",
                "backoff policy",
            ],
        },
        "states": states,
        "outerControllers": controller_candidates(binary),
        "stateConstructorCallers": {
            name: direct_callers(binary, address) for name, address in constructors.items()
        },
        "supportFunctions": [
            {
                "address": f"0x{address:x}",
                "instructions": [
                    instruction_record(item)
                    for item in binary.instructions(
                        binary.function_at(address)
                        or binary.leaf_function(address, starts_here=True)
                    )
                ],
            }
            for address in SUPPORT_FUNCTIONS
        ],
    }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "startup-details.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    lines = [
        "# Cortex Control startup details", "", f"SHA-256: `{report['binary']['sha256']}`", "",
        "## Exact state-entry payloads", "",
        "Payloads are reviewed against the protobuf descriptors embedded in the same binary. "
        "The JSON report retains the builder disassembly used as evidence.", "",
    ]
    for state in states:
        if not state["entryMessages"]:
            continue
        lines += [f"### {state['state']}", ""]
        for message in state["entryMessages"]:
            lines.append(f"- {message['messageType']}: `{message['payloadHex']}`")
        lines.append("")
    lines += [
        "## Timer confidence boundary", "",
        "No outer-controller retry/deadline/backoff duration is asserted by this extraction. "
        "The relevant controller callbacks are not named in the PE function table, and numeric "
        "constants near generic JUCE timer machinery cannot be attributed safely without a "
        "runtime trace. Existing runtime timeouts therefore remain implementation safety policy, "
        "not claims about Cortex Control.", "",
    ]
    (OUTPUT / "startup-details.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote startup details for {len(states)} states")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
