import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFMedia } from "../../EFMedia";
import { AssetMediaEngine } from "../AssetMediaEngine";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

export const makeAudioSegmentFetchTask = (
  host: EFMedia,
): Task<
  readonly [MediaEngine | undefined, number | undefined],
  ArrayBuffer | undefined
> => {
  return new Task(host, {
    args: () =>
      [host.mediaEngineTask.value, host.audioSegmentIdTask.value] as const,
    onError: (error) => {
      // Don't log errors when there's no valid media source, file not found, or fetch failures - these are expected
      if (error instanceof Error && (
        error.message === "No valid media source" ||
        error.message.includes("File not found") ||
        error.message.includes("is not valid JSON") ||
        error.message.includes("Failed to fetch")
      )) {
        return;
      }
      console.error("audioSegmentFetchTask error", error);
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
      
      // Return undefined if no valid media engine (no valid source)
      if (!mediaEngine) {
        return undefined;
      }
      const audioRendition = mediaEngine.getAudioRendition();

      // Return undefined if no audio rendition available (video-only asset)
      // Check this BEFORE awaiting segmentId to avoid unnecessary work
      if (!audioRendition) {
        return undefined;
      }

      const segmentId = await host.audioSegmentIdTask.taskComplete;
      if (signal.aborted) return undefined;

      // Return undefined if no segment ID available
      if (segmentId === undefined) {
        return undefined;
      }

      // Check if the segment exists in the media engine data before fetching
      // This prevents fetch errors when segments don't exist in AssetMediaEngine
      if (mediaEngine instanceof AssetMediaEngine) {
        const trackData = mediaEngine.data?.[audioRendition.trackId];
        if (!trackData?.segments || segmentId >= trackData.segments.length) {
          // Segment doesn't exist in the data - don't fetch
          return undefined;
        }
      }

      // Try to fetch the segment, but return undefined if it fails
      // This handles cases where the media engine has metadata but the file doesn't exist
      try {
        return await mediaEngine.fetchMediaSegment(segmentId, audioRendition, signal);
      } catch (error) {
        // If segment doesn't exist or fetch fails, return undefined gracefully
        // This prevents error propagation when files are missing (test environment)
        if (
          error instanceof Error &&
          (error.message.includes("Media segment not found") ||
            error.message.includes("Track not found") ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("File not found"))
        ) {
          return undefined;
        }
        // Re-throw unexpected errors
        throw error;
      }
    },
  });
};
