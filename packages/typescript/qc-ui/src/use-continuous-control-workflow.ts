import { useCallback, useEffect, useRef } from "react";
import type { DeviceActionResult, GatewayTransport, PresetSnapshot } from "@qc-remote/client";
import type { DeviceHistoryEntry } from "./use-device-history";
import type { QcController } from "./use-qc-controller";

type TempoSource = "Encoder" | "Tap";

export interface ContinuousControlWorkflowOptions {
  controller: QcController;
  gateway: GatewayTransport;
  connected: boolean;
  demo: boolean;
  reconcile(snapshot: PresetSnapshot): void;
  recordHistory?(entry: DeviceHistoryEntry): void;
  notice(message: string): void;
  fail(error: unknown): void;
}

type TempoQueue = {
  timer?: number;
  running: boolean;
  expected?: number;
  original?: number;
  target?: number;
  source: TempoSource;
  token?: ReturnType<QcController["beginTempo"]>;
};

type VolumeQueue = {
  timer?: number;
  running: boolean;
  expected?: number;
  target?: number;
  desired?: number;
  /**
   * The last value handed to the device. Master Volume is acknowledged on
   * transport acceptance and only later echoed by the QC, so the observed
   * snapshot lags every write; this is what tells the accumulator whether the
   * device has caught up yet.
   */
  written?: number;
};

type LatestValueQueue = {
  timer?: number;
  running: boolean;
  expected?: number;
  target?: number;
};

async function drainLatestValue<Q extends LatestValueQueue>(queue: Q, handlers: {
  write(target: number, expected: number, queue: Q): Promise<DeviceActionResult>;
  accept(result: DeviceActionResult, target: number, queue: Q): void;
  drained?(queue: Q): void;
  error(error: unknown, queue: Q): void | Promise<void>;
  idle?(queue: Q): void;
  reschedule(): void;
}) {
  if (queue.running || queue.target === undefined || queue.expected === undefined) return;
  queue.running = true;
  if (queue.timer !== undefined) window.clearTimeout(queue.timer);
  queue.timer = undefined;
  try {
    while (queue.target !== undefined) {
      const target = queue.target;
      const expected = queue.expected;
      queue.target = undefined;
      const result = await handlers.write(target, expected, queue);
      handlers.accept(result, target, queue);
    }
    handlers.drained?.(queue);
  } catch (error) {
    await handlers.error(error, queue);
  } finally {
    queue.running = false;
    if (queue.target !== undefined) queue.timer = window.setTimeout(handlers.reschedule, 0);
    else {
      queue.expected = undefined;
      handlers.idle?.(queue);
    }
  }
}

