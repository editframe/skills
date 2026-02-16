/**
 * Canvas rendering performance profiling during scrub simulation.
 *
 * Proves the render pipeline paints frames during rapid time changes
 * and reports per-phase timing for both foreignObject and native paths.
 */
import { html, render } from "lit";
import { describe, test, expect, afterEach } from "vitest";
import { renderTimegroupToCanvas } from "./renderTimegroupToCanvas.js";
import { isNativeCanvasApiAvailable } from "./previewSettings.js";
import { captureTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
import { RenderContext } from "./RenderContext.js";
import { FrameController } from "./FrameController.js";
import { updateAnimations } from "../elements/updateAnimations.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import "../elements/EFTimegroup.js";
import "../elements/EFSurface.js";
import "../elements/EFText.js";
import "../elements/EFTextSegment.js";

// Native rendering is ~0.3ms per frame. Use 0.05ms threshold to distinguish
// real renders from same-time skips (<0.01ms).
const PAINT_THRESHOLD_MS = 0.05;

interface FrameTiming {
  step: number;
  timeMs: number;
  readTimeMs: number;
  totalMs: number;
  painted: boolean;
}

describe("Canvas Scrub Performance Profile", () => {
  let container: HTMLDivElement;

  afterEach(() => {
    container?.remove();
    document.body.innerHTML = "";
  });

  async function createTimegroup(): Promise<EFTimegroup> {
    container = document.createElement("div");
    document.body.appendChild(container);

    render(
      html`
        <ef-timegroup
          id="perf-test"
          mode="fixed"
          duration="10s"
          style="width: 400px; height: 300px; background: #333;"
        >
          <ef-surface style="width: 100%; height: 100%;">
            <ef-text
              start="0s"
              end="5s"
              style="position:absolute;top:50px;left:50px;color:white;font-size:24px;"
            >
              <ef-text-segment>Scene 1</ef-text-segment>
            </ef-text>
            <ef-text
              start="5s"
              end="10s"
              style="position:absolute;top:50px;left:50px;color:yellow;font-size:24px;"
            >
              <ef-text-segment>Scene 2</ef-text-segment>
            </ef-text>
          </ef-surface>
        </ef-timegroup>
      `,
      container,
    );

    const tg = document.querySelector("#perf-test") as EFTimegroup;
    await tg.updateComplete;
    tg.currentTimeMs = 0;
    await tg.updateComplete;
    updateAnimations(tg);

    expect(tg.durationMs).toBeGreaterThan(0);
    return tg;
  }

  test("scrub: rapid time changes produce canvas paints", async () => {
    const tg = await createTimegroup();

    const result = renderTimegroupToCanvas(tg, {
      scale: 1,
      resolutionScale: 1,
    });
    const { refresh, dispose } = result;
    container.appendChild(result.container);

    // Warm up
    await refresh();

    const STEPS = 60;
    const timings: FrameTiming[] = [];

    console.log(
      `durationMs=${tg.durationMs} playbackController=${!!tg.playbackController}`,
    );

    for (let i = 0; i < STEPS; i++) {
      const timeMs = Math.round((i / STEPS) * 10000);
      tg.currentTimeMs = timeMs;

      // Wait one frame (simulates RAF loop cadence)
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const readTimeMs = tg.currentTimeMs;
      const t0 = performance.now();
      await refresh();
      const elapsed = performance.now() - t0;

      timings.push({
        step: i,
        timeMs,
        readTimeMs,
        totalMs: elapsed,
        painted: elapsed > PAINT_THRESHOLD_MS,
      });
    }

    const painted = timings.filter((t) => t.painted);
    const avgPaintMs =
      painted.length > 0
        ? painted.reduce((a, t) => a + t.totalMs, 0) / painted.length
        : 0;
    const maxMs = Math.max(...timings.map((t) => t.totalMs));

    console.log(`\n=== CANVAS SCRUB PERFORMANCE ===`);
    console.log(
      `painted: ${painted.length}/${STEPS} (${((painted.length / STEPS) * 100).toFixed(0)}%)`,
    );
    console.log(
      `avg paint: ${avgPaintMs.toFixed(2)}ms  max: ${maxMs.toFixed(2)}ms`,
    );
    console.log(
      `effective render rate: ${(1000 / avgPaintMs).toFixed(0)} fps potential`,
    );

    // Verify time reads were correct (no large regressions).
    // Allow <=34ms jitter from 30fps frame-boundary quantization.
    const QUANT_JITTER_MS = 34;
    const staleReads = timings.filter(
      (t, idx) =>
        idx > 0 &&
        timings[idx - 1]!.readTimeMs - t.readTimeMs > QUANT_JITTER_MS,
    );
    if (staleReads.length > 0) {
      console.log(
        `WARNING: ${staleReads.length} stale time reads detected (>${QUANT_JITTER_MS}ms regression)`,
      );
    }

    // At least 80% of distinct time values should produce paints
    expect(painted.length).toBeGreaterThan(STEPS * 0.8);
    // No systematic time regressions (allow <=1 from quantization jitter)
    expect(staleReads.length).toBeLessThanOrEqual(1);

    dispose();
  }, 30000);

  test("scrub: back-to-back refresh without RAF gaps", async () => {
    const tg = await createTimegroup();

    const result = renderTimegroupToCanvas(tg, {
      scale: 1,
      resolutionScale: 1,
    });
    const { refresh, dispose } = result;
    container.appendChild(result.container);

    await refresh();

    // Burst mode: set time + refresh as fast as possible (no RAF between)
    const STEPS = 30;
    const timings: FrameTiming[] = [];

    for (let i = 0; i < STEPS; i++) {
      const timeMs = Math.round((i / STEPS) * 10000);
      tg.currentTimeMs = timeMs;

      const readTimeMs = tg.currentTimeMs;
      const t0 = performance.now();
      await refresh();
      const elapsed = performance.now() - t0;

      timings.push({
        step: i,
        timeMs,
        readTimeMs,
        totalMs: elapsed,
        painted: elapsed > PAINT_THRESHOLD_MS,
      });
    }

    const painted = timings.filter((t) => t.painted);
    const avgMs =
      timings.reduce((a, t) => a + t.totalMs, 0) / timings.length;

    console.log(`\n=== BURST MODE (no RAF gaps) ===`);
    console.log(
      `painted: ${painted.length}/${STEPS} (${((painted.length / STEPS) * 100).toFixed(0)}%)`,
    );
    console.log(`avg frame: ${avgMs.toFixed(2)}ms`);
    console.log(
      `throughput: ${(1000 / avgMs).toFixed(0)} frames/sec potential`,
    );

    // Even in burst mode, most frames should paint
    expect(painted.length).toBeGreaterThan(STEPS * 0.5);

    dispose();
  }, 30000);

  test("scrub: RAF loop pattern matches EFWorkbench", async () => {
    const tg = await createTimegroup();

    const result = renderTimegroupToCanvas(tg, {
      scale: 1,
      resolutionScale: 1,
    });
    const { refresh, dispose } = result;
    container.appendChild(result.container);

    await refresh();

    // Exact EFWorkbench RAF loop pattern:
    //   requestAnimationFrame → await refresh() → requestAnimationFrame
    const FRAMES = 30;
    const frameTimestamps: number[] = [];
    const frameDurations: number[] = [];
    let paintCount = 0;

    for (let i = 0; i < FRAMES; i++) {
      tg.currentTimeMs = Math.round((i / FRAMES) * 10000);

      const frameStart = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve),
      );
      frameTimestamps.push(frameStart);

      const renderStart = performance.now();
      await refresh();
      const renderMs = performance.now() - renderStart;
      frameDurations.push(renderMs);
      if (renderMs > PAINT_THRESHOLD_MS) paintCount++;
    }

    const gaps: number[] = [];
    for (let i = 1; i < frameTimestamps.length; i++) {
      gaps.push(frameTimestamps[i] - frameTimestamps[i - 1]);
    }
    const avgGap =
      gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    const maxGap = gaps.length > 0 ? Math.max(...gaps) : 0;
    const avgRender =
      frameDurations.reduce((a, b) => a + b, 0) / frameDurations.length;

    console.log(`\n=== RAF LOOP PATTERN ===`);
    console.log(`frames: ${FRAMES}  painted: ${paintCount}`);
    console.log(
      `avg frame gap: ${avgGap.toFixed(1)}ms  max gap: ${maxGap.toFixed(1)}ms`,
    );
    console.log(`avg render: ${avgRender.toFixed(2)}ms`);
    console.log(`effective fps: ${(1000 / avgGap).toFixed(0)}`);

    expect(paintCount).toBeGreaterThan(FRAMES * 0.5);
    expect(maxGap).toBeLessThan(100);

    dispose();
  }, 30000);

  test("scrub: foreignObject path paints during rapid time changes", async () => {
    const tg = await createTimegroup();
    const frameController = new FrameController(tg);
    const renderContext = new RenderContext();
    const width = tg.offsetWidth || 400;
    const height = tg.offsetHeight || 300;

    // Warm up
    tg.currentTimeMs = 0;
    await tg.updateComplete;
    updateAnimations(tg);
    await frameController.renderFrame(0, { waitForLitUpdate: false, onAnimationsUpdate: (el) => updateAnimations(el as EFTimegroup) });
    await captureTimelineToDataUri(tg, width, height, { renderContext, canvasScale: 1, timeMs: 0 });

    const STEPS = 30;
    const timings: FrameTiming[] = [];

    for (let i = 0; i < STEPS; i++) {
      const timeMs = Math.round((i / STEPS) * 10000);
      tg.currentTimeMs = timeMs;

      await new Promise((resolve) => requestAnimationFrame(resolve));

      const readTimeMs = tg.currentTimeMs;
      const t0 = performance.now();

      await frameController.renderFrame(readTimeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (el) => updateAnimations(el as EFTimegroup),
      });
      await captureTimelineToDataUri(tg, width, height, {
        renderContext,
        canvasScale: 1,
        timeMs: readTimeMs,
      });

      const elapsed = performance.now() - t0;
      timings.push({
        step: i,
        timeMs,
        readTimeMs,
        totalMs: elapsed,
        painted: elapsed > PAINT_THRESHOLD_MS,
      });
    }

    const painted = timings.filter((t) => t.painted);
    const avgPaintMs =
      painted.length > 0
        ? painted.reduce((a, t) => a + t.totalMs, 0) / painted.length
        : 0;
    const maxMs = Math.max(...timings.map((t) => t.totalMs));

    console.log(`\n=== FOREIGNOBJECT SCRUB PERFORMANCE ===`);
    console.log(
      `painted: ${painted.length}/${STEPS} (${((painted.length / STEPS) * 100).toFixed(0)}%)`,
    );
    console.log(
      `avg paint: ${avgPaintMs.toFixed(2)}ms  max: ${maxMs.toFixed(2)}ms`,
    );
    console.log(
      `effective render rate: ${(1000 / avgPaintMs).toFixed(0)} fps potential`,
    );

    // Verify no stale time reads
    const staleReads = timings.filter(
      (t, idx) => idx > 0 && t.readTimeMs < timings[idx - 1]!.readTimeMs,
    );
    expect(staleReads.length).toBe(0);

    // ForeignObject is slower but should still paint every frame
    expect(painted.length).toBeGreaterThan(STEPS * 0.8);
  }, 30000);

  test("scrub: native vs foreignObject comparison", async () => {
    const hasNative = isNativeCanvasApiAvailable();
    console.log(`\n=== RENDERING PATH COMPARISON ===`);
    console.log(`native API available: ${hasNative}`);

    const tg = await createTimegroup();
    const frameController = new FrameController(tg);
    const renderContext = new RenderContext();
    const width = tg.offsetWidth || 400;
    const height = tg.offsetHeight || 300;

    // Warm up both paths
    tg.currentTimeMs = 0;
    await tg.updateComplete;
    updateAnimations(tg);
    await frameController.renderFrame(0, { waitForLitUpdate: false, onAnimationsUpdate: (el) => updateAnimations(el as EFTimegroup) });

    // Measure foreignObject path
    const foTimes: number[] = [];
    for (let i = 0; i < 20; i++) {
      const timeMs = Math.round((i / 20) * 10000);
      tg.currentTimeMs = timeMs;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await frameController.renderFrame(tg.currentTimeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (el) => updateAnimations(el as EFTimegroup),
      });
      const t0 = performance.now();
      await captureTimelineToDataUri(tg, width, height, {
        renderContext,
        canvasScale: 1,
        timeMs: tg.currentTimeMs,
      });
      foTimes.push(performance.now() - t0);
    }

    const foAvg = foTimes.reduce((a, b) => a + b, 0) / foTimes.length;
    console.log(`foreignObject: avg=${foAvg.toFixed(2)}ms (${(1000 / foAvg).toFixed(0)} fps)`);

    // Measure native path (if available)
    if (hasNative) {
      const result = renderTimegroupToCanvas(tg, { scale: 1, resolutionScale: 1 });
      const { refresh, dispose } = result;
      container.appendChild(result.container);
      await refresh();

      const nativeTimes: number[] = [];
      for (let i = 0; i < 20; i++) {
        const timeMs = Math.round((i / 20) * 10000);
        tg.currentTimeMs = timeMs;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const t0 = performance.now();
        await refresh();
        nativeTimes.push(performance.now() - t0);
      }

      const nativeAvg = nativeTimes.reduce((a, b) => a + b, 0) / nativeTimes.length;
      console.log(`native:        avg=${nativeAvg.toFixed(2)}ms (${(1000 / nativeAvg).toFixed(0)} fps)`);
      console.log(`speedup:       ${(foAvg / nativeAvg).toFixed(1)}x`);

      dispose();
    }

    // Both paths should be fast enough for interactive scrubbing (< 16ms per frame = 60fps)
    expect(foAvg).toBeLessThan(16);
  }, 30000);
});
