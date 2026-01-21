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
  
  // Calculate self time for each node
  const selfTime = new Map<number, number>();
  const totalTime = new Map<number, number>();
  
  // Build node map
  const nodeMap = new Map();
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
    selfTime.set(node.id, 0);
    totalTime.set(node.id, 0);
  }
  
  // Calculate time from samples
  let currentTime = profile.startTime;
  for (let i = 0; i < profile.samples.length; i++) {
    const sampleId = profile.samples[i];
    const delta = profile.timeDeltas[i] || 0;
    currentTime += delta;
    
    if (nodeMap.has(sampleId)) {
      totalTime.set(sampleId, (totalTime.get(sampleId) || 0) + delta);
    }
  }
  
  // Calculate self time (total - children)
  for (const node of profile.nodes) {
    let childrenTime = 0;
    if (node.children) {
      for (const childId of node.children) {
        childrenTime += totalTime.get(childId) || 0;
      }
    }
    const nodeTotal = totalTime.get(node.id) || 0;
    selfTime.set(node.id, Math.max(0, nodeTotal - childrenTime));
  }
  
  // Extract hotspots
  const duration = profile.endTime - profile.startTime;
  const hotspots: Hotspot[] = [];
  
  for (const node of profile.nodes) {
    const self = selfTime.get(node.id) || 0;
    const total = totalTime.get(node.id) || 0;
    
    if (self > 0) {
      const percentage = duration > 0 ? (self / duration) * 100 : 0;
      const functionName = node.callFrame.functionName || "(anonymous)";
      const url = node.callFrame.url || "";
      const line = node.callFrame.lineNumber || 0;
      
      // Filter out internal functions and node_modules
      const isInternal = functionName.startsWith("(") && functionName.endsWith(")");
      const isNodeModules = url.includes("node_modules") || url.includes("chunk-");
      
      if (!isInternal && !isNodeModules && url) {
        hotspots.push({
          functionName,
          url,
          line,
          selfTime: self / 1000, // Convert to ms
          totalTime: total / 1000,
          percentage,
        });
      }
    }
  }
  
  // Sort by self time and take top N
  hotspots.sort((a, b) => b.selfTime - a.selfTime);
  return hotspots.slice(0, topN);
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

export interface ProfileAssertion {
  type: "topHotspot" | "notInTopN" | "maxPercentage" | "maxSelfTime";
  functionName?: string;
  fileName?: string;
  position?: number; // For topHotspot: expected position (0-indexed)
  maxN?: number; // For notInTopN: ensure function is not in top N
  maxPercentage?: number; // For maxPercentage: maximum allowed percentage
  maxSelfTimeMs?: number; // For maxSelfTime: maximum allowed self time in ms
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

export function checkProfileAssertions(
  hotspots: Hotspot[],
  assertions: ProfileAssertion[],
): ProfileAssertionResult[] {
  const results: ProfileAssertionResult[] = [];
  
  for (const assertion of assertions) {
    let passed = false;
    let message = "";
    let actual: ProfileAssertionResult["actual"] = {};
    
    const hotspot = findHotspot(hotspots, assertion.functionName, assertion.fileName);
    
    switch (assertion.type) {
      case "topHotspot": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "topHotspot assertion requires functionName or fileName";
          break;
        }
        if (!hotspot) {
          passed = false;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile`;
          break;
        }
        const position = hotspots.indexOf(hotspot);
        actual.position = position;
        if (assertion.position !== undefined) {
          passed = position === assertion.position;
          message = passed
            ? `Function is at position ${position} as expected`
            : `Expected position ${assertion.position}, but found at position ${position}`;
        } else {
          // Default: check if it's in top 5
          passed = position < 5;
          message = passed
            ? `Function is in top 5 (position ${position})`
            : `Function is not in top 5 (position ${position})`;
        }
        break;
      }
      
      case "notInTopN": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "notInTopN assertion requires functionName or fileName";
          break;
        }
        const maxN = assertion.maxN ?? 5;
        if (!hotspot) {
          passed = true;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile (pass)`;
          break;
        }
        const position = hotspots.indexOf(hotspot);
        actual.position = position;
        passed = position >= maxN;
        message = passed
          ? `Function is not in top ${maxN} (position ${position})`
          : `Function is in top ${maxN} (position ${position})`;
        break;
      }
      
      case "maxPercentage": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "maxPercentage assertion requires functionName or fileName";
          break;
        }
        if (!hotspot) {
          passed = true;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile (pass)`;
          break;
        }
        actual.percentage = hotspot.percentage;
        if (assertion.maxPercentage === undefined) {
          message = "maxPercentage assertion requires maxPercentage value";
          break;
        }
        passed = hotspot.percentage <= assertion.maxPercentage;
        message = passed
          ? `Percentage ${hotspot.percentage.toFixed(1)}% is within limit ${assertion.maxPercentage}%`
          : `Percentage ${hotspot.percentage.toFixed(1)}% exceeds limit ${assertion.maxPercentage}%`;
        break;
      }
      
      case "maxSelfTime": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "maxSelfTime assertion requires functionName or fileName";
          break;
        }
        if (!hotspot) {
          passed = true;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile (pass)`;
          break;
        }
        actual.selfTimeMs = hotspot.selfTime;
        if (assertion.maxSelfTimeMs === undefined) {
          message = "maxSelfTime assertion requires maxSelfTimeMs value";
          break;
        }
        passed = hotspot.selfTime <= assertion.maxSelfTimeMs;
        message = passed
          ? `Self time ${hotspot.selfTime.toFixed(2)}ms is within limit ${assertion.maxSelfTimeMs}ms`
          : `Self time ${hotspot.selfTime.toFixed(2)}ms exceeds limit ${assertion.maxSelfTimeMs}ms`;
        break;
      }
    }
    
    results.push({ assertion, passed, message, actual });
  }
  
  return results;
}

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

