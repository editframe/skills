#!/usr/bin/env npx ts-node
/**
 * CPU Profiling for Browser Tests
 * 
 * Runs a browsertest file with CPU profiling enabled on the actual Vitest test page.
 * Connects to the shared Chrome instance, waits for Vitest to create its test page,
 * and profiles the test execution in that renderer process.
 * 
 * Usage:
 *   npx tsx scripts/profile-browsertest.ts <test-file> [options]
 * 
 * Options:
 *   -t <pattern>       Test name pattern to run
 *   --output <path>    Output path for .cpuprofile (default: ./browsertest-profile.cpuprofile)
 *   --focus <file>     Focus analysis on specific source file
 *   --json             Output analysis as JSON
 * 
 * Examples:
 *   npx tsx scripts/profile-browsertest.ts packages/elements/src/preview/renderTimegroupToCanvas.browsertest.ts -t "batch capture"
 */

import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      } catch { return null; }
    })();
    this.fetchCache.set(url, promise);
    return promise;
  }
  
  async getTraceMap(scriptUrl: string): Promise<TraceMap | null> {
    if (this.traceMaps.has(scriptUrl)) return this.traceMaps.get(scriptUrl)!;
    
    const scriptContent = await this.fetchText(scriptUrl);
    if (!scriptContent) { this.traceMaps.set(scriptUrl, null); return null; }
    
    const match = scriptContent.match(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/);
    if (!match) { this.traceMaps.set(scriptUrl, null); return null; }
    
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
    
    if (!sourceMapJson) { this.traceMaps.set(scriptUrl, null); return null; }
    
    try {
      const traceMap = new TraceMap(sourceMapJson);
      this.traceMaps.set(scriptUrl, traceMap);
      return traceMap;
    } catch { this.traceMaps.set(scriptUrl, null); return null; }
  }
  
  async resolve(scriptUrl: string, line0Based: number, column: number) {
    const traceMap = await this.getTraceMap(scriptUrl);
    if (!traceMap || line0Based < 0) return null;
    try {
      const result = originalPositionFor(traceMap, { line: line0Based, column });
      if (!result.source) return null;
      return {
        source: result.source.split("/").pop() || result.source,
        line: result.line ?? (line0Based + 1),
      };
    } catch { return null; }
  }
}

let sourceMapResolver: SourceMapResolver | null = null;

