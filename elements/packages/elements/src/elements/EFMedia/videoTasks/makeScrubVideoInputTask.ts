import { Task } from "@lit/task";

import { EFMedia } from "../../EFMedia";
import type { EFVideo } from "../../EFVideo";
import { BufferedSeekingInput } from "../BufferedSeekingInput";
import type { InputTask } from "../shared/MediaTaskUtils";

export const makeScrubVideoInputTask = (host: EFVideo): InputTask => {
  // Capture task reference for use in onError
  let task: InputTask;

  task = new Task<
    readonly [ArrayBuffer | undefined, ArrayBuffer | undefined],
    BufferedSeekingInput | undefined
  >(host, {
    args: () =>
      [
        host.scrubVideoInitSegmentFetchTask.value,
        host.scrubVideoSegmentFetchTask.value,
      ] as const,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete BEFORE the promise is rejected.
      // This prevents unhandled rejection when hostUpdate() triggers _performTask() without awaiting.
      task.taskComplete.catch(() => {});
      
      // Don't log AbortErrors - these are intentional cancellations when element is disconnected
      const isAbortError = 
        error instanceof DOMException && error.name === "AbortError" ||
        error instanceof Error && (
          error.name === "AbortError" ||
          error.message.includes("signal is aborted") ||
          error.message.includes("The user aborted a request")
        );
      
      if (isAbortError) {
        return;
      }
      
      // Only log unexpected errors - missing scrub segments, fetch failures, and file not found are handled gracefully
      if (
        error instanceof Error &&
        error.message !== "Scrub init segment or segment is not available" &&
        !error.message.includes("Failed to fetch") &&
        !error.message.includes("File not found") &&
        !error.message.includes("is not valid JSON")
      ) {
        console.error("scrubVideoInputTask error", error);
      }
    },
    onComplete: (_value) => {},
    task: async (_, { signal }) => {
      // Check if media engine task has errored (no valid source) before attempting to use it
      if (host.mediaEngineTask.error) {
        return undefined;
      }
      
      // Await init segment with proper error handling for AbortErrors
      let initSegment: ArrayBuffer | undefined;
      try {
        initSegment = await host.scrubVideoInitSegmentFetchTask.taskComplete;
      } catch (error) {
        // If aborted, propagate the abort
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        // Other errors mean init segment failed - return undefined
        return undefined;
      }
      
      // Check for abort after awaiting init segment
      signal?.throwIfAborted();

      // Await segment with proper error handling for AbortErrors
      let segment: ArrayBuffer | undefined;
      try {
        segment = await host.scrubVideoSegmentFetchTask.taskComplete;
      } catch (error) {
        // If aborted, propagate the abort
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        // Other errors mean segment failed - return undefined
        return undefined;
      }
      
      // Check for abort after awaiting segment
      signal?.throwIfAborted();

      if (!initSegment || !segment) {
        // Scrub segments not available - scrub is optional, return undefined gracefully
        return undefined;
      }

      // Get startTimeOffsetMs from the scrub rendition if available
      let mediaEngine;
      try {
        mediaEngine = await host.mediaEngineTask.taskComplete;
      } catch (error) {
        // If media engine task failed (no valid source), return undefined silently
        if (error instanceof Error && error.message === "No valid media source") {
          return undefined;
        }
        // Re-throw unexpected errors
        throw error;
      }
      
      // Check for abort after awaiting media engine
      signal?.throwIfAborted();

      const scrubRendition = mediaEngine.getScrubVideoRendition();
      const startTimeOffsetMs = scrubRendition?.startTimeOffsetMs;

      const arrayBuffer = await new Blob([initSegment, segment]).arrayBuffer();
      
      // Check for abort after expensive arrayBuffer operation
      signal?.throwIfAborted();

      const input = new BufferedSeekingInput(arrayBuffer, {
        videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
        audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
        startTimeOffsetMs,
      });
      return input;
    },
  });

  return task;
};
