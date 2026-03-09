import type { EFTimegroup } from "@editframe/elements";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { useEffect, useRef, useState } from "react";

interface TimeInfo {
  ownCurrentTimeMs: number;
  durationMs: number;
  percentComplete: number;
}

class CurrentTimeController implements ReactiveController {
  #isConnected = false;
  #lastOwnCurrentTimeMs = Number.NaN;
  #lastDurationMs = Number.NaN;

  constructor(
    private host: {
      ownCurrentTimeMs: number;
      durationMs: number;
    } & ReactiveControllerHost,
    private setCurrentTime: React.Dispatch<React.SetStateAction<TimeInfo>>,
  ) {
    this.host.addController(this);
  }

  hostConnected(): void {
    this.#isConnected = true;
  }

  hostDisconnected(): void {
    this.#isConnected = false;
    this.host.removeController(this);
  }

  hostUpdated(): void {
    if (!this.#isConnected) return;

    const { ownCurrentTimeMs, durationMs } = this.host;

    if (ownCurrentTimeMs !== this.#lastOwnCurrentTimeMs || durationMs !== this.#lastDurationMs) {
      this.#lastOwnCurrentTimeMs = ownCurrentTimeMs;
      this.#lastDurationMs = durationMs;
      this.#updateReactState();
    }
  }

  #updateReactState(): void {
    const { ownCurrentTimeMs, durationMs } = this.host;
    this.setCurrentTime({
      ownCurrentTimeMs,
      durationMs,
      percentComplete: durationMs > 0 ? ownCurrentTimeMs / durationMs : 0,
    });
  }

  syncNow(): void {
    this.#updateReactState();
  }
}

export const useTimingInfo = (
  timegroupRef: React.RefObject<EFTimegroup | null> = useRef<EFTimegroup>(null),
) => {
  const [timeInfo, setTimeInfo] = useState<TimeInfo>({
    ownCurrentTimeMs: 0,
    durationMs: 0,
    percentComplete: 0,
  });

  useEffect(() => {
    if (!timegroupRef.current) {
      throw new Error("Timegroup ref not set");
    }

    const controller = new CurrentTimeController(timegroupRef.current, setTimeInfo);

    if (timegroupRef.current.isConnected) {
      controller.hostConnected();
      controller.syncNow();
    }

    return () => {
      controller.hostDisconnected();
    };
  }, [timegroupRef.current]);

  return { ...timeInfo, ref: timegroupRef };
};
