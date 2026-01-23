/**
 * Session-only thumbnail cache - simple Map-based storage.
 * 
 * DESIGN: Memory-only storage for thumbnails during the session.
 * - Fast synchronous access
 * - Automatic invalidation on time-range changes
 * - No persistence between sessions (refresh clears cache)
 * - No workers, no IndexedDB complexity
 */

import type { ThumbnailCacheStats } from "./thumbnailCache.js";

/** Cache key format: "rootId:elementId:epoch:quantizedTimeMs" */
type CacheKey = string;

/** Cache entry with metadata for invalidation */
interface CacheEntry {
  imageData: ImageData;
  timeMs: number; // Original (non-quantized) time for invalidation checks
  elementId: string; // Element identifier for scoped invalidation
}

/**
 * Quantize timestamp to 30fps frame boundaries for consistent caching.
 * This eliminates cache misses from floating point precision differences.
 */
export function quantizeTimestamp(timeMs: number): number {
  const frameIntervalMs = 1000 / 30; // 33.33ms at 30fps
  return Math.round(timeMs / frameIntervalMs) * frameIntervalMs;
}

/**
 * Generate cache key for thumbnail image data.
 * Format: "rootId:elementId:epoch:quantizedTimeMs"
 */
export function getCacheKey(
  rootId: string,
  elementId: string,
  timeMs: number,
  epoch: number = 0,
): string {
  const quantizedTimeMs = quantizeTimestamp(timeMs);
  return `${rootId}:${elementId}:${epoch}:${quantizedTimeMs}`;
}

/**
 * Parse a cache key back into its components.
 */
function parseCacheKey(key: CacheKey): { rootId: string; elementId: string; epoch: number; timeMs: number } | null {
  const parts = key.split(":");
  if (parts.length < 4) return null; // Now requires at least 4 parts: rootId:elementId:epoch:timeMs
  
  // Last part is always timeMs
  const timeMs = Number.parseFloat(parts.pop()!);
  // Second to last is epoch
  const epoch = Number.parseInt(parts.pop()!, 10);
  // Everything before epoch is rootId:elementId (elementId may contain colons in URLs)
  const rootId = parts[0]!;
  parts.shift(); // Remove rootId
  const elementId = parts.join(":"); // Rejoin middle parts as elementId
  
  if (Number.isNaN(timeMs) || Number.isNaN(epoch)) return null;
  return { rootId, elementId, epoch, timeMs };
}

/**
 * Session thumbnail cache - simple Map with time-range invalidation.
 */
export class SessionThumbnailCache {
  private cache: Map<CacheKey, CacheEntry> = new Map();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Check if a thumbnail exists in cache.
   */
  has(key: CacheKey): boolean {
    return this.cache.has(key);
  }

  /**
   * Get a thumbnail from cache.
   */
  get(key: CacheKey): ImageData | undefined {
    return this.cache.get(key)?.imageData;
  }

  /**
   * Store a thumbnail in cache.
   */
  set(key: CacheKey, imageData: ImageData, timeMs: number, elementId: string): void {
    // Enforce max size with simple FIFO eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { imageData, timeMs, elementId });
  }

  /**
   * Invalidate all thumbnails for a specific element.
   */
  invalidateElement(rootId: string, elementId: string): number {
    // Match pattern: rootId:elementId:epoch:timeMs
    // We need to match rootId:elementId: followed by any epoch
    const prefix = `${rootId}:${elementId}:`;
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Invalidate thumbnails within a time range for a specific element.
   * Used when content changes at specific times.
   */
  invalidateTimeRange(rootId: string, elementId: string, startTimeMs: number, endTimeMs: number): number {
    // Match pattern: rootId:elementId:epoch:timeMs
    const prefix = `${rootId}:${elementId}:`;
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix)) {
        // Check if this thumbnail's time falls within the invalidated range
        if (entry.timeMs >= startTimeMs && entry.timeMs <= endTimeMs) {
          this.cache.delete(key);
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Invalidate all thumbnails that overlap with a given time range.
   * This is more aggressive - invalidates any thumbnail that might show content from the range.
   */
  invalidateOverlappingRange(rootId: string, startTimeMs: number, endTimeMs: number): number {
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      const parsed = parseCacheKey(key);
      if (!parsed || parsed.rootId !== rootId) continue;
      
      // Invalidate if the thumbnail's time overlaps with the changed range
      if (entry.timeMs >= startTimeMs && entry.timeMs <= endTimeMs) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Clear entire cache.
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get current cache size.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Set maximum cache size.
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
    
    // Evict entries if over new limit
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      } else {
        break;
      }
    }
  }

  /**
   * Get cache statistics.
   */
  async getStats(): Promise<ThumbnailCacheStats> {
    // Calculate total size by summing all ImageData sizes
    let totalSizeBytes = 0;
    for (const entry of this.cache.values()) {
      // ImageData size = width * height * 4 bytes (RGBA)
      totalSizeBytes += entry.imageData.width * entry.imageData.height * 4;
    }

    return {
      itemCount: this.cache.size,
      totalSizeBytes,
      maxSize: this.maxSize,
    };
  }
}

// Global singleton cache instance for all thumbnail strips
export const sessionThumbnailCache = new SessionThumbnailCache();

// Export for debugging
(globalThis as any).debugSessionThumbnailCache = sessionThumbnailCache;
