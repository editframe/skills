import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFVideo } from "../../EFVideo";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

export const makeScrubVideoSegmentIdTask = (
  host: EFVideo,
): Task<readonly [MediaEngine | undefined, number], number | undefined> => {
  return new Task(host, {
    args: () => [host.mediaEngineTask.value, host.desiredSeekTimeMs] as const,
    onError: (error) => {
      console.error("scrubVideoSegmentIdTask error", error);
    },
    onComplete: (_value) => {},
    task: async ([, targetSeekTimeMs], { signal }) => {
      const mediaEngine = await getLatestMediaEngine(host, signal);
      signal.throwIfAborted(); // Abort if a new seek started

      // Get scrub rendition using the proper interface method
      const scrubRendition = mediaEngine.getScrubVideoRendition();

      if (!scrubRendition) {
        return undefined; // No scrub rendition available
      }

      return mediaEngine.computeSegmentId(targetSeekTimeMs, {
        ...scrubRendition,
        src: mediaEngine.src, // Ensure src is set
      });
    },
  });
};
