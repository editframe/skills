import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFVideo } from "../../EFVideo";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

export const makeScrubVideoSegmentFetchTask = (
  host: EFVideo,
): Task<
  readonly [MediaEngine | undefined, number | undefined],
  ArrayBuffer
> => {
  return new Task(host, {
    args: () =>
      [host.mediaEngineTask.value, host.scrubVideoSegmentIdTask.value] as const,
    onError: (error) => {
      console.error("scrubVideoSegmentFetchTask error", error);
    },
    onComplete: (_value) => {},
    task: async (_, { signal }) => {
      const mediaEngine = await getLatestMediaEngine(host, signal);
      const segmentId = await host.scrubVideoSegmentIdTask.taskComplete;
      if (segmentId === undefined) {
        throw new Error("Scrub segment ID is not available for video");
      }

      // Get scrub rendition using the proper interface method
      const scrubRendition = mediaEngine.getScrubVideoRendition();

      if (!scrubRendition) {
        // No scrub rendition available - this is fine, scrub is optional
        throw new Error("No scrub rendition available");
      }

      return mediaEngine.fetchMediaSegment(
        segmentId,
        {
          ...scrubRendition,
          src: mediaEngine.src, // Ensure src is set
        },
        signal,
      );
    },
  });
};
