import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFMedia } from "../../EFMedia";
import { AssetMediaEngine } from "../AssetMediaEngine";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

export const makeAudioInitSegmentFetchTask = (
  host: EFMedia,
): Task<readonly [MediaEngine | undefined], ArrayBuffer | undefined> => {
  return new Task(host, {
    args: () => [host.mediaEngineTask.value] as const,
    onError: (error) => {
      // Only log unexpected errors - 401/auth errors, missing audio, no valid source, file not found, and fetch failures are handled gracefully
      if (
        error instanceof Error &&
        !error.message.includes("401") &&
        !error.message.includes("Unauthorized") &&
        !error.message.includes("audio rendition") &&
        error.message !== "No valid media source" &&
        !error.message.includes("File not found") &&
        !error.message.includes("is not valid JSON") &&
        !error.message.includes("Failed to fetch")
      ) {
        console.error("audioInitSegmentFetchTask error", error);
      }
    },
    onComplete: (_value) => {},
    task: async ([mediaEngineValue], { signal }) => {
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
      const audioRendition = mediaEngine.getAudioRendition();

      // Return undefined if no audio rendition available (video-only asset)
      if (!audioRendition) {
        return undefined;
      }

      // Check if the track exists in AssetMediaEngine data before fetching init segment
      // This prevents fetch errors when tracks don't exist
      if (mediaEngine instanceof AssetMediaEngine) {
        const trackData = mediaEngine.data?.[audioRendition.trackId];
        if (!trackData || !trackData.initSegment) {
          // Track doesn't exist or has no init segment - don't fetch
          return undefined;
        }
      }

      try {
        return await mediaEngine.fetchInitSegment(audioRendition, signal);
      } catch (error) {
        // Handle 401/auth errors and missing segments gracefully
        // Return undefined instead of throwing to prevent error propagation
        if (
          error instanceof Error &&
          (error.message.includes("401") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("Failed to load resource") ||
            error.message.includes("Init segment not found") ||
            error.message.includes("Track not found") ||
            error.message.includes("Failed to fetch"))
        ) {
          return undefined;
        }
        // Re-throw unexpected errors
        throw error;
      }
    },
  });
};
