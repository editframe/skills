#!/usr/bin/env npx tsx
/**
 * Render a dev-project video to file
 * 
 * Usage:
 *   npx tsx scripts/render-project.ts [project-name] [options]
 * 
 * Options:
 *   --output <path>    Output path for video file (default: ./[project-name].mp4)
 *   --visible          Show browser window (default: headless)
 *   --no-audio         Disable audio in export
 * 
 * Examples:
 *   npx tsx scripts/render-project.ts improv-edit
 *   npx tsx scripts/render-project.ts improv-edit --output ./my-video.mp4
 *   npx tsx scripts/render-project.ts improv-edit --visible
 */

import { chromium, type Browser } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const getArg = (name: string, defaultValue: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  // First non-flag argument is the project name
  const project = args.find(a => !a.startsWith("--")) || "design-catalog";
  const outputPath = getArg("output", `./${project}.mp4`);
  const headless = !hasFlag("visible"); // Default to headless
  const includeAudio = !hasFlag("no-audio");

  console.log(`\n🎬 Render Project`);
  console.log(`   Project: ${project}`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Audio: ${includeAudio}`);
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
      args: [
        "--autoplay-policy=no-user-gesture-required",
        "--enable-features=CanvasDrawElement",
      ],
    });
    shouldCloseBrowser = true;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console messages - show render progress inline
  let lastProgressLine = "";
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[renderToVideo]")) {
      // Extract just the message part
      const message = text.replace("[renderToVideo] ", "");
      
      // Progress updates (overwrite same line)
      if (message.match(/^\d+%/)) {
        process.stdout.write(`\r   ${message.padEnd(60)}`);
        lastProgressLine = message;
      }
      // Final stats - print on new lines
      else if (message.includes("Complete!") || message.includes("seek:") || 
               message.includes("render:") || message.includes("encode:") ||
               message.includes("audio:") || message.includes("total:") ||
               message.includes("frames:") || message.includes("video:") ||
               message.includes("speed:") || message.includes("───")) {
        if (lastProgressLine) {
          console.log(); // New line after progress
          lastProgressLine = "";
        }
        console.log(`   ${message}`);
      }
      // Starting message
      else if (message.includes("Starting:")) {
        console.log(`   ${message}`);
      }
    }
  });

  try {
    // Navigate to dev project
    const devUrl = `http://main.localhost:4321/${project}`;
    console.log(`📄 Loading ${devUrl}...`);
    
    await page.goto(devUrl, { waitUntil: "networkidle", timeout: 60000 });

    // Wait for timegroup to be ready
    await page.waitForSelector("ef-timegroup", { timeout: 30000 });
    await page.waitForFunction(() => {
      const tg = document.querySelector("ef-timegroup") as any;
      return tg && tg.durationMs > 0;
    }, { timeout: 30000 });

    // Get timegroup info
    const timegroupInfo = await page.evaluate(() => {
      const tg = document.querySelector("ef-timegroup") as any;
      return {
        durationMs: tg.durationMs,
        width: tg.offsetWidth,
        height: tg.offsetHeight,
      };
    });
    
    const durationSec = (timegroupInfo.durationMs / 1000).toFixed(1);
    const minutes = Math.floor(timegroupInfo.durationMs / 60000);
    const seconds = Math.floor((timegroupInfo.durationMs % 60000) / 1000);
    const durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    
    console.log(`✅ Timegroup ready: ${timegroupInfo.width}x${timegroupInfo.height}, ${durationFormatted}`);
    console.log(`\n🎬 Rendering...`);
    const startTime = Date.now();
    
    const absolutePath = path.resolve(outputPath);

    // Set up download handling to capture the file
    const downloadPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Download timeout")), 600000);
      
      page.on("download", async (download) => {
        clearTimeout(timeout);
        try {
          await download.saveAs(absolutePath);
          resolve(absolutePath);
        } catch (err) {
          reject(err);
        }
      });
    });

    // Render the video - use filename to trigger download instead of returning buffer
    const renderResult = await page.evaluate(async ({ audio, filename }) => {
      const timegroup = document.querySelector("ef-timegroup") as any;
      if (!timegroup?.renderToVideo) {
        return { success: false, error: "No renderToVideo method found" };
      }
      
      try {
        await timegroup.renderToVideo({
          toMs: timegroup.durationMs, // Full duration
          streaming: false,
          includeAudio: audio,
          returnBuffer: false,
          filename: filename, // Triggers download
          contentReadyMode: "immediate",
        });
        
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || String(err) };
      }
    }, { audio: includeAudio, filename: path.basename(outputPath) });

    if (!renderResult.success) {
      console.error(`\n❌ Render failed: ${renderResult.error}`);
      process.exit(1);
    }

    // Wait for download to complete
    try {
      await downloadPromise;
    } catch (err: any) {
      console.error(`\n❌ Download failed: ${err.message}`);
      process.exit(1);
    }

    const renderTime = (Date.now() - startTime) / 1000;
    
    // Get file size
    const stats = fs.statSync(absolutePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const speed = (timegroupInfo.durationMs / 1000 / renderTime).toFixed(2);
    
    console.log(`\n✅ Render complete!`);
    console.log(`   Output: ${absolutePath}`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log(`   Speed: ${speed}x realtime`)

  } finally {
    page.close().catch(() => {});
    context.close().catch(() => {});
    if (shouldCloseBrowser) {
      browser.close().catch(() => {});
    }
  }

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
