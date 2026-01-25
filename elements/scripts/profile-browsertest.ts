#!/usr/bin/env npx ts-node
/**
 * CPU Profiling for Browser Tests
 * 
 * Runs a browsertest file with CPU profiling enabled at the browser level.
 * Connects to the shared Chrome instance and profiles all browser activity.
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
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-t" && args[i + 1]) testPattern = args[++i];
    else if (args[i] === "--output" && args[i + 1]) outputPath = args[++i];
    else if (args[i] === "--focus" && args[i + 1]) focusFile = args[++i];
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
  
  // Get browser-level CDP session for profiling
  const browserCdp = await browser.newBrowserCDPSession();
  
  // List all targets to find the right one to profile
  const { targetInfos } = await browserCdp.send("Target.getTargets") as any;
  console.log(`📋 Browser targets: ${targetInfos.length}`);
  
  // Create a context to get a page for profiling
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("about:blank");
  const pageCdp = await context.newCDPSession(page);
  
  // We'll collect profiles from pages that Vitest creates
  const profiles: CPUProfile[] = [];
  
  // Listen for new targets (pages) that Vitest creates
  browserCdp.on("Target.targetCreated", async (event: any) => {
    if (event.targetInfo.type === "page" && event.targetInfo.url.includes("vitest")) {
      console.log(`   Found Vitest page: ${event.targetInfo.url}`);
    }
  });
  
  await browserCdp.send("Target.setDiscoverTargets", { discover: true });

  console.log(`🎬 Starting profiler and running tests...\n`);
  
  // Start profiling on our page (will capture renderer process activity)
  await pageCdp.send("Profiler.enable");
  await pageCdp.send("Profiler.setSamplingInterval", { interval: 100 });
  await pageCdp.send("Profiler.start");
  
  const startTime = Date.now();

  // Run the browsertest script (which will run vitest)
  const browsertestArgs = [testFile];
  if (testPattern) browsertestArgs.push("-t", testPattern);

  const browsertest = spawn("./scripts/browsertest", browsertestArgs, {
    cwd: path.join(monorepoRoot, "elements"),
    stdio: "inherit",
    shell: true,
  });

  await new Promise<void>((resolve) => {
    browsertest.on("close", () => resolve());
    browsertest.on("error", () => resolve());
  });

  const wallClockMs = Date.now() - startTime;

  // Stop profiling
  const { profile } = await pageCdp.send("Profiler.stop") as { profile: CPUProfile };
  await pageCdp.send("Profiler.disable");

  console.log(`\n⏱️  Tests completed in ${(wallClockMs / 1000).toFixed(2)}s`);

  // Check if we got meaningful data
  const nonIdleSamples = profile.nodes.filter(n => 
    n.callFrame.functionName !== "(idle)" && n.callFrame.functionName !== "(program)"
  );
  
  if (nonIdleSamples.length < 10) {
    console.log(`\n⚠️  Profile captured mostly idle time (${nonIdleSamples.length} non-idle samples)`);
    console.log(`   This happens because profiling is per-renderer process.`);
    console.log(`   Vitest runs in a different renderer process than our profiling page.`);
    console.log(`\n💡 Alternative profiling methods:`);
    console.log(`   1. Use Chrome DevTools manually:`);
    console.log(`      - Open chrome://inspect in Chrome`);
    console.log(`      - Find the Vitest test page under "Remote Target"`);
    console.log(`      - Click "inspect" and use the Performance tab`);
    console.log(`   2. Add performance.mark/measure in test code`);
    console.log(`   3. Use the console timing output from captureBatch`);
  }

  // Save profile anyway
  const fullOutputPath = path.resolve(path.join(monorepoRoot, "elements"), outputPath);
  fs.writeFileSync(fullOutputPath, JSON.stringify(profile, null, 2));
  console.log(`\n💾 Profile saved to: ${fullOutputPath}`);

  // Analyze if we have data
  if (nonIdleSamples.length >= 10) {
    sourceMapResolver = new SourceMapResolver();
    await printProfileAnalysis(profile, focusFile, wallClockMs);
  }

  await page.close();
  await context.close();

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
  const hitCounts = new Map<number, number>();
  for (const sample of profile.samples) {
    hitCounts.set(sample, (hitCounts.get(sample) || 0) + 1);
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

  interface Hotspot { functionName: string; file: string; line: number; selfTimeMs: number; selfTimePct: number; }
  const hotspots: Hotspot[] = [];
  
  for (const node of profile.nodes) {
    const hitCount = hitCounts.get(node.id) || 0;
    if (hitCount === 0) continue;
    const selfTimeMs = hitCount * sampleIntervalUs / 1000;
    const resolved = resolvedLocations.get(node.id);
    hotspots.push({
      functionName: node.callFrame.functionName || "(anonymous)",
      file: resolved?.source || node.callFrame.url?.split("/").slice(-1)[0]?.split("?")[0] || "(native)",
      line: resolved?.line ?? (node.callFrame.lineNumber + 1),
      selfTimeMs,
      selfTimePct: (hitCount / totalSamples) * 100,
    });
  }
  hotspots.sort((a, b) => b.selfTimeMs - a.selfTimeMs);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Wall: ${wallClockMs}ms | Profile: ${profileTimeMs.toFixed(1)}ms | Samples: ${totalSamples}`);

  const byFile = new Map<string, number>();
  for (const h of hotspots) byFile.set(h.file, (byFile.get(h.file) || 0) + h.selfTimeMs);
  
  console.log(`\n--- BY FILE ---`);
  for (const [file, time] of Array.from(byFile.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${time.toFixed(1).padStart(7)}ms (${(time/profileTimeMs*100).toFixed(1).padStart(5)}%)  ${file}`);
  }

  const ourCode = hotspots.filter(h => h.file.includes(".ts") && !h.file.includes("node_modules"));
  if (ourCode.length > 0) {
    console.log(`\n--- OUR CODE ---`);
    for (const h of ourCode.slice(0, 15)) {
      console.log(`  ${h.selfTimeMs.toFixed(1).padStart(7)}ms  ${h.functionName.slice(0,30).padEnd(30)} ${h.file}:${h.line}`);
    }
  }
  console.log(`${"=".repeat(70)}`);
}

main().catch((error) => { console.error("Error:", error); process.exit(1); });
