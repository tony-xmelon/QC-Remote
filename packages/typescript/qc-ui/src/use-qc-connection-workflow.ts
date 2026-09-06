import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { ConnectionPhase, ConnectionState } from "@ndsp-qc/client";
import type { PublicRelayStatus } from "@ndsp-qc/core";

export type QcConnectionTransition = "absent" | "available" | "connecting" | "syncing" | "connected" | "error";

const transitionPhase: Record<QcConnectionTransition, ConnectionPhase> = {
  absent: "disconnected",
  available: "discovering",
  connecting: "opening",
  syncing: "syncing",
  connected: "ready",
  error: "needs-attention"
};

const transitionDetail: Record<QcConnectionTransition, string> = {
  absent: "Quad Cortex is not connected.",
  available: "Quad Cortex USB device is available.",
  connecting: "Opening the Quad Cortex USB session…",
  syncing: "Quad Cortex connected; synchronizing live state…",
  connected: "Quad Cortex connected.",
  error: "The Quad Cortex connection needs attention."
};

export interface QcConnectionPresentation {
  connected: boolean;
  busy: boolean;
  label: "USB" | "SYNC" | "WAIT" | "CONNECT";
  appearance: QcConnectionTransition;
}

export function qcConnectionPresentation(connection: ConnectionState): QcConnectionPresentation {
  if (connection.phase === "ready" && !connection.demo) return { connected: true, busy: false, label: "USB", appearance: "connected" };
  if (connection.phase === "syncing") return { connected: false, busy: true, label: "SYNC", appearance: "syncing" };
  if (["discovering", "opening", "handshaking"].includes(connection.phase)) return { connected: false, busy: true, label: "WAIT", appearance: connection.phase === "discovering" ? "available" : "connecting" };
  if (["needs-attention", "degraded"].includes(connection.phase)) return { connected: false, busy: false, label: "CONNECT", appearance: "error" };
  return { connected: false, busy: false, label: "CONNECT", appearance: "absent" };
}

/**
 * The device-readiness wording both hosts show, in one place.
 *
 * Windows and Android had each grown their own vocabulary for the same states -
 * "QC READY" against "USB", "SYNCING 40%" against "SYNC" - so the two apps
 * described one device in two languages. `deviceReady` and `syncProgress` are
 * optional because only a host that verifies readiness separately supplies
 * them; without them the phase alone decides.
 */
export function qcReadyLabel(
  connection: ConnectionState,
  deviceReady?: boolean,
  syncProgress?: number | null
): string {
  if (syncProgress !== undefined && syncProgress !== null) return `SYNCING ${syncProgress}%`;
  if (deviceReady) return "QC READY";
  // Ready transport with unverified device state is still checking, but a host
  // that does not verify separately treats a ready phase as ready.
  if (connection.phase === "ready" && !connection.demo) {
    return deviceReady === undefined ? "QC READY" : "CHECKING QC";
  }
  if (connection.phase === "syncing") return "SYNCING";
  if (["needs-attention", "degraded"].includes(connection.phase)) return "QC OFFLINE";
  if (connection.phase === "disconnected") return "DISCONNECTED";
  return connection.phase.replace("-", " ").toUpperCase();
}

/**
 * The MCP-relay wording both hosts show, in one place.
 *
 * The relay is the same outbound connection on either host, so it must read the
 * same way: REMOTE once a remote client can reach this QC, RELAY while a paired
 * host is still negotiating, PAIR when nothing is paired yet.
 */
export function qcRelayLabel(status?: PublicRelayStatus): "REMOTE" | "RELAY" | "PAIR" {
  if (status?.state === "connected") return "REMOTE";
  return status?.paired ? "RELAY" : "PAIR";
}

/** Shared app-level connection state; native adapters only report transitions. */
export function useQcConnectionWorkflow(initial: ConnectionState) {
  const [connection, setConnection] = useState(initial);
  const transition = useCallback((status: QcConnectionTransition, detail = transitionDetail[status]) => {
    setConnection({ phase: transitionPhase[status], detail, demo: status !== "connected" && status !== "syncing" });
  }, []);
  const presentation = useMemo(() => qcConnectionPresentation(connection), [connection]);
  return { connection, setConnection: setConnection as Dispatch<SetStateAction<ConnectionState>>, transition, ...presentation };
}
