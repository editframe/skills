import type { BufferedSeekingInput } from "../BufferedSeekingInput";

/**
 * Cache for main video BufferedSeekingInput instances
 * Main video segments are typically 2s long, so we can reuse the same input
 * for multiple frames within that segment (e.g., 60 frames at 30fps)
 */
export class MainVideoInputCache {
  private cache = new Map<string, BufferedSeekingInput>();
  private maxCacheSize = 10; // Keep last 10 main inputs (covers 20 seconds at 2s/segment)

  /**
   * Create a cache key that uniquely identifies a segment
   */
  private getCacheKey(
    src: string,
    segmentId: number,
    renditionId: string | undefined,
  ): string {
    return `${src}:${renditionId || "default"}:${segmentId}`;
  }

  /**
   * Get or create BufferedSeekingInput for a main video segment
   */
  async getOrCreateInput(
    src: string,
    segmentId: number,
    renditionId: string | undefined,
    createInputFn: () => Promise<BufferedSeekingInput | undefined>,
  ): Promise<BufferedSeekingInput | undefined> {
    const cacheKey = this.getCacheKey(src, segmentId, renditionId);

    // Check if we already have this segment cached
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Create new input
    const input = await createInputFn();
    if (!input) {
      return undefined;
    }

    // Add to cache and maintain size limit
    this.cache.set(cacheKey, input);

    // Evict oldest entries if cache is too large (LRU-like behavior)
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
      cacheKeys: Array.from(this.cache.keys()),
    };
  }
}
