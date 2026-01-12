#!/usr/bin/env npx ts-node
/**
 * CPU Profiling Harness for Playback Performance
 * 
 * Captures Chrome DevTools CPU profiles during playback to identify hotspots.
 * 
 * Usage:
 *   npx tsx scripts/profile-playback.ts [options]
 * 
 * Options:
 *   --project <name>   Dev project to profile (default: improv-edit)
 *   --duration <ms>    Playback duration in ms (default: 5000)
 *   --output <path>    Output path for .cpuprofile file (default: ./playback-profile.cpuprofile)
 *   --focus <file>     Focus line-level profiling on specific file
 *   --headless         Run in headless mode (default: false)
 * 
 * Examples:
 *   npx tsx scripts/profile-playback.ts
 *   npx tsx scripts/profile-playback.ts --duration 10000 --focus EFTimegroup
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
  source: string;
  line: number;
  column: number;
  name: string | null;
}

/** Cache for fetched and parsed source maps */
class SourceMapResolver {
  private traceMaps = new Map<string, TraceMap | null>();
  private fetchCache = new Map<string, Promise<string | null>>();
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
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
  
  async getTraceMap(scriptUrl: string): Promise<TraceMap | null> {
    if (this.traceMaps.has(scriptUrl)) {
      return this.traceMaps.get(scriptUrl)!;
    }
    
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
      const scriptBase = scriptUrl.substring(0, scriptUrl.lastIndexOf("/") + 1);
      sourceMapUrl = scriptBase + sourceMapUrl;
    }
    
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
  
  async resolve(scriptUrl: string, line0Based: number, column: number): Promise<ResolvedLocation | null> {
    const traceMap = await this.getTraceMap(scriptUrl);
    if (!traceMap) return null;
    
    if (line0Based < 0) return null;
    
    try {
      const result = originalPositionFor(traceMap, { line: line0Based, column });
      
      if (!result.source) return null;
      
      const sourcePath = result.source;
      const sourceFile = sourcePath.split("/").pop() || sourcePath;
      
      return {
        source: sourceFile,
        line: result.line ?? (line0Based + 1),
        column: result.column ?? column,
        name: result.name,
      };
    } catch {
      return null;
    }
  }
}

