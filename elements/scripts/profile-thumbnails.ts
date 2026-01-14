#!/usr/bin/env npx ts-node
/**
 * CPU Profiling Harness for Thumbnail Generation (captureBatch)
 * 
 * Captures Chrome DevTools CPU profiles during thumbnail batch capture.
 * 
 * Usage:
 *   npx tsx scripts/profile-thumbnails.ts [options]
 * 
 * Options:
 *   --project <name>   Dev project to profile (default: improv-edit)
 *   --count <n>        Number of thumbnails to capture (default: 15)
 *   --scale <n>        Thumbnail scale factor (default: 0.25)
 *   --output <path>    Output path for .cpuprofile file (default: ./thumbnail-profile.cpuprofile)
 *   --focus <file>     Focus line-level profiling on specific file
 *   --headless         Run in headless mode (default: false)
 * 
 * Examples:
 *   npx tsx scripts/profile-thumbnails.ts --count 15
 *   npx tsx scripts/profile-thumbnails.ts --focus renderTimegroupToCanvas --count 30
 */

import { chromium, type Browser, type Page, type CDPSession } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

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

async function analyzeProfile(profile: CPUProfile): Promise<HotspotInfo[]> {
  const nodeMap = new Map<number, ProfileNode>();
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
  }

  // Calculate hit counts from samples
  const hitCounts = new Map<number, number>();
  for (const sample of profile.samples) {
    hitCounts.set(sample, (hitCounts.get(sample) || 0) + 1);
  }

  // Sample interval in microseconds
  const sampleIntervalUs = profile.timeDeltas.length > 0
    ? profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.timeDeltas.length
    : 1000;

  const hotspots: HotspotInfo[] = [];
  
  for (const node of profile.nodes) {
    const hitCount = hitCounts.get(node.id) || 0;
    if (hitCount === 0) continue;
    
    const selfTime = hitCount * sampleIntervalUs / 1000; // Convert to ms
    
    hotspots.push({
      functionName: node.callFrame.functionName || "(anonymous)",
      url: node.callFrame.url || "(native)",
      line: node.callFrame.lineNumber + 1,
      selfTime,
      totalTime: selfTime, // Simplified - would need call tree for total time
      hitCount,
    });
  }

  // Sort by self time descending
  hotspots.sort((a, b) => b.selfTime - a.selfTime);
  
  return hotspots;
}

