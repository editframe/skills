import type { Input } from "mediabunny";
import { LRUCache } from "../../../utils/LRUCache.js";

/**
 * Global cache for MediaBunny Input instances
 * Shared across all MediaEngine instances to prevent duplicate decoding
 * of the same segment data
 */
class GlobalInputCache {
  private cache = new LRUCache<string, Input>(50); // 50 Input instances max

  /**
   * Generate standardized cache key for Input objects
   * Format: "input:{src}:{segmentId}:{renditionId}"
   */
  private generateKey(src: string, segmentId: number, renditionId?: string): string {
    return `input:${src}:${segmentId}:${renditionId || "default"}`;
  }

  /**
   * Get cached Input object
   */
  get(src: string, segmentId: number, renditionId?: string): Input | undefined {
    const key = this.generateKey(src, segmentId, renditionId);
    return this.cache.get(key);
  }

  /**
   * Cache Input object
   */
  set(src: string, segmentId: number, input: Input, renditionId?: string): void {
    const key = this.generateKey(src, segmentId, renditionId);
    this.cache.set(key, input);
  }

  /**
   * Check if Input is cached
   */
  has(src: string, segmentId: number, renditionId?: string): boolean {
    const key = this.generateKey(src, segmentId, renditionId);
    return this.cache.has(key);
  }

  /**
   * Clear all cached Input objects
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getStats() {
    return {
      size: this.cache.size,
      cachedKeys: Array.from((this.cache as any).cache.keys()),
    };
  }
}

// Single global instance shared across all MediaEngine instances
export const globalInputCache = new GlobalInputCache();

// Export for debugging (works in both browser and server)
(globalThis as typeof globalThis & { debugInputCache: typeof globalInputCache }).debugInputCache =
  globalInputCache;
