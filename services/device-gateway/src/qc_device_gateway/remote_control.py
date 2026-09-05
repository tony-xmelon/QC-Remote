"""On-device touchscreen synchronisation for Cortex Control-style actions."""

from __future__ import annotations

import time
from typing import Any

from google.protobuf import descriptor_pb2, descriptor_pool, message_factory


# Pixel centres used by the QC's own 800 x 480 Grid view.
GRID_BLOCK_X = (98, 184, 273, 361, 448, 528, 616, 703)
GRID_BLOCK_Y = (147, 241, 335, 429)

_LEGACY_MESSAGE_CLASS: Any | None = None


def _legacy_message_class() -> Any:
    """Build the CorOS 4.1 RemoteControl wire shape missing from pyquadcortex 0.40."""
    global _LEGACY_MESSAGE_CLASS
    if _LEGACY_MESSAGE_CLASS is not None:
        return _LEGACY_MESSAGE_CLASS

    file = descriptor_pb2.FileDescriptorProto(
        name="qc_device_gateway_remote_control.proto",
        package="qc_device_gateway_compat",
        syntax="proto3",
    )
    mouse = file.message_type.add(name="RemoteControlMouse")
    for name, number, field_type in (
        ("x", 1, descriptor_pb2.FieldDescriptorProto.TYPE_FLOAT),
        ("y", 2, descriptor_pb2.FieldDescriptorProto.TYPE_FLOAT),
        ("type", 3, descriptor_pb2.FieldDescriptorProto.TYPE_UINT32),
        ("to_x", 4, descriptor_pb2.FieldDescriptorProto.TYPE_FLOAT),
        ("to_y", 5, descriptor_pb2.FieldDescriptorProto.TYPE_FLOAT),
    ):
        mouse.field.add(
            name=name,
            number=number,
            label=descriptor_pb2.FieldDescriptorProto.LABEL_OPTIONAL,
            type=field_type,
        )

    screenshot = file.message_type.add(name="RemoteControlScreenshot")
    for name, number, field_type in (
        ("payload", 1, descriptor_pb2.FieldDescriptorProto.TYPE_BYTES),
        ("x", 2, descriptor_pb2.FieldDescriptorProto.TYPE_UINT32),
        ("y", 3, descriptor_pb2.FieldDescriptorProto.TYPE_UINT32),
        ("w", 4, descriptor_pb2.FieldDescriptorProto.TYPE_UINT32),
        ("h", 5, descriptor_pb2.FieldDescriptorProto.TYPE_UINT32),
    ):
        screenshot.field.add(
            name=name,
            number=number,
            label=descriptor_pb2.FieldDescriptorProto.LABEL_OPTIONAL,
            type=field_type,
        )

    graphics_tree = file.message_type.add(name="RemoteControlGraphicsTree")
    graphics_tree.field.add(
        name="payload",
        number=1,
        label=descriptor_pb2.FieldDescriptorProto.LABEL_OPTIONAL,
        type=descriptor_pb2.FieldDescriptorProto.TYPE_STRING,
    )

    remote = file.message_type.add(name="RemoteControlMessage")
    remote.field.add(
        name="action",
        number=1,
        label=descriptor_pb2.FieldDescriptorProto.LABEL_OPTIONAL,
        type=descriptor_pb2.FieldDescriptorProto.TYPE_UINT32,
    )
    remote.field.add(
        name="request_id",
        number=2,
        label=descriptor_pb2.FieldDescriptorProto.LABEL_OPTIONAL,
        type=descriptor_pb2.FieldDescriptorProto.TYPE_UINT64,
    )
    remote.field.add(
        name="mouse",
        number=3,
        label=descriptor_pb2.FieldDescriptorProto.LABEL_OPTIONAL,
        type=descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE,
        type_name=".qc_device_gateway_compat.RemoteControlMouse",
    )
    remote.field.add(
        name="screenshot",
        number=4,
        label=descriptor_pb2.FieldDescriptorProto.LABEL_OPTIONAL,
        type=descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE,
        type_name=".qc_device_gateway_compat.RemoteControlScreenshot",
    )
    remote.field.add(
        name="graphics_tree",
        number=5,
        label=descriptor_pb2.FieldDescriptorProto.LABEL_OPTIONAL,
        type=descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE,
        type_name=".qc_device_gateway_compat.RemoteControlGraphicsTree",
    )
    descriptor = descriptor_pool.DescriptorPool().Add(file)
    _LEGACY_MESSAGE_CLASS = message_factory.GetMessageClass(
        descriptor.message_types_by_name["RemoteControlMessage"]
    )
    return _LEGACY_MESSAGE_CLASS


def install_remote_control_compat() -> Any:
    """Register CorOS 4.1 message type 72 before a pyquadcortex 0.40 handshake."""
    from pyquadcortex import registry

    message_class = _legacy_message_class()
    registry._BY_TYPE[72] = message_class
    registry._TYPE_BY_CLASS[message_class] = 72
    return message_class


