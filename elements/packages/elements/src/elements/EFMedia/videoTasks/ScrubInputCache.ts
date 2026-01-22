import type { BufferedSeekingInput } from "../BufferedSeekingInput";

/**
 * Cache for scrub BufferedSeekingInput instances.
 * 
 * For JIT media (segmented scrub tracks), caches by segment ID.
 * For Asset media (single-file scrub tracks), caches by URL so all segments
 * share the same BufferedSeekingInput instance.
 * 
 * Uses promise deduplication to prevent race conditions when multiple
 * concurrent requests arrive for the same segment.
 */
export class ScrubInputCache {
  #cache = new Map<number, BufferedSeekingInput>();
  #urlCache = new Map<string, BufferedSeekingInput>();
  #pendingBySegment = new Map<number, Promise<BufferedSeekingInput | undefined>>();
  #pendingByUrl = new Map<string, Promise<BufferedSeekingInput | undefined>>();
  #maxCacheSize = 5;

  /**
   * Get or create BufferedSeekingInput for a scrub segment.
   * 
   * Uses promise deduplication to prevent race conditions when multiple
   * concurrent requests arrive for the same segment.
   * 
   * @param segmentId - The segment ID
   * @param createInputFn - Factory function to create the input
   * @param scrubUrl - Optional URL for single-file scrub tracks (all segments share same input)
   */
  async getOrCreateInput(
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
      const promise = createInputFn().then((input) => {
        this.#pendingByUrl.delete(scrubUrl);
        if (input) {
          this.#urlCache.set(scrubUrl, input);
        }
        return input;
      }).catch((error) => {
        this.#pendingByUrl.delete(scrubUrl);
        throw error;
      });

      this.#pendingByUrl.set(scrubUrl, promise);
      return promise;
    }

    // For segmented scrub tracks (JIT), use segment-based caching
    const cached = this.#cache.get(segmentId);
    if (cached) {
      return cached;
    }

    // Check pending requests (deduplication)
    const pending = this.#pendingBySegment.get(segmentId);
    if (pending) {
      return pending;
    }

    // Create promise and cache immediately
    const promise = createInputFn().then((input) => {
      this.#pendingBySegment.delete(segmentId);
      
      if (input) {
        this.#cache.set(segmentId, input);

        // Evict oldest entries if cache is too large
        if (this.#cache.size > this.#maxCacheSize) {
          const oldestKey = this.#cache.keys().next().value;
          if (oldestKey !== undefined) {
            this.#cache.delete(oldestKey);
          }
        }
      }
      
      return input;
    }).catch((error) => {
      this.#pendingBySegment.delete(segmentId);
      throw error;
    });

    this.#pendingBySegment.set(segmentId, promise);
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
      segmentIds: Array.from(this.#cache.keys()),
    };
  }
}
