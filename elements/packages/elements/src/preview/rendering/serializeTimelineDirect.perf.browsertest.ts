/**
 * Performance profiling for the serialization pipeline.
 * Measures phase-by-phase timing of captureTimelineToDataUri and its dependencies.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { serializeElementToXHTML, captureTimelineToDataUri } from "./serializeTimelineDirect.js";
import { loadImageFromDataUri } from "./loadImage.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";
import "../../elements/EFTimegroup.js";

interface TimingResult {
  serializeMs: number;
  imageLoadMs: number;
  totalMs: number;
  dataUriLength: number;
}

async function measureFrame(
  element: Element,
  width: number,
  height: number,
  timeMs: number,
): Promise<TimingResult> {
  const t0 = performance.now();
  const dataUri = await captureTimelineToDataUri(element, width, height, {
    canvasScale: 1,
    timeMs,
  });
  const serializeMs = performance.now() - t0;

  const t1 = performance.now();
  await loadImageFromDataUri(dataUri);
  const imageLoadMs = performance.now() - t1;

  return {
    serializeMs,
    imageLoadMs,
    totalMs: serializeMs + imageLoadMs,
    dataUriLength: dataUri.length,
  };
}

function stats(values: number[]): { min: number; max: number; avg: number; p50: number; p95: number } {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: values.reduce((s, v) => s + v, 0) / values.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
  };
}

function formatStats(label: string, values: number[]): string {
  const s = stats(values);
  return `${label}: avg=${s.avg.toFixed(1)}ms p50=${s.p50.toFixed(1)}ms p95=${s.p95.toFixed(1)}ms min=${s.min.toFixed(1)}ms max=${s.max.toFixed(1)}ms`;
}

describe("serialization pipeline performance", () => {
  beforeAll(async () => {
    await customElements.whenDefined("ef-timegroup");
  });

  it("baseline: simple HTML content (no canvases)", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = "width: 1920px; height: 1080px; background: linear-gradient(45deg, #667eea, #764ba2);";

    const content = document.createElement("div");
    content.style.cssText = "width: 100%; height: 100%; display: flex; flex-wrap: wrap; align-items: center; justify-content: center;";
    for (let i = 0; i < 20; i++) {
      const el = document.createElement("div");
      el.style.cssText = `width:80px;height:80px;margin:8px;background:hsl(${i * 18},70%,60%);border-radius:${i % 2 ? "50%" : "8px"};`;
      el.textContent = `Item ${i}`;
      content.appendChild(el);
    }
    tg.appendChild(content);
    document.body.appendChild(tg);

    try {
      await tg.updateComplete;

      const WARMUP = 3;
      const ITERATIONS = 20;
      const results: TimingResult[] = [];

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        await measureFrame(tg, 1920, 1080, 0);
      }

      // Measured runs
      for (let i = 0; i < ITERATIONS; i++) {
        results.push(await measureFrame(tg, 1920, 1080, 0));
      }

      console.log("\n=== SIMPLE HTML (1920x1080, 20 elements) ===");
      console.log(formatStats("serialize    ", results.map(r => r.serializeMs)));
      console.log(formatStats("imageLoad    ", results.map(r => r.imageLoadMs)));
      console.log(formatStats("total        ", results.map(r => r.totalMs)));
      console.log(`dataUri size:  ${(results[0].dataUriLength / 1024).toFixed(1)} KB`);
      console.log(`effective fps: ${(1000 / stats(results.map(r => r.totalMs)).avg).toFixed(1)} fps`);

      // Sanity: should complete, no assertion on speed
      expect(results.length).toBe(ITERATIONS);
    } finally {
      tg.remove();
    }
  }, 30000);

  it("baseline: HTML content at reduced resolution (0.5x)", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = "width: 1920px; height: 1080px; background: linear-gradient(45deg, #667eea, #764ba2);";

    const content = document.createElement("div");
    content.style.cssText = "width: 100%; height: 100%; display: flex; flex-wrap: wrap; align-items: center; justify-content: center;";
    for (let i = 0; i < 20; i++) {
      const el = document.createElement("div");
      el.style.cssText = `width:80px;height:80px;margin:8px;background:hsl(${i * 18},70%,60%);border-radius:${i % 2 ? "50%" : "8px"};`;
      el.textContent = `Item ${i}`;
      content.appendChild(el);
    }
    tg.appendChild(content);
    document.body.appendChild(tg);

    try {
      await tg.updateComplete;

      const WARMUP = 3;
      const ITERATIONS = 20;
      const results: TimingResult[] = [];

      for (let i = 0; i < WARMUP; i++) {
        await captureTimelineToDataUri(tg, 1920, 1080, { canvasScale: 0.5, timeMs: 0 });
      }

      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        const dataUri = await captureTimelineToDataUri(tg, 1920, 1080, { canvasScale: 0.5, timeMs: 0 });
        const serializeMs = performance.now() - t0;
        const t1 = performance.now();
        await loadImageFromDataUri(dataUri);
        const imageLoadMs = performance.now() - t1;
        results.push({ serializeMs, imageLoadMs, totalMs: serializeMs + imageLoadMs, dataUriLength: dataUri.length });
      }

      console.log("\n=== SIMPLE HTML (1920x1080 @ 0.5x scale) ===");
      console.log(formatStats("serialize    ", results.map(r => r.serializeMs)));
      console.log(formatStats("imageLoad    ", results.map(r => r.imageLoadMs)));
      console.log(formatStats("total        ", results.map(r => r.totalMs)));
      console.log(`dataUri size:  ${(results[0].dataUriLength / 1024).toFixed(1)} KB`);
      console.log(`effective fps: ${(1000 / stats(results.map(r => r.totalMs)).avg).toFixed(1)} fps`);

      expect(results.length).toBe(ITERATIONS);
    } finally {
      tg.remove();
    }
  }, 30000);

  it("baseline: complex content (many nested elements)", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = "width: 1920px; height: 1080px; background: #1a1a2e;";

    // Build deeper DOM tree
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:20px;width:100%;height:100%;box-sizing:border-box;";
    for (let i = 0; i < 25; i++) {
      const card = document.createElement("div");
      card.style.cssText = `background:hsl(${i * 14},60%,40%);border-radius:12px;padding:12px;display:flex;flex-direction:column;justify-content:space-between;`;
      const title = document.createElement("h3");
      title.style.cssText = "color:white;margin:0;font-size:14px;";
      title.textContent = `Card ${i + 1}`;
      const body = document.createElement("p");
      body.style.cssText = "color:rgba(255,255,255,0.7);margin:4px 0;font-size:11px;";
      body.textContent = "Sample card content with text that wraps to multiple lines for testing serialization performance.";
      const footer = document.createElement("div");
      footer.style.cssText = "display:flex;gap:4px;";
      for (let j = 0; j < 3; j++) {
        const tag = document.createElement("span");
        tag.style.cssText = `background:rgba(255,255,255,0.2);color:white;padding:2px 6px;border-radius:4px;font-size:9px;`;
        tag.textContent = `tag${j}`;
        footer.appendChild(tag);
      }
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(footer);
      grid.appendChild(card);
    }
    tg.appendChild(grid);
    document.body.appendChild(tg);

    try {
      await tg.updateComplete;

      const WARMUP = 3;
      const ITERATIONS = 20;
      const results: TimingResult[] = [];

      for (let i = 0; i < WARMUP; i++) {
        await measureFrame(tg, 1920, 1080, 0);
      }
      for (let i = 0; i < ITERATIONS; i++) {
        results.push(await measureFrame(tg, 1920, 1080, 0));
      }

      console.log("\n=== COMPLEX HTML (1920x1080, 25 cards with nested elements) ===");
      console.log(formatStats("serialize    ", results.map(r => r.serializeMs)));
      console.log(formatStats("imageLoad    ", results.map(r => r.imageLoadMs)));
      console.log(formatStats("total        ", results.map(r => r.totalMs)));
      console.log(`dataUri size:  ${(results[0].dataUriLength / 1024).toFixed(1)} KB`);
      console.log(`effective fps: ${(1000 / stats(results.map(r => r.totalMs)).avg).toFixed(1)} fps`);
      console.log(`DOM nodes:     ~${grid.querySelectorAll("*").length + 1}`);

      expect(results.length).toBe(ITERATIONS);
    } finally {
      tg.remove();
    }
  }, 30000);

  it("baseline: HTML + canvas elements (simulates video frames)", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = "width: 1920px; height: 1080px; background: #222;";

    // Create content with multiple canvases (simulates video + waveform + image)
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width:100%;height:100%;position:relative;";

    // Main "video" canvas (large)
    const videoCanvas = document.createElement("canvas");
    videoCanvas.width = 1920;
    videoCanvas.height = 1080;
    videoCanvas.style.cssText = "width:100%;height:100%;position:absolute;top:0;left:0;object-fit:cover;";
    const vctx = videoCanvas.getContext("2d")!;
    // Paint gradient to simulate video frame
    const gradient = vctx.createLinearGradient(0, 0, 1920, 1080);
    gradient.addColorStop(0, "#ff0000");
    gradient.addColorStop(0.5, "#00ff00");
    gradient.addColorStop(1, "#0000ff");
    vctx.fillStyle = gradient;
    vctx.fillRect(0, 0, 1920, 1080);
    wrapper.appendChild(videoCanvas);

    // Overlay canvases (waveform, image)
    for (let i = 0; i < 3; i++) {
      const c = document.createElement("canvas");
      c.width = 400;
      c.height = 200;
      c.style.cssText = `width:200px;height:100px;position:absolute;bottom:${10 + i * 110}px;left:10px;`;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = `hsl(${i * 120}, 80%, 50%)`;
      ctx.fillRect(0, 0, 400, 200);
      wrapper.appendChild(c);
    }

    // Text overlay
    const text = document.createElement("div");
    text.style.cssText = "position:absolute;top:20px;left:20px;color:white;font-size:48px;text-shadow:2px 2px 4px rgba(0,0,0,0.5);";
    text.textContent = "Sample Overlay Text";
    wrapper.appendChild(text);

    tg.appendChild(wrapper);
    document.body.appendChild(tg);

    try {
      await tg.updateComplete;

      const WARMUP = 3;
      const ITERATIONS = 20;
      const results: TimingResult[] = [];

      for (let i = 0; i < WARMUP; i++) {
        await measureFrame(tg, 1920, 1080, 0);
      }
      for (let i = 0; i < ITERATIONS; i++) {
        results.push(await measureFrame(tg, 1920, 1080, 0));
      }

      console.log("\n=== HTML + 4 CANVASES (1920x1080 main + 3x 400x200 overlay) ===");
      console.log(formatStats("serialize    ", results.map(r => r.serializeMs)));
      console.log(formatStats("imageLoad    ", results.map(r => r.imageLoadMs)));
      console.log(formatStats("total        ", results.map(r => r.totalMs)));
      console.log(`dataUri size:  ${(results[0].dataUriLength / 1024).toFixed(1)} KB`);
      console.log(`effective fps: ${(1000 / stats(results.map(r => r.totalMs)).avg).toFixed(1)} fps`);

      expect(results.length).toBe(ITERATIONS);
    } finally {
      tg.remove();
    }
  }, 30000);

  it("worker encoding: JPEG vs PNG at various resolutions", async () => {
    // Direct worker encoding benchmark. Shows the cost difference between
    // JPEG and PNG at different resolutions — this is the bottleneck for
    // canvas-heavy compositions.
    const { encodeCanvasInWorker } = await import("../encoding/workerEncoder.js");
    const { WorkerPool } = await import("../workers/WorkerPool.js");
    const { getEncoderWorkerUrl } = await import("../workers/encoderWorkerInline.js");

    const workerUrl = getEncoderWorkerUrl();
    const pool = new WorkerPool(workerUrl);
    if (!pool.isAvailable()) {
      console.log("Workers not available, skipping");
      expect(true).toBe(true);
      return;
    }

    const resolutions = [
      { w: 1920, h: 1080, label: "1920x1080 (full)" },
      { w: 960, h: 540, label: "960x540 (0.5x)" },
      { w: 630, h: 354, label: "630x354 (display)" },
    ];

    console.log("\n=== WORKER ENCODING: JPEG vs PNG at various resolutions ===");

    for (const { w, h, label } of resolutions) {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#ff0000");
      grad.addColorStop(0.5, "#00ff00");
      grad.addColorStop(1, "#0000ff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Warmup
      for (let i = 0; i < 2; i++) {
        await pool.execute((worker) => encodeCanvasInWorker(worker, canvas, false));
        await pool.execute((worker) => encodeCanvasInWorker(worker, canvas, true));
      }

      const jpegTimes: number[] = [];
      const pngTimes: number[] = [];
      let jpegSize = 0;
      let pngSize = 0;

      for (let i = 0; i < 10; i++) {
        let t = performance.now();
        const jpg = await pool.execute((worker) => encodeCanvasInWorker(worker, canvas, false));
        jpegTimes.push(performance.now() - t);
        if (i === 0) jpegSize = jpg.length;

        t = performance.now();
        const png = await pool.execute((worker) => encodeCanvasInWorker(worker, canvas, true));
        pngTimes.push(performance.now() - t);
        if (i === 0) pngSize = png.length;
      }

      console.log(`\n--- ${label} ---`);
      console.log(formatStats("JPEG worker  ", jpegTimes));
      console.log(formatStats("PNG worker   ", pngTimes));
      console.log(`JPEG size: ${(jpegSize / 1024).toFixed(1)}KB, PNG size: ${(pngSize / 1024).toFixed(1)}KB`);
      console.log(`JPEG speedup: ${(stats(pngTimes).avg / stats(jpegTimes).avg).toFixed(1)}x`);
    }

    // Test resize-before-encode: 1920x1080 canvas → 630x354 via worker
    console.log("\n--- Resize in worker: 1920x1080 → 630x354 ---");
    const bigCanvas = document.createElement("canvas");
    bigCanvas.width = 1920;
    bigCanvas.height = 1080;
    const bctx = bigCanvas.getContext("2d")!;
    const grad = bctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, "#ff0000");
    grad.addColorStop(1, "#0000ff");
    bctx.fillStyle = grad;
    bctx.fillRect(0, 0, 1920, 1080);

    // Warmup
    for (let i = 0; i < 2; i++) {
      await pool.execute((worker) => encodeCanvasInWorker(worker, bigCanvas, false, 630, 354));
    }

    const resizeTimes: number[] = [];
    let resizeSize = 0;
    for (let i = 0; i < 10; i++) {
      const t = performance.now();
      const result = await pool.execute((worker) => encodeCanvasInWorker(worker, bigCanvas, false, 630, 354));
      resizeTimes.push(performance.now() - t);
      if (i === 0) resizeSize = result.length;
    }
    console.log(formatStats("JPEG resize  ", resizeTimes));
    console.log(`Output size: ${(resizeSize / 1024).toFixed(1)}KB`);

    pool.terminate();
    expect(true).toBe(true);
  }, 60000);

  it("diagnostic: worker pool and JPEG vs PNG encoding", async () => {
    const hasWorker = typeof Worker !== "undefined";
    const hasOffscreen = typeof OffscreenCanvas !== "undefined";
    const hasBitmap = typeof createImageBitmap !== "undefined";
    console.log(`\n=== WORKER DIAGNOSTICS ===`);
    console.log(`Worker: ${hasWorker}, OffscreenCanvas: ${hasOffscreen}, createImageBitmap: ${hasBitmap}`);
    console.log(`hardwareConcurrency: ${navigator.hardwareConcurrency}`);

    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, "#ff0000");
    grad.addColorStop(1, "#0000ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);

    canvas.toDataURL("image/png");
    canvas.toDataURL("image/jpeg", 0.92);

    const pngTimes: number[] = [];
    const jpgTimes: number[] = [];
    for (let i = 0; i < 10; i++) {
      let t = performance.now();
      const png = canvas.toDataURL("image/png");
      pngTimes.push(performance.now() - t);

      t = performance.now();
      const jpg = canvas.toDataURL("image/jpeg", 0.92);
      jpgTimes.push(performance.now() - t);

      if (i === 0) {
        console.log(`PNG size: ${(png.length / 1024).toFixed(1)} KB`);
        console.log(`JPEG size: ${(jpg.length / 1024).toFixed(1)} KB`);
      }
    }

    console.log(formatStats("PNG encode   ", pngTimes));
    console.log(formatStats("JPEG encode  ", jpgTimes));
    console.log(`JPEG speedup: ${(stats(pngTimes).avg / stats(jpgTimes).avg).toFixed(1)}x`);

    expect(true).toBe(true);
  });

  it("breakdown: serialize vs base64 encode vs image load", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = "width: 1920px; height: 1080px; background: #333;";

    const content = document.createElement("div");
    content.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:72px;";
    content.textContent = "Performance Test";
    tg.appendChild(content);
    document.body.appendChild(tg);

    try {
      await tg.updateComplete;

      // Measure serialize-only (XHTML generation, no SVG wrapping or base64)
      const xhtmlTimes: number[] = [];
      const dataUriTimes: number[] = [];
      const imageLoadTimes: number[] = [];

      // Warmup
      for (let i = 0; i < 3; i++) {
        await serializeElementToXHTML(tg, 1920, 1080, { canvasScale: 1, timeMs: 0 });
      }

      for (let i = 0; i < 20; i++) {
        // Phase 1: DOM walk + XHTML generation
        const t0 = performance.now();
        const xhtml = await serializeElementToXHTML(tg, 1920, 1080, { canvasScale: 1, timeMs: 0 });
        xhtmlTimes.push(performance.now() - t0);

        // Phase 2: Full pipeline (DOM walk + XHTML + SVG wrap + base64 encode)
        const t1 = performance.now();
        const dataUri = await captureTimelineToDataUri(tg, 1920, 1080, { canvasScale: 1, timeMs: 0 });
        dataUriTimes.push(performance.now() - t1);

        // Phase 3: Image loading (browser SVG parsing + rendering)
        const t2 = performance.now();
        await loadImageFromDataUri(dataUri);
        imageLoadTimes.push(performance.now() - t2);
      }

      console.log("\n=== PHASE BREAKDOWN (1920x1080, simple content) ===");
      console.log(formatStats("serializeXHTML ", xhtmlTimes));
      console.log(formatStats("captureDataUri ", dataUriTimes));
      console.log(formatStats("imageLoad      ", imageLoadTimes));

      const avgTotal = stats(dataUriTimes).avg + stats(imageLoadTimes).avg;
      const avgXhtml = stats(xhtmlTimes).avg;
      const avgBase64 = stats(dataUriTimes).avg - avgXhtml;
      const avgImgLoad = stats(imageLoadTimes).avg;

      console.log("\n--- Approximate breakdown ---");
      console.log(`DOM walk + XHTML: ${avgXhtml.toFixed(1)}ms (${((avgXhtml / avgTotal) * 100).toFixed(0)}%)`);
      console.log(`SVG wrap + base64: ${avgBase64.toFixed(1)}ms (${((avgBase64 / avgTotal) * 100).toFixed(0)}%)`);
      console.log(`Image load:        ${avgImgLoad.toFixed(1)}ms (${((avgImgLoad / avgTotal) * 100).toFixed(0)}%)`);
      console.log(`Total:             ${avgTotal.toFixed(1)}ms → ${(1000 / avgTotal).toFixed(1)} fps`);

      expect(xhtmlTimes.length).toBe(20);
    } finally {
      tg.remove();
    }
  }, 30000);
});
