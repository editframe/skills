/**
 * Display None Batch strategy - hide container during mutations.
 * 
 * Hypothesis: Classic DOM optimization. By setting display:none on the
 * container before mutations, the browser can batch all style recalculations
 * into a single pass when we set display:block at the end.
 */

import type { SyncStrategy, SyncTiming, SyncState } from "../types.js";
import { createTiming } from "../Profiler.js";
import { batchedReadsStrategy } from "./batchedReads.js";

export const displayNoneBatchStrategy: SyncStrategy = {
  name: "displayNoneBatch",
  description: "Hide container during mutations, show after (classic DOM optimization)",
  writeMechanism: "inline",

  sync(state: SyncState, timeMs: number): SyncTiming {
    // Get the container element from the first clone's parent
    // The container is typically a div wrapping all clones
    const container = state.pairs[0]?.clone.parentElement;
    
    if (!container) {
      // Fallback to batched reads if no container
      return batchedReadsStrategy.sync(state, timeMs);
    }
    
    const originalDisplay = container.style.display;
    
    // Hide container - browser skips style recalc for hidden elements
    container.style.display = "none";
    
    // Do all the work while hidden (uses batched reads internally)
    const timing = batchedReadsStrategy.sync(state, timeMs);
    
    // Show container - single style recalc for entire subtree
    container.style.display = originalDisplay || "";
    
    return timing;
  },
};


