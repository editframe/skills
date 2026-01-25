/**
 * Unified CPU profiling library
 * 
 * Provides analysis, formatting, comparison, and assertions for CPU profiles.
 * Optimized for LLM consumption with structured text and JSON output.
 */

// Types
export type {
  CPUProfile,
  ProfileNode,
  HotspotInfo,
  CallTreeNode,
  ResolvedLocation,
  ProfileAnalysis,
  ProfileAssertion,
  ProfileAssertionResult,
  ProfileComparison,
  BaselineThreshold,
  AnalyzeOptions,
  FormatOptions,
} from "./types.js";

// Core analysis functions
export {
  getNodeById,
  calculateTotalTime,
  calculateSelfTime,
  calculateCallCounts,
  getHotspots,
  buildCallTree,
  getCallStack,
  getTimeRange,
  aggregateByFile,
  findHotspot,
  analyzeProfile,
} from "./analyzer.js";

// Comparison and regression detection
export {
  compareProfiles,
  hasRegression,
  getRegressionSummary,
} from "./comparator.js";

// Output formatting
export {
  formatHotspotsTable,
  formatByFile,
  generateRecommendations,
  formatProfileAnalysis,
  formatProfileAnalysisJSON,
  formatProfileComparison,
  formatProfileComparisonJSON,
  printHotspots,
} from "./formatter.js";

// Assertions
export {
  checkProfileAssertions,
  allAssertionsPassed,
  formatAssertionResults,
} from "./assertions.js";

// Source map resolution
export {
  resolveSourceLocation,
  SourceMapResolver,
} from "./source-maps.js";

// Pattern detection
export type { Pattern } from "./patterns.js";
export {
  detectPatterns,
  formatPatterns,
  formatPatternsJSON,
} from "./patterns.js";
