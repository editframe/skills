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
  return new Task(host, {
    autoRun: false,
    args: () => [host.desiredSeekTimeMs] as const,
    onError: (error) => {
      console.error("unifiedVideoSeekTask error", error);
    },
    onComplete: (_value) => {},
    task: async ([desiredSeekTimeMs], { signal }) => {
      const mediaEngine = await getLatestMediaEngine(host, signal);
      if (!mediaEngine || signal.aborted) return undefined;

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

          if (signal.aborted) {
            return undefined;
          }

          return result;
        }
      }

      // SECOND: Main not cached, try scrub path (instant if cached)
      // COMMENTED OUT: Scrub track loading system temporarily disabled due to performance issues
      // const scrubSample = await tryGetScrubSample(
      //   mediaEngine,
      //   desiredSeekTimeMs,
      //   signal,
      // );

      // if (scrubSample || signal.aborted) {
      //   if (signal.aborted) {
      //     return undefined;
      //   }

      //   // If scrub succeeded, start background main quality upgrade (non-blocking)
      //   if (scrubSample) {
      //     startMainQualityUpgrade(
      //       host,
      //       mediaEngine,
      //       desiredSeekTimeMs,
      //       signal,
      //     ).catch(() => {
      //       // Main upgrade failed - scrub already succeeded, that's fine
      //     });
      //   }

      //   return scrubSample;
      // }

      // THIRD: Neither are cached, fetch main video path as final fallback
      const result = await getMainVideoSample(
        host,
        mediaEngine,
        desiredSeekTimeMs,
        signal,
      );

      if (signal.aborted) {
        return undefined;
      }

      return result;
    },
  });
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

        // Get cached scrub input and seek within it
        const scrubInput = await scrubInputCache.getOrCreateInput(
          segmentId,
          async () => {
            const [initSegment, mediaSegment] = await Promise.all([
              mediaEngine.fetchInitSegment(scrubRenditionWithSrc, signal),
              mediaEngine.fetchMediaSegment(segmentId, scrubRenditionWithSrc),
            ]);

            if (!initSegment || !mediaSegment || signal.aborted)
              return undefined;

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
          span.setAttribute("result", "no-scrub-input");
          return undefined;
        }

        if (signal.aborted) {
          span.setAttribute("result", "aborted-after-scrub-input");
          return undefined;
        }

        const videoTrack = await scrubInput.getFirstVideoTrack();
        if (!videoTrack) {
          span.setAttribute("result", "no-video-track");
          return undefined;
        }

        if (signal.aborted) {
          span.setAttribute("result", "aborted-after-scrub-track");
          return undefined;
        }

        const sample = (await scrubInput.seek(
          videoTrack.id,
          desiredSeekTimeMs,
        )) as unknown as VideoSample | undefined;

        span.setAttribute("result", sample ? "success" : "no-sample");
        return sample;
      } catch (_error) {
        if (signal.aborted) {
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
          throw new Error(
            "Video rendition unavailable after checking videoRendition exists",
          );
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
            const [initSegment, mediaSegment] = await Promise.all([
              mediaEngine.fetchInitSegment(videoRendition, signal),
              mediaEngine.fetchMediaSegment(segmentId, videoRendition, signal),
            ]);

            if (!initSegment || !mediaSegment) {
              return undefined;
            }
            signal.throwIfAborted();

            const startTimeOffsetMs = videoRendition?.startTimeOffsetMs;

            return new BufferedSeekingInput(
              await new Blob([initSegment, mediaSegment]).arrayBuffer(),
              {
                videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
                audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
                startTimeOffsetMs,
              },
            );
          },
        );

        if (!mainInput) {
          span.setAttribute("result", "no-segments");
          return undefined;
        }

        if (signal.aborted) {
          span.setAttribute("result", "aborted-after-input");
          return undefined;
        }

        const videoTrack = await mainInput.getFirstVideoTrack();
        if (!videoTrack) {
          span.setAttribute("result", "no-video-track");
          return undefined;
        }

        if (signal.aborted) {
          span.setAttribute("result", "aborted-after-track");
          return undefined;
        }

        const sample = (await mainInput.seek(
          videoTrack.id,
          desiredSeekTimeMs,
        )) as unknown as VideoSample | undefined;

        span.setAttribute("result", sample ? "success" : "no-sample");
        return sample;
      } catch (error) {
        if (signal.aborted) {
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
  if (signal.aborted || host.desiredSeekTimeMs !== targetSeekTimeMs) return;

  // Get main quality sample and upgrade display
  const mainSample = await getMainVideoSample(
    host,
    mediaEngine,
    targetSeekTimeMs,
    signal,
  );
  if (
    mainSample &&
    !signal.aborted &&
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
