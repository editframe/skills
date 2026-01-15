/**
 * Persistent thumbnail cache with IndexedDB storage.
 * 
 * DESIGN: Stores thumbnails as JPEG blobs directly in IndexedDB.
 * - No in-memory cache to avoid tab crashes with many thumbnails
 * - JPEG compression reduces storage ~6-10x vs raw ImageData
 * - Key index kept in memory for fast has() checks and range queries
 * - IndexedDB operations run in a Web Worker to avoid main thread blocking
 */

import { getThumbnailCacheMaxSize } from "../preview/thumbnailCacheSettings.js";

// JPEG quality for thumbnail storage (0-1)
const JPEG_QUALITY = 0.8;

/**
 * Cache statistics interface
 */
export interface ThumbnailCacheStats {
  itemCount: number;
  totalSizeBytes: number;
  maxSize: number;
}

/**
 * Worker message types
 */
interface WorkerCommand {
  type: "init" | "get" | "put" | "delete" | "clear" | "getKeys";
  id: string;
  key?: string;
  blob?: Blob;
}

interface WorkerResponse {
  type: "ready" | "result" | "error";
  id: string;
  success?: boolean;
  blob?: Blob;
  keys?: string[];
  error?: string;
}

/**
 * Singleton worker instance for IndexedDB operations
 */
let thumbnailCacheWorker: Worker | null = null;
let workerMessageId = 0;

/**
 * Create the thumbnail cache worker using inline code
 */
function createThumbnailCacheWorker(): Worker {
  const workerCode = `
// IndexedDB configuration
const DB_NAME = "ef-thumbnail-cache-v2";
const DB_VERSION = 1;
const STORE_NAME = "thumbnails";

let db = null;

async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    const timeoutId = self.setTimeout(() => {
      reject(new Error("IndexedDB open timeout"));
    }, 5000);
    
    request.onerror = () => {
      clearTimeout(timeoutId);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      clearTimeout(timeoutId);
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function ensureDb() {
  if (!db) {
    db = await openDatabase();
  }
  return db;
}

async function getValue(key) {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putValue(key, value) {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deleteValue(key) {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function clearStore() {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getAllKeys() {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

addEventListener("message", async (event) => {
  const { type, id, key, blob } = event.data;
  
  try {
    switch (type) {
      case "init": {
        await ensureDb();
        const keys = await getAllKeys();
        postMessage({ type: "ready", id, success: true, keys });
        break;
      }
      
      case "get": {
        if (!key) {
          postMessage({ type: "error", id, error: "Missing key" });
          break;
        }
        const storedBlob = await getValue(key);
        if (storedBlob) {
          postMessage({ type: "result", id, success: true, blob: storedBlob });
        } else {
          postMessage({ type: "result", id, success: true });
        }
        break;
      }
      
      case "put": {
        if (!key || !blob) {
          postMessage({ type: "error", id, error: "Missing required fields for put" });
          break;
        }
        await putValue(key, blob);
        postMessage({ type: "result", id, success: true });
        break;
      }
      
      case "delete": {
        if (!key) {
          postMessage({ type: "error", id, error: "Missing key" });
          break;
        }
        await deleteValue(key);
        postMessage({ type: "result", id, success: true });
        break;
      }
      
      case "clear": {
        await clearStore();
        postMessage({ type: "result", id, success: true });
        break;
      }
      
      case "getKeys": {
        const keys = await getAllKeys();
        postMessage({ type: "result", id, success: true, keys });
        break;
      }
      
      default:
        postMessage({ type: "error", id, error: "Unknown command type: " + type });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    postMessage({ type: "error", id, error: errorMessage });
  }
});

postMessage({ type: "ready", id: "startup" });
`;
  
  const blob = new Blob([workerCode], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  
  // Clean up the blob URL after worker loads
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  
  return worker;
}

const pendingWorkerRequests = new Map<string, {
  resolve: (response: WorkerResponse) => void;
  reject: (error: Error) => void;
}>();

/**
 * Get or create the IndexedDB worker
 */
function getWorker(): Worker | null {
  if (thumbnailCacheWorker) {
    return thumbnailCacheWorker;
  }
  
  try {
    thumbnailCacheWorker = createThumbnailCacheWorker();
    
    thumbnailCacheWorker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const pending = pendingWorkerRequests.get(response.id);
      
      if (pending) {
        pendingWorkerRequests.delete(response.id);
        if (response.type === "error") {
          pending.reject(new Error(response.error || "Unknown worker error"));
        } else {
          pending.resolve(response);
        }
      }
      
      // Worker startup ready message - no action needed
    });
    
    thumbnailCacheWorker.addEventListener("error", (event) => {
      console.error("Thumbnail cache worker error:", event);
      for (const [id, pending] of pendingWorkerRequests) {
        pending.reject(new Error("Worker error"));
        pendingWorkerRequests.delete(id);
      }
    });
    
    return thumbnailCacheWorker;
  } catch (error) {
    console.warn("Failed to create thumbnail cache worker:", error);
    return null;
  }
}

