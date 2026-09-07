"""Small pyquadcortex-compatible builders for newly evidenced CorOS messages.

Rust remains the production protocol implementation.  These helpers keep the
development-only Python oracle able to construct the same sparse messages
without duplicating the complete generated protobuf schema.
"""

from __future__ import annotations

from typing import Any

from .domain import MAXIMUM_TEMPO_BPM, MINIMUM_TEMPO_BPM


def _protos() -> tuple[Any, Any]:
    from pyquadcortex.proto import Preset_pb2 as preset
    from pyquadcortex.proto import ProductionAutomation_pb2 as automation

    return automation, preset


def tuner_meter_message(enabled: bool) -> Any:
    """Build the sparse Tuner UPDATE used to enable or disable meter pushes."""
    automation, _ = _protos()
    return automation.TunerMessage(action=1, enable_meter=bool(enabled))


def global_tempo_message(bpm: int) -> Any:
    """Build GlobalTempo parameter 0 using the hardware-confirmed 40..240 scale."""
    if isinstance(bpm, bool) or not isinstance(bpm, int):
        raise TypeError("bpm must be an integer")
    clamped = min(max(bpm, MINIMUM_TEMPO_BPM), MAXIMUM_TEMPO_BPM)
    normalized = (clamped - MINIMUM_TEMPO_BPM) / (
        MAXIMUM_TEMPO_BPM - MINIMUM_TEMPO_BPM
    )
    automation, preset = _protos()
    return automation.GlobalTempoMessage(
        action=1,
        params=[preset.Param(index=0, param_values=[preset.ParamValue(float_value=normalized)])],
    )


def system_time_sync_message(ms_since_epoch: int) -> Any:
    """Build the SystemTimeSync UPDATE Cortex Control sends during startup."""
    if isinstance(ms_since_epoch, bool) or not isinstance(ms_since_epoch, int):
        raise TypeError("ms_since_epoch must be an integer")
    if not 0 <= ms_since_epoch <= 0xFFFFFFFFFFFFFFFF:
        raise ValueError("ms_since_epoch must fit an unsigned 64-bit integer")
    automation, _ = _protos()
    return automation.SystemTimeSyncMessage(action=1, ms_since_epoch=ms_since_epoch)


def send_tuner_meter(qc: Any, enabled: bool) -> None:
    qc._t.send(tuner_meter_message(enabled))


def send_global_tempo(qc: Any, bpm: int) -> None:
    qc._t.send(global_tempo_message(bpm))


def sync_system_time(qc: Any, ms_since_epoch: int) -> None:
    qc._t.send(system_time_sync_message(ms_since_epoch))
