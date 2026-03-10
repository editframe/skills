#!/usr/bin/env npx ts-node
/**
 * Analyze an existing .cpuprofile file with enhanced function-level analysis
 *
 * Usage:
 *   npx tsx scripts/analyze-profile.ts <cpuprofile-file>
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";

interface ProfileNode {
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
}

interface CPUProfile {
  nodes: ProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

class SourceMapResolver {
  private traceMaps = new Map<string, TraceMap | null>();
  private fetchCache = new Map<string, Promise<string | null>>();

  private async fetchText(url: string): Promise<string | null> {
    if (this.fetchCache.has(url)) return this.fetchCache.get(url)!;
    const promise = (async () => {
      try {
        const response = await fetch(url);
        return response.ok ? await response.text() : null;
      } catch {
        return null;
      }
    })();
    this.fetchCache.set(url, promise);
    return promise;
  }

  async getTraceMap(scriptUrl: string): Promise<TraceMap | null> {
    if (this.traceMaps.has(scriptUrl)) return this.traceMaps.get(scriptUrl)!;

    const scriptContent = await this.fetchText(scriptUrl);
    if (!scriptContent) {
      this.traceMaps.set(scriptUrl, null);
      return null;
    }

    const match = scriptContent.match(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/);
    if (!match) {
      this.traceMaps.set(scriptUrl, null);
      return null;
    }

    let sourceMapUrl = match[1];
    if (!sourceMapUrl.startsWith("http") && !sourceMapUrl.startsWith("data:")) {
      sourceMapUrl = scriptUrl.substring(0, scriptUrl.lastIndexOf("/") + 1) + sourceMapUrl;
    }

    let sourceMapJson: string | null;
    if (sourceMapUrl.startsWith("data:")) {
      const dataMatch = sourceMapUrl.match(/^data:[^,]*base64,(.*)$/);
      sourceMapJson = dataMatch ? Buffer.from(dataMatch[1], "base64").toString("utf-8") : null;
    } else {
      sourceMapJson = await this.fetchText(sourceMapUrl);
    }

    if (!sourceMapJson) {
      this.traceMaps.set(scriptUrl, null);
      return null;
    }

    try {
      const traceMap = new TraceMap(sourceMapJson);
      this.traceMaps.set(scriptUrl, traceMap);
      return traceMap;
    } catch {
      this.traceMaps.set(scriptUrl, null);
      return null;
    }
  }

  async resolve(scriptUrl: string, line0Based: number, column: number) {
    const traceMap = await this.getTraceMap(scriptUrl);
    if (!traceMap || line0Based < 0) return null;
    try {
      const result = originalPositionFor(traceMap, {
        line: line0Based,
        column,
      });
      if (!result.source) return null;
      return {
        source: result.source.split("/").pop() || result.source,
        line: result.line ?? line0Based + 1,
      };
    } catch {
      return null;
    }
  }
}

async function analyzeProfile(profile: CPUProfile, sourceMapResolver: SourceMapResolver) {
  // Calculate self time (hit counts)
  const selfCounts = new Map<number, number>();
  for (const sample of profile.samples) {
    selfCounts.set(sample, (selfCounts.get(sample) || 0) + 1);
  }

  // Calculate total time by building parent map
  const nodeMap = new Map<number, ProfileNode>();
  const nodeParents = new Map<number, Set<number>>();
  const nodeChildren = new Map<number, Set<number>>();

  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
    if (node.children) {
      nodeChildren.set(node.id, new Set(node.children));
      for (const childId of node.children) {
        if (!nodeParents.has(childId)) nodeParents.set(childId, new Set());
        nodeParents.get(childId)!.add(node.id);
      }
    }
  }

  // For each sample, attribute it to the sampled node AND all ancestors
  const totalCounts = new Map<number, number>();

  for (const sampleNodeId of profile.samples) {
    const visited = new Set<number>();
    const stack = [sampleNodeId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      totalCounts.set(nodeId, (totalCounts.get(nodeId) || 0) + 1);

      // Add all parents to stack
      const parents = nodeParents.get(nodeId);
      if (parents) {
        for (const parentId of parents) {
          stack.push(parentId);
        }
      }
    }
  }

  const sampleIntervalUs =
    profile.timeDeltas.length > 0
      ? profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.timeDeltas.length
      : 1000;
  const totalSamples = profile.samples.length;
  const profileTimeMs = (totalSamples * sampleIntervalUs) / 1000;

  // Resolve source maps
  console.log(`\n🔍 Resolving source maps...`);
  const resolvedLocations = new Map<number, { source: string; line: number } | null>();
  let resolvedCount = 0;

  for (const node of profile.nodes) {
    if (node.callFrame.url?.startsWith("http")) {
      const resolved = await sourceMapResolver.resolve(
        node.callFrame.url.split("?")[0],
        node.callFrame.lineNumber,
        node.callFrame.columnNumber,
      );
      resolvedLocations.set(node.id, resolved);
      if (resolved) resolvedCount++;
    }
  }

  console.log(`   Resolved ${resolvedCount} locations from source maps`);

  interface Hotspot {
    nodeId: number;
    functionName: string;
    file: string;
    line: number;
    selfTimeMs: number;
    selfTimePct: number;
    totalTimeMs: number;
    totalTimePct: number;
    selfSamples: number;
    totalSamples: number;
  }
  const hotspots: Hotspot[] = [];

  for (const node of profile.nodes) {
    const selfCount = selfCounts.get(node.id) || 0;
    const totalCount = totalCounts.get(node.id) || 0;
    if (totalCount === 0) continue;

    const selfTimeMs = (selfCount * sampleIntervalUs) / 1000;
    const totalTimeMs = (totalCount * sampleIntervalUs) / 1000;
    const resolved = resolvedLocations.get(node.id);

    hotspots.push({
      nodeId: node.id,
      functionName: node.callFrame.functionName || "(anonymous)",
      file:
        resolved?.source ||
        node.callFrame.url?.split("/").slice(-1)[0]?.split("?")[0] ||
        "(native)",
      line: resolved?.line ?? node.callFrame.lineNumber + 1,
      selfTimeMs,
      selfTimePct: (selfCount / totalSamples) * 100,
      totalTimeMs,
      totalTimePct: (totalCount / totalSamples) * 100,
      selfSamples: selfCount,
      totalSamples: totalCount,
    });
  }

  return {
    profileTimeMs,
    totalSamples,
    sampleIntervalUs,
    hotspots,
    nodeParents,
    nodeChildren,
    totalCounts,
  };
}

function printAnalysis(analysis: any) {
  const { profileTimeMs, totalSamples, sampleIntervalUs, hotspots } = analysis;

  console.log(`\n${"=".repeat(100)}`);
  console.log(`PERFORMANCE ANALYSIS`);
  console.log(`  Profile Time: ${profileTimeMs.toFixed(1)}ms`);
  console.log(`  Total Samples: ${totalSamples.toLocaleString()}`);
  console.log(
    `  Sampling Interval: ${sampleIntervalUs}μs (${(sampleIntervalUs / 1000).toFixed(1)}ms)`,
  );
  console.log(`${"=".repeat(100)}`);

  // By file analysis
  const byFileSelf = new Map<string, number>();
  const byFileTotal = new Map<string, number>();
  const byFileSamples = new Map<string, number>();
  for (const h of hotspots) {
    byFileSelf.set(h.file, (byFileSelf.get(h.file) || 0) + h.selfTimeMs);
    byFileTotal.set(h.file, (byFileTotal.get(h.file) || 0) + h.totalTimeMs);
    byFileSamples.set(h.file, (byFileSamples.get(h.file) || 0) + h.selfSamples);
  }

  console.log(`\n┌─ TOP 20 FILES BY SELF TIME (time spent in file code itself) ─────────────┐`);
  console.log(`│ Rank │  Self Time │  Self % │ Samples │ File                              │`);
  console.log(`├──────┼────────────┼─────────┼─────────┼───────────────────────────────────┤`);
  const topFilesBySelf = Array.from(byFileSelf.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  topFilesBySelf.forEach(([file, time], idx) => {
    const pct = ((time / profileTimeMs) * 100).toFixed(1);
    const samples = byFileSamples.get(file) || 0;
    const rank = (idx + 1).toString().padStart(4);
    const timeStr = `${time.toFixed(1)}ms`.padStart(10);
    const pctStr = `${pct}%`.padStart(7);
    const samplesStr = samples.toString().padStart(7);
    const fileName = file.length > 35 ? "..." + file.slice(-32) : file.padEnd(35);
    console.log(`│ ${rank} │ ${timeStr} │ ${pctStr} │ ${samplesStr} │ ${fileName} │`);
  });
  console.log(`└──────┴────────────┴─────────┴─────────┴───────────────────────────────────┘`);

  // Filter to our code
  const ourCode = hotspots.filter(
    (h: any) =>
      (h.file.endsWith(".ts") || h.file.endsWith(".tsx")) &&
      !h.file.includes("node_modules") &&
      h.file !== "(native)",
  );

  if (ourCode.length > 0) {
    console.log(`\n┌─ TOP 20 FUNCTIONS BY SELF TIME (time in function itself) ─────────────────┐`);
    console.log(`│ Rank │  Self Time │  Self % │ Samples │ Function @ Location                │`);
    console.log(`├──────┼────────────┼─────────┼─────────┼────────────────────────────────────┤`);
    const bySelf = [...ourCode].sort((a, b) => b.selfTimeMs - a.selfTimeMs).slice(0, 20);
    bySelf.forEach((h, idx) => {
      const rank = (idx + 1).toString().padStart(4);
      const timeStr = `${h.selfTimeMs.toFixed(1)}ms`.padStart(10);
      const pctStr = `${h.selfTimePct.toFixed(1)}%`.padStart(7);
      const samplesStr = h.selfSamples.toString().padStart(7);
      const location = `${h.functionName} @ ${h.file}:${h.line}`;
      const locationStr =
        location.length > 40 ? location.slice(0, 37) + "..." : location.padEnd(40);
      console.log(`│ ${rank} │ ${timeStr} │ ${pctStr} │ ${samplesStr} │ ${locationStr} │`);
    });
    console.log(`└──────┴────────────┴─────────┴─────────┴────────────────────────────────────┘`);

    console.log(`\n┌─ TOP 20 FUNCTIONS BY TOTAL TIME (including callees) ──────────────────────┐`);
    console.log(`│ Rank │ Total Time │ Total % │ Self Time │ Function @ Location               │`);
    console.log(`├──────┼────────────┼─────────┼───────────┼───────────────────────────────────┤`);
    const byTotal = [...ourCode].sort((a, b) => b.totalTimeMs - a.totalTimeMs).slice(0, 20);
    byTotal.forEach((h, idx) => {
      const rank = (idx + 1).toString().padStart(4);
      const totalStr = `${h.totalTimeMs.toFixed(1)}ms`.padStart(10);
      const pctStr = `${h.totalTimePct.toFixed(1)}%`.padStart(7);
      const selfStr = `${h.selfTimeMs.toFixed(1)}ms`.padStart(9);
      const location = `${h.functionName} @ ${h.file}:${h.line}`;
      const locationStr =
        location.length > 39 ? location.slice(0, 36) + "..." : location.padEnd(39);
      console.log(`│ ${rank} │ ${totalStr} │ ${pctStr} │ ${selfStr} │ ${locationStr} │`);
    });
    console.log(`└──────┴────────────┴─────────┴───────────┴───────────────────────────────────┘`);

    console.log(`\n┌─ MOST FREQUENTLY SAMPLED FUNCTIONS ────────────────────────────────────────┐`);
    console.log(`│ Rank │ Samples │ Function @ Location                                      │`);
    console.log(`├──────┼─────────┼──────────────────────────────────────────────────────────┤`);
    const byFrequency = [...ourCode].sort((a, b) => b.selfSamples - a.selfSamples).slice(0, 10);
    byFrequency.forEach((h, idx) => {
      const rank = (idx + 1).toString().padStart(4);
      const samplesStr = h.selfSamples.toString().padStart(7);
      const location = `${h.functionName} @ ${h.file}:${h.line}`;
      const locationStr =
        location.length > 58 ? location.slice(0, 55) + "..." : location.padEnd(58);
      console.log(`│ ${rank} │ ${samplesStr} │ ${locationStr} │`);
    });
    console.log(`└──────┴─────────┴──────────────────────────────────────────────────────────┘`);
  } else {
    console.log(`\n⚠️  No TypeScript code found in profile`);
  }

  console.log(`\n${"=".repeat(100)}`);

  return { ourCode, topFilesBySelf };
}

async function generateMarkdownReport(
  analysis: any,
  ourCode: any[],
  topFilesBySelf: [string, number][],
  profileFile: string,
  outputPath: string,
) {
  const timestamp = new Date().toISOString();

  const bySelf = [...ourCode].sort((a: any, b: any) => b.selfTimeMs - a.selfTimeMs).slice(0, 20);
  const byTotal = [...ourCode].sort((a: any, b: any) => b.totalTimeMs - a.totalTimeMs).slice(0, 20);
  const byFrequency = [...ourCode]
    .sort((a: any, b: any) => b.selfSamples - a.selfSamples)
    .slice(0, 20);

  let markdown = `# Function-Level Performance Analysis\n\n`;
  markdown += `**Generated:** ${timestamp}\n`;
  markdown += `**Profile File:** ${profileFile}\n`;
  markdown += `\n---\n\n`;

  markdown += `## Performance Summary\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Profile Time | ${analysis.profileTimeMs.toFixed(1)}ms |\n`;
  markdown += `| Total Samples | ${analysis.totalSamples.toLocaleString()} |\n`;
  markdown += `| Sampling Interval | ${analysis.sampleIntervalUs}μs (${(analysis.sampleIntervalUs / 1000).toFixed(1)}ms) |\n`;
  markdown += `\n`;

  markdown += `### Data Quality Assessment\n\n`;
  if (analysis.totalSamples >= 10000) {
    markdown += `✅ **Excellent** - ${analysis.totalSamples.toLocaleString()} samples provide high statistical confidence\n\n`;
  } else if (analysis.totalSamples >= 1000) {
    markdown += `✓ **Good** - ${analysis.totalSamples.toLocaleString()} samples provide reasonable statistical confidence\n\n`;
  } else {
    markdown += `⚠️ **Limited** - Only ${analysis.totalSamples.toLocaleString()} samples may not be statistically significant\n\n`;
  }

  markdown += `## Top 20 Files by Self Time\n\n`;
  markdown += `Self time = time spent executing code in the file itself (not in functions it calls)\n\n`;
  markdown += `| Rank | Self Time | Self % | Samples | File |\n`;
  markdown += `|------|-----------|--------|---------|------|\n`;
  topFilesBySelf.forEach(([file, time], idx) => {
    const pct = ((time / analysis.profileTimeMs) * 100).toFixed(1);
    const samples = analysis.hotspots
      .filter((h: any) => h.file === file)
      .reduce((sum: number, h: any) => sum + h.selfSamples, 0);
    markdown += `| ${idx + 1} | ${time.toFixed(1)}ms | ${pct}% | ${samples.toLocaleString()} | \`${file}\` |\n`;
  });
  markdown += `\n`;

  markdown += `## Top 20 Functions by Self Time\n\n`;
  markdown += `Self time = time spent in the function itself (not in functions it calls)\n\n`;
  markdown += `| Rank | Self Time | Self % | Samples | Function | Location |\n`;
  markdown += `|------|-----------|--------|---------|----------|----------|\n`;
  bySelf.forEach((h: any, idx: number) => {
    markdown += `| ${idx + 1} | ${h.selfTimeMs.toFixed(1)}ms | ${h.selfTimePct.toFixed(1)}% | ${h.selfSamples.toLocaleString()} | \`${h.functionName}\` | \`${h.file}:${h.line}\` |\n`;
  });
  markdown += `\n`;

  markdown += `## Top 20 Functions by Total Time\n\n`;
  markdown += `Total time = time spent in the function including all functions it calls\n\n`;
  markdown += `| Rank | Total Time | Total % | Self Time | Function | Location |\n`;
  markdown += `|------|------------|---------|-----------|----------|----------|\n`;
  byTotal.forEach((h: any, idx: number) => {
    markdown += `| ${idx + 1} | ${h.totalTimeMs.toFixed(1)}ms | ${h.totalTimePct.toFixed(1)}% | ${h.selfTimeMs.toFixed(1)}ms | \`${h.functionName}\` | \`${h.file}:${h.line}\` |\n`;
  });
  markdown += `\n`;

  markdown += `## Most Frequently Sampled Functions\n\n`;
  markdown += `Functions that appeared most often in profiling samples (may indicate hot loops or frequently called code)\n\n`;
  markdown += `| Rank | Samples | Sample % | Avg Time/Sample | Function | Location |\n`;
  markdown += `|------|---------|----------|-----------------|----------|----------|\n`;
  byFrequency.forEach((h: any, idx: number) => {
    const avgTimePerSample = (analysis.sampleIntervalUs / 1000).toFixed(3);
    const samplePct = ((h.selfSamples / analysis.totalSamples) * 100).toFixed(2);
    markdown += `| ${idx + 1} | ${h.selfSamples.toLocaleString()} | ${samplePct}% | ${avgTimePerSample}ms | \`${h.functionName}\` | \`${h.file}:${h.line}\` |\n`;
  });
  markdown += `\n`;

  // Key findings
  markdown += `## Key Findings\n\n`;

  if (bySelf.length > 0) {
    const top1 = bySelf[0];
    markdown += `### Top Hotspot\n\n`;
    markdown += `**Function:** \`${top1.functionName}\`\n`;
    markdown += `**Location:** \`${top1.file}:${top1.line}\`\n`;
    markdown += `**Self Time:** ${top1.selfTimeMs.toFixed(1)}ms (${top1.selfTimePct.toFixed(1)}% of profile)\n`;
    markdown += `**Total Time:** ${top1.totalTimeMs.toFixed(1)}ms (${top1.totalTimePct.toFixed(1)}% of profile)\n`;
    markdown += `**Samples:** ${top1.selfSamples.toLocaleString()}\n\n`;

    markdown += `This function is the single biggest performance bottleneck in our code.\n\n`;
  }

  if (bySelf.length >= 3) {
    const top3Time = bySelf.slice(0, 3).reduce((sum: number, h: any) => sum + h.selfTimeMs, 0);
    const top3Pct = ((top3Time / analysis.profileTimeMs) * 100).toFixed(1);
    markdown += `### Top 3 Functions\n\n`;
    markdown += `The top 3 functions account for **${top3Time.toFixed(1)}ms (${top3Pct}%)** of total profile time:\n\n`;
    bySelf.slice(0, 3).forEach((h: any, idx: number) => {
      markdown += `${idx + 1}. \`${h.functionName}\` - ${h.selfTimeMs.toFixed(1)}ms @ \`${h.file}:${h.line}\`\n`;
    });
    markdown += `\n`;
  }

  // Optimization recommendations
  markdown += `## Optimization Recommendations\n\n`;
  markdown += `Based on the profiling data, focus optimization efforts on:\n\n`;

  bySelf.slice(0, 5).forEach((h: any, idx: number) => {
    markdown += `### ${idx + 1}. ${h.functionName}\n\n`;
    markdown += `- **Impact:** ${h.selfTimeMs.toFixed(1)}ms (${h.selfTimePct.toFixed(1)}% of profile)\n`;
    markdown += `- **Location:** \`${h.file}:${h.line}\`\n`;
    markdown += `- **Recommendation:** Investigate and optimize this function\n\n`;
  });

  markdown += `## Source Map Validation\n\n`;
  const tsFiles = ourCode.filter((h: any) => h.file.endsWith(".ts") || h.file.endsWith(".tsx"));
  if (tsFiles.length > 0) {
    markdown += `✅ **Source maps working correctly**\n\n`;
    markdown += `- Found ${tsFiles.length} TypeScript functions in profile\n`;
    markdown += `- Line numbers are being mapped from compiled JavaScript back to TypeScript\n`;
    markdown += `- Can identify exact functions and locations for optimization\n\n`;
  } else {
    markdown += `⚠️ **No TypeScript files found in profile**\n\n`;
    markdown += `Source maps may not be loading correctly, or we may be profiling the wrong page.\n\n`;
  }

  markdown += `## Next Steps\n\n`;
  markdown += `1. **Review top hotspots** - Examine the top 5 functions for optimization opportunities\n`;
  markdown += `2. **Measure impact** - After optimizing, re-run profiler to measure improvements\n`;
  markdown += `3. **Focus on high-value targets** - Prioritize functions with both high self time and high total time\n`;
  markdown += `4. **Check call patterns** - Look for functions called too frequently (high sample counts)\n\n`;

  fs.writeFileSync(outputPath, markdown);
  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  npx tsx scripts/analyze-profile.ts <cpuprofile-file>

Example:
  npx tsx scripts/analyze-profile.ts browsertest-profile.cpuprofile
`);
    process.exit(1);
  }

  const profileFile = args[0];

  if (!fs.existsSync(profileFile)) {
    console.error(`Error: Profile file not found: ${profileFile}`);
    process.exit(1);
  }

  console.log(`\n📊 Analyzing Profile: ${profileFile}`);

  const profileData = fs.readFileSync(profileFile, "utf-8");
  const profile: CPUProfile = JSON.parse(profileData);

  console.log(`   Loaded ${profile.nodes.length} nodes, ${profile.samples.length} samples`);

  const sourceMapResolver = new SourceMapResolver();
  const analysis = await analyzeProfile(profile, sourceMapResolver);
  const { ourCode, topFilesBySelf } = printAnalysis(analysis);

  // Generate markdown report
  const profilesDir = path.join(path.dirname(profileFile), ".profiles");
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }

  const reportPath = path.join(profilesDir, "FUNCTION_LEVEL_ANALYSIS.md");
  await generateMarkdownReport(analysis, ourCode, topFilesBySelf, profileFile, reportPath);

  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  console.log(`\n✅ Analysis complete!`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
