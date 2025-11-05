import { Task } from "@lit/task";

import { EF_INTERACTIVE } from "../../../EF_INTERACTIVE.js";
import { EF_RENDERING } from "../../../EF_RENDERING.js";
import type { VideoRendition } from "../../../transcoding/types";
import type { EFVideo } from "../../EFVideo";
import type { MediaBufferState } from "../shared/BufferUtils";
import { manageMediaBuffer } from "../shared/BufferUtils";

/**
 * Scrub video buffer task - aggressively preloads the ENTIRE scrub track
 * Unlike main video buffering, this loads the full duration with higher concurrency
 * for instant visual feedback during seeking
 */
export const makeScrubVideoBufferTask = (host: EFVideo) => {
  let currentState: MediaBufferState = {
    currentSeekTimeMs: 0,
    requestedSegments: new Set(),
    activeRequests: new Set(),
    requestQueue: [],
  };

  return new Task(host, {
    autoRun: EF_INTERACTIVE,
    args: () => [host.mediaEngineTask.value] as const,
    onError: (error) => {
      console.error("scrubVideoBufferTask error", error);
    },
    onComplete: (value) => {
      currentState = value as MediaBufferState;
    },
    task: async ([mediaEngine], { signal }) => {
      // Skip entirely in rendering mode
      if (EF_RENDERING()) {
        return currentState;
      }

      // Don't run if video buffering is disabled
      if (!host.enableVideoBuffering) {
        return currentState;
      }

      // Need media engine to be available
      if (!mediaEngine) {
        return currentState;
      }

      // Get scrub rendition using the proper interface method
      const scrubRendition = mediaEngine.getScrubVideoRendition();

      if (!scrubRendition) {
        // No scrub rendition available - this is fine, just return current state
        return currentState;
      }

      // Add src to rendition
      const scrubRenditionWithSrc = {
        ...scrubRendition,
        src: mediaEngine.src,
      };

      try {
        // First, ensure the init segment is cached for scrub content
        try {
          await mediaEngine.fetchInitSegment(scrubRenditionWithSrc, signal);
        } catch (error) {
          console.warn(
            "ScrubBuffer: Failed to cache scrub init segment:",
            error,
          );
        }

        // Aggressively buffer the ENTIRE scrub track
        const newState = await manageMediaBuffer<VideoRendition>(
          0, // Always start from beginning to ensure complete coverage
          {
            // Buffer entire duration - scrub segments are 30s so much fewer total segments
            bufferDurationMs: mediaEngine.durationMs,
            // High concurrency for scrub - fewer segments overall (30s each vs 2s for main)
            // E.g., 10min video = ~20 scrub segments vs ~300 main segments
            maxParallelFetches: 10,
            enableBuffering: true,
            enableContinuousBuffering: true, // Keep going until all segments loaded
          },
          currentState,
          mediaEngine.durationMs,
          signal,
          {
            computeSegmentId: async (timeMs, rendition) => {
              return mediaEngine.computeSegmentId(timeMs, rendition);
            },
            prefetchSegment: async (segmentId, rendition) => {
              // Use the media engine to fetch and cache scrub segments
              await mediaEngine.fetchMediaSegment(segmentId, rendition);
            },
            isSegmentCached: (segmentId, rendition) => {
              return mediaEngine.isSegmentCached(segmentId, rendition);
            },
            getRendition: async () => scrubRenditionWithSrc,
            logError: (message, error) => {
              console.warn(`ScrubBuffer: ${message}`, error);
            },
          },
        );

        return newState;
      } catch (error) {
        if (signal.aborted) return currentState;
        console.warn("ScrubBuffer failed:", error);
        return currentState;
      }
    },
  });
};
