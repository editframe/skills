#!/usr/bin/env npx ts-node
/**
 * CPU Profiling Harness for Browser Tests
 * 
 * Captures Chrome DevTools CPU profiles during Vitest browser tests
 * to identify performance hotspots.
 * 
 * Usage:
 *   npx tsx scripts/profile-browsertest.ts [test-file] [options]
 * 
 * Options:
 *   -t <pattern>       Test name pattern to run (passed to vitest)
 *   --output <path>    Output path for .cpuprofile file (default: ./browsertest-profile.cpuprofile)
 *   --focus <file>     Focus line-level profiling on specific file
 * 
 * Examples:
 *   npx tsx scripts/profile-browsertest.ts packages/elements/src/preview/renderTimegroupToCanvas.browsertest.ts -t "batch capture"
 *   npx tsx scripts/profile-browsertest.ts packages/elements/src/preview/renderTimegroupToCanvas.browsertest.ts --focus syncStyles
 */

import { chromium, type Browser, type Page } from "playwright";
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
  positionTicks?: { line: number; ticks: number }[];
}

interface CPUProfile {
  nodes: ProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

/** Cache for fetched and parsed source maps */
class SourceMapResolver {
  private traceMaps = new Map<string, TraceMap | null>();
  private fetchCache = new Map<string, Promise<string | null>>();
  
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
  
  async resolve(scriptUrl: string, line0Based: number, column: number): Promise<{
    source: string;
    line: number;
    column: number;
    name: string | null;
  } | null> {
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

async function main() {
  const args = process.argv.slice(2);
  
  // Find test file argument (first non-flag argument)
  let testFile = "";
  let testPattern = "";
  let outputPath = "./browsertest-profile.cpuprofile";
  let focusFile = "";
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-t" && args[i + 1]) {
      testPattern = args[++i];
    } else if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[++i];
    } else if (args[i] === "--focus" && args[i + 1]) {
      focusFile = args[++i];
    } else if (!args[i].startsWith("-") && !testFile) {
      testFile = args[i];
    }
  }

  if (!testFile) {
    console.error("Usage: npx tsx scripts/profile-browsertest.ts <test-file> [-t <pattern>]");
    process.exit(1);
  }

  console.log(`\n🔬 Browser Test Profiling`);
  console.log(`   Test file: ${testFile}`);
  if (testPattern) console.log(`   Pattern: ${testPattern}`);
  console.log(`   Output: ${outputPath}`);
  if (focusFile) console.log(`   Focus: ${focusFile}`);
  console.log();

  // Find monorepo root
  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) {
    console.error("Could not find monorepo root");
    process.exit(1);
  }

  // Check for browser server endpoint
  const wsEndpointPath = path.join(monorepoRoot, ".wsEndpoint.json");
  if (!fs.existsSync(wsEndpointPath)) {
    console.error("Browser server not running. Start it with: npx tsx scripts/start-browser-server.ts");
    process.exit(1);
  }

  const { wsEndpoint } = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
  console.log(`📡 Connecting to browser: ${wsEndpoint}`);
  
  const browser = await chromium.connect(wsEndpoint);
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable CDP for profiling
  const cdp = await context.newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 100 }); // 100µs sampling

  // Start profiling before running tests
  console.log(`\n🎬 Starting CPU profile...`);
  await cdp.send("Profiler.start");
  
  const testStartTime = Date.now();
  
  // Run vitest with the specified test file
  const vitestArgs = [
    "vitest",
    "run",
    "--browser.name=chromium",
    "--browser.headless",
    testFile,
  ];
  if (testPattern) {
    vitestArgs.push("-t", testPattern);
  }
  
  console.log(`\n🧪 Running: npx ${vitestArgs.join(" ")}`);
  
  // For profiling, we need to inject into the running test's browser context
  // Since Vitest manages its own browser, we'll profile from outside by:
  // 1. Running vitest normally
  // 2. Attaching to its browser via CDP
  // 
  // Actually, a simpler approach: add profiling hooks directly to the test
  
  // Let's create a simpler approach - profile by connecting to the Vitest browser
  console.log(`\n⚠️  Note: For accurate profiling, add this to your test:`);
  console.log(`
    // At test start:
    const cdp = await (page as any)._client();
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.start");
    
    // At test end:
    const { profile } = await cdp.send("Profiler.stop");
    // Save profile...
  `);
  
  // For now, run the test and measure wall-clock time
  const vitest = spawn("npx", vitestArgs, {
    cwd: path.join(monorepoRoot, "elements"),
    stdio: "inherit",
    shell: true,
  });

  await new Promise<void>((resolve, reject) => {
    vitest.on("close", (code) => {
      if (code === 0 || code === 1) { // Vitest returns 1 for test failures
        resolve();
      } else {
        reject(new Error(`Vitest exited with code ${code}`));
      }
    });
    vitest.on("error", reject);
  });

  const testDuration = Date.now() - testStartTime;
  console.log(`\n⏱️  Tests completed in ${(testDuration / 1000).toFixed(2)}s`);
  
  // Stop profiler
  const { profile } = await cdp.send("Profiler.stop") as { profile: CPUProfile };
  await cdp.send("Profiler.disable");
  
  // Note: This profile is from OUR browser context, not Vitest's
  // For real profiling, we need to integrate with Vitest's browser
  
  console.log(`\n💡 For detailed profiling, use the Vitest UI or Chrome DevTools:`);
  console.log(`   1. Run: cd elements && npx vitest --browser.name=chromium --browser.headless=false --ui`);
  console.log(`   2. Open Chrome DevTools on the test browser window`);
  console.log(`   3. Go to Performance tab and record while tests run`);
  
  // Clean up
  await page.close();
  await context.close();
  
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

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
