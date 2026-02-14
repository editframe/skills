/**
 * Render pipeline performance profiling.
 * Measures each phase in isolation with a bare timegroup (no GUI/timeline).
 *
 * Run: ./scripts/browsertest packages/elements/src/preview/renderPipeline.perf.browsertest.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { captureTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
import { loadImageFromDataUri } from "./rendering/loadImage.js";
import { renderToImageNative } from "./rendering/renderToImageNative.js";
import { isNativeCanvasApiAvailable } from "./previewSettings.js";
import { FrameController } from "./FrameController.js";
import { updateAnimations } from "../elements/updateAnimations.js";
import { renderTimegroupToCanvas } from "./renderTimegroupToCanvas.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import "../elements/EFTimegroup.js";
import "../elements/EFText.js";
import "../elements/EFImage.js";

const W = 1920;
const H = 1080;
const WARMUP = 3;
const ITERATIONS = 30;

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: values.reduce((s, v) => s + v, 0) / values.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
  };
}

function fmt(label: string, values: number[]): string {
  const s = stats(values);
  return `${label}: avg=${s.avg.toFixed(2)}ms p50=${s.p50.toFixed(2)}ms p95=${s.p95.toFixed(2)}ms min=${s.min.toFixed(2)}ms max=${s.max.toFixed(2)}ms`;
}

function fmtFps(values: number[]): string {
  const s = stats(values);
  return `effective fps: ${(1000 / s.avg).toFixed(1)} (p95: ${(1000 / s.p95).toFixed(1)})`;
}

/**
 * Create a representative timegroup with HTML content similar to a real composition.
 * No GUI elements - just the timegroup and content.
 */
function createTestTimegroup(): EFTimegroup {
  const tg = document.createElement("ef-timegroup") as EFTimegroup;
  tg.style.cssText = `width:${W}px;height:${H}px;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);position:relative;overflow:hidden;font-family:system-ui,sans-serif;`;

  // Title text with styling
  const title = document.createElement("div");
  title.style.cssText = "position:absolute;top:80px;left:80px;right:80px;color:white;font-size:72px;font-weight:bold;text-shadow:2px 2px 8px rgba(0,0,0,0.6);";
  title.textContent = "Performance Test Composition";
  tg.appendChild(title);

  // Subtitle
  const subtitle = document.createElement("div");
  subtitle.style.cssText = "position:absolute;top:180px;left:80px;color:rgba(255,255,255,0.8);font-size:36px;";
  subtitle.textContent = "Measuring render pipeline phase-by-phase";
  tg.appendChild(subtitle);

  // Grid of styled elements (simulates typical composition content)
  const grid = document.createElement("div");
  grid.style.cssText = "position:absolute;top:300px;left:80px;right:80px;bottom:80px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;";
  for (let i = 0; i < 12; i++) {
    const card = document.createElement("div");
    card.style.cssText = `background:hsl(${i * 30},60%,40%);border-radius:12px;padding:20px;color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;font-size:18px;box-shadow:0 4px 16px rgba(0,0,0,0.3);`;
    const inner = document.createElement("div");
    inner.style.cssText = "font-size:32px;font-weight:bold;margin-bottom:8px;";
    inner.textContent = `${i + 1}`;
    card.appendChild(inner);
    const label = document.createElement("div");
    label.textContent = `Element ${i + 1}`;
    card.appendChild(label);
    grid.appendChild(card);
  }
  tg.appendChild(grid);

  return tg;
}

/**
 * Create a timegroup with canvas elements (simulates video frames).
 */
function createCanvasTimegroup(): EFTimegroup {
  const tg = document.createElement("ef-timegroup") as EFTimegroup;
  tg.style.cssText = `width:${W}px;height:${H}px;background:#111;position:relative;overflow:hidden;`;

  // Main "video" canvas
  const videoCanvas = document.createElement("canvas");
  videoCanvas.width = W;
  videoCanvas.height = H;
  videoCanvas.style.cssText = "width:100%;height:100%;position:absolute;top:0;left:0;";
  const vctx = videoCanvas.getContext("2d")!;
  const gradient = vctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#ff6b6b");
  gradient.addColorStop(0.5, "#4ecdc4");
  gradient.addColorStop(1, "#45b7d1");
  vctx.fillStyle = gradient;
  vctx.fillRect(0, 0, W, H);
  tg.appendChild(videoCanvas);

  // Overlay canvases (waveform, image overlays)
  for (let i = 0; i < 3; i++) {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 200;
    c.style.cssText = `width:200px;height:100px;position:absolute;bottom:${20 + i * 120}px;left:20px;`;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = `hsl(${i * 120},70%,50%)`;
    ctx.fillRect(0, 0, 400, 200);
    tg.appendChild(c);
  }

  // Text overlay
  const text = document.createElement("div");
  text.style.cssText = "position:absolute;top:40px;left:40px;color:white;font-size:48px;font-weight:bold;text-shadow:2px 2px 4px rgba(0,0,0,0.7);";
  text.textContent = "Video Frame Overlay";
  tg.appendChild(text);

  return tg;
}

