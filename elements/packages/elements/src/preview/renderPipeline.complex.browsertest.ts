/**
 * Complex composition profiling: measures per-phase cost with realistic content.
 * Approximates video.html: nested timegroups, text with segments, images, CSS animations.
 *
 * Run: ./scripts/browsertest packages/elements/src/preview/renderPipeline.complex.browsertest.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { renderTimegroupToCanvas } from "./renderTimegroupToCanvas.js";
import { isNativeCanvasApiAvailable } from "./previewSettings.js";
import { FrameController } from "./FrameController.js";
import { updateAnimations } from "../elements/updateAnimations.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import "../elements/EFTimegroup.js";
import "../elements/EFText.js";
import "../elements/EFTextSegment.js";
import "../elements/EFImage.js";
import "../elements/EFCaptions.js";
import "../elements/EFSurface.js";

const W = 800;
const H = 450;

function createComplexComposition(): EFTimegroup {
  const root = document.createElement("ef-timegroup") as EFTimegroup;
  root.setAttribute("mode", "contain");
  root.style.cssText = `width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#0f172a;font-family:system-ui,sans-serif;`;

  // Main content layer: sequential scenes
  const seq = document.createElement("ef-timegroup") as EFTimegroup;
  seq.setAttribute("mode", "sequence");
  seq.style.cssText = "position:absolute;inset:0;";

  for (let scene = 0; scene < 8; scene++) {
    const sc = document.createElement("ef-timegroup") as EFTimegroup;
    sc.setAttribute("mode", "fixed");
    sc.setAttribute("duration", "5s");
    sc.style.cssText = `position:absolute;width:100%;height:100%;background:linear-gradient(${scene * 45}deg,hsl(${scene * 45},50%,20%),hsl(${scene * 45 + 60},50%,30%));`;

    // Each scene has: background canvas, text overlays, image, labels
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = W;
    bgCanvas.height = H;
    bgCanvas.style.cssText = "width:100%;height:100%;position:absolute;top:0;left:0;";
    const ctx = bgCanvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, `hsl(${scene * 45},60%,40%)`);
    grad.addColorStop(1, `hsl(${scene * 45 + 90},60%,30%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    for (let i = 0; i < 20; i++) {
      ctx.fillRect(Math.random() * W, Math.random() * H, 40, 40);
    }
    sc.appendChild(bgCanvas);

    // Title text with split
    const titleText = document.createElement("ef-text");
    titleText.setAttribute("split", "word");
    titleText.setAttribute("stagger", "100ms");
    titleText.setAttribute("duration", "3s");
    titleText.className = "absolute top-8 left-0 right-0 text-center text-white text-3xl font-bold";
    titleText.style.cssText = "position:absolute;top:30px;left:0;right:0;text-align:center;color:white;font-size:32px;font-weight:bold;";
    const tmpl = document.createElement("template");
    const seg = document.createElement("ef-text-segment");
    seg.style.cssText = "opacity:0;animation:fadeIn 0.4s ease-out forwards;";
    tmpl.content.appendChild(seg);
    titleText.appendChild(tmpl);
    titleText.appendChild(document.createTextNode(`Scene ${scene + 1} Title Text`));
    sc.appendChild(titleText);

    // Subtitle text with char split
    const subText = document.createElement("ef-text");
    subText.setAttribute("split", "char");
    subText.setAttribute("stagger", "30ms");
    subText.setAttribute("duration", "2s");
    subText.style.cssText = "position:absolute;top:80px;left:0;right:0;text-align:center;color:rgba(255,255,255,0.7);font-size:18px;";
    const tmpl2 = document.createElement("template");
    const seg2 = document.createElement("ef-text-segment");
    seg2.style.cssText = "opacity:0;animation:slideIn 0.3s ease-out forwards;";
    tmpl2.content.appendChild(seg2);
    subText.appendChild(tmpl2);
    subText.appendChild(document.createTextNode(`Subtitle for scene number ${scene + 1}`));
    sc.appendChild(subText);

    // Image overlay (inline SVG data URI)
    const img = document.createElement("ef-image");
    img.setAttribute("src", `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='hsl(${scene * 45},60%25,50%25)' width='80' height='80' rx='8'/%3E%3Ctext x='40' y='45' font-family='system-ui' font-size='14' font-weight='bold' fill='white' text-anchor='middle'%3E${scene + 1}%3C/text%3E%3C/svg%3E`);
    img.setAttribute("duration", "5s");
    img.style.cssText = "position:absolute;top:12px;right:12px;width:48px;height:48px;border-radius:8px;";
    sc.appendChild(img);

    // Label badges
    for (let j = 0; j < 4; j++) {
      const label = document.createElement("ef-text");
      label.setAttribute("duration", "5s");
      label.style.cssText = `position:absolute;${j < 2 ? 'top' : 'bottom'}:${j < 2 ? '120' : '40'}px;${j % 2 === 0 ? 'left' : 'right'}:20px;background:rgba(0,0,0,0.5);color:white;padding:4px 12px;border-radius:4px;font-size:12px;`;
      label.textContent = `Label ${j + 1}`;
      sc.appendChild(label);
    }

    // Nested timegroup for decorative elements
    const deco = document.createElement("ef-timegroup") as EFTimegroup;
    deco.setAttribute("mode", "fit");
    deco.style.cssText = "position:absolute;inset:0;pointer-events:none;";
    for (let d = 0; d < 3; d++) {
      const decoEl = document.createElement("div");
      decoEl.style.cssText = `position:absolute;width:${60 + d * 20}px;height:${60 + d * 20}px;border:2px solid rgba(59,130,246,0.3);border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%);animation:pulseRing 2s ease-in-out infinite;animation-delay:${d * 0.4}s;`;
      deco.appendChild(decoEl);
    }
    sc.appendChild(deco);

    seq.appendChild(sc);
  }
  root.appendChild(seq);

  // Persistent info bar layer (mode=fit, always visible)
  const infoBar = document.createElement("ef-timegroup") as EFTimegroup;
  infoBar.setAttribute("mode", "fit");
  infoBar.style.cssText = "position:absolute;left:0;right:0;bottom:0;height:60px;background:linear-gradient(180deg,rgba(15,23,42,0.95),rgba(30,41,59,0.98));border-top:1px solid rgba(59,130,246,0.3);";

  const brandImg = document.createElement("ef-image");
  brandImg.setAttribute("src", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%233b82f6' width='40' height='40' rx='4'/%3E%3Ctext x='20' y='26' font-family='system-ui' font-size='10' font-weight='bold' fill='white' text-anchor='middle'%3EEF%3C/text%3E%3C/svg%3E");
  brandImg.style.cssText = "position:absolute;left:12px;top:10px;width:40px;height:40px;";
  infoBar.appendChild(brandImg);

  const barText = document.createElement("ef-text");
  barText.setAttribute("split", "word");
  barText.setAttribute("stagger", "100ms");
  barText.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.8);font-size:13px;";
  const tmplBar = document.createElement("template");
  const segBar = document.createElement("ef-text-segment");
  segBar.style.cssText = "opacity:0;animation:fadeIn 0.4s ease-out forwards;";
  tmplBar.content.appendChild(segBar);
  barText.appendChild(tmplBar);
  barText.appendChild(document.createTextNode("Complex Composition Profiling Test"));
  infoBar.appendChild(barText);

  root.appendChild(infoBar);

  return root;
}

// Add CSS animations to page
function injectAnimations() {
  if (document.getElementById("perf-test-anims")) return;
  const style = document.createElement("style");
  style.id = "perf-test-anims";
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes pulseRing { 0% { transform: translate(-50%,-50%) scale(0.95); opacity: 0.5; } 50% { transform: translate(-50%,-50%) scale(1.05); opacity: 0.3; } 100% { transform: translate(-50%,-50%) scale(0.95); opacity: 0.5; } }
  `;
  document.head.appendChild(style);
}

describe("complex composition profiling", () => {
  beforeAll(async () => {
    injectAnimations();
    await customElements.whenDefined("ef-timegroup");
    await customElements.whenDefined("ef-text");
    await customElements.whenDefined("ef-image");
  });

  it("profile: FrameController phases with complex DOM", async () => {
    const tg = createComplexComposition();
    document.body.appendChild(tg);
    await tg.updateComplete;
    await new Promise(r => setTimeout(r, 200));

    const fc = new FrameController(tg);
    const N = 60;
    const animsTimes: number[] = [];
    const totalTimes: number[] = [];

    for (let i = 0; i < 3; i++) {
      tg.currentTimeMs = i * 500;
      await tg.updateComplete;
      await fc.renderFrame(i * 500, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => {
          updateAnimations(root as any);

        },
      });
    }

    for (let i = 0; i < N; i++) {
      const timeMs = 3000 + i * 100;
      tg.currentTimeMs = timeMs;
      await tg.updateComplete;

      const tTotal = performance.now();
      fc.abort();

      await fc.renderFrame(timeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => {
          const tA = performance.now();
          updateAnimations(root as any);

          animsTimes.push(performance.now() - tA);
        },
      });

      totalTimes.push(performance.now() - tTotal);
    }

    console.log(`\n=== FRAMECONTROLLER COMPLEX DOM PROFILING (${N} frames) ===`);
    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const p95 = (arr: number[]) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)]!;
    };
    console.log(`Total per frame:     avg=${avg(totalTimes).toFixed(2)}ms p95=${p95(totalTimes).toFixed(2)}ms → ${(1000/avg(totalTimes)).toFixed(0)}fps`);
    console.log(`  updateAnimations:  avg=${avg(animsTimes).toFixed(2)}ms p95=${p95(animsTimes).toFixed(2)}ms`);

    // Count DOM elements
    const allEls = tg.querySelectorAll("*");
    console.log(`DOM elements: ${allEls.length}`);
    console.log(`Native available: ${isNativeCanvasApiAvailable()}`);

    fc.abort();
    tg.remove();
    expect(totalTimes.length).toBe(N);
  }, 60000);

  it("profile: renderTimegroupToCanvas.refresh() with complex DOM", async () => {
    const tg = createComplexComposition();
    document.body.appendChild(tg);
    await tg.updateComplete;
    await new Promise(r => setTimeout(r, 200));

    const preview = renderTimegroupToCanvas(tg, { scale: 1, resolutionScale: 1 });

    // Wait for initial render
    await new Promise(r => setTimeout(r, 500));

    const N = 60;
    const frameTimes: number[] = [];

    // Warmup
    for (let i = 0; i < 3; i++) {
      await tg.seek(i * 500);
      await new Promise(r => requestAnimationFrame(r));
      await preview.refresh();
    }

    for (let i = 0; i < N; i++) {
      const timeMs = 3000 + i * 100;
      await tg.seek(timeMs);
      await tg.updateComplete;

      const t0 = performance.now();
      await preview.refresh();
      frameTimes.push(performance.now() - t0);
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const p95 = (arr: number[]) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)]!;
    };

    console.log(`\n=== CANVAS REFRESH COMPLEX DOM (${N} frames) ===`);
    console.log(`Mode: ${isNativeCanvasApiAvailable() ? "native" : "foreignObject"}`);
    console.log(`Per frame: avg=${avg(frameTimes).toFixed(2)}ms p95=${p95(frameTimes).toFixed(2)}ms → ${(1000/avg(frameTimes)).toFixed(0)}fps`);
    console.log(`Canvas: ${preview.canvas.width}x${preview.canvas.height}`);

    preview.dispose();
    tg.remove();
    expect(frameTimes.length).toBe(N);
  }, 60000);

  it("profile: scrubbing simulation (rapid time changes)", async () => {
    const tg = createComplexComposition();
    document.body.appendChild(tg);
    await tg.updateComplete;
    await new Promise(r => setTimeout(r, 200));

    const preview = renderTimegroupToCanvas(tg, { scale: 1, resolutionScale: 0.5 });
    await new Promise(r => setTimeout(r, 500));

    const N = 120;
    const frameTimes: number[] = [];

    for (let i = 0; i < N; i++) {
      const timeMs = Math.random() * 40000;
      await tg.seek(timeMs);
      await tg.updateComplete;

      const t0 = performance.now();
      await preview.refresh();
      frameTimes.push(performance.now() - t0);
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const p95 = (arr: number[]) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)]!;
    };
    const rendered = frameTimes.filter(t => t > 0.01);

    console.log(`\n=== SCRUB SIMULATION (${N} seeks, ${rendered.length} rendered) ===`);
    console.log(`Mode: ${isNativeCanvasApiAvailable() ? "native" : "foreignObject"}`);
    console.log(`Resolution: 0.5x (${W * 0.5}x${H * 0.5})`);
    if (rendered.length > 0) {
      console.log(`Per frame: avg=${avg(rendered).toFixed(2)}ms p95=${p95(rendered).toFixed(2)}ms → ${(1000/avg(rendered)).toFixed(0)}fps`);
    }
    console.log(`Skipped (dedup): ${N - rendered.length}`);

    preview.dispose();
    tg.remove();
    expect(true).toBe(true);
  }, 60000);

  it("profile: updateAnimations cost with many text segments", async () => {
    const tg = createComplexComposition();
    document.body.appendChild(tg);
    await tg.updateComplete;
    await new Promise(r => setTimeout(r, 200));

    const N = 60;
    const times: number[] = [];

    for (let i = 0; i < N; i++) {
      tg.currentTimeMs = i * 100;
      await tg.updateComplete;
      const t0 = performance.now();
      updateAnimations(tg);
      times.push(performance.now() - t0);
    }

    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const p95 = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)]!;
    };

    const segments = tg.querySelectorAll("ef-text-segment");
    const animations = tg.getAnimations({ subtree: true });

    console.log(`\n=== UPDATE ANIMATIONS PROFILING (${N} frames) ===`);
    console.log(`Per call: avg=${avg(times).toFixed(2)}ms p95=${p95(times).toFixed(2)}ms`);
    console.log(`Text segments: ${segments.length}, Active animations: ${animations.length}`);

    tg.remove();
    expect(times.length).toBe(N);
  }, 30000);

  it("profile: queryVisibleElements cost", async () => {
    const tg = createComplexComposition();
    document.body.appendChild(tg);
    await tg.updateComplete;
    await new Promise(r => setTimeout(r, 200));

    const fc = new FrameController(tg);
    const N = 100;
    const times: number[] = [];

    for (let i = 0; i < N; i++) {
      fc.abort(); // Reset dedup
      const timeMs = i * 100;
      const t0 = performance.now();
      await fc.renderFrame(timeMs, { waitForLitUpdate: false });
      times.push(performance.now() - t0);
    }

    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const p95 = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)]!;
    };

    console.log(`\n=== FRAMECONTROLLER QUERY + RENDER (${N} frames) ===`);
    console.log(`Per call: avg=${avg(times).toFixed(2)}ms p95=${p95(times).toFixed(2)}ms → ${(1000/avg(times)).toFixed(0)}fps`);

    const allEls = tg.querySelectorAll("*");
    console.log(`Total DOM elements: ${allEls.length}`);

    fc.abort();
    tg.remove();
    expect(times.length).toBe(N);
  }, 30000);
});
