/**
 * RenderContext manages scoped caches for the rendering pipeline.
 * 
 * Used during foreignObject serialization to cache:
 * - Video frames by source timestamp (useful for freeze frames, slow-mo)
 * - Static element canvases by element identity + renderVersion
 * 
 * The context should be created at the start of a render operation
 * and disposed when the render completes (success or failure).
 */

import { LRUCache } from "../utils/LRUCache.js";
import type { EFVideo } from "../elements/EFVideo.js";

/**
 * Check if an element has a renderVersion property.
 */
function hasRenderVersion(element: Element): element is Element & { renderVersion: number } {
  return "renderVersion" in element && typeof (element as any).renderVersion === "number";
}

/**
 * Result of capturing a video frame.
 */
export interface CapturedFrame {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Options for creating a RenderContext.
 */
export interface RenderContextOptions {
  /** Maximum number of canvas dataURLs to cache (default: 50) */
  maxCanvasCacheSize?: number;
  /** Maximum number of video frame dataURLs to cache (default: 100) */
  maxVideoFrameCacheSize?: number;
}

/**
 * RenderContext provides scoped caching for render operations.
 * 
 * Create at the start of a render, dispose when complete:
 * ```typescript
 * const context = new RenderContext();
 * try {
 *   // ... render operations
 * } finally {
 *   context.dispose();
 * }
 * ```
 */
export class RenderContext {
  /** Cache for static element canvases (ef-image, ef-waveform) */
  #canvasCache: LRUCache<string, string>;
  
  /** Cache for video frames by source timestamp */
  #videoFrameCache: LRUCache<string, CapturedFrame>;
  
  /** Whether this context has been disposed */
  #disposed = false;
  
  /** Metrics for monitoring cache effectiveness */
  #metrics = {
    canvasCacheHits: 0,
    canvasCacheMisses: 0,
    videoFrameCacheHits: 0,
    videoFrameCacheMisses: 0,
  };

  constructor(options: RenderContextOptions = {}) {
    const { maxCanvasCacheSize = 50, maxVideoFrameCacheSize = 100 } = options;
    this.#canvasCache = new LRUCache(maxCanvasCacheSize);
    this.#videoFrameCache = new LRUCache(maxVideoFrameCacheSize);
  }

  /**
   * Check if the context has been disposed.
   */
  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Get cache metrics for monitoring.
   */
  get metrics() {
    return { ...this.#metrics };
  }

  // ============================================================================
  // Static Element Cache (ef-image, ef-waveform)
  // ============================================================================

  /**
   * Generate a cache key for a static element.
   * Returns null if the element doesn't support caching (no renderVersion).
   */
  #getCanvasCacheKey(element: Element): string | null {
    if (!hasRenderVersion(element)) {
      return null;
    }
    // Use tag name + id (or empty) + render version
    const id = element.id || "";
    return `${element.tagName}:${id}:${element.renderVersion}`;
  }

  /**
   * Get a cached dataURL for a static element.
   * Returns undefined if not cached or element doesn't support caching.
   */
  getCachedCanvasDataUrl(element: Element): string | undefined {
    if (this.#disposed) return undefined;
    
    const key = this.#getCanvasCacheKey(element);
    if (!key) return undefined;
    
    const cached = this.#canvasCache.get(key);
    if (cached) {
      this.#metrics.canvasCacheHits++;
    } else {
      this.#metrics.canvasCacheMisses++;
    }
    return cached;
  }

  /**
   * Cache a dataURL for a static element.
   * Does nothing if the element doesn't support caching.
   */
  setCachedCanvasDataUrl(element: Element, dataUrl: string): void {
    if (this.#disposed) return;
    
    const key = this.#getCanvasCacheKey(element);
    if (key) {
      this.#canvasCache.set(key, dataUrl);
    }
  }

  // ============================================================================
  // Video Frame Cache
  // ============================================================================

  /**
   * Generate a cache key for a video frame.
   * Uses video element id and source timestamp.
   */
  #getVideoFrameCacheKey(videoElement: Element, sourceTimeMs: number): string {
    const id = videoElement.id || "anon";
    // Round to nearest ms to avoid floating point issues
    const roundedTime = Math.round(sourceTimeMs);
    return `${id}:${roundedTime}`;
  }

  /**
   * Get a cached video frame.
   * Returns undefined if not cached.
   */
  getCachedVideoFrame(videoElement: Element, sourceTimeMs: number): CapturedFrame | undefined {
    if (this.#disposed) return undefined;
    
    const key = this.#getVideoFrameCacheKey(videoElement, sourceTimeMs);
    const cached = this.#videoFrameCache.get(key);
    if (cached) {
      this.#metrics.videoFrameCacheHits++;
    } else {
      this.#metrics.videoFrameCacheMisses++;
    }
    return cached;
  }

  /**
   * Cache a video frame.
   */
  setCachedVideoFrame(videoElement: Element, sourceTimeMs: number, frame: CapturedFrame): void {
    if (this.#disposed) return;
    
    const key = this.#getVideoFrameCacheKey(videoElement, sourceTimeMs);
    this.#videoFrameCache.set(key, frame);
  }

  /**
   * Convenience method to get or capture a video frame.
   * Checks cache first, then captures if not cached.
   * 
   * @param video - The ef-video element
   * @param sourceTimeMs - Source media timestamp
   * @param quality - Quality setting for capture
   * @returns The captured frame data
   */
  async getOrCaptureVideoFrame(
    video: EFVideo,
    sourceTimeMs: number,
    quality: "auto" | "scrub" | "main" = "auto"
  ): Promise<CapturedFrame> {
    // Check cache first
    const cached = this.getCachedVideoFrame(video, sourceTimeMs);
    if (cached) {
      return cached;
    }

    // Capture frame using direct API
    const frame = await video.captureFrameAtSourceTime(sourceTimeMs, quality);
    
    // Cache for future use
    this.setCachedVideoFrame(video, sourceTimeMs, frame);
    
    return frame;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Dispose the context and clear all caches.
   * Should be called when rendering is complete.
   */
  dispose(): void {
    if (this.#disposed) return;
    
    this.#canvasCache.clear();
    this.#videoFrameCache.clear();
    this.#disposed = true;
  }

  /**
   * Get the current size of the canvas cache.
   */
  get canvasCacheSize(): number {
    return this.#canvasCache.size;
  }

  /**
   * Get the current size of the video frame cache.
   */
  get videoFrameCacheSize(): number {
    return this.#videoFrameCache.size;
  }
}