/**
 * Send a command to the worker and wait for response
 */
async function sendWorkerCommand(command: Omit<WorkerCommand, "id">): Promise<WorkerResponse> {
  const worker = getWorker();
  if (!worker) {
    throw new Error("Worker not available");
  }
  
  const id = `cmd-${++workerMessageId}`;
  const fullCommand: WorkerCommand = { ...command, id };
  
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      pendingWorkerRequests.delete(id);
      reject(new Error("Worker command timeout"));
    }, 10000);
    
    pendingWorkerRequests.set(id, {
      resolve: (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });
    
    worker.postMessage(fullCommand);
  });
}

/**
 * Convert canvas to JPEG Blob
 */
function canvasToJpegBlob(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (canvas instanceof OffscreenCanvas) {
      canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY })
        .then(resolve)
        .catch(reject);
    } else {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob"));
          }
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    }
  });
}

/**
 * Convert ImageData to JPEG Blob via temporary canvas
 */
async function imageDataToJpegBlob(imageData: ImageData): Promise<Blob> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }
  ctx.putImageData(imageData, 0, 0);
  return canvasToJpegBlob(canvas);
}

/**
 * Decode JPEG Blob to ImageData
 */
async function jpegBlobToImageData(blob: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Persistent thumbnail cache implementation using JPEG storage in IndexedDB.
 * No in-memory cache - reads go directly to IndexedDB.
 */
export class PersistentThumbnailCache {
  /** In-memory index of keys for fast has() and range queries */
  private keyIndex: Set<string> = new Set();
  /** Sorted keys for range queries (lazily updated) */
  private sortedKeys: string[] | null = null;
  
  private workerInitialized = false;
  private readonly compareFn: (a: string, b: string) => number;
  private maxSize: number;
  private settingsChangeHandler: (() => void) | null = null;
  

  constructor(compareFn?: (a: string, b: string) => number) {
    this.compareFn = compareFn || ((a, b) => {
      const partsA = a.split(":");
      const partsB = b.split(":");
      const timeA = Number.parseFloat(partsA[partsA.length - 1] || "0");
      const timeB = Number.parseFloat(partsB[partsB.length - 1] || "0");
      return timeA - timeB;
    });
    
    this.maxSize = getThumbnailCacheMaxSize();
    
    // Listen for cache size changes
    this.settingsChangeHandler = () => {
      this.maxSize = getThumbnailCacheMaxSize();
    };
    window.addEventListener("ef-thumbnail-cache-settings-changed", this.settingsChangeHandler);
    
    // Initialize worker and load key index
    this.initializeAsync();
  }
  
  /**
   * Async initialization - loads key index from IndexedDB
   */
  private async initializeAsync(): Promise<void> {
    try {
      const worker = getWorker();
      if (!worker) return;
      
      const response = await sendWorkerCommand({ type: "init" });
      this.workerInitialized = true;
      
      if (response.keys) {
        this.keyIndex = new Set(response.keys as string[]);
        this.sortedKeys = null; // Will be rebuilt on next range query
      }
    } catch (error) {
      console.warn("Failed to initialize thumbnail cache:", error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.settingsChangeHandler) {
      window.removeEventListener("ef-thumbnail-cache-settings-changed", this.settingsChangeHandler);
      this.settingsChangeHandler = null;
    }
  }

  /**
   * Ensure worker is initialized
   */
  private async ensureWorkerReady(): Promise<boolean> {
    if (this.workerInitialized) {
      return true;
    }
    
    try {
      const worker = getWorker();
      if (!worker) return false;
      
      const response = await sendWorkerCommand({ type: "init" });
      this.workerInitialized = true;
      
      if (response.keys) {
        this.keyIndex = new Set(response.keys as string[]);
        this.sortedKeys = null;
      }
      return true;
    } catch (error) {
      console.warn("Failed to initialize thumbnail cache worker:", error);
      return false;
    }
  }

  /**
   * Get value from cache (reads from IndexedDB, decodes JPEG to ImageData)
   */
  async get(key: string): Promise<ImageData | undefined> {
    // Fast path: check key index first
    if (!this.keyIndex.has(key)) {
      return undefined;
    }
    
    try {
      const workerAvailable = await this.ensureWorkerReady();
      if (!workerAvailable) return undefined;
      
      const response = await sendWorkerCommand({ type: "get", key });
      
      if (response.success && response.blob) {
        return await jpegBlobToImageData(response.blob);
      }
    } catch (error) {
      console.warn("Failed to read thumbnail from IndexedDB:", error);
    }
    
    return undefined;
  }

  /**
   * Set value in cache (converts to JPEG, stores in IndexedDB)
   */
  async set(key: string, value: ImageData): Promise<void> {
    try {
      const workerAvailable = await this.ensureWorkerReady();
      if (!workerAvailable) return;
      
      // Convert to JPEG blob
      const blob = await imageDataToJpegBlob(value);
      
      // Store in IndexedDB
      await sendWorkerCommand({ type: "put", key, blob });
      
      // Update key index
      this.keyIndex.add(key);
      this.sortedKeys = null; // Invalidate sorted cache
      
      // Enforce max size by removing oldest entries
      await this.enforceMaxSize();
    } catch (error) {
      console.warn("Failed to store thumbnail in IndexedDB:", error);
    }
  }

  /**
   * Remove oldest entries if over max size
   */
  private async enforceMaxSize(): Promise<void> {
    if (this.keyIndex.size <= this.maxSize) return;
    
    // Get sorted keys (oldest first based on timestamp)
    const sorted = this.getSortedKeys();
    const toRemove = sorted.slice(0, this.keyIndex.size - this.maxSize);
    
    for (const key of toRemove) {
      try {
        await sendWorkerCommand({ type: "delete", key });
        this.keyIndex.delete(key);
      } catch {
        // Ignore delete errors
      }
    }
    this.sortedKeys = null;
  }

  /**
   * Set playback active state (kept for API compatibility, no-op now)
   */
  setPlaybackActive(_active: boolean): void {
    // No-op - writes go directly to IndexedDB now, no batching needed
  }

  /**
   * Flush pending writes (no-op now - writes go directly to IndexedDB)
   */
  async flush(): Promise<void> {
    // No-op - writes are immediate now
  }

  /**
   * Get sorted keys for range queries
   */
  private getSortedKeys(): string[] {
    if (this.sortedKeys === null) {
      this.sortedKeys = Array.from(this.keyIndex).sort(this.compareFn);
    }
    return this.sortedKeys;
  }

  /**
   * Find range of keys (memory index only - doesn't load images)
   * Returns keys that fall within the range for near-hit lookups
   */
  findRange(start: string, end: string): Array<{ key: string; value: ImageData }> {
    const sorted = this.getSortedKeys();
    const results: Array<{ key: string; value: ImageData }> = [];
    
    // Binary search for start position
    let startIdx = 0;
    let endIdx = sorted.length;
    
    while (startIdx < endIdx) {
      const mid = Math.floor((startIdx + endIdx) / 2);
      if (this.compareFn(sorted[mid]!, start) < 0) {
        startIdx = mid + 1;
      } else {
        endIdx = mid;
      }
    }
    
    // Collect keys in range (return empty ImageData - caller will load if needed)
    // Note: This is a simplified version - caller should use has() + get() for actual data
    for (let i = startIdx; i < sorted.length; i++) {
      const key = sorted[i]!;
      if (this.compareFn(key, end) > 0) break;
      // Return placeholder - actual loading happens via get()
      results.push({ 
        key, 
        value: new ImageData(1, 1) // Placeholder - caller uses key for get()
      });
    }
    
    return results;
  }

  /**
   * Clear cache
   */
  async clear(): Promise<void> {
    this.keyIndex.clear();
    this.sortedKeys = null;
    
    try {
      const workerAvailable = await this.ensureWorkerReady();
      if (workerAvailable) {
        await sendWorkerCommand({ type: "clear" });
      }
    } catch (error) {
      console.warn("Failed to clear IndexedDB:", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<ThumbnailCacheStats> {
    return {
      itemCount: this.keyIndex.size,
      totalSizeBytes: 0, // Can't easily track with JPEG blobs
      maxSize: this.maxSize,
    };
  }

  /**
   * Set maximum cache size
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
    // Enforce new size asynchronously
    this.enforceMaxSize();
  }

  /**
   * Get maximum cache size
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Check if key exists in cache (fast - checks in-memory index)
   */
  has(key: string): boolean {
    return this.keyIndex.has(key);
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.keyIndex.has(key)) {
      return false;
    }
    
    try {
      const workerAvailable = await this.ensureWorkerReady();
      if (workerAvailable) {
        await sendWorkerCommand({ type: "delete", key });
      }
      this.keyIndex.delete(key);
      this.sortedKeys = null;
      return true;
    } catch (error) {
      console.warn("Failed to delete from IndexedDB:", error);
      return false;
    }
  }

  /**
   * Get current cache size (number of entries)
   */
  get size(): number {
    return this.keyIndex.size;
  }
}
