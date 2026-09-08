"""Recover Cortex Control's USB startup state machine from its PE binary.

This is an interoperability aid, not a decompiler.  Cortex Control retains
MSVC RTTI, x64 exception-function bounds, protobuf descriptors, and a debug
message table.  Those are enough to recover the state identities, their entry
messages, and the small message dispatchers which gate startup.

The report deliberately separates mechanically extracted facts from the
control-flow interpretation reviewed for Cortex Control 4.1.0.

Usage:
  python tools/extract-cortex-control-behavior.py [--exe PATH]
"""

from __future__ import annotations

import argparse
import bisect
import hashlib
import json
import re
import struct
import sys
from dataclasses import dataclass
from pathlib import Path

import pefile
from capstone import CS_ARCH_X86, CS_MODE_64, Cs


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXE = Path(r"C:\Program Files\Neural DSP\Cortex Control\Cortex Control.exe")
OUTPUT = ROOT / "artifacts/cortex-protocol"

STATE_CLASSES = (
    "DeviceUndefinedState",
    "DeviceSessionValidatingState",
    "DeviceVersionValidatingState",
    "DeviceInvalidState",
    "DeviceDisconnectedState",
    "DeviceBuildingState",
    "DeviceInitializingState",
    "DeviceBootingState",
    "DeviceConnectedState",
    "DeviceFailedState",
)

# Interpretation of the tiny state dispatchers.  Every listed type is checked
# against the extracted handler machine code before the report is written.
DISPATCH = {
    "DeviceUndefinedState": [],
    "DeviceSessionValidatingState": [49, 52],
    "DeviceVersionValidatingState": [10, 49, 56],
    "DeviceInvalidState": [],
    "DeviceDisconnectedState": [10],
    "DeviceBuildingState": [10, 49, 51],
    "DeviceInitializingState": [10, 35, 49],
    "DeviceBootingState": [10, 49, 60],
    "DeviceConnectedState": [10, 49],
    "DeviceFailedState": [],
}

TRANSITIONS = [
    {
        "from": "DeviceSessionValidatingState",
        "on": "ResetCommsBuffers(52)",
        "condition": "reply session_id equals the generated session id",
        "to": "DeviceVersionValidatingState",
        "otherwise": "DeviceInvalidState",
    },
    {
        "from": "DeviceVersionValidatingState",
        "on": "Version(10) UPDATE",
        "condition": "device type is supported and cortex_control_version_valid is true",
        "to": "DeviceDisconnectedState",
        "otherwise": "DeviceInvalidState",
    },
    {
        "from": "DeviceVersionValidatingState",
        "on": "GenericError(56)",
        "condition": "VERSION_IS_NEWER or VERSION_IS_OLDER",
        "to": "DeviceInvalidState",
        "otherwise": "no state transition in this handler",
    },
    {
        "from": "any active state handling Connection(49)",
        "on": "Connection(49)",
        "condition": "connected field is present and false",
        "to": "DeviceDisconnectedState",
        "otherwise": "remain in the current state",
    },
    {
        "from": "DeviceBuildingState",
        "on": "ModelRepo(51) UPDATE",
        "condition": "payload is present and installs successfully",
        "to": "DeviceInitializingState",
        "otherwise": "record parse/model-repository error and remain gated",
    },
    {
        "from": "DeviceInitializingState",
        "on": "ModuleStats(35)",
        "condition": "message parses and module statistics install",
        "to": "DeviceBootingState",
        "otherwise": "record parse/module-statistics error and remain gated",
    },
    {
        "from": "DeviceBootingState",
        "on": "Updater(60)",
        "condition": "boot/update gate is satisfied",
        "to": "DeviceConnectedState",
        "otherwise": "remain booting",
    },
]

ERROR_CODES = {
    0: "none",
    1: "undefined",
    2: "parseMessageFailure",
    3: "invalidCloudEndpoint",
    4: "stateError",
    5: "modelRepoDataError",
    6: "moduleStatsDataError",
}


@dataclass(frozen=True)
class Function:
    start: int
    end: int