def tap_screen(qc: Any, x: int, y: int) -> None:
    """Send the verified PRESS/RELEASE touchscreen gesture to the physical QC."""
    public_method = getattr(qc, "tap_screen", None)
    if callable(public_method):
        public_method(x, y)
        return

    # pyquadcortex 0.40 predates RemoteControl. Register the exact compatible
    # message class with its transport until the public API reaches PyPI.
    message_class = install_remote_control_compat()
    # CorOS 4.1 runtime semantics are inverted against the recovered enum
    # labels: value 1 begins the touch and value 0 ends it. The opposite order
    # leaves the UI held and eventually enters Grid drag mode.
    for index, mouse_type in enumerate((1, 0)):
        qc._t.send(message_class(action=1, mouse={"x": x, "y": y, "type": mouse_type}))
        if index == 0:
            time.sleep(0.02)


def swipe_screen(qc: Any, from_x: int, from_y: int, to_x: int, to_y: int, duration: float = 0.35) -> None:
    """Send the QC's atomic DRAG gesture in its 800 x 480 coordinate space."""
    if not all(0 <= value <= limit for value, limit in ((from_x, 799), (to_x, 799), (from_y, 479), (to_y, 479))):
        raise ValueError("Swipe coordinates must stay inside the 800 x 480 display.")
    message_class = install_remote_control_compat()
    qc._t.send(message_class(action=1, mouse={
        "x": from_x,
        "y": from_y,
        "type": 4,
        "to_x": to_x,
        "to_y": to_y,
    }))
    time.sleep(min(duration, 0.35))


def hold_screen(qc: Any, x: int, y: int, duration: float = 0.8) -> None:
    """Send a stationary long-press gesture used by CorOS configuration affordances."""
    if not 0 <= x <= 799 or not 0 <= y <= 479:
        raise ValueError("Hold coordinates must stay inside the 800 x 480 display.")
    if not 0.25 <= duration <= 5:
        raise ValueError("Hold duration must be from 0.25 through 5 seconds.")
    message_class = install_remote_control_compat()
    qc._t.send(message_class(action=1, mouse={"x": x, "y": y, "type": 1}))
    time.sleep(duration)
    qc._t.send(message_class(action=1, mouse={"x": x, "y": y, "type": 0}))


def capture_screen(qc: Any, timeout: float = 10.0) -> bytes:
    """Return the physical QC's current 800 x 480 framebuffer as PNG bytes."""
    public_method = getattr(qc, "capture_screen", None)
    if callable(public_method):
        return bytes(public_method(timeout=timeout))

    # pyquadcortex 0.40 has neither the message nor the public API. CorOS 4.1
    # replies asynchronously with UPDATE, no request_id, so request() cannot
    # observe it; install a type waiter before sending the empty screenshot READ.
    message_class = install_remote_control_compat()
    reply = qc._t.await_broadcast(
        message_class,
        lambda: qc._t.send(message_class(action=3, screenshot={})),
        timeout=timeout,
        match=lambda message: (
            message.action == 1
            and message.HasField("screenshot")
            and bytes(message.screenshot.payload).startswith(b"\x89PNG\r\n\x1a\n")
        ),
    )
    return bytes(reply.screenshot.payload)


def capture_settled_screen(
    qc: Any,
    timeout: float = 10.0,
    interval: float = 0.2,
    max_attempts: int = 5,
) -> bytes:
    """Return a frame only after two consecutive screenshot reads agree.

    CorOS can satisfy the first READ with the last completed framebuffer while
    a newly requested frame is still being painted.  That is acceptable for a
    live preview but not for an authoritative visual corpus.  Static corpus
    states therefore require two byte-identical consecutive frames; animated
    screens should deliberately use ``capture_screen`` instead.
    """
    if max_attempts < 2:
        raise ValueError("max_attempts must be at least 2")
    previous = capture_screen(qc, timeout=timeout)
    for _ in range(max_attempts - 1):
        time.sleep(interval)
        current = capture_screen(qc, timeout=timeout)
        if current == previous:
            return current
        previous = current
    raise RuntimeError(
        f"The Quad Cortex framebuffer did not settle after {max_attempts} reads; "
        "use capture-now only for an intentionally animated state."
    )


def capture_graphics_tree(qc: Any, timeout: float = 10.0) -> str:
    """Return the current on-device UI hierarchy as diagnostic text."""
    message_class = install_remote_control_compat()
    reply = qc._t.await_broadcast(
        message_class,
        lambda: qc._t.send(message_class(action=3, graphics_tree={})),
        timeout=timeout,
        match=lambda message: (
            message.action == 1
            and message.HasField("graphics_tree")
            and bool(message.graphics_tree.payload)
        ),
    )
    return str(reply.graphics_tree.payload)


def wake_remote_control(qc: Any, timeout: float = 3.0) -> bytes:
    """Activate a dormant CorOS framebuffer stream and restore the Grid view.

    Some CorOS 4.1 sessions do not answer the first RemoteControl READ until a
    supported display command has been handled. Gig View is reversible and does
    not edit the current preset, so use it as the wake handshake only after a
    short direct-read probe has timed out. The final Grid capture proves that
    the restore completed and drains any stale Gig View screenshot.
    """
    try:
        return capture_screen(qc, timeout=timeout)
    except TimeoutError:
        qc.set_gig_view(True)
        time.sleep(0.8)
        try:
            capture_screen(qc, timeout=max(timeout, 12.0))
        finally:
            qc.set_gig_view(False)
        time.sleep(0.8)
        return capture_screen(qc, timeout=max(timeout, 12.0))


def open_grid_block(qc: Any, row: int, column: int) -> None:
    tap_screen(qc, GRID_BLOCK_X[column], GRID_BLOCK_Y[row])
