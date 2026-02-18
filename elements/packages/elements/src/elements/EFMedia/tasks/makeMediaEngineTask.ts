import type { MediaEngine } from "../../../transcoding/types";
import type { EFMedia } from "../../EFMedia";

/**
 * Get the latest media engine from an EFMedia element.
 * Uses the new async getMediaEngine() method.
 */
export const getLatestMediaEngine = async (
  host: EFMedia,
  signal: AbortSignal,
): Promise<MediaEngine | undefined> => {
  try {
    return await host.getMediaEngine(signal);
  } catch (error) {
    // If aborted, re-throw to propagate cancellation
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    // If the error is "No valid media source", return undefined instead of throwing
    if (error instanceof Error && error.message === "No valid media source") {
      return undefined;
    }
    // For other errors, re-throw
    throw error;
  }
};

/**
 * Handle completion of media engine task - triggers necessary updates.
 * @deprecated Use EFMedia.getMediaEngine() instead - updates are handled internally.
 */
export const handleMediaEngineComplete = (host: EFMedia): void => {
  host.requestUpdate("intrinsicDurationMs");
  host.requestUpdate("ownCurrentTimeMs");

  if (host.rootTimegroup) {
    queueMicrotask(() => {
      host.rootTimegroup?.requestUpdate("ownCurrentTimeMs");
      host.rootTimegroup?.requestUpdate("durationMs");
    });
  }
};
