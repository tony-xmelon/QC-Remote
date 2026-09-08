"""Prove our .proto files match the schema shipped inside Cortex Control.

`extract-cortex-protocol.py` pulls the serialized FileDescriptorProto out of the
Cortex Control binary and compares *message names*. That is not enough to claim
the wire format is followed 1:1: two files can carry the same message names
while disagreeing on a field number, a type, or a repeated/optional label, and
any one of those silently corrupts a payload.

This compiles the repository's protos with the same vendored protoc the Rust
build uses, then compares them against the extracted descriptors field by
field: number, name, label, type, referenced type, and oneof membership, plus
every enum value. A difference is reported with the exact path, e.g.

    PresetMessage.blocks: type differs (binary=TYPE_MESSAGE, repo=TYPE_BYTES)

Usage:
  python tools/verify_cortex_protocol_fidelity.py [--refresh]

--refresh re-runs the extraction from the installed binary first. Without it the
checked-in descriptors under references/cortex-protocol are used, so the check
runs on a machine that does not have Cortex Control installed.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from google.protobuf import descriptor_pb2

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
PROTO_DIRECTORY = REPOSITORY_ROOT / "packages/rust/qc-protocol/proto"
DESCRIPTORS = REPOSITORY_ROOT / "references/cortex-protocol"
FILES = ("ProductionAutomation", "Preset")

LABELS = {1: "optional", 2: "required", 3: "repeated"}


def runs(candidate: str) -> bool:
    """A name on PATH is not necessarily an executable protoc on this host."""
    try:
        subprocess.run([candidate, "--version"], check=True, capture_output=True)
    except (OSError, subprocess.SubprocessError):
        return False
    return True


def find_protoc() -> str:
    """Prefer the vendored protoc the Rust build uses, so this cannot drift.

    PATH is consulted only as a fallback, and every candidate is executed once
    before it is trusted: this repository's Git Bash PATH carries a `protoc`
    entry that Windows refuses to start.
    """
    registry = Path.home() / ".cargo" / "registry" / "src"
    candidates = [str(path) for path in sorted(registry.glob("*/protoc-bin-vendored-*/bin/protoc.exe"))]
    candidates += [str(path) for path in sorted(registry.glob("*/protoc-bin-vendored-*/bin/protoc"))]
    found = shutil.which("protoc")
    if found:
        candidates.append(found)
    for candidate in candidates:
        if runs(candidate):
            return candidate
    raise SystemExit("no runnable protoc found: build the Rust crates once, "
                     "or install protoc")


def compile_repo_protos() -> dict[str, descriptor_pb2.FileDescriptorProto]:
    protoc = find_protoc()
    with tempfile.TemporaryDirectory() as directory:
        output = Path(directory) / "repo.desc"
        subprocess.run(
            [protoc, f"--proto_path={PROTO_DIRECTORY}", f"--descriptor_set_out={output}",
             *[f"{stem}.proto" for stem in FILES]],
            check=True, capture_output=True)
        the_set = descriptor_pb2.FileDescriptorSet()
        the_set.ParseFromString(output.read_bytes())
    return {file.name.removesuffix(".proto"): file for file in the_set.file}


def load_binary_descriptors() -> dict[str, descriptor_pb2.FileDescriptorProto]:
    descriptors = {}
    for stem in FILES:
        path = DESCRIPTORS / f"{stem}.desc"
        if not path.is_file():
            raise SystemExit(f"missing {path}; run tools/extract-cortex-protocol.py first")
        proto = descriptor_pb2.FileDescriptorProto()
        proto.ParseFromString(path.read_bytes())
        descriptors[stem] = proto
    return descriptors


def field_shape(field: descriptor_pb2.FieldDescriptorProto) -> dict[str, object]:
    shape = {
        "name": field.name,
        "label": LABELS.get(field.label, field.label),
        "type": descriptor_pb2.FieldDescriptorProto.Type.Name(field.type),
    }
    if field.type_name:
        shape["typeName"] = field.type_name
    # A field inside a oneof is wire-compatible with a plain field, but the
    # grouping changes the generated API and which fields clear each other, so
    # it is part of the contract.
    if field.HasField("oneof_index"):
        shape["oneof"] = field.oneof_index
    if field.HasField("proto3_optional") and field.proto3_optional:
        shape["proto3Optional"] = True
    return shape


def is_synthetic_optional(message: descriptor_pb2.DescriptorProto,
                          field: descriptor_pb2.FieldDescriptorProto) -> bool:
    """Return whether *field* uses protoc's single-field optional oneof shape.

    The repository deliberately spells proto3 optional fields as explicit
    one-field oneofs so prost keeps the stable wrapper modules used by the
    runtime.  That representation has identical wire and presence semantics;
    only the descriptor's proto3_optional marker differs.
    """
    if not field.HasField("oneof_index"):
        return False
    index = field.oneof_index
    if index >= len(message.oneof_decl):
        return False
    if message.oneof_decl[index].name != f"_{field.name}":
        return False
    return sum(candidate.HasField("oneof_index") and candidate.oneof_index == index
               for candidate in message.field) == 1


def compare_enums(path: str, binary, repo, problems: list[str]) -> None:
    binary_enums = {enum.name: enum for enum in binary}
    repo_enums = {enum.name: enum for enum in repo}
    for name in sorted(set(binary_enums) - set(repo_enums)):
        problems.append(f"{path}{name}: enum missing from our protos")
    for name in sorted(set(repo_enums) - set(binary_enums)):
        problems.append(f"{path}{name}: enum is ours only, not in the binary")
    for name in sorted(set(binary_enums) & set(repo_enums)):
        mine = {value.number: value.name for value in repo_enums[name].value}
        theirs = {value.number: value.name for value in binary_enums[name].value}
        for number in sorted(set(theirs) - set(mine)):
            problems.append(f"{path}{name}: missing value {number} = {theirs[number]}")
        for number in sorted(set(mine) - set(theirs)):
            problems.append(f"{path}{name}: extra value {number} = {mine[number]}")
        for number in sorted(set(theirs) & set(mine)):
            if theirs[number] != mine[number]:
                problems.append(f"{path}{name}[{number}]: named {mine[number]!r}, "
                                f"binary says {theirs[number]!r}")


def compare_messages(path: str, binary, repo, problems: list[str]) -> int:
    binary_messages = {message.name: message for message in binary}
    repo_messages = {message.name: message for message in repo}
    checked = 0

    for name in sorted(set(binary_messages) - set(repo_messages)):
        problems.append(f"{path}{name}: message missing from our protos")
    for name in sorted(set(repo_messages) - set(binary_messages)):
        problems.append(f"{path}{name}: message is ours only, not in the binary")

    for name in sorted(set(binary_messages) & set(repo_messages)):
        checked += 1
        theirs, mine = binary_messages[name], repo_messages[name]
        here = f"{path}{name}"
        their_fields = {field.number: field for field in theirs.field}
        my_fields = {field.number: field for field in mine.field}

        for number in sorted(set(their_fields) - set(my_fields)):
            field = their_fields[number]
            problems.append(f"{here}: missing field {number} ({field.name})")
        for number in sorted(set(my_fields) - set(their_fields)):
            field = my_fields[number]
            problems.append(f"{here}: field {number} ({field.name}) is ours only")
        for number in sorted(set(their_fields) & set(my_fields)):
            theirs_shape = field_shape(their_fields[number])
            mine_shape = field_shape(my_fields[number])
            for key in sorted(set(theirs_shape) | set(mine_shape)):
                if (key == "proto3Optional"
                        and theirs_shape.get(key) is True
                        and mine_shape.get(key) is None
                        and is_synthetic_optional(theirs, their_fields[number])
                        and is_synthetic_optional(mine, my_fields[number])):
                    continue
                if theirs_shape.get(key) != mine_shape.get(key):
                    problems.append(
                        f"{here}.{their_fields[number].name} (field {number}): "
                        f"{key} is {mine_shape.get(key)!r}, "
                        f"binary says {theirs_shape.get(key)!r}")

        their_oneofs = [entry.name for entry in theirs.oneof_decl]
        my_oneofs = [entry.name for entry in mine.oneof_decl]
        if their_oneofs != my_oneofs:
            problems.append(f"{here}: oneofs are {my_oneofs}, binary says {their_oneofs}")

        compare_enums(f"{here}.", theirs.enum_type, mine.enum_type, problems)
        checked += compare_messages(f"{here}.", theirs.nested_type, mine.nested_type,
                                    problems)
    return checked


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true",
                        help="re-extract from the installed Cortex Control first")
    arguments = parser.parse_args()

    if arguments.refresh:
        subprocess.run([sys.executable, str(REPOSITORY_ROOT / "tools/extract-cortex-protocol.py")],
                       check=True)

    binary = load_binary_descriptors()
    repo = compile_repo_protos()

    problems: list[str] = []
    checked = 0
    for stem in FILES:
        theirs, mine = binary[stem], repo[stem]
        if theirs.package != mine.package:
            problems.append(f"{stem}.proto: package is {mine.package!r}, "
                            f"binary says {theirs.package!r}")
        if (theirs.syntax or "proto2") != (mine.syntax or "proto2"):
            problems.append(f"{stem}.proto: syntax is {mine.syntax!r}, "
                            f"binary says {theirs.syntax!r}")
        checked += compare_messages("", theirs.message_type, mine.message_type, problems)
        compare_enums("", theirs.enum_type, mine.enum_type, problems)

    for problem in problems:
        print(f"FAIL {problem}")
    if problems:
        print(f"\n{len(problems)} difference(s) from the shipped schema")
        return 1
    print(f"PASS {checked} messages match the schema inside Cortex Control "
          f"field for field, across {len(FILES)} descriptors")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
