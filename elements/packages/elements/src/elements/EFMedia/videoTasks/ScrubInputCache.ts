import type { BufferedSeekingInput } from "../BufferedSeekingInput";

/**
 * Cache for scrub BufferedSeekingInput instances.
 *
 * For JIT media (segmented scrub tracks), caches by src + segment ID.
 * For Asset media (single-file scrub tracks), caches by URL so all segments
 * share the same BufferedSeekingInput instance.
 *
 * Uses promise deduplication to prevent race conditions when multiple
 * concurrent requests arrive for the same segment.
 */
export class ScrubInputCache {
  // Changed from Map<number> to Map<string> to include src in key
  #cache = new Map<string, BufferedSeekingInput>();
  #urlCache = new Map<string, BufferedSeekingInput>();
  #pendingBySegment = new Map<
    string,
    Promise<BufferedSeekingInput | undefined>
  >();
  #pendingByUrl = new Map<string, Promise<BufferedSeekingInput | undefined>>();
  #maxCacheSize = 5;

  /**
   * Create a cache key that uniquely identifies a segment for a specific video
   */
  #getCacheKey(src: string, segmentId: number): string {
    return `${src}:${segmentId}`;
  }

  /**
   * Get or create BufferedSeekingInput for a scrub segment.
   *
   * Uses promise deduplication to prevent race conditions when multiple
   * concurrent requests arrive for the same segment.
   *
   * @param src - The source URL of the video (required to distinguish between videos)
   * @param segmentId - The segment ID
   * @param createInputFn - Factory function to create the input
   * @param scrubUrl - Optional URL for single-file scrub tracks (all segments share same input)
   */
  async getOrCreateInput(
    src: string,
    segmentId: number,
    createInputFn: () => Promise<BufferedSeekingInput | undefined>,
    scrubUrl?: string,
  ): Promise<BufferedSeekingInput | undefined> {
    // For single-file scrub tracks (AssetMediaEngine), use URL-based caching
    // This ensures all segments share the same BufferedSeekingInput
    if (scrubUrl) {
      // Check completed cache
      const cached = this.#urlCache.get(scrubUrl);
      if (cached) {
        return cached;
      }

      // Check pending requests (deduplication)
      const pending = this.#pendingByUrl.get(scrubUrl);
      if (pending) {
        return pending;
      }

      // Create promise and cache immediately
      const promise = createInputFn()
        .then((input) => {
          this.#pendingByUrl.delete(scrubUrl);
          if (input) {
            this.#urlCache.set(scrubUrl, input);
          }
          return input;
        })
        .catch((error) => {
          this.#pendingByUrl.delete(scrubUrl);
          throw error;
        });

      this.#pendingByUrl.set(scrubUrl, promise);
      return promise;
    }

    // For segmented scrub tracks (JIT), use src + segment-based caching
    const cacheKey = this.#getCacheKey(src, segmentId);
    const cached = this.#cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check pending requests (deduplication)
    const pending = this.#pendingBySegment.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Create promise and cache immediately
    const promise = createInputFn()
      .then((input) => {
        this.#pendingBySegment.delete(cacheKey);

        if (input) {
          this.#cache.set(cacheKey, input);

          // Evict oldest entries if cache is too large
          if (this.#cache.size > this.#maxCacheSize) {
            const oldestKey = this.#cache.keys().next().value;
            if (oldestKey !== undefined) {
              this.#cache.delete(oldestKey);
            }
          }
        }

        return input;
      })
      .catch((error) => {
        this.#pendingBySegment.delete(cacheKey);
        throw error;
      });

    this.#pendingBySegment.set(cacheKey, promise);
    return promise;
  }

  /**
   * Clear the entire cache (called when video changes)
   */
  clear() {
    this.#cache.clear();
    this.#urlCache.clear();
    this.#pendingBySegment.clear();
    this.#pendingByUrl.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.#cache.size,
      urlCacheSize: this.#urlCache.size,
      pendingCount: this.#pendingBySegment.size + this.#pendingByUrl.size,
      cacheKeys: Array.from(this.#cache.keys()),
    };
  }
}
