/**
 * ThumbnailLoadingManager - Coordinates thumbnail capture separately from layout.
 *
 * State tracking:
 * - #activelyCapturing: Set of times currently being captured (in the loop)
 * - #pendingRetry: Set of times that failed/blank and will be retried
 *
 * The UI should show loading indicators for times in EITHER set.
 */

import type { EFVideo } from "./EFVideo.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import { sessionThumbnailCache, getCacheKey } from "./SessionThumbnailCache.js";
import { findRootTemporal } from "./findRootTemporal.js";

/** Type guard to check if element is EFVideo */
function isEFVideo(element: Element | null): element is EFVideo {
  return element?.tagName.toLowerCase() === "ef-video";
}

/** Type guard to check if element is EFTimegroup */
function isEFTimegroup(element: Element | null): element is EFTimegroup {
  return element?.tagName.toLowerCase() === "ef-timegroup";
}

/** Max canvas width for thumbnail captures */
const MAX_CAPTURE_WIDTH = 240;

/** Delay before retrying failed captures */
const RETRY_DELAY_MS = 500;

/** Max retry attempts for blank captures */
const MAX_RETRIES = 3;

/**
 * Get identifiers for cache key generation.
 */
export function getCacheIdentifiers(element: EFVideo | EFTimegroup): {
  rootId: string;
  elementId: string;
} {
  const rootTemporal = findRootTemporal(element);
  const rootTimegroup = rootTemporal && isEFTimegroup(rootTemporal) ? rootTemporal : null;
  const rootId = rootTimegroup?.id || "default";

  const elementId = isEFVideo(element)
    ? element.src || element.id || "video"
    : element.id || "timegroup";

  return { rootId, elementId };
}

export interface CaptureResult {
  timeMs: number;
  image: CanvasImageSource;
}

export class ThumbnailLoadingManager {
  #target: EFVideo | EFTimegroup | null = null;
  #abortController: AbortController | null = null;
  #captureHeight = 0;

  // State tracking
  #activelyCapturing = new Set<number>(); // Times in current capture loop
  #pendingRetry = new Set<number>(); // Times that will be retried
  #retryCount = new Map<number, number>(); // Track retry attempts per time
  #retryTimeout: ReturnType<typeof setTimeout> | null = null;

  // Callbacks
  #onImageCaptured: ((result: CaptureResult) => void) | null = null;
  #onStateChange: (() => void) | null = null;

  /**
   * Set the target element for captures.
   */
  setTarget(target: EFVideo | EFTimegroup | null): void {
    if (target !== this.#target) {
      this.abort();
      this.#target = target;
      this.#retryCount.clear(); // Reset retry counts for new target
    }
  }

  /**
   * Set the desired capture height (for scale calculation).
   */
  setCaptureHeight(height: number): void {
    this.#captureHeight = height;
  }

  /**
   * Set callback for when an image is captured.
   */
  onImageCaptured(callback: (result: CaptureResult) => void): void {
    this.#onImageCaptured = callback;
  }

  /**
   * Set callback for when loading state changes.
   * Called when times are added/removed from loading sets.
   */
  onStateChange(callback: () => void): void {
    this.#onStateChange = callback;
  }

  /**
   * Check if a specific time is in any loading state.
   */
  isLoading(timeMs: number): boolean {
    return this.#activelyCapturing.has(timeMs) || this.#pendingRetry.has(timeMs);
  }

