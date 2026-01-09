/**
 * Performance benchmarks for renderTimegroupToCanvas sync strategies.
 * 
 * This test file measures the performance of different style synchronization
 * strategies and verifies they all produce visually identical output.
 * 
 * Run with:
 *   cd elements && ./scripts/browsertest src/preview/renderTimegroupToCanvas.benchmark.browsertest.ts
 */

import { html, render } from "lit";
import { beforeAll, beforeEach, describe, expect } from "vitest";

import { test as baseTest } from "../../test/useMSW.js";
import { getApiHost } from "../../test/setup.js";
import { expectCanvasesToMatch } from "../../test/visualRegressionUtils.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { buildCloneStructure, collectDocumentStyles, syncStyles, traverseCloneTree } from "./renderTimegroupPreview.js";
import { renderToImage, renderToImageNative } from "./renderTimegroupToCanvas.js";
import { isNativeCanvasApiAvailable, setNativeCanvasApiEnabled } from "./previewSettings.js";
import { strategies } from "./benchmark/strategies/index.js";
import { Profiler } from "./benchmark/Profiler.js";
import type { SyncStrategy, SyncState } from "./benchmark/types.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "../gui/EFPreview.js";

const ITERATIONS = 50;
const WARMUP_ITERATIONS = 5;

beforeAll(async () => {
  console.clear();
  await fetch("/@ef-clear-cache", { method: "DELETE" });
});

beforeEach(() => {
  localStorage.clear();
});

// Extend base test with fixtures (reused from existing browsertest)
const test = baseTest.extend<{
  htmlTimegroup: EFTimegroup;
  videoTimegroup: EFTimegroup;
  complexHtmlTimegroup: EFTimegroup;
}>({
  htmlTimegroup: async ({}, use) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="contain" id="html-timegroup"
            style="width: 800px; height: 450px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; font-family: system-ui, sans-serif;">
              <h1 style="font-size: 48px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Hello World</h1>
              <p style="font-size: 24px; margin-top: 16px; opacity: 0.9;">Visual Regression Test</p>
            </div>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await use(timegroup);
    container.remove();
  },

  videoTimegroup: async ({}, use) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="contain" id="video-timegroup"
            style="width: 800px; height: 450px; background: #1a1a2e;">
            <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: contain;"></ef-video>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();
    await use(timegroup);
    container.remove();
  },

  complexHtmlTimegroup: async ({}, use) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="contain" id="complex-html-timegroup"
            style="width: 1920px; height: 1080px; background: linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%);">
            
            <div style="position: absolute; top: 40px; left: 80px; right: 80px; display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 32px; font-weight: 700; color: #fff; letter-spacing: 2px;">BRAND</div>
              <div style="display: flex; gap: 40px; font-size: 18px; color: rgba(255,255,255,0.8);">
                <span>Home</span>
                <span>About</span>
                <span>Contact</span>
              </div>
            </div>
            
            <div style="position: absolute; top: 50%; left: 80px; transform: translateY(-50%); max-width: 800px;">
              <h1 style="font-size: 72px; font-weight: 700; color: #fff; margin: 0; line-height: 1.1;">
                Complex HTML<br/>Content Test
              </h1>
              <p style="font-size: 24px; color: rgba(255,255,255,0.7); margin-top: 24px; line-height: 1.6;">
                Testing rendering of complex nested HTML structures.
              </p>
              <div style="display: flex; gap: 16px; margin-top: 40px;">
                <button style="padding: 16px 40px; font-size: 18px; font-weight: 600; color: #fff; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px;">
                  Primary Action
                </button>
                <button style="padding: 16px 40px; font-size: 18px; font-weight: 600; color: #fff; background: transparent; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px;">
                  Secondary
                </button>
              </div>
            </div>
            
            <div style="position: absolute; top: 20%; right: 5%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%); border-radius: 50%;"></div>
            <div style="position: absolute; bottom: 10%; right: 15%; width: 200px; height: 200px; background: radial-gradient(circle, rgba(118, 75, 162, 0.4) 0%, transparent 70%); border-radius: 50%;"></div>
            
            <div style="position: absolute; bottom: 40px; left: 80px; right: 80px; display: flex; justify-content: space-between; align-items: center; color: rgba(255,255,255,0.5); font-size: 14px;">
              <span>© 2024 Benchmark Tests</span>
              <span>Frame: 0ms</span>
            </div>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await use(timegroup);
    container.remove();
  },
});

/** Build a preview container with clone structure for a strategy to sync */
function buildPreviewContainer(
  timegroup: EFTimegroup,
): { container: HTMLDivElement; syncState: SyncState } {
  const width = timegroup.offsetWidth || 1920;
  const height = timegroup.offsetHeight || 1080;

  const { container, syncState } = buildCloneStructure(timegroup);

  const previewContainer = document.createElement("div");
  previewContainer.style.cssText = `
    width: ${width}px;
    height: ${height}px;
    position: relative;
    overflow: hidden;
    background: ${getComputedStyle(timegroup).background || "#000"};
  `;

  const styleEl = document.createElement("style");
  styleEl.textContent = collectDocumentStyles();
  previewContainer.appendChild(styleEl);
  previewContainer.appendChild(container);

  return { container: previewContainer, syncState };
}

/** Capture canvas using a specific strategy */
async function captureWithStrategy(
  strategy: SyncStrategy,
  timegroup: EFTimegroup,
  timeMs: number,
): Promise<HTMLCanvasElement> {
  const width = timegroup.offsetWidth || 1920;
  const height = timegroup.offsetHeight || 1080;

  const { container, syncState } = buildPreviewContainer(timegroup);

  // Run the strategy's sync
  strategy.sync(syncState, timeMs);

  // Ensure the clone root is visible
  const rootClone = syncState.tree.root?.clone;
  if (rootClone) {
    rootClone.style.clipPath = "none";
    rootClone.style.opacity = "1";
  }

  // Render to image and then to canvas
  const image = await renderToImage(container, width, height);

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.drawImage(image, 0, 0);

  return canvas;
}

