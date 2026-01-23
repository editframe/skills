import type { CPUProfile, ProfileNode, HotspotInfo } from "./types.js";

export function getNodeById(profile: CPUProfile, id: number): ProfileNode | undefined {
  return profile.nodes.find((node) => node.id === id);
}

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

// Simple source map resolution - tries to extract original source from URL
function resolveSourceLocation(url: string, line: number, column: number): { url: string; line: number; column: number } {
  // If URL contains source map comment or has .map in query params, try to parse it
  // For Vite dev server, the source should already be in the URL
  
  // Check if this is a Vite chunk file with source map
  if (url.includes('chunk-') && url.includes('?v=')) {
    // Vite includes source maps inline or as separate files
    // The browser should have already resolved these, but if not, we can try to extract from stack traces
    // For now, we'll just clean up the URL to make it more readable
    const cleanUrl = url.replace(/\?v=[a-f0-9]+/, '').replace(/^.*\//, '');
    return { url: cleanUrl, line, column };
  }
  
  // For regular source files, return as-is
  return { url, line, column };
}

export function getHotspots(profile: CPUProfile): HotspotInfo[] {
  const selfTime = calculateSelfTime(profile);
  const totalTime = calculateTotalTime(profile);
  const hotspots: HotspotInfo[] = [];

  for (const node of profile.nodes) {
    const self = selfTime.get(node.id) || 0;
    const total = totalTime.get(node.id) || 0;
    if (self > 0 || total > 0) {
      // Try to resolve source location
      const resolved = resolveSourceLocation(
        node.callFrame.url,
        node.callFrame.lineNumber,
        node.callFrame.columnNumber
      );
      
      hotspots.push({
        functionName: node.callFrame.functionName || "(anonymous)",
        url: resolved.url,
        line: resolved.line,
        column: resolved.column,
        selfTime: self,
        totalTime: total,
        hitCount: node.hitCount || 0,
      });
    }
  }

  // Sort by self time descending
  hotspots.sort((a, b) => b.selfTime - a.selfTime);

  return hotspots;
}

export interface CallTreeNode {
  node: ProfileNode;
  selfTime: number;
  totalTime: number;
  children: CallTreeNode[];
}

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
  const roots: CallTreeNode[] = [];
  for (const node of profile.nodes) {
    const treeNode = treeNodes.get(node.id)!;
    if (node.children && node.children.length > 0) {
      for (const childId of node.children) {
        const childNode = treeNodes.get(childId);
        if (childNode) {
          treeNode.children.push(childNode);
        }
      }
    } else {
      // Leaf node - could be a root if not referenced elsewhere
      // For now, we'll build roots from samples
    }
  }

  // Build roots from samples (top-level calls)
  const sampleSet = new Set(profile.samples);
  for (const sampleId of sampleSet) {
    const treeNode = treeNodes.get(sampleId);
    if (treeNode && !roots.includes(treeNode)) {
      // Check if this is actually a root (not a child of another node)
      let isRoot = true;
      for (const node of profile.nodes) {
        if (node.children && node.children.includes(sampleId)) {
          isRoot = false;
          break;
        }
      }
      if (isRoot) {
        roots.push(treeNode);
      }
    }
  }

  // If no roots found, use nodes with no parents
  if (roots.length === 0) {
    for (const node of profile.nodes) {
      let hasParent = false;
      for (const otherNode of profile.nodes) {
        if (otherNode.children && otherNode.children.includes(node.id)) {
          hasParent = true;
          break;
        }
      }
      if (!hasParent) {
        const treeNode = treeNodes.get(node.id)!;
        roots.push(treeNode);
      }
    }
  }

  return roots;
}

export function getTimeRange(profile: CPUProfile): { start: number; end: number; duration: number } {
  return {
    start: profile.startTime,
    end: profile.endTime,
    duration: profile.endTime - profile.startTime,
  };
}

export function getCallStack(profile: CPUProfile, sampleIndex: number): ProfileNode[] {
  const stack: ProfileNode[] = [];
  const sampleId = profile.samples[sampleIndex];
  if (sampleId === undefined) {
    return stack;
  }

  // Build stack by traversing up the tree
  const nodeMap = new Map<number, ProfileNode>();
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
  }

  const visited = new Set<number>();
  function traverse(nodeId: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    stack.push(node);

    // Find parent nodes
    for (const otherNode of profile.nodes) {
      if (otherNode.children && otherNode.children.includes(nodeId)) {
        traverse(otherNode.id);
        break;
      }
    }
  }

  traverse(sampleId);
  return stack.reverse(); // Reverse to get top-to-bottom call stack
}
