import type { TrackFragmentIndex } from "@editframe/assets";

import { withSpan } from "../../otel/tracingHelpers.js";
import type {
  AudioRendition,
  MediaEngine,
  RenditionId,
  SegmentTimeRange,
  ThumbnailResult,
  VideoRendition,
} from "../../transcoding/types";
import type { UrlGenerator } from "../../transcoding/utils/UrlGenerator";
import type { EFMedia } from "../EFMedia";
import { BaseMediaEngine, mediaCache } from "./BaseMediaEngine";
import type { MediaRendition } from "./shared/MediaTaskUtils.js";
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
  protected urlGenerator: UrlGenerator;

  // MediaEngine interface properties
  templates!: { initSegment: string; mediaSegment: string };
  videoRendition!: VideoRendition | undefined;
  audioRendition!: AudioRendition | undefined;

  constructor(host: EFMedia, src: string, urlGenerator: UrlGenerator) {
    super(host);
    this.src = src;
    this.thumbnailExtractor = new ThumbnailExtractor(this);
    this.urlGenerator = urlGenerator;
  }

  static async fetch(
    host: EFMedia, 
    urlGenerator: UrlGenerator, 
    src: string,
    requiredTracks: "audio" | "video" | "both" = "both",
    signal?: AbortSignal,
  ) {
    const engine = new AssetMediaEngine(host, src, urlGenerator);
    
    // Normalize the path: remove leading slash and any double slashes
    let normalizedSrc = src.startsWith("/")
      ? src.slice(1)
      : src;
    normalizedSrc = normalizedSrc.replace(/^\/+/, "");
    
    // Use production API format: /api/v1/isobmff_files/local/index?src={src}
    // This route is handled by the vite plugin for local development
    const apiBaseUrl = urlGenerator.getBaseUrl();
    const url = apiBaseUrl 
      ? `${apiBaseUrl}/api/v1/isobmff_files/local/index?src=${encodeURIComponent(normalizedSrc)}`
      : `/api/v1/isobmff_files/local/index?src=${encodeURIComponent(normalizedSrc)}`;
    const data = await engine.fetchManifest(url, signal);
    engine.data = data as Record<number, TrackFragmentIndex>;

    // Check for abort after potentially slow network operation
    signal?.throwIfAborted();

    // Calculate duration from the data
    const longestFragment = Object.values(engine.data).reduce(
      (max, fragment) => Math.max(max, fragment.duration / fragment.timescale),
      0,
    );
    engine.durationMs = longestFragment * 1000;

    if (src.startsWith("/")) {
      engine.src = src.slice(1);
    }

    // Initialize MediaEngine interface properties
    const sourceUrl = engine.getSourceUrlForJit();
    const jitBaseUrl = engine.getBaseUrlForJit();
    engine.templates = {
      initSegment: `${jitBaseUrl}/api/v1/transcode/{rendition}/init.m4s?url=${encodeURIComponent(sourceUrl)}`,
      mediaSegment: `${jitBaseUrl}/api/v1/transcode/{rendition}/{segmentId}.m4s?url=${encodeURIComponent(sourceUrl)}`,
    };
    engine.videoRendition = engine.getVideoRenditionInternal();
    engine.audioRendition = engine.getAudioRenditionInternal();

    // Validate that segments are accessible by trying to fetch the first init segment
    // This prevents creating a media engine that will fail on all subsequent segment fetches
    // If segments require authentication that's not available, fail early
    // Only validate tracks that are actually required by the consumer (e.g., EFAudio only needs audio)
    // Skip validation if no signal provided (backwards compatibility) - validation is optional
    if (signal) {
      const videoTrack = engine.getVideoTrackIndex();
      const audioTrack = engine.getAudioTrackIndex();
      const needsVideo = requiredTracks === "video" || requiredTracks === "both";
      const needsAudio = requiredTracks === "audio" || requiredTracks === "both";
      
      // Validate video track if required and available
      if (needsVideo && videoTrack && videoTrack.track !== undefined) {
        try {
          await engine.fetchInitSegment(
            { trackId: videoTrack.track, src: engine.src },
            signal,
          );
        } catch (error) {
          // If aborted, re-throw to propagate cancellation
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          // If fetch fails with 401, segments require authentication that's not available
          // Fail media engine creation early to avoid all subsequent fetch calls
          if (
            error instanceof Error &&
            (error.message.includes("401") ||
              error.message.includes("UNAUTHORIZED") ||
              (error.message.includes("Failed to fetch") && error.message.includes("401")))
          ) {
            throw new Error(`Video segments require authentication: ${error.message}`);
          }
          // For other errors (404, network errors, etc.), allow media engine creation
          // These might be transient or expected in some test scenarios
        }
      }
      
      // Check for abort between validations
      signal?.throwIfAborted();
      
      // Validate audio track if required and available
      if (needsAudio && audioTrack && audioTrack.track !== undefined) {
        try {
          await engine.fetchInitSegment(
            { trackId: audioTrack.track, src: engine.src },
            signal,
          );
        } catch (error) {
          // If aborted, re-throw to propagate cancellation
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          // If fetch fails with 401, segments require authentication that's not available
          // Fail media engine creation early to avoid all subsequent fetch calls
          if (
            error instanceof Error &&
            (error.message.includes("401") ||
              error.message.includes("UNAUTHORIZED") ||
              (error.message.includes("Failed to fetch") && error.message.includes("401")))
          ) {
            throw new Error(`Audio segments require authentication: ${error.message}`);
          }
          // For other errors (404, network errors, etc.), allow media engine creation
          // These might be transient or expected in some test scenarios
        }
      }
    }

    return engine;
  }

  getAudioTrackIndex() {
    return Object.values(this.data).find((track) => track.type === "audio");
  }

  getVideoTrackIndex() {
    return Object.values(this.data).find(
      (track) => track.type === "video" && track.track !== undefined && track.track > 0,
    );
  }

  getScrubTrackIndex() {
    // Scrub track uses track ID -1
    return this.data[-1];
  }

  // Cache renditions to avoid getter accessor issues with TypeScript declaration generation
  #cachedVideoRendition: VideoRendition | undefined | null = null;
  #cachedAudioRendition: AudioRendition | undefined | null = null;

  protected getVideoRenditionInternal() {
    if (this.#cachedVideoRendition !== null) {
      return this.#cachedVideoRendition;
    }
    const videoTrack = this.getVideoTrackIndex();

    if (!videoTrack || videoTrack.track === undefined) {
      this.#cachedVideoRendition = undefined;
      return undefined;
    }

    this.#cachedVideoRendition = {
      id: "high" as RenditionId, // Use JIT-style rendition ID
      trackId: videoTrack.track,
      src: this.src,
      startTimeOffsetMs: videoTrack.startTimeOffsetMs,
    };
    return this.#cachedVideoRendition;
  }

  protected getAudioRenditionInternal() {
    if (this.#cachedAudioRendition !== null) {
      return this.#cachedAudioRendition;
    }
    const audioTrack = this.getAudioTrackIndex();

    if (!audioTrack || audioTrack.track === undefined) {
      this.#cachedAudioRendition = undefined;
      return undefined;
    }

    this.#cachedAudioRendition = {
      id: "audio" as RenditionId, // Use JIT-style rendition ID
      trackId: audioTrack.track,
      src: this.src,
    };
    return this.#cachedAudioRendition;
  }



  /**
   * Get the source URL for JIT format (needs to be absolute URL)
   */
  private getSourceUrlForJit(): string {
    // If src is already an absolute URL, use it
    if (this.src.startsWith("http://") || this.src.startsWith("https://")) {
      return this.src;
    }
    
    // Otherwise, construct absolute URL from baseUrl or current origin
    let baseUrl = this.urlGenerator.getBaseUrl();
    // If baseUrl is empty (no apiHost set), use current origin
    if (!baseUrl) {
      baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    }
    // If src starts with /, keep it as-is (absolute path)
    // Otherwise, prepend with /
    const normalizedSrc = this.src.startsWith("/") ? this.src : `/${this.src}`;
    return `${baseUrl}${normalizedSrc}`;
  }
  
  /**
   * Get the base URL for constructing JIT endpoints
   */
  private getBaseUrlForJit(): string {
    let baseUrl = this.urlGenerator.getBaseUrl();
    // If baseUrl is empty (no apiHost set), use current origin
    if (!baseUrl) {
      baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    }
    return baseUrl;
  }


  /**
   * Map trackId to JIT rendition ID for URL generation
   * - trackId 1 (video) -> "high" (default video rendition)
   * - trackId 2 (audio) -> "audio"
   * - trackId -1 (scrub) -> "scrub"
   */
  private getRenditionId(trackId: number): RenditionId {
    if (trackId === -1) return "scrub";
    if (trackId === 2) return "audio";
    return "high"; // Default video rendition (trackId 1)
  }

  /**
   * Override isSegmentCached to use URL-based cache checking (like JitMediaEngine)
   */
  override isSegmentCached(
    segmentId: number,
    rendition: AudioRendition | VideoRendition,
  ): boolean {
    // Use URL-based cache checking (same as JitMediaEngine)
    if (!rendition.id) {
      return false;
    }
    
    // JIT uses 1-based segment IDs, but AssetMediaEngine uses 0-based internally
    const jitSegmentId = segmentId + 1;
    const segmentUrl = this.urlGenerator.generateSegmentUrl(jitSegmentId, rendition.id, this);
    return mediaCache.has(segmentUrl);
  }

  async fetchInitSegment(
    rendition: { id?: RenditionId; trackId: number | undefined; src: string },
    signal?: AbortSignal,
  ) {
    return withSpan(
      "assetEngine.fetchInitSegment",
      {
        trackId: rendition.trackId || -1,
        src: rendition.src,
      },
      undefined,
      async () => {
        if (!rendition.trackId) {
          throw new Error(
            "[fetchInitSegment] Track ID is required for asset metadata",
          );
        }
        
        // Use rendition ID if provided, otherwise map from trackId
        const renditionId = rendition.id || this.getRenditionId(rendition.trackId);
        const url = this.urlGenerator.generateSegmentUrl("init", renditionId, this);
        
        // Segments are now served directly (not via byte ranges), so use simple fetch
        return this.fetchMedia(url, signal);
      },
    );
  }

  async fetchMediaSegment(
    segmentId: number,
    rendition: { id?: RenditionId; trackId: number | undefined; src: string },
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
      async () => {
        if (!rendition.trackId) {
          throw new Error(
            "[fetchMediaSegment] Track ID is required for asset metadata",
          );
        }
        if (segmentId === undefined) {
          throw new Error("Segment ID is not available");
        }
        
        // Use rendition ID if provided, otherwise map from trackId
        const renditionId = rendition.id || this.getRenditionId(rendition.trackId);
        
        // JIT uses 1-based segment IDs, but AssetMediaEngine uses 0-based internally
        // So we need to add 1 to segmentId for the URL
        const jitSegmentId = segmentId + 1;
        const url = this.urlGenerator.generateSegmentUrl(jitSegmentId, renditionId, this);

        // Segments are now served directly (not via byte ranges), so use simple fetch
        return this.fetchMedia(url, signal);
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
    const scrubTrack = this.getScrubTrackIndex();

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
      id: "scrub" as RenditionId, // Use JIT-style rendition ID
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
    signal?: AbortSignal,
  ): Promise<(ThumbnailResult | null)[]> {
    // Use main video rendition for thumbnails - scrub track may have incomplete segments
    const rendition = this.getVideoRenditionInternal();

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
      signal,
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
