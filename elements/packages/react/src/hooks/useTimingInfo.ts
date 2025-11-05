import type { EFTimegroup } from "@editframe/elements";
import type { Task } from "@lit/task";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { useEffect, useRef, useState } from "react";

interface TimeInfo {
  ownCurrentTimeMs: number;
  durationMs: number;
  percentComplete: number;
}

class CurrentTimeController implements ReactiveController {
  #lastTaskPromise: Promise<unknown> | null = null;
  #isConnected = false;

  constructor(
    private host: {
      ownCurrentTimeMs: number;
      durationMs: number;
      frameTask: Task<readonly unknown[], unknown>;
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
    this.#lastTaskPromise = null;
    this.host.removeController(this);
  }

  hostUpdated(): void {
    const currentTaskPromise = this.host.frameTask.taskComplete;

    // Detect if a new frame task has started (promise reference changed)
    if (currentTaskPromise !== this.#lastTaskPromise) {
      this.#lastTaskPromise = currentTaskPromise;

      // Wait for this specific task to complete, then update React
      // This is async so it doesn't block the update cycle
      currentTaskPromise
        .then(() => {
          // Only update if still connected
          if (this.#isConnected) {
            this.#updateReactState();
          }
        })
        .catch(() => {
          // Ignore task errors - we'll continue observing
        });
    }
  }

  #updateReactState(): void {
    // Always update to ensure React has the latest state
    this.setCurrentTime({
      ownCurrentTimeMs: this.host.ownCurrentTimeMs,
      durationMs: this.host.durationMs,
      percentComplete: this.host.ownCurrentTimeMs / this.host.durationMs,
    });
  }

  // Public method to manually trigger sync (for initialization)
  syncNow(): void {
    this.#updateReactState();
  }
}

export const useTimingInfo = (
  timegroupRef: React.RefObject<EFTimegroup> = useRef<EFTimegroup>(null),
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

    const controller = new CurrentTimeController(
      timegroupRef.current,
      setTimeInfo,
    );

    // Trigger initial update if the timegroup is already connected
    if (timegroupRef.current.isConnected) {
      controller.hostConnected();
      // Sync initial state immediately
      controller.syncNow();
    }

    // Cleanup function
    return () => {
      controller.hostDisconnected();
    };
  }, [timegroupRef.current]);

  return { ...timeInfo, ref: timegroupRef };
};
