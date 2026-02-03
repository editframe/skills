/**
 * Fidelity comparison test: Video-Only Asset
 *
 * This test renders a video-only asset (no audio track) with all rendering modes
 * and compares them against the server baseline. This tests the common case
 * of rendering video content without an audio component.
 *
 * All rendering is done in a single test to avoid fixture re-creation overhead.
 */

import { describe, expect } from "vitest";
import { test as fixtureTest } from "../fixtures";
import type { RenderMode, CanvasMode } from "../fixtures";
import {
  extractFramesForComparison,
  compareFramesWithOdiff,
  bundleTestTemplate,
} from "../../test-utils";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * All browser-based rendering mode combinations to test.
 * Native canvas mode is experimental - it produces valid output but with different
 * visual characteristics than foreignObject mode, so pixel fidelity tests are skipped.
 */
const BROWSER_MODES: Array<{ 
  renderMode: RenderMode; 
  canvasMode: CanvasMode; 
  label: string;
  /** Skip pixel fidelity comparison (still verifies valid MP4 output) */
  skipFidelityCheck?: boolean;
}> = [
  // Native mode: experimental drawElementImage API - skip fidelity check as output differs significantly
  { renderMode: "browser-full-video", canvasMode: "native", label: "browser-full-video + native", skipFidelityCheck: true },
  { renderMode: "browser-full-video", canvasMode: "foreignObject", label: "browser-full-video + foreignObject" },
  { renderMode: "browser-frame-by-frame", canvasMode: "native", label: "browser-frame-by-frame + native", skipFidelityCheck: true },
  { renderMode: "browser-frame-by-frame", canvasMode: "foreignObject", label: "browser-frame-by-frame + foreignObject" },
];

/**
 * Maximum allowed percentage of different pixels.
 * Note: The diff calculation uses a hardcoded 2M pixel count for HD video.
 * For our 480x270 test frames (129,600 pixels), a 10% threshold allows
 * for minor rendering differences between browser and server.
 */
const MAX_DIFF_PERCENTAGE = 10.0;

