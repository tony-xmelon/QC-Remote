import type { GatewayTransport, PresetSnapshot } from "@qc-remote/client";
import type { DeviceHistoryEntry } from "./use-device-history";

export interface WorkflowPrompts {
  confirm(message: string): boolean | Promise<boolean>;
  prompt(message: string, initialValue: string): string | null | Promise<string | null>;
}

/** Common dependencies for verified live-device mutation workflows. */
export interface DeviceMutationWorkflowOptions {
  gateway: GatewayTransport;
  snapshot: PresetSnapshot;
  connected: boolean;
  pending: boolean;
  setPending(pending: boolean): void;
  reconcile(snapshot: PresetSnapshot): void;
  recordHistory(entry: DeviceHistoryEntry): void;
  prompts: WorkflowPrompts;
  notice(message: string): void;
  fail(error: unknown): void;
}
