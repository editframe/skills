import type { BufferedSeekingInput } from "../BufferedSeekingInput";

/**
 * Cache for scrub BufferedSeekingInput instances
 * Since scrub segments are 30s long, we can reuse the same input for many seeks
 * within that time range, making scrub seeking very efficient
 */
export class ScrubInputCache {
  private cache = new Map<number, BufferedSeekingInput>();
  private maxCacheSize = 5; // Keep last 5 scrub inputs (covers 2.5 minutes)

  /**
   * Get or create BufferedSeekingInput for a scrub segment
   */
  async getOrCreateInput(
    segmentId: number,
    createInputFn: () => Promise<BufferedSeekingInput | undefined>,
  ): Promise<BufferedSeekingInput | undefined> {
    // Check if we already have this segment cached
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
