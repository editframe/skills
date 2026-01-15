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
      // Only log unexpected errors - missing scrub rendition/segment is handled gracefully above
      if (
        error instanceof Error &&
        error.message !== "Scrub segment ID is not available for video" &&
        error.message !== "No scrub rendition available"
      ) {
        console.error("scrubVideoSegmentFetchTask error", error);
      }
    },
    onComplete: (_value) => {},
    task: async (_, { signal }) => {
      const mediaEngine = await getLatestMediaEngine(host, signal);
      const segmentId = await host.scrubVideoSegmentIdTask.taskComplete;
      if (segmentId === undefined) {
        // Scrub segment ID not available - scrub is optional, return undefined
        return undefined as any; // Task expects ArrayBuffer, but undefined indicates unavailable
      }

      // Get scrub rendition using the proper interface method
      const scrubRendition = mediaEngine.getScrubVideoRendition();

      if (!scrubRendition) {
        // No scrub rendition available - this is fine, scrub is optional
        // Return undefined instead of throwing to avoid error noise
        return undefined as any; // Task expects ArrayBuffer, but undefined indicates unavailable
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
