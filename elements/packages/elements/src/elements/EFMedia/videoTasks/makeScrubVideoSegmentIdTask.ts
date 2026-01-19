import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFVideo } from "../../EFVideo";
import { AssetMediaEngine } from "../AssetMediaEngine";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

export const makeScrubVideoSegmentIdTask = (
  host: EFVideo,
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
      console.error("scrubVideoSegmentIdTask error", error);
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
      signal.throwIfAborted(); // Abort if a new seek started

      // Get scrub rendition using the proper interface method
      const scrubRendition = mediaEngine.getScrubVideoRendition();

      if (!scrubRendition) {
        return undefined; // No scrub rendition available
      }

      // Check if the track exists in AssetMediaEngine data before computing segment ID
      // Scrub track uses trackId -1, which is handled specially, so skip check for that
      if (mediaEngine instanceof AssetMediaEngine && scrubRendition.trackId !== -1) {
        const trackData = mediaEngine.data?.[scrubRendition.trackId];
        if (!trackData || !trackData.segments || trackData.segments.length === 0) {
          // Track doesn't exist or has no segments - don't compute segment ID
          return undefined;
        }
      }

      try {
        return mediaEngine.computeSegmentId(targetSeekTimeMs, {
          ...scrubRendition,
          src: mediaEngine.src, // Ensure src is set
        });
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
