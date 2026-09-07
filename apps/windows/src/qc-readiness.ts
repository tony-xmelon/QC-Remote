import type { ConnectionState, RuntimeStatus } from "@qc-remote/client";

/**
 * `gatewayAvailable` only means the local Rust process answered. Newer
 * gateways also report the USB worker state, which lets the UI distinguish a
 * live, synchronized QC from an alive broker that is still searching.
 */
export function runtimeHasSynchronizedQc(runtime?: RuntimeStatus): boolean {
  if (!runtime?.gatewayAvailable) return false;
  const usb = runtime.usbDiagnostics;
  // Ready is fail-closed. A gateway response without live USB diagnostics is
  // only proof that the local broker process exists, not that a QC is alive.
  return Boolean(usb
    && usb.phase === "ready"
    && usb.connected
    && usb.synchronized);
}

/** Ready is deliberately stricter than the broker connection phase. */
export function qcConnectionIsVerified(
  connection: ConnectionState,
  runtime?: RuntimeStatus,
  syncProgress: number | null = null
): boolean {
  return connection.phase === "ready"
    && !connection.demo
    && Boolean(connection.lastSync)
    && syncProgress === null
    && runtimeHasSynchronizedQc(runtime);
}

/**
 * Human-readable device state must be derived from the same live predicate as
 * the badge. `connection.detail` and the last diagnostics payload can briefly
 * describe the previous session while a disconnect is propagating through
 * React, so neither is allowed to claim synchronization on its own.
 */
export function qcDeviceStatusDetail(
  connection: ConnectionState,
  deviceReady: boolean,
  syncProgress: number | null = null
): string {
  if (deviceReady) return "Live and synchronized";
  if (syncProgress !== null || connection.phase === "syncing" || connection.phase === "ready") {
    return "Synchronizing active preset";
  }
  if (connection.phase === "disconnected") return "Disconnected";
  if (connection.phase === "degraded" || connection.phase === "needs-attention") return "Offline";
  if (connection.phase === "discovering") return "Searching for Quad Cortex";
  return "Connecting";
}

export function isQcConnectionFailure(detail: string): boolean {
  return /(?:No (?:Quad Cortex|QC) preset has been (?:synchronized|synced)|Quad Cortex is not connected|Quad Cortex connection lost|not synchronized|USB recovery|No Quad Cortex session|Gateway closed|Gateway response channel closed|communication session was cleared)/i.test(detail);
}

/** Never leave an old connection failure beside a verified green Ready state. */
export function qcVisibleStatusNotice(notice: string, deviceReady: boolean, presetLabel: string): string {
  if (deviceReady && isQcConnectionFailure(notice)) {
    return `Quad Cortex live and synchronized · ${presetLabel}`;
  }
  return notice;
}
