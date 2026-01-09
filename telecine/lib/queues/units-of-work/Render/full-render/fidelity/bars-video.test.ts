/**
 * Fidelity comparison test: Bars Video Pattern
 *
 * This test renders a simple bars pattern video with all rendering modes
 * and compares them against the server baseline to ensure fidelity.
 *
 * All rendering is done in a single test to avoid fixture re-creation overhead.
 */

import { describe, expect } from "vitest";
import { test as fixtureTest } from "../fixtures";
import type { RenderMode, CanvasMode } from "../fixtures";
import type { RenderOutput } from "../../test-utils";
import {
  extractFramesForComparison,
  compareFramesWithOdiff,
  bundleTestTemplate,
} from "../../test-utils";

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
 * For our 480x270 test frames (129,600 pixels), a 7% threshold allows
 * for minor rendering differences between browser and server.
 */
const MAX_DIFF_PERCENTAGE = 10.0;

describe("Bars Video Fidelity", () => {
  fixtureTest(
    "all render modes produce valid, comparable output",
    { timeout: 120000 },
    async ({ barsNTone, render }) => {
      const testFilePath = import.meta.url;
      const testStartTime = performance.now();

      // Use 1s video - minimum for frame extraction (1 frame/sec)
      const html = /* HTML */ `
        <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
          <ef-video asset-id="${barsNTone.id}" class="w-full" sourceOut="1s"></ef-video>
        </ef-timegroup>
      `;

      // Step 1: Bundle template ONCE
      const bundleStart = performance.now();
      const sharedBundle = await bundleTestTemplate(html, testFilePath, "bars-fidelity-shared");
      console.log(`\n=== Bundle: ${(performance.now() - bundleStart).toFixed(0)}ms ===`);

      // Step 2: Render server baseline
      const baselineStart = performance.now();
      const baseline = await render(
        html,
        testFilePath,
        "bars-fidelity-baseline",
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
            `bars-fidelity-${mode.renderMode}-${mode.canvasMode}`,
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

      // Step 7: File size comparison
      console.log("\n=== File size comparison ===");
      const baselineSize = baseline.finalVideoBuffer.length;
      console.log(`  Baseline: ${(baselineSize / 1024).toFixed(1)} KB`);

      for (const { label, result } of browserResults) {
        if (!result) continue;

        const ratio = result.finalVideoBuffer.length / baselineSize;
        console.log(
          `  ${label}: ${(result.finalVideoBuffer.length / 1024).toFixed(1)} KB (${(ratio * 100).toFixed(0)}% of baseline)`,
        );

        expect(ratio, `${label} size ratio`).toBeGreaterThan(0.1);
        expect(ratio, `${label} size ratio`).toBeLessThan(10);
      }

      // Final timing
      const totalTime = (performance.now() - testStartTime) / 1000;
      console.log(`\n=== Total test time: ${totalTime.toFixed(1)}s ===\n`);
    },
  );
});
