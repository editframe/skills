import type { TrackFragmentIndex } from "@editframe/assets";
import type {
  InitSegmentPaths,
  MediaEngine,
  VideoRendition,
} from "../../transcoding/types";
import type { UrlGenerator } from "../../transcoding/utils/UrlGenerator";
import type { EFMedia } from "../EFMedia";
import { AssetMediaEngine } from "./AssetMediaEngine";

export class FileMediaEngine
  extends AssetMediaEngine
  implements MediaEngine
{
  static async fetchByFileId(
    host: EFMedia,
    _urlGenerator: UrlGenerator,
    fileId: string,
    apiHost: string,
    requiredTracks: "audio" | "video" | "both" = "both",
    signal?: AbortSignal,
  ) {
    const url = `${apiHost}/api/v1/files/${fileId}/index`;
    const response = await host.fetch(url, { signal });
    
    signal?.throwIfAborted();
    
    const contentType = response.headers.get("content-type");
    
    if (!response.ok || (contentType && !contentType.includes("application/json"))) {
      const text = await response.clone().text();
      if (!response.ok) {
        throw new Error(`Failed to fetch asset index: ${response.status} ${text}`);
      }
      throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 100)}`);
    }
    
    let data: Record<number, TrackFragmentIndex>;
    try {
      data = (await response.json()) as Record<number, TrackFragmentIndex>;
      signal?.throwIfAborted();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    const engine = new FileMediaEngine(host, fileId, data, apiHost, _urlGenerator);
    
    signal?.throwIfAborted();
    
    if (signal) {
      const videoTrack = engine.getVideoTrackIndex();
      const audioTrack = engine.getAudioTrackIndex();
      const needsVideo = requiredTracks === "video" || requiredTracks === "both";
      const needsAudio = requiredTracks === "audio" || requiredTracks === "both";
      
      if (needsVideo && videoTrack && videoTrack.track !== undefined) {
        try {
          await engine.fetchInitSegment(
            { trackId: videoTrack.track, src: engine.src },
            signal,
          );
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          if (
            error instanceof Error &&
            (error.message.includes("401") ||
              error.message.includes("UNAUTHORIZED") ||
              (error.message.includes("Failed to fetch") && error.message.includes("401")))
          ) {
            throw new Error(`Video segments require authentication: ${error.message}`);
          }
        }
      }
      
      signal?.throwIfAborted();
      
      if (needsAudio && audioTrack && audioTrack.track !== undefined) {
        try {
          await engine.fetchInitSegment(
            { trackId: audioTrack.track, src: engine.src },
            signal,
          );
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          if (
            error instanceof Error &&
            (error.message.includes("401") ||
              error.message.includes("UNAUTHORIZED") ||
              (error.message.includes("Failed to fetch") && error.message.includes("401")))
          ) {
            throw new Error(`Audio segments require authentication: ${error.message}`);
          }
        }
      }
    }
    
    return engine;
  }

  /** @deprecated Use fetchByFileId instead */
  static fetchByAssetId = FileMediaEngine.fetchByFileId;

  public fileId: string;

  constructor(
    host: EFMedia,
    fileId: string,
    data: Record<number, TrackFragmentIndex>,
    private apiHost: string,
    urlGenerator: UrlGenerator,
  ) {
    super(host, fileId, urlGenerator);
    this.fileId = fileId;
    this.data = data;

    const longestFragment = Object.values(this.data).reduce(
      (max, fragment) => Math.max(max, fragment.duration / fragment.timescale),
      0,
    );
    this.durationMs = longestFragment * 1000;
    
    this.templates = {
      initSegment: `${apiHost}/api/v1/files/${fileId}/tracks/{trackId}`,
      mediaSegment: `${apiHost}/api/v1/files/${fileId}/tracks/{trackId}`,
    };
  }

  /** @deprecated Use fileId instead */
  get assetId(): string {
    return this.fileId;
  }

  getInitSegmentPaths(): InitSegmentPaths {
    const paths: InitSegmentPaths = {};
    const audioTrack = this.getAudioTrackIndex();
    const videoTrack = this.getVideoTrackIndex();

    if (audioTrack !== undefined) {
      paths.audio = {
        path: `${this.apiHost}/api/v1/files/${this.fileId}/tracks/${audioTrack.track}`,
        pos: audioTrack.initSegment.offset,
        size: audioTrack.initSegment.size,
      };
    }

    if (videoTrack !== undefined) {
      paths.video = {
        path: `${this.apiHost}/api/v1/files/${this.fileId}/tracks/${videoTrack.track}`,
        pos: videoTrack.initSegment.offset,
        size: videoTrack.initSegment.size,
      };
    }

    return paths;
  }

  templates!: { initSegment: string; mediaSegment: string };

  buildInitSegmentUrl(trackId: number) {
    return `${this.apiHost}/api/v1/files/${this.fileId}/tracks/${trackId}`;
  }

  buildMediaSegmentUrl(trackId: number, _segmentId: number) {
    return `${this.apiHost}/api/v1/files/${this.fileId}/tracks/${trackId}`;
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

/** @deprecated Use FileMediaEngine instead */
export const AssetIdMediaEngine = FileMediaEngine;
