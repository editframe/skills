import type { TrackFragmentIndex } from "@editframe/assets";

import { withSpan } from "../../otel/tracingHelpers.js";
import type {
  AudioRendition,
  InitSegmentPaths,
  MediaEngine,
  SegmentTimeRange,
  VideoRendition,
} from "../../transcoding/types";
import type { UrlGenerator } from "../../transcoding/utils/UrlGenerator";
import type { EFMedia } from "../EFMedia";
import { BaseMediaEngine } from "./BaseMediaEngine";
import type { MediaRendition } from "./shared/MediaTaskUtils";
import {
  convertToScaledTime,
  roundToMilliseconds,
} from "./shared/PrecisionUtils";

export class AssetMediaEngine extends BaseMediaEngine implements MediaEngine {
  public src: string;
  protected data: Record<number, TrackFragmentIndex> = {};
  durationMs = 0;

  constructor(host: EFMedia, src: string) {
    super(host);
    this.src = src;
  }

  static async fetch(host: EFMedia, urlGenerator: UrlGenerator, src: string) {
    const engine = new AssetMediaEngine(host, src);
    const url = urlGenerator.generateTrackFragmentIndexUrl(src);
    const data = await engine.fetchManifest(url);
    engine.data = data as Record<number, TrackFragmentIndex>;

    // Calculate duration from the data
    const longestFragment = Object.values(engine.data).reduce(
      (max, fragment) => Math.max(max, fragment.duration / fragment.timescale),
      0,
    );
    engine.durationMs = longestFragment * 1000;

    if (src.startsWith("/")) {
      engine.src = src.slice(1);
    }
    return engine;
  }

  get audioTrackIndex() {
    return Object.values(this.data).find((track) => track.type === "audio");
  }

  get videoTrackIndex() {
    return Object.values(this.data).find((track) => track.type === "video");
  }

  get videoRendition() {
    const videoTrack = this.videoTrackIndex;

    if (!videoTrack || videoTrack.track === undefined) {
      return undefined;
    }

    return {
      trackId: videoTrack.track,
      src: this.src,
      startTimeOffsetMs: videoTrack.startTimeOffsetMs,
    };
  }

  get audioRendition() {
    const audioTrack = this.audioTrackIndex;

    if (!audioTrack || audioTrack.track === undefined) {
      return undefined;
    }

    return {
      trackId: audioTrack.track,
      src: this.src,
    };
  }

  get initSegmentPaths() {
    const paths: InitSegmentPaths = {};

    if (this.audioTrackIndex !== undefined) {
      paths.audio = {
        path: `@ef-track/${this.audioTrackIndex.track}.m4s`,
        pos: this.audioTrackIndex.initSegment.offset,
        size: this.audioTrackIndex.initSegment.size,
      };
    }

    if (this.videoTrackIndex !== undefined) {
      paths.video = {
        path: `/@ef-track/${this.videoTrackIndex.track}.m4s`,
        pos: this.videoTrackIndex.initSegment.offset,
        size: this.videoTrackIndex.initSegment.size,
      };
    }

    return paths;
  }

  get templates() {
    return {
      initSegment: "/@ef-track/{src}?trackId={trackId}",
      mediaSegment: "/@ef-track/{src}?trackId={trackId}",
    };
  }

  buildInitSegmentUrl(trackId: number) {
    return `/@ef-track/${this.src}?trackId=${trackId}`;
  }

  buildMediaSegmentUrl(trackId: number, segmentId: number) {
    return `/@ef-track/${this.src}?trackId=${trackId}&segmentId=${segmentId}`;
  }

  async fetchInitSegment(
    rendition: { trackId: number | undefined; src: string },
    signal: AbortSignal,
  ) {
    return withSpan(
      "assetEngine.fetchInitSegment",
      {
        trackId: rendition.trackId || -1,
        src: rendition.src,
      },
      undefined,
      async (span) => {
        if (!rendition.trackId) {
          throw new Error(
            "[fetchInitSegment] Track ID is required for asset metadata",
          );
        }
        const url = this.buildInitSegmentUrl(rendition.trackId);
        const initSegment = this.data[rendition.trackId]?.initSegment;
        if (!initSegment) {
          throw new Error("Init segment not found");
        }

        span.setAttribute("offset", initSegment.offset);
        span.setAttribute("size", initSegment.size);

        // Use unified fetch method with Range headers
        const headers = {
          Range: `bytes=${initSegment.offset}-${initSegment.offset + initSegment.size - 1}`,
        };

        return this.fetchMediaWithHeaders(url, headers, signal);
      },
    );
  }

  async fetchMediaSegment(
    segmentId: number,
    rendition: { trackId: number | undefined; src: string },
    signal?: AbortSignal,
  ) {
    return withSpan(
      "assetEngine.fetchMediaSegment",
      {
        segmentId,
        trackId: rendition.trackId || -1,
        src: rendition.src,
      },
      undefined,
      async (span) => {
        if (!rendition.trackId) {
          throw new Error(
            "[fetchMediaSegment] Track ID is required for asset metadata",
          );
        }
        if (segmentId === undefined) {
          throw new Error("Segment ID is not available");
        }
        const url = this.buildMediaSegmentUrl(rendition.trackId, segmentId);
        const mediaSegment = this.data[rendition.trackId]?.segments[segmentId];
        if (!mediaSegment) {
          throw new Error("Media segment not found");
        }

        span.setAttribute("offset", mediaSegment.offset);
        span.setAttribute("size", mediaSegment.size);

        // Use unified fetch method with Range headers
        const headers = {
          Range: `bytes=${mediaSegment.offset}-${mediaSegment.offset + mediaSegment.size - 1}`,
        };

        return this.fetchMediaWithHeaders(url, headers, signal);
      },
    );
  }