describe("render pipeline performance", () => {
  beforeAll(async () => {
    await customElements.whenDefined("ef-timegroup");
  });

  // =========================================================================
  // PHASE 1: Individual phase measurements (HTML-only content)
  // =========================================================================

  it("phase: DOM update only (currentTimeMs + updateComplete)", async () => {
    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const times: number[] = [];

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 100;
      await tg.updateComplete;
    }

    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      tg.currentTimeMs = (WARMUP + i) * 100;
      await tg.updateComplete;
      times.push(performance.now() - t0);
    }

    console.log("\n=== PHASE: DOM UPDATE (currentTimeMs + updateComplete) ===");
    console.log(fmt("dom update", times));
    console.log(fmtFps(times));

    tg.remove();
    expect(times.length).toBe(ITERATIONS);
  }, 30000);

  it("phase: FrameController.renderFrame()", async () => {
    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const fc = new FrameController(tg as any);
    const times: number[] = [];

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 100;
      fc.abort(); // reset dedup
      await fc.renderFrame(i * 100, { waitForLitUpdate: false });
    }

    for (let i = 0; i < ITERATIONS; i++) {
      const timeMs = (WARMUP + i) * 100;
      tg.currentTimeMs = timeMs;
      fc.abort();
      const t0 = performance.now();
      await fc.renderFrame(timeMs, { waitForLitUpdate: false });
      times.push(performance.now() - t0);
    }

    console.log("\n=== PHASE: FRAMECONTROLLER.renderFrame() ===");
    console.log(fmt("renderFrame", times));
    console.log(fmtFps(times));

    tg.remove();
    expect(times.length).toBe(ITERATIONS);
  }, 30000);

  it("phase: updateAnimations()", async () => {
    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const times: number[] = [];

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 100;
      await tg.updateComplete;
      updateAnimations(tg);
    }

    for (let i = 0; i < ITERATIONS; i++) {
      tg.currentTimeMs = (WARMUP + i) * 100;
      await tg.updateComplete;
      const t0 = performance.now();
      updateAnimations(tg);
      times.push(performance.now() - t0);
    }

    console.log("\n=== PHASE: updateAnimations() ===");
    console.log(fmt("updateAnimations", times));
    console.log(fmtFps(times));

    tg.remove();
    expect(times.length).toBe(ITERATIONS);
  }, 30000);

  it("phase: captureTimelineToDataUri() (HTML-only, no canvases)", async () => {
    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const times: number[] = [];
    let dataUriLen = 0;

    for (let i = 0; i < WARMUP; i++) {
      await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs: 0 });
    }

    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const uri = await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs: 0 });
      times.push(performance.now() - t0);
      if (i === 0) dataUriLen = uri.length;
    }

    console.log("\n=== PHASE: captureTimelineToDataUri (HTML-only) ===");
    console.log(fmt("serialize", times));
    console.log(`dataUri size: ${(dataUriLen / 1024).toFixed(1)} KB`);
    console.log(fmtFps(times));

    tg.remove();
    expect(times.length).toBe(ITERATIONS);
  }, 30000);

  it("phase: loadImageFromDataUri()", async () => {
    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    // Generate a dataUri to load repeatedly
    const dataUri = await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs: 0 });
    tg.remove();

    const times: number[] = [];

    for (let i = 0; i < WARMUP; i++) {
      await loadImageFromDataUri(dataUri);
    }

    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      await loadImageFromDataUri(dataUri);
      times.push(performance.now() - t0);
    }

    console.log("\n=== PHASE: loadImageFromDataUri (HTML-only) ===");
    console.log(fmt("imageLoad", times));
    console.log(fmtFps(times));

    expect(times.length).toBe(ITERATIONS);
  }, 30000);

  // =========================================================================
  // PHASE 2: End-to-end pipeline measurements
  // =========================================================================

  it("e2e: foreignObject pipeline (HTML-only)", async () => {
    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const fc = new FrameController(tg as any);
    const serializeTimes: number[] = [];
    const loadTimes: number[] = [];
    const totalTimes: number[] = [];

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 100;
      fc.abort();
      await fc.renderFrame(i * 100, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs: i * 100 });
    }

    for (let i = 0; i < ITERATIONS; i++) {
      const timeMs = (WARMUP + i) * 100;
      tg.currentTimeMs = timeMs;
      fc.abort();

      const t0 = performance.now();
      await fc.renderFrame(timeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      void (tg as HTMLElement).offsetWidth;

      const t1 = performance.now();
      const dataUri = await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs });
      const t2 = performance.now();
      await loadImageFromDataUri(dataUri);
      const t3 = performance.now();

      serializeTimes.push(t2 - t1);
      loadTimes.push(t3 - t2);
      totalTimes.push(t3 - t0);
    }

    console.log("\n=== E2E: FOREIGNOBJECT PIPELINE (HTML-only) ===");
    console.log(fmt("serialize    ", serializeTimes));
    console.log(fmt("imageLoad    ", loadTimes));
    console.log(fmt("total        ", totalTimes));
    console.log(fmtFps(totalTimes));

    tg.remove();
    expect(totalTimes.length).toBe(ITERATIONS);
  }, 30000);

  it("e2e: foreignObject pipeline (HTML + 4 canvases)", async () => {
    const tg = createCanvasTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const fc = new FrameController(tg as any);
    const serializeTimes: number[] = [];
    const loadTimes: number[] = [];
    const totalTimes: number[] = [];

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 100;
      fc.abort();
      await fc.renderFrame(i * 100, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      const uri = await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs: i * 100 });
      await loadImageFromDataUri(uri);
    }

    for (let i = 0; i < ITERATIONS; i++) {
      const timeMs = (WARMUP + i) * 100;
      tg.currentTimeMs = timeMs;
      fc.abort();

      const t0 = performance.now();
      await fc.renderFrame(timeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      void (tg as HTMLElement).offsetWidth;

      const t1 = performance.now();
      const dataUri = await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs });
      const t2 = performance.now();
      await loadImageFromDataUri(dataUri);
      const t3 = performance.now();

      serializeTimes.push(t2 - t1);
      loadTimes.push(t3 - t2);
      totalTimes.push(t3 - t0);
    }

    console.log("\n=== E2E: FOREIGNOBJECT PIPELINE (HTML + 4 canvases) ===");
    console.log(fmt("serialize    ", serializeTimes));
    console.log(fmt("imageLoad    ", loadTimes));
    console.log(fmt("total        ", totalTimes));
    console.log(fmtFps(totalTimes));

    tg.remove();
    expect(totalTimes.length).toBe(ITERATIONS);
  }, 30000);

  it("e2e: native pipeline (HTML-only)", async () => {
    const nativeAvailable = isNativeCanvasApiAvailable();
    console.log(`\n=== E2E: NATIVE PIPELINE (HTML-only) ===`);
    console.log(`drawElementImage available: ${nativeAvailable}`);

    if (!nativeAvailable) {
      console.log("SKIPPED: native canvas API not available in this browser");
      expect(true).toBe(true);
      return;
    }

    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const fc = new FrameController(tg as any);
    const renderTimes: number[] = [];

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 100;
      fc.abort();
      await fc.renderFrame(i * 100, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      await renderToImageNative(tg, W, H, { skipDprScaling: true });
    }

    for (let i = 0; i < ITERATIONS; i++) {
      const timeMs = (WARMUP + i) * 100;
      tg.currentTimeMs = timeMs;
      fc.abort();

      const t0 = performance.now();
      await fc.renderFrame(timeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      void (tg as HTMLElement).offsetWidth;
      await renderToImageNative(tg, W, H, { skipDprScaling: true });
      const t1 = performance.now();

      renderTimes.push(t1 - t0);
    }

    console.log(fmt("total        ", renderTimes));
    console.log(fmtFps(renderTimes));

    tg.remove();
    expect(renderTimes.length).toBe(ITERATIONS);
  }, 30000);

  it("e2e: native pipeline (HTML + 4 canvases)", async () => {
    const nativeAvailable = isNativeCanvasApiAvailable();
    console.log(`\n=== E2E: NATIVE PIPELINE (HTML + 4 canvases) ===`);
    console.log(`drawElementImage available: ${nativeAvailable}`);

    if (!nativeAvailable) {
      console.log("SKIPPED: native canvas API not available in this browser");
      expect(true).toBe(true);
      return;
    }

    const tg = createCanvasTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const fc = new FrameController(tg as any);
    const renderTimes: number[] = [];

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 100;
      fc.abort();
      await fc.renderFrame(i * 100, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      await renderToImageNative(tg, W, H, { skipDprScaling: true });
    }

    for (let i = 0; i < ITERATIONS; i++) {
      const timeMs = (WARMUP + i) * 100;
      tg.currentTimeMs = timeMs;
      fc.abort();

      const t0 = performance.now();
      await fc.renderFrame(timeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      void (tg as HTMLElement).offsetWidth;
      await renderToImageNative(tg, W, H, { skipDprScaling: true });
      const t1 = performance.now();

      renderTimes.push(t1 - t0);
    }

    console.log(fmt("total        ", renderTimes));
    console.log(fmtFps(renderTimes));

    tg.remove();
    expect(renderTimes.length).toBe(ITERATIONS);
  }, 30000);

  // =========================================================================
  // PHASE 3: renderTimegroupToCanvas (the actual preview function)
  // =========================================================================

  it("e2e: renderTimegroupToCanvas refresh loop (HTML-only)", async () => {
    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const preview = renderTimegroupToCanvas(tg, { scale: 1, resolutionScale: 1 });
    const refreshTimes: number[] = [];

    // Wait for initial render
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 100;
      await preview.refresh();
    }

    for (let i = 0; i < ITERATIONS; i++) {
      tg.currentTimeMs = (WARMUP + i) * 100;
      const t0 = performance.now();
      await preview.refresh();
      refreshTimes.push(performance.now() - t0);
    }

    console.log("\n=== E2E: renderTimegroupToCanvas.refresh() (HTML-only) ===");
    console.log(fmt("refresh      ", refreshTimes));
    console.log(fmtFps(refreshTimes));

    preview.dispose();
    tg.remove();
    expect(refreshTimes.length).toBe(ITERATIONS);
  }, 30000);

  it("e2e: renderTimegroupToCanvas refresh loop (HTML + 4 canvases)", async () => {
    const tg = createCanvasTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const preview = renderTimegroupToCanvas(tg, { scale: 1, resolutionScale: 1 });
    const refreshTimes: number[] = [];

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 100;
      await preview.refresh();
    }

    for (let i = 0; i < ITERATIONS; i++) {
      tg.currentTimeMs = (WARMUP + i) * 100;
      const t0 = performance.now();
      await preview.refresh();
      refreshTimes.push(performance.now() - t0);
    }

    console.log("\n=== E2E: renderTimegroupToCanvas.refresh() (HTML + 4 canvases) ===");
    console.log(fmt("refresh      ", refreshTimes));
    console.log(fmtFps(refreshTimes));

    preview.dispose();
    tg.remove();
    expect(refreshTimes.length).toBe(ITERATIONS);
  }, 30000);

  // =========================================================================
  // PHASE 4: Resolution scaling comparison
  // =========================================================================

  it("e2e: foreignObject at different resolution scales (HTML-only)", async () => {
    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    console.log("\n=== RESOLUTION SCALING COMPARISON (HTML-only) ===");

    for (const scale of [1, 0.5, 0.25] as const) {
      const times: number[] = [];
      let uriLen = 0;

      for (let i = 0; i < WARMUP; i++) {
        await captureTimelineToDataUri(tg, W, H, { canvasScale: scale, timeMs: 0 });
      }

      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        const uri = await captureTimelineToDataUri(tg, W, H, { canvasScale: scale, timeMs: 0 });
        const img = await loadImageFromDataUri(uri);
        times.push(performance.now() - t0);
        if (i === 0) {
          uriLen = uri.length;
          console.log(`  scale=${scale}: image=${img.width}x${img.height}, dataUri=${(uriLen / 1024).toFixed(1)}KB`);
        }
      }
      console.log(`  ${fmt(`scale=${scale}`, times)}`);
      console.log(`  ${fmtFps(times)}`);
    }

    tg.remove();
    expect(true).toBe(true);
  }, 60000);

  // =========================================================================
  // PHASE 5: Scrubbing simulation (rapid sequential time changes)
  // =========================================================================

  it("scrub simulation: 60 rapid time changes (HTML-only, foreignObject)", async () => {
    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const fc = new FrameController(tg as any);
    const frameTimes: number[] = [];
    const FRAMES = 60;

    // Warmup
    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 33;
      fc.abort();
      await fc.renderFrame(i * 33, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      const uri = await captureTimelineToDataUri(tg, W, H, { canvasScale: 0.5, timeMs: i * 33 });
      await loadImageFromDataUri(uri);
    }

    const scrubStart = performance.now();

    for (let i = 0; i < FRAMES; i++) {
      const timeMs = i * 33; // ~30fps scrub speed
      tg.currentTimeMs = timeMs;
      fc.abort();

      const t0 = performance.now();
      await fc.renderFrame(timeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      void (tg as HTMLElement).offsetWidth;
      const dataUri = await captureTimelineToDataUri(tg, W, H, { canvasScale: 0.5, timeMs });
      await loadImageFromDataUri(dataUri);
      frameTimes.push(performance.now() - t0);
    }

    const totalScrubMs = performance.now() - scrubStart;

    console.log("\n=== SCRUB SIMULATION: 60 frames, foreignObject, scale=0.5 ===");
    console.log(fmt("per frame    ", frameTimes));
    console.log(`total time:  ${totalScrubMs.toFixed(0)}ms for ${FRAMES} frames`);
    console.log(`actual fps:  ${(FRAMES / (totalScrubMs / 1000)).toFixed(1)}`);
    console.log(`budget:      ${(16.67).toFixed(2)}ms/frame @ 60fps`);

    tg.remove();
    expect(frameTimes.length).toBe(FRAMES);
  }, 60000);

  it("scrub simulation: 60 rapid time changes (HTML + canvases, foreignObject)", async () => {
    const tg = createCanvasTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const fc = new FrameController(tg as any);
    const frameTimes: number[] = [];
    const FRAMES = 60;

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 33;
      fc.abort();
      await fc.renderFrame(i * 33, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      const uri = await captureTimelineToDataUri(tg, W, H, { canvasScale: 0.5, timeMs: i * 33 });
      await loadImageFromDataUri(uri);
    }

    const scrubStart = performance.now();

    for (let i = 0; i < FRAMES; i++) {
      const timeMs = i * 33;
      tg.currentTimeMs = timeMs;
      fc.abort();

      const t0 = performance.now();
      await fc.renderFrame(timeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      void (tg as HTMLElement).offsetWidth;
      const dataUri = await captureTimelineToDataUri(tg, W, H, { canvasScale: 0.5, timeMs });
      await loadImageFromDataUri(dataUri);
      frameTimes.push(performance.now() - t0);
    }

    const totalScrubMs = performance.now() - scrubStart;

    console.log("\n=== SCRUB SIMULATION: 60 frames, HTML+canvases, foreignObject, scale=0.5 ===");
    console.log(fmt("per frame    ", frameTimes));
    console.log(`total time:  ${totalScrubMs.toFixed(0)}ms for ${FRAMES} frames`);
    console.log(`actual fps:  ${(FRAMES / (totalScrubMs / 1000)).toFixed(1)}`);

    tg.remove();
    expect(frameTimes.length).toBe(FRAMES);
  }, 60000);

  it("scrub simulation: native path (if available)", async () => {
    const nativeAvailable = isNativeCanvasApiAvailable();
    console.log(`\n=== SCRUB SIMULATION: NATIVE PATH ===`);
    console.log(`drawElementImage available: ${nativeAvailable}`);

    if (!nativeAvailable) {
      console.log("SKIPPED: native canvas API not available");
      expect(true).toBe(true);
      return;
    }

    const tg = createTestTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    const fc = new FrameController(tg as any);
    const frameTimes: number[] = [];
    const FRAMES = 60;

    for (let i = 0; i < WARMUP; i++) {
      tg.currentTimeMs = i * 33;
      fc.abort();
      await fc.renderFrame(i * 33, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      await renderToImageNative(tg, W, H, { skipDprScaling: true });
    }

    const scrubStart = performance.now();

    for (let i = 0; i < FRAMES; i++) {
      const timeMs = i * 33;
      tg.currentTimeMs = timeMs;
      fc.abort();

      const t0 = performance.now();
      await fc.renderFrame(timeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
      });
      void (tg as HTMLElement).offsetWidth;
      await renderToImageNative(tg, W, H, { skipDprScaling: true });
      frameTimes.push(performance.now() - t0);
    }

    const totalScrubMs = performance.now() - scrubStart;

    console.log(fmt("per frame    ", frameTimes));
    console.log(`total time:  ${totalScrubMs.toFixed(0)}ms for ${FRAMES} frames`);
    console.log(`actual fps:  ${(FRAMES / (totalScrubMs / 1000)).toFixed(1)}`);
    console.log(`budget:      ${(16.67).toFixed(2)}ms/frame @ 60fps`);

    tg.remove();
    expect(frameTimes.length).toBe(FRAMES);
  }, 60000);
});
