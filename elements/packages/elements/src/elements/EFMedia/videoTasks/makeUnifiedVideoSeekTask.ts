import { Task } from "@lit/task";
import type { VideoSample } from "mediabunny";
import { withSpan } from "../../../otel/tracingHelpers.js";
import type { VideoRendition } from "../../../transcoding/types";
import { EFMedia } from "../../EFMedia.js";
import type { EFVideo } from "../../EFVideo";
import { BufferedSeekingInput } from "../BufferedSeekingInput.js";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";
import { MainVideoInputCache } from "./MainVideoInputCache";
import { ScrubInputCache } from "./ScrubInputCache";

type UnifiedVideoSeekTask = Task<readonly [number], VideoSample | undefined>;

// Shared cache for scrub inputs
const scrubInputCache = new ScrubInputCache();

// Shared cache for main video inputs
const mainVideoInputCache = new MainVideoInputCache();

export const makeUnifiedVideoSeekTask = (
  host: EFVideo,
): UnifiedVideoSeekTask => {
  const task: UnifiedVideoSeekTask = new Task(host, {
    autoRun: false,
    args: () => [host.desiredSeekTimeMs] as const,
    onError: (error) => {
      // Don't log AbortErrors - these are expected when tasks are cancelled
      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("signal is aborted") ||
          error.message?.includes("The user aborted a request")
        ))
      ) {
        return;
      }
      // Only log unexpected errors - expected conditions handled gracefully
      if (
        error instanceof Error &&
        error.message !== "Video rendition unavailable after checking videoRendition exists" &&
        !error.message.includes("No valid media source") &&
        !error.message.includes("Sample not found for time") // Seeking beyond video duration
      ) {
        console.error("unifiedVideoSeekTask error", error);
      }
    },
    onComplete: (_value) => {},
    task: async ([desiredSeekTimeMs], { signal }) => {
      const mediaEngine = await getLatestMediaEngine(host, signal);
      if (!mediaEngine) return undefined;
      signal?.throwIfAborted();

      // FIRST: Check if main quality content is already cached
      const mainRendition = mediaEngine.videoRendition;
      if (mainRendition) {
        const mainSegmentId = mediaEngine.computeSegmentId(
          desiredSeekTimeMs,
          mainRendition,
        );
        if (
          mainSegmentId !== undefined &&
          mediaEngine.isSegmentCached(mainSegmentId, mainRendition)
        ) {
          const result = await getMainVideoSample(
            host,
            mediaEngine,
            desiredSeekTimeMs,
            signal,
          );

          signal?.throwIfAborted();

          return result;
        }
      }

      // SECOND: Scrub track disabled for thumbnail generation
      // Testing showed scrub track is actually SLOWER than main video for this use case
      // because the entire 42MB file needs to be parsed vs efficient segment-based seeking.
      // The scrub track is designed for interactive scrubbing preview, not batch thumbnail gen.

      // THIRD: Fetch main video path
      const result = await getMainVideoSample(
        host,
        mediaEngine,
        desiredSeekTimeMs,
        signal,
      );

      signal?.throwIfAborted();

      return result;
    },
  });

  // CRITICAL: Attach .catch() handler IMMEDIATELY to prevent unhandled rejections.
  // This must be done synchronously after task creation, before any updates can trigger run().
  // When hostUpdate() triggers _performTask() -> run(), the rejection needs to already have a handler.
  task.taskComplete.catch(() => {});

  return task;
};

/**
 * Try to get scrub sample from cache (instant if available)
 */
