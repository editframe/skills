/**
 * URL generation utilities for transcoding endpoints
 */

export class UrlGenerator {
  constructor(private baseUrl: () => string) {}

  /**
   * Get the base URL for constructing absolute URLs
   */
  getBaseUrl(): string {
    return this.baseUrl();
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
   * Generate quality presets URL
   */
  generatePresetsUrl(): string {
    return `${this.baseUrl()}/api/v1/transcode/presets`;
  }
}