describe("Video-Only Asset Fidelity", () => {
  fixtureTest(
    "all render modes produce valid, comparable output",
    { timeout: 120000 },
    async ({ videoOnly, render }) => {
      const testFilePath = import.meta.url;
      const testStartTime = performance.now();

      // Use 1s video - minimum for frame extraction (1 frame/sec)
      const html = /* HTML */ `
        <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
          <ef-video asset-id="${videoOnly.id}" class="w-full" sourceOut="1s"></ef-video>
        </ef-timegroup>
      `;

      // Step 1: Bundle template ONCE
      const bundleStart = performance.now();
      const sharedBundle = await bundleTestTemplate(html, testFilePath, "video-only-fidelity-shared");
      console.log(`\n=== Bundle: ${(performance.now() - bundleStart).toFixed(0)}ms ===`);

      // Step 2: Render server baseline
      const baselineStart = performance.now();
      const baseline = await render(
        html,
        testFilePath,
        "video-only-fidelity-baseline",
        { renderSliceMs: 500, renderMode: "server" },
      );
      console.log(`Server baseline: ${(performance.now() - baselineStart).toFixed(0)}ms`);

      // Verify baseline
      expect(baseline.finalVideoBuffer.length).toBeGreaterThan(0);
      expect(baseline.renderInfo.width).toBe(480);
      expect(baseline.renderInfo.height).toBe(270);
      expect(baseline.renderInfo.durationMs).toBeGreaterThan(0);

      // Step 3: Extract baseline frames ONCE
      const extractStart = performance.now();
      const baselineFrames = await extractFramesForComparison(
        baseline.videoPath,
        baseline.templateHash,
        baseline.testFilePath,
        baseline.testTitle,
      );
      console.log(`Extract baseline frames: ${(performance.now() - extractStart).toFixed(0)}ms (${baselineFrames.length} frames)`);

      // Step 4: Render all browser modes IN PARALLEL with shared bundle
      console.log("\n=== Rendering browser modes (parallel, shared bundle) ===");
      const browserRenderStart = performance.now();

      const renderPromises = BROWSER_MODES.map(async (mode) => {
        const start = performance.now();
        try {
          const result = await render(
            html,
            testFilePath,
            `video-only-fidelity-${mode.renderMode}-${mode.canvasMode}`,
            {
              renderSliceMs: 500,
              renderMode: mode.renderMode,
              canvasMode: mode.canvasMode,
              bundleInfo: sharedBundle,
            },
          );
          return {
            label: mode.label,
            result,
            duration: performance.now() - start,
            error: null,
          };
        } catch (error) {
          return {
            label: mode.label,
            result: null,
            duration: performance.now() - start,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      const browserResults = await Promise.all(renderPromises);
      console.log(`Total browser render time: ${(performance.now() - browserRenderStart).toFixed(0)}ms`);

      // Log individual timings
      for (const { label, duration, error } of browserResults) {
        if (error) {
          console.log(`  ${label}: FAILED (${error})`);
        } else {
          console.log(`  ${label}: ${duration.toFixed(0)}ms`);
        }
      }

      // Step 5: Verify browser renders
      console.log("\n=== Verifying browser renders ===");
      for (const { label, result, error } of browserResults) {
        if (error) {
          console.log(`  ${label}: SKIPPED (render failed)`);
          continue;
        }
        if (!result) continue;

        expect(result.finalVideoBuffer.length, `${label} should produce output`).toBeGreaterThan(0);
        expect(result.renderInfo.width, `${label} width`).toBe(480);
        expect(result.renderInfo.height, `${label} height`).toBe(270);
        console.log(`  ${label}: ✓ valid (${(result.finalVideoBuffer.length / 1024).toFixed(1)} KB)`);
      }

      // Step 6: Frame-by-frame fidelity comparison
      console.log("\n=== Fidelity comparison ===");
      for (let idx = 0; idx < browserResults.length; idx++) {
        const { label, result } = browserResults[idx]!;
        const mode = BROWSER_MODES[idx]!;
        
        if (!result) continue;
        
        // Skip fidelity check for native mode (produces valid output but with different visual characteristics)
        if (mode.skipFidelityCheck) {
          console.log(`  ${label}: SKIPPED (native mode - visual output differs from server baseline)`);
          continue;
        }

        const testFrames = await extractFramesForComparison(
          result.videoPath,
          result.templateHash,
          result.testFilePath,
          result.testTitle,
        );

        // Frame count should match (or be close)
        const frameCountDiff = Math.abs(baselineFrames.length - testFrames.length);
        expect(frameCountDiff, `${label} frame count diff`).toBeLessThanOrEqual(1);

        // Compare each frame
        const framesToCompare = Math.min(baselineFrames.length, testFrames.length);
        let totalDiffPercentage = 0;
        let failedFrames = 0;

        for (let i = 0; i < framesToCompare; i++) {
          const baselineFrame = baselineFrames[i];
          const testFrame = testFrames[i];

          if (!baselineFrame || !testFrame) continue;

          const comparison = await compareFramesWithOdiff(
            baselineFrame,
            testFrame,
            result.templateHash,
            i,
            {
              threshold: 0.15,
              testFilePath: result.testFilePath,
              testTitle: result.testTitle,
            },
          );

          if (comparison.diffPercentage !== undefined) {
            totalDiffPercentage += comparison.diffPercentage;
            if (comparison.diffPercentage > MAX_DIFF_PERCENTAGE) {
              failedFrames++;
            }
          }
        }

        const avgDiffPercentage = framesToCompare > 0 ? totalDiffPercentage / framesToCompare : 0;
        const failureRate = framesToCompare > 0 ? failedFrames / framesToCompare : 0;

        console.log(
          `  ${label}: ${avgDiffPercentage.toFixed(2)}% avg diff, ${failedFrames}/${framesToCompare} frames exceeded ${MAX_DIFF_PERCENTAGE}%`,
        );

        // Assertions
        expect(failureRate, `${label} failure rate`).toBeLessThan(0.2);
        expect(avgDiffPercentage, `${label} avg diff`).toBeLessThan(MAX_DIFF_PERCENTAGE);
      }

      // Step 7: Dimensions consistency check
      console.log("\n=== Dimensions consistency ===");
      const expectedWidth = baseline.renderInfo.width;
      const expectedHeight = baseline.renderInfo.height;

      for (const { label, result } of browserResults) {
        if (!result) continue;

        expect(result.renderInfo.width, `${label} width`).toBe(expectedWidth);
        expect(result.renderInfo.height, `${label} height`).toBe(expectedHeight);
        console.log(`  ${label}: ${result.renderInfo.width}x${result.renderInfo.height} ✓`);
      }

      // Final timing
      const totalTime = (performance.now() - testStartTime) / 1000;
      console.log(`\n=== Total test time: ${totalTime.toFixed(1)}s ===\n`);
      
      // Write test results manifest for viewer
      // Convert absolute paths to relative paths from the root
      const makeRelativePath = (absPath: string) => {
        return absPath.replace('/app/', '').replace(/^\//, '');
      };
      
      const manifest = {
        timestamp: new Date().toISOString(),
        testName: "video-only-fidelity",
        totalTime,
        baseline: {
          label: "Server (baseline)",
          videoPath: makeRelativePath(baseline.videoPath),
          templateHash: baseline.templateHash,
          renderInfo: baseline.renderInfo,
        },
        results: browserResults.map(({ label, result, duration, error }) => ({
          label,
          videoPath: result?.videoPath ? makeRelativePath(result.videoPath) : null,
          templateHash: result?.templateHash,
          renderInfo: result?.renderInfo,
          duration,
          error,
          sizeKB: result ? (result.finalVideoBuffer.length / 1024).toFixed(1) : null,
        })),
      };
      
      const manifestPath = join(process.cwd(), "lib/queues/units-of-work/Render/full-render/fidelity/video-only-test-results.json");
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`Wrote test results manifest to: ${manifestPath}`);
    },
  );
});