async function tryGetScrubSample(
  mediaEngine: any,
  desiredSeekTimeMs: number,
  signal: AbortSignal,
): Promise<VideoSample | undefined> {
  return withSpan(
    "video.tryGetScrubSample",
    {
      desiredSeekTimeMs,
      src: mediaEngine.src || "unknown",
    },
    undefined,
    async (span) => {
      try {
        // Get scrub rendition
        let scrubRendition: VideoRendition | undefined;

        // Check if media engine has a getScrubVideoRendition method (AssetMediaEngine, etc.)
        if (typeof mediaEngine.getScrubVideoRendition === "function") {
          scrubRendition = mediaEngine.getScrubVideoRendition();
        } else if ("data" in mediaEngine && mediaEngine.data?.videoRenditions) {
          // Fallback to data structure for other engines
          scrubRendition = mediaEngine.data.videoRenditions.find(
            (r: any) => r.id === "scrub",
          );
        }

        if (!scrubRendition) {
          span.setAttribute("result", "no-scrub-rendition");
          return undefined;
        }

        const scrubRenditionWithSrc = {
          ...scrubRendition,
          src: mediaEngine.src,
        };

        // Check if scrub segment is cached
        const segmentId = mediaEngine.computeSegmentId(
          desiredSeekTimeMs,
          scrubRenditionWithSrc,
        );
        if (segmentId === undefined) {
          span.setAttribute("result", "no-segment-id");
          return undefined;
        }

        const isCached = mediaEngine.isSegmentCached(
          segmentId,
          scrubRenditionWithSrc,
        );
        span.setAttribute("isCached", isCached);
        if (!isCached) {
          span.setAttribute("result", "not-cached");
          return undefined; // Not cached - let main video handle it
        }

        // For single-file scrub tracks (AssetMediaEngine trackId -1), use URL-based caching
        // This ensures all segments share the same BufferedSeekingInput instance
        // Use JIT format URL for consistency
        let scrubUrl: string | undefined;
        if (scrubRendition.trackId === -1) {
          // Check if mediaEngine has urlGenerator (AssetMediaEngine)
          if (mediaEngine.urlGenerator && typeof mediaEngine.urlGenerator.baseUrl === "function") {
            // Get baseUrl, fallback to current origin if empty
            let baseUrl = mediaEngine.urlGenerator.baseUrl();
            if (!baseUrl && typeof window !== "undefined") {
              baseUrl = window.location.origin;
            }
            // Get source URL
            const sourceUrl = mediaEngine.src.startsWith("http://") || mediaEngine.src.startsWith("https://")
              ? mediaEngine.src
              : `${baseUrl}/${mediaEngine.src.startsWith("/") ? mediaEngine.src.slice(1) : mediaEngine.src}`;
            scrubUrl = `${baseUrl}/api/v1/transcode/scrub/init.m4s?url=${encodeURIComponent(sourceUrl)}`;
          } else {
            // Fallback if no urlGenerator (shouldn't happen, but for safety)
            // Use production API format for local files
            let normalizedSrc = mediaEngine.src.startsWith("/")
              ? mediaEngine.src.slice(1)
              : mediaEngine.src;
            normalizedSrc = normalizedSrc.replace(/^\/+/, "");
            // Use the local isobmff API format
            scrubUrl = `/api/v1/isobmff_files/local/track?src=${encodeURIComponent(normalizedSrc)}&trackId=-1`;
          }
        }

        // Get cached scrub input and seek within it
        // Include mediaEngine.src in cache key to prevent collisions between different videos
        const scrubInput = await scrubInputCache.getOrCreateInput(
          mediaEngine.src,
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

            // Create combined blob - this is expensive, check abort before/after
            signal?.throwIfAborted();
            const combinedBlob = new Blob([initSegment, mediaSegment]);
            signal?.throwIfAborted();
            
            const arrayBuffer = await combinedBlob.arrayBuffer();
            signal?.throwIfAborted();

            return new BufferedSeekingInput(
              arrayBuffer,
              {
                videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
                audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
                startTimeOffsetMs: scrubRendition.startTimeOffsetMs,
              },
            );
          },
          scrubUrl,
        );

        if (!scrubInput) {
          span.setAttribute("result", "no-scrub-input");
          return undefined;
        }

        signal?.throwIfAborted();

        const videoTrack = await scrubInput.getFirstVideoTrack();
        if (!videoTrack) {
          span.setAttribute("result", "no-video-track");
          return undefined;
        }

        signal?.throwIfAborted();

        const sample = (await scrubInput.seek(
          videoTrack.id,
          desiredSeekTimeMs,
        )) as unknown as VideoSample | undefined;

        span.setAttribute("result", sample ? "success" : "no-sample");
        return sample;
      } catch (_error) {
        if (signal?.aborted) {
          span.setAttribute("result", "aborted");
          return undefined;
        }
        span.setAttribute("result", "error");
        return undefined; // Scrub failed - let main video handle it
      }
    },
  );
}

