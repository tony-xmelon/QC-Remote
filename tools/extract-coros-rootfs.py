#!/usr/bin/env python3
"""Extract ZenUI or Qt/Embedded fonts from a CorOS ext2/3 rootfs image.

The updater contains an ext3 image that uses classic inode block maps rather
than ext4 extents.  Keeping this reader small makes the font provenance and
the extraction reproducible without mounting the image or modifying a device.
"""

from __future__ import annotations

import argparse
import struct
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Inode:
    mode: int
    size: int
    blocks: tuple[int, ...]


class ExtFilesystem:
    def __init__(self, image: Path) -> None:
        self.handle = image.open("rb")
        self.handle.seek(1024)
        superblock = self.handle.read(1024)
        if struct.unpack_from("<H", superblock, 56)[0] != 0xEF53:
            raise ValueError(f"{image} is not an ext filesystem")
        self.block_size = 1024 << struct.unpack_from("<I", superblock, 24)[0]
        self.blocks_per_group = struct.unpack_from("<I", superblock, 32)[0]
        self.inodes_per_group = struct.unpack_from("<I", superblock, 40)[0]
        self.first_data_block = struct.unpack_from("<I", superblock, 20)[0]
        self.inode_size = struct.unpack_from("<H", superblock, 88)[0] or 128
        self.group_table = (self.first_data_block + 1) * self.block_size

    def close(self) -> None:
        self.handle.close()

    def read_at(self, offset: int, size: int) -> bytes:
        self.handle.seek(offset)
        return self.handle.read(size)

    def inode(self, number: int) -> Inode:
        group, index = divmod(number - 1, self.inodes_per_group)
        descriptor = self.read_at(self.group_table + group * 32, 32)
        inode_table = struct.unpack_from("<I", descriptor, 8)[0]
        raw = self.read_at(
            inode_table * self.block_size + index * self.inode_size,
            self.inode_size,
        )
        mode = struct.unpack_from("<H", raw, 0)[0]
        size = struct.unpack_from("<I", raw, 4)[0]
        if mode & 0xF000 == 0x8000 and len(raw) >= 112:
            size |= struct.unpack_from("<I", raw, 108)[0] << 32
        return Inode(mode, size, struct.unpack_from("<15I", raw, 40))

    def _pointer_block(self, number: int) -> tuple[int, ...]:
        if not number:
            return ()
        data = self.read_at(number * self.block_size, self.block_size)
        return struct.unpack(f"<{self.block_size // 4}I", data)

    def data_blocks(self, inode: Inode):
        remaining = (inode.size + self.block_size - 1) // self.block_size
        for block in inode.blocks[:12]:
            if not remaining:
                return
            yield block
            remaining -= 1
        for block in self._pointer_block(inode.blocks[12]):
            if not remaining:
                return
            yield block
            remaining -= 1
        for indirect in self._pointer_block(inode.blocks[13]):
            for block in self._pointer_block(indirect):
                if not remaining:
                    return
                yield block
                remaining -= 1
        for double in self._pointer_block(inode.blocks[14]):
            for indirect in self._pointer_block(double):
                for block in self._pointer_block(indirect):
                    if not remaining:
                        return
                    yield block
                    remaining -= 1

    def data(self, inode: Inode) -> bytes:
        chunks = (
            self.read_at(block * self.block_size, self.block_size)
            if block
            else bytes(self.block_size)
            for block in self.data_blocks(inode)
        )
        return b"".join(chunks)[: inode.size]

    def entries(self, inode: Inode):
        data = self.data(inode)
        offset = 0
        while offset + 8 <= len(data):
            number, record_length, name_length = struct.unpack_from("<IHB", data, offset)
            if record_length < 8:
                break
            if number and name_length:
                name = data[offset + 8 : offset + 8 + name_length].decode(
                    "utf-8", errors="surrogateescape"
                )
                yield name, number
            offset += record_length

    def resolve(self, path: str) -> Inode:
        inode = self.inode(2)
        for part in Path(path).parts:
            if part in ("/", "\\", ""):
                continue
            match = next((n for name, n in self.entries(inode) if name == part), None)
            if match is None:
                raise FileNotFoundError(path)
            inode = self.inode(match)
        return inode


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("rootfs", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument(
        "--all-fonts",
        action="store_true",
        help="extract every file in /usr/lib/fonts instead of only Helvetica QPFs",
    )
    parser.add_argument(
        "--file",
        action="append",
        default=[],
        help="extract an absolute path from the image (repeatable)",
    )
    args = parser.parse_args()

    fs = ExtFilesystem(args.rootfs)
    try:
        if args.file:
            args.output.mkdir(parents=True, exist_ok=True)
            for source in args.file:
                content = fs.data(fs.resolve(source))
                destination = args.output / Path(source).name
                destination.write_bytes(content)
                print(f"{source}\t{destination}\t{len(content)} bytes")
            return
        font_dir = fs.resolve("/usr/lib/fonts")
        args.output.mkdir(parents=True, exist_ok=True)
        count = 0
        for name, number in fs.entries(font_dir):
            selected = args.all_fonts or (
                name.startswith("helvetica_") and name.endswith(".qpf")
            )
            if selected and name not in (".", ".."):
                content = fs.data(fs.inode(number))
                (args.output / name).write_bytes(content)
                print(f"{name}\t{len(content)} bytes")
                count += 1
        if not args.all_fonts and count != 24:
            raise RuntimeError(f"expected 24 Helvetica QPF faces, extracted {count}")
    finally:
        fs.close()


if __name__ == "__main__":
    main()
