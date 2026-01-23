/**
 * Baseline strategy - wraps current syncStyles implementation.
 * 
 * This is the control measurement. All other strategies will be
 * compared against this to measure improvement.
 */

import type { SyncStrategy, SyncTiming, SyncState } from "../types.js";
import { Profiler, createTiming } from "../Profiler.js";
import { syncStyles } from "../../renderTimegroupPreview.js";

/**
 * The baseline strategy wraps the existing syncStyles implementation
 * with timing instrumentation to measure each phase.
 */
export const baselineStrategy: SyncStrategy = {
  name: "baseline",
  description: "Current implementation with interleaved read/write (control)",
  writeMechanism: "inline",

  sync(state: SyncState, timeMs: number): SyncTiming {
    const profiler = new Profiler();
    const elementCount = (state as any).pairs?.length ?? state.nodeCount;

    // The current implementation interleaves reads and writes,
    // so we can only measure total time, not phase breakdown.
    // We'll estimate phase breakdown in instrumented strategies.
    const start = performance.now();
    syncStyles(state, timeMs);
    const totalMs = performance.now() - start;

    // For baseline, we attribute all time to "write" since
    // we can't separate read/write in the interleaved impl.
    // This will be more granular in other strategies.
    return createTiming(
      0,        // readMs - can't measure separately
      totalMs,  // writeMs - all time attributed here
      0,        // copyMs - included in writeMs
      elementCount,
    );
  },
};


