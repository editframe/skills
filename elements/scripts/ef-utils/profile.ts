/**
 * Re-export from unified profiling library
 */
import type { HotspotInfo } from "../../packages/elements/src/profiling/types.js";
import { getHotspots, analyzeProfile } from "../../packages/elements/src/profiling/analyzer.js";

export interface Hotspot {
  functionName: string;
  url: string;
  line: number;
  selfTime: number;
  totalTime: number;
  percentage: number;
}

export function extractHotspots(profile: any, topN: number = 10): Hotspot[] {
  if (!profile || !profile.nodes || !profile.samples) {
    return [];
  }
  
  const hotspots = getHotspots(profile, {
    filterNodeModules: true,
    filterInternals: true,
    topN,
  });
  
  // Convert to legacy Hotspot format
  return hotspots.map(h => ({
    functionName: h.functionName,
    url: h.url,
    line: h.line,
    selfTime: h.selfTime,
    totalTime: h.totalTime,
    percentage: h.selfTimePct,
  }));
}

export function printHotspots(scenarioName: string, hotspots: Hotspot[], topN: number = 10): void {
  if (hotspots.length === 0) {
    console.log(`    No user code hotspots found`);
    return;
  }
  
  const displayHotspots = hotspots.slice(0, topN);
  console.log(`    Top ${displayHotspots.length} hotspots:`);
  for (let i = 0; i < displayHotspots.length; i++) {
    const hotspot = displayHotspots[i];
    const fileName = hotspot.url.split("/").pop() || hotspot.url;
    const location = `${fileName}:${hotspot.line + 1}`;
    const rank = (i + 1).toString().padStart(2);
    console.log(`      ${rank}. ${hotspot.selfTime.toFixed(2)}ms (${hotspot.percentage.toFixed(1)}%) - ${hotspot.functionName} @ ${location}`);
  }
  
  if (hotspots.length > topN) {
    console.log(`    ... and ${hotspots.length - topN} more`);
  }
}

export function findHotspot(hotspots: Hotspot[], functionName?: string, fileName?: string): Hotspot | null {
  if (!functionName && !fileName) return null;
  
  return hotspots.find((h) => {
    const hFileName = h.url.split("/").pop() || h.url;
    const nameMatch = !functionName || h.functionName === functionName;
    const fileMatch = !fileName || hFileName === fileName || h.url.includes(fileName);
    return nameMatch && fileMatch;
  }) || null;
}

/**
 * Re-export assertion types and functions from unified library
 */
import type {
  ProfileAssertion as UnifiedProfileAssertion,
  ProfileAssertionResult as UnifiedProfileAssertionResult,
} from "../../packages/elements/src/profiling/types.js";
import { checkProfileAssertions as checkProfileAssertionsNew } from "../../packages/elements/src/profiling/assertions.js";
import { findHotspot as findHotspotNew } from "../../packages/elements/src/profiling/analyzer.js";

export type ProfileAssertion = UnifiedProfileAssertion;
export type ProfileAssertionResult = UnifiedProfileAssertionResult;

export function checkProfileAssertions(
  hotspots: Hotspot[],
  assertions: ProfileAssertion[],
): ProfileAssertionResult[] {
  // Convert Hotspot[] to HotspotInfo[] for the unified library
  const hotspotsConverted: HotspotInfo[] = hotspots.map(h => ({
    functionName: h.functionName,
    url: h.url,
    file: h.url.split("/").pop()?.split("?")[0] || h.url,
    line: h.line + 1,
    column: 0,
    selfTime: h.selfTime,
    totalTime: h.totalTime,
    selfTimePct: h.percentage,
    hitCount: 0,
  }));
  
  return checkProfileAssertionsNew(hotspotsConverted, assertions);
}

/**
 * Re-export comparison types and functions from unified library
 */
import type { BaselineThreshold as UnifiedBaselineThreshold } from "../../packages/elements/src/profiling/types.js";
import { compareProfiles as compareProfilesNew } from "../../packages/elements/src/profiling/comparator.js";

export type BaselineThreshold = UnifiedBaselineThreshold;

export interface ProfileComparison {
  diff: Hotspot[];
  summary: string;
  durationDiffMs: number;
  durationDiffPercent: number;
  regressions: {
    duration?: boolean;
    hotspots: Array<{ hotspot: Hotspot; reason: string }>;
  };
}

export function compareProfiles(
  current: any,
  baseline: any,
  threshold?: BaselineThreshold,
): ProfileComparison {
  const currentAnalysis = analyzeProfile(current, { filterNodeModules: true, filterInternals: true, topN: 20 });
  const baselineAnalysis = analyzeProfile(baseline, { filterNodeModules: true, filterInternals: true, topN: 20 });
  
  const comparison = compareProfilesNew(currentAnalysis, baselineAnalysis, threshold);
  
  // Convert back to legacy format
  const diff: Hotspot[] = comparison.diff.map(h => ({
    functionName: h.functionName,
    url: h.url,
    line: h.line,
    selfTime: h.selfTime,
    totalTime: h.totalTime,
    percentage: h.selfTimePct,
  }));
  
  const regressions = {
    duration: comparison.regressions.duration,
    hotspots: comparison.regressions.hotspots.map(({ hotspot, reason }) => ({
      hotspot: {
        functionName: hotspot.functionName,
        url: hotspot.url,
        line: hotspot.line,
        selfTime: hotspot.selfTime,
        totalTime: hotspot.totalTime,
        percentage: hotspot.selfTimePct,
      },
      reason,
    })),
  };
  
  return {
    diff,
    summary: comparison.summary,
    durationDiffMs: comparison.durationDiffMs,
    durationDiffPercent: comparison.durationDiffPercent,
    regressions,
  };
}
