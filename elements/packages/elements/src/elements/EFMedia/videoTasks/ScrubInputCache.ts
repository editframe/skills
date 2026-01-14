import type { BufferedSeekingInput } from "../BufferedSeekingInput";

/**
 * Cache for scrub BufferedSeekingInput instances.
 * 
 * For JIT media (segmented scrub tracks), caches by segment ID.
 * For Asset media (single-file scrub tracks), caches by URL so all segments
 * share the same BufferedSeekingInput instance.
 */
export class ScrubInputCache {
  private cache = new Map<number, BufferedSeekingInput>();
  private urlCache = new Map<string, BufferedSeekingInput>();
  private maxCacheSize = 5;

  /**
   * Get or create BufferedSeekingInput for a scrub segment.
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
      const cached = this.urlCache.get(scrubUrl);
      if (cached) {
        return cached;
      }

      const input = await createInputFn();
      if (!input) {
        return undefined;
      }

      this.urlCache.set(scrubUrl, input);
      return input;
    }

    // For segmented scrub tracks (JIT), use segment-based caching
    const cached = this.cache.get(segmentId);
    if (cached) {
      return cached;
    }

    // Create new input
    const input = await createInputFn();
    if (!input) {
      return undefined;
    }

    // Add to cache and maintain size limit
    this.cache.set(segmentId, input);

    // Evict oldest entries if cache is too large
    if (this.cache.size > this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    return input;
  }

  /**
   * Clear the entire cache (called when video changes)
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      segmentIds: Array.from(this.cache.keys()),
    };
  }
}
