/**
 * Stats tracking strategy for different presentation modes.
 *
 * Uses strategy pattern to encapsulate mode-specific stats tracking logic,
 * allowing each mode to report what stats it supports and provide its own implementation.
 */

import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { AdaptiveResolutionTracker } from "./AdaptiveResolutionTracker.js";
import type { CanvasPreviewResult } from "./renderTimegroupToCanvas.js";
import type { PreviewPresentationMode } from "./previewSettings.js";

/**
 * Stat types that can be tracked.
 */
export type StatType =
  | "fps"
  | "renderTime"
  | "headroom"
  | "resolution"
  | "resolutionScale"
  | "cpuPressure"
  | "adaptiveResolution";

/**
 * Playback statistics for display.
 */
export interface PlaybackStats {
  fps: number;
  avgRenderTime: number | null; // null if not measurable
  headroom: number | null; // null if not applicable
  pressureState: string;
  pressureHistory: string[];
  renderWidth: number;
  renderHeight: number;
  resolutionScale: number | null; // null if not applicable
  samplesAtCurrentScale?: number; // only for adaptive resolution
  canScaleUp?: boolean; // only for adaptive resolution
  canScaleDown?: boolean; // only for adaptive resolution
}

/**
 * Strategy interface for tracking stats in different presentation modes.
 */
export interface StatsTrackingStrategy {
  /** Start tracking stats (called when mode is initialized and stats are enabled) */
  start(): void;
  /** Stop tracking stats (called when mode stops or stats are disabled) */
  stop(): void;
  /** Get current stats, or null if not available */
  getStats(): PlaybackStats | null;
  /** Check if this strategy supports a specific stat type */
  supportsStat(stat: StatType): boolean;
  /**
   * Record render timing (optional - only implemented by canvas stats).
   * Called by EFWorkbench after each canvas refresh.
   */
  recordRenderTime?(renderTimeMs: number, timestamp: number): void;
}

/**
 * Canvas mode stats tracking strategy.
 * Tracks all stats including render time, headroom, resolution scale, and adaptive resolution.
 *
 * This strategy is PASSIVE - it receives render timing from EFWorkbench rather than
 * driving its own render loop. This prevents race conditions and ensures accurate measurements.
 */
export class CanvasStatsStrategy implements StatsTrackingStrategy {
  private adaptiveTracker: AdaptiveResolutionTracker;
  private readonly compositionWidth: number;
  private readonly compositionHeight: number;
  private getResolutionScale: () => number;
  private isAtRest: () => boolean;
  private isExporting: () => boolean;

  private lastStatsUpdateTime = 0;
  private currentStats: PlaybackStats | null = null;

  constructor(options: {
    canvasPreviewResult: CanvasPreviewResult;
    adaptiveTracker: AdaptiveResolutionTracker;
    compositionWidth: number;
    compositionHeight: number;
    getResolutionScale: () => number;
    isAtRest: () => boolean;
    isExporting: () => boolean;
  }) {
    // Note: canvasPreviewResult no longer needed since we don't call refresh()
    this.adaptiveTracker = options.adaptiveTracker;
    this.compositionWidth = options.compositionWidth;
    this.compositionHeight = options.compositionHeight;
    this.getResolutionScale = options.getResolutionScale;
    this.isAtRest = options.isAtRest;
    this.isExporting = options.isExporting;
  }

  start(): void {
    // Initialize stats update time
    this.lastStatsUpdateTime = performance.now();
  }

  stop(): void {
    this.currentStats = null;
  }

