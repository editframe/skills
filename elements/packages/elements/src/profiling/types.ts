/**
 * Shared types for CPU profiling infrastructure
 */

/**
 * V8 CPU Profile format (Chrome DevTools Protocol)
 */
export interface ProfileNode {
  id: number;
  callFrame: {
    functionName: string;
    scriptId: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  hitCount?: number;
  children?: number[];
  positionTicks?: { line: number; ticks: number }[];
}

export interface CPUProfile {
  nodes: ProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

/**
 * Analyzed hotspot with source-mapped location
 */
export interface HotspotInfo {
  functionName: string;
  url: string;
  file: string;
  line: number;
  column: number;
  selfTime: number;
  totalTime: number;
  selfTimePct: number;
  hitCount: number;
  callCount?: number;
}

/**
 * Call tree node for hierarchical analysis
 */
export interface CallTreeNode {
  node: ProfileNode;
  selfTime: number;
  totalTime: number;
  children: CallTreeNode[];
}

/**
 * Resolved source location after source map processing
 */
export interface ResolvedLocation {
  source: string;
  file: string;
  line: number;
  column: number;
  name: string | null;
}

/**
 * Profile analysis results
 */
export interface ProfileAnalysis {
  profile: CPUProfile;
  duration: number;
  samples: number;
  sampleIntervalUs: number;
  hotspots: HotspotInfo[];
  byFile: Map<string, number>;
  totalTimeMs: number;
}

/**
 * Profile assertion types for performance testing
 */
export type ProfileAssertionType = "topHotspot" | "notInTopN" | "maxPercentage" | "maxSelfTime";

export interface ProfileAssertion {
  type: ProfileAssertionType;
  functionName?: string;
  fileName?: string;
  position?: number;
  maxN?: number;
  maxPercentage?: number;
  maxSelfTimeMs?: number;
}

export interface ProfileAssertionResult {
  assertion: ProfileAssertion;
  passed: boolean;
  message: string;
  actual?: {
    position?: number;
    percentage?: number;
    selfTimeMs?: number;
  };
}

/**
 * Profile comparison results
 */
export interface ProfileComparison {
  current: ProfileAnalysis;
  baseline: ProfileAnalysis;
  diff: HotspotInfo[];
  summary: string;
  durationDiffMs: number;
  durationDiffPercent: number;
  regressions: {
    duration?: boolean;
    hotspots: Array<{ hotspot: HotspotInfo; reason: string }>;
  };
}

/**
 * Baseline threshold configuration
 */
export interface BaselineThreshold {
  maxDurationIncreaseMs?: number;
  maxDurationIncreasePercent?: number;
  maxHotspotIncreaseMs?: number;
  maxHotspotIncreasePercent?: number;
}

/**
 * Profile analysis options
 */
export interface AnalyzeOptions {
  filterNodeModules?: boolean;
  filterInternals?: boolean;
  topN?: number;
  resolveSourceMaps?: boolean;
}

/**
 * Format options for output
 */
export interface FormatOptions {
  json?: boolean;
  verbose?: boolean;
  topN?: number;
  showRecommendations?: boolean;
}
