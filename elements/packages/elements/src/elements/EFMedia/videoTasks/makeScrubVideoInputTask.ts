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
      console.error("scrubVideoInputTask error", error);
    },
    onComplete: (_value) => {},
    task: async (_, { signal }) => {
      const initSegment =
        await host.scrubVideoInitSegmentFetchTask.taskComplete;
      if (signal.aborted) return undefined;

      const segment = await host.scrubVideoSegmentFetchTask.taskComplete;
      if (signal.aborted) return undefined;

      if (!initSegment || !segment) {
        throw new Error("Scrub init segment or segment is not available");
      }

      // Get startTimeOffsetMs from the scrub rendition if available
      const mediaEngine = await host.mediaEngineTask.taskComplete;
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
