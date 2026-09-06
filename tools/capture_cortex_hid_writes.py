"""Capture the HID output reports Cortex Control writes to the Quad Cortex.

Interoperability capture. Cortex Control has no hid.dll imports: its Windows
HID backend writes output reports straight through KERNEL32 WriteFile on the
device handle. Breakpointing that one export and keeping only 129-byte buffers
whose first byte is the QC's OUTPUT report id yields the exact bytes the vendor
application puts on the wire, and nothing else.

The trace is written as raw concatenated reports, which is what
`tools/analyze_cortex_hid_trace.py` already consumes.

Usage (Cortex Control must already be running and connected):
  python tools/capture_cortex_hid_writes.py --seconds 120 --out artifacts/cortex-hid/trace.bin
"""

from __future__ import annotations

import argparse
import ctypes
import subprocess
import sys
import time
from ctypes import wintypes
from pathlib import Path

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

PROCESS_ALL_ACCESS = 0x001F0FFF
THREAD_GET_CONTEXT = 0x0008
THREAD_SET_CONTEXT = 0x0010
THREAD_QUERY_INFORMATION = 0x0040
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

EXCEPTION_DEBUG_EVENT = 1
EXIT_PROCESS_DEBUG_EVENT = 5
EXCEPTION_BREAKPOINT = 0x80000003
EXCEPTION_SINGLE_STEP = 0x80000004
DBG_CONTINUE = 0x00010002
DBG_EXCEPTION_NOT_HANDLED = 0x80010001

CONTEXT_AMD64_CONTROL = 0x00100001
CONTEXT_AMD64_INTEGER = 0x00100002
# Offsets into CONTEXT (x64) for the registers a WriteFile call uses.
OFFSET_EFLAGS = 0x44
OFFSET_RDX = 0x88
OFFSET_R8 = 0xB8
OFFSET_RIP = 0xF8

REPORT_BYTES = 129
OUT_REPORT_ID = 0x02
TRAP_FLAG = 0x100


class EXCEPTION_RECORD(ctypes.Structure):
    _fields_ = [
        ("ExceptionCode", wintypes.DWORD),
        ("ExceptionFlags", wintypes.DWORD),
        ("ExceptionRecord", ctypes.c_void_p),
        ("ExceptionAddress", ctypes.c_void_p),
        ("NumberParameters", wintypes.DWORD),
        ("ExceptionInformation", ctypes.c_ulonglong * 15),
    ]


class EXCEPTION_DEBUG_INFO(ctypes.Structure):
    _fields_ = [("ExceptionRecord", EXCEPTION_RECORD), ("dwFirstChance", wintypes.DWORD)]


class DEBUG_EVENT_UNION(ctypes.Union):
    _fields_ = [("Exception", EXCEPTION_DEBUG_INFO), ("padding", ctypes.c_byte * 176)]


class DEBUG_EVENT(ctypes.Structure):
    _fields_ = [
        ("dwDebugEventCode", wintypes.DWORD),
        ("dwProcessId", wintypes.DWORD),
        ("dwThreadId", wintypes.DWORD),
        ("u", DEBUG_EVENT_UNION),
    ]


def cortex_pid() -> int:
    result = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq Cortex Control.exe", "/FO", "CSV", "/NH"],
        check=True, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    for line in result.stdout.splitlines():
        if line.startswith('"Cortex Control.exe"'):
            return int(line.split(",")[1].strip('"'))
    raise RuntimeError("Cortex Control is not running")


def write_file_address() -> int:
    """System DLLs load at the same address in every process on a boot, so the
    local export address is the target's too."""
    # ctypes defaults to a 32-bit return, which truncates both the module
    # handle and the export address on x64.
    kernel32.GetModuleHandleW.restype = ctypes.c_void_p
    kernel32.GetModuleHandleW.argtypes = [wintypes.LPCWSTR]
    kernel32.GetProcAddress.restype = ctypes.c_void_p
    kernel32.GetProcAddress.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    handle = kernel32.GetModuleHandleW("kernel32.dll")
    address = kernel32.GetProcAddress(handle, b"WriteFile")
    if not address:
        raise RuntimeError("could not resolve WriteFile")
    return address


def read_memory(process: int, address: int, size: int) -> bytes:
    buffer = ctypes.create_string_buffer(size)
    got = ctypes.c_size_t()
    if not kernel32.ReadProcessMemory(process, ctypes.c_void_p(address), buffer, size,
                                      ctypes.byref(got)):
        return b""
    return buffer.raw[: got.value]


def write_memory(process: int, address: int, data: bytes) -> None:
    old = wintypes.DWORD()
    if not kernel32.VirtualProtectEx(process, ctypes.c_void_p(address), len(data), 0x40,
                                     ctypes.byref(old)):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        written = ctypes.c_size_t()
        kernel32.WriteProcessMemory(process, ctypes.c_void_p(address),
                                    ctypes.create_string_buffer(data), len(data),
                                    ctypes.byref(written))
        kernel32.FlushInstructionCache(process, ctypes.c_void_p(address), len(data))
    finally:
        restored = wintypes.DWORD()
        kernel32.VirtualProtectEx(process, ctypes.c_void_p(address), len(data),
                                  old.value, ctypes.byref(restored))


