import { Task } from "@lit/task";
import { EFMedia } from "../../EFMedia";
import { BufferedSeekingInput } from "../BufferedSeekingInput";
import type { InputTask } from "../shared/MediaTaskUtils";

export const makeAudioInputTask = (host: EFMedia): InputTask => {
  // Capture task reference for use in onError
  let task: InputTask;

  task = new Task<
    readonly [ArrayBuffer | undefined, ArrayBuffer | undefined],
    BufferedSeekingInput | undefined
  >(host, {
    args: () =>
      [
        host.audioInitSegmentFetchTask.value,
        host.audioSegmentFetchTask.value,
      ] as const,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete BEFORE the promise is rejected.
      // This prevents unhandled rejection when hostUpdate() triggers _performTask() without awaiting.
      task.taskComplete.catch(() => {});
      
      // Don't log AbortError - these are intentional request cancellations
      const isAbortError = 
        error instanceof DOMException && error.name === "AbortError" ||
        error instanceof Error && (
          error.name === "AbortError" ||
          error.message.includes("signal is aborted") ||
          error.message.includes("The user aborted a request")
        );
      
      // Don't log errors when there's no valid media source, file not found, or fetch failures - these are expected
      if (isAbortError || (error instanceof Error && (
        error.message === "No valid media source" ||
        error.message.includes("File not found") ||
        error.message.includes("is not valid JSON") ||
        error.message.includes("Failed to fetch")
      ))) {
        return;
      }
      console.error("audioInputTask error", error);
    },
    onComplete: (_value) => {},
    task: async (_, { signal }) => {
      // Check if media engine task has errored (no valid source) before attempting to use it
      if (host.mediaEngineTask.error) {
        return undefined;
      }
      
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

      // If media engine task completed but returned undefined/null, no valid source
      if (!mediaEngine) {
        return undefined;
      }

      const audioRendition = mediaEngine?.audioRendition;

      // Return undefined if no audio rendition available (video-only asset)
      if (!audioRendition) {
        return undefined;
      }

      const initSegment = await host.audioInitSegmentFetchTask.taskComplete;
      
      // Check for abort after awaiting init segment
      signal?.throwIfAborted();

      const segment = await host.audioSegmentFetchTask.taskComplete;
      
      // Check for abort after awaiting segment
      signal?.throwIfAborted();

      if (!initSegment || !segment) {
        return undefined;
      }

      const startTimeOffsetMs = audioRendition.startTimeOffsetMs;

      const arrayBuffer = await new Blob([initSegment, segment]).arrayBuffer();
      
      // Check for abort after expensive arrayBuffer operation
      signal?.throwIfAborted();

      return new BufferedSeekingInput(arrayBuffer, {
        videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
        audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
        startTimeOffsetMs,
      });
    },
  });

  // CRITICAL: Attach .catch() handler IMMEDIATELY to prevent unhandled rejections.
  // This must be done synchronously after task creation, before any updates can trigger run().
  // When hostUpdate() triggers _performTask() -> run(), the rejection needs to already have a handler.
  task.taskComplete.catch(() => {});

  return task;
};