  /**
   * Get all times currently in any loading state.
   * UI should show loading indicators for these.
   */
  getLoadingTimes(): Set<number> {
    const combined = new Set(this.#activelyCapturing);
    for (const time of this.#pendingRetry) {
      combined.add(time);
    }
    return combined;
  }

  /**
   * Check if there are any pending operations (for animation loop).
   */
  get hasPendingWork(): boolean {
    return this.#activelyCapturing.size > 0 || this.#pendingRetry.size > 0;
  }

  /**
   * Check if capture loop is actively running.
   */
  get isCapturing(): boolean {
    return this.#abortController !== null;
  }

  /**
   * Abort any in-progress capture and clear all state.
   */
  abort(): void {
    if (this.#retryTimeout) {
      clearTimeout(this.#retryTimeout);
      this.#retryTimeout = null;
    }
    if (this.#abortController) {
      this.#abortController.abort();
      this.#abortController = null;
    }
    this.#activelyCapturing.clear();
    this.#pendingRetry.clear();
    this.#notifyStateChange();
  }

  /**
   * Start capturing thumbnails for the given times (in order).
   * If capture is already in progress, does nothing (let it complete).
   */
  async startCapture(times: number[]): Promise<void> {
    if (!this.#target || times.length === 0) return;

    // If capture is already in progress, don't interrupt
    if (this.#abortController) {
      return;
    }

    const target = this.#target;
    const { rootId, elementId } = getCacheIdentifiers(target);

    // Filter out times already in cache
    const timesToCapture = times.filter((timeMs) => {
      const key = getCacheKey(rootId, elementId, timeMs);
      return !sessionThumbnailCache.has(key);
    });

    if (timesToCapture.length === 0) return;

    // Move any pending retry times back to active if they're in this batch
    for (const timeMs of timesToCapture) {
      this.#pendingRetry.delete(timeMs);
    }

    // Set up abort controller
    this.#abortController = new AbortController();
    const signal = this.#abortController.signal;

    // Mark all times as actively capturing
    for (const timeMs of timesToCapture) {
      this.#activelyCapturing.add(timeMs);
    }
    this.#notifyStateChange();

    const failedTimes: number[] = [];

    try {
      if (isEFTimegroup(target)) {
        const failed = await this.#captureTimegroupThumbnails(
          target,
          timesToCapture,
          rootId,
          elementId,
          signal,
        );
        failedTimes.push(...failed);
      } else if (isEFVideo(target)) {
        const failed = await this.#captureVideoThumbnails(
          target,
          timesToCapture,
          rootId,
          elementId,
          signal,
        );
        failedTimes.push(...failed);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.warn("[THUMB_LOADING] Capture failed:", error);
      }
      // On error, all remaining active times are failed
      failedTimes.push(...this.#activelyCapturing);
    } finally {
      this.#abortController = null;
      this.#activelyCapturing.clear();

      // Schedule retry for failed times (if under max retries)
      this.#scheduleRetry(failedTimes);

      this.#notifyStateChange();
    }
  }

  /**
   * Schedule retry for failed times.
   */
  #scheduleRetry(failedTimes: number[]): void {
    const timesToRetry: number[] = [];

    for (const timeMs of failedTimes) {
      const attempts = (this.#retryCount.get(timeMs) || 0) + 1;
      this.#retryCount.set(timeMs, attempts);

      if (attempts < MAX_RETRIES) {
        timesToRetry.push(timeMs);
        this.#pendingRetry.add(timeMs);
      }
      // If max retries exceeded, give up on this time
    }

    if (timesToRetry.length > 0 && !this.#retryTimeout) {
      this.#retryTimeout = setTimeout(() => {
        this.#retryTimeout = null;

        // Clear pending retry and attempt capture
        const times = [...this.#pendingRetry];
        this.#pendingRetry.clear();

        if (times.length > 0 && this.#target) {
          times.sort((a, b) => a - b);
          this.startCapture(times);
        }
      }, RETRY_DELAY_MS);
    }
  }

  #notifyStateChange(): void {
    this.#onStateChange?.();
  }

  /**
   * Check if a canvas has actual content (not blank/white/transparent).
   */
  #hasContent(canvas: CanvasImageSource): boolean {
    const width = (canvas as any).width || (canvas as HTMLImageElement).naturalWidth || 0;
    const height = (canvas as any).height || (canvas as HTMLImageElement).naturalHeight || 0;

    if (width === 0 || height === 0) return false;

    const tempCanvas = document.createElement("canvas");
    const sampleSize = Math.min(32, width, height);
    tempCanvas.width = sampleSize;
    tempCanvas.height = sampleSize;

    const ctx = tempCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return true;

    ctx.drawImage(canvas, 0, 0, sampleSize, sampleSize);
    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imageData.data;

