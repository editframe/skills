import type { BufferedSeekingInput } from "../BufferedSeekingInput";

/**
 * Cache for main video BufferedSeekingInput instances
 * Main video segments are typically 2s long, so we can reuse the same input
 * for multiple frames within that segment (e.g., 60 frames at 30fps)
 */
export class MainVideoInputCache {
  #cache = new Map<string, BufferedSeekingInput>();
  #pendingPromises = new Map<
    string,
    Promise<BufferedSeekingInput | undefined>
  >();
  #maxCacheSize = 10; // Keep last 10 main inputs (covers 20 seconds at 2s/segment)

  /**
   * Create a cache key that uniquely identifies a segment
   */
  #getCacheKey(
    src: string,
    segmentId: number,
    renditionId: string | undefined,
  ): string {
    return `${src}:${renditionId || "default"}:${segmentId}`;
  }

  /**
   * Get or create BufferedSeekingInput for a main video segment.
   *
   * Uses promise deduplication to prevent race conditions when multiple
   * concurrent requests arrive for the same segment. Without this,
   * the first segment often fails when DevTools is closed because:
   * 1. Video display and thumbnail extraction both request segment 0
   * 2. Both find cache empty and start createInputFn()
   * 3. Both create separate instances, causing conflicts
   */
  async getOrCreateInput(
    src: string,
    segmentId: number,
    renditionId: string | undefined,
    createInputFn: () => Promise<BufferedSeekingInput | undefined>,
  ): Promise<BufferedSeekingInput | undefined> {
    const cacheKey = this.#getCacheKey(src, segmentId, renditionId);

    // Check if we already have a completed result cached
    const cached = this.#cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending request for this segment (deduplication!)
    // This prevents the race condition where multiple concurrent requests
    // each create their own BufferedSeekingInput instance.
    const pending = this.#pendingPromises.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Create the promise and cache it IMMEDIATELY to prevent race conditions
    const promise = createInputFn()
      .then((input) => {
        // Clean up pending promise
        this.#pendingPromises.delete(cacheKey);

        if (input) {
          // Add to completed cache
          this.#cache.set(cacheKey, input);

          // Evict oldest entries if cache is too large (LRU-like behavior)
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
        // Clean up pending promise on failure so retry is possible
        this.#pendingPromises.delete(cacheKey);
        throw error;
      });

    this.#pendingPromises.set(cacheKey, promise);
    return promise;
  }

  /**
   * Clear the entire cache (called when video changes)
   */
  clear() {
    this.#cache.clear();
    this.#pendingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.#cache.size,
      pendingSize: this.#pendingPromises.size,
      cacheKeys: Array.from(this.#cache.keys()),
    };
  }
}
