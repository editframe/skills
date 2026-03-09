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

Automatically profiles the entire test run using event-based signaling.
No duration configuration needed - profiling starts when tests start
and stops when tests complete.

Usage:
  npx tsx scripts/profile-browsertest.ts <test-file> [options]

Options:
  -t <pattern>       Test name pattern to run
  --output <path>    Output path for .cpuprofile file
  --focus <file>     Focus analysis on specific source file
  --json             Output analysis as JSON

Examples:
  npx tsx scripts/profile-browsertest.ts packages/elements/src/preview/renderTimegroupToCanvas.browsertest.ts -t "batch"
  npx tsx scripts/profile-browsertest.ts packages/elements/src/gui/EFWorkbench.browsertest.ts
`);
    process.exit(1);
  }

  console.log(`\n🔬 Browser Test CPU Profiler`);
  console.log(`   Test file: ${testFile}`);
  if (testPattern) console.log(`   Pattern: ${testPattern}`);
  console.log(`   Output: ${outputPath}`);
  console.log();

  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) {
    console.error("Could not find monorepo root");
    process.exit(1);
  }

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
    await new Promise((resolve) => setTimeout(resolve, 500));
    attempts++;

    const { targetInfos } = (await browserCdp.send("Target.getTargets")) as {
      targetInfos: Array<{
        targetId: string;
        type: string;
        title: string;
        url: string;
      }>;
    };

    if (attempts === 1 || attempts % 4 === 0) {
      console.log(`   Attempt ${attempts}: Found ${targetInfos.length} targets`);
      for (const target of targetInfos) {
        console.log(`     ${target.type}: ${target.url}`);
      }
    }

    // Look for a page target with localhost or Vitest in URL
    vitestTarget = targetInfos.find(
      (t) =>
        t.type === "page" &&
        (t.url.includes("localhost") ||
          t.url.includes("127.0.0.1") ||
          t.url.includes("__vitest__")),
    );

    // Fall back to any page that's not about:blank or chrome://
    if (!vitestTarget) {
      vitestTarget = targetInfos.find(
        (t) =>
          t.type === "page" &&
          !t.url.startsWith("about:") &&
          !t.url.startsWith("chrome://") &&
          !t.url.startsWith("devtools://"),
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

  // Attach to the target using non-flattened mode for CDP profiling
  const { sessionId } = (await browserCdp.send("Target.attachToTarget", {
    targetId: vitestTarget.targetId,
    flatten: false, // Don't use flat mode
  })) as { sessionId: string };

  console.log(`✓ Attached to target with session: ${sessionId}\n`);

  // Use Chrome's default sampling interval of 1000μs (1ms) for more stable sampling
  const samplingIntervalUs = 1000;
  console.log(`🎯 Profiling target: ${vitestTarget.url}`);
  console.log(`🎬 Starting profiler with ${samplingIntervalUs}μs sampling interval...\n`);

  // Set up message handling for responses from the target
  let messageId = 1;
  const pendingMessages = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: any) => void }
  >();

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

  async function sendToTarget(
    method: string,
    params: any = {},
    timeout: number = 5000,
  ): Promise<any> {
    const id = messageId++;
    const promise = new Promise((resolve, reject) => {
      pendingMessages.set(id, { resolve, reject });
      setTimeout(() => {
        if (pendingMessages.has(id)) {
          pendingMessages.delete(id);
          reject(new Error(`Timeout waiting for ${method}`));
        }
      }, timeout);
    });

    await browserCdp.send("Target.sendMessageToTarget", {
      sessionId,
      message: JSON.stringify({ id, method, params }),
    });

    return promise;
  }

  // Enable Runtime for profiling and script evaluation
  console.log(`🔧 Enabling profiler and runtime...`);
  await sendToTarget("Runtime.enable");

  // Inject the stop flag into the page using CDP
  console.log(`🔧 Injecting profiler stop flag into page...`);
  await sendToTarget("Runtime.evaluate", {
    expression: "window.__PROFILER_STOP_REQUESTED__ = false;",
    returnByValue: false,
  });
  console.log(`✓ Stop flag injected\n`);

  // Start profiling
  await sendToTarget("Profiler.enable");
  await sendToTarget("Profiler.setSamplingInterval", {
    interval: samplingIntervalUs,
  });
  await sendToTarget("Profiler.start");

  const startTime = Date.now();

  console.log(`🔄 Profiling tests with event-based signaling...\n`);
  let finalUrl = vitestTarget.url;
  let profile: CPUProfile | null = null;

  // Track if browsertest process exited
  let browsertestExited = false;
  browsertest.on("close", () => {
    browsertestExited = true;
  });

  // Poll the stop flag in a loop
  const pollInterval = 50; // ms
  const maxWaitTime = 120000; // 120 seconds max
  const pollStartTime = Date.now();
  let stopReason = "";

  console.log(`⏳ Polling for stop signal (checking every ${pollInterval}ms)...`);

  let pollCount = 0;
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    pollCount++;

    // Check if we've exceeded max wait time
    if (Date.now() - pollStartTime > maxWaitTime) {
      stopReason = "timeout (120s)";
      console.log(`⏰ Max profiling time reached (120s), stopping...`);
      break;
    }

    // Check if browsertest process exited
    if (browsertestExited) {
      stopReason = "browsertest process exited";
      console.log(`✓ Browsertest process exited`);
      break;
    }

    // Check the stop flag in all frames (main window + iframes) using CDP
    try {
      // Check all frames for the stop flag
      // Tests may run in an iframe, so we need to check both main window and iframes
      const evalResult = await sendToTarget(
        "Runtime.evaluate",
        {
          expression: `
          (function() {
            // Check main window
            if (window.__PROFILER_STOP_REQUESTED__ === true) return true;
            
            // Check all iframes
            const frames = document.querySelectorAll('iframe');
            for (const frame of frames) {
              try {
                if (frame.contentWindow && frame.contentWindow.__PROFILER_STOP_REQUESTED__ === true) {
                  return true;
                }
              } catch (e) {
                // Cross-origin iframe, skip
              }
            }
            
            return false;
          })()
        `,
          returnByValue: true,
        },
        200,
      ); // Use 200ms timeout for fast failure detection

      const flagValue = evalResult?.result?.value;

      // Log every 20 polls to show we're still checking
      if (pollCount % 20 === 0) {
        console.log(`   Poll #${pollCount}: flag=${flagValue}`);
      }

      if (flagValue === true) {
        stopReason = "stop signal received from tests";
        console.log(`✓ Stop signal received from tests (poll #${pollCount})`);
        break;
      }
    } catch (e: any) {
      // Page closed or session lost
      stopReason = "CDP session lost or page closed";
      console.log(`✓ CDP session lost or page closed (poll #${pollCount}, error: ${e.message})`);
      break;
    }
  }

  const profilingDuration = Date.now() - pollStartTime;
  console.log(`\n⏱️  Profiled for ${(profilingDuration / 1000).toFixed(2)}s (${stopReason})`);

  // Stop profiling while CDP session is still alive
  try {
    console.log(`🛑 Stopping profiler...`);
    const stopResult = await sendToTarget("Profiler.stop");
    profile = stopResult.profile as CPUProfile;
    await sendToTarget("Profiler.disable");
    console.log(`✅ Successfully retrieved profile data\n`);
  } catch (error: any) {
    console.log(`❌ Could not stop profiler: ${error.message}\n`);
  }

  // Wait for browsertest to complete if it hasn't already
  if (!browsertestExited) {
    console.log(`⏳ Waiting for browsertest to complete...`);
    await new Promise<void>((resolve) => {
      browsertest.on("close", () => {
        console.log(`✅ Browsertest completed`);
        resolve();
      });
    });
  }

  const wallClockMs = Date.now() - startTime;

  try {
    await browserCdp.send("Target.detachFromTarget", { sessionId });
  } catch {
    // Session may already be closed
  }

  // Get final URL
  try {
    const { targetInfos: finalTargets } = (await browserCdp.send("Target.getTargets")) as {
      targetInfos: Array<{ targetId: string; url: string }>;
    };
    const finalTarget = finalTargets.find((t) => t.targetId === vitestTarget.targetId);
    finalUrl = finalTarget?.url || vitestTarget.url;
  } catch {
    // Target may be gone
  }

  await browserCdp.detach();

  console.log(`\n⏱️  Tests completed in ${(wallClockMs / 1000).toFixed(2)}s`);
  console.log(`📄 Final page URL: ${finalUrl}`);

  if (!profile) {
    console.log(`\n❌ No profile data captured - session closed before profiling could complete.`);
    console.log(`   Try profiling a longer-running test or add delays to keep the page open.`);
    process.exit(1);
  }

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
  const nonIdleNodes = profile.nodes.filter(
    (n) =>
      n.callFrame.functionName !== "(idle)" &&
      n.callFrame.functionName !== "(program)" &&
      n.callFrame.functionName !== "(root)",
  );
  const nonIdleSamples = profile.samples.filter((sampleId) => {
    const node = profile.nodes.find((n) => n.id === sampleId);
    return (
      node &&
      node.callFrame.functionName !== "(idle)" &&
      node.callFrame.functionName !== "(program)" &&
      node.callFrame.functionName !== "(root)"
    );
  });

  console.log(
    `   Non-idle samples: ${nonIdleSamples.length} (${((nonIdleSamples.length / totalSamples) * 100).toFixed(1)}%)`,
  );
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
    return 1 + Math.max(...children.map((c) => getDepth(c, new Set(visited))));
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
    const analysisData = await printProfileAnalysis(profile, focusFile, wallClockMs);

    // Generate markdown report
    const profilesDir = path.join(monorepoRoot, "elements", ".profiles");
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }

    const reportPath = await generateMarkdownReport(
      analysisData,
      testFile,
      testPattern,
      profilesDir,
    );
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Also run the standard profiling analysis if available
    try {
      const { analyzeProfile, formatProfileAnalysis, formatProfileAnalysisJSON } =
        await import("../packages/elements/src/profiling/index.js");

      const analysis = analyzeProfile(profile, {
        filterNodeModules: true,
        filterInternals: true,
        topN: 20,
      });

      if (jsonOutput) {
        console.log(
          formatProfileAnalysisJSON(
            analysis,
            { sandbox: testFile, scenario: testPattern || "all" },
            { topN: 20 },
          ),
        );
      } else {
        console.log(`\n📊 Standard Profile Analysis:`);
        console.log(
          formatProfileAnalysis(
            analysis,
            { sandbox: testFile, scenario: testPattern || "all" },
            { topN: 20, showRecommendations: true },
          ),
        );
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
    if (
      fs.existsSync(path.join(currentDir, "elements")) &&
      fs.existsSync(path.join(currentDir, "telecine"))
    ) {
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
  const callCounts = new Map<string, number>(); // parent:child edge counts

  for (const sampleNodeId of profile.samples) {
    const visited = new Set<number>();
    const stack = [sampleNodeId];
    let prevNodeId: number | null = null;

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      totalCounts.set(nodeId, (totalCounts.get(nodeId) || 0) + 1);

      // Track parent->child call edges
      if (prevNodeId !== null) {
        const edgeKey = `${prevNodeId}:${nodeId}`;
        callCounts.set(edgeKey, (callCounts.get(edgeKey) || 0) + 1);
      }

      // Add all parents to stack
      const parents = nodeParents.get(nodeId);
      if (parents) {
        for (const parentId of parents) {
          stack.push(parentId);
        }
      }
      prevNodeId = nodeId;
    }
  }

  const sampleIntervalUs =
    profile.timeDeltas.length > 0
      ? profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.timeDeltas.length
      : 1000;
  const totalSamples = profile.samples.length;
  const profileTimeMs = (totalSamples * sampleIntervalUs) / 1000;

  const resolvedLocations = new Map<number, { source: string; line: number } | null>();
  if (sourceMapResolver) {
    for (const node of profile.nodes) {
      if (node.callFrame.url?.startsWith("http")) {
        const resolved = await sourceMapResolver.resolve(
          node.callFrame.url.split("?")[0],
          node.callFrame.lineNumber,
          node.callFrame.columnNumber,
        );
        resolvedLocations.set(node.id, resolved);
      }
    }
  }

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

  console.log(`\n${"=".repeat(100)}`);
  console.log(`PERFORMANCE SUMMARY`);
  console.log(`  Wall Clock Time: ${wallClockMs}ms`);
  console.log(`  Profile Time: ${profileTimeMs.toFixed(1)}ms`);
  console.log(`  Total Samples: ${totalSamples}`);
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

  // Filter to our code (TypeScript files, not node_modules)
  const ourCode = hotspots.filter(
    (h) =>
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

    // Call tree analysis for top hotspot
    if (bySelf.length > 0) {
      const topHotspot = bySelf[0];
      console.log(
        `\n┌─ CALL TREE FOR TOP HOTSPOT ────────────────────────────────────────────────┐`,
      );
      console.log(
        `│ ${topHotspot.functionName} @ ${topHotspot.file}:${topHotspot.line}`.padEnd(79) + "│",
      );
      console.log(
        `│ Self: ${topHotspot.selfTimeMs.toFixed(1)}ms | Total: ${topHotspot.totalTimeMs.toFixed(1)}ms`.padEnd(
          79,
        ) + "│",
      );
      console.log(`├────────────────────────────────────────────────────────────────────────────┤`);

      // Find callers (parents)
      const callers = new Map<number, number>();
      for (const parentId of nodeParents.get(topHotspot.nodeId) || []) {
        const count = totalCounts.get(parentId) || 0;
        if (count > 0) callers.set(parentId, count);
      }

      if (callers.size > 0) {
        console.log(`│ Called by:`.padEnd(79) + "│");
        const sortedCallers = Array.from(callers.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        for (const [callerId, count] of sortedCallers) {
          const caller = hotspots.find((h) => h.nodeId === callerId);
          if (caller) {
            const timeMs = (count * sampleIntervalUs) / 1000;
            const line = `  └─ ${caller.functionName} (${timeMs.toFixed(1)}ms) @ ${caller.file}:${caller.line}`;
            console.log(`│ ${line.slice(0, 76).padEnd(76)} │`);
          }
        }
      }

      // Find callees (children)
      const callees = new Map<number, number>();
      for (const childId of nodeChildren.get(topHotspot.nodeId) || []) {
        const count = totalCounts.get(childId) || 0;
        if (count > 0) callees.set(childId, count);
      }

      if (callees.size > 0) {
        console.log(`│`.padEnd(79) + "│");
        console.log(`│ Calls:`.padEnd(79) + "│");
        const sortedCallees = Array.from(callees.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        for (const [calleeId, count] of sortedCallees) {
          const callee = hotspots.find((h) => h.nodeId === calleeId);
          if (callee) {
            const timeMs = (count * sampleIntervalUs) / 1000;
            const line = `  └─ ${callee.functionName} (${timeMs.toFixed(1)}ms) @ ${callee.file}:${callee.line}`;
            console.log(`│ ${line.slice(0, 76).padEnd(76)} │`);
          }
        }
      }

      console.log(`└────────────────────────────────────────────────────────────────────────────┘`);
    }

    // Function call frequency analysis
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
    console.log(`\n⚠️  No TypeScript code found in profile - may be profiling wrong page`);
  }

  console.log(`\n${"=".repeat(100)}`);

  // Return analysis data for markdown report
  return {
    wallClockMs,
    profileTimeMs,
    totalSamples,
    sampleIntervalUs,
    topFilesBySelf: Array.from(byFileSelf.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20),
    ourCode,
    hotspots,
  };
}

async function generateMarkdownReport(
  analysis: any,
  testFile: string,
  testPattern: string,
  outputDir: string,
) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(outputDir, "FUNCTION_LEVEL_ANALYSIS.md");

  const bySelf = [...analysis.ourCode]
    .sort((a: any, b: any) => b.selfTimeMs - a.selfTimeMs)
    .slice(0, 20);
  const byTotal = [...analysis.ourCode]
    .sort((a: any, b: any) => b.totalTimeMs - a.totalTimeMs)
    .slice(0, 20);
  const byFrequency = [...analysis.ourCode]
    .sort((a: any, b: any) => b.selfSamples - a.selfSamples)
    .slice(0, 20);

  let markdown = `# Function-Level Performance Analysis\n\n`;
  markdown += `**Generated:** ${timestamp}\n`;
  markdown += `**Test File:** ${testFile}\n`;
  if (testPattern) markdown += `**Test Pattern:** ${testPattern}\n`;
  markdown += `\n---\n\n`;

  markdown += `## Performance Summary\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Wall Clock Time | ${analysis.wallClockMs}ms |\n`;
  markdown += `| Profile Time | ${analysis.profileTimeMs.toFixed(1)}ms |\n`;
  markdown += `| Total Samples | ${analysis.totalSamples.toLocaleString()} |\n`;
  markdown += `| Sampling Interval | ${analysis.sampleIntervalUs}μs (${(analysis.sampleIntervalUs / 1000).toFixed(1)}ms) |\n`;
  markdown += `| Coverage | ${((analysis.profileTimeMs / analysis.wallClockMs) * 100).toFixed(1)}% |\n`;
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
  analysis.topFilesBySelf.forEach(([file, time]: [string, number], idx: number) => {
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
  const tsFiles = analysis.ourCode.filter(
    (h: any) => h.file.endsWith(".ts") || h.file.endsWith(".tsx"),
  );
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

  fs.writeFileSync(reportPath, markdown);
  return reportPath;
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
