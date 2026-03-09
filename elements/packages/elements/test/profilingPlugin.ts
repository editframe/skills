/**
 * Vitest Browser Profiling Plugin
 *
 * Captures Chrome DevTools CPU profiles during browser tests.
 * Enable with VITEST_PROFILE=1 environment variable.
 *
 * Usage:
 *   VITEST_PROFILE=1 ./scripts/browsertest <test-file>
 *   ./scripts/browsertest --profile <test-file>
 *
 * Output:
 *   Creates ./browsertest-profile.cpuprofile in the elements directory
 */

import type { Plugin } from "vite";
import * as fs from "node:fs";
import * as path from "node:path";

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

// Global state for CDP session and profile
let cdpSession: any = null;
let profilingStartTime: number = 0;

export function profilingPlugin(): Plugin {
  const isProfilingEnabled = process.env.VITEST_PROFILE === "1";

  if (!isProfilingEnabled) {
    return { name: "vitest-profiling-disabled" };
  }

  console.log("\n🔬 CPU Profiling enabled for browser tests\n");

  return {
    name: "vitest-browser-profiling",

    // Hook into server configuration to get access to the browser
    configureServer(server) {
      // We need to hook into the Vitest browser lifecycle
      // This is tricky because Vitest manages the browser connection

      // Add an endpoint that tests can call to start/stop profiling
      server.middlewares.use("/__vitest_profile__/start", async (_req, res) => {
        try {
          // Get the CDP session from the connected browser
          // This requires access to the Playwright page, which Vitest manages
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "profiling_start_requested" }));
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(error) }));
        }
      });

      server.middlewares.use("/__vitest_profile__/stop", async (_req, res) => {
        try {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "profiling_stop_requested" }));
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    },
  };
}

/**
 * Start CDP profiling on a Playwright page
 * Call this from test setup or beforeAll
 */
export async function startProfiling(page: any): Promise<void> {
  try {
    // Get CDP session from Playwright page
    // In Playwright, we access CDP via page.context().newCDPSession(page)
    const context = page.context();
    cdpSession = await context.newCDPSession(page);

    await cdpSession.send("Profiler.enable");
    await cdpSession.send("Profiler.setSamplingInterval", { interval: 100 }); // 100µs
    await cdpSession.send("Profiler.start");

    profilingStartTime = Date.now();
    console.log("🎬 CPU profiling started");
  } catch (error) {
    console.error("Failed to start profiling:", error);
  }
}

/**
 * Stop CDP profiling and save the profile
 * Call this from test teardown or afterAll
 */
export async function stopProfiling(outputPath?: string): Promise<CPUProfile | null> {
  if (!cdpSession) return null;

  try {
    const { profile } = (await cdpSession.send("Profiler.stop")) as {
      profile: CPUProfile;
    };
    await cdpSession.send("Profiler.disable");

    const duration = Date.now() - profilingStartTime;
    console.log(`⏱️  CPU profiling stopped after ${duration}ms`);

    // Save profile
    const finalPath = outputPath || "./browsertest-profile.cpuprofile";
    const profileJson = JSON.stringify(profile, null, 2);
    fs.writeFileSync(finalPath, profileJson);
    console.log(`💾 Profile saved to: ${finalPath}`);
    console.log(`   Load in Chrome DevTools → Performance → Load profile`);

    // Print summary
    printProfileSummary(profile, duration);

    cdpSession = null;
    return profile;
  } catch (error) {
    console.error("Failed to stop profiling:", error);
    return null;
  }
}

function printProfileSummary(profile: CPUProfile, wallClockMs: number): void {
  const hitCounts = new Map<number, number>();
  for (const sample of profile.samples) {
    hitCounts.set(sample, (hitCounts.get(sample) || 0) + 1);
  }

  const sampleIntervalUs =
    profile.timeDeltas.length > 0
      ? profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.timeDeltas.length
      : 1000;

  const totalSamples = profile.samples.length;
  const profileTimeMs = (totalSamples * sampleIntervalUs) / 1000;

  // Build hotspots
  const hotspots: { name: string; file: string; timeMs: number }[] = [];
  for (const node of profile.nodes) {
    const hitCount = hitCounts.get(node.id) || 0;
    if (hitCount === 0) continue;

    const selfTimeMs = (hitCount * sampleIntervalUs) / 1000;
    const file = node.callFrame.url?.split("/").slice(-1)[0]?.split("?")[0] || "(native)";

    hotspots.push({
      name: node.callFrame.functionName || "(anonymous)",
      file,
      timeMs: selfTimeMs,
    });
  }

  hotspots.sort((a, b) => b.timeMs - a.timeMs);

  // Group by file
  const byFile = new Map<string, number>();
  for (const h of hotspots) {
    byFile.set(h.file, (byFile.get(h.file) || 0) + h.timeMs);
  }
  const sortedFiles = Array.from(byFile.entries()).sort((a, b) => b[1] - a[1]);

  console.log(
    `\n📊 Profile Summary (${wallClockMs}ms wall clock, ${profileTimeMs.toFixed(1)}ms profile time)`,
  );
  console.log(`\n   Top files:`);
  for (const [file, time] of sortedFiles.slice(0, 10)) {
    const pct = ((time / profileTimeMs) * 100).toFixed(1);
    console.log(`   ${time.toFixed(1).padStart(8)}ms (${pct.padStart(5)}%)  ${file}`);
  }

  // Our code
  const ourCode = hotspots.filter(
    (h) =>
      h.file.includes(".ts") &&
      !h.file.includes("node_modules") &&
      (h.file.includes("render") ||
        h.file.includes("preview") ||
        h.file.includes("element") ||
        h.file.includes("Timegroup") ||
        h.file.includes("clone") ||
        h.file.includes("sync")),
  );

  if (ourCode.length > 0) {
    console.log(`\n   Top functions in our code:`);
    for (const h of ourCode.slice(0, 10)) {
      console.log(
        `   ${h.timeMs.toFixed(1).padStart(8)}ms  ${h.name.slice(0, 40).padEnd(40)} ${h.file}`,
      );
    }
  }

  console.log();
}
