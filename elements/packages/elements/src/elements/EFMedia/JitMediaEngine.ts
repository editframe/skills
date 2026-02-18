import type {
  AudioRendition,
  MediaEngine,
  RenditionId,
  ThumbnailResult,
  VideoRendition,
} from "../../transcoding/types";
import type { ManifestResponse } from "../../transcoding/types/index.js";
import type { UrlGenerator } from "../../transcoding/utils/UrlGenerator";
import type { EFMedia } from "../EFMedia.js";
import { BaseMediaEngine, mediaCache } from "./BaseMediaEngine";
import { ThumbnailExtractor } from "./shared/ThumbnailExtractor.js";

export class JitMediaEngine extends BaseMediaEngine implements MediaEngine {
  private urlGenerator: UrlGenerator;
  private data: ManifestResponse = {} as ManifestResponse;
  private thumbnailExtractor: ThumbnailExtractor;

  static async fetch(
    host: EFMedia,
    urlGenerator: UrlGenerator,
    url: string,
    signal?: AbortSignal,
  ) {
    const engine = new JitMediaEngine(host, urlGenerator);
    const data = await engine.fetchManifest(url, signal);

    // Check for abort after potentially slow network operation
    signal?.throwIfAborted();

    engine.data = data;
    // Set MediaEngine interface properties
    engine.durationMs = data.durationMs;
    engine.src = data.sourceUrl;
    engine.templates = data.endpoints;
    return engine;
  }

  // MediaEngine interface properties
  durationMs = 0;
  src = "";
  templates!: { initSegment: string; mediaSegment: string };

  constructor(host: EFMedia, urlGenerator: UrlGenerator) {
    super(host);
    this.urlGenerator = urlGenerator;
    this.thumbnailExtractor = new ThumbnailExtractor(this);
  }

  // Cache renditions to avoid recomputing on every access
  #cachedVideoRendition: VideoRendition | undefined | null = null;
  #cachedAudioRendition: AudioRendition | undefined | null = null;

  // Implement abstract methods required by BaseMediaEngine
  protected getVideoRenditionInternal(): VideoRendition | undefined {
    return this.videoRendition;
  }

  protected getAudioRenditionInternal(): AudioRendition | undefined {
    return this.audioRendition;
  }

