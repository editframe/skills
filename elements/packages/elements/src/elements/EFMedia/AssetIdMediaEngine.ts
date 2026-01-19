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
  ) {
    const url = `${apiHost}/api/v1/isobmff_files/${assetId}/index`;
    const response = await host.fetch(url);
    
    // Check if response is ok before parsing JSON
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch asset index: ${response.status} ${text}`);
    }
    
    // Check content type to avoid parsing non-JSON responses
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 100)}`);
    }
    
    let data: Record<number, TrackFragmentIndex>;
    try {
      data = (await response.json()) as Record<number, TrackFragmentIndex>;
    } catch (error) {
      // If JSON parse fails, the response might be "File not found" or similar text
      const text = await response.text();
      throw new Error(`Failed to parse JSON response: ${text.substring(0, 100)}`);
    }
    
    const engine = new AssetIdMediaEngine(host, assetId, data, apiHost, urlGenerator);
    
    // Validate that segments are accessible by trying to fetch the first init segment
    // This prevents creating a media engine that will fail on all subsequent segment fetches
    // If segments require authentication that's not available, fail early
    // Check both video and audio tracks if available, as they might have different auth requirements
    const videoTrack = engine.videoTrackIndex;
    const audioTrack = engine.audioTrackIndex;
    
    // Validate video track if available
    if (videoTrack && videoTrack.track !== undefined) {
      try {
        await engine.fetchInitSegment(
          { trackId: videoTrack.track, src: engine.src },
          new AbortController().signal,
        );
      } catch (error) {
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
        // For abort errors, continue - might be cancelled
        if (error instanceof DOMException && error.name === "AbortError") {
          // Continue to check audio track or return engine
        } else {
          // For other errors (404, network errors, etc.), allow media engine creation
          // These might be transient or expected in some test scenarios
        }
      }
    }
    
    // Validate audio track if available (and video validation didn't fail with auth)
    if (audioTrack && audioTrack.track !== undefined) {
      try {
        await engine.fetchInitSegment(
          { trackId: audioTrack.track, src: engine.src },
          new AbortController().signal,
        );
      } catch (error) {
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
        // For abort errors, continue - might be cancelled
        if (error instanceof DOMException && error.name === "AbortError") {
          // Continue - abort is fine
        } else {
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
  }

  // Override URL-building methods to use API endpoints instead of file paths
  get initSegmentPaths() {
    const paths: InitSegmentPaths = {};

    if (this.audioTrackIndex !== undefined) {
      paths.audio = {
        path: `${this.apiHost}/api/v1/isobmff_tracks/${this.assetId}/${this.audioTrackIndex.track}`,
        pos: this.audioTrackIndex.initSegment.offset,
        size: this.audioTrackIndex.initSegment.size,
      };
    }

    if (this.videoTrackIndex !== undefined) {
      paths.video = {
        path: `${this.apiHost}/api/v1/isobmff_tracks/${this.assetId}/${this.videoTrackIndex.track}`,
        pos: this.videoTrackIndex.initSegment.offset,
        size: this.videoTrackIndex.initSegment.size,
      };
    }

    return paths;
  }

  get templates() {
    return {
      initSegment: `${this.apiHost}/api/v1/isobmff_tracks/${this.assetId}/{trackId}`,
      mediaSegment: `${this.apiHost}/api/v1/isobmff_tracks/${this.assetId}/{trackId}`,
    };
  }

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
