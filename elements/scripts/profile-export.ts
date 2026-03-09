#!/usr/bin/env npx ts-node
/**
 * CPU Profiling Harness for Video Export
 *
 * Captures Chrome DevTools CPU profiles during export to identify hotspots.
 *
 * Usage:
 *   npx tsx scripts/profile-export.ts [options]
 *
 * Options:
 *   --project <name>   Dev project to profile (default: design-catalog)
 *   --duration <ms>    Max export duration in ms (default: 30000)
 *   --output <path>    Output path for .cpuprofile file (default: ./export-profile.cpuprofile)
 *   --focus <file>     Focus line-level profiling on specific file (e.g., renderTimegroupPreview.ts)
 *   --headless         Run in headless mode (default: false)
 *   --benchmark        Skip video encoding (measure pure rendering speed)
 *   --no-native        Disable native HTML-in-Canvas API, use foreignObject fallback
 *
 * Examples:
 *   npx tsx scripts/profile-export.ts --focus renderTimegroupPreview
 *   npx tsx scripts/profile-export.ts --focus syncStyles --duration 5000
 *
 * Output:
 *   - .cpuprofile file that can be loaded in Chrome DevTools
 *   - Console summary of top hotspots
 *   - Line-level profiling for focused files (shows which lines are hot)
 */

import { chromium, type Browser, type Page, type CDPSession } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
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
  positionTicks?: { line: number; ticks: number }[];
}

