import type { BlockDetails, BlockParameter, GatewayTransport, GridBlock, PresetSnapshot } from "@qc-remote/client";
import {
  resolveOfflineAssistantIntent,
  sceneLetter,
  type AssistantAccessMode,
  type AssistantIntent,
  type QcAssistantDeviceCommand
} from "@qc-remote/core";
import { prepareAssistantParameterEdit } from "./assistant-parameter-edit.ts";

export type PreparedOfflineAssistantAction =
  | { kind: "bypass"; block: GridBlock; targetBypassed: boolean; label: string }
  | { kind: "parameter"; block: BlockDetails; parameter: BlockParameter; value: number; label: string };

export type OfflineAssistantWorkflowOutcome =
  | { kind: "response"; intent: "inspect" | "help"; detail: string; notice: string }
  | { kind: "prepared"; action: PreparedOfflineAssistantAction; detail: string; notice: string }
  | { kind: "completed"; detail: string };

export interface OfflineAssistantPerformancePort {
  selectScene(index: number, reportFailure?: boolean): Promise<void>;
  setBlockBypass(block: GridBlock, bypassed: boolean, reportFailure?: boolean): Promise<string | undefined>;
  navigateBank(direction: -1 | 1, reportFailure?: boolean): Promise<string | undefined>;
  runAssistantDeviceCommand(command: QcAssistantDeviceCommand, reportFailure?: boolean): Promise<string | undefined>;
}

export interface OfflineAssistantParameterPort {
  applyResolvedParameter(
    details: BlockDetails,
    parameter: BlockParameter,
    value: number,
    reportFailure?: boolean
  ): Promise<string | undefined>;
}

export interface OfflineAssistantPresetPort {
  recallLocation(location: string): Promise<string>;
}

export interface OfflineAssistantWorkflowOptions {
  gateway: GatewayTransport;
  snapshot: PresetSnapshot;
  selectedBlockId?: string;
  accessMode: AssistantAccessMode;
  connected: boolean;
  demo: boolean;
  performance: OfflineAssistantPerformancePort;
  preset: OfflineAssistantPresetPort;
}

/**
 * Own the deterministic assistant decision tree for every app host. Model
 * providers and review presentation stay native; command policy and execution
 * are deliberately identical.
 */
export async function runOfflineAssistantIntent(
  intent: AssistantIntent,
  options: OfflineAssistantWorkflowOptions
): Promise<OfflineAssistantWorkflowOutcome> {
  const { gateway, snapshot, selectedBlockId, accessMode, connected, demo, performance, preset } = options;
  const resolution = resolveOfflineAssistantIntent(intent, snapshot, selectedBlockId, accessMode);

  if (resolution.kind === "response") {
    return {
      ...resolution,
      notice: resolution.intent === "inspect"
        ? "Current QC context summarized locally."
        : "Typed QC command examples are shown in chat."
    };
  }
  if (resolution.kind === "denied") throw new Error(resolution.detail);
  if (resolution.kind === "bypass") {
    if (!resolution.changed) {
      return {
        kind: "completed",
        detail: `${resolution.block.name} is already ${resolution.targetBypassed ? "bypassed" : "enabled"}.`
      };
    }
    if (!connected && !demo) throw new Error("Connect the Quad Cortex before changing bypass.");
    return {
      kind: "prepared",
      action: {
        kind: "bypass",
        block: resolution.block,
        targetBypassed: resolution.targetBypassed,
        label: resolution.label
      },
      detail: "I prepared a temporary Grid edit. Review it below before applying.",
      notice: "Temporary bypass edit is waiting for review."
    };
  }
  if (resolution.kind === "parameter") {
    if (!connected || demo) throw new Error("Connect the Quad Cortex before preparing a live parameter edit.");
    const prepared = await prepareAssistantParameterEdit(
      gateway,
      snapshot,
      resolution.block,
      resolution.parameter,
      resolution.value
    );
    return {
      kind: "prepared",
      action: {
        kind: "parameter",
        block: prepared.details,
        parameter: prepared.parameter,
        value: prepared.normalized,
        label: prepared.label
      },
      detail: "I prepared a temporary parameter edit. Review it below before applying.",
      notice: "Temporary parameter edit is waiting for review."
    };
  }
  if (resolution.kind === "bank") {
    const detail = await performance.navigateBank(resolution.direction, true);
    return { kind: "completed", detail: detail ?? "Bank changed." };
  }
  if (resolution.kind === "recall") {
    return { kind: "completed", detail: await preset.recallLocation(resolution.location) };
  }

  if (demo && resolution.command.kind === "scene") {
    await performance.selectScene(resolution.command.scene, true);
    return { kind: "completed", detail: `Scene ${sceneLetter(resolution.command.scene)} selected in the preview.` };
  }
  const detail = await performance.runAssistantDeviceCommand(resolution.command, true);
  return { kind: "completed", detail: detail ?? "Performance command completed." };
}

export function offlineAssistantEditConfirmation(action: PreparedOfflineAssistantAction): string {
  return `${action.label}?\n\nThis changes the live Grid but does not save the preset.`;
}

/** Apply a previously reviewed assistant edit through the shared app workflows. */
export async function applyPreparedOfflineAssistantAction(
  action: PreparedOfflineAssistantAction,
  performance: OfflineAssistantPerformancePort,
  parameter: OfflineAssistantParameterPort
): Promise<string> {
  if (action.kind === "bypass") {
    return await performance.setBlockBypass(action.block, action.targetBypassed, true)
      ?? `${action.block.name} ${action.targetBypassed ? "bypassed" : "enabled"}.`;
  }
  return await parameter.applyResolvedParameter(action.block, action.parameter, action.value, true)
    ?? `${action.block.name} · ${action.parameter.name} already has that value.`;
}