    let hasVariation = false;
    let hasNonWhite = false;
    const firstR = data[0],
      firstG = data[1],
      firstB = data[2];

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;

      if (a > 0 && (r < 250 || g < 250 || b < 250)) {
        hasNonWhite = true;
      }

      if (Math.abs(r - firstR!) > 10 || Math.abs(g - firstG!) > 10 || Math.abs(b - firstB!) > 10) {
        hasVariation = true;
      }

      if (hasNonWhite && hasVariation) return true;
    }

    return hasNonWhite || hasVariation;
  }

  /**
   * Capture thumbnails from a timegroup target.
   * Returns array of times that failed (blank or error).
   */
  async #captureTimegroupThumbnails(
    target: EFTimegroup,
    times: number[],
    rootId: string,
    elementId: string,
    signal: AbortSignal,
  ): Promise<number[]> {
    const timegroupWidth = target.offsetWidth || 1920;
    const timegroupHeight = target.offsetHeight || 1080;
    const scale = Math.min(
      1,
      this.#captureHeight / timegroupHeight,
      MAX_CAPTURE_WIDTH / timegroupWidth,
    );

    const failedTimes: number[] = [];

    for (const timeMs of times) {
      if (signal.aborted) {
        throw new DOMException("Capture aborted", "AbortError");
      }

      try {
        const canvases = await (target as any).captureBatch([timeMs], {
          scale,
          contentReadyMode: "blocking",
          blockingTimeoutMs: 5000,
        });

        const canvas = canvases[0];
        if (canvas && this.#hasContent(canvas)) {
          // Success - store and notify
          const key = getCacheKey(rootId, elementId, timeMs);
          sessionThumbnailCache.set(key, canvas, timeMs, elementId);
          this.#activelyCapturing.delete(timeMs);
          this.#retryCount.delete(timeMs); // Reset retry count on success
          this.#onImageCaptured?.({ timeMs, image: canvas });
          this.#notifyStateChange();
        } else {
          // Blank - mark as failed
          this.#activelyCapturing.delete(timeMs);
          failedTimes.push(timeMs);
        }
      } catch (error) {
        this.#activelyCapturing.delete(timeMs);
        failedTimes.push(timeMs);
      }
    }

    return failedTimes;
  }

  /**
   * Capture thumbnails from a video target.
   * Returns array of times that failed.
   */
  async #captureVideoThumbnails(
    target: EFVideo,
    times: number[],
    rootId: string,
    elementId: string,
    signal: AbortSignal,
  ): Promise<number[]> {
    if (target.mediaEngineTask) {
      await target.mediaEngineTask.taskComplete;
    }

    const mediaEngine = target.mediaEngineTask?.value;
    if (!mediaEngine) {
      return [...times]; // All failed
    }

    const videoTrack = mediaEngine.tracks.video;
    const scrubTrack = mediaEngine.tracks.scrub;
    if (!videoTrack && !scrubTrack) {
      return [...times]; // All failed
    }

    const failedTimes: number[] = [];

    try {
      const results = await mediaEngine.extractThumbnails(times, signal);

      for (let i = 0; i < times.length; i++) {
        const timeMs = times[i]!;
        const result = results[i];

        if (result?.thumbnail && this.#hasContent(result.thumbnail)) {
          const key = getCacheKey(rootId, elementId, timeMs);
          sessionThumbnailCache.set(key, result.thumbnail, timeMs, elementId);
          this.#activelyCapturing.delete(timeMs);
          this.#retryCount.delete(timeMs);
          this.#onImageCaptured?.({ timeMs, image: result.thumbnail });
          this.#notifyStateChange();
        } else {
          this.#activelyCapturing.delete(timeMs);
          failedTimes.push(timeMs);
        }
      }
    } catch (error) {
      // All remaining are failed
      for (const timeMs of times) {
        if (this.#activelyCapturing.has(timeMs)) {
          this.#activelyCapturing.delete(timeMs);
          failedTimes.push(timeMs);
        }
      }
      throw error;
    }

    return failedTimes;
  }
}
