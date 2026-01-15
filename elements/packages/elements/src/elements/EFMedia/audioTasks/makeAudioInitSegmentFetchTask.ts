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
      // Only log unexpected errors - 401/auth errors and missing audio are handled gracefully
      if (
        error instanceof Error &&
        !error.message.includes("401") &&
        !error.message.includes("Unauthorized") &&
        !error.message.includes("audio rendition")
      ) {
        console.error("audioInitSegmentFetchTask error", error);
      }
    },
    onComplete: (_value) => {},
    task: async ([_mediaEngine], { signal }) => {
      const mediaEngine = await getLatestMediaEngine(host, signal);
      const audioRendition = mediaEngine.getAudioRendition();

      // Return undefined if no audio rendition available (video-only asset)
      if (!audioRendition) {
        return undefined;
      }

      try {
        return await mediaEngine.fetchInitSegment(audioRendition, signal);
      } catch (error) {
        // Handle 401/auth errors gracefully - audio may require authentication that's not available
        // Return undefined instead of throwing to prevent error propagation
        if (
          error instanceof Error &&
          (error.message.includes("401") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("Failed to load resource"))
        ) {
          return undefined;
        }
        // Re-throw unexpected errors
        throw error;
      }
    },
  });
};