function printHotspots(hotspots: HotspotInfo[], totalTimeMs: number) {
  for (const h of hotspots.slice(0, 20)) {
    const file = h.url.split("/").pop()?.split("?")[0] || h.url;
    const pct = ((h.selfTime / totalTimeMs) * 100).toFixed(1);
    console.log(`   ${h.selfTime.toFixed(1)}ms (${pct}%) - ${h.functionName}`);
    console.log(`      ${file}:${h.line}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string, defaultValue: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  const project = getArg("project", "improv-edit");
  const thumbnailCount = parseInt(getArg("count", "15"), 10);
  const scale = parseFloat(getArg("scale", "0.25"));
  const outputPath = getArg("output", "./thumbnail-profile.cpuprofile");
  const focusFile = getArg("focus", "");
  const headless = hasFlag("headless");

  console.log(`\n🔬 Thumbnail Generation Profiler`);
  console.log(`   Project: ${project}`);
  console.log(`   Thumbnails: ${thumbnailCount}`);
  console.log(`   Scale: ${scale}`);
  console.log(`   Output: ${outputPath}`);
  if (focusFile) console.log(`   Focus: ${focusFile}`);
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
        "--enable-features=CanvasDrawElement",
        "--autoplay-policy=no-user-gesture-required",
      ],
    });
    shouldCloseBrowser = true;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture browser console messages
  page.on("console", (msg) => {
    const text = msg.text();
    // Only show relevant messages
    if (text.includes("captureBatch") || text.includes("captureFromClone") || text.includes("renderToImage") || text.includes("seekForRender") || text.includes("prefetchScrubSegments") || text.includes("ScrubInputCache") || text.includes("unifiedSeek") || text.includes("tryGetScrubSample")) {
      console.log(`   [browser] ${text}`);
    }
  });
  
  // Get CDP session for profiling
  const cdp = await context.newCDPSession(page);

  try {
    const devUrl = `http://main.localhost:4321/${project}`;
    console.log(`📄 Loading ${devUrl}...`);
    await page.goto(devUrl, { waitUntil: "networkidle", timeout: 60000 });

    console.log(`⏳ Waiting for timegroup...`);
    await page.waitForSelector("ef-timegroup", { timeout: 30000 });
    await page.waitForFunction(() => {
      const tg = document.querySelector("ef-timegroup") as any;
      return tg && tg.durationMs > 0;
    }, { timeout: 30000 });

    const timegroupInfo = await page.evaluate(() => {
      const tg = document.querySelector("ef-timegroup") as any;
      return {
        durationMs: tg.durationMs,
        width: tg.offsetWidth,
        height: tg.offsetHeight,
      };
    });
    console.log(`✅ Timegroup ready: ${timegroupInfo.width}x${timegroupInfo.height}, ${timegroupInfo.durationMs}ms`);

    // Generate timestamps
    const timestamps: number[] = [];
    for (let i = 0; i < thumbnailCount; i++) {
      timestamps.push((i * timegroupInfo.durationMs) / (thumbnailCount - 1));
    }
    console.log(`📷 Will capture ${thumbnailCount} thumbnails at scale ${scale}`);

    // Start CPU profiler
    console.log(`\n🔴 Starting CPU profiler...`);
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.start");

    // Run captureBatch
    console.log(`\n🎬 Running captureBatch...`);
    const captureStartTime = Date.now();

    const result = await page.evaluate(async ({ timestamps, scale }) => {
      const timegroup = document.querySelector("ef-timegroup") as any;
      if (!timegroup) {
        return { success: false, error: "Timegroup not found", count: 0, totalMs: 0 };
      }

      const start = performance.now();
      try {
        const canvases = await timegroup.captureBatch(timestamps, {
          scale,
          contentReadyMode: "immediate",
        });
        const elapsed = performance.now() - start;
        return {
          success: true,
          count: canvases.length,
          totalMs: elapsed,
          perThumbnailMs: elapsed / canvases.length,
        };
      } catch (e: any) {
        return { success: false, error: e.message, count: 0, totalMs: performance.now() - start };
      }
    }, { timestamps, scale });

    const captureDuration = Date.now() - captureStartTime;
    console.log(`⏱️  captureBatch completed in ${captureDuration}ms`);
    
    if (result.success) {
      console.log(`   Captured: ${result.count} thumbnails`);
      console.log(`   Total time: ${result.totalMs.toFixed(0)}ms`);
      console.log(`   Per thumbnail: ${result.perThumbnailMs?.toFixed(1)}ms`);
      console.log(`   Thumbnails/sec: ${(1000 / (result.perThumbnailMs || 1)).toFixed(1)}`);
    } else {
      console.error(`   Error: ${result.error}`);
    }

    // Stop profiler and get results
    const { profile } = await cdp.send("Profiler.stop") as { profile: CPUProfile };
    await cdp.send("Profiler.disable");

    // Calculate total time from profile
    const sampleIntervalUs = profile.timeDeltas.length > 0
      ? profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.timeDeltas.length
      : 1000;
    const totalTimeMs = profile.samples.length * sampleIntervalUs / 1000;

    // Save raw profile
    const profileJson = JSON.stringify(profile, null, 2);
    fs.writeFileSync(outputPath, profileJson);
    console.log(`\n💾 Profile saved to: ${outputPath}`);
    console.log(`   Load in Chrome DevTools: Performance tab → Load profile`);

    // Analyze and print hotspots
    console.log(`\n📊 Top Hotspots (${totalTimeMs.toFixed(0)}ms total):`);
    const hotspots = await analyzeProfile(profile);
    
    // Filter to our code
    const ourCode = hotspots.filter(h => 
      h.url.includes("/elements/") || 
      h.url.includes("/packages/") ||
      h.url.includes("renderTimegroup") ||
      h.url.includes("preview/")
    );

    console.log(`\n   === Our Code ===`);
    printHotspots(ourCode, totalTimeMs);

    // If focus file specified, show detailed breakdown
    if (focusFile) {
      const focused = hotspots.filter(h => h.url.includes(focusFile));
      if (focused.length > 0) {
        console.log(`\n   === Focus: ${focusFile} ===`);
        printHotspots(focused, totalTimeMs);
      }
    }

    // Summary
    console.log(`\n📈 Summary:`);
    console.log(`   Total profile time: ${totalTimeMs.toFixed(0)}ms`);
    console.log(`   Our code time: ${ourCode.reduce((sum, h) => sum + h.selfTime, 0).toFixed(0)}ms`);
    console.log(`   Top function: ${ourCode[0]?.functionName || "N/A"} (${ourCode[0]?.selfTime.toFixed(0) || 0}ms)`);

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

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
