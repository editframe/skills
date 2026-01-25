/**
 * @deprecated This file is maintained for backward compatibility.
 * Use @editframe/elements/profiling instead.
 * 
 * Re-exports from the unified profiling library.
 */

import type { CPUProfile, ProfileNode, HotspotInfo } from "./types.js";
import type { CallTreeNode as UnifiedCallTreeNode } from "../../profiling/types.js";

export type { CPUProfile, ProfileNode, HotspotInfo } from "./types.js";

// Re-export from unified library
export {
  getNodeById,
  calculateTotalTime,
  calculateSelfTime,
  buildCallTree,
  getTimeRange,
  getCallStack,
} from "../../profiling/analyzer.js";

export type CallTreeNode = UnifiedCallTreeNode;

/**
 * Get hotspots with legacy interface (converts to ms in the function)
 * @deprecated Use analyzeProfile from @editframe/elements/profiling instead
 */
export function getHotspots(profile: CPUProfile): HotspotInfo[] {
  // Import dynamically to use the unified library
  const { getHotspots: getHotspotsNew } = require("../../profiling/analyzer.js");
  const hotspots = getHotspotsNew(profile, {});
  
  // Convert back to microseconds for legacy compatibility
  return hotspots.map(h => ({
    ...h,
    selfTime: h.selfTime * 1000, // Convert ms to μs
    totalTime: h.totalTime * 1000, // Convert ms to μs
  }));
}
