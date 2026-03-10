/**
 * Profile comparison and regression detection
 */

import type {
  ProfileAnalysis,
  ProfileComparison,
  BaselineThreshold,
  HotspotInfo,
} from "./types.js";

/**
 * Compare two profile analyses
 */
export function compareProfiles(
  current: ProfileAnalysis,
  baseline: ProfileAnalysis,
  threshold?: BaselineThreshold,
): ProfileComparison {
  // Create maps for quick lookup
  const baselineMap = new Map<string, HotspotInfo>();
  for (const h of baseline.hotspots) {
    const key = `${h.functionName}@${h.url}:${h.line}`;
    baselineMap.set(key, h);
  }

  const diff: HotspotInfo[] = [];
  const regressions: ProfileComparison["regressions"] = {
    hotspots: [],
  };

  // Compare current hotspots against baseline
  for (const currentHotspot of current.hotspots) {
    const key = `${currentHotspot.functionName}@${currentHotspot.url}:${currentHotspot.line}`;
    const baselineHotspot = baselineMap.get(key);

    if (baselineHotspot) {
      // Compare - show if significantly different
      const timeDiff = currentHotspot.selfTime - baselineHotspot.selfTime;
      const pctDiff = currentHotspot.selfTimePct - baselineHotspot.selfTimePct;

      if (Math.abs(timeDiff) > 1 || Math.abs(pctDiff) > 0.5) {
        const diffHotspot: HotspotInfo = {
          ...currentHotspot,
          selfTime: timeDiff,
          totalTime: currentHotspot.totalTime - baselineHotspot.totalTime,
          selfTimePct: pctDiff,
        };
        diff.push(diffHotspot);

        // Check for regressions
        if (threshold && timeDiff > 0) {
          const exceededTime =
            threshold.maxHotspotIncreaseMs && timeDiff > threshold.maxHotspotIncreaseMs;
          const exceededPct =
            threshold.maxHotspotIncreasePercent &&
            baselineHotspot.selfTime > 0 &&
            (timeDiff / baselineHotspot.selfTime) * 100 > threshold.maxHotspotIncreasePercent;

          if (exceededTime || exceededPct) {
            const reasons: string[] = [];
            if (exceededTime) {
              reasons.push(
                `+${timeDiff.toFixed(2)}ms exceeds threshold of +${threshold.maxHotspotIncreaseMs}ms`,
              );
            }
            if (exceededPct) {
              reasons.push(
                `+${((timeDiff / baselineHotspot.selfTime) * 100).toFixed(1)}% exceeds threshold of +${threshold.maxHotspotIncreasePercent}%`,
              );
            }
            regressions.hotspots.push({
              hotspot: diffHotspot,
              reason: reasons.join(", "),
            });
          }
        }
      }
    } else {
      // New hotspot not in baseline
      diff.push({
        ...currentHotspot,
      });
    }
  }

  // Check for removed hotspots (in baseline but not in current)
  const currentMap = new Map<string, HotspotInfo>();
  for (const h of current.hotspots) {
    const key = `${h.functionName}@${h.url}:${h.line}`;
    currentMap.set(key, h);
  }

  for (const baselineHotspot of baseline.hotspots) {
    const key = `${baselineHotspot.functionName}@${baselineHotspot.url}:${baselineHotspot.line}`;
    if (!currentMap.has(key)) {
      // Hotspot removed - show as negative diff
      diff.push({
        ...baselineHotspot,
        selfTime: -baselineHotspot.selfTime,
        totalTime: -baselineHotspot.totalTime,
        selfTimePct: -baselineHotspot.selfTimePct,
      });
    }
  }

  const durationDiffMs = current.duration - baseline.duration;
  const durationDiffPercent =
    baseline.duration > 0 ? (durationDiffMs / baseline.duration) * 100 : 0;

  // Check duration regression
  if (threshold && durationDiffMs > 0) {
    const exceededTime =
      threshold.maxDurationIncreaseMs && durationDiffMs > threshold.maxDurationIncreaseMs;
    const exceededPct =
      threshold.maxDurationIncreasePercent &&
      durationDiffPercent > threshold.maxDurationIncreasePercent;

    if (exceededTime || exceededPct) {
      regressions.duration = true;
    }
  }

  const summary = `Duration: ${durationDiffMs > 0 ? "+" : ""}${durationDiffMs.toFixed(2)}ms (${durationDiffPercent > 0 ? "+" : ""}${durationDiffPercent.toFixed(1)}%)`;

  return {
    current,
    baseline,
    diff,
    summary,
    durationDiffMs,
    durationDiffPercent,
    regressions,
  };
}

/**
 * Check if a comparison shows regression
 */
export function hasRegression(comparison: ProfileComparison): boolean {
  return comparison.regressions.duration === true || comparison.regressions.hotspots.length > 0;
}

/**
 * Get regression summary
 */
export function getRegressionSummary(comparison: ProfileComparison): string[] {
  const messages: string[] = [];

  if (comparison.regressions.duration) {
    messages.push(
      `Duration increased by ${comparison.durationDiffMs.toFixed(2)}ms (${comparison.durationDiffPercent.toFixed(1)}%)`,
    );
  }

  for (const { hotspot, reason } of comparison.regressions.hotspots) {
    messages.push(`${hotspot.functionName} @ ${hotspot.file}:${hotspot.line} - ${reason}`);
  }

  return messages;
}
