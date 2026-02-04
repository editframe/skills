import type { TrackFragmentIndex } from "@editframe/assets";
import type {
  InitSegmentPaths,
  MediaEngine,
  VideoRendition,
} from "../../transcoding/types";
import type { UrlGenerator } from "../../transcoding/utils/UrlGenerator";
import type { EFMedia } from "../EFMedia";
import { AssetMediaEngine } from "./AssetMediaEngine";

export class AssetIdMediaEngine
  extends AssetMediaEngine
  implements MediaEngine
{
  static async fetchByAssetId(
    host: EFMedia,
    _urlGenerator: UrlGenerator,
    assetId: string,
    apiHost: string,
    requiredTracks: "audio" | "video" | "both" = "both",
    signal?: AbortSignal,
  ) {
    const url = `${apiHost}/api/v1/isobmff_files/${assetId}/index`;
    const response = await host.fetch(url, { signal });
    
    // Check for abort after potentially slow network operation
    signal?.throwIfAborted();
    
    // Check response headers first (doesn't consume body)
    const contentType = response.headers.get("content-type");
    
    // If response is not ok or content type is wrong, clone to read body for error message
    if (!response.ok || (contentType && !contentType.includes("application/json"))) {
      const text = await response.clone().text();
      if (!response.ok) {
        throw new Error(`Failed to fetch asset index: ${response.status} ${text}`);
      }
      throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 100)}`);
    }
    
    // Response is ok and content type is correct, parse as JSON  
    let data: Record<number, TrackFragmentIndex>;
    try {
      data = (await response.json()) as Record<number, TrackFragmentIndex>;
      
      // Check for abort after potentially slow JSON parsing
      signal?.throwIfAborted();
    } catch (error) {
      // If aborted during JSON parsing, re-throw to propagate cancellation
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      // Body already consumed, can't read again for error details
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    const engine = new AssetIdMediaEngine(host, assetId, data, apiHost, _urlGenerator);
    
    // Check for abort after engine construction  
    signal?.throwIfAborted();
    
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

  constructor(
    host: EFMedia,
    public assetId: string,
    data: Record<number, TrackFragmentIndex>,
    private apiHost: string,
    urlGenerator: UrlGenerator,
  ) {
    // Pass assetId as src to parent constructor for compatibility
    super(host, assetId, urlGenerator);
    // Initialize data after parent constructor
    this.data = data;

    // Calculate duration from the data
    const longestFragment = Object.values(this.data).reduce(
      (max, fragment) => Math.max(max, fragment.duration / fragment.timescale),
      0,
    );
    this.durationMs = longestFragment * 1000;
    
    // Initialize MediaEngine interface properties
    this.templates = {
      initSegment: `${apiHost}/api/v1/isobmff_tracks/${assetId}/{trackId}`,
      mediaSegment: `${apiHost}/api/v1/isobmff_tracks/${assetId}/{trackId}`,
    };
  }

  // Override URL-building methods to use API endpoints instead of file paths
  getInitSegmentPaths(): InitSegmentPaths {
    const paths: InitSegmentPaths = {};
    const audioTrack = this.getAudioTrackIndex();
    const videoTrack = this.getVideoTrackIndex();

    if (audioTrack !== undefined) {
      paths.audio = {
        path: `${this.apiHost}/api/v1/isobmff_tracks/${this.assetId}/${audioTrack.track}`,
        pos: audioTrack.initSegment.offset,
        size: audioTrack.initSegment.size,
      };
    }

    if (videoTrack !== undefined) {
      paths.video = {
        path: `${this.apiHost}/api/v1/isobmff_tracks/${this.assetId}/${videoTrack.track}`,
        pos: videoTrack.initSegment.offset,
        size: videoTrack.initSegment.size,
      };
    }

    return paths;
  }

  // MediaEngine interface property - initialized in constructor/static fetch
  templates!: { initSegment: string; mediaSegment: string };

  buildInitSegmentUrl(trackId: number) {
    return `${this.apiHost}/api/v1/isobmff_tracks/${this.assetId}/${trackId}`;
  }

  buildMediaSegmentUrl(trackId: number, _segmentId: number) {
    return `${this.apiHost}/api/v1/isobmff_tracks/${this.assetId}/${trackId}`;
  }

  convertToSegmentRelativeTimestamps(
    globalTimestamps: number[],
    segmentId: number,
    rendition: VideoRendition,
  ): number[] {
    if (!rendition.trackId) {
      throw new Error(
        "[convertToSegmentRelativeTimestamps] Track ID is required for asset metadata",
      );
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
