import { Task } from "@lit/task";
import { EFMedia } from "../../EFMedia";
import { BufferedSeekingInput } from "../BufferedSeekingInput";
import type { InputTask } from "../shared/MediaTaskUtils";

export const makeAudioInputTask = (host: EFMedia): InputTask => {
  return new Task<
    readonly [ArrayBuffer | undefined, ArrayBuffer | undefined],
    BufferedSeekingInput | undefined
  >(host, {
    args: () =>
      [
        host.audioInitSegmentFetchTask.value,
        host.audioSegmentFetchTask.value,
      ] as const,
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
      
      if (signal.aborted) return undefined;

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
      if (signal.aborted) return undefined;

      const segment = await host.audioSegmentFetchTask.taskComplete;
      if (signal.aborted) return undefined;

      if (!initSegment || !segment) {
        return undefined;
      }

      const startTimeOffsetMs = audioRendition.startTimeOffsetMs;

      const arrayBuffer = await new Blob([initSegment, segment]).arrayBuffer();
      if (signal.aborted) return undefined;

      return new BufferedSeekingInput(arrayBuffer, {
        videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
        audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
        startTimeOffsetMs,
      });
    },
  });
};