  /**
   * Calculate audio segments for variable-duration segments using track fragment index
   */
  calculateAudioSegmentRange(
    fromMs: number,
    toMs: number,
    rendition: AudioRendition,
    _durationMs: number,
  ): SegmentTimeRange[] {
    if (fromMs >= toMs || !rendition.trackId) {
      console.warn(
        `calculateAudioSegmentRange: invalid fromMs ${fromMs} toMs ${toMs} rendition ${JSON.stringify(
          rendition,
        )}`,
      );
      return [];
    }

    const track = this.data[rendition.trackId];
    if (!track) {
      console.warn(
        `calculateAudioSegmentRange: track not found for rendition ${JSON.stringify(
          rendition,
        )}`,
      );
      return [];
    }

    const { timescale, segments } = track;
    const segmentRanges: SegmentTimeRange[] = [];

    for (let i = 0; i < segments.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: we know the segment is not null
      const segment = segments[i]!;
      const segmentStartTime = segment.cts;
      const segmentEndTime = segment.cts + segment.duration;

      // Convert to milliseconds
      const segmentStartMs = (segmentStartTime / timescale) * 1000;
      const segmentEndMs = (segmentEndTime / timescale) * 1000;

      // Check if segment overlaps with requested time range
      if (segmentStartMs < toMs && segmentEndMs > fromMs) {
        segmentRanges.push({
          segmentId: i, // AssetMediaEngine uses 0-based segment IDs
          startMs: segmentStartMs,
          endMs: segmentEndMs,
        });
      }
    }
    if (segmentRanges.length === 0) {
      console.warn(
        `calculateAudioSegmentRange: no segments found for fromMs ${fromMs} toMs ${toMs} rendition ${JSON.stringify(
          {
            rendition,
            track,
          },
        )}`,
      );
    }

    return segmentRanges;
  }

  computeSegmentId(seekTimeMs: number, rendition: MediaRendition) {
    if (!rendition.trackId) {
      console.warn(
        `computeSegmentId: trackId not found for rendition ${JSON.stringify(
          rendition,
        )}`,
      );
      throw new Error(
        "[computeSegmentId] Track ID is required for asset metadata",
      );
    }
    const track = this.data[rendition.trackId];
    if (!track) {
      throw new Error("Track not found");
    }
    const { timescale, segments } = track;

    // Apply startTimeOffsetMs to map user timeline to media timeline for segment selection
    const startTimeOffsetMs =
      ("startTimeOffsetMs" in rendition && rendition.startTimeOffsetMs) || 0;

    const offsetSeekTimeMs = roundToMilliseconds(
      seekTimeMs + startTimeOffsetMs,
    );
    // Convert to timescale units using consistent precision
    const scaledSeekTime = convertToScaledTime(offsetSeekTimeMs, timescale);

    // Find the segment that contains the actual seek time
    for (let i = segments.length - 1; i >= 0; i--) {
      // biome-ignore lint/style/noNonNullAssertion: we know the segment is not null
      const segment = segments[i]!;
      const segmentEndTime = segment.cts + segment.duration;

      // Check if the seek time falls within this segment
      if (segment.cts <= scaledSeekTime && scaledSeekTime < segmentEndTime) {
        return i;
      }
    }

    // Handle gaps: if no exact segment contains the time, find the nearest one
    // This handles cases where seek time falls between segments (like 8041.667ms)
    let nearestSegmentIndex = 0;
    let nearestDistance = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < segments.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: we know the segment is not null
      const segment = segments[i]!;
      const segmentStartTime = segment.cts;
      const segmentEndTime = segment.cts + segment.duration;

      let distance: number;
      if (scaledSeekTime < segmentStartTime) {
        // Time is before this segment
        distance = segmentStartTime - scaledSeekTime;
      } else if (scaledSeekTime >= segmentEndTime) {
        // Time is after this segment
        distance = scaledSeekTime - segmentEndTime;
      } else {
        // Time is within this segment (should have been caught above, but just in case)
        return i;
      }

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSegmentIndex = i;
      }
    }

    return nearestSegmentIndex;
  }

  getScrubVideoRendition(): VideoRendition | undefined {
    // AssetMediaEngine does not have a dedicated scrub track
    return undefined;
  }

  /**
   * Get preferred buffer configuration for this media engine
   * AssetMediaEngine uses lower buffering since segments are already optimized
   */
  getBufferConfig() {
    return {
      // Buffer just 1 segment ahead (~2 seconds) for assets
      videoBufferDurationMs: 2000,
      audioBufferDurationMs: 2000,
      maxVideoBufferFetches: 1,
      maxAudioBufferFetches: 1,
      bufferThresholdMs: 30000, // Timeline-aware buffering threshold
    };
  }

  // AssetMediaEngine inherits the default extractThumbnails from BaseMediaEngine
  // which provides a clear warning that this engine type is not supported

  convertToSegmentRelativeTimestamps(
    globalTimestamps: number[],
    segmentId: number,
    rendition: VideoRendition,
  ): number[] {
    {
      // Asset: MediaBunny expects segment-relative timestamps in seconds
      // This is because Asset segments are independent timeline fragments

      if (!rendition.trackId) {
        throw new Error("Track ID is required for asset metadata");
      }
      // For AssetMediaEngine, we need to calculate the actual segment start time
      // using the precise segment boundaries from the track fragment index
      const trackData = this.data[rendition.trackId];
      if (!trackData) {
        throw new Error("Track not found");
      }
      const segment = trackData.segments?.[segmentId];
      if (!segment) {
        throw new Error("Segment not found");
      }
      const segmentStartMs = (segment.cts / trackData.timescale) * 1000;

      return globalTimestamps.map(
        (globalMs) => (globalMs - segmentStartMs) / 1000,
      );
    }
  }
}
