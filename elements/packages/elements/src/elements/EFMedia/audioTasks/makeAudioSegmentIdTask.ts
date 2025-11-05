import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFMedia } from "../../EFMedia";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

export const makeAudioSegmentIdTask = (
  host: EFMedia,
): Task<readonly [MediaEngine | undefined, number], number | undefined> => {
  return new Task(host, {
    args: () => [host.mediaEngineTask.value, host.desiredSeekTimeMs] as const,
    onError: (error) => {
      console.error("audioSegmentIdTask error", error);
    },
    onComplete: (_value) => {},
    task: async ([, targetSeekTimeMs], { signal }) => {
      const mediaEngine = await getLatestMediaEngine(host, signal);
      signal.throwIfAborted();

      const audioRendition = mediaEngine.getAudioRendition();

      // Return undefined if no audio rendition available (video-only asset)
      if (!audioRendition) {
        return undefined;
      }

      return mediaEngine.computeSegmentId(targetSeekTimeMs, audioRendition);
    },
  });
};
