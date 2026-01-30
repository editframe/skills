import type { 
  ThumbnailAddress, 
  ThumbnailAvailability,
  ThumbnailStatus,
  ThumbnailMetadata
} from "./types.js";
import { EventEmitter } from "./EventEmitter.js";

/**
 * Thumbnail Availability Cache
 * 
 * Responsibilities:
 * - Store thumbnail data
 * - Query availability
 * - Invalidate based on predicates
 * - LRU eviction
 * 
 * Does NOT know about:
 * - How thumbnails are generated
 * - Viewport state
 * - Content version tracking
 * - Display rendering
 */
export class ThumbnailCache extends EventEmitter<{
  "thumbnail-stored": { address: ThumbnailAddress; data: ImageData };
  "thumbnail-invalidated": { address: ThumbnailAddress };
  "cache-cleared": { count: number };
}> {
  // Use address hash as key
  #cache = new Map<string, ThumbnailAvailability>();
  
  // Track currently generating (to avoid duplicate work)
  #generating = new Set<string>();
  
  // LRU tracking
  #accessOrder: string[] = [];
  
  // Configuration
  #maxEntries = 500; // Configurable max cache size

  /**
   * Query availability for multiple addresses
   */
  query(addresses: ThumbnailAddress[]): ThumbnailAvailability[] {
    return addresses.map(addr => this.#queryOne(addr));
  }

  /**
   * Filter to only missing thumbnails
   */
  filterMissing(addresses: ThumbnailAddress[]): ThumbnailAddress[] {
    return addresses.filter(addr => {
      const key = this.#hashAddress(addr);
      const cached = this.#cache.get(key);
      return !cached || cached.status === "missing" || cached.status === "failed";
    });
  }

  /**
   * Store a thumbnail
   */
  store(address: ThumbnailAddress, data: ImageData, metadata?: ThumbnailMetadata): void {
    const key = this.#hashAddress(address);
    
    const availability: ThumbnailAvailability = {
      address,
      status: "available",
      data,
      metadata: metadata ?? {
        generatedAt: Date.now(),
        width: data.width,
        height: data.height,
      },
    };
    
    this.#cache.set(key, availability);
    this.#generating.delete(key);
    this.#updateLRU(key);
    
    // Evict if over limit
    this.#evictIfNeeded();
    
    this.emit("thumbnail-stored", { address, data });
  }

  /**
   * Mark thumbnail as currently generating
   */
  markGenerating(address: ThumbnailAddress): void {
    const key = this.#hashAddress(address);
    this.#generating.add(key);
    
    // Store placeholder
    const availability: ThumbnailAvailability = {
      address,
      status: "generating",
    };
    this.#cache.set(key, availability);
  }

  /**
   * Mark thumbnail as failed
   */
  markFailed(address: ThumbnailAddress): void {
    const key = this.#hashAddress(address);
    this.#generating.delete(key);
    
    const availability: ThumbnailAvailability = {
      address,
      status: "failed",
    };
    this.#cache.set(key, availability);
  }

  /**
   * Invalidate thumbnails matching a predicate
   * Returns count of invalidated entries
   */
  invalidate(predicate: (address: ThumbnailAddress) => boolean): number {
    let count = 0;
    
    for (const [key, availability] of this.#cache.entries()) {
      if (predicate(availability.address)) {
        this.#cache.delete(key);
        this.#generating.delete(key);
        this.emit("thumbnail-invalidated", { address: availability.address });
        count++;
      }
    }
    
    // Update access order
    this.#accessOrder = this.#accessOrder.filter(k => this.#cache.has(k));
    
    return count;
  }

  /**
   * Invalidate all thumbnails for an element with old version
   */
  invalidateOldVersions(elementId: string, currentVersion: number): number {
    return this.invalidate(addr => 
      addr.elementId === elementId && addr.contentVersion < currentVersion
    );
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const count = this.#cache.size;
    this.#cache.clear();
    this.#generating.clear();
    this.#accessOrder = [];
    this.emit("cache-cleared", { count });
  }

  /**
   * Get cache statistics
   */
  stats() {
    const byStatus: Record<ThumbnailStatus, number> = {
      available: 0,
      generating: 0,
      failed: 0,
      missing: 0,
    };
    
    for (const availability of this.#cache.values()) {
      byStatus[availability.status]++;
    }
    
    return {
      total: this.#cache.size,
      maxEntries: this.#maxEntries,
      byStatus,
      generatingCount: this.#generating.size,
    };
  }

  /**
   * Get cache statistics compatible with old thumbnail cache interface
   * Used by EFWorkbench for displaying cache info
   */
  async getStats(): Promise<{
    itemCount: number;
    totalSizeBytes: number;
    maxSize: number;
  }> {
    let totalSizeBytes = 0;
    
    // Calculate total size of ImageData in cache
    for (const availability of this.#cache.values()) {
      if (availability.data) {
        // ImageData size = width * height * 4 bytes per pixel (RGBA)
        totalSizeBytes += availability.data.width * availability.data.height * 4;
      }
    }
    
    return {
      itemCount: this.#cache.size,
      totalSizeBytes,
      maxSize: this.#maxEntries,
    };
  }

  /**
   * Set maximum number of cache entries
   * Used by EFWorkbench for cache size configuration
   */
  setMaxSize(maxEntries: number): void {
    this.#maxEntries = maxEntries;
    this.#evictIfNeeded();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Implementation
  // ─────────────────────────────────────────────────────────────────────────

  #queryOne(address: ThumbnailAddress): ThumbnailAvailability {
    const key = this.#hashAddress(address);
    const cached = this.#cache.get(key);
    
    if (cached) {
      this.#updateLRU(key);
      return cached;
    }
    
    // Not in cache
    return {
      address,
      status: "missing",
    };
  }

  #hashAddress(address: ThumbnailAddress): string {
    const quality = address.quality ?? "medium";
    return `${address.elementId}:v${address.contentVersion}:t${address.timeMs}:q${quality}`;
  }

  #updateLRU(key: string): void {
    // Remove from current position
    const index = this.#accessOrder.indexOf(key);
    if (index >= 0) {
      this.#accessOrder.splice(index, 1);
    }
    
    // Add to end (most recent)
    this.#accessOrder.push(key);
  }

  #evictIfNeeded(): void {
    while (this.#cache.size > this.#maxEntries) {
      // Evict least recently used
      const lru = this.#accessOrder.shift();
      if (lru) {
        const evicted = this.#cache.get(lru);
        this.#cache.delete(lru);
        
        if (evicted) {
          this.emit("thumbnail-invalidated", { address: evicted.address });
        }
      }
    }
  }
}
