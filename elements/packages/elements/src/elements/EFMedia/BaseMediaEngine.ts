import { withSpan } from "../../otel/tracingHelpers.js";
import { RequestDeduplicator } from "../../transcoding/cache/RequestDeduplicator.js";
import type {
  AudioRendition,
  SegmentTimeRange,
  ThumbnailResult,
  VideoRendition,
} from "../../transcoding/types";
import { SizeAwareLRUCache } from "../../utils/LRUCache.js";
import type { EFMedia } from "../EFMedia.js";
import type { MediaRendition } from "./shared/MediaTaskUtils.js";

// Global instances shared across all media engines
export const mediaCache = new SizeAwareLRUCache<string>(100 * 1024 * 1024); // 100MB cache limit
export const globalRequestDeduplicator = new RequestDeduplicator();

export abstract class BaseMediaEngine {
  protected host: EFMedia;

  constructor(host: EFMedia) {
    this.host = host;
  }

  // Use protected abstract methods instead of abstract getters to avoid TypeScript bug
  // See: https://github.com/microsoft/TypeScript/issues/58020
  // Note: Abstract getters ALSO trigger this bug, not just getters in object literals
  protected abstract getVideoRenditionInternal(): VideoRendition | undefined;
  protected abstract getAudioRenditionInternal(): AudioRendition | undefined;

  /**
   * Get video rendition if available. Returns undefined for audio-only assets.
   * Callers should handle undefined gracefully.
   */
  getVideoRendition(): VideoRendition | undefined {
    return this.getVideoRenditionInternal();
  }

  /**
   * Get audio rendition if available. Returns undefined for video-only assets.
   * Callers should handle undefined appropriately.
   */
  getAudioRendition(): AudioRendition | undefined {
    return this.getAudioRenditionInternal();
  }

