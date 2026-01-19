/**
 * URL generation utilities for transcoding endpoints
 */

import type { RenditionId } from "../types/index.js";
import type { MediaEngine } from "../types/index.ts";

export class UrlGenerator {
  constructor(private baseUrl: () => string) {}

  /**
   * Generate video segment URL
   */
  generateSegmentUrl(
    segmentId: "init" | number,
    renditionId: RenditionId,
    metadata: MediaEngine,
  ): string {
    const audioRendition = metadata.audioRendition;
    const videoRendition = metadata.videoRendition;
    const rendition = audioRendition ?? videoRendition;
    if (!rendition) {
      console.error("Rendition not found", metadata);
      throw new Error(`Rendition ${renditionId} not found`);
    }

    const template =
      segmentId === "init"
        ? metadata.templates.initSegment
        : metadata.templates.mediaSegment;
    return template
      .replace("{rendition}", renditionId)
      .replace("{segmentId}", segmentId.toString())
      .replace("{src}", metadata.src)
      .replace("{trackId}", rendition.trackId?.toString() ?? "");
  }

  /**
   * Generate init segment URL
   */
  generateInitSegmentUrl(mediaUrl: string, rendition: string): string {
    return `${this.baseUrl()}/api/v1/transcode/${rendition}/init.mp4?url=${encodeURIComponent(mediaUrl)}`;
  }

  /**
   * Generate manifest URL
   */
  generateManifestUrl(mediaUrl: string): string {
    return `${this.baseUrl()}/api/v1/transcode/manifest.json?url=${encodeURIComponent(mediaUrl)}`;
  }

  /**
   * Generate track fragment index URL using production API format
   * @deprecated Use MD5-based URL generation in AssetMediaEngine.fetch() instead
   */
  generateTrackFragmentIndexUrl(mediaUrl: string): string {
    // Normalize the path: remove leading slash and any double slashes
    let normalizedSrc = mediaUrl.startsWith("/")
      ? mediaUrl.slice(1)
      : mediaUrl;
    // Remove any remaining leading slashes (handles cases like "//assets/video.mp4")
    normalizedSrc = normalizedSrc.replace(/^\/+/, "");
    // Legacy format - kept for backward compatibility but should not be used
    return `@ef-track-fragment-index/${normalizedSrc}`;
  }

  /**
   * Generate quality presets URL
   */
  generatePresetsUrl(): string {
    return `${this.baseUrl()}/api/v1/transcode/presets`;
  }
}
