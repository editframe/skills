/**
 * RenderStats: Always-on performance statistics collection
 * 
 * This class continuously collects rendering performance data regardless of
 * whether stats are being displayed. It acts as a persistent data store that
 * the UI can read from at any time.
 * 
 * Key principles:
 * - Collection is always active (not tied to display visibility)
 * - Data persists across mode changes and zoom operations
 * - Display is orthogonal to collection
 */

import type { AdaptiveResolutionTracker } from "./AdaptiveResolutionTracker.js";

/**
 * Playback statistics for display.
 */
export interface PlaybackStats {
  fps: number;
  avgRenderTime: number | null;
  headroom: number | null;
  pressureState: string;
  pressureHistory: string[];
  renderWidth: number;
  renderHeight: number;
  resolutionScale: number | null;
  samplesAtCurrentScale?: number;
  canScaleUp?: boolean;
  canScaleDown?: boolean;
}

/**
 * RenderStats collects performance data from the rendering system.
 * 
 * Usage:
 * ```typescript
 * const stats = new RenderStats(adaptiveTracker);
 * 
 * // In render loop (always call this)
 * stats.recordFrame(renderTime, timestamp, isAtRest);
 * 
 * // In display (only when visible)
 * const data = stats.getStats(renderWidth, renderHeight, resolutionScale);
 * ```
 */
export class RenderStats {
  private adaptiveTracker: AdaptiveResolutionTracker;
  
  // Frame timing data
  private renderTimes: number[] = [];
  private frameIntervals: number[] = [];
  private lastFrameTime = 0;
  
  private readonly ROLLING_WINDOW_SIZE = 30; // ~1 second at 30fps
  private readonly TARGET_FRAME_TIME_MS = 33.33; // 30fps target

  constructor(adaptiveTracker: AdaptiveResolutionTracker) {
    this.adaptiveTracker = adaptiveTracker;
  }

  /**
   * Record a completed frame render.
   * Call this from the render loop after each frame completes.
   * 
   * @param renderTime - Time spent rendering this frame (ms)
   * @param timestamp - Current timestamp from performance.now() or rAF
   * @param isAtRest - Whether the system is at rest (not playing/scrubbing)
   */
  recordFrame(renderTime: number, timestamp: number, isAtRest: boolean): void {
    // Track render times for averaging
    this.renderTimes.push(renderTime);
    if (this.renderTimes.length > this.ROLLING_WINDOW_SIZE) {
      this.renderTimes.shift();
    }
    
    // Track frame intervals for FPS calculation
    if (this.lastFrameTime > 0) {
      const interval = timestamp - this.lastFrameTime;
      this.frameIntervals.push(interval);
      if (this.frameIntervals.length > this.ROLLING_WINDOW_SIZE) {
        this.frameIntervals.shift();
      }
    }
    this.lastFrameTime = timestamp;
    
    // Update adaptive tracker (only when in motion)
    if (!isAtRest) {
      this.adaptiveTracker.recordFrame(renderTime, timestamp);
    }
  }

  /**
   * Get current statistics for display.
   * 
   * @param renderWidth - Current render width in pixels
   * @param renderHeight - Current render height in pixels
   * @param resolutionScale - Current resolution scale (0-1), or null if not applicable
   * @returns Current playback statistics
   */
  getStats(
    renderWidth: number,
    renderHeight: number,
    resolutionScale: number | null = null
  ): PlaybackStats {
    // Calculate average render time
    const avgRenderTime = this.renderTimes.length > 0
      ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
      : null;
    
    // Calculate FPS from frame intervals
    const avgFrameInterval = this.frameIntervals.length > 0
      ? this.frameIntervals.reduce((a, b) => a + b, 0) / this.frameIntervals.length
      : 16.67;
    const fps = avgFrameInterval > 0 ? 1000 / avgFrameInterval : 0;
    
    // Calculate headroom (positive = faster than target, negative = slower)
    const headroom = avgRenderTime !== null
      ? this.TARGET_FRAME_TIME_MS - avgRenderTime
      : null;
    
    // Get adaptive tracker stats
    const trackerStats = this.adaptiveTracker.getStats();
    
    return {
      fps,
      avgRenderTime,
      headroom,
      pressureState: trackerStats.pressureState,
      pressureHistory: trackerStats.pressureHistory,
      renderWidth,
      renderHeight,
      resolutionScale,
      samplesAtCurrentScale: trackerStats.samplesAtCurrentScale,
      canScaleUp: trackerStats.canScaleUp,
      canScaleDown: trackerStats.canScaleDown,
    };
  }

  /**
   * Reset all collected statistics.
   * Useful when switching modes or starting a new session.
   */
  reset(): void {
    this.renderTimes = [];
    this.frameIntervals = [];
    this.lastFrameTime = 0;
  }
}
