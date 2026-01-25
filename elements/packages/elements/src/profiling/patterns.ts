/**
 * Pattern detection for common performance anti-patterns
 * Helps LLMs identify specific optimization opportunities
 */

import type { HotspotInfo, ProfileAnalysis } from "./types.js";

export interface Pattern {
  name: string;
  description: string;
  severity: "high" | "medium" | "low";
  hotspots: HotspotInfo[];
  suggestion: string;
}

/**
 * Detect potential performance anti-patterns in profile
 */
export function detectPatterns(analysis: ProfileAnalysis): Pattern[] {
  const patterns: Pattern[] = [];

  // Pattern 1: Excessive DOM manipulation
  const domManipulation = analysis.hotspots.filter(h =>
    h.functionName.match(/appendChild|removeChild|insertBefore|replaceChild/i) &&
    h.selfTimePct > 5
  );
  if (domManipulation.length > 0) {
    const totalPct = domManipulation.reduce((sum, h) => sum + h.selfTimePct, 0);
    patterns.push({
      name: "Excessive DOM Manipulation",
      description: `DOM operations (appendChild, removeChild, etc.) account for ${totalPct.toFixed(1)}%`,
      severity: totalPct > 15 ? "high" : "medium",
      hotspots: domManipulation,
      suggestion: "Consider batching DOM updates, using DocumentFragment, or reusing elements instead of creating/destroying",
    });
  }

  // Pattern 2: Layout thrashing (reading layout properties)
  const layoutReads = analysis.hotspots.filter(h =>
    h.functionName.match(/getBoundingClientRect|offsetWidth|offsetHeight|offsetTop|offsetLeft|scrollTop|scrollLeft|clientWidth|clientHeight/i) &&
    h.callCount &&
    h.callCount > 50
  );
  if (layoutReads.length > 0) {
    patterns.push({
      name: "Potential Layout Thrashing",
      description: `Layout property reads called frequently (${layoutReads[0]?.callCount} times)`,
      severity: "high",
      hotspots: layoutReads,
      suggestion: "Cache layout measurements and batch reads before writes to avoid forced reflow",
    });
  }

  // Pattern 3: Inefficient loops (high hit count, moderate time)
  const tightLoops = analysis.hotspots.filter(h =>
    h.hitCount > 200 &&
    h.selfTimePct > 5 &&
    h.selfTimePct < 30
  );
  if (tightLoops.length > 0) {
    patterns.push({
      name: "Hot Loop Detected",
      description: `Function sampled ${tightLoops[0]?.hitCount} times, indicating tight loop`,
      severity: "medium",
      hotspots: tightLoops,
      suggestion: "Review loop logic - consider reducing iterations, early exit, or moving work outside loop",
    });
  }

  // Pattern 4: Frequent function calls with low individual cost
  const frequentCalls = analysis.hotspots.filter(h =>
    h.callCount &&
    h.callCount > 100 &&
    h.selfTime < 1 && // Each call is fast
    h.selfTimePct > 8  // But cumulative cost is significant
  );
  if (frequentCalls.length > 0) {
    patterns.push({
      name: "Death by a Thousand Cuts",
      description: `Function called ${frequentCalls[0]?.callCount} times with small individual cost`,
      severity: "medium",
      hotspots: frequentCalls,
      suggestion: "Consider reducing call frequency through memoization, caching, or debouncing",
    });
  }

  // Pattern 5: JSON parsing/stringifying
  const jsonOperations = analysis.hotspots.filter(h =>
    h.functionName.match(/JSON\.parse|JSON\.stringify/i) &&
    h.selfTimePct > 3
  );
  if (jsonOperations.length > 0) {
    patterns.push({
      name: "Heavy JSON Operations",
      description: `JSON parsing/stringifying accounts for ${jsonOperations.reduce((s, h) => s + h.selfTimePct, 0).toFixed(1)}%`,
      severity: "medium",
      hotspots: jsonOperations,
      suggestion: "Consider using structured cloning, immutable data structures, or reducing serialization",
    });
  }

  // Pattern 6: Style computation
  const styleComputation = analysis.hotspots.filter(h =>
    h.functionName.match(/getComputedStyle|getPropertyValue|computedStyleMap/i) &&
    h.callCount &&
    h.callCount > 20
  );
  if (styleComputation.length > 0) {
    patterns.push({
      name: "Frequent Style Computation",
      description: `Style properties read ${styleComputation[0]?.callCount} times`,
      severity: "medium",
      hotspots: styleComputation,
      suggestion: "Cache computed styles or use CSS custom properties for dynamic values",
    });
  }

  // Pattern 7: Animation-related APIs
  const animationAPIs = analysis.hotspots.filter(h =>
    h.functionName.match(/getAnimations|requestAnimationFrame|cancelAnimationFrame/i) &&
    h.selfTimePct > 5
  );
  if (animationAPIs.length > 0) {
    patterns.push({
      name: "Animation API Overhead",
      description: `Animation APIs account for ${animationAPIs.reduce((s, h) => s + h.selfTimePct, 0).toFixed(1)}%`,
      severity: "medium",
      hotspots: animationAPIs,
      suggestion: "Cache animation objects or use Web Animations API more efficiently",
    });
  }

  // Pattern 8: File-level concentration (one file dominates)
  for (const [file, timeMs] of Array.from(analysis.byFile.entries()).slice(0, 3)) {
    const pct = (timeMs / analysis.totalTimeMs) * 100;
    if (pct > 40) {
      const fileHotspots = analysis.hotspots.filter(h => h.file === file);
      patterns.push({
        name: "File-Level Performance Issue",
        description: `${file} accounts for ${pct.toFixed(1)}% of total time`,
        severity: pct > 60 ? "high" : "medium",
        hotspots: fileHotspots.slice(0, 5),
        suggestion: `Review ${file} holistically - multiple functions contribute to high cost`,
      });
    }
  }

  // Sort by severity and percentage
  patterns.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    const aPct = a.hotspots.reduce((sum, h) => sum + h.selfTimePct, 0);
    const bPct = b.hotspots.reduce((sum, h) => sum + h.selfTimePct, 0);
    return bPct - aPct;
  });

  return patterns;
}

/**
 * Format patterns for console output
 */
export function formatPatterns(patterns: Pattern[]): string {
  if (patterns.length === 0) {
    return "No performance anti-patterns detected";
  }

  const lines: string[] = ["DETECTED PATTERNS:"];

  for (const pattern of patterns) {
    const icon = pattern.severity === "high" ? "🔴" : pattern.severity === "medium" ? "🟡" : "🟢";
    lines.push("");
    lines.push(`${icon} ${pattern.name}`);
    lines.push(`   ${pattern.description}`);
    lines.push(`   → ${pattern.suggestion}`);
    
    if (pattern.hotspots.length > 0) {
      const top = pattern.hotspots.slice(0, 2);
      for (const h of top) {
        lines.push(`   • ${h.functionName} @ ${h.file}:${h.line} (${h.selfTimePct.toFixed(1)}%)`);
      }
      if (pattern.hotspots.length > 2) {
        lines.push(`   ... and ${pattern.hotspots.length - 2} more`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Format patterns for JSON output
 */
export function formatPatternsJSON(patterns: Pattern[]): any[] {
  return patterns.map(p => ({
    name: p.name,
    description: p.description,
    severity: p.severity,
    suggestion: p.suggestion,
    hotspots: p.hotspots.map(h => ({
      functionName: h.functionName,
      file: h.file,
      line: h.line,
      selfTimePct: h.selfTimePct,
      callCount: h.callCount,
    })),
  }));
}
