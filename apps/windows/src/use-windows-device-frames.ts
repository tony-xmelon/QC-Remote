import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { listen } from "@tauri-apps/api/event";
import type { NativeStateFrames, PresetSnapshot } from "@qc-remote/client";
import type { QcStateUpdate } from "@qc-remote/core";
import { consumeQcNativeStateFrame } from "@qc-remote/ui";

type NativeFrame = NativeStateFrames<QcStateUpdate>["frames"][number];

export interface WindowsDeviceFrameSession {
  enabled: boolean;
  sequence: MutableRefObject<number>;
  available: MutableRefObject<boolean>;
  consume(states: readonly QcStateUpdate[], observedAt?: number): unknown;
  setSnapshot: Dispatch<SetStateAction<PresetSnapshot>>;
  onStreamRestart(): void;
}

/** Windows-only subscription glue; all state reduction remains in shared UI/core. */
export function useWindowsDeviceFrames({
  enabled, sequence, available, consume, setSnapshot, onStreamRestart
}: WindowsDeviceFrameSession) {
  useEffect(() => {
    if (!enabled) {
      setSnapshot((current) => current.tempoPulseEpochMs === undefined
        ? current
        : { ...current, tempoPulseEpochMs: undefined });
      return;
    }
    let disposed = false;
    let detach: (() => void) | undefined;
    void listen<NativeFrame>("qc-state-frame", ({ payload: frame }) => {
      if (!disposed) consumeQcNativeStateFrame(frame, { sequence, available, consume, setSnapshot, onStreamRestart });
    }).then((unlisten) => {
      if (disposed) unlisten();
      else detach = unlisten;
    }).catch(() => { available.current = false; });
    return () => {
      disposed = true;
      detach?.();
    };
  }, [available, consume, enabled, onStreamRestart, sequence, setSnapshot]);
}
