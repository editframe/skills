/**
 * Core CPU profile analysis
 * Consolidated from profile-utils.ts and ef-utils/profile.ts
 */

import type {
  CPUProfile,
  ProfileNode,
  HotspotInfo,
  CallTreeNode,
  ProfileAnalysis,
  AnalyzeOptions,
} from "./types.js";

/**
 * Get a node by ID from the profile
 */
export function getNodeById(
  profile: CPUProfile,
  id: number,
): ProfileNode | undefined {
  return profile.nodes.find((node) => node.id === id);
}

/**
 * Calculate total time spent in each node (including children)
 */
export function calculateTotalTime(profile: CPUProfile): Map<number, number> {
  const nodeMap = new Map<number, ProfileNode>();
  const totalTime = new Map<number, number>();

  // Build node map
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
    totalTime.set(node.id, 0);
  }

  // Calculate time deltas
  let currentTime: number = profile.startTime;
  const timeDeltas = profile.timeDeltas || [];
  for (let i = 0; i < profile.samples.length; i++) {
    const sample: number = profile.samples[i] ?? 0;
    const delta: number = timeDeltas[i] ?? 0;
    currentTime = currentTime + delta;

    if (nodeMap.has(sample)) {
      const existingTime = totalTime.get(sample) ?? 0;
      totalTime.set(sample, existingTime + delta);
    }
  }

  return totalTime;
}

/**
 * Calculate self time for each node (excluding children)
 */
export function calculateSelfTime(profile: CPUProfile): Map<number, number> {
  const totalTime = calculateTotalTime(profile);
  const selfTime = new Map<number, number>();

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

  return selfTime;
}

/**
 * Calculate how many times each function was called (appears in call stack)
 */
export function calculateCallCounts(profile: CPUProfile): Map<number, number> {
  const callCounts = new Map<number, number>();

  // Build parent map for traversing call stacks
  const parentMap = new Map<number, number>();
  for (const node of profile.nodes) {
    if (node.children) {
      for (const childId of node.children) {
        parentMap.set(childId, node.id);
      }
    }
  }

  // For each sample, traverse up the call stack and count each node
  const processedSamples = new Set<string>();

  for (let i = 0; i < profile.samples.length; i++) {
    const sampleId = profile.samples[i];
    if (sampleId === undefined) continue;

    // Create unique key for this sample to avoid double-counting
    const sampleKey = `${i}-${sampleId}`;
    if (processedSamples.has(sampleKey)) continue;
    processedSamples.add(sampleKey);

    // Traverse up the call stack
    const visited = new Set<number>();
    let currentId: number | undefined = sampleId;

    while (currentId !== undefined && !visited.has(currentId)) {
      visited.add(currentId);
      callCounts.set(currentId, (callCounts.get(currentId) || 0) + 1);
      currentId = parentMap.get(currentId);
    }
  }

  return callCounts;
}

/**
 * Extract hotspots from profile, sorted by self time
 */
export function getHotspots(
  profile: CPUProfile,
  options: AnalyzeOptions = {},
): HotspotInfo[] {
  const { filterNodeModules = false, filterInternals = false, topN } = options;

  const selfTime = calculateSelfTime(profile);
  const totalTime = calculateTotalTime(profile);
  const callCounts = calculateCallCounts(profile);
  const hotspots: HotspotInfo[] = [];
  const duration = profile.endTime - profile.startTime;

  for (const node of profile.nodes) {
    const self = selfTime.get(node.id) || 0;
    const total = totalTime.get(node.id) || 0;
    if (self > 0 || total > 0) {
      const functionName = node.callFrame.functionName || "(anonymous)";
      const url = node.callFrame.url || "";
      const file = url.split("/").pop()?.split("?")[0] || url || "(native)";

      // Apply filters
      const isInternal =
        functionName.startsWith("(") && functionName.endsWith(")");
      const isNodeModules =
        url.includes("node_modules") || url.includes("chunk-");

      if (filterInternals && isInternal) continue;
      if (filterNodeModules && isNodeModules) continue;

      hotspots.push({
        functionName,
        url,
        file,
        line: node.callFrame.lineNumber + 1,
        column: node.callFrame.columnNumber + 1,
        selfTime: self / 1000, // Convert to ms
        totalTime: total / 1000,
        selfTimePct: duration > 0 ? (self / duration) * 100 : 0,
        hitCount: node.hitCount || 0,
        callCount: callCounts.get(node.id) || 0,
      });
    }
  }

  // Sort by self time descending
  hotspots.sort((a, b) => b.selfTime - a.selfTime);

  return topN ? hotspots.slice(0, topN) : hotspots;
}

