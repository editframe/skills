import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFMedia } from "../../EFMedia";
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
      console.error("audioSegmentFetchTask error", error);
    },
    onComplete: (_value) => {},
    task: async (_, { signal }) => {
      const mediaEngine = await getLatestMediaEngine(host, signal);
      const segmentId = await host.audioSegmentIdTask.taskComplete;
      const audioRendition = mediaEngine.getAudioRendition();

      // Return undefined if no audio rendition or segment ID available (video-only asset)
      if (!audioRendition || segmentId === undefined) {
        return undefined;
      }

      return mediaEngine.fetchMediaSegment(segmentId, audioRendition, signal);
    },
  });
};
