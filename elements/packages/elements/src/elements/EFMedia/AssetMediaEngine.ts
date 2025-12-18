import type { TrackFragmentIndex } from "@editframe/assets";

import { withSpan } from "../../otel/tracingHelpers.js";
import type {
  AudioRendition,
  InitSegmentPaths,
  MediaEngine,
  SegmentTimeRange,
  ThumbnailResult,
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
import { ThumbnailExtractor } from "./shared/ThumbnailExtractor.js";

export class AssetMediaEngine extends BaseMediaEngine implements MediaEngine {
  public src: string;
  protected data: Record<number, TrackFragmentIndex> = {};
  durationMs = 0;
  private thumbnailExtractor: ThumbnailExtractor;

  constructor(host: EFMedia, src: string) {
    super(host);
    this.src = src;
    this.thumbnailExtractor = new ThumbnailExtractor(this);
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
    return Object.values(this.data).find(
      (track) => track.type === "video" && track.track !== undefined && track.track > 0,
    );
  }

  get scrubTrackIndex() {
    // Scrub track uses track ID -1
    return this.data[-1];
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
    // Use @ef-scrub-track endpoint for scrub track (trackId -1)
    if (trackId === -1) {
      return `/@ef-scrub-track/${this.src}`;
    }
    return `/@ef-track/${this.src}?trackId=${trackId}`;
  }

  buildMediaSegmentUrl(trackId: number, segmentId: number) {
    // Use @ef-scrub-track endpoint for scrub track (trackId -1)
    if (trackId === -1) {
      return `/@ef-scrub-track/${this.src}`;
    }
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
    const scrubTrack = this.scrubTrackIndex;

    if (!scrubTrack || scrubTrack.track === undefined) {
      return undefined;
    }

    // Calculate segment duration from scrub track segments
    // Scrub tracks use 30-second segments
    const scrubSegmentDurationMs = 30000;

    // Calculate segment durations array if segments exist
    const segmentDurationsMs: number[] | undefined =
      scrubTrack.segments.length > 0
        ? scrubTrack.segments.map((segment) => {
            // Convert segment duration from timescale units to milliseconds
            return (segment.duration / scrubTrack.timescale) * 1000;
          })
        : undefined;

    return {
      trackId: scrubTrack.track,
      src: this.src,
      segmentDurationMs: scrubSegmentDurationMs,
      segmentDurationsMs,
      startTimeOffsetMs: scrubTrack.startTimeOffsetMs,
    };
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

  /**
   * Extract thumbnail canvases using main video rendition
   * Note: We prefer main video over scrub track because scrub track in AssetMediaEngine
   * may have incomplete segment data that doesn't cover the full video duration.
   */
  async extractThumbnails(
    timestamps: number[],
  ): Promise<(ThumbnailResult | null)[]> {
    // Use main video rendition for thumbnails - scrub track may have incomplete segments
    const rendition = this.videoRendition;

    if (!rendition) {
      console.warn(
        "AssetMediaEngine: No video rendition available for thumbnails",
      );
      return timestamps.map(() => null);
    }

    return this.thumbnailExtractor.extractThumbnails(
      timestamps,
      rendition,
      this.durationMs,
    );
  }

  convertToSegmentRelativeTimestamps(
    globalTimestamps: number[],
    _segmentId: number,
    rendition: VideoRendition,
  ): number[] {
    // For fragmented MP4 (Asset), when we create a mediabunny Input from init+media segment,
    // mediabunny sees the samples with their ABSOLUTE timestamps from the container.
    // This is because the tfdt box contains the baseMediaDecodeTime which is the absolute
    // position of this segment in the container timeline.
    //
    // So we just need to convert user time to container time by adding startTimeOffsetMs,
    // then pass that to mediabunny (in seconds).
    
    const startTimeOffsetMs = rendition.startTimeOffsetMs || 0;

    return globalTimestamps.map((globalMs) => {
      // User time -> container time -> seconds for mediabunny
      const containerTimeMs = globalMs + startTimeOffsetMs;
      return containerTimeMs / 1000;
    });
  }
}
