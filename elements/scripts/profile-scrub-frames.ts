#!/usr/bin/env npx ts-node
/**
 * Frame Display Profiling for Scrubbing
 *
 * Tracks video frame display timing during scrubbing to identify:
 * - How many frames are displayed vs dropped
 * - Time between displayed frames
 * - Seek request vs frame display latency
 *
 * Usage:
 *   npx tsx scripts/profile-scrub-frames.ts [options]
 *
 * Options:
 *   --project <name>   Dev project to profile (default: improv-edit)
 *   --duration <ms>    Scrubbing duration in ms (default: 5000)
 *   --scrub-speed <ms> Time between scrub updates in ms (default: 100)
 *   --headless         Run in headless mode (default: false)
 */

import { chromium, type Browser } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FrameDisplayEvent {
  timestamp: number;
  seekTimeMs: number;
  displayedTimeMs: number | null;
  frameDisplayed: boolean;
  seekLatencyMs: number | null;
}

interface ScrubProfile {
  totalSeeks: number;
  framesDisplayed: number;
  framesDropped: number;
  averageFrameIntervalMs: number;
  maxFrameIntervalMs: number;
  minFrameIntervalMs: number;
  averageSeekLatencyMs: number;
  maxSeekLatencyMs: number;
  events: FrameDisplayEvent[];
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
  const args = process.argv.slice(2);
  const getArg = (name: string, defaultValue: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  const project = getArg("project", "improv-edit");
  const duration = parseInt(getArg("duration", "5000"), 10);
  const scrubSpeed = parseInt(getArg("scrub-speed", "100"), 10);
  const headless = hasFlag("headless");

  console.log(`\n🔬 Frame Display Profiling for Scrubbing`);
  console.log(`   Project: ${project}`);
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Scrub speed: ${scrubSpeed}ms between updates`);
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
      args: ["--autoplay-policy=no-user-gesture-required"],
    });
    shouldCloseBrowser = true;
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  // Track video frame displays by intercepting canvas drawImage calls
  await page.addInitScript(() => {
    // Track when video frames are painted to canvas
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
      // Check if this is a VideoFrame being drawn
      const firstArg = args[0];
      if (firstArg) {
        // Check multiple ways to detect VideoFrame
        const isVideoFrame =
          firstArg.constructor?.name === "VideoFrame" ||
          (firstArg.timestamp !== undefined && firstArg.codedWidth !== undefined) ||
          (typeof firstArg === "object" && "timestamp" in firstArg && "format" in firstArg);

        if (isVideoFrame) {
          const videoFrame = firstArg as VideoFrame;
          const timestamp = videoFrame.timestamp || 0;
          const now = performance.now();

          // Store frame display event with canvas element info
          (window as any).__frameDisplayEvents = (window as any).__frameDisplayEvents || [];
          (window as any).__frameDisplayEvents.push({
            timestamp: now,
            videoFrameTimestamp: timestamp,
            videoFrameTimestampMs: timestamp / 1000,
            canvasId: (this.canvas as HTMLElement)?.id || "unknown",
            canvasWidth: this.canvas?.width || 0,
            canvasHeight: this.canvas?.height || 0,
          });
        }
      }
      return originalDrawImage.apply(this, args);
    };

    // Also track paint calls on EFVideo elements directly
    const originalPaint = (window as any).EFVideo?.prototype?.paint;
    if (originalPaint) {
      (window as any).EFVideo.prototype.paint = function (...args: any[]) {
        const seekToMs = args[0] || 0;
        const now = performance.now();
        (window as any).__frameDisplayEvents = (window as any).__frameDisplayEvents || [];
        (window as any).__frameDisplayEvents.push({
          timestamp: now,
          videoFrameTimestamp: seekToMs * 1000,
          videoFrameTimestampMs: seekToMs,
          source: "paint",
          canvasId: this.id || "unknown",
        });
        return originalPaint.apply(this, args);
      };
    }
  });

  try {
    const devUrl = `http://main.localhost:4321/${project}`;
    console.log(`📄 Loading ${devUrl}...`);
    await page.goto(devUrl, { waitUntil: "networkidle", timeout: 60000 });

    console.log(`⏳ Waiting for timegroup...`);
    await page.waitForSelector("ef-timegroup", { timeout: 30000 });
    await page.waitForFunction(
      () => {
        const tg = document.querySelector("ef-timegroup") as any;
        return tg && tg.durationMs > 0;
      },
      { timeout: 30000 },
    );

    const timegroupInfo = await page.evaluate(() => {
      const tg = document.querySelector("ef-timegroup") as any;
      return {
        durationMs: tg.durationMs,
        width: tg.offsetWidth,
        height: tg.offsetHeight,
        currentTimeMs: tg.currentTimeMs,
      };
    });
    console.log(
      `✅ Timegroup ready: ${timegroupInfo.width}x${timegroupInfo.height}, ${timegroupInfo.durationMs}ms`,
    );
    console.log(`   Current time: ${timegroupInfo.currentTimeMs}ms`);

    // Get all video elements
    const videoElements = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll("ef-video"));
      return videos.map((v: any, i: number) => ({
        index: i,
        id: v.id || `video-${i}`,
        src: v.src || "unknown",
        desiredSeekTimeMs: v.desiredSeekTimeMs || 0,
      }));
    });
    console.log(`📹 Found ${videoElements.length} video element(s)`);

    // Clear frame display events
    await page.evaluate(() => {
      (window as any).__frameDisplayEvents = [];
    });

    console.log(`\n🎬 Starting scrubbing and frame tracking...`);
    const scrubStartTime = Date.now();

    // Perform scrubbing and track seeks
    const seekEvents = await page.evaluate(
      async ({ duration, scrubSpeed, totalDuration }) => {
        const timegroup = document.querySelector("ef-timegroup") as any;
        if (!timegroup) {
          throw new Error("Timegroup not found");
        }

        const seekEvents: Array<{
          timestamp: number;
          seekTimeMs: number;
          videoDesiredSeekTimes: number[];
        }> = [];
        const startTime = Date.now();
        const endTime = startTime + duration;

        // Simulate scrubbing by updating currentTimeMs
        while (Date.now() < endTime) {
          const progress = Math.random();
          const targetTime = progress * totalDuration;
          const seekTimestamp = performance.now();

          timegroup.currentTimeMs = targetTime;

          // Wait a bit for the seek to propagate
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Get video desired seek times after the seek
          const videosAfter = Array.from(document.querySelectorAll("ef-video")) as any[];
          const desiredSeekTimesAfter = videosAfter.map((v) => v.desiredSeekTimeMs || 0);

          seekEvents.push({
            timestamp: seekTimestamp,
            seekTimeMs: targetTime,
            videoDesiredSeekTimes: desiredSeekTimesAfter,
          });

          // Wait for the seek to process
          await new Promise((resolve) => setTimeout(resolve, scrubSpeed));
        }

        return seekEvents;
      },
      { duration, scrubSpeed, totalDuration: timegroupInfo.durationMs },
    );

    const scrubDuration = Date.now() - scrubStartTime;
    console.log(`⏱️  Scrubbing completed in ${(scrubDuration / 1000).toFixed(2)}s`);

    // Wait a bit more to catch any delayed frame displays
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const finalFrameEvents = await page.evaluate(() => {
      return (window as any).__frameDisplayEvents || [];
    });

    console.log(`\n📊 Frame Display Analysis:`);
    console.log(`   Total seek requests: ${seekEvents.length}`);
    console.log(`   Total frame displays: ${finalFrameEvents.length}`);

    // Analyze frame intervals
    const frameIntervals: number[] = [];
    for (let i = 1; i < finalFrameEvents.length; i++) {
      const interval = finalFrameEvents[i].timestamp - finalFrameEvents[i - 1].timestamp;
      frameIntervals.push(interval);
    }

    if (frameIntervals.length > 0) {
      const avgInterval = frameIntervals.reduce((a, b) => a + b, 0) / frameIntervals.length;
      const maxInterval = Math.max(...frameIntervals);
      const minInterval = Math.min(...frameIntervals);

      console.log(`\n   Frame Display Intervals:`);
      console.log(`     Average: ${avgInterval.toFixed(1)}ms`);
      console.log(`     Min: ${minInterval.toFixed(1)}ms`);
      console.log(`     Max: ${maxInterval.toFixed(1)}ms`);
      console.log(`     Expected (scrub speed): ${scrubSpeed}ms`);

      // Count frames that are displayed within expected time
      const framesOnTime = frameIntervals.filter((interval) => interval <= scrubSpeed * 2).length;
      const framesLate = frameIntervals.filter((interval) => interval > scrubSpeed * 2).length;

      console.log(`\n   Frame Timing:`);
      console.log(`     On time (≤${scrubSpeed * 2}ms): ${framesOnTime}`);
      console.log(`     Late (>${scrubSpeed * 2}ms): ${framesLate}`);
    }

    // Match seeks to frame displays
    const matchedEvents: FrameDisplayEvent[] = [];
    const usedFrames = new Set<number>();

    // Sort frame events by timestamp
    const sortedFrames = [...finalFrameEvents].sort((a, b) => a.timestamp - b.timestamp);

    console.log(`\n   Debug: ${seekEvents.length} seeks, ${sortedFrames.length} frames`);
    if (seekEvents.length > 0 && sortedFrames.length > 0) {
      console.log(`   First seek: ${seekEvents[0].seekTimeMs}ms at ${seekEvents[0].timestamp}ms`);
      console.log(
        `   First frame: ${sortedFrames[0].videoFrameTimestampMs}ms at ${sortedFrames[0].timestamp}ms`,
      );
    }

    // For each seek, find the next frame display that matches
    for (let i = 0; i < seekEvents.length; i++) {
      const seekEvent = seekEvents[i];
      const seekTimestamp = seekEvent.timestamp;
      const seekTimeMs = seekEvent.seekTimeMs;

      // Find the first frame display after this seek that matches the seek time
      // and hasn't been matched to a previous seek
      let matchingFrame: any | null = null;
      let matchingFrameIndex = -1;
      let bestMatch: {
        frame: any;
        index: number;
        timeDiff: number;
        timestampDiff: number;
      } | null = null;

      for (let j = 0; j < sortedFrames.length; j++) {
        if (usedFrames.has(j)) continue;

        const frame = sortedFrames[j];
        const timeDiff = Math.abs(frame.videoFrameTimestampMs - seekTimeMs);
        const timestampDiff = frame.timestamp - seekTimestamp;

        // Frame must be after the seek (or very close), match the time (within 500ms for scrubbing)
        if (timestampDiff >= -100 && timeDiff < 500) {
          if (!bestMatch || timeDiff < bestMatch.timeDiff) {
            bestMatch = {
              frame,
              index: j,
              timeDiff,
              timestampDiff,
            };
          }
        }
      }

      // Use best match if it's reasonable
      if (bestMatch && bestMatch.timeDiff < 500 && bestMatch.timestampDiff < 3000) {
        matchingFrame = bestMatch.frame;
        matchingFrameIndex = bestMatch.index;
      }

      if (matchingFrame) {
        usedFrames.add(matchingFrameIndex);
        matchedEvents.push({
          timestamp: seekTimestamp,
          seekTimeMs: seekTimeMs,
          displayedTimeMs: matchingFrame.videoFrameTimestampMs,
          frameDisplayed: true,
          seekLatencyMs: matchingFrame.timestamp - seekTimestamp,
        });
      } else {
        matchedEvents.push({
          timestamp: seekTimestamp,
          seekTimeMs: seekTimeMs,
          displayedTimeMs: null,
          frameDisplayed: false,
          seekLatencyMs: null,
        });
      }
    }

    const framesDisplayed = matchedEvents.filter((e) => e.frameDisplayed).length;
    const framesDropped = matchedEvents.filter((e) => !e.frameDisplayed).length;

    console.log(`\n   Frame Display vs Drops:`);
    console.log(
      `     Displayed: ${framesDisplayed} (${((framesDisplayed / matchedEvents.length) * 100).toFixed(1)}%)`,
    );
    console.log(
      `     Dropped: ${framesDropped} (${((framesDropped / matchedEvents.length) * 100).toFixed(1)}%)`,
    );
    console.log(
      `     Total frames rendered: ${finalFrameEvents.length} (may include frames from multiple videos)`,
    );

    if (framesDisplayed > 0) {
      const latencies = matchedEvents
        .filter((e) => e.seekLatencyMs !== null)
        .map((e) => e.seekLatencyMs!);

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);

      console.log(`\n   Seek to Display Latency (for displayed frames):`);
      console.log(`     Average: ${avgLatency.toFixed(1)}ms`);
      console.log(`     Min: ${minLatency.toFixed(1)}ms`);
      console.log(`     Max: ${maxLatency.toFixed(1)}ms`);
    }

    // Analyze consecutive dropped frames
    let consecutiveDrops = 0;
    let maxConsecutiveDrops = 0;
    for (const event of matchedEvents) {
      if (!event.frameDisplayed) {
        consecutiveDrops++;
        maxConsecutiveDrops = Math.max(maxConsecutiveDrops, consecutiveDrops);
      } else {
        consecutiveDrops = 0;
      }
    }

    console.log(`\n   Consecutive Frame Drops:`);
    console.log(`     Max consecutive drops: ${maxConsecutiveDrops}`);

    // Show timeline of seeks vs frames
    if (matchedEvents.length > 0 && finalFrameEvents.length > 0) {
      console.log(`\n   Timeline Analysis (first 10 events):`);
      for (let i = 0; i < Math.min(10, matchedEvents.length); i++) {
        const event = matchedEvents[i];
        const timeSinceStart = event.timestamp - matchedEvents[0].timestamp;
        if (event.frameDisplayed) {
          console.log(
            `     ${timeSinceStart.toFixed(0)}ms: Seek ${event.seekTimeMs.toFixed(0)}ms → Frame ${event.displayedTimeMs?.toFixed(0)}ms (latency: ${event.seekLatencyMs?.toFixed(0)}ms)`,
          );
        } else {
          console.log(
            `     ${timeSinceStart.toFixed(0)}ms: Seek ${event.seekTimeMs.toFixed(0)}ms → DROPPED`,
          );
        }
      }
    }

    // Show distribution of frame intervals
    if (frameIntervals.length > 0) {
      const intervalsByRange = {
        "0-50ms": frameIntervals.filter((i) => i <= 50).length,
        "50-100ms": frameIntervals.filter((i) => i > 50 && i <= 100).length,
        "100-200ms": frameIntervals.filter((i) => i > 100 && i <= 200).length,
        "200-500ms": frameIntervals.filter((i) => i > 200 && i <= 500).length,
        "500ms+": frameIntervals.filter((i) => i > 500).length,
      };

      console.log(`\n   Frame Interval Distribution:`);
      for (const [range, count] of Object.entries(intervalsByRange)) {
        const pct = ((count / frameIntervals.length) * 100).toFixed(1);
        console.log(`     ${range.padEnd(10)}: ${count.toString().padStart(3)} (${pct}%)`);
      }
    }

    // Save detailed profile
    const profile: ScrubProfile = {
      totalSeeks: matchedEvents.length,
      framesDisplayed,
      framesDropped,
      averageFrameIntervalMs:
        frameIntervals.length > 0
          ? frameIntervals.reduce((a, b) => a + b, 0) / frameIntervals.length
          : 0,
      maxFrameIntervalMs: frameIntervals.length > 0 ? Math.max(...frameIntervals) : 0,
      minFrameIntervalMs: frameIntervals.length > 0 ? Math.min(...frameIntervals) : 0,
      averageSeekLatencyMs:
        matchedEvents.filter((e) => e.seekLatencyMs !== null).length > 0
          ? matchedEvents
              .filter((e) => e.seekLatencyMs !== null)
              .reduce((sum, e) => sum + (e.seekLatencyMs || 0), 0) / framesDisplayed
          : 0,
      maxSeekLatencyMs: Math.max(
        ...matchedEvents.filter((e) => e.seekLatencyMs !== null).map((e) => e.seekLatencyMs || 0),
      ),
      events: matchedEvents,
    };

    const profilePath = "./scrub-frame-profile.json";
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    console.log(`\n💾 Detailed profile saved to: ${profilePath}`);
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
