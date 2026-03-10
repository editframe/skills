#!/usr/bin/env npx ts-node
/**
 * Video Render Test - Renders video.html and writes output to monorepo root.
 *
 * This script tests renderTimegroupToVideo and renderTimegroupToCanvas by
 * rendering the full video.html project and saving the result to disk.
 *
 * Usage:
 *   elements/scripts/tsx render-video-test.ts [options]
 *
 * Options:
 *   --duration <ms>    Duration to render in ms (default: full duration)
 *   --fps <number>     Frames per second (default: 30)
 *   --scale <number>   Scale factor (default: 0.5)
 *   --headless         Run in headless mode (default: false)
 *   --output <path>    Output path for video file (default: monorepo root)
 *
 * Examples:
 *   elements/scripts/tsx render-video-test.ts
 *   elements/scripts/tsx render-video-test.ts --duration 5000 --fps 15
 *   elements/scripts/tsx render-video-test.ts --output ./my-test.mp4
 */

import { chromium, type Browser } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  const args = process.argv.slice(2);

  const getArg = (name: string, defaultValue: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  const durationArg = getArg("duration", "");
  const fps = parseInt(getArg("fps", "30"), 10);
  const scale = parseFloat(getArg("scale", "0.5"));
  const headless = hasFlag("headless");
  const outputArg = getArg("output", "");

  // Find monorepo root
  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) {
    console.error("Could not find monorepo root");
    process.exit(1);
  }

  // Determine output path
  const outputPath = outputArg || path.join(monorepoRoot, "video-render-test.mp4");

  console.log(`\n🎬 Video Render Test`);
  console.log(`   FPS: ${fps}`);
  console.log(`   Scale: ${scale}`);
  console.log(`   Headless: ${headless}`);
  console.log(`   Output: ${outputPath}`);
  if (durationArg) {
    console.log(`   Duration: ${durationArg}ms`);
  } else {
    console.log(`   Duration: full (will be determined after loading)`);
  }
  console.log();

  // Check if browser server is running
  const wsEndpointPath = path.join(monorepoRoot, ".wsEndpoint.json");
  let browser: Browser;
  let shouldCloseBrowser = false;

  if (fs.existsSync(wsEndpointPath)) {
    let { wsEndpoint } = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
    // Replace host.docker.internal with localhost for host-machine access
    wsEndpoint = wsEndpoint.replace("host.docker.internal", "127.0.0.1");
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
    // Show render-related logs
    if (
      text.includes("[renderToVideo]") ||
      text.includes("[renderToImage]") ||
      text.includes("[renderTimegroupToVideo]") ||
      text.includes("DEBUG")
    ) {
      console.log(`[browser] ${text}`);
    }
  });

  try {
    // Navigate to video.html dev project
    const devUrl = `http://main.localhost:4321/video.html`;
    console.log(`📄 Loading ${devUrl}...`);
    await page.goto(devUrl, { waitUntil: "networkidle", timeout: 60000 });

    // Wait for EF_RENDER API to be ready
    console.log(`⏳ Waiting for EF_RENDER API...`);
    await page.waitForFunction(
      () => {
        return (window as any).EF_RENDER?.isReady?.();
      },
      { timeout: 30000 },
    );

    // Get render info
    const renderInfo = await page.evaluate(async () => {
      const info = await (window as any).EF_RENDER.getRenderInfo();
      return info;
    });
    console.log(
      `✅ EF_RENDER ready: ${renderInfo.width}x${renderInfo.height}, ${renderInfo.durationMs}ms`,
    );

    // Determine render duration
    const renderDuration = durationArg ? parseInt(durationArg, 10) : renderInfo.durationMs;
    console.log(`\n🎬 Starting render (${renderDuration}ms at ${fps}fps, scale=${scale})...`);
    const startTime = Date.now();

    // Render using EF_RENDER API (designed for programmatic/non-interactive rendering)
    const result = await page.evaluate(
      async ({ duration, fps, scale }) => {
        try {
          const buffer = await (window as any).EF_RENDER.render({
            fps,
            scale,
            fromMs: 0,
            toMs: duration,
            streaming: false,
            contentReadyMode: "blocking",
            blockingTimeoutMs: 10000,
            includeAudio: true,
          });

          if (buffer) {
            // Return buffer as array for transfer to Node.js
            return {
              success: true,
              videoBuffer: Array.from(new Uint8Array(buffer)),
              size: buffer.length,
            };
          }
          return { success: false, error: "No buffer returned" };
        } catch (e: any) {
          return { success: false, error: e.message || String(e) };
        }
      },
      { duration: renderDuration, fps, scale },
    );

    const elapsed = Date.now() - startTime;

    if (!result.success) {
      console.error(`❌ Render failed: ${result.error}`);
      process.exit(1);
    }

    if (!result.videoBuffer) {
      console.error(`❌ No video buffer returned`);
      process.exit(1);
    }

    // Write video to disk
    const videoBuffer = Buffer.from(result.videoBuffer);
    fs.writeFileSync(outputPath, videoBuffer);

    // Calculate stats
    const speedMultiplier = renderDuration / elapsed;
    const fileSizeMB = videoBuffer.length / (1024 * 1024);

    console.log(`\n✅ Render complete!`);
    console.log(`   Duration: ${(renderDuration / 1000).toFixed(1)}s rendered`);
    console.log(`   Time: ${(elapsed / 1000).toFixed(1)}s elapsed`);
    console.log(`   Speed: ${speedMultiplier.toFixed(2)}x realtime`);
    console.log(`   Size: ${fileSizeMB.toFixed(2)}MB`);
    console.log(`   Output: ${outputPath}`);

    // Verify the file exists and has content
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 0) {
        console.log(`\n🎉 Video file verified: ${stats.size} bytes`);
      } else {
        console.error(`\n⚠️  Video file is empty!`);
        process.exit(1);
      }
    } else {
      console.error(`\n⚠️  Video file not found at ${outputPath}`);
      process.exit(1);
    }
  } finally {
    // Clean up
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    if (shouldCloseBrowser) {
      await browser.close().catch(() => {});
    }
  }

  console.log(`\n✅ Test complete!`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
