/**
 * Profiling utility for render operations.
 * Centralizes timing accumulation and logging to keep business logic clean.
 */

/** Interval between profiling log outputs (ms) */
const DEFAULT_LOG_INTERVAL_MS = 2000;

/** Interval for periodic frame logging (every N frames) */
const DEFAULT_FRAME_LOG_INTERVAL = 60;

/**
 * Phases tracked during rendering.
 */
export interface RenderTimings {
  setup: number;
  draw: number;
  downsample: number;
  canvasEncode: number;
  inline: number;
  serialize: number;
  base64: number;
  imageLoad: number;
  restore: number;
}

/**
 * Profiler for render operations.
 * Accumulates timing data and provides structured logging.
 */
export class RenderProfiler {
  private _renderCount = 0;
  private _lastLogTime = 0;
  private _timingLoggedAt = 0;

  private _timings: RenderTimings = {
    setup: 0,
    draw: 0,
    downsample: 0,
    canvasEncode: 0,
    inline: 0,
    serialize: 0,
    base64: 0,
    imageLoad: 0,
    restore: 0,
  };

  /**
   * Reset all timing data.
   */
  reset(): void {
    this._renderCount = 0;
    this._lastLogTime = 0;
    this._timingLoggedAt = 0;

    for (const key of Object.keys(this._timings) as (keyof RenderTimings)[]) {
      this._timings[key] = 0;
    }
  }

  /**
   * Get current render count.
   */
  get renderCount(): number {
    return this._renderCount;
  }

  /**
   * Increment render count.
   */
  incrementRenderCount(): void {
    this._renderCount++;
  }

  /**
   * Add time to a specific phase.
   */
  addTime(phase: keyof RenderTimings, ms: number): void {
    this._timings[phase] += ms;
  }

  /**
   * Time a synchronous operation and add to the specified phase.
   */
  time<T>(phase: keyof RenderTimings, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    this._timings[phase] += performance.now() - start;
    return result;
  }

  /**
   * Time an async operation and add to the specified phase.
   */
  async timeAsync<T>(
    phase: keyof RenderTimings,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = performance.now();
    const result = await fn();
    this._timings[phase] += performance.now() - start;
    return result;
  }

  /**
   * Check if enough time has passed since last log (for time-based logging).
   */
  shouldLogByTime(intervalMs: number = DEFAULT_LOG_INTERVAL_MS): boolean {
    const now = performance.now();
    if (now - this._lastLogTime > intervalMs) {
      this._lastLogTime = now;
      return true;
    }
    return false;
  }

  /**
   * Check if enough frames have passed since last log (for frame-based logging).
   */
  shouldLogByFrameCount(
    interval: number = DEFAULT_FRAME_LOG_INTERVAL,
  ): boolean {
    if (this._renderCount - this._timingLoggedAt >= interval) {
      this._timingLoggedAt = this._renderCount;
      return true;
    }
    return false;
  }

  /**
   * Check if this is an early render (for initial debug logging).
   */
  isEarlyRender(threshold: number = 2): boolean {
    return this._renderCount < threshold;
  }

  /**
   * Get timing summary string.
   */
  summary(): string {
    const t = this._timings;
    const parts: string[] = [];

    if (t.setup > 0) parts.push(`setup=${t.setup.toFixed(0)}ms`);
    if (t.draw > 0) parts.push(`draw=${t.draw.toFixed(0)}ms`);
    if (t.downsample > 0) parts.push(`downsample=${t.downsample.toFixed(0)}ms`);
    if (t.canvasEncode > 0)
      parts.push(`canvasEncode=${t.canvasEncode.toFixed(0)}ms`);
    if (t.inline > 0) parts.push(`inline=${t.inline.toFixed(0)}ms`);
    if (t.serialize > 0) parts.push(`serialize=${t.serialize.toFixed(0)}ms`);
    if (t.base64 > 0) parts.push(`base64=${t.base64.toFixed(0)}ms`);
    if (t.imageLoad > 0) parts.push(`imageLoad=${t.imageLoad.toFixed(0)}ms`);
    if (t.restore > 0) parts.push(`restore=${t.restore.toFixed(0)}ms`);

    return parts.join(", ");
  }

  /**
   * Get raw timings object.
   */
  getTimings(): Readonly<RenderTimings> {
    return { ...this._timings };
  }
}

/**
 * Default shared profiler instance.
 * Can be replaced with a custom instance for testing.
 */
export const defaultProfiler = new RenderProfiler();
