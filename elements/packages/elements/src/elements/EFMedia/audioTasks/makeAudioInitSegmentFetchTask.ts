import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFMedia } from "../../EFMedia";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

export const makeAudioInitSegmentFetchTask = (
  host: EFMedia,
): Task<readonly [MediaEngine | undefined], ArrayBuffer | undefined> => {
  return new Task(host, {
    args: () => [host.mediaEngineTask.value] as const,
    onError: (error) => {
      console.error("audioInitSegmentFetchTask error", error);
    },
    onComplete: (_value) => {},
    task: async ([_mediaEngine], { signal }) => {
      const mediaEngine = await getLatestMediaEngine(host, signal);
      const audioRendition = mediaEngine.getAudioRendition();

      // Return undefined if no audio rendition available (video-only asset)
      if (!audioRendition) {
        return undefined;
      }

      return mediaEngine.fetchInitSegment(audioRendition, signal);
    },
  });
};