let sourceMapResolver: SourceMapResolver | null = null;

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string, defaultValue: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  const project = getArg("project", "improv-edit");
  const duration = parseInt(getArg("duration", "5000"), 10);
  const outputPath = getArg("output", "./playback-profile.cpuprofile");
  const headless = hasFlag("headless");
  const focusFile = getArg("focus", "");

  console.log(`\n🔬 Playback Profiling Harness`);
  console.log(`   Project: ${project}`);
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Headless: ${headless}`);
  if (focusFile) {
    console.log(`   Focus: ${focusFile}`);
  }
  console.log();

  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) {
    console.error("Could not find monorepo root");
    process.exit(1);
  }

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
      args: [
        "--autoplay-policy=no-user-gesture-required",
      ],
    });
    shouldCloseBrowser = true;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[EFTimegroup]") || text.includes("[PlaybackController]") || text.includes("DEBUG")) {
      console.log(`[browser] ${text}`);
    }
  });

  const cdp = await context.newCDPSession(page);

  try {
    const devUrl = `http://main.localhost:4321/${project}`;
    console.log(`📄 Loading ${devUrl}...`);
    await page.goto(devUrl, { waitUntil: "networkidle", timeout: 60000 });

    console.log(`⏳ Waiting for timegroup...`);
    await page.waitForSelector("ef-timegroup", { timeout: 30000 });
    await page.waitForFunction(() => {
      const tg = document.querySelector("ef-timegroup") as any;
      return tg && tg.durationMs > 0 && tg.playbackController;
    }, { timeout: 30000 });

    const timegroupInfo = await page.evaluate(() => {
      const tg = document.querySelector("ef-timegroup") as any;
      return {
        durationMs: tg.durationMs,
        width: tg.offsetWidth,
        height: tg.offsetHeight,
        currentTimeMs: tg.currentTimeMs,
      };
    });
    console.log(`✅ Timegroup ready: ${timegroupInfo.width}x${timegroupInfo.height}, ${timegroupInfo.durationMs}ms`);
    console.log(`   Current time: ${timegroupInfo.currentTimeMs}ms`);

    // Enable profiler
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 100 });

    console.log(`\n🎬 Starting playback and CPU profile...`);
    await cdp.send("Profiler.start");

    // Start playback
    const playbackStartTime = Date.now();
    await page.evaluate(async ({ duration }) => {
      const timegroup = document.querySelector("ef-timegroup") as any;
      if (!timegroup) {
        throw new Error("Timegroup not found");
      }
      
      // Start playback
      timegroup.play();
      
      // Wait for the specified duration
      await new Promise(resolve => setTimeout(resolve, duration));
      
      // Pause playback
      timegroup.pause();
    }, { duration });

    const playbackDuration = Date.now() - playbackStartTime;
    console.log(`⏱️  Playback completed in ${(playbackDuration / 1000).toFixed(2)}s`);

    // Stop profiler and get results
    const { profile } = await cdp.send("Profiler.stop") as { profile: CPUProfile };
    await cdp.send("Profiler.disable");

    // Save raw profile
    const profileJson = JSON.stringify(profile, null, 2);
    fs.writeFileSync(outputPath, profileJson);
    console.log(`\n💾 Profile saved to: ${outputPath}`);
    console.log(`   Load in Chrome DevTools: chrome://inspect → Open dedicated DevTools → Performance → Load profile`);

    // Initialize source map resolver
    sourceMapResolver = new SourceMapResolver(devUrl);
    console.log(`\n🗺️  Resolving source maps...`);
    
    const scriptUrls = new Set<string>();
    for (const node of profile.nodes) {
      if (node.callFrame.url && node.callFrame.url.startsWith("http")) {
        scriptUrls.add(node.callFrame.url.split("?")[0]);
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
    
    const ourCode = hotspots.filter(h => 
      h.url.includes("/elements/") || 
      h.url.includes("EFTimegroup") ||
      h.url.includes("PlaybackController") ||
      h.url.includes("preview/")
    );

    console.log(`\n   === Our Code ===`);
    printHotspots(ourCode.slice(0, 20));

    // Print detailed analysis
    await printDetailedAnalysis(profile, focusFile);

  } finally {
    page.close().catch(() => {});
    context.close().catch(() => {});
    if (shouldCloseBrowser) {
      browser.close().catch(() => {});
    }
  }

  console.log(`\n✅ Profiling complete!`);
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
  file: string;
  url: string;
  line: number;
  column: number;
  bundledLine: number;
  bundledColumn: number;
  selfTimeMs: number;
  selfTimePct: number;
  hitCount: number;
  callers: string[];
  positionTicks: { line: number; ticks: number; resolvedLine?: number }[];
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

  const parentMap = new Map<number, number>();
  for (const [parentId, children] of nodeChildren) {
    for (const childId of children) {
      parentMap.set(childId, parentId);
    }
  }

  const hitCounts = new Map<number, number>();
  for (const sample of profile.samples) {
    hitCounts.set(sample, (hitCounts.get(sample) || 0) + 1);
  }

  const sampleIntervalUs = profile.timeDeltas.length > 0
    ? profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.timeDeltas.length
    : 1000;

  const totalSamples = profile.samples.length;
  const totalTimeMs = totalSamples * sampleIntervalUs / 1000;

  const resolvedLocations = new Map<number, ResolvedLocation | null>();
  if (sourceMapResolver) {
    for (const node of profile.nodes) {
      if (node.callFrame.url && node.callFrame.url.startsWith("http")) {
        const scriptUrl = node.callFrame.url.split("?")[0];
        const resolved = await sourceMapResolver.resolve(
          scriptUrl,
          node.callFrame.lineNumber,
          node.callFrame.columnNumber
        );
        resolvedLocations.set(node.id, resolved);
      }
    }
  }

  const callGraph = new Map<string, Map<string, number>>();
  
  const getNodeKey = (node: ProfileNode) => {
    const resolved = resolvedLocations.get(node.id);
    if (resolved) {
      return `${node.callFrame.functionName || "(anonymous)"} @ ${resolved.source}:${resolved.line}`;
    }
    const file = node.callFrame.url?.split("/").slice(-1)[0]?.split("?")[0] || "(native)";
    return `${node.callFrame.functionName || "(anonymous)"} @ ${file}:${node.callFrame.lineNumber + 1}`;
  };

  const callerMap = new Map<number, Set<string>>();

  for (const sample of profile.samples) {
    let nodeId: number | undefined = sample;
    let childKey: string | undefined;
    
    while (nodeId !== undefined) {
      const node = nodeMap.get(nodeId);
      if (!node) break;
      
      const key = getNodeKey(node);
      
      if (childKey) {
        if (!callGraph.has(key)) callGraph.set(key, new Map());
        const edges = callGraph.get(key)!;
        edges.set(childKey, (edges.get(childKey) || 0) + 1);
      }
      
      if (!callerMap.has(sample)) callerMap.set(sample, new Set());
      if (nodeId !== sample) {
        callerMap.get(sample)!.add(key);
      }
      
      childKey = key;
      nodeId = parentMap.get(nodeId);
    }
  }

  const hotspots: DetailedHotspot[] = [];

  for (const node of profile.nodes) {
    const hitCount = hitCounts.get(node.id) || 0;
    if (hitCount === 0) continue;

    const selfTimeMs = hitCount * sampleIntervalUs / 1000;
    const selfTimePct = (hitCount / totalSamples) * 100;
    
    const resolved = resolvedLocations.get(node.id);
    const file = resolved?.source || node.callFrame.url?.split("/").slice(-1)[0]?.split("?")[0] || "(native)";
    const line = resolved?.line ?? (node.callFrame.lineNumber + 1);
    const column = resolved?.column ?? (node.callFrame.columnNumber + 1);
    
    const callers: string[] = [];
    const callerSet = callerMap.get(node.id);
    if (callerSet) {
      callers.push(...Array.from(callerSet).slice(0, 3));
    }

    const resolvedPositionTicks: { line: number; ticks: number; resolvedLine?: number }[] = [];
    if (node.positionTicks && sourceMapResolver && node.callFrame.url) {
      const scriptUrl = node.callFrame.url.split("?")[0];
      for (const pt of node.positionTicks) {
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
  return hotspots.map(h => ({
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
    console.log(`   ${h.selfTime.toFixed(1).padStart(7)}ms  ${h.functionName.slice(0, 40).padEnd(40)} ${location}`);
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
  
  const ourCode = hotspots.filter(h => 
    h.file.includes(".ts") && 
    !h.file.includes("node_modules") &&
    (h.file.includes("EFTimegroup") || h.file.includes("PlaybackController") || h.file.includes("element") || h.file.includes("update") || h.file.includes("frame"))
  );
  
  const nativeCode = hotspots.filter(h => h.file === "(native)" || !h.file.includes(".ts"));
  
  const byFile = new Map<string, number>();
  for (const h of hotspots) {
    byFile.set(h.file, (byFile.get(h.file) || 0) + h.selfTimeMs);
  }
  const sortedFiles = Array.from(byFile.entries()).sort((a, b) => b[1] - a[1]);
  
  console.log(`\n--- TIME BY FILE ---`);
  for (const [file, time] of sortedFiles.slice(0, 15)) {
    const pct = (time / totalTimeMs * 100).toFixed(1);
    console.log(`  ${time.toFixed(1).padStart(8)}ms (${pct.padStart(5)}%)  ${file}`);
  }
  
  const focusedFiles = focusFile 
    ? hotspots.filter(h => h.file.includes(focusFile) || h.url.includes(focusFile))
    : ourCode.filter(h => h.selfTimeMs > 10);
  
  if (focusedFiles.length > 0) {
    console.log(`\n--- LINE-LEVEL PROFILING ---`);
    
    const byFileDetailed = new Map<string, DetailedHotspot[]>();
    for (const h of focusedFiles) {
      const key = h.file;
      if (!byFileDetailed.has(key)) byFileDetailed.set(key, []);
      byFileDetailed.get(key)!.push(h);
    }
    
    for (const [file, fileHotspots] of byFileDetailed) {
      const lineData = new Map<number, { ticks: number; functions: string[] }>();
      let fileTotalTicks = 0;
      
      for (const h of fileHotspots) {
        if (h.hitCount > 0) {
          if (!lineData.has(h.line)) lineData.set(h.line, { ticks: 0, functions: [] });
          const ld = lineData.get(h.line)!;
          ld.ticks += h.hitCount;
          if (!ld.functions.includes(h.functionName)) ld.functions.push(h.functionName);
          fileTotalTicks += h.hitCount;
        }
        
        for (const pt of h.positionTicks) {
          if (!lineData.has(pt.line)) lineData.set(pt.line, { ticks: 0, functions: [] });
          const ld = lineData.get(pt.line)!;
          ld.ticks += pt.ticks;
          if (!ld.functions.includes(h.functionName)) ld.functions.push(h.functionName);
          fileTotalTicks += pt.ticks;
        }
      }
      
      if (lineData.size === 0) continue;
      
      const fileTimeMs = fileTotalTicks * sampleIntervalUs / 1000;
      const filePct = (fileTimeMs / totalTimeMs * 100).toFixed(1);
      console.log(`\n  📄 ${file} (${fileTimeMs.toFixed(1)}ms, ${filePct}%)`);
      
      const sortedLines = Array.from(lineData.entries())
        .sort((a, b) => b[1].ticks - a[1].ticks)
        .slice(0, 25);
      
      console.log(`  ${"Line".padStart(6)}  ${"Time".padStart(8)}  ${"Pct".padStart(6)}  Function/Context`);
      console.log(`  ${"-".repeat(6)}  ${"-".repeat(8)}  ${"-".repeat(6)}  ${"-".repeat(40)}`);
      
      for (const [line, data] of sortedLines) {
        const lineTimeMs = data.ticks * sampleIntervalUs / 1000;
        const linePct = (lineTimeMs / totalTimeMs * 100).toFixed(1);
        const funcNames = data.functions.slice(0, 2).join(", ");
        console.log(`  ${String(line).padStart(6)}  ${lineTimeMs.toFixed(1).padStart(7)}ms  ${linePct.padStart(5)}%  ${funcNames}`);
      }
    }
  }
  
  console.log(`\n--- TOP HOTSPOTS IN OUR CODE (with callers) ---`);
  for (const h of ourCode.slice(0, 20)) {
    const pct = h.selfTimePct.toFixed(1);
    console.log(`\n  ${h.selfTimeMs.toFixed(1)}ms (${pct}%) - ${h.functionName}`);
    console.log(`    Location: ${h.file}:${h.line}:${h.column}`);
    if (h.callers.length > 0) {
      console.log(`    Called by: ${h.callers.slice(0, 2).join(", ")}`);
    }
    if (h.positionTicks.length > 0) {
      const sortedTicks = [...h.positionTicks].sort((a, b) => b.ticks - a.ticks).slice(0, 5);
      console.log(`    Hot lines:`);
      for (const pt of sortedTicks) {
        const lineTimeMs = pt.ticks * sampleIntervalUs / 1000;
        console.log(`      L${pt.line}: ${lineTimeMs.toFixed(1)}ms (${pt.ticks} samples)`);
      }
    }
  }
  
  console.log(`\n--- NATIVE API TIME ---`);
  const nativeByName = new Map<string, number>();
  for (const h of nativeCode) {
    nativeByName.set(h.functionName, (nativeByName.get(h.functionName) || 0) + h.selfTimeMs);
  }
  const sortedNative = Array.from(nativeByName.entries()).sort((a, b) => b[1] - a[1]);
  for (const [name, time] of sortedNative.slice(0, 15)) {
    const pct = (time / totalTimeMs * 100).toFixed(1);
    console.log(`  ${time.toFixed(1).padStart(8)}ms (${pct.padStart(5)}%)  ${name}`);
  }
  
  console.log(`\n${"=".repeat(80)}\n`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
