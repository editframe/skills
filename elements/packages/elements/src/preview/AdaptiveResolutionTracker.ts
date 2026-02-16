/**
 * Adaptive Resolution Tracker
 * 
 * Monitors actual render time to dynamically adjust preview resolution
 * for smooth playback without dropped frames.
 * 
 * Key insight: We measure how long each render() takes, not rAF timing.
 * If renders consistently take longer than our frame budget, scale down.
 * If renders consistently have headroom, scale up.
 */

import { logger } from "./logger.js";

/**
 * Available resolution scale steps for adaptive scaling.
 * Finer-grained steps (5% increments) for smoother adaptation.
 * Ordered from highest to lowest quality.
 */
const SCALE_STEPS = [
  1.0, 0.95, 0.90, 0.85, 0.80, 
  0.75, 0.70, 0.65, 0.60, 0.55,
  0.50, 0.45, 0.40, 0.35, 0.30,
  0.25, 0.20, 0.15, 0.10
] as const;
type ScaleStep = typeof SCALE_STEPS[number];

/**
 * Compute Pressure API types (not yet in TypeScript lib)
 */
type PressureState = "nominal" | "fair" | "serious" | "critical";

interface PressureRecord {
  state: PressureState;
  time: number;
}

interface PressureObserverCallback {
  (records: PressureRecord[]): void;
}

interface PressureObserverOptions {
  sampleInterval?: number;
}

declare class PressureObserver {
  constructor(callback: PressureObserverCallback);
  observe(source: "cpu", options?: PressureObserverOptions): Promise<void>;
  unobserve(source: "cpu"): void;
  disconnect(): void;
}

/**
 * Timing thresholds
 * 
 * Target: 30fps = 33.33ms per frame
 * Tolerate down to 15fps (half target) before scaling down.
 * Scale up when we have plenty of headroom.
 */
const TARGET_FRAME_TIME_MS = 33.33; // 30fps target
const SCALE_DOWN_THRESHOLD_MS = 66.67; // 15fps (half target) - only scale down if really struggling
const SCALE_UP_THRESHOLD_MS = 25; // If avg render time is well below target, consider scaling up
const ROLLING_WINDOW_SIZE = 30; // ~1 second of samples at 30fps
const MIN_SCALE_CHANGE_INTERVAL_MS = 2000; // Wait 2s between any scale changes
const SCALE_UP_STABILITY_SAMPLES = 60; // Need 60 samples (~2s) of good performance to scale up

/** Size of the pressure history for histogram display */
const PRESSURE_HISTORY_SIZE = 60;

/**
 * Tracks render time to recommend optimal preview resolution.
 */
export class AdaptiveResolutionTracker {
  private renderTimes: number[] = []; // Rolling window of render times (ms)
  private currentScaleIndex = 0; // Index into SCALE_STEPS (0 = highest quality)
  private lastScaleChangeTime = 0;
  private samplesAtCurrentScale = 0; // How many samples we've collected at current scale
  
  // Compute Pressure API
  private pressureObserver: PressureObserver | null = null;
  private pressureState: PressureState = "nominal";
  private pressureHistory: PressureState[] = [];
  
  // For display - track frame intervals separately from render times
  private lastFrameTime = 0;
  private frameIntervals: number[] = [];
  
  // Callbacks
  private onScaleChange?: (scale: ScaleStep) => void;
  
  constructor(options?: { onScaleChange?: (scale: ScaleStep) => void }) {
    this.onScaleChange = options?.onScaleChange;
    this.initPressureObserver();
  }
  
