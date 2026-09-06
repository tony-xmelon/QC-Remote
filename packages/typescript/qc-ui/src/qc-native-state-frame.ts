import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { NativeStateFrame, PresetSnapshot } from "@ndsp-qc/client";
import { synchronizeTempoPulseEpoch, type QcStateUpdate } from "@ndsp-qc/core";

export interface QcNativeStateFrameConsumer {
  sequence: MutableRefObject<number>;
  available?: MutableRefObject<boolean>;
  consume(states: readonly QcStateUpdate[], observedAt?: number): unknown;
  setSnapshot: Dispatch<SetStateAction<PresetSnapshot>>;
  /**
   * Called when the frame stream restarts, which means a replacement producer
   * is now feeding it. Frames are deltas, so the host should pull a full
   * snapshot: everything that changed while the streams were swapping is not
   * in any frame either side will send.
   */
  onStreamRestart?(): void;
}

/**
 * Apply the ordering, timestamp, and tempo-clock contract shared by every
 * native frame source. Platform adapters only subscribe to their OS event API.
 *
 * The sequence counter belongs to the producer, not to the session: a broker
 * that is replaced - after a crash, a reset, or a reconnect - starts counting
 * again from one. Treating that as "already seen" silently discarded every
 * frame from the new producer forever, freezing the UI against a device that
 * was still perfectly healthy. Within one producer the sequence only ever
 * rises, so a sequence that falls is unambiguous evidence of a new one.
 */
export function consumeQcNativeStateFrame(
  frame: NativeStateFrame<QcStateUpdate>,
  consumer: QcNativeStateFrameConsumer
): boolean {
  const restarted = frame.sequence < consumer.sequence.current;
  if (!restarted && frame.sequence <= consumer.sequence.current) return false;
  if (consumer.available) consumer.available.current = true;
  consumer.sequence.current = frame.sequence;
  if (restarted) consumer.onStreamRestart?.();
  consumer.consume(frame.states, frame.observedAt);
  if (frame.tempoClock) {
    const tick = Math.max(0, frame.tempoClock.currentTick ?? 0);
    consumer.setSnapshot((current) => {
      const epoch = synchronizeTempoPulseEpoch(
        current.tempoPulseEpochMs, frame.observedAt, tick, current.tempo
      );
      return epoch === current.tempoPulseEpochMs
        ? current
        : { ...current, tempoPulseEpochMs: epoch };
    });
  }
  return true;
}