interface CPUProfile {
  nodes: ProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

interface HotspotInfo {
  functionName: string;
  url: string;
  line: number;
  selfTime: number;
  totalTime: number;
  hitCount: number;
}

/** Resolved source location after applying source maps */
interface ResolvedLocation {
  source: string; // Original source file path (e.g., "renderTimegroupPreview.ts")
  line: number; // Original line number
  column: number; // Original column number
  name: string | null; // Original symbol name (if available)
}

/** Cache for fetched and parsed source maps */
class SourceMapResolver {
  private traceMaps = new Map<string, TraceMap | null>();
  private fetchCache = new Map<string, Promise<string | null>>();
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /** Fetch text from URL with caching */
  private async fetchText(url: string): Promise<string | null> {
    if (this.fetchCache.has(url)) {
      return this.fetchCache.get(url)!;
    }
    const promise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.text();
      } catch {
        return null;
      }
    })();
    this.fetchCache.set(url, promise);
    return promise;
  }

  /** Get or load source map for a script URL */
  async getTraceMap(scriptUrl: string): Promise<TraceMap | null> {
    if (this.traceMaps.has(scriptUrl)) {
      return this.traceMaps.get(scriptUrl)!;
    }

    // Fetch the script to find sourceMappingURL
    const scriptContent = await this.fetchText(scriptUrl);
    if (!scriptContent) {
      this.traceMaps.set(scriptUrl, null);
      return null;
    }

    // Extract sourceMappingURL from the script
    const match = scriptContent.match(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/);
    if (!match) {
      this.traceMaps.set(scriptUrl, null);
      return null;
    }

    // Resolve source map URL (could be relative or absolute)
    let sourceMapUrl = match[1];
    if (!sourceMapUrl.startsWith("http") && !sourceMapUrl.startsWith("data:")) {
      // Relative URL - resolve against script URL
      const scriptBase = scriptUrl.substring(0, scriptUrl.lastIndexOf("/") + 1);
      sourceMapUrl = scriptBase + sourceMapUrl;
    }

    // Handle data: URLs (inline source maps)
    let sourceMapJson: string | null;
    if (sourceMapUrl.startsWith("data:")) {
      const dataMatch = sourceMapUrl.match(/^data:[^,]*base64,(.*)$/);
      if (dataMatch) {
        sourceMapJson = Buffer.from(dataMatch[1], "base64").toString("utf-8");
      } else {
        sourceMapJson = null;
      }
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

  /** Resolve original source location for a bundled position */
  async resolve(
    scriptUrl: string,
    line0Based: number,
    column: number,
  ): Promise<ResolvedLocation | null> {
    const traceMap = await this.getTraceMap(scriptUrl);
    if (!traceMap) return null;

    // V8 uses 0-based lines, trace-mapping also uses 0-based internally
    // but the input line must be >= 0
    if (line0Based < 0) return null;

    try {
      const result = originalPositionFor(traceMap, {
        line: line0Based,
        column,
      });

      if (!result.source) return null;

      // Extract just the filename from the source path
      const sourcePath = result.source;
      const sourceFile = sourcePath.split("/").pop() || sourcePath;

      // result.line is 1-based (from the source map)
      return {
        source: sourceFile,
        line: result.line ?? line0Based + 1,
        column: result.column ?? column,
        name: result.name,
      };
    } catch {
      return null;
    }
  }
}

/** Global source map resolver instance */
let sourceMapResolver: SourceMapResolver | null = null;

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const getArg = (name: string, defaultValue: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  const project = getArg("project", "design-catalog");
  const maxDuration = parseInt(getArg("duration", "30000"), 10);
  const outputPath = getArg("output", "./export-profile.cpuprofile");
  const headless = hasFlag("headless");
  const focusFile = getArg("focus", "");
  const benchmarkMode = hasFlag("benchmark");
  const disableNativeApi = hasFlag("no-native");

  console.log(`\n🔬 Export Profiling Harness`);
  console.log(`   Project: ${project}`);
  console.log(`   Max duration: ${maxDuration}ms`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Headless: ${headless}`);
  if (focusFile) {
    console.log(`   Focus: ${focusFile}`);
  }
  if (benchmarkMode) {
    console.log(`   BENCHMARK MODE: Skipping video encoding`);
  }
  if (disableNativeApi) {
    console.log(`   Native API: DISABLED (using foreignObject fallback)`);
  }
  console.log();

  // Find monorepo root
  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) {
    console.error("Could not find monorepo root");
    process.exit(1);
  }

  // Check if browser server is running
  const wsEndpointPath = path.join(monorepoRoot, ".wsEndpoint.json");
  let browser: Browser;
  let shouldCloseBrowser = false;

  if (fs.existsSync(wsEndpointPath)) {
    const { wsEndpoint } = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
    console.log(`📡 Connecting to existing browser: ${wsEndpoint}`);
    browser = await chromium.connect(wsEndpoint);
  } else {
    console.log(`🚀 Launching new browser...`);
    browser = await chromium.launch({
      headless,
      channel: "chrome",
      args: ["--autoplay-policy=no-user-gesture-required", "--enable-features=CanvasDrawElement"],
    });
    shouldCloseBrowser = true;
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  page.on("console", (msg) => {
    const text = msg.text();
    // Only show our debug logs and renderToVideo logs
    if (
      text.includes("[renderToVideo]") ||
      text.includes("[renderToImage]") ||
      text.includes("DEBUG")
    ) {
      console.log(`[browser] ${text}`);
    }
  });

  // Enable CDP for profiling
  const cdp = await context.newCDPSession(page);

  try {
    // Navigate to dev project (no trailing slash!)
    const devUrl = `http://main.localhost:4321/${project}`;
    console.log(`📄 Loading ${devUrl}...`);
    await page.goto(devUrl, { waitUntil: "networkidle", timeout: 60000 });

    // Set or clear native API preference
    if (disableNativeApi) {
      await page.evaluate(() => {
        localStorage.setItem("ef-preview-native-canvas-api-enabled", "false");
      });
      await page.reload({ waitUntil: "networkidle", timeout: 60000 });
      console.log(`🔧 Native API disabled, using foreignObject fallback`);
    } else {
      // Clear any previously-set disable flag so native mode works
      await page.evaluate(() => {
        localStorage.removeItem("ef-preview-native-canvas-api-enabled");
      });
    }

    // Wait for timegroup to be ready
    console.log(`⏳ Waiting for timegroup...`);
    await page.waitForSelector("ef-timegroup", { timeout: 30000 });
    await page.waitForFunction(
      () => {
        const tg = document.querySelector("ef-timegroup") as any;
        return tg && tg.durationMs > 0;
      },
      { timeout: 30000 },
    );

    // Get timegroup info
    const timegroupInfo = await page.evaluate(() => {
      const tg = document.querySelector("ef-timegroup") as any;
      return {
        durationMs: tg.durationMs,
        width: tg.offsetWidth,
        height: tg.offsetHeight,
      };
    });
    console.log(
      `✅ Timegroup ready: ${timegroupInfo.width}x${timegroupInfo.height}, ${timegroupInfo.durationMs}ms`,
    );

    // Enable profiler
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 100 }); // 100µs sampling

    // Quick benchmark: VideoFrame creation speed from different canvas types
    const vfBenchmark = await page.evaluate(async () => {
      const width = 1920,
        height = 1080;
      const iterations = 50;

      // HTMLCanvasElement
      const htmlCanvas = document.createElement("canvas");
      htmlCanvas.width = width;
      htmlCanvas.height = height;
      const htmlCtx = htmlCanvas.getContext("2d")!;
      htmlCtx.fillStyle = "red";
      htmlCtx.fillRect(0, 0, width, height);

      // OffscreenCanvas
      const offscreen = new OffscreenCanvas(width, height);
      const offCtx = offscreen.getContext("2d")!;
      offCtx.fillStyle = "blue";
      offCtx.fillRect(0, 0, width, height);

      // Benchmark HTMLCanvasElement → VideoFrame
      const htmlStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const vf = new VideoFrame(htmlCanvas, { timestamp: i * 33333 });
        vf.close();
      }
      const htmlTime = performance.now() - htmlStart;

      // Benchmark OffscreenCanvas → VideoFrame
      const offStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const vf = new VideoFrame(offscreen, { timestamp: i * 33333 });
        vf.close();
      }
      const offTime = performance.now() - offStart;

      return {
        html: `${htmlTime.toFixed(1)}ms (${(htmlTime / iterations).toFixed(2)}ms/frame)`,
        offscreen: `${offTime.toFixed(1)}ms (${(offTime / iterations).toFixed(2)}ms/frame)`,
      };
    });
    console.log(`\n📊 VideoFrame Creation Benchmark (${1920}x${1080}, 50 frames):`);
    console.log(`   HTMLCanvasElement → VideoFrame: ${vfBenchmark.html}`);
    console.log(`   OffscreenCanvas → VideoFrame:   ${vfBenchmark.offscreen}`);

    console.log(`\n🎬 Starting CPU profile and export...`);
    await cdp.send("Profiler.start");

    // Trigger export via workbench
    const exportStartTime = Date.now();

    // Mock file picker to avoid dialog
    await page.evaluate(() => {
      // @ts-ignore
      window.showSaveFilePicker = async () => ({
        createWritable: async () => ({
          write: async () => {},
          close: async () => {},
        }),
      });
    });

    // Trigger export directly on timegroup (skip workbench to get buffer back)
    const exportPromise = page.evaluate(
      async ({ maxDur, benchmark }) => {
        const timegroup = document.querySelector("ef-timegroup") as any;
        if (timegroup?.renderToVideo) {
          try {
            const exportDuration = timegroup.durationMs;
            const buffer = await timegroup.renderToVideo({
              toMs: exportDuration,
              streaming: false,
              includeAudio: true,
              returnBuffer: true,
              benchmarkMode: benchmark,
              contentReadyMode: "immediate",
            });
            if (buffer) {
              return {
                success: true,
                videoBuffer: Array.from(new Uint8Array(buffer)),
              };
            }
            return { success: true };
          } catch (e: any) {
            return {
              success: false,
              error: `${e.name}: ${e.message}\n${e.stack}`,
            };
          }
        }

        return { success: false, error: "No export method found" };
      },
      { maxDur: maxDuration, benchmark: benchmarkMode },
    );

    // Wait for export with timeout (use 10x the max duration to allow for encoding time)
    const exportTimeout = Math.max(maxDuration * 10, 60000);
    const result = await Promise.race([
      exportPromise,
      new Promise<{ success: false; error: string }>((resolve) =>
        setTimeout(() => resolve({ success: false, error: "Timeout" }), exportTimeout),
      ),
    ]);

    const exportDuration = Date.now() - exportStartTime;
    console.log(`⏱️  Export completed in ${(exportDuration / 1000).toFixed(2)}s`);
    console.log(`   Result keys: ${Object.keys(result).join(", ")}`);
    if ((result as any).videoBuffer) {
      console.log(`   Video buffer size: ${(result as any).videoBuffer.length} bytes`);
    }

    // Stop profiler and get results
    const { profile } = (await cdp.send("Profiler.stop")) as {
      profile: CPUProfile;
    };
    await cdp.send("Profiler.disable");

    // Save raw profile
    const profileJson = JSON.stringify(profile, null, 2);
    fs.writeFileSync(outputPath, profileJson);
    console.log(`\n💾 Profile saved to: ${outputPath}`);
    console.log(
      `   Load in Chrome DevTools: chrome://inspect → Open dedicated DevTools → Performance → Load profile`,
    );

    // Initialize source map resolver
    sourceMapResolver = new SourceMapResolver(devUrl);
    console.log(`\n🗺️  Resolving source maps...`);

    // Pre-fetch source maps for all unique script URLs in the profile
    const scriptUrls = new Set<string>();
    for (const node of profile.nodes) {
      if (node.callFrame.url && node.callFrame.url.startsWith("http")) {
        scriptUrls.add(node.callFrame.url.split("?")[0]); // Strip query params
      }
    }

    let resolvedCount = 0;
    for (const url of scriptUrls) {
      const traceMap = await sourceMapResolver.getTraceMap(url);
      if (traceMap) resolvedCount++;
    }
    console.log(`   Loaded ${resolvedCount}/${scriptUrls.size} source maps`);

    // Analyze and print hotspots
    console.log(`\n📊 Top Hotspots:`);
    const hotspots = await analyzeProfile(profile);

    // Filter to our code
    const ourCode = hotspots.filter(
      (h) =>
        h.url.includes("/elements/") ||
        h.url.includes("renderTimegroup") ||
        h.url.includes("preview/"),
    );

    console.log(`\n   === Our Code ===`);
    printHotspots(ourCode.slice(0, 20));

    // Print detailed analysis with actionable items
    await printDetailedAnalysis(profile, focusFile);

    if (!result.success) {
      console.warn(`\n⚠️  Export may not have completed: ${result.error}`);
    }

    // Save video buffer if returned
    if ((result as any).videoBuffer) {
      const videoPath = path.join(__dirname, "../profile-export-test.mp4");
      const videoBuffer = Buffer.from((result as any).videoBuffer);
      fs.writeFileSync(videoPath, videoBuffer);
      console.log(`\n🎬 Video saved to: ${videoPath}`);
    }
  } finally {
    // Close page and context quickly - don't wait for cleanup
    page.close().catch(() => {});
    context.close().catch(() => {});
    if (shouldCloseBrowser) {
      browser.close().catch(() => {});
    }
  }

  console.log(`\n✅ Profiling complete!`);

  // Force exit immediately - don't wait for any pending cleanup
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

