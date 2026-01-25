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
 * Get hotspots with legacy interface
 * @deprecated Use analyzeProfile from @editframe/elements/profiling instead
 */
export function getHotspots(profile: CPUProfile): HotspotInfo[] {
  const { getHotspots: getHotspotsNew } = require("../../profiling/analyzer.js");
  const hotspots = getHotspotsNew(profile, {});
  
  // The unified library returns times in milliseconds
  // The old interface returned times in microseconds
  // HotspotsList.tsx divides by 1000 when displaying, so we need to convert to μs
  return hotspots.map(h => ({
    functionName: h.functionName,
    url: h.url,
    line: h.line - 1, // Old interface used 0-based line numbers
    column: h.column - 1, // Old interface used 0-based column numbers
    selfTime: h.selfTime * 1000, // Convert ms to μs
    totalTime: h.totalTime * 1000, // Convert ms to μs
    hitCount: h.hitCount,
  }));
}