  /**
   * Record render timing from EFWorkbench's render loop.
   * This is called after each successful canvas refresh.
   */
  recordRenderTime(renderTimeMs: number, timestamp: number): void {
    // Skip during export
    if (this.isExporting()) return;

    // Only record frame timing when in motion (playing/scrubbing)
    // This prevents inflated stats at rest and focuses tracking on actual playback
    if (!this.isAtRest()) {
      this.adaptiveTracker.recordFrame(renderTimeMs, timestamp);
    }

    // Update playback stats every 100ms (10 times per second)
    if (timestamp - this.lastStatsUpdateTime > 100) {
      this.lastStatsUpdateTime = timestamp;
      // Get CURRENT resolution from the canvas result (may have changed dynamically)
      const currentScale = this.getResolutionScale();
      const renderWidth = Math.floor(this.compositionWidth * currentScale);
      const renderHeight = Math.floor(this.compositionHeight * currentScale);
      this.updateStats(renderWidth, renderHeight, currentScale);
    }
  }

  getStats(): PlaybackStats | null {
    return this.currentStats;
  }

  supportsStat(_stat: StatType): boolean {
    // Canvas mode supports all stats
    return true;
  }

  private updateStats(renderWidth: number, renderHeight: number, resolutionScale: number): void {
    const trackerStats = this.adaptiveTracker.getStats();

    this.currentStats = {
      fps: trackerStats.fps,
      avgRenderTime: trackerStats.avgRenderTime,
      headroom: trackerStats.headroom,
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
}

/**
 * DOM mode stats tracking strategy.
 * Tracks FPS, resolution, CPU pressure, and frame seek time.
 */
export class DomStatsStrategy implements StatsTrackingStrategy {
  private timegroup: EFTimegroup;
  private adaptiveTracker: AdaptiveResolutionTracker;

  private animationFrame: number | null = null;
  private lastFrameTime = 0;
  private frameIntervals: number[] = [];
  private lastStatsUpdateTime = 0;
  private currentStats: PlaybackStats | null = null;

  // Frame seek time tracking
  private seekStartTime = 0;
  private seekTimes: number[] = [];
  private frameTaskCleanup: (() => void) | null = null;

  private readonly ROLLING_WINDOW_SIZE = 30; // ~1 second at 30fps
  private readonly TARGET_FRAME_TIME_MS = 33.33; // 30fps target

  constructor(options: { timegroup: EFTimegroup; adaptiveTracker: AdaptiveResolutionTracker }) {
    this.timegroup = options.timegroup;
    this.adaptiveTracker = options.adaptiveTracker;
  }

  start(): void {
    if (this.animationFrame !== null) return;

    // Track frame seek times using frameTask callback
    // This measures how long it takes for the timegroup to fully update after a seek
    const frameTaskCallback = async () => {
      if (this.seekStartTime > 0) {
        const seekTime = performance.now() - this.seekStartTime;
        this.seekTimes.push(seekTime);
        if (this.seekTimes.length > this.ROLLING_WINDOW_SIZE) {
          this.seekTimes.shift();
        }
        this.seekStartTime = 0; // Reset after recording
      }
    };

    this.timegroup.addFrameTask(frameTaskCallback);
    this.frameTaskCleanup = () => {
      // Note: EFTimegroup doesn't have removeFrameTask, but this is fine
      // The callback will be cleaned up when the timegroup is destroyed
    };

    // Track currentTimeMs changes to detect seeks
    let lastCurrentTimeMs = this.timegroup.currentTimeMs;
    const checkSeek = () => {
      const currentTimeMs = this.timegroup.currentTimeMs;
      if (currentTimeMs !== lastCurrentTimeMs) {
        // Seek detected - start timing
        this.seekStartTime = performance.now();
        lastCurrentTimeMs = currentTimeMs;
      }
    };

    const loop = (timestamp: number) => {
      if (this.animationFrame === null) return; // Stopped

      // Check for seeks
      checkSeek();

      // Track frame intervals for FPS calculation
      if (this.lastFrameTime > 0) {
        const interval = timestamp - this.lastFrameTime;
        this.frameIntervals.push(interval);
        if (this.frameIntervals.length > this.ROLLING_WINDOW_SIZE) {
          this.frameIntervals.shift();
        }
      }
      this.lastFrameTime = timestamp;

      // Update stats every 100ms (10 times per second)
      if (timestamp - this.lastStatsUpdateTime > 100) {
        this.lastStatsUpdateTime = timestamp;
        this.updateStats();
      }

      this.animationFrame = requestAnimationFrame(loop);
    };

    this.animationFrame = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.frameTaskCleanup) {
      this.frameTaskCleanup();
      this.frameTaskCleanup = null;
    }
    this.lastFrameTime = 0;
    this.frameIntervals = [];
    this.seekStartTime = 0;
    this.seekTimes = [];
    this.currentStats = null;
  }

  getStats(): PlaybackStats | null {
    return this.currentStats;
  }

  supportsStat(stat: StatType): boolean {
    // DOM mode supports: fps, resolution, cpuPressure, renderTime (seek time), headroom
    // Does NOT support: resolutionScale, adaptiveResolution
    return (
      stat === "fps" ||
      stat === "resolution" ||
      stat === "cpuPressure" ||
      stat === "renderTime" ||
      stat === "headroom"
    );
  }

  private updateStats(): void {
    // Calculate FPS from frame intervals
    const avgFrameInterval =
      this.frameIntervals.length > 0
        ? this.frameIntervals.reduce((a, b) => a + b, 0) / this.frameIntervals.length
        : 16.67;
    const fps = avgFrameInterval > 0 ? 1000 / avgFrameInterval : 0;

    // Calculate average seek time (frame update time)
    const avgSeekTime =
      this.seekTimes.length > 0
        ? this.seekTimes.reduce((a, b) => a + b, 0) / this.seekTimes.length
        : 0;

    // Calculate headroom (positive = faster than target, negative = slower)
    const headroom = avgSeekTime > 0 ? this.TARGET_FRAME_TIME_MS - avgSeekTime : 0;

    // Get CPU pressure from adaptive tracker
    const trackerStats = this.adaptiveTracker.getStats();

    // Calculate displayed resolution from timegroup bounding rect
    const rect = this.timegroup.getBoundingClientRect();
    const renderWidth = Math.round(rect.width);
    const renderHeight = Math.round(rect.height);

    this.currentStats = {
      fps,
      avgRenderTime: avgSeekTime > 0 ? avgSeekTime : null,
      headroom: avgSeekTime > 0 ? headroom : null,
      pressureState: trackerStats.pressureState,
      pressureHistory: trackerStats.pressureHistory,
      renderWidth,
      renderHeight,
      resolutionScale: null, // Not applicable in DOM mode
    };
  }
}

/**
 * Factory function to create the appropriate stats tracking strategy for a presentation mode.
 * Returns null for modes that don't support stats tracking.
 */
export function createStatsTrackingStrategy(
  mode: PreviewPresentationMode,
  options: {
    timegroup: EFTimegroup;
    adaptiveTracker: AdaptiveResolutionTracker;
    canvasPreviewResult?: CanvasPreviewResult | null;
    compositionWidth: number;
    compositionHeight: number;
    getResolutionScale?: () => number;
    isAtRest?: () => boolean;
    isExporting?: () => boolean;
  },
): StatsTrackingStrategy | null {
  switch (mode) {
    case "canvas":
      if (
        !options.canvasPreviewResult ||
        !options.getResolutionScale ||
        !options.isAtRest ||
        !options.isExporting
      ) {
        return null;
      }
      return new CanvasStatsStrategy({
        canvasPreviewResult: options.canvasPreviewResult,
        adaptiveTracker: options.adaptiveTracker,
        compositionWidth: options.compositionWidth,
        compositionHeight: options.compositionHeight,
        getResolutionScale: options.getResolutionScale,
        isAtRest: options.isAtRest,
        isExporting: options.isExporting,
      });

    case "dom":
      return new DomStatsStrategy({
        timegroup: options.timegroup,
        adaptiveTracker: options.adaptiveTracker,
      });

    case "canvas":
      return null;

    default:
      return null;
  }
}
