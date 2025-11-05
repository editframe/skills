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
      console.error("audioInputTask error", error);
    },
    onComplete: (_value) => {},
    task: async (_, { signal }) => {
      const mediaEngine = await host.mediaEngineTask.taskComplete;
      if (signal.aborted) return undefined;

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
