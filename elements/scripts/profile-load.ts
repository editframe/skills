#!/usr/bin/env npx ts-node
/**
 * CPU Profiling Harness for Page Load Performance
 *
 * Captures Chrome DevTools CPU profiles during page load to identify bottlenecks.
 *
 * Usage:
 *   npx tsx elements/scripts/profile-load.ts [options]
 *
 * Options:
 *   --project <name>   Dev project to profile (default: improv-edit)
 *   --output <path>    Output path for .cpuprofile file (default: ./load-profile.cpuprofile)
 *   --focus <file>     Focus line-level profiling on specific file
 *   --headless         Run in headless mode (default: false)
 *
 * Examples:
 *   npx tsx elements/scripts/profile-load.ts
 *   npx tsx elements/scripts/profile-load.ts --focus EFTimegroup
 *   npx tsx elements/scripts/profile-load.ts --project design-catalog
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
  column: number;
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
      const traceMap = new TraceMap(JSON.parse(sourceMapJson));
      this.traceMaps.set(scriptUrl, traceMap);
      return traceMap;
    } catch {
      this.traceMaps.set(scriptUrl, null);
      return null;
    }
  }

  async resolveLocation(
    scriptUrl: string,
    line: number,
    column: number,
  ): Promise<ResolvedLocation | null> {
    const traceMap = await this.getTraceMap(scriptUrl);
    if (!traceMap) return null;

    const pos = originalPositionFor(traceMap, {
      line: line + 1, // trace-mapping uses 1-based lines
      column: column,
    });

    if (!pos.source) return null;

    return {
      source: pos.source,
      line: pos.line ? pos.line - 1 : line, // Convert back to 0-based
      column: pos.column ?? column,
      name: pos.name ?? null,
    };
  }
}

function parseArgs(): {
  project: string;
  output: string;
  focus?: string;
  headless: boolean;
} {
  const args = process.argv.slice(2);
  let project = "improv-edit";
  let output = "./load-profile.cpuprofile";
  let focus: string | undefined;
  let headless = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--project" && args[i + 1]) {
      project = args[++i];
    } else if (arg === "--output" && args[i + 1]) {
      output = args[++i];
    } else if (arg === "--focus" && args[i + 1]) {
      focus = args[++i];
    } else if (arg === "--headless") {
      headless = true;
    }
  }

  return { project, output, focus, headless };
}

async function profilePageLoad(
  page: Page,
  cdp: CDPSession,
  project: string,
  focus?: string,
): Promise<CPUProfile> {
  const resolver = new SourceMapResolver(page.url());

  // Start profiling
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.start");

  console.log(`Loading ${project}.html...`);
  const loadStart = performance.now();

  // Navigate to the dev project
  await page.goto(`http://main.localhost:4321/${project}`, {
    waitUntil: "networkidle",
  });

  // Wait for page to be fully loaded - wait for all timegroups to initialize
  console.log("Waiting for timegroups to initialize...");
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      // Wait for all timegroups to finish their initialization
      const timegroups = document.querySelectorAll("ef-timegroup");
      let resolved = 0;

      const checkComplete = async () => {
        for (const tg of Array.from(timegroups)) {
          const el = tg as any;
          if (
            el.waitForMediaDurations &&
            typeof el.waitForMediaDurations === "function"
          ) {
            try {
              await el.waitForMediaDurations();
            } catch (e) {
              console.error("Error waiting for media durations:", e);
            }
          }
        }

        // Also wait for all seek tasks to complete
        for (const tg of Array.from(timegroups)) {
          const el = tg as any;
          if (el.seekTask && el.seekTask.taskComplete) {
            try {
              await el.seekTask.taskComplete;
            } catch (e) {
              // Ignore errors
            }
          }
        }

        resolve();
      };

      // Start checking after a short delay to let initial work happen
      setTimeout(checkComplete, 100);
    });
  });

  const loadEnd = performance.now();
  console.log(`Page load completed in ${(loadEnd - loadStart).toFixed(2)}ms`);

  // Stop profiling
  const profileResult = await cdp.send("Profiler.stop");
  await cdp.send("Profiler.disable");

  return profileResult.profile as CPUProfile;
}

async function analyzeProfile(
  profile: CPUProfile,
  resolver: SourceMapResolver,
  focus?: string,
): Promise<void> {
  const nodeMap = new Map<number, ProfileNode>();
  const selfTime = new Map<number, number>();
  const totalTime = new Map<number, number>();
  const callers = new Map<number, Set<number>>();

  // Build node map and calculate times
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
    selfTime.set(node.id, 0);
    totalTime.set(node.id, 0);
    callers.set(node.id, new Set());
  }

  // Calculate time deltas
  let currentTime = profile.startTime;
  for (let i = 0; i < profile.samples.length; i++) {
    const sample = profile.samples[i];
    const delta = profile.timeDeltas[i] || 0;
    currentTime += delta;

    if (nodeMap.has(sample)) {
      totalTime.set(sample, (totalTime.get(sample) || 0) + delta);
    }

    // Track callers
    const node = nodeMap.get(sample);
    if (node?.children) {
      for (const childId of node.children) {
        callers.get(childId)?.add(sample);
      }
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

  // Build hotspot list
  const hotspots: HotspotInfo[] = [];
  for (const node of profile.nodes) {
    const self = selfTime.get(node.id) || 0;
    const total = totalTime.get(node.id) || 0;
    if (self > 0 || total > 0) {
      hotspots.push({
        functionName: node.callFrame.functionName || "(anonymous)",
        url: node.callFrame.url,
        line: node.callFrame.lineNumber,
        column: node.callFrame.columnNumber,
        selfTime: self,
        totalTime: total,
        hitCount: node.hitCount || 0,
      });
    }
  }

  // Sort by self time
  hotspots.sort((a, b) => b.selfTime - a.selfTime);

  // Resolve source locations
  const resolvedHotspots = await Promise.all(
    hotspots.slice(0, 50).map(async (hotspot) => {
      const resolved = await resolver.resolveLocation(
        hotspot.url,
        hotspot.line,
        hotspot.column,
      );
      return { hotspot, resolved };
    }),
  );

  console.log("\n=== TOP HOTSPOTS (by self time) ===\n");

  for (const { hotspot, resolved } of resolvedHotspots.slice(0, 20)) {
    const location = resolved
      ? `${resolved.source}:${resolved.line + 1}`
      : `${hotspot.url}:${hotspot.line}`;

    const shouldShow =
      !focus ||
      hotspot.functionName.toLowerCase().includes(focus.toLowerCase()) ||
      location.toLowerCase().includes(focus.toLowerCase());

    if (shouldShow) {
      console.log(
        `  ${(hotspot.selfTime / 1000).toFixed(2)}ms (${((hotspot.selfTime / (profile.endTime - profile.startTime)) * 100).toFixed(1)}%) - ${hotspot.functionName}`,
      );
      console.log(`    Location: ${location}`);
      if (hotspot.totalTime > hotspot.selfTime) {
        console.log(
          `    Total time: ${(hotspot.totalTime / 1000).toFixed(2)}ms`,
        );
      }
      console.log();
    }
  }

  // Line-level profiling for focused files
  if (focus) {
    console.log("\n=== LINE-LEVEL PROFILING ===\n");
    await printLineLevelProfile(profile, resolver, focus);
  }
}

async function printLineLevelProfile(
  profile: CPUProfile,
  resolver: SourceMapResolver,
  focusPattern: string,
): Promise<void> {
  const lineTimes = new Map<string, Map<number, number>>();

  for (const node of profile.nodes) {
    const resolved = await resolver.resolveLocation(
      node.callFrame.url,
      node.callFrame.lineNumber,
      node.callFrame.columnNumber,
    );

    if (!resolved) continue;
    if (!resolved.source.toLowerCase().includes(focusPattern.toLowerCase())) {
      continue;
    }

    const key = resolved.source;
    if (!lineTimes.has(key)) {
      lineTimes.set(key, new Map());
    }
    const fileLines = lineTimes.get(key)!;

    // Use positionTicks if available for line-level granularity
    if (node.positionTicks) {
      for (const tick of node.positionTicks) {
        const current = fileLines.get(tick.line) || 0;
        // Estimate time based on hit count (rough approximation)
        const estimatedTime = (tick.ticks / (node.hitCount || 1)) * 1000; // Rough ms estimate
        fileLines.set(tick.line, current + estimatedTime);
      }
    } else {
      // Fallback: attribute all time to the function's line
      const current = fileLines.get(resolved.line) || 0;
      fileLines.set(resolved.line, current + 1000); // Placeholder
    }
  }

  for (const [file, lines] of lineTimes) {
    console.log(`\n📄 ${file}`);
    const sortedLines = Array.from(lines.entries()).sort((a, b) => b[1] - a[1]);
    console.log("  Line      Time     Function");
    console.log("  ------  --------  ---------");
    for (const [line, time] of sortedLines.slice(0, 20)) {
      console.log(
        `  ${String(line + 1).padStart(6)}  ${(time / 1000).toFixed(2)}ms`,
      );
    }
  }
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

async function main() {
  const { project, output, focus, headless } = parseArgs();

  console.log(`Profiling page load for: ${project}`);
  if (focus) {
    console.log(`Focus: ${focus}`);
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
      args: ["--disable-web-security"],
    });
    shouldCloseBrowser = true;
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const cdp = await context.newCDPSession(page);

    const profile = await profilePageLoad(page, cdp, project, focus);

    // Save profile
    const outputPath = path.resolve(output);
    fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2));
    console.log(`\nProfile saved to: ${outputPath}`);
    console.log("Load in Chrome DevTools: Performance tab → Load profile");

    // Analyze profile
    const resolver = new SourceMapResolver(page.url());
    await analyzeProfile(profile, resolver, focus);
  } finally {
    page.close().catch(() => {});
    context.close().catch(() => {});
    if (shouldCloseBrowser) {
      browser.close().catch(() => {});
    }
  }
}

main().catch(console.error);
