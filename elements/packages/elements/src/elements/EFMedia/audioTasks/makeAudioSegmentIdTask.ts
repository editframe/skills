import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFMedia } from "../../EFMedia";
import { AssetMediaEngine } from "../AssetMediaEngine";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

export const makeAudioSegmentIdTask = (
  host: EFMedia,
): Task<readonly [MediaEngine | undefined, number], number | undefined> => {
  return new Task(host, {
    args: () => [host.mediaEngineTask.value, host.desiredSeekTimeMs] as const,
    onError: (error) => {
      // Don't log errors when there's no valid media source or file not found - these are expected
      if (error instanceof Error && (
        error.message === "No valid media source" ||
        error.message.includes("File not found") ||
        error.message.includes("is not valid JSON")
      )) {
        return;
      }
      console.error("audioSegmentIdTask error", error);
    },
    onComplete: (_value) => {},
    task: async ([mediaEngineValue, targetSeekTimeMs], { signal }) => {
      // Check if media engine task has errored (no valid source) before attempting to use it
      if (host.mediaEngineTask.error || !mediaEngineValue) {
        return undefined;
      }
      
      let mediaEngine;
      try {
        mediaEngine = await getLatestMediaEngine(host, signal);
      } catch (error) {
        // If media engine task failed (no valid source), return undefined silently
        if (error instanceof Error && error.message === "No valid media source") {
          return undefined;
        }
        // Re-throw unexpected errors
        throw error;
      }
      
      // Return undefined if no valid media engine (no valid source)
      if (!mediaEngine) {
        return undefined;
      }
      signal.throwIfAborted();

      const audioRendition = mediaEngine.getAudioRendition();

      // Return undefined if no audio rendition available (video-only asset)
      if (!audioRendition) {
        return undefined;
      }

      // Check if the track exists in AssetMediaEngine data before computing segment ID
      // This prevents computing segment IDs for tracks that don't exist
      if (mediaEngine instanceof AssetMediaEngine) {
        const trackData = mediaEngine.data?.[audioRendition.trackId];
        if (!trackData || !trackData.segments || trackData.segments.length === 0) {
          // Track doesn't exist or has no segments - don't compute segment ID
          return undefined;
        }
      }

      try {
        return mediaEngine.computeSegmentId(targetSeekTimeMs, audioRendition);
      } catch (error) {
        // If track doesn't exist or segment computation fails, return undefined gracefully
        if (
          error instanceof Error &&
          (error.message.includes("Track not found") ||
            error.message.includes("Track ID is required"))
        ) {
          return undefined;
        }
        // Re-throw unexpected errors
        throw error;
      }
    },
  });
};
