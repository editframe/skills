/**
 * Profile output formatters for LLM and human consumption
 */

import type {
  ProfileAnalysis,
  ProfileComparison,
  HotspotInfo,
  FormatOptions,
} from "./types.js";

/**
 * Format hotspots as a table for console output
 */
export function formatHotspotsTable(hotspots: HotspotInfo[], options: FormatOptions = {}): string {
  const { topN = 20, verbose = false } = options;
  const lines: string[] = [];
  const displayHotspots = hotspots.slice(0, topN);

  for (let i = 0; i < displayHotspots.length; i++) {
    const h = displayHotspots[i];
    const rank = (i + 1).toString().padStart(3);
    const time = h.selfTime.toFixed(1).padStart(7);
    const pct = h.selfTimePct.toFixed(1).padStart(5);
    const location = `${h.file}:${h.line}`;
    const callInfo = verbose && h.callCount ? ` [${h.callCount} calls]` : "";
    lines.push(`  ${rank}.  ${time}ms (${pct}%) - ${h.functionName} @ ${location}${callInfo}`);
  }

  return lines.join("\n");
}

/**
 * Format by-file aggregation
 */
export function formatByFile(byFile: Map<string, number>, totalTimeMs: number, options: FormatOptions = {}): string {
  const { topN = 15 } = options;
  const lines: string[] = [];
  
  const sorted = Array.from(byFile.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  for (const [file, time] of sorted) {
    const timeStr = time.toFixed(1).padStart(7);
    const pct = ((time / totalTimeMs) * 100).toFixed(1).padStart(5);
    lines.push(`  ${timeStr}ms (${pct}%) - ${file}`);
  }

  return lines.join("\n");
}

/**
 * Generate recommendations based on hotspots
 */
export function generateRecommendations(hotspots: HotspotInfo[]): string[] {
  const recommendations: string[] = [];
  
  // Top hotspot recommendations
  for (let i = 0; i < Math.min(3, hotspots.length); i++) {
    const h = hotspots[i];
    if (h.selfTimePct > 15) {
      const callInfo = h.callCount && h.callCount > 1 ? ` (called ${h.callCount} times)` : "";
      recommendations.push(
        `• ${h.functionName} @ ${h.file}:${h.line} takes ${h.selfTimePct.toFixed(1)}%${callInfo} - consider optimization`
      );
    }
  }

  // Look for potential caching opportunities based on call count
  const highCallCount = hotspots.filter(h => h.callCount && h.callCount > 50 && h.selfTimePct > 5);
  for (const h of highCallCount.slice(0, 2)) {
    recommendations.push(
      `• ${h.functionName} called ${h.callCount} times - consider caching or memoization`
    );
  }

  // Look for functions with high hit count (tight loops)
  const tightLoops = hotspots.filter(h => h.hitCount > 100 && h.selfTimePct > 10);
  for (const h of tightLoops.slice(0, 2)) {
    recommendations.push(
      `• ${h.functionName} appears in ${h.hitCount} samples - may be in hot loop`
    );
  }

  // Look for file-level patterns
  const fileMap = new Map<string, HotspotInfo[]>();
  for (const h of hotspots) {
    if (!fileMap.has(h.file)) {
      fileMap.set(h.file, []);
    }
    fileMap.get(h.file)!.push(h);
  }

  for (const [file, fileHotspots] of fileMap) {
    const fileTotal = fileHotspots.reduce((sum, h) => sum + h.selfTimePct, 0);
    if (fileTotal > 30 && fileHotspots.length > 1) {
      recommendations.push(
        `• ${file} has ${fileHotspots.length} hotspots totaling ${fileTotal.toFixed(1)}% - review overall file performance`
      );
    }
  }

  return recommendations.slice(0, 6); // Top 6 recommendations
}

/**
 * Format complete profile analysis for text output
 */
export function formatProfileAnalysis(
  analysis: ProfileAnalysis,
  context?: { sandbox?: string; scenario?: string },
  options: FormatOptions = {}
): string {
  const { showRecommendations = true, topN = 20, verbose = false } = options;
  const lines: string[] = [];

  lines.push("=== PROFILE ANALYSIS ===");
  
  if (context?.sandbox || context?.scenario) {
    const parts: string[] = [];
    if (context.sandbox) parts.push(`Sandbox: ${context.sandbox}`);
    if (context.scenario) parts.push(`Scenario: ${context.scenario}`);
    lines.push(parts.join(" / "));
  }

  lines.push(`Duration: ${analysis.duration.toFixed(2)}ms`);
  lines.push(`Samples: ${analysis.samples.toLocaleString()} (${analysis.sampleIntervalUs.toFixed(0)}μs interval)`);
  lines.push("");

  lines.push("TOP HOTSPOTS (by self time):");
  lines.push(formatHotspotsTable(analysis.hotspots, { topN, verbose }));
  lines.push("");

  lines.push("BY FILE:");
  lines.push(formatByFile(analysis.byFile, analysis.totalTimeMs, { topN: 15 }));

  if (showRecommendations) {
    const recommendations = generateRecommendations(analysis.hotspots);
    if (recommendations.length > 0) {
      lines.push("");
      lines.push("RECOMMENDATIONS:");
      lines.push(recommendations.join("\n"));
    }
  }

  // Add pattern detection if verbose
  if (verbose) {
    const { detectPatterns, formatPatterns } = require("./patterns.js");
    const patterns = detectPatterns(analysis);
    if (patterns.length > 0) {
      lines.push("");
      lines.push(formatPatterns(patterns));
    }
  }

  return lines.join("\n");
}

/**
 * Format profile analysis as JSON
 */
export function formatProfileAnalysisJSON(
  analysis: ProfileAnalysis,
  context?: { sandbox?: string; scenario?: string },
  options: FormatOptions = {}
): string {
  const { showRecommendations = true, topN = 20, verbose = false } = options;

  const output: any = {
    ...(context?.sandbox && { sandbox: context.sandbox }),
    ...(context?.scenario && { scenario: context.scenario }),
    durationMs: analysis.duration,
    samples: analysis.samples,
    sampleIntervalUs: analysis.sampleIntervalUs,
    hotspots: analysis.hotspots.slice(0, topN).map((h, i) => ({
      rank: i + 1,
      functionName: h.functionName,
      file: h.file,
      line: h.line,
      column: h.column,
      selfTimeMs: h.selfTime,
      totalTimeMs: h.totalTime,
      selfTimePct: h.selfTimePct,
      hitCount: h.hitCount,
      callCount: h.callCount || 0,
    })),
    byFile: Array.from(analysis.byFile.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([file, timeMs]) => ({
        file,
        timeMs,
        timePct: (timeMs / analysis.totalTimeMs) * 100,
      })),
  };

  if (showRecommendations) {
    output.recommendations = generateRecommendations(analysis.hotspots);
  }

  // Add pattern detection if verbose
  if (verbose) {
    const { detectPatterns, formatPatternsJSON } = require("./patterns.js");
    const patterns = detectPatterns(analysis);
    output.patterns = formatPatternsJSON(patterns);
  }

  return JSON.stringify(output, null, 2);
}

/**
 * Format profile comparison for text output
 */
export function formatProfileComparison(comparison: ProfileComparison, options: FormatOptions = {}): string {
  const lines: string[] = [];

  lines.push("=== PROFILE COMPARISON ===");
  lines.push(comparison.summary);
  lines.push("");

  if (comparison.regressions.duration) {
    lines.push("⚠️  DURATION REGRESSION DETECTED");
  }

  if (comparison.regressions.hotspots.length > 0) {
    lines.push("⚠️  HOTSPOT REGRESSIONS:");
    for (const { hotspot, reason } of comparison.regressions.hotspots) {
      lines.push(`  • ${hotspot.functionName} @ ${hotspot.file}:${hotspot.line}`);
      lines.push(`    ${reason}`);
    }
    lines.push("");
  }

  // Show top changed hotspots
  const significantChanges = comparison.diff
    .filter(h => Math.abs(h.selfTime) > 1)
    .sort((a, b) => Math.abs(b.selfTime) - Math.abs(a.selfTime))
    .slice(0, 10);

  if (significantChanges.length > 0) {
    lines.push("SIGNIFICANT CHANGES:");
    for (const h of significantChanges) {
      const change = h.selfTime > 0 ? "+" : "";
      lines.push(`  ${change}${h.selfTime.toFixed(1)}ms (${change}${h.selfTimePct.toFixed(1)}%) - ${h.functionName} @ ${h.file}:${h.line}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format profile comparison as JSON
 */
export function formatProfileComparisonJSON(comparison: ProfileComparison): string {
  const output = {
    summary: comparison.summary,
    durationDiffMs: comparison.durationDiffMs,
    durationDiffPercent: comparison.durationDiffPercent,
    hasRegression: comparison.regressions.duration === true || comparison.regressions.hotspots.length > 0,
    regressions: {
      duration: comparison.regressions.duration || false,
      hotspots: comparison.regressions.hotspots.map(({ hotspot, reason }) => ({
        functionName: hotspot.functionName,
        file: hotspot.file,
        line: hotspot.line,
        reason,
      })),
    },
    changes: comparison.diff
      .filter(h => Math.abs(h.selfTime) > 1)
      .sort((a, b) => Math.abs(b.selfTime) - Math.abs(a.selfTime))
      .slice(0, 20)
      .map(h => ({
        functionName: h.functionName,
        file: h.file,
        line: h.line,
        selfTimeDiffMs: h.selfTime,
        selfTimeDiffPct: h.selfTimePct,
      })),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Print hotspots to console (legacy compatibility)
 */
export function printHotspots(hotspots: HotspotInfo[], topN: number = 10): void {
  if (hotspots.length === 0) {
    console.log("    No user code hotspots found");
    return;
  }

  const displayHotspots = hotspots.slice(0, topN);
  console.log(`    Top ${displayHotspots.length} hotspots:`);
  for (let i = 0; i < displayHotspots.length; i++) {
    const hotspot = displayHotspots[i];
    const location = `${hotspot.file}:${hotspot.line}`;
    const rank = (i + 1).toString().padStart(2);
    console.log(
      `      ${rank}. ${hotspot.selfTime.toFixed(2)}ms (${hotspot.selfTimePct.toFixed(1)}%) - ${hotspot.functionName} @ ${location}`
    );
  }

  if (hotspots.length > topN) {
    console.log(`    ... and ${hotspots.length - topN} more`);
  }
}