interface DetailedHotspot {
  functionName: string;
  file: string; // Resolved source file (e.g., "renderTimegroupPreview.ts")
  url: string; // Original bundled URL
  line: number; // Resolved source line
  column: number; // Resolved source column
  bundledLine: number; // Original bundled line (for debugging)
  bundledColumn: number; // Original bundled column
  selfTimeMs: number;
  selfTimePct: number;
  hitCount: number;
  callers: string[];
  positionTicks: { line: number; ticks: number; resolvedLine?: number }[]; // line is resolved
}

interface LineTiming {
  line: number;
  ticks: number;
  timeMs: number;
  timePct: number;
}

async function analyzeProfileDetailed(profile: CPUProfile): Promise<{
  hotspots: DetailedHotspot[];
  totalTimeMs: number;
  sampleIntervalUs: number;
  callGraph: Map<string, Map<string, number>>;
}> {
  const nodeMap = new Map<number, ProfileNode>();
  const nodeChildren = new Map<number, number[]>();

  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
    if (node.children) {
      nodeChildren.set(node.id, node.children);
    }
  }

  // Build parent map for call graph
  const parentMap = new Map<number, number>();
  for (const [parentId, children] of nodeChildren) {
    for (const childId of children) {
      parentMap.set(childId, parentId);
    }
  }

  // Calculate hit counts from samples
  const hitCounts = new Map<number, number>();
  for (const sample of profile.samples) {
    hitCounts.set(sample, (hitCounts.get(sample) || 0) + 1);
  }

  // Sample interval in microseconds
  const sampleIntervalUs =
    profile.timeDeltas.length > 0
      ? profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.timeDeltas.length
      : 1000;

  const totalSamples = profile.samples.length;
  const totalTimeMs = (totalSamples * sampleIntervalUs) / 1000;

  // Resolve source locations for all nodes (batch for efficiency)
  const resolvedLocations = new Map<number, ResolvedLocation | null>();
  if (sourceMapResolver) {
    for (const node of profile.nodes) {
      if (node.callFrame.url && node.callFrame.url.startsWith("http")) {
        const scriptUrl = node.callFrame.url.split("?")[0];
        const resolved = await sourceMapResolver.resolve(
          scriptUrl,
          node.callFrame.lineNumber,
          node.callFrame.columnNumber,
        );
        resolvedLocations.set(node.id, resolved);
      }
    }
  }

  // Build call graph: caller -> callee -> count
  const callGraph = new Map<string, Map<string, number>>();

  const getNodeKey = (node: ProfileNode) => {
    const resolved = resolvedLocations.get(node.id);
    if (resolved) {
      return `${node.callFrame.functionName || "(anonymous)"} @ ${resolved.source}:${resolved.line}`;
    }
    const file = node.callFrame.url?.split("/").slice(-1)[0]?.split("?")[0] || "(native)";
    return `${node.callFrame.functionName || "(anonymous)"} @ ${file}:${node.callFrame.lineNumber + 1}`;
  };

  // Track callers for each node
  const callerMap = new Map<number, Set<string>>();

  for (const sample of profile.samples) {
    let nodeId: number | undefined = sample;
    let childKey: string | undefined;

    while (nodeId !== undefined) {
      const node = nodeMap.get(nodeId);
      if (!node) break;

      const key = getNodeKey(node);

      if (childKey) {
        // Record call edge
        if (!callGraph.has(key)) callGraph.set(key, new Map());
        const edges = callGraph.get(key)!;
        edges.set(childKey, (edges.get(childKey) || 0) + 1);
      }

      // Track callers
      if (!callerMap.has(sample)) callerMap.set(sample, new Set());
      if (nodeId !== sample) {
        callerMap.get(sample)!.add(key);
      }

      childKey = key;
      nodeId = parentMap.get(nodeId);
    }
  }

  // Build hotspots with caller info
  const hotspots: DetailedHotspot[] = [];

  for (const node of profile.nodes) {
    const hitCount = hitCounts.get(node.id) || 0;
    if (hitCount === 0) continue;

    const selfTimeMs = (hitCount * sampleIntervalUs) / 1000;
    const selfTimePct = (hitCount / totalSamples) * 100;

    // Use resolved location if available
    const resolved = resolvedLocations.get(node.id);
    const file =
      resolved?.source || node.callFrame.url?.split("/").slice(-1)[0]?.split("?")[0] || "(native)";
    const line = resolved?.line ?? node.callFrame.lineNumber + 1;
    const column = resolved?.column ?? node.callFrame.columnNumber + 1;

    // Get unique callers
    const callers: string[] = [];
    const callerSet = callerMap.get(node.id);
    if (callerSet) {
      callers.push(...Array.from(callerSet).slice(0, 3));
    }

    // Resolve positionTicks line numbers too
    const resolvedPositionTicks: {
      line: number;
      ticks: number;
      resolvedLine?: number;
    }[] = [];
    if (node.positionTicks && sourceMapResolver && node.callFrame.url) {
      const scriptUrl = node.callFrame.url.split("?")[0];
      for (const pt of node.positionTicks) {
        // positionTicks lines are 1-based in V8, need to convert to 0-based for resolution
        const resolvedPt = await sourceMapResolver.resolve(scriptUrl, pt.line - 1, 0);
        resolvedPositionTicks.push({
          line: resolvedPt?.line ?? pt.line,
          ticks: pt.ticks,
          resolvedLine: resolvedPt?.line,
        });
      }
    } else if (node.positionTicks) {
      for (const pt of node.positionTicks) {
        resolvedPositionTicks.push({ line: pt.line, ticks: pt.ticks });
      }
    }

    hotspots.push({
      functionName: node.callFrame.functionName || "(anonymous)",
      file,
      url: node.callFrame.url || "",
      line,
      column,
      bundledLine: node.callFrame.lineNumber + 1,
      bundledColumn: node.callFrame.columnNumber + 1,
      selfTimeMs,
      selfTimePct,
      hitCount,
      callers,
      positionTicks: resolvedPositionTicks,
    });
  }

  hotspots.sort((a, b) => b.selfTimeMs - a.selfTimeMs);

  return { hotspots, totalTimeMs, sampleIntervalUs, callGraph };
}

