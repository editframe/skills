import { Task } from "@lit/task";

import { EFMedia } from "../../EFMedia";
import type { EFVideo } from "../../EFVideo";
import { BufferedSeekingInput } from "../BufferedSeekingInput";
import type { InputTask } from "../shared/MediaTaskUtils";

export const makeScrubVideoInputTask = (host: EFVideo): InputTask => {
  return new Task<
    readonly [ArrayBuffer | undefined, ArrayBuffer | undefined],
    BufferedSeekingInput | undefined
  >(host, {
    args: () =>
      [
        host.scrubVideoInitSegmentFetchTask.value,
        host.scrubVideoSegmentFetchTask.value,
      ] as const,
    onError: (error) => {
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
      
      const initSegment =
        await host.scrubVideoInitSegmentFetchTask.taskComplete;
      if (signal.aborted) return undefined;

      const segment = await host.scrubVideoSegmentFetchTask.taskComplete;
      if (signal.aborted) return undefined;

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
      if (signal.aborted) return undefined;

      const scrubRendition = mediaEngine.getScrubVideoRendition();
      const startTimeOffsetMs = scrubRendition?.startTimeOffsetMs;

      const arrayBuffer = await new Blob([initSegment, segment]).arrayBuffer();
      if (signal.aborted) return undefined;

      const input = new BufferedSeekingInput(arrayBuffer, {
        videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
        audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
        startTimeOffsetMs,
      });
      return input;
    },
  });
};