  /**
   * Unified fetch method with caching and global deduplication
   * All requests (media, manifest, init segments) go through this method
   */
  protected async fetchWithCache(
    url: string,
    options: {
      responseType: "arrayBuffer" | "json";
      headers?: Record<string, string>;
      signal?: AbortSignal;
    },
  ): Promise<any> {
    return withSpan(
      "mediaEngine.fetchWithCache",
      {
        url: url.length > 100 ? `${url.substring(0, 100)}...` : url,
        responseType: options.responseType,
        hasHeaders: !!options.headers,
      },
      undefined,
      async (span) => {
        const t0 = performance.now();
        const { responseType, headers, signal } = options;

        // Create cache key that includes URL and headers for proper isolation
        // Note: We don't include signal in cache key as it would prevent proper deduplication
        const cacheKey = headers ? `${url}:${JSON.stringify(headers)}` : url;

        // Check cache first
        const t1 = performance.now();
        const cached = mediaCache.get(cacheKey);
        const t2 = performance.now();
        span.setAttribute("cacheLookupMs", Math.round((t2 - t1) * 1000) / 1000);

        if (cached) {
          span.setAttribute("cacheHit", true);
          // If we have a cached promise, we need to handle the caller's abort signal
          // without affecting the underlying request that other instances might be using
          if (signal) {
            const t3 = performance.now();
            const result = await this.handleAbortForCachedRequest(
              cached,
              signal,
            );
            const t4 = performance.now();
            span.setAttribute(
              "handleAbortMs",
              Math.round((t4 - t3) * 100) / 100,
            );
            span.setAttribute(
              "totalCacheHitMs",
              Math.round((t4 - t0) * 100) / 100,
            );
            return result;
          }
          span.setAttribute(
            "totalCacheHitMs",
            Math.round((t2 - t0) * 100) / 100,
          );
          return cached;
        }

        span.setAttribute("cacheHit", false);

        // Use global deduplicator to prevent concurrent requests for the same resource
        // Note: We do NOT pass the signal to the deduplicator - each caller manages their own abort
        const promise = globalRequestDeduplicator.executeRequest(
          cacheKey,
          async () => {
            const fetchStart = performance.now();
            try {
              // Pass the signal to host.fetch() so network requests can be canceled when tasks are aborted
              // If multiple callers are waiting on the same request and one aborts, the request will be canceled
              // Other callers will get an error, but they can retry if needed
              const response = await this.host.fetch(url, { headers, signal });
              const fetchEnd = performance.now();
              span.setAttribute("fetchMs", fetchEnd - fetchStart);

              // Check headers first (doesn't consume body)
              const contentType = response.headers.get("content-type");

              // For JSON responses, check both status and content type before consuming body
              if (responseType === "json") {
                // If response is not ok or content type is wrong, clone to read body for error message
                if (
                  !response.ok ||
                  (contentType &&
                    !contentType.includes("application/json") &&
                    !contentType.includes("text/json"))
                ) {
                  const text = await response.clone().text();
                  if (!response.ok) {
                    throw new Error(
                      `Failed to fetch: ${response.status} ${text.substring(0, 100)}`,
                    );
                  }
                  throw new Error(
                    `Expected JSON but got ${contentType}: ${text.substring(0, 100)}`,
                  );
                }

                // Response is ok and content type is correct, parse as JSON
                try {
                  return await response.json();
                } catch (error) {
                  // Body already consumed, can't read again for error details
                  throw new Error(
                    `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              }

              // For arrayBuffer responses, check status before consuming body
              if (!response.ok) {
                const text = await response.clone().text();
                throw new Error(
                  `Failed to fetch: ${response.status} ${text.substring(0, 100)}`,
                );
              }

              const buffer = await response.arrayBuffer();
              span.setAttribute("sizeBytes", buffer.byteLength);
              return buffer;
            } catch (error) {
              // If the request was aborted, don't cache the error
              if (
                error instanceof DOMException &&
                error.name === "AbortError"
              ) {
                // Remove from cache so other requests can retry
                mediaCache.delete(cacheKey);
              }
              throw error;
            }
          },
        );

        // Cache the promise (not the result) to handle concurrent requests
        mediaCache.set(cacheKey, promise);

        // Suppress unhandled rejection on the cached promise — errors still propagate
        // to awaiters. Without this, a rejection while the promise sits in cache (with
        // no active awaiter) registers as an unhandled rejection in the browser/runtime.
        promise.catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            mediaCache.delete(cacheKey);
          }
          // All other errors are intentionally swallowed here; they will be thrown
          // again when the caller awaits fetchWithCache (lines below).
        });

        // If the caller has a signal, handle abort logic without affecting the underlying request
        if (signal) {
          const result = await this.handleAbortForCachedRequest(
            promise,
            signal,
          );
          const tEnd = performance.now();
          span.setAttribute(
            "totalFetchMs",
            Math.round((tEnd - t0) * 100) / 100,
          );
          return result;
        }

        const result = await promise;
        const tEnd = performance.now();
        span.setAttribute("totalFetchMs", Math.round((tEnd - t0) * 100) / 100);
        return result;
      },
    );
  }

  /**
   * Handles abort logic for a cached request without affecting the underlying fetch
   * This allows multiple instances to share the same cached request while each
   * manages their own abort behavior
   */
  private handleAbortForCachedRequest<T>(
    promise: Promise<T>,
    signal: AbortSignal,
  ): Promise<T> {
    // If signal is already aborted, reject immediately
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    // Return a promise that respects the caller's abort signal
    // but doesn't affect the underlying cached request.
    // The abort promise must have .catch(() => {}) to prevent unhandled rejections
    // when the main promise resolves first and the abort fires later during cleanup.
    const abortPromise = new Promise<never>((_, reject) => {
      signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
    abortPromise.catch(() => {});

    return Promise.race([promise, abortPromise]);
  }

  // Public wrapper methods that delegate to fetchWithCache
  async fetchMedia(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    // Check abort signal immediately before any processing
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return this.fetchWithCache(url, { responseType: "arrayBuffer", signal });
  }

  async fetchManifest(url: string, signal?: AbortSignal): Promise<any> {
    // Check abort signal immediately before any processing
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return this.fetchWithCache(url, { responseType: "json", signal });
  }

  async fetchMediaWithHeaders(
    url: string,
    headers: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer> {
    // Check abort signal immediately before any processing
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return this.fetchWithCache(url, {
      responseType: "arrayBuffer",
      headers,
      signal,
    });
  }

  /**
   * Abstract method for actual segment fetching - implemented by subclasses
   */
  abstract fetchMediaSegment(
    segmentId: number,
    rendition: { trackId: number | undefined; src: string },
    signal: AbortSignal,
  ): Promise<ArrayBuffer>;

  abstract fetchInitSegment(
    rendition: { trackId: number | undefined; src: string },
    signal: AbortSignal,
  ): Promise<ArrayBuffer>;

  abstract computeSegmentId(
    desiredSeekTimeMs: number,
    rendition: MediaRendition,
  ): number | undefined;

  /**
   * Calculate audio segments needed for a time range
   * Each media engine implements this based on their segment structure
   */
  calculateAudioSegmentRange(
    fromMs: number,
    toMs: number,
    rendition: AudioRendition,
    durationMs: number,
  ): SegmentTimeRange[] {
    // Default implementation for uniform segments (used by JitMediaEngine)
    if (fromMs >= toMs) {
      return [];
    }

    const segments: SegmentTimeRange[] = [];

    // Use actual segment durations if available (more accurate)
    if (
      rendition.segmentDurationsMs &&
      rendition.segmentDurationsMs.length > 0
    ) {
      let cumulativeTime = 0;

      for (let i = 0; i < rendition.segmentDurationsMs.length; i++) {
        const segmentDuration = rendition.segmentDurationsMs[i];
        if (segmentDuration === undefined) {
          continue; // Skip undefined segment durations
        }
        const segmentStartMs = cumulativeTime;
        const segmentEndMs = Math.min(
          cumulativeTime + segmentDuration,
          durationMs,
        );

        // Don't include segments that start at or beyond the file duration
        if (segmentStartMs >= durationMs) {
          break;
        }

        // Only include segments that overlap with requested time range
        if (segmentStartMs < toMs && segmentEndMs > fromMs) {
          segments.push({
            segmentId: i + 1, // Convert to 1-based
            startMs: segmentStartMs,
            endMs: segmentEndMs,
          });
        }

        cumulativeTime += segmentDuration;

        // If we've reached or exceeded file duration, stop
        if (cumulativeTime >= durationMs) {
          break;
        }
      }

      return segments;
    }

    // Fall back to fixed duration calculation for backward compatibility
    const segmentDurationMs = rendition.segmentDurationMs || 1000;
    const startSegmentIndex = Math.floor(fromMs / segmentDurationMs);
    const endSegmentIndex = Math.floor(toMs / segmentDurationMs);

    for (let i = startSegmentIndex; i <= endSegmentIndex; i++) {
      const segmentId = i + 1; // Convert to 1-based
      const segmentStartMs = i * segmentDurationMs;
      const segmentEndMs = Math.min((i + 1) * segmentDurationMs, durationMs);

      // Don't include segments that start at or beyond the file duration
      if (segmentStartMs >= durationMs) {
        break;
      }

      // Only include segments that overlap with requested time range
      if (segmentStartMs < toMs && segmentEndMs > fromMs) {
        segments.push({
          segmentId,
          startMs: segmentStartMs,
          endMs: segmentEndMs,
        });
      }
    }

    return segments;
  }

  /**
   * Check if a segment is cached for a given rendition
   * Each engine implements its own cache key strategy
   */
  abstract isSegmentCached(
    segmentId: number,
    rendition: AudioRendition | VideoRendition,
  ): boolean;

  /**
   * Extract thumbnail canvases at multiple timestamps efficiently
   * Default implementation provides helpful error information
   */
  async extractThumbnails(
    timestamps: number[],
    _signal?: AbortSignal,
  ): Promise<(ThumbnailResult | null)[]> {
    const engineName = this.constructor.name;
    console.warn(
      `${engineName}: extractThumbnails not properly implemented. ` +
        "This MediaEngine type does not support thumbnail generation. " +
        "Supported engines: JitMediaEngine. " +
        `Requested ${timestamps.length} thumbnail${timestamps.length === 1 ? "" : "s"}.`,
    );
    return timestamps.map(() => null);
  }

  abstract convertToSegmentRelativeTimestamps(
    globalTimestamps: number[],
    segmentId: number,
    rendition: VideoRendition,
  ): number[];
}
