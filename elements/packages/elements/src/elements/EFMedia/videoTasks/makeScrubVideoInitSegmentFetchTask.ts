import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFVideo } from "../../EFVideo";
import { AssetMediaEngine } from "../AssetMediaEngine";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

type ScrubVideoInitSegmentFetchTask = Task<readonly [MediaEngine | undefined], ArrayBuffer>;

export const makeScrubVideoInitSegmentFetchTask = (
  host: EFVideo,
): ScrubVideoInitSegmentFetchTask => {
  // Capture task reference for use in onError
  let task: ScrubVideoInitSegmentFetchTask;

  task = new Task(host, {
    args: () => [host.mediaEngineTask.value] as const,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete BEFORE the promise is rejected.
      // This prevents unhandled rejection when hostUpdate() triggers _performTask() without awaiting.
      task.taskComplete.catch(() => {});
      
      // Don't log AbortErrors - these are expected when tasks are cancelled
      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("signal is aborted") ||
          error.message?.includes("The user aborted a request")
        ))
      ) {
        return;
      }
      // Only log unexpected errors - missing scrub rendition is handled gracefully above
      if (error instanceof Error && error.message !== "No scrub rendition available") {
        console.error("scrubVideoInitSegmentFetchTask error", error);
      }
    },
    onComplete: (_value) => {},
    task: async ([mediaEngineValue], { signal }) => {
      // Check if media engine task has errored (no valid source) before attempting to use it
      if (host.mediaEngineTask.error || !mediaEngineValue) {
        return undefined as any;
      }
      
      let mediaEngine;
      try {
        mediaEngine = await getLatestMediaEngine(host, signal);
      } catch (error) {
        // If media engine task failed (no valid source), return undefined silently
        if (error instanceof Error && error.message === "No valid media source") {
          return undefined as any;
        }
        // Re-throw unexpected errors
        throw error;
      }
      
      // Return undefined if no valid media engine (no valid source)
      if (!mediaEngine) {
        return undefined as any;
      }

      // Get scrub rendition using the proper interface method
      const scrubRendition = mediaEngine.getScrubVideoRendition();

      if (!scrubRendition) {
        // No scrub rendition available - this is fine, scrub is optional
        // Return undefined instead of throwing to avoid error noise
        return undefined as any; // Task expects ArrayBuffer, but undefined indicates unavailable
      }

      // Check if the track exists in AssetMediaEngine data before fetching init segment
      // Scrub track uses trackId -1, which is handled specially, so skip check for that
      if (mediaEngine instanceof AssetMediaEngine && scrubRendition.trackId !== -1) {
        // @ts-expect-error - data is protected but we need to check track existence
        const trackData = (mediaEngine as any).data?.[scrubRendition.trackId];
        if (!trackData || !trackData.initSegment) {
          // Track doesn't exist or has no init segment - don't fetch
          return undefined as any;
        }
      }

      // Try to fetch the init segment, but return undefined if it fails
      try {
        return await mediaEngine.fetchInitSegment(
          {
            ...scrubRendition,
            src: mediaEngine.src, // Ensure src is set
          },
          signal,
        );
      } catch (error) {
        // If aborted, re-throw to propagate cancellation
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        // If init segment doesn't exist or fetch fails, return undefined gracefully
        if (
          error instanceof Error &&
          (error.message.includes("Init segment not found") ||
            error.message.includes("Track not found") ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("File not found"))
        ) {
          return undefined as any;
        }
        // Re-throw unexpected errors
        throw error;
      }
    },
  });

  return task;
};