async function main() {
  const args = process.argv.slice(2);
  
  let testFile = "";
  let testPattern = "";
  let outputPath = "./browsertest-profile.cpuprofile";
  let focusFile = "";
  let jsonOutput = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-t" && args[i + 1]) testPattern = args[++i];
    else if (args[i] === "--output" && args[i + 1]) outputPath = args[++i];
    else if (args[i] === "--focus" && args[i + 1]) focusFile = args[++i];
    else if (args[i] === "--json") jsonOutput = true;
    else if (!args[i].startsWith("-") && !testFile) testFile = args[i];
  }

  if (!testFile) {
    console.log(`
🔬 Browser Test CPU Profiler

Usage:
  npx tsx scripts/profile-browsertest.ts <test-file> [options]

Options:
  -t <pattern>       Test name pattern to run
  --output <path>    Output path for .cpuprofile file
  --focus <file>     Focus analysis on specific source file

Examples:
  npx tsx scripts/profile-browsertest.ts packages/elements/src/preview/renderTimegroupToCanvas.browsertest.ts -t "batch capture"
`);
    process.exit(1);
  }

  console.log(`\n🔬 Browser Test CPU Profiler`);
  console.log(`   Test file: ${testFile}`);
  if (testPattern) console.log(`   Pattern: ${testPattern}`);
  console.log(`   Output: ${outputPath}`);
  console.log();

  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) { console.error("Could not find monorepo root"); process.exit(1); }

  const wsEndpointPath = path.join(monorepoRoot, ".wsEndpoint.json");
  if (!fs.existsSync(wsEndpointPath)) {
    console.error("Browser server not running. Start with: ./scripts/start-host-chrome");
    process.exit(1);
  }

  const { wsEndpoint } = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
  console.log(`📡 Connecting to browser: ${wsEndpoint}\n`);

  const browser = await chromium.connect(wsEndpoint);
  
  // Get a CDP session on the browser itself (not a page)
  const browserCdp = await browser.newBrowserCDPSession();
  
  // Now run the browsertest script FIRST so it creates the Vitest page
  const browsertestArgs = [testFile];
  if (testPattern) browsertestArgs.push("-t", testPattern);

  console.log(`🎬 Starting browsertest to create Vitest page...\n`);
  
  const browsertest = spawn("./scripts/browsertest", browsertestArgs, {
    cwd: path.join(monorepoRoot, "elements"),
    stdio: "inherit",
    shell: true,
  });
  
  // Monitor for new targets being created
  console.log(`\n⏳ Waiting for Vitest test page to be created...`);
  
  let vitestTarget: { targetId: string; type: string; title: string; url: string } | undefined;
  let attempts = 0;
  const maxAttempts = 20; // 10 seconds total
  
  while (!vitestTarget && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
    
    const { targetInfos } = await browserCdp.send("Target.getTargets") as { 
      targetInfos: Array<{ targetId: string; type: string; title: string; url: string }> 
    };
    
    if (attempts === 1 || attempts % 4 === 0) {
      console.log(`   Attempt ${attempts}: Found ${targetInfos.length} targets`);
      for (const target of targetInfos) {
        console.log(`     ${target.type}: ${target.url}`);
      }
    }
    
    // Look for a page target with localhost or Vitest in URL
    vitestTarget = targetInfos.find(t => 
      t.type === 'page' && 
      (t.url.includes('localhost') || t.url.includes('127.0.0.1') || t.url.includes('__vitest__'))
    );
    
    // Fall back to any page that's not about:blank or chrome://
    if (!vitestTarget) {
      vitestTarget = targetInfos.find(t => 
        t.type === 'page' && 
        !t.url.startsWith('about:') && 
        !t.url.startsWith('chrome://') &&
        !t.url.startsWith('devtools://')
      );
    }
    
    if (vitestTarget) {
      console.log(`✓ Found target after ${attempts * 0.5}s: ${vitestTarget.url}\n`);
      break;
    }
  }
  
  if (!vitestTarget) {
    console.error(`\n❌ Could not find a suitable page to profile after ${maxAttempts * 0.5}s!`);
    await browserCdp.detach();
    browsertest.kill();
    process.exit(1);
  }
  
  // Attach to the target using non-flattened mode
  const { sessionId } = await browserCdp.send("Target.attachToTarget", {
    targetId: vitestTarget.targetId,
    flatten: false  // Don't use flat mode
  }) as { sessionId: string };
  
  console.log(`✓ Attached to target with session: ${sessionId}\n`);
  
  // Use Chrome's default sampling interval of 1000μs (1ms) for more stable sampling
  const samplingIntervalUs = 1000;
  console.log(`🎯 Profiling target: ${vitestTarget.url}`);
  console.log(`🎬 Starting profiler with ${samplingIntervalUs}μs sampling interval...\n`);
  
  // Set up message handling for responses from the target
  let messageId = 1;
  const pendingMessages = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();
  
  browserCdp.on("Target.receivedMessageFromTarget", (event: any) => {
    if (event.sessionId === sessionId) {
      try {
        const message = JSON.parse(event.message);
        if (message.id && pendingMessages.has(message.id)) {
          const { resolve, reject } = pendingMessages.get(message.id)!;
          pendingMessages.delete(message.id);
          if (message.error) {
            reject(new Error(`CDP error: ${JSON.stringify(message.error)}`));
          } else {
            resolve(message.result || {});
          }
        }
      } catch (e) {
        console.error(`Error parsing CDP message: ${e}`);
      }
    }
  });
  
  async function sendToTarget(method: string, params: any = {}): Promise<any> {
    const id = messageId++;
    const promise = new Promise((resolve, reject) => {
      pendingMessages.set(id, { resolve, reject });
      setTimeout(() => {
        if (pendingMessages.has(id)) {
          pendingMessages.delete(id);
          reject(new Error(`Timeout waiting for ${method}`));
        }
      }, 5000);
    });
    
    await browserCdp.send("Target.sendMessageToTarget", {
      sessionId,
      message: JSON.stringify({ id, method, params })
    });
    
    return promise;
  }
  
  // Start profiling
  await sendToTarget("Profiler.enable");
  await sendToTarget("Profiler.setSamplingInterval", { interval: samplingIntervalUs });
  await sendToTarget("Profiler.start");
  
  const startTime = Date.now();
  
  // Wait for browsertest to complete
  await new Promise<void>((resolve) => {
    browsertest.on("close", () => resolve());
    browsertest.on("error", () => resolve());
  });

  const wallClockMs = Date.now() - startTime;

  // Stop profiling
  const stopResult = await sendToTarget("Profiler.stop");
  const profile = stopResult.profile as CPUProfile;
  await sendToTarget("Profiler.disable");
  
  await browserCdp.send("Target.detachFromTarget", { sessionId });
  
  // Get final URL
  const { targetInfos: finalTargets } = await browserCdp.send("Target.getTargets") as { 
    targetInfos: Array<{ targetId: string; url: string }> 
  };
  const finalTarget = finalTargets.find(t => t.targetId === vitestTarget.targetId);
  const finalUrl = finalTarget?.url || vitestTarget.url;
  
  await browserCdp.detach();

  console.log(`\n⏱️  Tests completed in ${(wallClockMs / 1000).toFixed(2)}s`);
  console.log(`📄 Final page URL: ${finalUrl}`);

  // Verify data quality
  const totalSamples = profile.samples.length;
  const uniqueNodeIds = new Set(profile.samples).size;
  const totalNodes = profile.nodes.length;
  
  console.log(`\n📊 Profile Data Quality:`);
  console.log(`   Total samples: ${totalSamples}`);
  console.log(`   Unique functions sampled: ${uniqueNodeIds}`);
  console.log(`   Total nodes in call tree: ${totalNodes}`);
  
  // Calculate stack depth
  const sampleCounts = new Map<number, number>();
  for (const sample of profile.samples) {
    sampleCounts.set(sample, (sampleCounts.get(sample) || 0) + 1);
  }
  
  // Count non-idle samples
  const nonIdleNodes = profile.nodes.filter(n => 
    n.callFrame.functionName !== "(idle)" && 
    n.callFrame.functionName !== "(program)" &&
    n.callFrame.functionName !== "(root)"
  );
  const nonIdleSamples = profile.samples.filter(sampleId => {
    const node = profile.nodes.find(n => n.id === sampleId);
    return node && 
      node.callFrame.functionName !== "(idle)" && 
      node.callFrame.functionName !== "(program)" &&
      node.callFrame.functionName !== "(root)";
  });
  
  console.log(`   Non-idle samples: ${nonIdleSamples.length} (${(nonIdleSamples.length/totalSamples*100).toFixed(1)}%)`);
  console.log(`   Non-idle nodes: ${nonIdleNodes.length}`);
  
  // Find max call stack depth
  const nodeChildren = new Map<number, number[]>();
  for (const node of profile.nodes) {
    if (node.children) {
      nodeChildren.set(node.id, node.children);
    }
  }
  
  function getDepth(nodeId: number, visited = new Set<number>()): number {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    const children = nodeChildren.get(nodeId) || [];
    if (children.length === 0) return 1;
    return 1 + Math.max(...children.map(c => getDepth(c, new Set(visited))));
  }
  
  const rootNode = profile.nodes[0];
  if (rootNode) {
    const maxDepth = getDepth(rootNode.id);
    console.log(`   Max call stack depth: ${maxDepth}`);
  }
  
  if (nonIdleSamples.length < 10) {
    console.log(`\n⚠️  Warning: Profile captured mostly idle time`);
    console.log(`   This may indicate that:`);
    console.log(`   - The test completed very quickly`);
    console.log(`   - The profiler attached to the wrong page`);
    console.log(`   - Try running a longer test or check page URL`);
  }

  // Save profile anyway
  const fullOutputPath = path.resolve(path.join(monorepoRoot, "elements"), outputPath);
  fs.writeFileSync(fullOutputPath, JSON.stringify(profile, null, 2));
  console.log(`\n💾 Profile saved to: ${fullOutputPath}`);

  // Always run enhanced analysis if we have any data
  if (totalSamples > 0) {
    // Initialize source map resolver for detailed analysis
    sourceMapResolver = new SourceMapResolver();
    
    console.log(`\n🔍 Running detailed hotspot analysis...`);
    await printProfileAnalysis(profile, focusFile, wallClockMs);
    
    // Also run the standard profiling analysis if available
    try {
      const { analyzeProfile, formatProfileAnalysis, formatProfileAnalysisJSON } = await import("../packages/elements/src/profiling/index.js");
      
      const analysis = analyzeProfile(profile, {
        filterNodeModules: true,
        filterInternals: true,
        topN: 20,
      });

      if (jsonOutput) {
        console.log(formatProfileAnalysisJSON(analysis, { sandbox: testFile, scenario: testPattern || "all" }, { topN: 20 }));
      } else {
        console.log(`\n📊 Standard Profile Analysis:`);
        console.log(formatProfileAnalysis(analysis, { sandbox: testFile, scenario: testPattern || "all" }, { topN: 20, showRecommendations: true }));
      }
    } catch (e) {
      // Standard profiling tools might not be available, that's ok
      console.log(`\n(Standard profiling tools not available)`);
    }
  }

  // Don't close the page or context - they're managed by the browsertest system
  
  console.log(`\n✅ Done!`);
  process.exit(0);
}

