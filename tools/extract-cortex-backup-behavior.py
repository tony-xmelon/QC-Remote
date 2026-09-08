"""Recover Cortex Control's local-backup control-flow evidence.

This is a static interoperability extractor for the exact Cortex Control 4.1.0
reference binary.  It follows MSVC RTTI/vtables for the backup view controller,
its std::function lambda wrappers, and the USB LocalBackup sender/receiver.  It
also records direct callers/callees of the known export builder.  The output is
machine-code evidence; semantic labels must still be reviewed against the
embedded protobuf descriptor.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import struct
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXE = Path(r"C:\Program Files\Neural DSP\Cortex Control\Cortex Control.exe")
OUTPUT = ROOT / "artifacts" / "cortex-protocol" / "backup-behavior.json"
REFERENCE_SHA256 = "9BE548FB6CBD2E8C80715015C2A2F0F248C9B01A7165004E2B017FFE2B14E65A"
EXPORT_BUILDER = 0x141BDA180

TYPE_FILTERS = (
    "DeviceSettingsBackupsViewController@common@cortex@neural",
    "LocalBackupMessageSender@common@cortex@neural",
    "LocalBackupMessageReceiver@usb@cortex@neural",
    "LocalBackupLoaderThread@common@cortex@neural",
)


def load_behavior_module():
    path = ROOT / "tools" / "extract-cortex-control-behavior.py"
    spec = importlib.util.spec_from_file_location("cortex_behavior", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def ascii_at(binary, va: int) -> str | None:
    try:
        offset = binary.va_to_offset(va)
    except Exception:
        return None
    if not 0 <= offset < len(binary.data):
        return None
    end = binary.data.find(b"\0", offset, min(len(binary.data), offset + 240))
    if end < 0:
        return None
    value = binary.data[offset:end]
    if len(value) >= 4 and all(0x20 <= byte < 0x7F for byte in value):
        return value.decode("ascii")
    return None


def rip_target(instruction) -> int | None:
    match = re.search(r"\[rip ([+-]) (0x[0-9a-f]+)\]", instruction.op_str)
    if not match:
        return None
    displacement = int(match.group(2), 16)
    if match.group(1) == "-":
        displacement = -displacement
    return instruction.address + instruction.size + displacement


def instruction_record(binary, instruction):
    record = {
        "address": f"0x{instruction.address:x}",
        "mnemonic": instruction.mnemonic,
        "operands": instruction.op_str,
    }
    target = rip_target(instruction)
    if target is not None:
        record["ripTarget"] = f"0x{target:x}"
        value = ascii_at(binary, target)
        if value is not None:
            record["ascii"] = value
    call = direct_call_target(instruction)
    if call is not None:
        record["callTarget"] = f"0x{call:x}"
    jump = direct_jump_target(instruction)
    if jump is not None:
        record["jumpTarget"] = f"0x{jump:x}"
    return record


def direct_call_target(instruction) -> int | None:
    if instruction.mnemonic != "call" or not instruction.op_str.startswith("0x"):
        return None
    try:
        return int(instruction.op_str, 16)
    except ValueError:
        return None


def direct_jump_target(instruction) -> int | None:
    if instruction.mnemonic != "jmp" or not instruction.op_str.startswith("0x"):
        return None
    try:
        return int(instruction.op_str, 16)
    except ValueError:
        return None


def decorated_type_names(data: bytes) -> list[str]:
    names: set[str] = set()
    for match in re.finditer(rb"\.\?A[UV][ -~]{8,}?\x00", data):
        value = match.group()[:-1].decode("ascii")
        if any(token in value for token in TYPE_FILTERS):
            names.add(value)
    return sorted(names)


def locate_vtables(binary, decorated_name: str) -> list[int]:
    string = decorated_name.encode() + b"\0"
    string_offset = binary.data.find(string)
    if string_offset < 16:
        return []
    type_descriptor_rva = binary.offset_to_rva(string_offset - 16)
    vtables: set[int] = set()
    for match in re.finditer(re.escape(struct.pack("<I", type_descriptor_rva)), binary.data):
        col_offset = match.start() - 12
        if col_offset < 0:
            continue
        try:
            signature, _, _, pointer_to_type, _, pointer_to_self = struct.unpack_from(
                "<6I", binary.data, col_offset
            )
            col_rva = binary.offset_to_rva(col_offset)
        except Exception:
            continue
        if signature != 1 or pointer_to_type != type_descriptor_rva or pointer_to_self != col_rva:
            continue
        locator = struct.pack("<Q", binary.base + col_rva)
        for reference in re.finditer(re.escape(locator), binary.data):
            try:
                vtables.add(binary.base + binary.offset_to_rva(reference.start() + 8))
            except Exception:
                pass
    return sorted(vtables)


def text_bounds(binary) -> tuple[int, int]:
    text = next(section for section in binary.pe.sections if section.Name.rstrip(b"\0") == b".text")
    low = binary.base + text.VirtualAddress
    return low, low + text.Misc_VirtualSize


def function_record(binary, address: int):
    function = binary.function_at(address) or binary.leaf_function(address, starts_here=True)
    instructions = binary.instructions(function)
    return {
        "address": f"0x{function.start:x}",
        "end": f"0x{function.end:x}",
        "instructions": [instruction_record(binary, item) for item in instructions],
    }


def vtable_record(binary, behavior, address: int):
    low, high = text_bounds(binary)
    slots = []
    for slot in range(48):
        target = binary.qwords(address + slot * 8, 1)[0]
        if not low <= target < high:
            break
        slots.append({"slot": slot, **function_record(binary, target)})
    references = {}
    for reference in behavior.rip_references(binary, address):
        function = binary.function_at(reference) or binary.leaf_function(reference)
        references[function.start] = function_record(binary, function.start)
    return {
        "address": f"0x{address:x}",
        "slots": slots,
        "references": [references[key] for key in sorted(references)],
    }


def direct_callers(binary, target: int):
    text = next(section for section in binary.pe.sections if section.Name.rstrip(b"\0") == b".text")
    raw = binary.data[text.PointerToRawData:text.PointerToRawData + text.SizeOfRawData]
    text_va = binary.base + text.VirtualAddress
    functions = {}
    for offset in range(0, len(raw) - 5):
        if raw[offset] != 0xE8:
            continue
        call_va = text_va + offset
        destination = call_va + 5 + struct.unpack_from("<i", raw, offset + 1)[0]
        if destination == target:
            function = binary.function_at(call_va)
            if function is not None:
                functions[function.start] = function
    return [function_record(binary, address) for address in sorted(functions)]


def local_call_graph(binary, roots: list[int], depth: int = 2):
    low, high = text_bounds(binary)
    queue = [(root, 0) for root in roots]
    seen: set[int] = set()
    records = []
    while queue:
        address, level = queue.pop(0)
        function = binary.function_at(address) or binary.leaf_function(address, starts_here=True)
        if function.start in seen:
            continue
        seen.add(function.start)
        record = function_record(binary, function.start)
        record["depth"] = level
        records.append(record)
        if level >= depth:
            continue
        for instruction in binary.instructions(function):
            target = direct_call_target(instruction) or direct_jump_target(instruction)
            if target is not None and low <= target < high:
                queue.append((target, level + 1))
    return records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path, default=DEFAULT_EXE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    behavior = load_behavior_module()
    binary = behavior.Binary(args.exe)
    digest = hashlib.sha256(binary.data).hexdigest().upper()
    if digest != REFERENCE_SHA256:
        raise RuntimeError(f"unsupported Cortex Control binary: {digest}")

    types = []
    graph_roots = {EXPORT_BUILDER}
    for name in decorated_type_names(binary.data):
        vtables = [vtable_record(binary, behavior, address) for address in locate_vtables(binary, name)]
        for vtable in vtables:
            graph_roots.update(int(slot["address"], 16) for slot in vtable["slots"])
        types.append({"decoratedName": name, "vtables": vtables})

    report = {
        "binary": {"path": str(args.exe), "sha256": digest},
        "exportBuilder": f"0x{EXPORT_BUILDER:x}",
        "types": types,
        "exportBuilderCallers": direct_callers(binary, EXPORT_BUILDER),
        "callGraph": local_call_graph(binary, sorted(graph_roots), depth=2),
        "confidence": {
            "mechanical": [
                "RTTI type identities",
                "vtable slot addresses and function bounds",
                "direct call edges",
                "complete instruction bodies for recorded functions",
            ],
            "requiresReview": [
                "semantic role of lambda wrappers",
                "object member meanings",
                "branch/guard interpretation",
                "timer ownership",
            ],
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.output}")
    print(f"types={len(types)} roots={len(graph_roots)} functions={len(report['callGraph'])}")
    print("export callers:", ", ".join(item["address"] for item in report["exportBuilderCallers"]) or "none")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