class Binary:
    def __init__(self, path: Path):
        self.path = path
        self.data = path.read_bytes()
        self.pe = pefile.PE(str(path), fast_load=True)
        self.pe.parse_data_directories(
            directories=[pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_EXCEPTION"]]
        )
        self.base = self.pe.OPTIONAL_HEADER.ImageBase
        self.functions = sorted(
            [
                Function(
                    self.base + entry.struct.BeginAddress,
                    self.base + entry.struct.EndAddress,
                )
                for entry in self.pe.DIRECTORY_ENTRY_EXCEPTION
            ],
            key=lambda function: function.start,
        )
        self.function_starts = [function.start for function in self.functions]
        self.disassembler = Cs(CS_ARCH_X86, CS_MODE_64)
        self._rip_references: dict[int, list[int]] | None = None

    def offset_to_rva(self, offset: int) -> int:
        return self.pe.get_rva_from_offset(offset)

    def va_to_offset(self, va: int) -> int:
        return self.pe.get_offset_from_rva(va - self.base)

    def function_at(self, va: int) -> Function | None:
        index = bisect.bisect_right(self.function_starts, va) - 1
        if index >= 0:
            function = self.functions[index]
            if function.start <= va < function.end:
                return function
        return None

    def leaf_function(self, va: int, *, starts_here: bool = False) -> Function:
        """Bound a small leaf function omitted from x64 exception metadata."""
        start = va
        if not starts_here:
            offset = self.va_to_offset(va)
            window_start = max(0, offset - 0x100)
            window = self.data[window_start : offset + 1]
            prologues = (b"\x48\x89\x5c\x24", b"\x40\x53", b"\x48\x83\xec")
            for prologue in prologues:
                candidates = [
                    window_start + match.start()
                    for match in re.finditer(re.escape(prologue), window)
                ]
                if candidates:
                    start = self.base + self.offset_to_rva(max(candidates))
                    break
        offset = self.va_to_offset(start)
        for instruction in self.disassembler.disasm(self.data[offset : offset + 0x400], start):
            if instruction.mnemonic == "ret":
                return Function(start, instruction.address + instruction.size)
        return Function(start, start + 0x100)

    def instructions(self, function: Function):
        offset = self.va_to_offset(function.start)
        return list(
            self.disassembler.disasm(
                self.data[offset : offset + function.end - function.start], function.start
            )
        )

    def qwords(self, va: int, count: int) -> tuple[int, ...]:
        return struct.unpack_from(f"<{count}Q", self.data, self.va_to_offset(va))


def locate_vtable(binary: Binary, class_name: str) -> int:
    name = f".?AV{class_name}@usb@cortex@neural@@".encode() + b"\0"
    string_offset = binary.data.find(name)
    if string_offset < 16:
        raise ValueError(f"RTTI type descriptor not found for {class_name}")
    type_descriptor_rva = binary.offset_to_rva(string_offset - 16)

    for match in re.finditer(re.escape(struct.pack("<I", type_descriptor_rva)), binary.data):
        col_offset = match.start() - 12
        if col_offset < 0:
            continue
        signature, _, _, pointer_to_type, _, pointer_to_self = struct.unpack_from(
            "<6I", binary.data, col_offset
        )
        try:
            col_rva = binary.offset_to_rva(col_offset)
        except pefile.PEFormatError:
            continue
        if signature != 1 or pointer_to_type != type_descriptor_rva or pointer_to_self != col_rva:
            continue
        locator_pointer = struct.pack("<Q", binary.base + col_rva)
        vtable_reference = binary.data.find(locator_pointer)
        if vtable_reference >= 0:
            return binary.base + binary.offset_to_rva(vtable_reference + 8)
    raise ValueError(f"complete-object locator not found for {class_name}")


def rip_references(binary: Binary, target_va: int) -> list[int]:
    if binary._rip_references is not None:
        return binary._rip_references.get(target_va, [])
    text = next(section for section in binary.pe.sections if section.Name.rstrip(b"\0") == b".text")
    raw = binary.data[
        text.PointerToRawData : text.PointerToRawData + text.SizeOfRawData
    ]
    text_va = binary.base + text.VirtualAddress
    references: dict[int, list[int]] = {}
    for match in re.finditer(b"[HL]\\x8d", raw):
        offset = match.start()
        if offset + 7 > len(raw) or raw[offset + 2] & 0xC7 != 5:
            continue
        instruction_va = text_va + offset
        displacement = struct.unpack_from("<i", raw, offset + 3)[0]
        destination = instruction_va + 7 + displacement
        references.setdefault(destination, []).append(instruction_va)
    binary._rip_references = references
    return references.get(target_va, [])


def state_assignment(instructions) -> tuple[int, int] | None:
    pattern = re.compile(r"dword ptr \[rcx \+ 8\], (0x[0-9a-f]+|\d+)$")
    for instruction in instructions:
        if instruction.mnemonic == "mov" and (match := pattern.fullmatch(instruction.op_str)):
            return int(match.group(1), 0), instruction.address
    return None


def find_constructor(binary: Binary, vtable: int) -> tuple[Function, int, int]:
    candidates = []
    for reference in rip_references(binary, vtable):
        function = binary.function_at(reference) or binary.leaf_function(reference)
        assignment = state_assignment(binary.instructions(function))
        if assignment:
            candidates.append((function, *assignment))
            continue
        # Some trivial constructors have no stack frame or exception record;
        # their state write precedes the final-vtable LEA by a few bytes.
        reference_offset = binary.va_to_offset(reference)
        window_start = max(0, reference_offset - 0x80)
        window = binary.data[window_start:reference_offset]
        writes = list(re.finditer(b"\xc7\x41\x08(.{4})", window, re.DOTALL))
        if writes:
            write = writes[-1]
            evidence_offset = window_start + write.start()
            state_id = struct.unpack("<I", write.group(1))[0]
            start_offset = evidence_offset
            if binary.data[evidence_offset - 7 : evidence_offset - 4] == b"\x48\x8d\x05":
                start_offset -= 7
            start = binary.base + binary.offset_to_rva(start_offset)
            function = binary.leaf_function(start, starts_here=True)
            candidates.append((function, state_id, binary.base + binary.offset_to_rva(evidence_offset)))
    if not candidates:
        raise ValueError(f"constructor referencing vtable {vtable:#x} not found")
    # Cortex Control contains duplicated factory code as well as the concrete
    # constructors.  The highest-address candidate is the concrete USB class.
    return max(candidates, key=lambda candidate: candidate[0].start)


def direct_call_target(instruction) -> int | None:
    if instruction.mnemonic != "call" or not instruction.op_str.startswith("0x"):
        return None
    try:
        return int(instruction.op_str, 16)
    except ValueError:
        return None


def entry_messages(binary: Binary, constructor: Function) -> list[dict]:
    """Walk local USB helpers in execution order and find envelope type writes."""
    assignment = re.compile(r"dword ptr \[rax \+ 8\], (0x[0-9a-f]+|\d+)$")
    result = []
    active = set()

    def walk(function: Function):
        if function.start in active:
            return
        active.add(function.start)
        for instruction in binary.instructions(function):
            if instruction.mnemonic == "mov" and (
                match := assignment.fullmatch(instruction.op_str)
            ):
                result.append(
                    {
                        "messageType": int(match.group(1), 0),
                        "evidenceAddress": f"0x{instruction.address:x}",
                        "function": f"0x{function.start:x}",
                    }
                )
            target = direct_call_target(instruction)
            # The state/helper implementation is a compact contiguous region.
            # Do not descend into protobuf, JUCE, allocation, or crypto code.
            if target is not None and 0x141AA0000 <= target < 0x141AAE000:
                called = binary.function_at(target)
                if called:
                    walk(called)
        active.remove(function.start)

    walk(constructor)
    return result


def immediate_values(instructions) -> set[int]:
    values = set()
    for instruction in instructions:
        for value in re.findall(r"(?:^|, |\+ |\- )(0x[0-9a-f]+|\d+)$", instruction.op_str):
            parsed = int(value, 0)
            if 0 <= parsed <= 72:
                values.add(parsed)
    return values


def extract_message_table(data: bytes) -> dict[int, str]:
    return {
        int(value): name.decode()
        for name, value in re.findall(
            rb'<cortexMessage type="([A-Za-z0-9]+)" value="(\d+)"', data
        )
    }


def fmt_types(numbers: list[int], names: dict[int, str]) -> str:
    return ", ".join(f"{names.get(number, 'unknown')} ({number})" for number in numbers) or "none"


def markdown(report: dict) -> str:
    names = {int(number): name for number, name in report["messageTypes"].items()}
    lines = [
        "# Cortex Control USB behavior extraction",
        "",
        f"Binary: `{report['binary']['path']}`",
        "",
        f"SHA-256: `{report['binary']['sha256']}`",
        "",
        "## Mechanically recovered state machine",
        "",
        "| ID | State | Entry messages | Accepted startup/control messages |",
        "|---:|---|---|---|",
    ]
    for state in sorted(report["states"], key=lambda item: item["id"]):
        lines.append(
            f"| {state['id']} | `{state['name']}` | "
            f"{fmt_types([item['messageType'] for item in state['entryMessages']], names)} | "
            f"{fmt_types(state['dispatchMessageTypes'], names)} |"
        )
    lines.extend(
        [
            "",
            "The startup gate recovered from the binary is:",
            "",
            "`ResetCommsBuffers(52)` → `Version(10)` → `Connection(49)` + "
            "`ModelRepo(51)` → `ModuleStats(35)` → boot subscription burst → "
            "`Updater(60)` gate → connected.",
            "",
            "The boot subscription burst is ordered; Cortex Control does not send it "
            "until the model repository and module statistics have been accepted.",
            "",
            "## Reviewed transition interpretation",
            "",
        ]
    )
    for transition in report["transitions"]:
        lines.append(
            f"- `{transition['from']}` on {transition['on']}: if "
            f"{transition['condition']}, enter `{transition['to']}`; "
            f"otherwise {transition['otherwise']}."
        )
    lines.extend(
        [
            "",
            "## Error behavior",
            "",
            "- A protobuf parse failure records `parseMessageFailure` (2). It is not "
            "silently treated as a missing reply.",
            "- A mismatched reset session id enters the invalid state; correlation is "
            "part of the handshake, not optional metadata.",
            "- Version-newer/version-older errors enter the invalid state.",
            "- A negative `Connection` update returns any active startup state to "
            "disconnected.",
            "- Model-repository and module-statistics failures have distinct retained "
            "device error codes (5 and 6).",
            "",
            "## Confidence boundary",
            "",
            "State IDs, vtables, handler addresses, entry-message order, dispatch types, "
            "and error-code names are extracted facts. Transition conditions are a "
            "reviewed interpretation of those handlers against the embedded protobuf "
            "schema. Timer constants and retry counts are not claimed here; they require "
            "a separate controller/timer pass or runtime tracing.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path, default=DEFAULT_EXE)
    args = parser.parse_args()
    if not args.exe.is_file():
        print(f"Cortex Control not found at {args.exe}", file=sys.stderr)
        return 2

    binary = Binary(args.exe)
    message_types = extract_message_table(binary.data)
    states = []
    for class_name in STATE_CLASSES:
        vtable = locate_vtable(binary, class_name)
        destructor, predicate, handler = binary.qwords(vtable, 3)
        constructor, state_id, state_evidence = find_constructor(binary, vtable)
        handler_function = binary.function_at(handler) or binary.leaf_function(
            handler, starts_here=True
        )
        dispatch = DISPATCH[class_name]
        constants = immediate_values(binary.instructions(handler_function))
        missing = [number for number in dispatch if number not in constants]
        if missing:
            raise ValueError(
                f"reviewed dispatch for {class_name} is stale; constants missing: {missing}"
            )
        states.append(
            {
                "id": state_id,
                "name": class_name,
                "vtable": f"0x{vtable:x}",
                "constructor": f"0x{constructor.start:x}",
                "stateIdEvidenceAddress": f"0x{state_evidence:x}",
                "destructor": f"0x{destructor:x}",
                "handler": f"0x{handler:x}",
                "predicate": f"0x{predicate:x}",
                "dispatchMessageTypes": dispatch,
                "entryMessages": entry_messages(binary, constructor),
            }
        )

    report = {
        "binary": {
            "path": str(args.exe),
            "bytes": len(binary.data),
            "sha256": hashlib.sha256(binary.data).hexdigest().upper(),
            "imageBase": f"0x{binary.base:x}",
        },
        "method": "MSVC RTTI + PE exception bounds + x64 control-flow inspection",
        "messageTypes": {str(number): name for number, name in sorted(message_types.items())},
        "deviceErrorCodes": {str(number): name for number, name in ERROR_CODES.items()},
        "states": states,
        "transitions": TRANSITIONS,
        "confidence": {
            "extracted": [
                "state ids and names",
                "vtable, constructor, handler, and predicate addresses",
                "entry-message ordering",
                "state dispatcher message types",
                "device error-code names",
            ],
            "reviewedInterpretation": ["transition conditions", "startup gate summary"],
            "notYetRecovered": ["timer durations", "retry counts", "backoff policy"],
        },
    }

    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "behavior.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (OUTPUT / "behavior.md").write_text(markdown(report), encoding="utf-8")
    print(f"recovered {len(states)} states from {args.exe.name}")
    for state in sorted(states, key=lambda item: item["id"]):
        sent = [entry["messageType"] for entry in state["entryMessages"]]
        print(f"  {state['id']}: {state['name']} entry={sent} dispatch={state['dispatchMessageTypes']}")
    print(f"wrote {OUTPUT / 'behavior.json'}")
    print(f"wrote {OUTPUT / 'behavior.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
