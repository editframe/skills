import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFVideo } from "../../EFVideo";
import { AssetMediaEngine } from "../AssetMediaEngine";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

type ScrubVideoSegmentFetchTask = Task<
  readonly [MediaEngine | undefined, number | undefined],
  ArrayBuffer
>;

export const makeScrubVideoSegmentFetchTask = (
  host: EFVideo,
): ScrubVideoSegmentFetchTask => {
  // Capture task reference for use in onError
  let task: ScrubVideoSegmentFetchTask;

  task = new Task(host, {
    args: () =>
      [host.mediaEngineTask.value, host.scrubVideoSegmentIdTask.value] as const,
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
      // Only log unexpected errors - missing scrub rendition/segment is handled gracefully above
      if (
        error instanceof Error &&
        error.message !== "Scrub segment ID is not available for video" &&
        error.message !== "No scrub rendition available"
      ) {
        console.error("scrubVideoSegmentFetchTask error", error);
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
      const segmentId = await host.scrubVideoSegmentIdTask.taskComplete;
      
      // Check for abort after awaiting segment ID
      signal?.throwIfAborted();
      
      if (segmentId === undefined) {
        // Scrub segment ID not available - scrub is optional, return undefined
        return undefined as any; // Task expects ArrayBuffer, but undefined indicates unavailable
      }

      // Get scrub rendition using the proper interface method
      const scrubRendition = mediaEngine.getScrubVideoRendition();

      if (!scrubRendition) {
        // No scrub rendition available - this is fine, scrub is optional
        // Return undefined instead of throwing to avoid error noise
        return undefined as any; // Task expects ArrayBuffer, but undefined indicates unavailable
      }

      // Check if the segment exists in AssetMediaEngine data before fetching
      // Scrub track uses trackId -1, so check for that
      if (mediaEngine instanceof AssetMediaEngine && scrubRendition.trackId !== -1) {
        // @ts-expect-error - data is protected but we need to check segment existence
        const trackData = (mediaEngine as any).data?.[scrubRendition.trackId];
        if (!trackData?.segments || segmentId >= trackData.segments.length) {
          // Segment doesn't exist in the data - don't fetch
          return undefined as any;
        }
      }

      // Try to fetch the segment, but return undefined if it fails
      try {
        return await mediaEngine.fetchMediaSegment(
          segmentId,
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
        // If segment doesn't exist or fetch fails, return undefined gracefully
        if (
          error instanceof Error &&
          (error.message.includes("Media segment not found") ||
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

  // CRITICAL: Attach .catch() handler IMMEDIATELY to prevent unhandled rejections.
  // This must be done synchronously after task creation, before any updates can trigger run().
  // When hostUpdate() triggers _performTask() -> run(), the rejection needs to already have a handler.
  task.taskComplete.catch(() => {});

  return task;
};
