import type { 
  ViewportState, 
  ViewportSnapshot, 
  TimePointImportance,
  Priority,
  ImportanceReason
} from "./types.js";

/**
 * Viewport Importance Oracle
 * 
 * Responsibilities:
 * - Evaluate importance of time points based on viewport
 * - Determine priority for thumbnail loading
 * - Detect viewport changes
 * 
 * Does NOT know about:
 * - How thumbnails are generated
 * - Cache contents
 * - Actual element rendering
 * - Content versions
 */
export class ViewportOracle {
  // Configuration (could be constructor params)
  #config = {
    renderDistanceViewports: 0.5,
    initialLoadDistanceViewports: 1.5,
    criticalThreshold: 0,      // Inside viewport
    highThreshold: 0.5,         // 0.5 viewports away
    lowThreshold: 1.5,          // 1.5 viewports away
  };
  
  #lastSnapshot: ViewportSnapshot | null = null;

  /**
   * Evaluate importance of time points within a range
   * 
   * This is PURE evaluation - no side effects
   */
  evaluateImportance(
    state: ViewportState,
    timeRange: [startMs: number, endMs: number],
    options?: {
      isInitialLoad?: boolean;
      sampleCount?: number;
    }
  ): TimePointImportance[] {
    const { isInitialLoad = false, sampleCount = 50 } = options ?? {};
    
    // Calculate viewport bounds in time
    const viewportStartMs = state.scrollLeft / state.pixelsPerMs;
    const viewportEndMs = (state.scrollLeft + state.viewportWidth) / state.pixelsPerMs;
    
    // Calculate render distance
    const renderDistance = isInitialLoad
      ? this.#config.initialLoadDistanceViewports * state.viewportWidth
      : this.#config.renderDistanceViewports * state.viewportWidth;
    
    const renderStartMs = Math.max(
      timeRange[0],
      (state.scrollLeft - renderDistance) / state.pixelsPerMs
    );
    const renderEndMs = Math.min(
      timeRange[1],
      (state.scrollLeft + state.viewportWidth + renderDistance) / state.pixelsPerMs
    );
    
    // Generate sample points within render distance
    const [rangeStart, rangeEnd] = timeRange;
    const duration = rangeEnd - rangeStart;
    const points: TimePointImportance[] = [];
    
    for (let i = 0; i < sampleCount; i++) {
      const progress = i / (sampleCount - 1);
      const timeMs = rangeStart + duration * progress;
      
      // Skip if outside render distance
      if (timeMs < renderStartMs || timeMs > renderEndMs) {
        continue;
      }
      
      // Calculate importance
      const importance = this.#calculateImportance(
        timeMs,
        viewportStartMs,
        viewportEndMs,
        state
      );
      
      points.push(importance);
    }
    
    return points;
  }

  /**
   * Create snapshot of current viewport state
   */
  snapshot(state: ViewportState): ViewportSnapshot {
    const hash = this.#hashState(state);
    return {
      timestamp: Date.now(),
      state,
      hash,
    };
  }

  /**
   * Check if viewport has meaningfully changed
   */
  hasChangedSince(current: ViewportState, since: ViewportSnapshot): boolean {
    const currentHash = this.#hashState(current);
    return currentHash !== since.hash;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<typeof this.#config>): void {
    Object.assign(this.#config, config);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Implementation
  // ─────────────────────────────────────────────────────────────────────────

  #calculateImportance(
    timeMs: number,
    viewportStartMs: number,
    viewportEndMs: number,
    state: ViewportState
  ): TimePointImportance {
    // Is it in viewport?
    if (timeMs >= viewportStartMs && timeMs <= viewportEndMs) {
      return {
        timeMs,
        priority: "critical",
        reason: "visible",
        score: 1000, // Highest priority
      };
    }
    
    // Calculate distance from viewport (in pixels)
    const timePositionPx = timeMs * state.pixelsPerMs;
    const viewportLeftPx = viewportStartMs * state.pixelsPerMs;
    const viewportRightPx = viewportEndMs * state.pixelsPerMs;
    
    let distancePx: number;
    let reason: ImportanceReason;
    
    if (timePositionPx < viewportLeftPx) {
      distancePx = viewportLeftPx - timePositionPx;
      reason = "behind";
    } else {
      distancePx = timePositionPx - viewportRightPx;
      reason = "ahead";
    }
    
    const distanceInViewports = distancePx / state.viewportWidth;
    
    // Determine priority based on distance
    let priority: Priority;
    let score: number;
    
    if (distanceInViewports <= this.#config.criticalThreshold) {
      priority = "critical";
      score = 1000;
    } else if (distanceInViewports <= this.#config.highThreshold) {
      priority = "high";
      score = 500 - (distanceInViewports * 100);
    } else if (distanceInViewports <= this.#config.lowThreshold) {
      priority = "low";
      score = 100 - (distanceInViewports * 50);
    } else {
      priority = "none";
      score = 0;
    }
    
    // Boost "ahead" slightly for scrolling efficiency (sequential seeks)
    if (reason === "ahead" && priority !== "none") {
      score += 50;
    }
    
    return { timeMs, priority, reason, score };
  }

  #hashState(state: ViewportState): string {
    // Simple hash for change detection
    // Round values to avoid float precision issues
    const sl = Math.round(state.scrollLeft / 10) * 10;
    const vw = Math.round(state.viewportWidth / 10) * 10;
    const ppm = state.pixelsPerMs.toFixed(4);
    return `${sl}:${vw}:${ppm}`;
  }
}