/**
 * Build call tree from profile
 */
export function buildCallTree(profile: CPUProfile): CallTreeNode[] {
  const selfTime = calculateSelfTime(profile);
  const totalTime = calculateTotalTime(profile);
  const nodeMap = new Map<number, ProfileNode>();
  const treeNodes = new Map<number, CallTreeNode>();

  // Build node map
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
  }

  // Build tree nodes
  for (const node of profile.nodes) {
    treeNodes.set(node.id, {
      node,
      selfTime: selfTime.get(node.id) || 0,
      totalTime: totalTime.get(node.id) || 0,
      children: [],
    });
  }

  // Build parent-child relationships
  for (const node of profile.nodes) {
    const treeNode = treeNodes.get(node.id)!;
    if (node.children && node.children.length > 0) {
      for (const childId of node.children) {
        const childNode = treeNodes.get(childId);
        if (childNode) {
          treeNode.children.push(childNode);
        }
      }
    }
  }

  // Find root nodes (nodes with no parents)
  const roots: CallTreeNode[] = [];
  const childIds = new Set<number>();
  for (const node of profile.nodes) {
    if (node.children) {
      for (const childId of node.children) {
        childIds.add(childId);
      }
    }
  }

  for (const node of profile.nodes) {
    if (!childIds.has(node.id)) {
      const treeNode = treeNodes.get(node.id);
      if (treeNode) {
        roots.push(treeNode);
      }
    }
  }

  return roots;
}

/**
 * Get call stack for a specific sample
 */
export function getCallStack(
  profile: CPUProfile,
  sampleIndex: number,
): ProfileNode[] {
  const stack: ProfileNode[] = [];
  const sampleId = profile.samples[sampleIndex];
  if (sampleId === undefined) {
    return stack;
  }

  // Build parent map
  const parentMap = new Map<number, number>();
  for (const node of profile.nodes) {
    if (node.children) {
      for (const childId of node.children) {
        parentMap.set(childId, node.id);
      }
    }
  }

  // Build node map
  const nodeMap = new Map<number, ProfileNode>();
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
  }

  // Traverse up the tree
  const visited = new Set<number>();
  let currentId: number | undefined = sampleId;

  while (currentId !== undefined && !visited.has(currentId)) {
    visited.add(currentId);
    const node = nodeMap.get(currentId);
    if (!node) break;

    stack.push(node);
    currentId = parentMap.get(currentId);
  }

  return stack.reverse(); // Reverse to get top-to-bottom call stack
}

/**
 * Get time range information
 */
export function getTimeRange(profile: CPUProfile): {
  start: number;
  end: number;
  duration: number;
} {
  return {
    start: profile.startTime,
    end: profile.endTime,
    duration: profile.endTime - profile.startTime,
  };
}

/**
 * Calculate time aggregated by file
 */
export function aggregateByFile(hotspots: HotspotInfo[]): Map<string, number> {
  const byFile = new Map<string, number>();

  for (const hotspot of hotspots) {
    const existing = byFile.get(hotspot.file) || 0;
    byFile.set(hotspot.file, existing + hotspot.selfTime);
  }

  return byFile;
}

/**
 * Find a specific hotspot by function name and/or file name
 */
export function findHotspot(
  hotspots: HotspotInfo[],
  functionName?: string,
  fileName?: string,
): HotspotInfo | null {
  if (!functionName && !fileName) return null;

  return (
    hotspots.find((h) => {
      const nameMatch = !functionName || h.functionName === functionName;
      const fileMatch =
        !fileName || h.file === fileName || h.url.includes(fileName);
      return nameMatch && fileMatch;
    }) || null
  );
}

/**
 * Comprehensive profile analysis
 */
export function analyzeProfile(
  profile: CPUProfile,
  options: AnalyzeOptions = {},
): ProfileAnalysis {
  const hotspots = getHotspots(profile, options);
  const timeRange = getTimeRange(profile);
  const byFile = aggregateByFile(hotspots);

  const sampleIntervalUs =
    profile.timeDeltas.length > 0
      ? profile.timeDeltas.reduce((a, b) => a + b, 0) /
        profile.timeDeltas.length
      : 1000;

  return {
    profile,
    duration: timeRange.duration / 1000, // Convert to ms
    samples: profile.samples.length,
    sampleIntervalUs,
    hotspots,
    byFile,
    totalTimeMs: (profile.samples.length * sampleIntervalUs) / 1000,
  };
}
