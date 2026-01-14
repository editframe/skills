/**
 * Persistent thumbnail cache with IndexedDB storage.
 * Wraps OrderedLRUCache with persistence layer for thumbnail ImageData.
 */

import { OrderedLRUCache } from "../utils/LRUCache.js";
import { getThumbnailCacheMaxSize } from "../preview/thumbnailCacheSettings.js";

/**
 * Cache statistics interface
 */
export interface ThumbnailCacheStats {
  itemCount: number;
  totalSizeBytes: number;
  maxSize: number;
}

/**
 * Convert ImageData to ArrayBuffer for IndexedDB storage
 */
function imageDataToArrayBuffer(imageData: ImageData): ArrayBuffer {
  const { width, height, data } = imageData;
  const header = new ArrayBuffer(16); // width (4) + height (4) + data length (4) + reserved (4)
  const headerView = new DataView(header);
  headerView.setUint32(0, width, true);
  headerView.setUint32(4, height, true);
  headerView.setUint32(8, data.length, true);
  
  const buffer = new ArrayBuffer(16 + data.length);
  new Uint8Array(buffer).set(new Uint8Array(header), 0);
  new Uint8Array(buffer).set(data, 16);
  return buffer;
}

/**
 * Convert ArrayBuffer back to ImageData
 */
function arrayBufferToImageData(buffer: ArrayBuffer): ImageData {
  const headerView = new DataView(buffer);
  const width = headerView.getUint32(0, true);
  const height = headerView.getUint32(4, true);
  const dataLength = headerView.getUint32(8, true);
  
  const data = new Uint8ClampedArray(buffer, 16, dataLength);
  return new ImageData(data, width, height);
}

/**
 * IndexedDB database name and version
 */
const DB_NAME = "ef-thumbnail-cache";
const DB_VERSION = 1;
const STORE_NAME = "thumbnails";

/**
 * Get or create IndexedDB database
 */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    let timeoutId: number | null = null;
    
    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
    
    // Add timeout to prevent hanging
    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("IndexedDB open timeout"));
    }, 5000);
    
    request.onerror = () => {
      cleanup();
      reject(request.error);
    };
    
    request.onsuccess = () => {
      cleanup();
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    
    request.onblocked = () => {
      // Database is blocked (e.g., another tab has it open)
      // This is just a warning - the request will eventually proceed
      // The main timeout (5 seconds) will handle if it hangs too long
      console.warn("IndexedDB blocked - waiting for other connections to close");
    };
  });
}

/**
 * Persistent thumbnail cache implementation
 */
export class PersistentThumbnailCache {
  private memoryCache: OrderedLRUCache<string, ImageData>;
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;
  private pendingWrites = new Map<string, ArrayBuffer>();
  private writeDebounceTimer: number | null = null;
  private readonly compareFn: (a: string, b: string) => number;
  private totalSizeBytes = 0;
  private entrySizes = new Map<string, number>();
  private maxSize: number;
  private settingsChangeHandler: (() => void) | null = null;

  constructor(compareFn?: (a: string, b: string) => number) {
    // Extract timestamp from cache key for ordered searching (same as original)
    this.compareFn = compareFn || ((a, b) => {
      const partsA = a.split(":");
      const partsB = b.split(":");
      const timeA = Number.parseFloat(partsA[partsA.length - 1] || "0");
      const timeB = Number.parseFloat(partsB[partsB.length - 1] || "0");
      return timeA - timeB;
    });
    
    // Initialize with current max size from settings
    this.maxSize = getThumbnailCacheMaxSize();
    this.memoryCache = new OrderedLRUCache<string, ImageData>(this.maxSize, this.compareFn);
    
    // Initialize IndexedDB (may fail in private browsing, that's OK)
    this.dbReady = this.initDatabase().catch(() => {
      // IndexedDB not available, continue without persistence
      console.warn("IndexedDB not available, thumbnail cache will not persist");
    });
    
    // Listen for cache size changes (store handler for cleanup)
    this.settingsChangeHandler = () => {
      const newMaxSize = getThumbnailCacheMaxSize();
      this.setMaxSize(newMaxSize);
    };
    window.addEventListener("ef-thumbnail-cache-settings-changed", this.settingsChangeHandler);
  }

