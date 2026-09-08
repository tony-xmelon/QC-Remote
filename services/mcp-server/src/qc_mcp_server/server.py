"""MCP resources and typed tools for safe Quad Cortex control."""

from __future__ import annotations

import json
import math
from collections.abc import Mapping
from typing import Any

from mcp.server import MCPServer
from mcp.types import ToolAnnotations
from qc_gateway_client.generated_domain import IPC_MAX_FRAME_BYTES

from .backend import QcBackend
from .generated_actions import (
    MCP_ACTION_DISTINCT_ARGUMENTS,
    MCP_ACTION_SCHEMAS,
    MCP_GATEWAY_ARGUMENTS,
    MCP_GATEWAY_MAPPINGS,
    MCP_GATEWAY_SCHEMAS,
    MCP_GATEWAY_TRUE_ARGUMENTS,
    MCP_INSTRUCTIONS,
    SHARED_QC_ACTIONS,
)
from .generated_result_kinds import GATEWAY_RESULT_KINDS
from .generated_tools import GeneratedQcTools


def _validated_backend_result(method: str, result: Any) -> Any:
    try:
        encoded = json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    except (TypeError, ValueError) as error:
        raise RuntimeError(f"{method} returned a non-JSON result") from error
    if len(encoded) > IPC_MAX_FRAME_BYTES:
        raise RuntimeError(f"{method} returned a result larger than the gateway frame limit")
    kind = GATEWAY_RESULT_KINDS.get(method)
    if kind is None:
        raise RuntimeError(f"Unknown gateway result contract: {method}")
    if not isinstance(result, Mapping):
        raise RuntimeError(f"{method} returned a malformed {kind} result")
    if kind == "PresetSnapshot" and (
        not isinstance(result.get("presetName"), str) or not isinstance(result.get("blocks"), list)
    ):
        raise RuntimeError(f"{method} returned a malformed PresetSnapshot result")
    if kind == "DeviceActionResult" and not any(
        key in result for key in ("accepted", "verified", "verification")
    ):
        raise RuntimeError(f"{method} returned a device action result without verification semantics")
    if isinstance(result, Mapping) and any(key in result for key in ("accepted", "verified", "verification")):
        verified = result.get("verified")
        expected = "authoritative_readback" if verified is True else "accepted_unverified"
        if (
            result.get("accepted") is not True
            or not isinstance(verified, bool)
            or result.get("verification") != expected
            or not isinstance(result.get("detail"), str)
            or len(result["detail"]) > 4096
        ):
            raise RuntimeError(f"{method} returned a malformed device action result")
    return result


def _sanitize_model_result(value: Any) -> Any:
    private_names = {"devicename", "serial", "serialnumber", "deviceserial"}
    if isinstance(value, Mapping):
        return {
            name: _sanitize_model_result(child)
            for name, child in value.items()
            if str(name).casefold() not in private_names
        }
    if isinstance(value, list):
        return [_sanitize_model_result(child) for child in value]
    return value


def _matches_schema(value: Any, schema: dict[str, Any]) -> bool:
    expected = schema.get("type")
    types = expected if isinstance(expected, list) else [expected]
    matches_type = any(
        (kind == "null" and value is None)
        or (kind == "boolean" and isinstance(value, bool))
        or (kind == "integer" and isinstance(value, int) and not isinstance(value, bool))
        or (kind == "number" and isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value))
        or (kind == "string" and isinstance(value, str))
        or (kind == "array" and isinstance(value, list))
        or (kind == "object" and isinstance(value, Mapping))
        for kind in types
    )
    if not matches_type or value is None:
        return matches_type
    if "enum" in schema and value not in schema["enum"]:
        return False
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            return False
        if "maximum" in schema and value > schema["maximum"]:
            return False
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0) or len(value) > schema.get("maxLength", len(value)):
            return False
        if schema.get("pattern") and any(ord(character) < 32 or ord(character) == 127 for character in value):
            return False
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0) or len(value) > schema.get("maxItems", len(value)):
            return False
        if schema.get("uniqueItems") and len({json.dumps(item, sort_keys=True) for item in value}) != len(value):
            return False
        if "items" in schema and not all(_matches_schema(item, schema["items"]) for item in value):
            return False
    if isinstance(value, Mapping):
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False and set(value) - set(properties):
            return False
        if set(schema.get("required", ())) - set(value):
            return False
        if any(name in value and not _matches_schema(value[name], child) for name, child in properties.items()):
            return False
    return True


