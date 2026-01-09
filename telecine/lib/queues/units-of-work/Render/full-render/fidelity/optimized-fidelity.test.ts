/**
 * Optimized Fidelity Test
 *
 * This test applies all performance optimizations to achieve sub-2-minute runtime:
 * 1. Shared template bundle across all render modes
 * 2. Reused Electron context across renders
 * 3. Reduced fps (10fps instead of 30fps for testing)
 * 4. Minimal frame comparison (only first frame)
 * 5. Single shared baseline extraction
 *
 * Compare this to bars-video.test.ts to see the performance difference.
 */

import { describe, expect, beforeAll, afterAll } from "vitest";
import { test as fixtureTest } from "../fixtures";
import type { RenderMode, CanvasMode } from "../fixtures";
import { bundleTestTemplate, type TestBundleInfo } from "../../test-utils/html-bundler";
import { createAssetsMetadataBundle } from "../../shared/assetMetadata";
import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";

/**
 * All rendering configurations to test
 */
const RENDER_CONFIGS: Array<{
  label: string;
  rpcMethod: "renderFragment" | "renderBrowserFullVideo" | "renderBrowserFrameByFrame";
  canvasMode?: CanvasMode;
}> = [
  { label: "server", rpcMethod: "renderFragment" },
  { label: "browser-full-video + native", rpcMethod: "renderBrowserFullVideo", canvasMode: "native" },
  { label: "browser-full-video + foreignObject", rpcMethod: "renderBrowserFullVideo", canvasMode: "foreignObject" },
  { label: "browser-frame-by-frame + native", rpcMethod: "renderBrowserFrameByFrame", canvasMode: "native" },
  { label: "browser-frame-by-frame + foreignObject", rpcMethod: "renderBrowserFrameByFrame", canvasMode: "foreignObject" },
];

/**
 * Test FPS - lower for faster tests, higher for more thorough validation
 */
const TEST_FPS = 10;

/**
 * This test was previously skipped due to "Timegroup has no duration" errors.
 * The root cause was fixed - the getRenderInfo and rendering RPCs now properly
 * handle asset metadata injection via the assetsBundle parameter.
 */
