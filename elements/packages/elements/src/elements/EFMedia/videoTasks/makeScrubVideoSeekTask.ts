import { Task } from "@lit/task";

import type { VideoSample } from "mediabunny";

import type { EFVideo } from "../../EFVideo";
import { ScrubInputCache } from "./ScrubInputCache";

type ScrubVideoSeekTask = Task<readonly [number], VideoSample | undefined>;

// Shared cache instance across all scrub seek tasks
const scrubInputCache = new ScrubInputCache();

export const makeScrubVideoSeekTask = (host: EFVideo): ScrubVideoSeekTask => {
  // Capture task reference for use in onError
  let task: ScrubVideoSeekTask;

  task = new Task(host, {
    args: () => [host.desiredSeekTimeMs] as const,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete BEFORE the promise is rejected.
      // This prevents unhandled rejection when hostUpdate() triggers _performTask() without awaiting.
      task.taskComplete.catch(() => {});
      
      // Don't log AbortErrors - these are expected when tasks are cancelled
      const isAbortError = 
        error instanceof DOMException && error.name === "AbortError" ||
        error instanceof Error && (
          error.name === "AbortError" ||
          error.message.includes("signal is aborted") ||
          error.message.includes("The user aborted a request")
        );
      
      if (isAbortError) {
        return;
      }
      
      // Don't log errors when there's no valid media source or file not found - these are expected
      if (error instanceof Error && (
        error.message === "No valid media source" ||
        error.message.includes("File not found") ||
        error.message.includes("is not valid JSON")
      )) {
        return;
      }
      console.error("scrubVideoSeekTask error", error);
    },
    onComplete: (_value) => {},
    task: async ([desiredSeekTimeMs], { signal }) => {
      signal?.throwIfAborted();

      const mediaEngine = host.mediaEngineTask.value;
      if (!mediaEngine) {
        return undefined;
      }

      // Get scrub rendition using the proper interface method
      const scrubRendition = mediaEngine.getScrubVideoRendition();

      if (!scrubRendition) {
        return undefined; // No scrub rendition
      }

      const scrubRenditionWithSrc = {
        ...scrubRendition,
        src: mediaEngine.src,
      };

      // Compute which scrub segment (30s) contains the desired seek time
      const segmentId = mediaEngine.computeSegmentId(
        desiredSeekTimeMs,
        scrubRenditionWithSrc,
      );
      if (segmentId === undefined) {
        return undefined;
      }

      // Check if this scrub segment is cached (preloaded by scrub buffer task)
      const isCached = mediaEngine.isSegmentCached(
        segmentId,
        scrubRenditionWithSrc,
      );
      if (!isCached) {
        // Scrub content not preloaded - fail fast, let main video handle it
        // Scrub's job is instant feedback from cached content only
        return undefined;
      }

      signal?.throwIfAborted();

      try {
        // Get or create BufferedSeekingInput for this scrub segment (30s)
        // This efficiently reuses the same input for seeks within the same 30s range
        const scrubInput = await scrubInputCache.getOrCreateInput(
          segmentId,
          async () => {
            // Try to fetch segments, but return undefined if they fail with expected errors
            let initSegment: ArrayBuffer | undefined;
            let mediaSegment: ArrayBuffer | undefined;
            
            try {
              [initSegment, mediaSegment] = await Promise.all([
                mediaEngine.fetchInitSegment(scrubRenditionWithSrc, signal),
                mediaEngine.fetchMediaSegment(segmentId, scrubRenditionWithSrc, signal),
              ]);
            } catch (error) {
              // If aborted, re-throw to propagate cancellation
              if (error instanceof DOMException && error.name === "AbortError") {
                throw error;
              }
              // If fetch fails with expected errors (401, missing segments, etc.), return undefined
              if (
                error instanceof Error &&
                (error.message.includes("401") ||
                  error.message.includes("UNAUTHORIZED") ||
                  error.message.includes("Failed to fetch") ||
                  error.message.includes("File not found") ||
                  error.message.includes("Media segment not found") ||
                  error.message.includes("Init segment not found") ||
                  error.message.includes("Track not found"))
              ) {
                return undefined;
              }
              // Re-throw unexpected errors
              throw error;
            }

            if (!initSegment || !mediaSegment) {
              return undefined;
            }
            signal?.throwIfAborted();

            const { BufferedSeekingInput } =
              await import("../BufferedSeekingInput.js");
            const { EFMedia } = await import("../../EFMedia.js");

            return new BufferedSeekingInput(
              await new Blob([initSegment, mediaSegment]).arrayBuffer(),
              {
                videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
                audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
                startTimeOffsetMs: scrubRendition.startTimeOffsetMs,
              },
            );
          },
        );

        if (!scrubInput) {
          return undefined;
        }

        signal?.throwIfAborted();

        // Get video track and seek to precise time within the 30s scrub segment
        const videoTrack = await scrubInput.getFirstVideoTrack();
        if (!videoTrack) {
          return undefined;
        }

        signal?.throwIfAborted();

        const sample = (await scrubInput.seek(
          videoTrack.id,
          desiredSeekTimeMs,
        )) as unknown as VideoSample | undefined;

        return sample;
      } catch (error) {
        // If aborted, return undefined silently
        if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          return undefined;
        }
        // Don't warn for RangeError about sample not found - this is expected when seeking
        // outside the segment range (e.g., seeking beyond video duration or outside loaded segment)
        if (error instanceof RangeError && error.message.includes("Sample not found")) {
          return undefined;
        }
        console.warn("Failed to get scrub video sample:", error);
        return undefined;
      }
    },
  });

  return task;
};
