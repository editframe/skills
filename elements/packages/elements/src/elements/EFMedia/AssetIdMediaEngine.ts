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
    const data = (await response.json()) as Record<number, TrackFragmentIndex>;
    return new AssetIdMediaEngine(host, assetId, data, apiHost);
  }

  constructor(
    host: EFMedia,
    public assetId: string,
    data: Record<number, TrackFragmentIndex>,
    private apiHost: string,
  ) {
    // Pass assetId as src to parent constructor for compatibility
    super(host, assetId);
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