export interface BaselineThreshold {
  maxDurationIncreaseMs?: number; // Fail if duration increased by more than this
  maxDurationIncreasePercent?: number; // Fail if duration increased by more than this %
  maxHotspotIncreaseMs?: number; // Fail if any hotspot increased by more than this
  maxHotspotIncreasePercent?: number; // Fail if any hotspot increased by more than this %
}

export function compareProfiles(
  current: any,
  baseline: any,
  threshold?: BaselineThreshold,
): ProfileComparison {
  const currentHotspots = extractHotspots(current, 20);
  const baselineHotspots = extractHotspots(baseline, 20);
  
  // Create maps for quick lookup
  const baselineMap = new Map<string, Hotspot>();
  for (const h of baselineHotspots) {
    const key = `${h.functionName}@${h.url}:${h.line}`;
    baselineMap.set(key, h);
  }
  
  const diff: Hotspot[] = [];
  const regressions: ProfileComparison["regressions"] = {
    hotspots: [],
  };
  
  for (const currentHotspot of currentHotspots) {
    const key = `${currentHotspot.functionName}@${currentHotspot.url}:${currentHotspot.line}`;
    const baselineHotspot = baselineMap.get(key);
    
    if (baselineHotspot) {
      // Compare - show if significantly different
      const timeDiff = currentHotspot.selfTime - baselineHotspot.selfTime;
      const pctDiff = currentHotspot.percentage - baselineHotspot.percentage;
      
      if (Math.abs(timeDiff) > 1 || Math.abs(pctDiff) > 0.5) {
        const diffHotspot: Hotspot = {
          ...currentHotspot,
          selfTime: timeDiff,
          totalTime: currentHotspot.totalTime - baselineHotspot.totalTime,
          percentage: pctDiff,
        };
        diff.push(diffHotspot);
        
        // Check for regressions
        if (threshold && timeDiff > 0) {
          const exceededTime = threshold.maxHotspotIncreaseMs && timeDiff > threshold.maxHotspotIncreaseMs;
          const exceededPct = threshold.maxHotspotIncreasePercent && 
            baselineHotspot.selfTime > 0 &&
            ((timeDiff / baselineHotspot.selfTime) * 100) > threshold.maxHotspotIncreasePercent;
          
          if (exceededTime || exceededPct) {
            const reasons: string[] = [];
            if (exceededTime) {
              reasons.push(`+${timeDiff.toFixed(2)}ms exceeds threshold of +${threshold.maxHotspotIncreaseMs}ms`);
            }
            if (exceededPct) {
              reasons.push(`+${((timeDiff / baselineHotspot.selfTime) * 100).toFixed(1)}% exceeds threshold of +${threshold.maxHotspotIncreasePercent}%`);
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
        selfTime: currentHotspot.selfTime,
        totalTime: currentHotspot.totalTime,
        percentage: currentHotspot.percentage,
      });
    }
  }
  
  // Check for removed hotspots (in baseline but not in current)
  const currentMap = new Map<string, Hotspot>();
  for (const h of currentHotspots) {
    const key = `${h.functionName}@${h.url}:${h.line}`;
    currentMap.set(key, h);
  }
  
  for (const baselineHotspot of baselineHotspots) {
    const key = `${baselineHotspot.functionName}@${baselineHotspot.url}:${baselineHotspot.line}`;
    if (!currentMap.has(key)) {
      // Hotspot removed - show as negative diff
      diff.push({
        ...baselineHotspot,
        selfTime: -baselineHotspot.selfTime,
        totalTime: -baselineHotspot.totalTime,
        percentage: -baselineHotspot.percentage,
      });
    }
  }
  
  const currentDuration = current.endTime - current.startTime;
  const baselineDuration = baseline.endTime - baseline.startTime;
  const durationDiffMs = (currentDuration - baselineDuration) / 1000;
  const durationDiffPercent = baselineDuration > 0 
    ? ((durationDiffMs / (baselineDuration / 1000)) * 100) 
    : 0;
  
  // Check duration regression
  if (threshold && durationDiffMs > 0) {
    const exceededTime = threshold.maxDurationIncreaseMs && durationDiffMs > threshold.maxDurationIncreaseMs;
    const exceededPct = threshold.maxDurationIncreasePercent && durationDiffPercent > threshold.maxDurationIncreasePercent;
    
    if (exceededTime || exceededPct) {
      regressions.duration = true;
    }
  }
  
  const summary = `Duration: ${durationDiffMs > 0 ? "+" : ""}${durationDiffMs.toFixed(2)}ms (${durationDiffPercent > 0 ? "+" : ""}${durationDiffPercent.toFixed(1)}%)`;
  
  return { diff, summary, durationDiffMs, durationDiffPercent, regressions };
}