  /**
   * Initialize Compute Pressure API observer if available.
   */
  private initPressureObserver(): void {
    if (!("PressureObserver" in globalThis)) {
      return;
    }
    
    try {
      this.pressureObserver = new PressureObserver((records) => {
        if (records.length > 0) {
          const latest = records[records.length - 1]!;
          this.pressureState = latest.state;
          
          this.pressureHistory.push(latest.state);
          if (this.pressureHistory.length > PRESSURE_HISTORY_SIZE) {
            this.pressureHistory.shift();
          }
        }
      });
      
      this.pressureObserver.observe("cpu", { sampleInterval: 500 }).catch(() => {
        // Ignore errors from observe (e.g., AbortError if disconnect called before observe resolves)
      });
    } catch (e) {
      logger.warn("[AdaptiveResolutionTracker] Failed to initialize PressureObserver:", e);
      this.pressureObserver = null;
    }
  }
  
  /**
   * Record a frame's render time.
   * Call this AFTER each render completes with how long the render took.
   * 
   * @param renderTimeMs - How long the render() call took in milliseconds
   * @param timestamp - Optional rAF timestamp for frame interval tracking (display only)
   */
  recordFrame(renderTimeMs: number, timestamp?: number): void {
    // Track render times for adaptive decisions
    this.renderTimes.push(renderTimeMs);
    if (this.renderTimes.length > ROLLING_WINDOW_SIZE) {
      this.renderTimes.shift();
    }
    this.samplesAtCurrentScale++;
    
    // Track frame intervals for FPS display (separate from render time)
    if (timestamp !== undefined && this.lastFrameTime > 0) {
      const interval = timestamp - this.lastFrameTime;
      this.frameIntervals.push(interval);
      if (this.frameIntervals.length > ROLLING_WINDOW_SIZE) {
        this.frameIntervals.shift();
      }
    }
    if (timestamp !== undefined) {
      this.lastFrameTime = timestamp;
    }
    
    // Check if we should adjust scale
    this.checkForScaleAdjustment();
  }
  
  /**
   * Check if we should scale up or down based on render time trends.
   */
  private checkForScaleAdjustment(): void {
    if (this.renderTimes.length < 10) return; // Need some samples
    
    const now = performance.now();
    if (now - this.lastScaleChangeTime < MIN_SCALE_CHANGE_INTERVAL_MS) {
      return; // Rate limit changes
    }
    
    const avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
    
    // Scale DOWN if we're consistently slow
    if (avgRenderTime > SCALE_DOWN_THRESHOLD_MS) {
      this.scaleDown("slow");
      return;
    }
    
    // Scale DOWN if CPU pressure is high (proactive)
    if (this.pressureState === "critical" || this.pressureState === "serious") {
      this.scaleDown("pressure");
      return;
    }
    
    // Scale UP if we have sustained headroom and CPU isn't under pressure
    // (we already returned above if pressure is serious/critical, but check again for clarity)
    const pressureOk = this.pressureState === "nominal" || this.pressureState === "fair";
    if (avgRenderTime < SCALE_UP_THRESHOLD_MS && 
        this.samplesAtCurrentScale >= SCALE_UP_STABILITY_SAMPLES &&
        pressureOk) {
      this.scaleUp();
    }
  }
  
  /**
   * Decrease resolution (increase scale index).
   */
  private scaleDown(reason: "slow" | "pressure"): void {
    if (this.currentScaleIndex < SCALE_STEPS.length - 1) {
      this.currentScaleIndex++;
      this.lastScaleChangeTime = performance.now();
      this.samplesAtCurrentScale = 0;
      this.renderTimes = []; // Clear history at new scale
      
      const newScale = SCALE_STEPS[this.currentScaleIndex]!;
      logger.debug(`[AdaptiveResolutionTracker] Scaling DOWN to ${(newScale * 100).toFixed(0)}% (reason: ${reason})`);
      this.onScaleChange?.(newScale);
    }
  }
  
