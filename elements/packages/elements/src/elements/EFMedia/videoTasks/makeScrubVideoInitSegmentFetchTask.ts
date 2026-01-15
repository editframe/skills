import { Task } from "@lit/task";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFVideo } from "../../EFVideo";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

export const makeScrubVideoInitSegmentFetchTask = (
  host: EFVideo,
): Task<readonly [MediaEngine | undefined], ArrayBuffer> => {
  return new Task(host, {
    args: () => [host.mediaEngineTask.value] as const,
    onError: (error) => {
      // Only log unexpected errors - missing scrub rendition is handled gracefully above
      if (error instanceof Error && error.message !== "No scrub rendition available") {
        console.error("scrubVideoInitSegmentFetchTask error", error);
      }
    },
    onComplete: (_value) => {},
    task: async ([_mediaEngine], { signal }) => {
      const mediaEngine = await getLatestMediaEngine(host, signal);

      // Get scrub rendition using the proper interface method
      const scrubRendition = mediaEngine.getScrubVideoRendition();

      if (!scrubRendition) {
        // No scrub rendition available - this is fine, scrub is optional
        // Return undefined instead of throwing to avoid error noise
        return undefined as any; // Task expects ArrayBuffer, but undefined indicates unavailable
      }

      return mediaEngine.fetchInitSegment(
        {
          ...scrubRendition,
          src: mediaEngine.src, // Ensure src is set
        },
        signal,
      );
    },
  });
};
