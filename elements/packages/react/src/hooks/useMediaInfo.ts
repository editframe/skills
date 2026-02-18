import type { ReactiveController, ReactiveControllerHost } from "lit";
import { useEffect, useState } from "react";

export interface MediaInfo {
  intrinsicDurationMs: number | undefined;
  loading: boolean;
}

type MediaElement = ReactiveControllerHost & {
  intrinsicDurationMs: number | undefined;
  isConnected: boolean;
};

export class MediaInfoController implements ReactiveController {
  #isConnected = false;
  #lastIntrinsicDurationMs: number | undefined = undefined;

  constructor(
    private host: MediaElement,
    private setMediaInfo: React.Dispatch<React.SetStateAction<MediaInfo>>,
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

    const intrinsicDurationMs = this.host.intrinsicDurationMs;

    if (intrinsicDurationMs !== this.#lastIntrinsicDurationMs) {
      this.#lastIntrinsicDurationMs = intrinsicDurationMs;
      this.#updateReactState();
    }
  }

  #updateReactState(): void {
    const intrinsicDurationMs = this.host.intrinsicDurationMs;
    this.setMediaInfo({
      intrinsicDurationMs,
      loading: intrinsicDurationMs === undefined,
    });
  }

  syncNow(): void {
    this.#updateReactState();
  }
}

export const useMediaInfo = (
  mediaRef: React.RefObject<MediaElement | null>,
) => {
  const [mediaInfo, setMediaInfo] = useState<MediaInfo>({
    intrinsicDurationMs: undefined,
    loading: true,
  });

  useEffect(() => {
    if (!mediaRef.current) return;

    const controller = new MediaInfoController(mediaRef.current, setMediaInfo);

    if (mediaRef.current.isConnected) {
      controller.hostConnected();
      controller.syncNow();
    }

    return () => {
      controller.hostDisconnected();
    };
  }, [mediaRef.current]);

  return mediaInfo;
};