class QcTools(GeneratedQcTools):
    """Generated MCP tool adapter backed by one canonical action projector."""

    def __init__(self, backend: QcBackend) -> None:
        self.backend = backend

    def _request(self, action: str, params: dict[str, Any] | None = None) -> Any:
        payload = dict(params or {})
        expected = set(MCP_GATEWAY_ARGUMENTS[action])
        if set(payload) != expected:
            missing = sorted(expected - set(payload))
            unexpected = sorted(set(payload) - expected)
            raise RuntimeError(f"MCP gateway argument drift for {action}: missing={missing}, unexpected={unexpected}")
        for name, schema in MCP_GATEWAY_SCHEMAS[action].items():
            if not _matches_schema(payload[name], schema):
                raise ValueError(f"{name} does not match the canonical schema for {action}")
        try:
            method = SHARED_QC_ACTIONS[action]["rpc"]
            return _sanitize_model_result(
                _validated_backend_result(method, self.backend.request(method, payload))
            )
        except Exception as error:
            code = getattr(error, "code", None)
            if code is None:
                raise
            detail = {
                "code": code,
                "message": str(error),
                "retryable": bool(getattr(error, "retryable", False)),
            }
            raise RuntimeError(json.dumps(detail, separators=(",", ":"))) from error

    def _invoke_generated_action(self, action: str, local_arguments: dict[str, Any]) -> Any:
        arguments = {name: value for name, value in local_arguments.items() if name != "self"}
        schemas = MCP_ACTION_SCHEMAS[action]
        if set(arguments) != set(schemas):
            missing = sorted(set(schemas) - set(arguments))
            unexpected = sorted(set(arguments) - set(schemas))
            raise RuntimeError(f"MCP action argument drift for {action}: missing={missing}, unexpected={unexpected}")
        for name, schema in schemas.items():
            if not _matches_schema(arguments[name], schema):
                raise ValueError(f"{name} does not match the canonical schema for {action}")
            if isinstance(arguments[name], str) and schema.get("minLength") and not arguments[name].strip():
                raise ValueError(f"{name} must contain visible text for {action}")
            if name.startswith("confirm_") and arguments[name] is not True:
                raise ValueError(f"{action} requires {name}=true")
        for names in MCP_ACTION_DISTINCT_ARGUMENTS.get(action, ()):
            if len({arguments[name] for name in names}) != len(names):
                raise ValueError(f"{action} requires distinct values for {', '.join(names)}")
        payload = {
            target: arguments[source]
            for source, target in MCP_GATEWAY_MAPPINGS[action]
        }
        payload.update({name: True for name in MCP_GATEWAY_TRUE_ARGUMENTS[action]})
        result = self._request(action, payload)
        if action != "list_models":
            return result
        needle = (arguments["query"] or "").strip().casefold()
        if not needle:
            return result
        if not isinstance(result, Mapping) or not isinstance(result.get("models"), list):
            raise RuntimeError("device.listModels returned a malformed response")
        filtered = dict(result)
        filtered["models"] = [
            model for model in result["models"]
            if isinstance(model, Mapping)
            and any(needle in str(model.get(field, "")).casefold() for field in ("name", "category", "basedOn"))
        ]
        return filtered

    def get_status(self) -> Any:
        """Read gateway availability and connection capabilities."""
        return _validated_backend_result("system.status", self.backend.request("system.status"))
def create_mcp(backend: QcBackend, **server_options: Any) -> MCPServer:
    tools = QcTools(backend)
    server = MCPServer(
        "NDSP Quad Cortex",
        instructions=MCP_INSTRUCTIONS,
        **server_options,
    )

    @server.resource("qc://status")
    def status_resource() -> str:
        """Connection and gateway capability status."""
        return json.dumps(tools.get_status(), ensure_ascii=False)

    @server.resource("qc://current-preset")
    def preset_resource() -> str:
        """Authoritative current preset, scene, blocks, tempo, mode and dirty state."""
        return json.dumps(tools.get_current_preset(), ensure_ascii=False)

    @server.resource("qc://models")
    def models_resource() -> str:
        """Models currently installed and available on this Quad Cortex."""
        return json.dumps(tools.list_models(None), ensure_ascii=False)

    read_only = ToolAnnotations(read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=False)
    live_write = ToolAnnotations(
        read_only_hint=False,
        destructive_hint=False,
        idempotent_hint=False,
        open_world_hint=False,
    )
    persistent_write = ToolAnnotations(
        read_only_hint=False,
        destructive_hint=True,
        idempotent_hint=False,
        open_world_hint=False,
    )
    risky_write = ToolAnnotations(
        read_only_hint=False,
        destructive_hint=True,
        idempotent_hint=False,
        open_world_hint=False,
    )
    annotations = {
        "read": read_only,
        "live-write": live_write,
        "persistent-write": persistent_write,
        "risky-write": risky_write,
    }
    for name, action in SHARED_QC_ACTIONS.items():
        server.tool(
            description=action["description"],
            annotations=annotations[action["classification"]],
        )(getattr(tools, name))
    return server
