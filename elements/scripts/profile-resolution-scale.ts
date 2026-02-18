#!/usr/bin/env npx tsx
/**
 * Profile the impact of preview resolution scaling on render performance.
 *
 * Usage:
 *   npx tsx elements/scripts/profile-resolution-scale.ts
 *   npx tsx elements/scripts/profile-resolution-scale.ts --project design-catalog
 *   npx tsx elements/scripts/profile-resolution-scale.ts --frames 100
 */

import { chromium, type Browser, type Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line args
const args = process.argv.slice(2);

function getArg(name: string, defaultValue: string): string {
  const eqIdx = args.findIndex((a) => a.startsWith(`--${name}=`));
  if (eqIdx !== -1) return args[eqIdx]!.split("=")[1]!;
  const flagIdx = args.indexOf(`--${name}`);
  if (
    flagIdx !== -1 &&
    args[flagIdx + 1] &&
    !args[flagIdx + 1]!.startsWith("--")
  ) {
    return args[flagIdx + 1]!;
  }
  return defaultValue;
}

const projectArg = getArg("project", "design-catalog");
const framesArg = parseInt(getArg("frames", "30"));

const SCALES = [1, 0.75, 0.5, 0.25] as const;
const RENDER_MODES = ["foreignObject", "native"] as const;

interface BenchmarkResult {
  renderMode: string;
  scale: number;
  frames: number;
  totalMs: number;
  avgFrameMs: number;
  minFrameMs: number;
  maxFrameMs: number;
}

async function runBenchmark(
  page: Page,
  renderMode: string,
  scale: number,
  frames: number,
): Promise<BenchmarkResult> {
  // Set render mode
  await page.evaluate((mode) => {
    (window as any).setRenderMode?.(mode);
    localStorage.setItem("ef-preview-render-mode", mode);
  }, renderMode);

  // Set resolution scale
  await page.evaluate((s) => {
    (window as any).setPreviewResolutionScale?.(s);
    localStorage.setItem("ef-preview-resolution-scale", String(s));
  }, scale);

  // Switch to canvas mode to trigger reinitialization with new settings
  await page.evaluate(() => {
    const workbench = document.querySelector("ef-workbench") as any;
    if (workbench) {
      // Force re-init by switching modes
      workbench.handlePresentationModeChange?.("clone");
    }
  });
  await page.waitForTimeout(100);

  await page.evaluate(() => {
    const workbench = document.querySelector("ef-workbench") as any;
    if (workbench) {
      workbench.handlePresentationModeChange?.("canvas");
    }
  });
  await page.waitForTimeout(500); // Wait for canvas mode to initialize

  // Run the benchmark
  const result = await page.evaluate(async (numFrames) => {
    const timegroup = document.querySelector("ef-timegroup") as any;
    if (!timegroup) {
      throw new Error("No timegroup found");
    }

    const frameTimes: number[] = [];
    const duration = timegroup.durationMs || 10000;
    const frameInterval = duration / numFrames;

    for (let i = 0; i < numFrames; i++) {
      const targetTime = i * frameInterval;
      timegroup.currentTimeMs = targetTime;
      timegroup.userTimeMs = targetTime;

      const start = performance.now();

      // Wait for the canvas refresh to complete
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const elapsed = performance.now() - start;
      frameTimes.push(elapsed);
    }

    const total = frameTimes.reduce((a, b) => a + b, 0);
    const min = Math.min(...frameTimes);
    const max = Math.max(...frameTimes);

    return {
      frames: numFrames,
      totalMs: total,
      avgFrameMs: total / numFrames,
      minFrameMs: min,
      maxFrameMs: max,
    };
  }, frames);

  return {
    renderMode,
    scale,
    ...result,
  };
}

async function main() {
  console.log("=== Preview Resolution Scale Profiler ===\n");
  console.log(`Project: ${projectArg}`);
  console.log(`Frames per test: ${framesArg}\n`);

  // Check for wsEndpoint
  const monorepoRoot = path.resolve(__dirname, "../..");
  const wsEndpointPath = path.join(monorepoRoot, ".wsEndpoint.json");

  let browser: Browser;
  let wsEndpoint: string | undefined;

  if (fs.existsSync(wsEndpointPath)) {
    const wsData = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
    wsEndpoint = wsData.wsEndpoint;
    console.log(`Found wsEndpoint at ${wsEndpoint}`);
    try {
      browser = await chromium.connectOverCDP(wsEndpoint);
      console.log("Connected to existing browser\n");
    } catch (e) {
      console.log(`Failed to connect (${e}), launching new browser...\n`);
      wsEndpoint = undefined;
      browser = await chromium.launch({ headless: false });
    }
  } else {
    console.log("Launching new browser...\n");
    browser = await chromium.launch({ headless: false });
  }

  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());

  // Navigate to dev project
  const devUrl = `http://main.localhost:4321/dev-projects/${projectArg}.html`;
  console.log(`Loading: ${devUrl}\n`);

  await page.goto(devUrl);
  await page.waitForSelector("ef-timegroup", { timeout: 30000 });
  await page.waitForTimeout(2000); // Let everything initialize

  // Check if native API is available
  const nativeAvailable = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    return ctx !== null && "drawElementImage" in ctx;
  });

  console.log(`Native API available: ${nativeAvailable}\n`);

  const results: BenchmarkResult[] = [];
  const modesToTest = nativeAvailable
    ? RENDER_MODES
    : (["foreignObject"] as const);

  for (const renderMode of modesToTest) {
    console.log(`\n--- Testing ${renderMode} mode ---\n`);

    for (const scale of SCALES) {
      process.stdout.write(`  Scale ${scale}: `);

      try {
        const result = await runBenchmark(page, renderMode, scale, framesArg);
        results.push(result);

        console.log(
          `${result.avgFrameMs.toFixed(1)}ms avg (${result.minFrameMs.toFixed(1)}-${result.maxFrameMs.toFixed(1)}ms)`,
        );
      } catch (e) {
        console.log(`ERROR: ${e}`);
      }
    }
  }

  // Print summary table
  console.log("\n\n=== SUMMARY ===\n");
  console.log("Mode            Scale  Avg(ms)  Min(ms)  Max(ms)  Speedup");
  console.log("─".repeat(60));

  for (const mode of modesToTest) {
    const modeResults = results.filter((r) => r.renderMode === mode);
    const baseline = modeResults.find((r) => r.scale === 1);

    for (const r of modeResults) {
      const speedup = baseline
        ? (baseline.avgFrameMs / r.avgFrameMs).toFixed(2) + "x"
        : "-";
      console.log(
        `${r.renderMode.padEnd(15)} ${r.scale.toFixed(2).padStart(5)}  ` +
          `${r.avgFrameMs.toFixed(1).padStart(7)}  ${r.minFrameMs.toFixed(1).padStart(7)}  ` +
          `${r.maxFrameMs.toFixed(1).padStart(7)}  ${speedup.padStart(7)}`,
      );
    }
    console.log("");
  }

  // Don't close browser if we connected to existing
  if (!wsEndpoint) {
    await browser.close();
  }
}

main().catch(console.error);