async function analyzeProfile(profile: CPUProfile): Promise<HotspotInfo[]> {
  const { hotspots } = await analyzeProfileDetailed(profile);
  return hotspots.map((h) => ({
    functionName: h.functionName,
    url: h.file,
    line: h.line,
    selfTime: h.selfTimeMs,
    totalTime: h.selfTimeMs,
    hitCount: h.hitCount,
  }));
}

function printHotspots(hotspots: HotspotInfo[]) {
  for (const h of hotspots) {
    const shortUrl = h.url.split("/").slice(-2).join("/");
    const location = h.url ? `${shortUrl}:${h.line}` : "(native)";
    console.log(
      `   ${h.selfTime.toFixed(1).padStart(7)}ms  ${h.functionName.slice(0, 40).padEnd(40)} ${location}`,
    );
  }
}

async function printDetailedAnalysis(profile: CPUProfile, focusFile: string = "") {
  const { hotspots, totalTimeMs, sampleIntervalUs } = await analyzeProfileDetailed(profile);

  console.log(`\n${"=".repeat(80)}`);
  console.log(`DETAILED PROFILE ANALYSIS`);
  console.log(`${"=".repeat(80)}`);
  console.log(`Total profile time: ${totalTimeMs.toFixed(1)}ms`);
  console.log(`Sample interval: ${sampleIntervalUs.toFixed(0)}µs`);
  console.log(`Total samples: ${profile.samples.length}`);

  // Filter to our code
  const ourCode = hotspots.filter(
    (h) =>
      h.file.includes(".ts") &&
      !h.file.includes("node_modules") &&
      (h.file.includes("render") ||
        h.file.includes("preview") ||
        h.file.includes("element") ||
        h.file.includes("sync")),
  );

  const nativeCode = hotspots.filter((h) => h.file === "(native)" || !h.file.includes(".ts"));

  // Summary by file
  const byFile = new Map<string, number>();
  for (const h of hotspots) {
    byFile.set(h.file, (byFile.get(h.file) || 0) + h.selfTimeMs);
  }
  const sortedFiles = Array.from(byFile.entries()).sort((a, b) => b[1] - a[1]);

  console.log(`\n--- TIME BY FILE ---`);
  for (const [file, time] of sortedFiles.slice(0, 15)) {
    const pct = ((time / totalTimeMs) * 100).toFixed(1);
    console.log(`  ${time.toFixed(1).padStart(8)}ms (${pct.padStart(5)}%)  ${file}`);
  }

  // LINE-LEVEL PROFILING for focused file or auto-detected hot files
  const focusedFiles = focusFile
    ? hotspots.filter((h) => h.file.includes(focusFile) || h.url.includes(focusFile))
    : ourCode.filter((h) => h.selfTimeMs > 50); // Auto-focus on hot functions

  if (focusedFiles.length > 0) {
    console.log(`\n--- LINE-LEVEL PROFILING ---`);

    // Group by file
    const byFileDetailed = new Map<string, DetailedHotspot[]>();
    for (const h of focusedFiles) {
      const key = h.file;
      if (!byFileDetailed.has(key)) byFileDetailed.set(key, []);
      byFileDetailed.get(key)!.push(h);
    }

    for (const [file, fileHotspots] of byFileDetailed) {
      // Aggregate line-level data across all functions in this file
      const lineData = new Map<number, { ticks: number; functions: string[] }>();
      let fileTotalTicks = 0;

      for (const h of fileHotspots) {
        // Add function's own line
        if (h.hitCount > 0) {
          if (!lineData.has(h.line)) lineData.set(h.line, { ticks: 0, functions: [] });
          const ld = lineData.get(h.line)!;
          ld.ticks += h.hitCount;
          if (!ld.functions.includes(h.functionName)) ld.functions.push(h.functionName);
          fileTotalTicks += h.hitCount;
        }

        // Add positionTicks data (line-level detail within function)
        for (const pt of h.positionTicks) {
          if (!lineData.has(pt.line)) lineData.set(pt.line, { ticks: 0, functions: [] });
          const ld = lineData.get(pt.line)!;
          ld.ticks += pt.ticks;
          if (!ld.functions.includes(h.functionName)) ld.functions.push(h.functionName);
          fileTotalTicks += pt.ticks;
        }
      }

      if (lineData.size === 0) continue;

      const fileTimeMs = (fileTotalTicks * sampleIntervalUs) / 1000;
      const filePct = ((fileTimeMs / totalTimeMs) * 100).toFixed(1);
      console.log(`\n  📄 ${file} (${fileTimeMs.toFixed(1)}ms, ${filePct}%)`);

      // Sort lines by ticks descending
      const sortedLines = Array.from(lineData.entries())
        .sort((a, b) => b[1].ticks - a[1].ticks)
        .slice(0, 25);

      console.log(
        `  ${"Line".padStart(6)}  ${"Time".padStart(8)}  ${"Pct".padStart(6)}  Function/Context`,
      );
      console.log(`  ${"-".repeat(6)}  ${"-".repeat(8)}  ${"-".repeat(6)}  ${"-".repeat(40)}`);

      for (const [line, data] of sortedLines) {
        const lineTimeMs = (data.ticks * sampleIntervalUs) / 1000;
        const linePct = ((lineTimeMs / totalTimeMs) * 100).toFixed(1);
        const funcNames = data.functions.slice(0, 2).join(", ");
        console.log(
          `  ${String(line).padStart(6)}  ${lineTimeMs.toFixed(1).padStart(7)}ms  ${linePct.padStart(5)}%  ${funcNames}`,
        );
      }
    }
  }

  // Detailed hotspots with context
  console.log(`\n--- TOP HOTSPOTS IN OUR CODE (with callers) ---`);
  for (const h of ourCode.slice(0, 20)) {
    const pct = h.selfTimePct.toFixed(1);
    console.log(`\n  ${h.selfTimeMs.toFixed(1)}ms (${pct}%) - ${h.functionName}`);
    console.log(`    Location: ${h.file}:${h.line}:${h.column}`);
    if (h.callers.length > 0) {
      console.log(`    Called by: ${h.callers.slice(0, 2).join(", ")}`);
    }
    // Show line-level breakdown if available
    if (h.positionTicks.length > 0) {
      const sortedTicks = [...h.positionTicks].sort((a, b) => b.ticks - a.ticks).slice(0, 5);
      console.log(`    Hot lines:`);
      for (const pt of sortedTicks) {
        const lineTimeMs = (pt.ticks * sampleIntervalUs) / 1000;
        console.log(`      L${pt.line}: ${lineTimeMs.toFixed(1)}ms (${pt.ticks} samples)`);
      }
    }
  }

  // Native API breakdown
  console.log(`\n--- NATIVE API TIME ---`);
  const nativeByName = new Map<string, number>();
  for (const h of nativeCode) {
    nativeByName.set(h.functionName, (nativeByName.get(h.functionName) || 0) + h.selfTimeMs);
  }
  const sortedNative = Array.from(nativeByName.entries()).sort((a, b) => b[1] - a[1]);
  for (const [name, time] of sortedNative.slice(0, 15)) {
    const pct = ((time / totalTimeMs) * 100).toFixed(1);
    console.log(`  ${time.toFixed(1).padStart(8)}ms (${pct.padStart(5)}%)  ${name}`);
  }

  // Actionable summary
  console.log(`\n--- ACTIONABLE OPTIMIZATION TARGETS ---`);

  // Find biggest optimization opportunities
  const opportunities: {
    description: string;
    timeMs: number;
    suggestion: string;
  }[] = [];

  // Check for expensive native calls
  const getAnimationsTime = nativeByName.get("getAnimations") || 0;
  if (getAnimationsTime > 100) {
    opportunities.push({
      description: "getAnimations() calls",
      timeMs: getAnimationsTime,
      suggestion: "Cache animations or use animation tracking to avoid repeated discovery",
    });
  }

  const appendChildTime = nativeByName.get("appendChild") || 0;
  const removeChildTime = nativeByName.get("removeChild") || 0;
  if (appendChildTime + removeChildTime > 50) {
    opportunities.push({
      description: "DOM manipulation (appendChild/removeChild)",
      timeMs: appendChildTime + removeChildTime,
      suggestion: "Reuse DOM elements instead of creating/destroying per frame",
    });
  }

  const gcTime = nativeByName.get("(garbage collector)") || 0;
  if (gcTime > 100) {
    opportunities.push({
      description: "Garbage collection",
      timeMs: gcTime,
      suggestion: "Reduce allocations by reusing objects/arrays",
    });
  }

  // Check for hot functions in our code
  for (const h of ourCode.slice(0, 5)) {
    if (h.selfTimeMs > 100) {
      opportunities.push({
        description: `${h.functionName} in ${h.file}:${h.line}`,
        timeMs: h.selfTimeMs,
        suggestion: `Optimize this function - ${h.selfTimePct.toFixed(1)}% of total time`,
      });
    }
  }

  opportunities.sort((a, b) => b.timeMs - a.timeMs);

  for (const opp of opportunities) {
    console.log(`\n  🎯 ${opp.description}: ${opp.timeMs.toFixed(1)}ms`);
    console.log(`     → ${opp.suggestion}`);
  }

  if (opportunities.length === 0) {
    console.log(`  ✅ No major optimization opportunities found!`);
  }

  console.log(`\n${"=".repeat(80)}\n`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