  /**
   * Clean up resources (call when cache is no longer needed)
   */
  destroy(): void {
    // Remove event listener
    if (this.settingsChangeHandler) {
      window.removeEventListener("ef-thumbnail-cache-settings-changed", this.settingsChangeHandler);
      this.settingsChangeHandler = null;
    }
    
    // Clear pending writes
    if (this.writeDebounceTimer !== null) {
      clearTimeout(this.writeDebounceTimer);
      this.writeDebounceTimer = null;
    }
    
    // Close database connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private async initDatabase(): Promise<void> {
    try {
      this.db = await openDatabase();
      // Verify database is actually open
      if (!this.db || this.db.objectStoreNames.length === 0) {
        throw new Error("Database opened but object stores not available");
      }
    } catch (error) {
      // IndexedDB not available (e.g., private browsing mode)
      // Continue without persistence
      this.db = null;
    }
  }

  /**
   * Ensure database is ready (wait for initialization)
   */
  private async ensureDbReady(): Promise<void> {
    await this.dbReady;
  }

  /**
   * Get value from cache (checks memory first, then IndexedDB)
   */
  async get(key: string): Promise<ImageData | undefined> {
    // Check memory cache first
    const memoryValue = this.memoryCache.get(key);
    if (memoryValue) {
      return memoryValue;
    }

    // Try IndexedDB if available
    if (this.db) {
      try {
        await this.ensureDbReady();
        const buffer = await new Promise<ArrayBuffer | undefined>((resolve, reject) => {
          const transaction = this.db!.transaction([STORE_NAME], "readonly");
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(key);
          
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        if (buffer) {
          const imageData = arrayBufferToImageData(buffer);
          // Restore to memory cache
          this.memoryCache.set(key, imageData);
          // Restore size tracking
          const size = buffer.byteLength;
          this.entrySizes.set(key, size);
          return imageData;
        }
      } catch (error) {
        // IndexedDB read failed, continue without persistence
        console.warn("Failed to read from IndexedDB:", error);
      }
    }

    return undefined;
  }

  /**
   * Set value in cache (memory + IndexedDB)
   */
  async set(key: string, value: ImageData): Promise<void> {
    // Track keys before setting to detect eviction
    const keysBefore = new Set(this.memoryCache.getSortedKeys());
    const wasUpdate = this.memoryCache.has(key);
    
    // Calculate size
    const size = value.width * value.height * 4; // RGBA = 4 bytes per pixel
    
    // Update size tracking before setting (so we can detect eviction)
    if (wasUpdate) {
      const oldSize = this.entrySizes.get(key) || 0;
      this.totalSizeBytes -= oldSize;
    }
    
    // Let the cache handle LRU eviction internally
    this.memoryCache.set(key, value);
    
    // Check if eviction happened (cache size stayed at max and we added a new key)
    if (!wasUpdate && this.memoryCache.size === this.maxSize) {
      const keysAfter = new Set(this.memoryCache.getSortedKeys());
      // Find which key was evicted
      for (const oldKey of keysBefore) {
        if (!keysAfter.has(oldKey)) {
          // This key was evicted - clean up IndexedDB
          await this.deleteFromIndexedDB(oldKey);
          const evictedSize = this.entrySizes.get(oldKey) || 0;
          this.totalSizeBytes -= evictedSize;
          this.entrySizes.delete(oldKey);
          break;
        }
      }
    }
    
    // Update size tracking for the new/updated entry
    this.totalSizeBytes += size;
    this.entrySizes.set(key, size);

    // Schedule IndexedDB write (debounced)
    // Ensure database is ready before scheduling writes
    try {
      await this.ensureDbReady();
      if (this.db) {
        const buffer = imageDataToArrayBuffer(value);
        this.pendingWrites.set(key, buffer);
        this.scheduleWrite();
      }
    } catch (error) {
      // IndexedDB not available or failed, continue without persistence
      // This is expected in private browsing mode
    }
  }

  /**
   * Schedule debounced write to IndexedDB
   */
  private scheduleWrite(): void {
    if (this.writeDebounceTimer !== null) {
      clearTimeout(this.writeDebounceTimer);
    }

    this.writeDebounceTimer = window.setTimeout(() => {
      this.flushWrites();
    }, 500);

    // Also flush if we have too many pending writes
    if (this.pendingWrites.size >= 10) {
      if (this.writeDebounceTimer !== null) {
        clearTimeout(this.writeDebounceTimer);
        this.writeDebounceTimer = null;
      }
      this.flushWrites();
    }
  }

  /**
   * Flush pending writes to IndexedDB immediately (for testing or when persistence is critical)
   */
  async flush(): Promise<void> {
    // Ensure database is ready before flushing
    await this.ensureDbReady();
    
    // Cancel any pending debounced write
    if (this.writeDebounceTimer !== null) {
      clearTimeout(this.writeDebounceTimer);
      this.writeDebounceTimer = null;
    }
    // Flush immediately
    await this.flushWrites();
  }

  /**
   * Flush pending writes to IndexedDB
   */
  private async flushWrites(): Promise<void> {
    if (!this.db || this.pendingWrites.size === 0) {
      return;
    }

    const writes = new Map(this.pendingWrites);
    this.pendingWrites.clear();

    try {
      await this.ensureDbReady();
      const transaction = this.db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      for (const [key, buffer] of writes) {
        store.put(buffer, key);
      }

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      // Write failed, re-add to pending (will retry on next flush)
      for (const [key, buffer] of writes) {
        this.pendingWrites.set(key, buffer);
      }
      console.warn("Failed to flush writes to IndexedDB:", error);
    }
  }

  /**
   * Find range of keys (memory cache only for now, as IndexedDB range queries are complex)
   */
  findRange(start: string, end: string): Array<{ key: string; value: ImageData }> {
    return this.memoryCache.findRange(start, end);
  }

  /**
   * Clear cache (memory + IndexedDB)
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.totalSizeBytes = 0;
    this.entrySizes.clear();
    this.pendingWrites.clear();

    if (this.writeDebounceTimer !== null) {
      clearTimeout(this.writeDebounceTimer);
      this.writeDebounceTimer = null;
    }

    if (this.db) {
      try {
        await this.ensureDbReady();
        const transaction = this.db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      } catch (error) {
        console.warn("Failed to clear IndexedDB:", error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<ThumbnailCacheStats> {
    // Ensure size tracking is accurate
    // Recalculate if needed (in case of evictions)
    let calculatedSize = 0;
    const validKeys = new Set<string>();
    for (const key of this.memoryCache.getSortedKeys()) {
      validKeys.add(key);
      const size = this.entrySizes.get(key) || 0;
      calculatedSize += size;
    }
    
    // Clean up size tracking for evicted entries
    for (const [key] of this.entrySizes) {
      if (!validKeys.has(key)) {
        this.entrySizes.delete(key);
      }
    }
    
    this.totalSizeBytes = calculatedSize;

    return {
      itemCount: this.memoryCache.size,
      totalSizeBytes: this.totalSizeBytes,
      maxSize: this.maxSize,
    };
  }

  /**
   * Set maximum cache size
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
    
    // Create new cache with new max size
    const oldCache = this.memoryCache;
    this.memoryCache = new OrderedLRUCache<string, ImageData>(maxSize, this.compareFn);
    
    // Migrate entries from old cache (keep most recent entries)
    const sortedKeys = oldCache.getSortedKeys();
    const keysToKeep = sortedKeys.slice(-maxSize);
    
    // Update size tracking
    const newEntrySizes = new Map<string, number>();
    let newTotalSize = 0;
    
    for (const key of keysToKeep) {
      const value = oldCache.get(key);
      if (value) {
        this.memoryCache.set(key, value);
        const size = this.entrySizes.get(key) || (value.width * value.height * 4);
        newEntrySizes.set(key, size);
        newTotalSize += size;
      }
    }
    
    this.entrySizes = newEntrySizes;
    this.totalSizeBytes = newTotalSize;
  }

  /**
   * Get maximum cache size
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.memoryCache.has(key);
  }

  /**
   * Delete key from IndexedDB only (used when cache handles eviction)
   */
  private async deleteFromIndexedDB(key: string): Promise<void> {
    if (this.db) {
      try {
        await this.ensureDbReady();
        const transaction = this.db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        store.delete(key);
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      } catch (error) {
        console.warn("Failed to delete from IndexedDB:", error);
      }
    }
    
    // Remove from pending writes
    this.pendingWrites.delete(key);
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.memoryCache.delete(key);
    if (deleted) {
      const size = this.entrySizes.get(key) || 0;
      this.totalSizeBytes -= size;
      this.entrySizes.delete(key);
      
      // Remove from IndexedDB
      await this.deleteFromIndexedDB(key);
    }
    return deleted;
  }
}