describe("renderTimegroupToCanvas benchmarks", () => {
  describe("strategy timing comparison", () => {
    // Test each strategy's performance
    for (const [name, strategy] of strategies) {
      test(`${name}: timing over ${ITERATIONS} iterations`, async ({ htmlTimegroup }) => {
        const profiler = new Profiler();
        const { syncState } = buildPreviewContainer(htmlTimegroup);

        // Warmup runs (not counted)
        for (let i = 0; i < WARMUP_ITERATIONS; i++) {
          strategy.sync(syncState, i * 100);
        }

        // Measured runs
        for (let i = 0; i < ITERATIONS; i++) {
          const timing = strategy.sync(syncState, i * 100);
          profiler.recordTiming(timing);
        }

        console.log(`\n=== ${strategy.name} (${strategy.writeMechanism}) ===`);
        console.log(`Description: ${strategy.description}`);
        profiler.report();
      }, { timeout: 30000 });
    }

    // Test with complex HTML (more elements = more pronounced differences)
    for (const [name, strategy] of strategies) {
      test(`${name}: complex HTML timing over ${ITERATIONS} iterations`, async ({ complexHtmlTimegroup }) => {
        const profiler = new Profiler();
        const { syncState } = buildPreviewContainer(complexHtmlTimegroup);

        // Warmup runs
        for (let i = 0; i < WARMUP_ITERATIONS; i++) {
          strategy.sync(syncState, i * 100);
        }

        // Measured runs
        for (let i = 0; i < ITERATIONS; i++) {
          const timing = strategy.sync(syncState, i * 100);
          profiler.recordTiming(timing);
        }

        console.log(`\n=== ${strategy.name} [complex] (${strategy.writeMechanism}) ===`);
        console.log(`Description: ${strategy.description}`);
        console.log(`Element count: ${syncState.nodeCount}`);
        profiler.report();
      }, { timeout: 30000 });
    }
  });

  describe("visual equivalence invariant", () => {
    test("all strategies produce identical output for simple HTML", async ({ htmlTimegroup }) => {
      const baselineStrategy = strategies.get("baseline")!;
      const baselineCanvas = await captureWithStrategy(baselineStrategy, htmlTimegroup, 0);

      for (const [name, strategy] of strategies) {
        if (name === "baseline") continue;

        const candidateCanvas = await captureWithStrategy(strategy, htmlTimegroup, 0);

        // This is THE invariant - all strategies must be visually equivalent
        await expectCanvasesToMatch(
          baselineCanvas,
          candidateCanvas,
          "benchmark-visual",
          `baseline-vs-${name}-simple`,
          { threshold: 0.01, acceptableDiffPercentage: 0.5 },
        );
      }
    }, { timeout: 30000 });

    test("all strategies produce identical output for complex HTML", async ({ complexHtmlTimegroup }) => {
      const baselineStrategy = strategies.get("baseline")!;
      const baselineCanvas = await captureWithStrategy(baselineStrategy, complexHtmlTimegroup, 0);

      for (const [name, strategy] of strategies) {
        if (name === "baseline") continue;

        const candidateCanvas = await captureWithStrategy(strategy, complexHtmlTimegroup, 0);

        await expectCanvasesToMatch(
          baselineCanvas,
          candidateCanvas,
          "benchmark-visual",
          `baseline-vs-${name}-complex`,
          { threshold: 0.01, acceptableDiffPercentage: 0.5 },
        );
      }
    }, { timeout: 30000 });

    test("all strategies produce identical output with video content", async ({ videoTimegroup }) => {
      // Seek to a specific time to ensure video frame is stable
      await videoTimegroup.seek(2000);

      const baselineStrategy = strategies.get("baseline")!;
      const baselineCanvas = await captureWithStrategy(baselineStrategy, videoTimegroup, 2000);

      for (const [name, strategy] of strategies) {
        if (name === "baseline") continue;

        const candidateCanvas = await captureWithStrategy(strategy, videoTimegroup, 2000);

        await expectCanvasesToMatch(
          baselineCanvas,
          candidateCanvas,
          "benchmark-visual",
          `baseline-vs-${name}-video`,
          { threshold: 0.05, acceptableDiffPercentage: 2.0 },
        );
      }
    }, { timeout: 30000 });
  });

  describe("phase breakdown analysis", () => {
    test("baseline: measure where time is spent", async ({ complexHtmlTimegroup }) => {
      const { syncState } = buildPreviewContainer(complexHtmlTimegroup);
      const elementCount = syncState.nodeCount;

      console.log(`\n=== Phase Breakdown Analysis ===`);
      console.log(`Element count: ${elementCount}`);

      // Run each strategy and compare phase breakdown
      for (const [name, strategy] of strategies) {
        const profiler = new Profiler();

        // Run multiple times for stable measurements
        for (let i = 0; i < 20; i++) {
          const timing = strategy.sync(syncState, i * 100);
          profiler.recordTiming(timing);
        }

        const report = profiler.getReport();
        console.log(`\n--- ${name} ---`);
        for (const row of report) {
          console.log(`  ${row.phase}: avg=${row.avgMs}ms, min=${row.minMs}ms, max=${row.maxMs}ms`);
        }
      }
    }, { timeout: 30000 });
  });

  describe("full pipeline timing", () => {
    // This is the CRITICAL benchmark - measures the entire render cycle
    // which includes renderToImage (with waitForPaintFlush)
    test("measure full pipeline: sync + renderToImage", async ({ htmlTimegroup }) => {
      const width = htmlTimegroup.offsetWidth || 800;
      const height = htmlTimegroup.offsetHeight || 450;
      
      // Build once, reuse for all iterations
      const { container, syncState } = buildPreviewContainer(htmlTimegroup);
      document.body.appendChild(container);

      const strategy = strategies.get("baseline")!;
      const iterations = 20;
      const times: number[] = [];
      const syncTimes: number[] = [];
      const renderTimes: number[] = [];

      // Warmup
      for (let i = 0; i < 3; i++) {
        strategy.sync(syncState, i * 100);
        await renderToImage(container, width, height);
      }

      // Measure
      for (let i = 0; i < iterations; i++) {
        const totalStart = performance.now();
        
        const syncStart = performance.now();
        strategy.sync(syncState, i * 100);
        syncTimes.push(performance.now() - syncStart);
        
        const renderStart = performance.now();
        await renderToImage(container, width, height);
        renderTimes.push(performance.now() - renderStart);
        
        times.push(performance.now() - totalStart);
      }

      container.remove();

      const avgTotal = times.reduce((a, b) => a + b, 0) / times.length;
      const avgSync = syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length;
      const avgRender = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      
      const fps = 1000 / avgTotal;
      const realtimeMultiple = fps / 30; // Assuming 30fps target

      console.log("\n========================================");
      console.log("FULL PIPELINE TIMING (sync + renderToImage)");
      console.log("========================================");
      console.log(`  Total:       avg=${avgTotal.toFixed(2)}ms, min=${Math.min(...times).toFixed(2)}ms, max=${Math.max(...times).toFixed(2)}ms`);
      console.log(`  - syncStyles: avg=${avgSync.toFixed(2)}ms`);
      console.log(`  - renderToImage: avg=${avgRender.toFixed(2)}ms`);
      console.log(`  `);
      console.log(`  Achievable FPS: ${fps.toFixed(1)}`);
      console.log(`  Realtime multiple (vs 30fps): ${realtimeMultiple.toFixed(2)}x`);
      console.log(`  `);
      console.log(`  ⚠️  renderToImage uses waitForPaintFlush (double RAF) = ~33ms minimum per frame`);
    }, { timeout: 30000 });

    test("compare renderToImage paths: native vs foreignObject", async ({ htmlTimegroup }) => {
      const width = htmlTimegroup.offsetWidth || 800;
      const height = htmlTimegroup.offsetHeight || 450;
      
      const { container, syncState } = buildPreviewContainer(htmlTimegroup);
      document.body.appendChild(container);

      const strategy = strategies.get("baseline")!;
      strategy.sync(syncState, 0);

      const nativeTimes: number[] = [];
      const foreignObjectTimes: number[] = [];
      
      const hasNative = isNativeCanvasApiAvailable();
      console.log(`\n=== renderToImage Path Comparison ===`);
      console.log(`Native API available: ${hasNative}`);
      console.log(`⚠️  NOTE: isNativeCanvasApiEnabled() is hardcoded to return false!`);
      console.log(`   This is why performance regressed from 2.7x to 1.3x realtime.`);

      // Test foreignObject path (via renderToImage which always uses it now)
      console.log(`Testing foreignObject path (via renderToImage)...`);
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await renderToImage(container, width, height);
        foreignObjectTimes.push(performance.now() - start);
      }
      
      // Test native path DIRECTLY (bypassing the hardcoded disable)
      if (hasNative) {
        console.log(`Testing native path DIRECTLY (via renderToImageNative)...`);
        console.log(`  This bypasses the hardcoded 'return false' in isNativeCanvasApiEnabled()`);
        for (let i = 0; i < 10; i++) {
          const start = performance.now();
          await renderToImageNative(container, width, height);
          const elapsed = performance.now() - start;
          nativeTimes.push(elapsed);
          if (i === 0) console.log(`  First native call: ${elapsed.toFixed(2)}ms`);
        }
      }

      container.remove();

      const avgForeignObject = foreignObjectTimes.reduce((a, b) => a + b, 0) / foreignObjectTimes.length;
      console.log(`\n  foreignObject path: avg=${avgForeignObject.toFixed(2)}ms`);
      
      if (nativeTimes.length > 0) {
        const avgNative = nativeTimes.reduce((a, b) => a + b, 0) / nativeTimes.length;
        console.log(`  native path:        avg=${avgNative.toFixed(2)}ms`);
        console.log(`  `);
        console.log(`  ⚠️  Native has ~${avgNative.toFixed(0)}ms overhead from waitForPaintFlush (double RAF)`);
      }
    }, { timeout: 30000 });

    test("native path WITHOUT RAF wait (maximum throughput)", async ({ htmlTimegroup }) => {
      const width = htmlTimegroup.offsetWidth || 800;
      const height = htmlTimegroup.offsetHeight || 450;
      
      const { container, syncState } = buildPreviewContainer(htmlTimegroup);
      
      const strategy = strategies.get("baseline")!;
      strategy.sync(syncState, 0);

      const hasNative = isNativeCanvasApiAvailable();
      if (!hasNative) {
        console.log("Native API not available, skipping test");
        return;
      }

      console.log(`\n=== Native Path WITH vs WITHOUT RAF Wait ===`);
      
      const ITERATIONS = 20;
      const withWaitTimes: number[] = [];
      const skipWaitTimes: number[] = [];
      
      // Test WITH wait (legacy behavior)
      console.log(`Testing with RAF wait (waitForPaint: true)...`);
      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        await renderToImage(container, width, height, { waitForPaint: true });
        withWaitTimes.push(performance.now() - start);
      }
      
      // Test WITHOUT wait (default - frame tasks already complete)
      console.log(`Testing without RAF wait (default)...`);
      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        await renderToImage(container, width, height);
        skipWaitTimes.push(performance.now() - start);
      }
      
      const avgWithWait = withWaitTimes.reduce((a, b) => a + b, 0) / withWaitTimes.length;
      const avgSkipWait = skipWaitTimes.reduce((a, b) => a + b, 0) / skipWaitTimes.length;
      
      const fpsWithWait = 1000 / avgWithWait;
      const fpsSkipWait = 1000 / avgSkipWait;
      
      console.log(`\n  Results (${ITERATIONS} iterations):`);
      console.log(`  `);
      console.log(`  WITH RAF wait (waitForPaint: true):`);
      console.log(`    avg=${avgWithWait.toFixed(2)}ms → ${fpsWithWait.toFixed(0)} fps → ${(fpsWithWait / 30).toFixed(1)}x realtime`);
      console.log(`  `);
      console.log(`  WITHOUT RAF wait (default):`);
      console.log(`    avg=${avgSkipWait.toFixed(2)}ms → ${fpsSkipWait.toFixed(0)} fps → ${(fpsSkipWait / 30).toFixed(1)}x realtime`);
      console.log(`  `);
      console.log(`  🎯 Speedup: ${(avgWithWait / avgSkipWait).toFixed(0)}x faster without artificial RAF wait!`);
    }, { timeout: 30000 });

    test("measure RAF overhead (theoretical minimum time)", async () => {
      // Single RAF takes ~16.67ms at 60Hz, double RAF takes ~33ms
      // This is the theoretical minimum overhead from waitForPaintFlush
      
      const singleRafTimes: number[] = [];
      const doubleRafTimes: number[] = [];
      const noRafTimes: number[] = [];
      
      // Measure no RAF (just getComputedStyle flush)
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        // Force style calculation without RAF
        getComputedStyle(document.body).opacity;
        noRafTimes.push(performance.now() - start);
      }
      
      // Measure single RAF
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await new Promise(resolve => requestAnimationFrame(resolve));
        singleRafTimes.push(performance.now() - start);
      }
      
      // Measure double RAF (what waitForPaintFlush does)
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve(undefined));
          });
        });
        doubleRafTimes.push(performance.now() - start);
      }
      
      const avgNoRaf = noRafTimes.reduce((a, b) => a + b, 0) / noRafTimes.length;
      const avgSingle = singleRafTimes.reduce((a, b) => a + b, 0) / singleRafTimes.length;
      const avgDouble = doubleRafTimes.reduce((a, b) => a + b, 0) / doubleRafTimes.length;
      
      console.log("\n=== RAF Overhead Measurement ===");
      console.log(`  No RAF (getComputedStyle flush): avg=${avgNoRaf.toFixed(3)}ms`);
      console.log(`  Single RAF: avg=${avgSingle.toFixed(2)}ms`);
      console.log(`  Double RAF: avg=${avgDouble.toFixed(2)}ms`);
      console.log(`  `);
      console.log(`  ⚠️  waitForPaintFlush uses double RAF - kills performance!`);
      console.log(`  `);
      console.log(`  Options to recover 2.7x realtime:`);
      console.log(`  1. Remove waitForPaintFlush entirely (risk: content not painted)`);
      console.log(`  2. Use single RAF instead of double (risk: some paint misses)`);
      console.log(`  3. Use getComputedStyle flush only (synchronous, risk: layout incomplete)`);
    }, { timeout: 30000 });

    test("export optimization: reused clone vs rebuilt clone per frame", async ({ htmlTimegroup }) => {
      const width = htmlTimegroup.offsetWidth || 800;
      const height = htmlTimegroup.offsetHeight || 450;
      
      const hasNative = isNativeCanvasApiAvailable();
      if (!hasNative) {
        console.log("Native API not available, skipping test");
        return;
      }

      const FRAMES = 30;
      const rebuildTimes: number[] = [];
      const reuseTimes: number[] = [];

      console.log(`\n=== Export Optimization: Clone Reuse ===`);
      console.log(`Simulating ${FRAMES} frame export...`);

      // Test REBUILD clone per frame (old behavior)
      console.log(`Testing rebuild clone per frame...`);
      for (let i = 0; i < FRAMES; i++) {
        const start = performance.now();
        const { container, syncState } = buildCloneStructure(htmlTimegroup);
        const previewContainer = document.createElement("div");
        previewContainer.style.cssText = `width: ${width}px; height: ${height}px; position: relative;`;
        const styleEl = document.createElement("style");
        styleEl.textContent = collectDocumentStyles();
        previewContainer.appendChild(styleEl);
        previewContainer.appendChild(container);
        syncStyles(syncState, i * 33);
        await renderToImage(previewContainer, width, height);
        rebuildTimes.push(performance.now() - start);
      }

      // Test REUSE clone structure (optimized behavior)
      console.log(`Testing reused clone structure...`);
      const { container, syncState } = buildCloneStructure(htmlTimegroup);
      const previewContainer = document.createElement("div");
      previewContainer.style.cssText = `width: ${width}px; height: ${height}px; position: relative;`;
      const styleEl = document.createElement("style");
      styleEl.textContent = collectDocumentStyles();
      previewContainer.appendChild(styleEl);
      previewContainer.appendChild(container);
      
      for (let i = 0; i < FRAMES; i++) {
        const start = performance.now();
        syncStyles(syncState, i * 33);
        await renderToImage(previewContainer, width, height);
        reuseTimes.push(performance.now() - start);
      }

      const avgRebuild = rebuildTimes.reduce((a, b) => a + b, 0) / rebuildTimes.length;
      const avgReuse = reuseTimes.reduce((a, b) => a + b, 0) / reuseTimes.length;
      const totalRebuild = rebuildTimes.reduce((a, b) => a + b, 0);
      const totalReuse = reuseTimes.reduce((a, b) => a + b, 0);

      console.log(`\n  Results (${FRAMES} frames):`);
      console.log(`  `);
      console.log(`  REBUILD clone per frame (old):`);
      console.log(`    per-frame: ${avgRebuild.toFixed(2)}ms, total: ${totalRebuild.toFixed(0)}ms`);
      console.log(`    → ${(1000 / avgRebuild).toFixed(0)} fps → ${((1000 / avgRebuild) / 30).toFixed(2)}x realtime`);
      console.log(`  `);
      console.log(`  REUSE clone structure (optimized):`);
      console.log(`    per-frame: ${avgReuse.toFixed(2)}ms, total: ${totalReuse.toFixed(0)}ms`);
      console.log(`    → ${(1000 / avgReuse).toFixed(0)} fps → ${((1000 / avgReuse) / 30).toFixed(2)}x realtime`);
      console.log(`  `);
      console.log(`  🎯 Export speedup: ${(avgRebuild / avgReuse).toFixed(1)}x faster with clone reuse!`);
    }, { timeout: 60000 });

    test("full export simulation with seek", async ({ htmlTimegroup }) => {
      const width = htmlTimegroup.offsetWidth || 800;
      const height = htmlTimegroup.offsetHeight || 450;
      
      const hasNative = isNativeCanvasApiAvailable();
      if (!hasNative) {
        console.log("Native API not available, skipping test");
        return;
      }

      const FRAMES = 30;
      const frameTimings: { seek: number; sync: number; render: number; total: number }[] = [];

      console.log(`\n=== Full Export Simulation (with seek) ===`);
      console.log(`Simulating ${FRAMES} frame export at 30fps...`);

      // Build clone once
      const { container, syncState } = buildCloneStructure(htmlTimegroup);
      const previewContainer = document.createElement("div");
      previewContainer.style.cssText = `width: ${width}px; height: ${height}px; position: relative;`;
      const styleEl = document.createElement("style");
      styleEl.textContent = collectDocumentStyles();
      previewContainer.appendChild(styleEl);
      previewContainer.appendChild(container);

      for (let i = 0; i < FRAMES; i++) {
        const totalStart = performance.now();
        const timeMs = i * 33.33; // 30fps
        
        // Phase 1: Seek
        const seekStart = performance.now();
        await htmlTimegroup.seek(timeMs);
        const seekTime = performance.now() - seekStart;
        
        // Phase 2: Sync styles
        const syncStart = performance.now();
        syncStyles(syncState, timeMs);
        const syncTime = performance.now() - syncStart;
        
        // Phase 3: Render
        const renderStart = performance.now();
        await renderToImage(previewContainer, width, height);
        const renderTime = performance.now() - renderStart;
        
        frameTimings.push({
          seek: seekTime,
          sync: syncTime,
          render: renderTime,
          total: performance.now() - totalStart,
        });
      }

      const avgSeek = frameTimings.reduce((a, b) => a + b.seek, 0) / FRAMES;
      const avgSync = frameTimings.reduce((a, b) => a + b.sync, 0) / FRAMES;
      const avgRender = frameTimings.reduce((a, b) => a + b.render, 0) / FRAMES;
      const avgTotal = frameTimings.reduce((a, b) => a + b.total, 0) / FRAMES;
      
      const fps = 1000 / avgTotal;
      const realtime = fps / 30;

      console.log(`\n  Per-frame breakdown:`);
      console.log(`    seek:   ${avgSeek.toFixed(2)}ms (${((avgSeek / avgTotal) * 100).toFixed(0)}%)`);
      console.log(`    sync:   ${avgSync.toFixed(2)}ms (${((avgSync / avgTotal) * 100).toFixed(0)}%)`);
      console.log(`    render: ${avgRender.toFixed(2)}ms (${((avgRender / avgTotal) * 100).toFixed(0)}%)`);
      console.log(`    ─────────────────`);
      console.log(`    TOTAL:  ${avgTotal.toFixed(2)}ms`);
      console.log(`  `);
      console.log(`  Achievable: ${fps.toFixed(0)} fps → ${realtime.toFixed(1)}x realtime`);
      console.log(`  `);
      console.log(`  NOTE: This doesn't include WebCodecs encoding time!`);
    }, { timeout: 60000 });
  });

  describe("comparative summary", () => {
    test("print summary table comparing all strategies", async ({ complexHtmlTimegroup }) => {
      const { syncState } = buildPreviewContainer(complexHtmlTimegroup);
      const results: Array<{
        strategy: string;
        mechanism: string;
        avgTotal: number;
        avgRead: number;
        avgWrite: number;
        avgCopy: number;
      }> = [];

      for (const [name, strategy] of strategies) {
        const profiler = new Profiler();

        // Warmup
        for (let i = 0; i < 5; i++) {
          strategy.sync(syncState, i * 100);
        }

        // Measure
        for (let i = 0; i < ITERATIONS; i++) {
          const timing = strategy.sync(syncState, i * 100);
          profiler.recordTiming(timing);
        }

        const report = profiler.getReport();
        const totalRow = report.find(r => r.phase === "total");
        const readRow = report.find(r => r.phase === "read");
        const writeRow = report.find(r => r.phase === "write");
        const copyRow = report.find(r => r.phase === "copy");

        results.push({
          strategy: name,
          mechanism: strategy.writeMechanism,
          avgTotal: parseFloat(totalRow?.avgMs ?? "0"),
          avgRead: parseFloat(readRow?.avgMs ?? "0"),
          avgWrite: parseFloat(writeRow?.avgMs ?? "0"),
          avgCopy: parseFloat(copyRow?.avgMs ?? "0"),
        });
      }

      // Sort by total time
      results.sort((a, b) => a.avgTotal - b.avgTotal);

      console.log("\n========================================");
      console.log("BENCHMARK SUMMARY (sorted by total time)");
      console.log("========================================");
      console.table(results);

      // Calculate speedup vs baseline
      const baseline = results.find(r => r.strategy === "baseline");
      if (baseline && baseline.avgTotal > 0) {
        console.log("\n--- Speedup vs Baseline ---");
        for (const r of results) {
          if (r.strategy === "baseline") continue;
          const speedup = ((baseline.avgTotal - r.avgTotal) / baseline.avgTotal * 100).toFixed(1);
          console.log(`  ${r.strategy}: ${speedup}% ${parseFloat(speedup) > 0 ? "faster" : "slower"}`);
        }
      }
    }, { timeout: 60000 });
    
    test("CSS property sync strategies comparison", async ({ htmlTimegroup }) => {
      console.log("\n=== CSS Property Sync Strategies ===\n");
      
      const { container, syncState } = buildPreviewContainer(htmlTimegroup);
      document.body.appendChild(container);
      
      // Get the root node to test with
      const rootNode = syncState.tree.root;
      if (!rootNode) {
        console.log("No root node available");
        return;
      }
      
      const source = rootNode.source as HTMLElement;
      const clone = rootNode.clone;
      const cs = getComputedStyle(source);
      
      // Count total CSS properties
      console.log(`Total CSS properties in getComputedStyle: ${cs.length}`);
      
      // Create baseline element to find non-default properties
      const baseline = document.createElement(source.tagName.toLowerCase());
      baseline.style.cssText = "position: absolute; visibility: hidden;";
      document.body.appendChild(baseline);
      const baselineCs = getComputedStyle(baseline);
      
      // Find non-default properties
      const nonDefaultProps: string[] = [];
      for (let i = 0; i < cs.length; i++) {
        const prop = cs.item(i);
        if (cs.getPropertyValue(prop) !== baselineCs.getPropertyValue(prop)) {
          nonDefaultProps.push(prop);
        }
      }
      console.log(`Non-default properties: ${nonDefaultProps.length}`);
      console.log(`Sample non-defaults: ${nonDefaultProps.slice(0, 15).join(", ")}`);
      
      baseline.remove();
      
      // Current fixed properties (45)
      const FIXED_PROPS = [
        "display", "visibility", "opacity",
        "position", "top", "right", "bottom", "left", "zIndex",
        "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
        "flex", "flexFlow", "justifyContent", "alignItems", "alignContent", "alignSelf", "gap",
        "gridTemplate", "gridColumn", "gridRow", "gridArea",
        "margin", "padding", "boxSizing",
        "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "borderRadius",
        "background", "color", "boxShadow", "filter", "backdropFilter", "clipPath",
        "font", "textAlign", "textDecoration", "textTransform",
        "letterSpacing", "whiteSpace", "textOverflow", "lineHeight",
        "transform", "transformOrigin", "transformStyle",
        "perspective", "perspectiveOrigin", "backfaceVisibility",
        "cursor", "pointerEvents", "userSelect", "overflow",
      ];
      
      const ITERATIONS = 1000;
      
      // Strategy 1: Current fixed 45 properties
      const start1 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        for (const prop of FIXED_PROPS) {
          (clone.style as any)[prop] = (cs as any)[prop];
        }
      }
      const time1 = performance.now() - start1;
      
      // Strategy 2: cssText (copy ALL computed styles at once)
      const start2 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        clone.style.cssText = cs.cssText;
      }
      const time2 = performance.now() - start2;
      
      // Strategy 3: Iterate ALL properties via item()
      const start3 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        for (let j = 0; j < cs.length; j++) {
          const prop = cs.item(j);
          clone.style.setProperty(prop, cs.getPropertyValue(prop));
        }
      }
      const time3 = performance.now() - start3;
      
      // Strategy 4: Only non-default properties (pre-computed list)
      const start4 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        for (const prop of nonDefaultProps) {
          clone.style.setProperty(prop, cs.getPropertyValue(prop));
        }
      }
      const time4 = performance.now() - start4;
      
      // Strategy 5: computedStyleMap (if available)
      let time5 = 0;
      if (typeof source.computedStyleMap === "function") {
        const styleMap = source.computedStyleMap();
        const start5 = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
          for (const [prop, value] of styleMap) {
            clone.style.setProperty(prop, value.toString());
          }
        }
        time5 = performance.now() - start5;
      }
      
      // Strategy 6: Iterate ALL, but skip defaults (compare during iteration)
      // Create baseline once
      const defaultEl = document.createElement(source.tagName.toLowerCase());
      defaultEl.style.cssText = "position: absolute; visibility: hidden;";
      document.body.appendChild(defaultEl);
      const defaultCs = getComputedStyle(defaultEl);
      
      // Cache baseline values for all properties
      const defaultValues = new Map<string, string>();
      for (let i = 0; i < defaultCs.length; i++) {
        const prop = defaultCs.item(i);
        defaultValues.set(prop, defaultCs.getPropertyValue(prop));
      }
      
      const start6 = performance.now();
      let writesSkipped = 0;
      let writesPerformed = 0;
      for (let iter = 0; iter < ITERATIONS; iter++) {
        for (let i = 0; i < cs.length; i++) {
          const prop = cs.item(i);
          const srcVal = cs.getPropertyValue(prop);
          const defVal = defaultValues.get(prop);
          if (srcVal !== defVal) {
            clone.style.setProperty(prop, srcVal);
            if (iter === 0) writesPerformed++;
          } else {
            if (iter === 0) writesSkipped++;
          }
        }
      }
      const time6 = performance.now() - start6;
      
      // Strategy 7: JIT-compiled function (inline all property checks)
      // Build a function at runtime with no loops - just straight-line if/else
      const allProps: string[] = [];
      for (let i = 0; i < cs.length; i++) {
        allProps.push(cs.item(i));
      }
      
      // Generate function body that checks each property
      let fnBody = "";
      for (const prop of allProps) {
        const defaultVal = defaultValues.get(prop) ?? "";
        // Escape any quotes in the default value
        const escapedDefault = defaultVal.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        // Use kebab-case for getPropertyValue/setProperty
        fnBody += `  v = srcCs.getPropertyValue('${prop}');
  if (v !== '${escapedDefault}') cloneStyle.setProperty('${prop}', v);
`;
      }
      
      // Create the JIT function
      const jitSyncFn = new Function("srcCs", "cloneStyle", `let v;\n${fnBody}`) as (srcCs: CSSStyleDeclaration, cloneStyle: CSSStyleDeclaration) => void;
      
      const start7 = performance.now();
      for (let iter = 0; iter < ITERATIONS; iter++) {
        jitSyncFn(cs, clone.style);
      }
      const time7 = performance.now() - start7;
      
      // Strategy 8: JIT with camelCase bracket access (might be faster)
      // Convert kebab to camel for bracket access
      const toCamel = (s: string) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      let fnBody8 = "";
      for (const prop of allProps) {
        const camelProp = toCamel(prop);
        const defaultVal = defaultValues.get(prop) ?? "";
        const escapedDefault = defaultVal.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        fnBody8 += `  v = srcCs['${camelProp}'];
  if (v !== '${escapedDefault}') cloneStyle['${camelProp}'] = v;
`;
      }
      
      const jitSyncFn8 = new Function("srcCs", "cloneStyle", `let v;\n${fnBody8}`) as (srcCs: CSSStyleDeclaration, cloneStyle: CSSStyleDeclaration) => void;
      
      const start8 = performance.now();
      for (let iter = 0; iter < ITERATIONS; iter++) {
        jitSyncFn8(cs, clone.style);
      }
      const time8 = performance.now() - start8;
      
      // Strategy 9: JIT with only 45 fixed props (compare to loop version)
      const FIXED_45_PROPS = [
        "display", "visibility", "opacity",
        "position", "top", "right", "bottom", "left", "zIndex",
        "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
        "flex", "flexFlow", "justifyContent", "alignItems", "alignContent", "alignSelf", "gap",
        "gridTemplate", "gridColumn", "gridRow", "gridArea",
        "margin", "padding", "boxSizing",
        "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "borderRadius",
        "background", "color", "boxShadow", "filter", "backdropFilter", "clipPath",
        "font", "textAlign", "textDecoration", "textTransform",
        "letterSpacing", "whiteSpace", "textOverflow", "lineHeight",
        "transform", "transformOrigin", "transformStyle",
        "perspective", "perspectiveOrigin", "backfaceVisibility",
        "cursor", "pointerEvents", "userSelect", "overflow",
      ];
      let fnBody9 = "";
      for (const prop of FIXED_45_PROPS) {
        fnBody9 += `  v = srcCs['${prop}'];
  if (cloneStyle['${prop}'] !== v) cloneStyle['${prop}'] = v;
`;
      }
      const jitSyncFn9 = new Function("srcCs", "cloneStyle", `let v;\n${fnBody9}`) as (srcCs: CSSStyleDeclaration, cloneStyle: CSSStyleDeclaration) => void;
      
      const start9 = performance.now();
      for (let iter = 0; iter < ITERATIONS; iter++) {
        jitSyncFn9(cs, clone.style);
      }
      const time9 = performance.now() - start9;
      
      defaultEl.remove();
      
      console.log(`\n=== Benchmark Results (${ITERATIONS} iterations) ===`);
      console.log(`  Fixed 45 props:        ${time1.toFixed(1)}ms (${(time1/ITERATIONS).toFixed(3)}ms/iter)`);
      console.log(`  cssText (broken):      ${time2.toFixed(1)}ms (${(time2/ITERATIONS).toFixed(3)}ms/iter)`);
      console.log(`  All props write:       ${time3.toFixed(1)}ms (${(time3/ITERATIONS).toFixed(3)}ms/iter) [${cs.length} props]`);
      console.log(`  Pre-cached non-def:    ${time4.toFixed(1)}ms (${(time4/ITERATIONS).toFixed(3)}ms/iter) [${nonDefaultProps.length} props]`);
      if (time5 > 0) {
        console.log(`  computedStyleMap:      ${time5.toFixed(1)}ms (${(time5/ITERATIONS).toFixed(3)}ms/iter)`);
      }
      console.log(`  All + skip defaults:   ${time6.toFixed(1)}ms (${(time6/ITERATIONS).toFixed(3)}ms/iter) [${writesPerformed} writes, ${writesSkipped} skipped]`);
      console.log(`  JIT (getPropertyValue):${time7.toFixed(1)}ms (${(time7/ITERATIONS).toFixed(3)}ms/iter) [${allProps.length} props, no loop]`);
      console.log(`  JIT (bracket access):  ${time8.toFixed(1)}ms (${(time8/ITERATIONS).toFixed(3)}ms/iter) [${allProps.length} props, no loop]`);
      console.log(`  JIT 45 props:          ${time9.toFixed(1)}ms (${(time9/ITERATIONS).toFixed(3)}ms/iter) [45 props, no loop]`);
      
      // Strategy 10: Batched reads then writes (avoid cache invalidation)
      const FIXED_45 = [
        "display", "visibility", "opacity",
        "position", "top", "right", "bottom", "left", "zIndex",
        "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
        "flex", "flexFlow", "justifyContent", "alignItems", "alignContent", "alignSelf", "gap",
        "gridTemplate", "gridColumn", "gridRow", "gridArea",
        "margin", "padding", "boxSizing",
        "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "borderRadius",
        "background", "color", "boxShadow", "filter", "backdropFilter", "clipPath",
        "font", "textAlign", "textDecoration", "textTransform",
        "letterSpacing", "whiteSpace", "textOverflow", "lineHeight",
        "transform", "transformOrigin", "transformStyle",
        "perspective", "perspectiveOrigin", "backfaceVisibility",
        "cursor", "pointerEvents", "userSelect", "overflow",
      ] as const;
      const values: string[] = new Array(FIXED_45.length);
      
      const start10 = performance.now();
      for (let iter = 0; iter < ITERATIONS; iter++) {
        // Phase 1: Read ALL values first
        for (let i = 0; i < FIXED_45.length; i++) {
          values[i] = (cs as any)[FIXED_45[i]];
        }
        // Phase 2: Write ALL values
        for (let i = 0; i < FIXED_45.length; i++) {
          (clone.style as any)[FIXED_45[i]] = values[i];
        }
      }
      const time10 = performance.now() - start10;
      
      // Strategy 11: Batched with skip-if-equal check
      const start11 = performance.now();
      for (let iter = 0; iter < ITERATIONS; iter++) {
        // Phase 1: Read ALL values first
        for (let i = 0; i < FIXED_45.length; i++) {
          values[i] = (cs as any)[FIXED_45[i]];
        }
        // Phase 2: Write only changed values
        for (let i = 0; i < FIXED_45.length; i++) {
          const prop = FIXED_45[i];
          if ((clone.style as any)[prop] !== values[i]) {
            (clone.style as any)[prop] = values[i];
          }
        }
      }
      const time11 = performance.now() - start11;
      
      console.log(`  Batched read→write:    ${time10.toFixed(1)}ms (${(time10/ITERATIONS).toFixed(3)}ms/iter)`);
      console.log(`  Batched + skip-equal:  ${time11.toFixed(1)}ms (${(time11/ITERATIONS).toFixed(3)}ms/iter)`);
      
      console.log(`\n=== Relative Performance (vs Fixed 45) ===`);
      const baseline_time = time1;
      console.log(`  Fixed 45 (baseline):   1.00x`);
      console.log(`  All props write:       ${(baseline_time / time3).toFixed(2)}x`);
      console.log(`  Pre-cached non-def:    ${(baseline_time / time4).toFixed(2)}x`);
      if (time5 > 0) {
        console.log(`  computedStyleMap:      ${(baseline_time / time5).toFixed(2)}x`);
      }
      console.log(`  All + skip defaults:   ${(baseline_time / time6).toFixed(2)}x`);
      console.log(`  JIT (getPropertyVal):  ${(baseline_time / time7).toFixed(2)}x`);
      console.log(`  JIT (bracket access):  ${(baseline_time / time8).toFixed(2)}x`);
      console.log(`  JIT 45 props:          ${(baseline_time / time9).toFixed(2)}x`);
      console.log(`  Batched read→write:    ${(baseline_time / time10).toFixed(2)}x`);
      console.log(`  Batched + skip-equal:  ${(baseline_time / time11).toFixed(2)}x`);
      
      // Verify cssText produces correct results
      console.log(`\n=== Verifying cssText correctness ===`);
      console.log(`  cssText length: ${cs.cssText.length} chars`);
      console.log(`  cssText sample: ${cs.cssText.slice(0, 200)}...`);
      
      const testClone = document.createElement('div');
      document.body.appendChild(testClone);
      testClone.style.cssText = cs.cssText;
      
      const testCs = getComputedStyle(testClone);
      let matchCount = 0;
      let mismatchCount = 0;
      const mismatches: string[] = [];
      
      for (const prop of FIXED_PROPS) {
        const srcVal = (cs as any)[prop];
        const cloneVal = (testCs as any)[prop];
        if (srcVal === cloneVal) {
          matchCount++;
        } else {
          mismatchCount++;
          if (mismatches.length < 5) {
            mismatches.push(`${prop}: '${srcVal}' vs '${cloneVal}'`);
          }
        }
      }
      
      console.log(`  Checked ${FIXED_PROPS.length} properties`);
      console.log(`  Matches: ${matchCount}, Mismatches: ${mismatchCount}`);
      if (mismatches.length > 0) {
        console.log(`  Sample mismatches: ${mismatches.join("; ")}`);
      }
      
      // Analyze non-default property distribution across all elements
      console.log(`\n=== Non-default Property Distribution ===`);
      const propsPerElement: number[] = [];
      const propCounts = new Map<string, number>();
      
      traverseCloneTree(syncState, (node) => {
        const elemCs = getComputedStyle(node.source);
        const elemBaseline = document.createElement(node.source.tagName.toLowerCase());
        elemBaseline.style.cssText = "position: absolute; visibility: hidden;";
        document.body.appendChild(elemBaseline);
        const elemBaselineCs = getComputedStyle(elemBaseline);
        
        let nonDefaultCount = 0;
        for (let i = 0; i < elemCs.length; i++) {
          const prop = elemCs.item(i);
          if (elemCs.getPropertyValue(prop) !== elemBaselineCs.getPropertyValue(prop)) {
            nonDefaultCount++;
            propCounts.set(prop, (propCounts.get(prop) || 0) + 1);
          }
        }
        propsPerElement.push(nonDefaultCount);
        elemBaseline.remove();
      });
      
      const avgProps = propsPerElement.reduce((a, b) => a + b, 0) / propsPerElement.length;
      const maxProps = Math.max(...propsPerElement);
      const minProps = Math.min(...propsPerElement);
      
      console.log(`  Elements analyzed: ${propsPerElement.length}`);
      console.log(`  Non-default props per element: min=${minProps}, avg=${avgProps.toFixed(1)}, max=${maxProps}`);
      console.log(`  Unique non-default properties: ${propCounts.size}`);
      
      // Sort by frequency
      const sortedProps = [...propCounts.entries()].sort((a, b) => b[1] - a[1]);
      console.log(`  Top 15 most common non-default props:`);
      for (const [prop, count] of sortedProps.slice(0, 15)) {
        console.log(`    ${prop}: ${count} elements (${(count / propsPerElement.length * 100).toFixed(0)}%)`);
      }
      
      testClone.remove();
      container.remove();
    }, { timeout: 30000 });
    
    test("change detection strategies", async ({ complexHtmlTimegroup }) => {
      const htmlTimegroup = complexHtmlTimegroup;
      const { container, syncState } = buildPreviewContainer(htmlTimegroup);
      document.body.appendChild(container);
      
      const rootNode = syncState.tree.root;
      if (!rootNode) {
        console.log("No root node available");
        return;
      }
      
      const source = rootNode.source as HTMLElement;
      const clone = rootNode.clone;
      const cs = getComputedStyle(source);
      
      const FIXED_45 = [
        "display", "visibility", "opacity",
        "position", "top", "right", "bottom", "left", "zIndex",
        "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
        "flex", "flexFlow", "justifyContent", "alignItems", "alignContent", "alignSelf", "gap",
        "gridTemplate", "gridColumn", "gridRow", "gridArea",
        "margin", "padding", "boxSizing",
        "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "borderRadius",
        "background", "color", "boxShadow", "filter", "backdropFilter", "clipPath",
        "font", "textAlign", "textDecoration", "textTransform",
        "letterSpacing", "whiteSpace", "textOverflow", "lineHeight",
        "transform", "transformOrigin", "transformStyle",
        "perspective", "perspectiveOrigin", "backfaceVisibility",
        "cursor", "pointerEvents", "userSelect", "overflow",
      ];
      
      console.log(`\n=== Change Detection Strategies ===`);
      console.log(`Goal: Detect "no change" faster than syncing all 45 props\n`);
      
      // Baseline: sync all 45 properties (current approach)
      const startBaseline = performance.now();
      for (let iter = 0; iter < ITERATIONS; iter++) {
        for (const prop of FIXED_45) {
          const srcVal = (cs as any)[prop];
          if ((clone.style as any)[prop] !== srcVal) {
            (clone.style as any)[prop] = srcVal;
          }
        }
      }
      const timeBaseline = performance.now() - startBaseline;
      console.log(`Baseline (sync 45):      ${timeBaseline.toFixed(1)}ms (${(timeBaseline/ITERATIONS).toFixed(3)}ms/iter)`);
      
      // Strategy A: Cache + compare all 45 values (read-only check)
      const cachedValues = new Map<string, string>();
      for (const prop of FIXED_45) {
        cachedValues.set(prop, (cs as any)[prop]);
      }
      
      const startA = performance.now();
      let changesDetectedA = 0;
      for (let iter = 0; iter < ITERATIONS; iter++) {
        let hasChange = false;
        for (const prop of FIXED_45) {
          const current = (cs as any)[prop];
          if (cachedValues.get(prop) !== current) {
            hasChange = true;
            cachedValues.set(prop, current);
          }
        }
        if (hasChange) changesDetectedA++;
      }
      const timeA = performance.now() - startA;
      console.log(`Cache + compare (45):    ${timeA.toFixed(1)}ms (${(timeA/ITERATIONS).toFixed(3)}ms/iter) [${changesDetectedA} changes]`);
      
      // Strategy B: Check only 5 "indicator" properties first
      const INDICATOR_PROPS = ["transform", "opacity", "display", "width", "height"];
      const indicatorCache = new Map<string, string>();
      for (const prop of INDICATOR_PROPS) {
        indicatorCache.set(prop, (cs as any)[prop]);
      }
      
      const startB = performance.now();
      let earlyBailouts = 0;
      for (let iter = 0; iter < ITERATIONS; iter++) {
        let indicatorChanged = false;
        for (const prop of INDICATOR_PROPS) {
          if (indicatorCache.get(prop) !== (cs as any)[prop]) {
            indicatorChanged = true;
            break;
          }
        }
        if (!indicatorChanged) {
          earlyBailouts++;
          continue;
        }
        // Full sync would happen here if change detected
        for (const prop of FIXED_45) {
          (clone.style as any)[prop] = (cs as any)[prop];
        }
      }
      const timeB = performance.now() - startB;
      console.log(`5 indicator check:       ${timeB.toFixed(1)}ms (${(timeB/ITERATIONS).toFixed(3)}ms/iter) [${earlyBailouts} bailouts]`);
      
      // Strategy C: Check only 2 properties (transform + opacity)
      let lastTransform = (cs as any).transform;
      let lastOpacity = (cs as any).opacity;
      
      const startC = performance.now();
      let quickChanges = 0;
      for (let iter = 0; iter < ITERATIONS; iter++) {
        const t = (cs as any).transform;
        const o = (cs as any).opacity;
        if (t !== lastTransform || o !== lastOpacity) {
          quickChanges++;
          lastTransform = t;
          lastOpacity = o;
        }
      }
      const timeC = performance.now() - startC;
      console.log(`2 prop quick check:      ${timeC.toFixed(1)}ms (${(timeC/ITERATIONS).toFixed(3)}ms/iter) [${quickChanges} changes]`);
      
      // Strategy D: String hash of all 45 values
      let lastHash = "";
      for (const prop of FIXED_45) {
        lastHash += (cs as any)[prop] + "|";
      }
      
      const startD = performance.now();
      let hashChanges = 0;
      for (let iter = 0; iter < ITERATIONS; iter++) {
        let currentHash = "";
        for (const prop of FIXED_45) {
          currentHash += (cs as any)[prop] + "|";
        }
        if (currentHash !== lastHash) {
          hashChanges++;
          lastHash = currentHash;
        }
      }
      const timeD = performance.now() - startD;
      console.log(`String hash (45):        ${timeD.toFixed(1)}ms (${(timeD/ITERATIONS).toFixed(3)}ms/iter) [${hashChanges} changes]`);
      
      // Strategy E: Read all, batch compare, then batch write if any changed
      const startE = performance.now();
      const tempValues = new Array<string>(FIXED_45.length);
      let batchChanges = 0;
      for (let iter = 0; iter < ITERATIONS; iter++) {
        // Read phase
        let hasAnyChange = false;
        for (let i = 0; i < FIXED_45.length; i++) {
          const prop = FIXED_45[i]!;
          const current = (cs as any)[prop];
          if (cachedValues.get(prop) !== current) {
            hasAnyChange = true;
          }
          tempValues[i] = current;
        }
        // Write phase (only if something changed)
        if (hasAnyChange) {
          batchChanges++;
          for (let i = 0; i < FIXED_45.length; i++) {
            const prop = FIXED_45[i]!;
            cachedValues.set(prop, tempValues[i]!);
            (clone.style as any)[prop] = tempValues[i];
          }
        }
      }
      const timeE = performance.now() - startE;
      console.log(`Batch check+write:       ${timeE.toFixed(1)}ms (${(timeE/ITERATIONS).toFixed(3)}ms/iter) [${batchChanges} batch writes]`);
      
      // Strategy F: Use computedStyleMap iteration
      if (typeof source.computedStyleMap === "function") {
        const SYNC_PROPERTIES_KEBAB = FIXED_45.map(prop =>
          prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
        );
        const styleMapCache = new Map<string, string>();
        const srcMap = source.computedStyleMap();
        for (const kebab of SYNC_PROPERTIES_KEBAB) {
          const val = srcMap.get(kebab);
          styleMapCache.set(kebab, val?.toString() ?? "");
        }
        
        const startF = performance.now();
        let mapChanges = 0;
        for (let iter = 0; iter < ITERATIONS; iter++) {
          const map = source.computedStyleMap();
          let hasChange = false;
          for (const kebab of SYNC_PROPERTIES_KEBAB) {
            const current = map.get(kebab)?.toString() ?? "";
            if (styleMapCache.get(kebab) !== current) {
              hasChange = true;
              styleMapCache.set(kebab, current);
            }
          }
          if (hasChange) mapChanges++;
        }
        const timeF = performance.now() - startF;
        console.log(`computedStyleMap cache:  ${timeF.toFixed(1)}ms (${(timeF/ITERATIONS).toFixed(3)}ms/iter) [${mapChanges} changes]`);
      }
      
      console.log(`\n=== Summary (vs Baseline ${(timeBaseline/ITERATIONS).toFixed(3)}ms) ===`);
      console.log(`  Cache compare:   ${((timeA/timeBaseline)*100).toFixed(0)}% (read all, compare all)`);
      console.log(`  5 indicators:    ${((timeB/timeBaseline)*100).toFixed(0)}% (early bailout if unchanged)`);
      console.log(`  2 prop check:    ${((timeC/timeBaseline)*100).toFixed(0)}% (transform+opacity only)`);
      console.log(`  String hash:     ${((timeD/timeBaseline)*100).toFixed(0)}% (concat + compare)`);
      console.log(`  Batch check:     ${((timeE/timeBaseline)*100).toFixed(0)}% (read all, write if changed)`);
      
      // === REALISTIC MULTI-ELEMENT SIMULATION ===
      console.log(`\n=== Multi-Element Simulation (like real export) ===`);
      
      // Collect all nodes from the tree
      const allNodes: Array<{source: Element, clone: HTMLElement, cache: Map<string, string>}> = [];
      traverseCloneTree(syncState, (node) => {
        allNodes.push({
          source: node.source,
          clone: node.clone,
          cache: new Map<string, string>(),
        });
      });
      console.log(`Elements in tree: ${allNodes.length}`);
      
      // Warm up caches
      for (const node of allNodes) {
        try {
          const cs = getComputedStyle(node.source);
          for (const prop of FIXED_45) {
            node.cache.set(prop, (cs as any)[prop]);
          }
        } catch {}
      }
      
      // Current approach: sync all 45 props for all elements, every frame
      const FRAMES = 30;
      const startCurrent = performance.now();
      for (let frame = 0; frame < FRAMES; frame++) {
        for (const node of allNodes) {
          try {
            const cs = getComputedStyle(node.source);
            const cloneStyle = node.clone.style as any;
            for (const prop of FIXED_45) {
              const srcVal = (cs as any)[prop];
              if (cloneStyle[prop] !== srcVal) {
                cloneStyle[prop] = srcVal;
              }
            }
          } catch {}
        }
      }
      const timeCurrent = performance.now() - startCurrent;
      
      // Cached approach: read all, compare to cache, write only changed
      const startCached = performance.now();
      let totalWrites = 0;
      let totalSkipped = 0;
      for (let frame = 0; frame < FRAMES; frame++) {
        for (const node of allNodes) {
          try {
            const cs = getComputedStyle(node.source);
            const cloneStyle = node.clone.style as any;
            for (const prop of FIXED_45) {
              const srcVal = (cs as any)[prop];
              const cachedVal = node.cache.get(prop);
              if (cachedVal !== srcVal) {
                node.cache.set(prop, srcVal);
                cloneStyle[prop] = srcVal;
                totalWrites++;
              } else {
                totalSkipped++;
              }
            }
          } catch {}
        }
      }
      const timeCached = performance.now() - startCached;
      
      const totalOps = FRAMES * allNodes.length * FIXED_45.length;
      console.log(`\nFrames: ${FRAMES}, Elements: ${allNodes.length}, Props: ${FIXED_45.length}`);
      console.log(`Total property operations: ${totalOps}`);
      console.log(`  Current (sync all):    ${timeCurrent.toFixed(1)}ms (${(timeCurrent/FRAMES).toFixed(2)}ms/frame)`);
      console.log(`  Cached (skip same):    ${timeCached.toFixed(1)}ms (${(timeCached/FRAMES).toFixed(2)}ms/frame)`);
      console.log(`  Speedup:               ${((timeCurrent/timeCached)).toFixed(2)}x`);
      console.log(`  Writes: ${totalWrites}, Skipped: ${totalSkipped} (${((totalSkipped/totalOps)*100).toFixed(1)}% skipped)`);
      
      // === SIMULATED ANIMATION: Modify transform on first element each frame ===
      console.log(`\n=== With Simulated Animation (1 element animated) ===`);
      
      // Reset caches
      for (const node of allNodes) {
        node.cache.clear();
        try {
          const cs = getComputedStyle(node.source);
          for (const prop of FIXED_45) {
            node.cache.set(prop, (cs as any)[prop]);
          }
        } catch {}
      }
      
      const animatedNode = allNodes[0];
      if (animatedNode) {
        const originalTransform = (animatedNode.source as HTMLElement).style.transform;
        
        // Current approach with animation
        const startCurrentAnim = performance.now();
        for (let frame = 0; frame < FRAMES; frame++) {
          // Simulate animation by changing transform
          (animatedNode.source as HTMLElement).style.transform = `translateX(${frame}px)`;
          
          for (const node of allNodes) {
            try {
              const cs = getComputedStyle(node.source);
              const cloneStyle = node.clone.style as any;
              for (const prop of FIXED_45) {
                const srcVal = (cs as any)[prop];
                if (cloneStyle[prop] !== srcVal) {
                  cloneStyle[prop] = srcVal;
                }
              }
            } catch {}
          }
        }
        const timeCurrentAnim = performance.now() - startCurrentAnim;
        
        // Reset
        (animatedNode.source as HTMLElement).style.transform = originalTransform;
        for (const node of allNodes) {
          node.cache.clear();
          try {
            const cs = getComputedStyle(node.source);
            for (const prop of FIXED_45) {
              node.cache.set(prop, (cs as any)[prop]);
            }
          } catch {}
        }
        
        // Cached approach with animation
        const startCachedAnim = performance.now();
        let animWrites = 0;
        let animSkipped = 0;
        for (let frame = 0; frame < FRAMES; frame++) {
          // Simulate animation
          (animatedNode.source as HTMLElement).style.transform = `translateX(${frame}px)`;
          
          for (const node of allNodes) {
            try {
              const cs = getComputedStyle(node.source);
              const cloneStyle = node.clone.style as any;
              for (const prop of FIXED_45) {
                const srcVal = (cs as any)[prop];
                const cachedVal = node.cache.get(prop);
                if (cachedVal !== srcVal) {
                  node.cache.set(prop, srcVal);
                  cloneStyle[prop] = srcVal;
                  animWrites++;
                } else {
                  animSkipped++;
                }
              }
            } catch {}
          }
        }
        const timeCachedAnim = performance.now() - startCachedAnim;
        
        // Reset
        (animatedNode.source as HTMLElement).style.transform = originalTransform;
        
        console.log(`  Current (sync all):    ${timeCurrentAnim.toFixed(1)}ms (${(timeCurrentAnim/FRAMES).toFixed(2)}ms/frame)`);
        console.log(`  Cached (skip same):    ${timeCachedAnim.toFixed(1)}ms (${(timeCachedAnim/FRAMES).toFixed(2)}ms/frame)`);
        console.log(`  Speedup:               ${((timeCurrentAnim/timeCachedAnim)).toFixed(2)}x`);
        console.log(`  Writes: ${animWrites}, Skipped: ${animSkipped} (${((animSkipped/totalOps)*100).toFixed(1)}% skipped)`);
      }
      
      container.remove();
    }, { timeout: 30000 });
  });

  describe("batched vs interleaved style reads", () => {
    test("microbenchmark: batch all reads then writes vs interleaved read-write", async () => {
      const container = document.createElement("div");
      const apiHost = getApiHost();
      
      // Create a structure with many nodes
      render(
        html`
        <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
          <ef-timegroup id="batch-test" mode="fixed" duration="1s" 
            style="width: 1920px; height: 1080px; background: #1e3a5f;">
            ${Array.from({ length: 50 }, (_, i) => html`
              <div class="node-${i}" style="position: absolute; left: ${i * 20}px; top: ${i * 10}px; 
                width: 100px; height: 50px; background: hsl(${i * 7}, 70%, 60%); 
                opacity: ${0.5 + (i % 10) * 0.05}; transform: rotate(${i}deg);">
                <span style="color: white; padding: 5px;">Node ${i}</span>
              </div>
            `)}
          </ef-timegroup>
        </ef-configuration>
      `,
        container,
      );
      document.body.appendChild(container);

      const timegroup = container.querySelector("#batch-test") as EFTimegroup;
      await timegroup.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 200));

      // Build clone structure
      const { syncState } = buildCloneStructure(timegroup);
      
      // Collect all node pairs
      const pairs: Array<{ source: Element; clone: HTMLElement }> = [];
      traverseCloneTree(syncState, (node) => {
        pairs.push({ source: node.source, clone: node.clone });
      });
      
      console.log(`[Batch Benchmark] Testing with ${pairs.length} nodes`);
      
      const PROPS = ["opacity", "transform", "backgroundColor", "width", "height"];
      const ITERATIONS = 100;
      
      // Warmup
      for (let i = 0; i < 10; i++) {
        for (const { source, clone } of pairs) {
          const cs = getComputedStyle(source);
          for (const prop of PROPS) {
            (clone.style as any)[prop] = (cs as any)[prop];
          }
        }
      }
      
      // INTERLEAVED: Read-write per node
      const interleavedStart = performance.now();
      for (let iter = 0; iter < ITERATIONS; iter++) {
        for (const { source, clone } of pairs) {
          const cs = getComputedStyle(source);
          for (const prop of PROPS) {
            (clone.style as any)[prop] = (cs as any)[prop];
          }
        }
      }
      const interleavedTime = performance.now() - interleavedStart;
      
      // BATCHED: Read all, then write all
      const batchedStart = performance.now();
      for (let iter = 0; iter < ITERATIONS; iter++) {
        // Phase 1: Read all styles
        const styles: CSSStyleDeclaration[] = [];
        for (const { source } of pairs) {
          styles.push(getComputedStyle(source));
        }
        // Phase 2: Write all styles
        for (let i = 0; i < pairs.length; i++) {
          const cs = styles[i]!;
          const clone = pairs[i]!.clone;
          for (const prop of PROPS) {
            (clone.style as any)[prop] = (cs as any)[prop];
          }
        }
      }
      const batchedTime = performance.now() - batchedStart;
      
      console.log(`[Batch Benchmark] ${ITERATIONS} iterations, ${pairs.length} nodes, ${PROPS.length} props:`);
      console.log(`  Interleaved (read-write per node): ${interleavedTime.toFixed(1)}ms`);
      console.log(`  Batched (all reads, then writes):  ${batchedTime.toFixed(1)}ms`);
      console.log(`  Winner: ${interleavedTime < batchedTime ? "INTERLEAVED" : "BATCHED"} by ${Math.abs(1 - batchedTime/interleavedTime).toFixed(1)}x`);
      
      // Log per-iteration time
      console.log(`  Per iteration: interleaved=${(interleavedTime/ITERATIONS).toFixed(2)}ms, batched=${(batchedTime/ITERATIONS).toFixed(2)}ms`);
      
      container.remove();
    }, { timeout: 30000 });
  });
});