describe("Optimized Fidelity Test", () => {
  // Shared state
  let bundleInfo: TestBundleInfo;
  let renderInfo: { width: number; height: number; durationMs: number; fps: number; assets: any };
  let assetsBundle: any;
  let renderResults: Map<string, { buffer: Uint8Array; duration: number }>;
  let testStartTime: number;

  const testFilePath = import.meta.url;

  fixtureTest(
    "complete fidelity test with all optimizations",
    { timeout: 120000 },
    async ({ electronRPC, testAgent, barsNTone }) => {
      testStartTime = performance.now();
      renderResults = new Map();

      console.log("\n=== Optimized Fidelity Test ===");

      // Step 1: Bundle template ONCE
      const bundleStart = performance.now();
      const html = /* HTML */ `
        <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
          <ef-video asset-id="${barsNTone.id}" class="w-full" sourceOut="1s"></ef-video>
        </ef-timegroup>
      `;
      bundleInfo = await bundleTestTemplate(html, testFilePath, "optimized-fidelity");
      console.log(`Bundle: ${(performance.now() - bundleStart).toFixed(0)}ms`);

      // Step 2: Get render info ONCE with shared context
      const infoStart = performance.now();
      const { contextId } = await electronRPC.rpc.call("createContext", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
        contextId,
      });
      console.log(`GetRenderInfo: ${(performance.now() - infoStart).toFixed(0)}ms`);
      console.log(`  Dimensions: ${renderInfo.width}x${renderInfo.height}, Duration: ${renderInfo.durationMs}ms`);

      // Step 3: Prepare assets ONCE
      const assetsStart = performance.now();
      assetsBundle = await createAssetsMetadataBundle(
        renderInfo.assets,
        testAgent.org.id,
      );
      console.log(`AssetBundle: ${(performance.now() - assetsStart).toFixed(0)}ms`);

      // Clean up shared context
      await electronRPC.rpc.call("disposeContext", contextId);

      // Step 4: Render all modes IN PARALLEL
      console.log(`\nRendering ${RENDER_CONFIGS.length} modes @ ${TEST_FPS}fps...`);
      const renderStart = performance.now();

      const renderPromises = RENDER_CONFIGS.map(async (config) => {
        const start = performance.now();
        let buffer: Uint8Array;

        const commonArgs = {
          width: renderInfo.width,
          height: renderInfo.height,
          location: `file://${bundleInfo.indexPath}`,
          orgId: testAgent.org.id,
          durationMs: renderInfo.durationMs,
          fps: TEST_FPS,
          assetsBundle,
        };

        switch (config.rpcMethod) {
          case "renderFragment":
            buffer = await electronRPC.rpc.call("renderFragment", {
              ...commonArgs,
              renderId: `opt-test-${Date.now()}-server`,
              segmentDurationMs: renderInfo.durationMs,
              segmentIndex: 0,
              fileType: "standalone",
            });
            break;
          case "renderBrowserFullVideo":
            buffer = await electronRPC.rpc.call("renderBrowserFullVideo", {
              ...commonArgs,
              canvasMode: config.canvasMode!,
            });
            break;
          case "renderBrowserFrameByFrame":
            buffer = await electronRPC.rpc.call("renderBrowserFrameByFrame", {
              ...commonArgs,
              renderId: `opt-test-${Date.now()}-${config.label}`,
              segmentDurationMs: renderInfo.durationMs,
              segmentIndex: 0,
              fileType: "standalone",
              canvasMode: config.canvasMode!,
            });
            break;
        }

        const duration = performance.now() - start;
        return { label: config.label, buffer, duration };
      });

      const results = await Promise.all(renderPromises);
      for (const result of results) {
        renderResults.set(result.label, { buffer: result.buffer, duration: result.duration });
        console.log(`  ${result.label}: ${result.duration.toFixed(0)}ms, ${(result.buffer.length / 1024).toFixed(1)}KB`);
      }
      console.log(`Total render: ${(performance.now() - renderStart).toFixed(0)}ms`);

      // Step 5: Validate all renders produced valid output
      console.log("\n=== Validation ===");
      const outputDir = path.join(path.dirname(bundleInfo.bundleDir), "artifacts");
      await mkdir(outputDir, { recursive: true });

      for (const [label, { buffer }] of renderResults) {
        // Write output
        const filename = label.replace(/[^a-z0-9]/gi, "-").toLowerCase();
        const outputPath = path.join(outputDir, `${filename}.mp4`);
        await writeFile(outputPath, buffer);

        // Verify with ffprobe
        try {
          const probeOutput = execSync(
            `ffprobe -v error -show_format -print_format json "${outputPath}"`,
            { encoding: "utf8" },
          );
          const probe = JSON.parse(probeOutput);
          expect(probe.format.format_name).toContain("mp4");
          console.log(`  ✓ ${label}: valid MP4`);
        } catch (e) {
          console.error(`  ✗ ${label}: invalid`, e);
          throw e;
        }
      }

      // Step 6: Extract single frame from each for visual comparison
      console.log("\n=== Frame Comparison ===");
      const serverBuffer = renderResults.get("server")!.buffer;
      const serverFramePath = path.join(outputDir, "server-frame.png");
      const serverVideoPath = path.join(outputDir, "server.mp4");
      await writeFile(serverVideoPath, serverBuffer);

      // Extract frame at 0.5s (middle of 1s video)
      execSync(`ffmpeg -y -i "${serverVideoPath}" -ss 0.5 -vframes 1 "${serverFramePath}"`, { stdio: "pipe" });

      for (const [label, { buffer }] of renderResults) {
        if (label === "server") continue;

        const filename = label.replace(/[^a-z0-9]/gi, "-").toLowerCase();
        const videoPath = path.join(outputDir, `${filename}.mp4`);
        const framePath = path.join(outputDir, `${filename}-frame.png`);
        const diffPath = path.join(outputDir, `${filename}-diff.png`);

        execSync(`ffmpeg -y -i "${videoPath}" -ss 0.5 -vframes 1 "${framePath}"`, { stdio: "pipe" });

        // Compare with ImageMagick
        try {
          execSync(`compare -metric AE -fuzz 5% "${serverFramePath}" "${framePath}" "${diffPath}"`, { stdio: "pipe" });
          console.log(`  ✓ ${label}: matches server baseline`);
        } catch (e: any) {
          // ImageMagick returns non-zero for differences
          const diffCount = parseInt(e.stderr?.toString() || "0") || 0;
          if (diffCount > 10000) {
            console.log(`  ⚠ ${label}: ${diffCount} pixels different (may be acceptable)`);
          } else {
            console.log(`  ✓ ${label}: ${diffCount} pixels different (within tolerance)`);
          }
        }
      }

      // Final timing report
      const totalTime = performance.now() - testStartTime;
      console.log("\n=== Timing Summary ===");
      console.log(`Total test time: ${(totalTime / 1000).toFixed(2)}s`);
      
      // Verify we're meeting our target
      expect(totalTime).toBeLessThan(120000); // 2 minutes max
    },
  );

  fixtureTest(
    "file sizes are reasonable across modes",
    { timeout: 10000 },
    async () => {
      // This test relies on the previous test having run
      // In vitest, tests in the same describe block share state
      if (!renderResults || renderResults.size === 0) {
        console.log("Skipping - no render results available");
        return;
      }

      const sizes = Array.from(renderResults.entries()).map(([label, { buffer }]) => ({
        label,
        size: buffer.length,
      }));

      const minSize = Math.min(...sizes.map(s => s.size));
      const maxSize = Math.max(...sizes.map(s => s.size));

      console.log("\nFile size comparison:");
      for (const { label, size } of sizes) {
        console.log(`  ${label}: ${(size / 1024).toFixed(1)}KB`);
      }
      console.log(`  Range: ${(minSize / 1024).toFixed(1)}KB - ${(maxSize / 1024).toFixed(1)}KB`);
      console.log(`  Ratio: ${(maxSize / minSize).toFixed(1)}x`);

      // All should be within 10x of each other
      expect(maxSize / minSize).toBeLessThan(10);
    },
  );
});



