#!/usr/bin/env npx tsx
/**
 * Simple CPU Profiler for Workbench Tests
 *
 * Connects to browser, starts profiling on ALL targets, runs tests, stops profiling.
 */

import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { spawn } from "node:child_process";

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
  const testFile = "packages/elements/src/preview/renderTimegroupToVideo.workbench.browsertest.ts";

  console.log(`\n🔬 Simple Workbench Test CPU Profiler\n`);

  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) {
    console.error("Could not find monorepo root");
    process.exit(1);
  }

  const wsEndpointPath = path.join(monorepoRoot, ".wsEndpoint.json");
  if (!fs.existsSync(wsEndpointPath)) {
    console.error("Browser server not running. Start with: ./scripts/start-host-chrome");
    process.exit(1);
  }

  const { wsEndpoint } = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
  console.log(`📡 Connecting to browser: ${wsEndpoint}\n`);

  const browser = await chromium.connect(wsEndpoint);

  // Get CDP session for the browser (not a specific page)
  const browserCDP = await browser.newBrowserCDPSession();

  console.log(`🎬 Starting profiler on browser...\n`);

  // Start profiling on the browser level
  await browserCDP.send("Profiler.enable");
  await browserCDP.send("Profiler.setSamplingInterval", { interval: 100 });
  await browserCDP.send("Profiler.start");

  const startTime = Date.now();

  // Run the browsertest
  console.log(`🧪 Running tests...\n`);
  const browsertest = spawn("./scripts/browsertest", [testFile], {
    cwd: path.join(monorepoRoot, "elements"),
    stdio: "inherit",
    shell: true,
  });

  // Wait for browsertest to complete
  await new Promise<void>((resolve) => {
    browsertest.on("close", () => resolve());
    browsertest.on("error", () => resolve());
  });

  const wallClockMs = Date.now() - startTime;

  // Stop profiling
  console.log(`\n⏱️  Stopping profiler...\n`);
  const { profile } = (await browserCDP.send("Profiler.stop")) as any;
  await browserCDP.send("Profiler.disable");

  console.log(`⏱️  Tests completed in ${(wallClockMs / 1000).toFixed(2)}s`);

  // Save profile
  const outputPath = path.join(
    monorepoRoot,
    "elements",
    ".profiles",
    "workbench-integration-profile.json",
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2));
  console.log(`\n💾 Profile saved to: ${outputPath}`);

  // Quick analysis
  const hitCounts = new Map<number, number>();
  for (const sample of profile.samples) {
    hitCounts.set(sample, (hitCounts.get(sample) || 0) + 1);
  }

  const nonIdleNodes = profile.nodes.filter(
    (n: any) => n.callFrame.functionName !== "(idle)" && n.callFrame.functionName !== "(program)",
  );

  const nonIdleSamples = profile.samples.filter((sampleId: number) => {
    const node = profile.nodes.find((n: any) => n.id === sampleId);
    return (
      node &&
      node.callFrame.functionName !== "(idle)" &&
      node.callFrame.functionName !== "(program)"
    );
  });

  console.log(
    `📊 Profile captured ${nonIdleSamples.length} non-idle samples from ${profile.samples.length} total samples`,
  );
  console.log(`   ${nonIdleNodes.length} non-idle function nodes\n`);

  if (nonIdleSamples.length < 10) {
    console.log(`⚠️  Warning: Very few non-idle samples captured`);
    console.log(`   The profiler may not have captured meaningful test execution\n`);
  } else {
    // Print top functions
    const hotspots: Array<{ name: string; hits: number; pct: number }> = [];
    for (const node of profile.nodes) {
      const hits = hitCounts.get(node.id) || 0;
      if (
        hits > 0 &&
        node.callFrame.functionName !== "(idle)" &&
        node.callFrame.functionName !== "(program)"
      ) {
        hotspots.push({
          name: node.callFrame.functionName || "(anonymous)",
          hits,
          pct: (hits / profile.samples.length) * 100,
        });
      }
    }
    hotspots.sort((a, b) => b.hits - a.hits);

    console.log(`📊 Top 10 hotspots:`);
    for (const h of hotspots.slice(0, 10)) {
      console.log(
        `   ${h.hits.toString().padStart(6)} samples (${h.pct.toFixed(1).padStart(5)}%)  ${h.name.slice(0, 60)}`,
      );
    }
  }

  console.log(`\n✅ Done!`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