function findMonorepoRoot(): string | null {
  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, "elements")) && fs.existsSync(path.join(currentDir, "telecine"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

async function printProfileAnalysis(profile: CPUProfile, focusFile: string, wallClockMs: number) {
  // Calculate self time (hit counts)
  const selfCounts = new Map<number, number>();
  for (const sample of profile.samples) {
    selfCounts.set(sample, (selfCounts.get(sample) || 0) + 1);
  }

  // Calculate total time (including callees) by building parent map
  const nodeMap = new Map<number, ProfileNode>();
  const nodeParents = new Map<number, Set<number>>();
  
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
    if (node.children) {
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

  const sampleIntervalUs = profile.timeDeltas.length > 0
    ? profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.timeDeltas.length : 1000;
  const totalSamples = profile.samples.length;
  const profileTimeMs = totalSamples * sampleIntervalUs / 1000;

  const resolvedLocations = new Map<number, { source: string; line: number } | null>();
  if (sourceMapResolver) {
    for (const node of profile.nodes) {
      if (node.callFrame.url?.startsWith("http")) {
        const resolved = await sourceMapResolver.resolve(
          node.callFrame.url.split("?")[0],
          node.callFrame.lineNumber,
          node.callFrame.columnNumber
        );
        resolvedLocations.set(node.id, resolved);
      }
    }
  }

  interface Hotspot { 
    functionName: string; 
    file: string; 
    line: number; 
    selfTimeMs: number; 
    selfTimePct: number;
    totalTimeMs: number;
    totalTimePct: number;
  }
  const hotspots: Hotspot[] = [];
  
  for (const node of profile.nodes) {
    const selfCount = selfCounts.get(node.id) || 0;
    const totalCount = totalCounts.get(node.id) || 0;
    if (totalCount === 0) continue;
    
    const selfTimeMs = selfCount * sampleIntervalUs / 1000;
    const totalTimeMs = totalCount * sampleIntervalUs / 1000;
    const resolved = resolvedLocations.get(node.id);
    
    hotspots.push({
      functionName: node.callFrame.functionName || "(anonymous)",
      file: resolved?.source || node.callFrame.url?.split("/").slice(-1)[0]?.split("?")[0] || "(native)",
      line: resolved?.line ?? (node.callFrame.lineNumber + 1),
      selfTimeMs,
      selfTimePct: (selfCount / totalSamples) * 100,
      totalTimeMs,
      totalTimePct: (totalCount / totalSamples) * 100,
    });
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Wall: ${wallClockMs}ms | Profile: ${profileTimeMs.toFixed(1)}ms | Samples: ${totalSamples}`);

  // By file analysis
  const byFileSelf = new Map<string, number>();
  const byFileTotal = new Map<string, number>();
  for (const h of hotspots) {
    byFileSelf.set(h.file, (byFileSelf.get(h.file) || 0) + h.selfTimeMs);
    byFileTotal.set(h.file, (byFileTotal.get(h.file) || 0) + h.totalTimeMs);
  }
  
  console.log(`\n--- TOP 10 FILES BY SELF TIME (time in file itself) ---`);
  for (const [file, time] of Array.from(byFileSelf.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${time.toFixed(1).padStart(7)}ms (${(time/profileTimeMs*100).toFixed(1).padStart(5)}%)  ${file}`);
  }

  console.log(`\n--- TOP 10 FILES BY TOTAL TIME (including callees) ---`);
  for (const [file, time] of Array.from(byFileTotal.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${time.toFixed(1).padStart(7)}ms (${(time/profileTimeMs*100).toFixed(1).padStart(5)}%)  ${file}`);
  }

  // Filter to our code (TypeScript files, not node_modules)
  const ourCode = hotspots.filter(h => 
    (h.file.endsWith('.ts') || h.file.endsWith('.tsx')) && 
    !h.file.includes('node_modules') &&
    h.file !== '(native)'
  );
  
  if (ourCode.length > 0) {
    console.log(`\n--- TOP 10 FUNCTIONS BY SELF TIME (time in function itself) ---`);
    const bySelf = [...ourCode].sort((a, b) => b.selfTimeMs - a.selfTimeMs).slice(0, 10);
    for (const h of bySelf) {
      const fnName = h.functionName.slice(0, 40).padEnd(40);
      console.log(`  ${h.selfTimeMs.toFixed(1).padStart(7)}ms (${h.selfTimePct.toFixed(1).padStart(5)}%)  ${fnName} ${h.file}:${h.line}`);
    }

    console.log(`\n--- TOP 10 FUNCTIONS BY TOTAL TIME (including callees) ---`);
    const byTotal = [...ourCode].sort((a, b) => b.totalTimeMs - a.totalTimeMs).slice(0, 10);
    for (const h of byTotal) {
      const fnName = h.functionName.slice(0, 40).padEnd(40);
      const selfPart = h.selfTimeMs > 0 ? ` [self: ${h.selfTimeMs.toFixed(1)}ms]` : '';
      console.log(`  ${h.totalTimeMs.toFixed(1).padStart(7)}ms (${h.totalTimePct.toFixed(1).padStart(5)}%)  ${fnName} ${h.file}:${h.line}${selfPart}`);
    }
  } else {
    console.log(`\n⚠️  No TypeScript code found in profile - may be profiling wrong page`);
  }
  
  console.log(`${"=".repeat(80)}`);
}

main().catch((error) => { console.error("Error:", error); process.exit(1); });