def aligned_context():
    allocation = ctypes.create_string_buffer(0x4D0 + 16)
    address = (ctypes.addressof(allocation) + 15) & ~15
    ctypes.c_uint32.from_address(address + 0x30).value = (
        CONTEXT_AMD64_CONTROL | CONTEXT_AMD64_INTEGER
    )
    return allocation, address


def field(address: int, offset: int) -> int:
    return ctypes.c_ulonglong.from_address(address + offset).value


def set_field(address: int, offset: int, value: int) -> None:
    ctypes.c_ulonglong.from_address(address + offset).value = value


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=float, default=120.0)
    parser.add_argument("--out", type=Path, default=Path("artifacts/cortex-hid/trace.bin"))
    args = parser.parse_args()

    pid = cortex_pid()
    target = write_file_address()
    print(f"Cortex Control pid {pid}; breakpointing WriteFile at 0x{target:x}")

    process = kernel32.OpenProcess(PROCESS_ALL_ACCESS, False, pid)
    if not process:
        raise ctypes.WinError(ctypes.get_last_error())
    if not kernel32.DebugActiveProcess(pid):
        raise ctypes.WinError(ctypes.get_last_error())
    kernel32.DebugSetProcessKillOnExit(False)

    original = read_memory(process, target, 1)
    if not original:
        raise RuntimeError("could not read the WriteFile prologue")
    write_memory(process, target, b"\xCC")

    reports = bytearray()
    other_writes = 0
    armed = True
    pending: dict[int, bool] = {}
    event = DEBUG_EVENT()
    allocation, context = aligned_context()
    deadline = time.time() + args.seconds
    # Detaching while a thread still carries the trap flag we set leaves it to
    # raise a single-step nobody handles, which kills Cortex Control. Keep
    # pumping events past the deadline until every armed thread has stepped.
    drain_until = None

    try:
        while True:
            if time.time() >= deadline:
                if not pending:
                    break
                if drain_until is None:
                    drain_until = time.time() + 5.0
                elif time.time() >= drain_until:
                    print(f"warning: {len(pending)} thread(s) still mid-step at detach")
                    break
            if not kernel32.WaitForDebugEvent(ctypes.byref(event), 200):
                continue
            status = DBG_CONTINUE
            code = event.dwDebugEventCode

            if code == EXIT_PROCESS_DEBUG_EVENT:
                print("Cortex Control exited")
                kernel32.ContinueDebugEvent(event.dwProcessId, event.dwThreadId, status)
                break

            if code == EXCEPTION_DEBUG_EVENT:
                record = event.u.Exception.ExceptionRecord
                thread = kernel32.OpenThread(
                    THREAD_GET_CONTEXT | THREAD_SET_CONTEXT | THREAD_QUERY_INFORMATION,
                    False, event.dwThreadId)

                if record.ExceptionCode == EXCEPTION_BREAKPOINT and record.ExceptionAddress == target:
                    if thread and kernel32.GetThreadContext(thread, ctypes.c_void_p(context)):
                        buffer_address = field(context, OFFSET_RDX)
                        size = field(context, OFFSET_R8) & 0xFFFFFFFF
                        if size == REPORT_BYTES:
                            data = read_memory(process, buffer_address, REPORT_BYTES)
                            if len(data) == REPORT_BYTES and data[0] == OUT_REPORT_ID:
                                reports.extend(data)
                            else:
                                other_writes += 1
                        else:
                            other_writes += 1
                        # Step over the restored instruction, then re-arm.
                        set_field(context, OFFSET_RIP, target)
                        set_field(context, OFFSET_EFLAGS, field(context, OFFSET_EFLAGS) | TRAP_FLAG)
                        kernel32.SetThreadContext(thread, ctypes.c_void_p(context))
                        if armed:
                            write_memory(process, target, original)
                            armed = False
                        pending[event.dwThreadId] = True
                elif record.ExceptionCode == EXCEPTION_SINGLE_STEP and pending.pop(event.dwThreadId, False):
                    # Past the deadline we are only draining; leaving the
                    # breakpoint out lets the drain actually finish.
                    if not armed and time.time() < deadline:
                        write_memory(process, target, b"\xCC")
                        armed = True
                else:
                    status = DBG_EXCEPTION_NOT_HANDLED

                if thread:
                    kernel32.CloseHandle(thread)

            kernel32.ContinueDebugEvent(event.dwProcessId, event.dwThreadId, status)
    finally:
        if armed:
            write_memory(process, target, original)
        kernel32.DebugActiveProcessStop(pid)
        kernel32.CloseHandle(process)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_bytes(bytes(reports))
    print(f"captured {len(reports) // REPORT_BYTES} output reports "
          f"({len(reports)} bytes); ignored {other_writes} unrelated writes")
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