  get audioRendition(): AudioRendition | undefined {
    if (this.#cachedAudioRendition !== null) {
      return this.#cachedAudioRendition;
    }
    if (!this.data.audioRenditions || this.data.audioRenditions.length === 0) {
      this.#cachedAudioRendition = undefined;
      return undefined;
    }

    const rendition = this.data.audioRenditions[0];
    if (!rendition) {
      this.#cachedAudioRendition = undefined;
      return undefined;
    }

    this.#cachedAudioRendition = {
      id: rendition.id as RenditionId,
      trackId: undefined,
      src: this.data.sourceUrl,
      segmentDurationMs: rendition.segmentDurationMs,
      segmentDurationsMs: rendition.segmentDurationsMs,
      startTimeOffsetMs: rendition.startTimeOffsetMs,
    };
    return this.#cachedAudioRendition;
  }

  get videoRendition(): VideoRendition | undefined {
    if (this.#cachedVideoRendition !== null) {
      return this.#cachedVideoRendition;
    }
    if (!this.data.videoRenditions || this.data.videoRenditions.length === 0) {
      this.#cachedVideoRendition = undefined;
      return undefined;
    }

    const rendition = this.data.videoRenditions[0];
    if (!rendition) {
      this.#cachedVideoRendition = undefined;
      return undefined;
    }

    this.#cachedVideoRendition = {
      id: rendition.id as RenditionId,
      trackId: undefined,
      src: this.data.sourceUrl,
      segmentDurationMs: rendition.segmentDurationMs,
      segmentDurationsMs: rendition.segmentDurationsMs,
      startTimeOffsetMs: rendition.startTimeOffsetMs,
    };
    return this.#cachedVideoRendition;
  }

  async fetchInitSegment(
    rendition: { id?: RenditionId; trackId: number | undefined; src: string },
    signal: AbortSignal,
  ) {
    if (!rendition.id) {
      throw new Error("Rendition ID is required for JIT metadata");
    }
    const url = this.urlGenerator.generateSegmentUrl(
      "init",
      rendition.id,
      this,
    );

    // Use unified fetch method
    return this.fetchMedia(url, signal);
  }

  async fetchMediaSegment(
    segmentId: number,
    rendition: { id?: RenditionId; trackId: number | undefined; src: string },
    signal: AbortSignal,
  ) {
    if (!rendition.id) {
      throw new Error("Rendition ID is required for JIT metadata");
    }
    const url = this.urlGenerator.generateSegmentUrl(
      segmentId,
      rendition.id,
      this,
    );
    return this.fetchMedia(url, signal);
  }

  computeSegmentId(
    desiredSeekTimeMs: number,
    rendition: VideoRendition | AudioRendition,
  ) {
    // Don't request segments beyond the actual file duration
    // Note: seeking to exactly durationMs should be allowed (it's the last moment of the file)
    if (desiredSeekTimeMs > this.durationMs) {
      return undefined;
    }

    // Use actual segment durations if available (more accurate)
    if (
      rendition.segmentDurationsMs &&
      rendition.segmentDurationsMs.length > 0
    ) {
      let cumulativeTime = 0;

      for (let i = 0; i < rendition.segmentDurationsMs.length; i++) {
        const segmentDuration = rendition.segmentDurationsMs[i];
        if (segmentDuration === undefined) {
          throw new Error("Segment duration is required for JIT metadata");
        }
        const segmentStartMs = cumulativeTime;
        const segmentEndMs = cumulativeTime + segmentDuration;

        // Check if the desired seek time falls within this segment
        // Special case: for the last segment, include the exact end time
        const isLastSegment = i === rendition.segmentDurationsMs.length - 1;
        const includesEndTime =
          isLastSegment && desiredSeekTimeMs === this.durationMs;

        if (
          desiredSeekTimeMs >= segmentStartMs &&
          (desiredSeekTimeMs < segmentEndMs || includesEndTime)
        ) {
          return i + 1; // Convert 0-based to 1-based segment ID
        }

        cumulativeTime += segmentDuration;

        // If we've reached or exceeded file duration, stop
        if (cumulativeTime >= this.durationMs) {
          break;
        }
      }

      // If we didn't find a segment, return undefined
      return undefined;
    }

    // Fall back to fixed duration calculation for backward compatibility
    if (!rendition.segmentDurationMs) {
      throw new Error("Segment duration is required for JIT metadata");
    }

    const segmentIndex = Math.floor(
      desiredSeekTimeMs / rendition.segmentDurationMs,
    );

    // Calculate the actual segment start time
    const segmentStartMs = segmentIndex * rendition.segmentDurationMs;

    // If this segment would start at or beyond file duration, it doesn't exist
    if (segmentStartMs >= this.durationMs) {
      return undefined;
    }

    return segmentIndex + 1; // Convert 0-based to 1-based
  }

  getBufferConfig() {
    return {
      videoBufferDurationMs: 4000,
      audioBufferDurationMs: 4000,
      maxVideoBufferFetches: 2,
      maxAudioBufferFetches: 2,
      bufferThresholdMs: 30000,
    };
  }

  getScrubVideoRendition(): VideoRendition | undefined {
    if (!this.data.videoRenditions) return undefined;

    const scrubManifestRendition = this.data.videoRenditions.find(
      (r) => r.id === "scrub",
    );

    if (!scrubManifestRendition) return this.getVideoRenditionInternal(); // Fallback to main

    return {
      id: scrubManifestRendition.id as any,
      trackId: undefined,
      src: this.src,
      segmentDurationMs: scrubManifestRendition.segmentDurationMs,
      segmentDurationsMs: scrubManifestRendition.segmentDurationsMs,
    };
  }

  isSegmentCached(
    segmentId: number,
    rendition: AudioRendition | VideoRendition,
  ): boolean {
    if (!rendition.id) {
      return false;
    }

    const segmentUrl = this.urlGenerator.generateSegmentUrl(
      segmentId,
      rendition.id,
      this,
    );
    return mediaCache.has(segmentUrl);
  }

  /**
   * Extract thumbnail canvases using same rendition priority as video playback for frame alignment
   */
  async extractThumbnails(
    timestamps: number[],
    signal?: AbortSignal,
  ): Promise<(ThumbnailResult | null)[]> {
    // Use same rendition priority as video: try main rendition first for frame alignment
    let rendition: VideoRendition;
    try {
      const mainRendition = this.getVideoRenditionInternal();
      if (mainRendition) {
        rendition = mainRendition;
      } else {
        const scrubRendition = this.getScrubVideoRendition();
        if (scrubRendition) {
          rendition = scrubRendition;
        } else {
          throw new Error("No video rendition available");
        }
      }
    } catch (error) {
      console.warn(
        "JitMediaEngine: No video rendition available for thumbnails",
        error,
      );
      return timestamps.map(() => null);
    }

    // Use shared thumbnail extraction logic
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
    _rendition: VideoRendition,
  ): number[] {
    return globalTimestamps.map((timestamp) => timestamp / 1000);
  }
}