  /**
   * Increase resolution (decrease scale index).
   */
  private scaleUp(): void {
    if (this.currentScaleIndex > 0) {
      this.currentScaleIndex--;
      this.lastScaleChangeTime = performance.now();
      this.samplesAtCurrentScale = 0;
      this.renderTimes = []; // Clear history at new scale
      
      const newScale = SCALE_STEPS[this.currentScaleIndex]!;
      logger.debug(`[AdaptiveResolutionTracker] Scaling UP to ${(newScale * 100).toFixed(0)}% (reason: stable performance)`);
      this.onScaleChange?.(newScale);
    }
  }
  
  /**
   * Get the current recommended scale factor.
   */
  getRecommendedScale(): ScaleStep {
    return SCALE_STEPS[this.currentScaleIndex]!;
  }
  
  /**
   * Get current statistics for display.
   */
  getStats(): {
    currentScale: ScaleStep;
    avgRenderTime: number;
    fps: number;
    pressureState: PressureState;
    pressureHistory: PressureState[];
    samplesAtCurrentScale: number;
    canScaleUp: boolean;
    canScaleDown: boolean;
    headroom: number; // How much faster than target we're rendering (negative = behind)
  } {
    const avgRenderTime = this.renderTimes.length > 0
      ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
      : 0;
    
    // FPS based on frame intervals (how often we're called), not render time
    const avgFrameInterval = this.frameIntervals.length > 0
      ? this.frameIntervals.reduce((a, b) => a + b, 0) / this.frameIntervals.length
      : 16.67;
    const fps = avgFrameInterval > 0 ? 1000 / avgFrameInterval : 0;
    
    const now = performance.now();
    const timeSinceLastChange = now - this.lastScaleChangeTime;
    const canChange = timeSinceLastChange >= MIN_SCALE_CHANGE_INTERVAL_MS;
    
    const pressureOk = this.pressureState === "nominal" || this.pressureState === "fair";
    const canScaleUp = canChange && 
      this.currentScaleIndex > 0 && 
      avgRenderTime < SCALE_UP_THRESHOLD_MS &&
      this.samplesAtCurrentScale >= SCALE_UP_STABILITY_SAMPLES &&
      pressureOk;
    
    const canScaleDown = canChange && 
      this.currentScaleIndex < SCALE_STEPS.length - 1;
    
    // Headroom: positive = we're faster than needed, negative = we're behind
    const headroom = TARGET_FRAME_TIME_MS - avgRenderTime;
    
    return {
      currentScale: this.getRecommendedScale(),
      avgRenderTime,
      fps,
      pressureState: this.pressureState,
      pressureHistory: [...this.pressureHistory],
      samplesAtCurrentScale: this.samplesAtCurrentScale,
      canScaleUp,
      canScaleDown,
      headroom,
    };
  }
  
  /**
   * Reset the tracker state.
   */
  reset(): void {
    this.lastFrameTime = 0;
    this.frameIntervals = [];
    this.renderTimes = [];
    this.currentScaleIndex = 0;
    this.lastScaleChangeTime = 0;
    this.samplesAtCurrentScale = 0;
  }
  
  /**
   * Initialize the tracker to start at a specific scale.
   */
  initializeAtScale(targetScale: number): void {
    let bestIndex = 0;
    for (let i = 0; i < SCALE_STEPS.length; i++) {
      if (SCALE_STEPS[i]! <= targetScale) {
        bestIndex = i;
        break;
      }
    }
    
    this.currentScaleIndex = bestIndex;
    this.lastFrameTime = 0;
    this.frameIntervals = [];
    this.renderTimes = [];
    this.lastScaleChangeTime = 0;
    this.samplesAtCurrentScale = 0;
    
    logger.debug(`[AdaptiveResolutionTracker] Initialized at scale ${(SCALE_STEPS[bestIndex]! * 100).toFixed(0)}%`);
  }
  
  /**
   * Clean up resources.
   */
  dispose(): void {
    if (this.pressureObserver) {
      try {
        this.pressureObserver.disconnect();
      } catch {
        // Ignore cleanup errors
      }
      this.pressureObserver = null;
    }
  }
}