/**
 * Get main video sample (slower path with fetching)
 */
async function getMainVideoSample(
  _host: EFVideo,
  mediaEngine: any,
  desiredSeekTimeMs: number,
  signal: AbortSignal,
): Promise<VideoSample | undefined> {
  return withSpan(
    "video.getMainVideoSample",
    {
      desiredSeekTimeMs,
      src: mediaEngine.src || "unknown",
    },
    undefined,
    async (span) => {
      try {
        // Use existing main video task chain
        const videoRendition = mediaEngine.getVideoRendition();
        if (!videoRendition) {
          // Video rendition not available - return undefined gracefully instead of throwing
          span.setAttribute("result", "no-video-rendition");
          return undefined;
        }

        const segmentId = mediaEngine.computeSegmentId(
          desiredSeekTimeMs,
          videoRendition,
        );
        if (segmentId === undefined) {
          span.setAttribute("result", "no-segment-id");
          return undefined;
        }

        span.setAttribute("segmentId", segmentId);

        // Get cached main video input or create new one
        const mainInput = await mainVideoInputCache.getOrCreateInput(
          mediaEngine.src,
          segmentId,
          videoRendition.id,
          async () => {
            // Fetch main video segment (will be cached at mediaEngine level)
            // Try to fetch segments, but return undefined if they fail with expected errors
            let initSegment: ArrayBuffer | undefined;
            let mediaSegment: ArrayBuffer | undefined;
            
            try {
              [initSegment, mediaSegment] = await Promise.all([
                mediaEngine.fetchInitSegment(videoRendition, signal),
                mediaEngine.fetchMediaSegment(segmentId, videoRendition, signal),
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

            // Create combined blob - this is expensive, check abort before/after
            signal?.throwIfAborted();
            const combinedBlob = new Blob([initSegment, mediaSegment]);
            signal?.throwIfAborted();
            
            const arrayBuffer = await combinedBlob.arrayBuffer();
            signal?.throwIfAborted();

            return new BufferedSeekingInput(
              arrayBuffer,
              {
                videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
                audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
                startTimeOffsetMs: videoRendition.startTimeOffsetMs,
              },
            );
          },
        );

        if (!mainInput) {
          span.setAttribute("result", "no-segments");
          return undefined;
        }

        signal?.throwIfAborted();

        const videoTrack = await mainInput.getFirstVideoTrack();
        if (!videoTrack) {
          span.setAttribute("result", "no-video-track");
          return undefined;
        }

        signal?.throwIfAborted();

        const sample = (await mainInput.seek(
          videoTrack.id,
          desiredSeekTimeMs,
        )) as unknown as VideoSample | undefined;

        span.setAttribute("result", sample ? "success" : "no-sample");
        return sample;
      } catch (error) {
        if (signal?.aborted) {
          span.setAttribute("result", "aborted");
          return undefined;
        }
        throw error;
      }
    },
  );
}

/**
 * Start background upgrade to main quality (non-blocking)
 */
async function startMainQualityUpgrade(
  host: EFVideo,
  mediaEngine: any,
  targetSeekTimeMs: number,
  signal: AbortSignal,
): Promise<void> {
  // Small delay to let scrub content display first
  await new Promise((resolve) => setTimeout(resolve, 50));
  if (signal?.aborted || host.desiredSeekTimeMs !== targetSeekTimeMs) return;

  // Get main quality sample and upgrade display
  const mainSample = await getMainVideoSample(
    host,
    mediaEngine,
    targetSeekTimeMs,
    signal,
  );
  if (
    mainSample &&
    !signal?.aborted &&
    host.desiredSeekTimeMs === targetSeekTimeMs
  ) {
    const videoFrame = mainSample.toVideoFrame();
    try {
      host.displayFrame(videoFrame, targetSeekTimeMs);
    } finally {
      videoFrame.close();
    }
  }
}