/** Coalesced realtime encoders with one in-flight write and latest-value wins. */
export function useContinuousControlWorkflow(options: ContinuousControlWorkflowOptions) {
  const { controller, gateway, connected, demo, reconcile, recordHistory, notice, fail } = options;
  const tempo = useRef<TempoQueue>({ running: false, source: "Encoder" });
  const volume = useRef<VolumeQueue>({ running: false });

  const drainTempo = useCallback(async () => {
    const queue = tempo.current;
    await drainLatestValue(queue, {
      write: (target, expected) => gateway.setTempo(target, expected, controller.snapshotRef.current.presetName),
      accept: (result, target, current) => {
        const source = current.source;
        current.expected = result.snapshot?.tempo ?? target;
        if (result.snapshot) reconcile(controller.reconcileSnapshot(result.snapshot));
        notice(result.detail ?? `${source} tempo set to ${target} BPM and verified on the Quad Cortex.`);
      },
      drained: (current) => {
        const original = current.original;
        const finalValue = current.expected;
        if (original !== undefined && finalValue !== undefined && original !== finalValue) {
          recordHistory?.({
            label: "tempo change",
            execute: (current) => gateway.setTempo(original, finalValue, current.presetName),
            redo: (current) => gateway.setTempo(finalValue, original, current.presetName)
          });
        }
      },
      error: async (error, current) => {
        if (current.token) controller.failCommand(current.token);
        fail(error);
        try { reconcile(controller.reconcileSnapshot(await gateway.currentSnapshot())); } catch { /* Preserve the command error. */ }
      },
      idle: (current) => { current.original = undefined; },
      reschedule: () => void drainTempo()
    });
  }, [controller, fail, gateway, notice, reconcile, recordHistory]);

  const queueTempo = useCallback((requestedBpm: number, source: TempoSource = "Encoder") => {
    const bpm = Math.max(40, Math.min(240, Math.round(requestedBpm)));
    if (demo) {
      controller.settleCommand(controller.beginTempo(bpm));
      notice(`Demo: ${source.toLocaleLowerCase()} tempo ${bpm} BPM.`);
      return;
    }
    if (!connected) { notice("Connect the Quad Cortex before changing tempo."); return; }
    const queue = tempo.current;
    if (queue.expected === undefined) {
      queue.expected = controller.snapshotRef.current.tempo;
      queue.original = queue.expected;
    }
    queue.target = bpm;
    queue.source = source;
    queue.token = controller.beginTempo(bpm);
    notice(`${source} tempo: ${bpm} BPM…`);
    if (queue.timer !== undefined) window.clearTimeout(queue.timer);
    if (!queue.running) queue.timer = window.setTimeout(() => void drainTempo(), source === "Tap" ? 180 : 40);
  }, [connected, controller, demo, drainTempo, notice]);

  const adjustTempo = useCallback((delta: number) => {
    queueTempo((tempo.current.target ?? controller.snapshotRef.current.tempo) + delta, "Encoder");
  }, [controller, queueTempo]);

  const drainVolume = useCallback(async () => {
    const queue = volume.current;
    await drainLatestValue(queue, {
      // Master Volume completes on transport acceptance and is then reconciled
      // by the QC's pushed type-17 echo. Always guard against the latest
      // authoritative snapshot; an optimistic UI value must never become the
      // expected device value for the next encoder step.
      write: (target, _expected, current) => {
        current.written = target;
        return gateway.setMasterVolume(target, controller.snapshotRef.current.masterVolume);
      },
      accept: (result, target, current) => {
        current.expected = result.snapshot?.masterVolume ?? controller.snapshotRef.current.masterVolume;
        if (result.snapshot) reconcile(result.snapshot);
        notice(result.detail ?? `Master Volume set to ${target}.`);
      },
      error: async (error) => {
        fail(error);
        try { reconcile(await gateway.currentSnapshot()); } catch { /* Preserve the command error. */ }
      },
      reschedule: () => void drainVolume()
    });
  }, [fail, gateway, notice, reconcile]);

  const adjustMasterVolume = useCallback((delta: number) => {
    const queue = volume.current;
    const observed = controller.snapshotRef.current.masterVolume;
    // Re-seed the accumulator from the device only once the device has caught
    // up with what it was last told. Re-seeding while an echo is still in
    // flight silently discards every step taken since that write: a six-step
    // encoder sweep landed three steps short, and the lamp sat on "awaiting
    // device echo" because the value it was waiting for had been dropped.
    const deviceHasCaughtUp = queue.written === undefined || observed === queue.written;
    const idle = !queue.running && queue.target === undefined && queue.expected === undefined;
    if (idle && deviceHasCaughtUp && queue.desired !== observed) {
      queue.desired = observed;
      queue.written = undefined;
    }
    const value = Math.max(0, Math.min(100, Math.round((queue.desired ?? observed) + delta)));
    queue.desired = value;
    if (demo) {
      reconcile({ ...controller.snapshotRef.current, masterVolume: value });
      notice(`Demo: Master Volume ${value}.`);
      return;
    }
    if (!connected) { notice("Connect the Quad Cortex before changing Master Volume."); return; }
    if (queue.expected === undefined) queue.expected = controller.snapshotRef.current.masterVolume;
    queue.target = value;
    notice(`Master Volume: ${value}…`);
    if (queue.timer !== undefined) window.clearTimeout(queue.timer);
    if (!queue.running) queue.timer = window.setTimeout(() => void drainVolume(), 40);
  }, [connected, controller, demo, drainVolume, notice, reconcile]);

  const cancel = useCallback(() => {
    if (tempo.current.timer !== undefined) window.clearTimeout(tempo.current.timer);
    if (volume.current.timer !== undefined) window.clearTimeout(volume.current.timer);
    tempo.current.timer = undefined;
    tempo.current.target = undefined;
    volume.current.timer = undefined;
    volume.current.target = undefined;
    volume.current.written = undefined;
  }, []);

  useEffect(() => cancel, [cancel]);
  return { queueTempo, adjustTempo, adjustMasterVolume, cancel };
}
