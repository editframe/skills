/**
 * Temporal culling scaling benchmark.
 *
 * Measures how per-frame costs scale as total timeline complexity increases,
 * while keeping the visible-at-any-moment content constant.
 *
 * Creates timelines with N sequential scenes (each 5s) but always measures
 * at a time where only ONE scene is visible. If temporal culling works
 * well, per-frame cost should be roughly constant regardless of N.
 *
 * Run: ./scripts/browsertest packages/elements/src/preview/temporalCulling.scaling.browsertest.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { captureTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
import { FrameController } from "./FrameController.js";
import { updateAnimations } from "../elements/updateAnimations.js";
import { deepGetTemporalElements } from "../elements/EFTemporal.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import "../elements/EFTimegroup.js";
import "../elements/EFText.js";
import "../elements/EFTextSegment.js";
import "../elements/EFImage.js";

const W = 800;
const H = 450;
const WARMUP = 3;
const ITERATIONS = 30;
const SCENE_DURATION_S = 5;
const SCENE_DURATION_MS = SCENE_DURATION_S * 1000;

// Scene counts to test scaling: from trivial to complex
const SCENE_COUNTS = [1, 5, 20, 50, 100];

// ============================================================================
// Helpers
// ============================================================================

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    avg: values.reduce((s, v) => s + v, 0) / values.length,
    p50: sorted[Math.floor(sorted.length * 0.5)]!,
    p95: sorted[Math.floor(sorted.length * 0.95)]!,
  };
}

function fmt(label: string, values: number[]): string {
  const s = stats(values);
  return `${label}: avg=${s.avg.toFixed(2)}ms p50=${s.p50.toFixed(2)}ms p95=${s.p95.toFixed(2)}ms min=${s.min.toFixed(2)}ms max=${s.max.toFixed(2)}ms`;
}

function injectAnimations() {
  if (document.getElementById("scaling-test-anims")) return;
  const style = document.createElement("style");
  style.id = "scaling-test-anims";
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes pulseRing { 0% { transform: translate(-50%,-50%) scale(0.95); opacity: 0.5; } 50% { transform: translate(-50%,-50%) scale(1.05); opacity: 0.3; } 100% { transform: translate(-50%,-50%) scale(0.95); opacity: 0.5; } }
  `;
  document.head.appendChild(style);
}

/**
 * Create a timeline with N sequential scenes. Each scene has identical content:
 * background, text overlays with segments, image, labels, decorative nested timegroup.
 * This keeps per-scene complexity constant while varying total scene count.
 */
function createScalingTimeline(sceneCount: number): EFTimegroup {
  const root = document.createElement("ef-timegroup") as EFTimegroup;
  root.setAttribute("mode", "contain");
  root.style.cssText = `width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#0f172a;font-family:system-ui,sans-serif;`;

  const seq = document.createElement("ef-timegroup") as EFTimegroup;
  seq.setAttribute("mode", "sequence");
  seq.style.cssText = "position:absolute;inset:0;";

  for (let scene = 0; scene < sceneCount; scene++) {
    const sc = document.createElement("ef-timegroup") as EFTimegroup;
    sc.setAttribute("mode", "fixed");
    sc.setAttribute("duration", `${SCENE_DURATION_S}s`);
    sc.style.cssText = `position:absolute;width:100%;height:100%;background:linear-gradient(${scene * 45}deg,hsl(${scene * 45},50%,20%),hsl(${scene * 45 + 60},50%,30%));`;

    // Background canvas
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = W;
    bgCanvas.height = H;
    bgCanvas.style.cssText = "width:100%;height:100%;position:absolute;top:0;left:0;";
    const ctx = bgCanvas.getContext("2d")!;
    ctx.fillStyle = `hsl(${scene * 45},60%,40%)`;
    ctx.fillRect(0, 0, W, H);
    sc.appendChild(bgCanvas);

    // Title text with word split
    const titleText = document.createElement("ef-text");
    titleText.setAttribute("split", "word");
    titleText.setAttribute("stagger", "100ms");
    titleText.setAttribute("duration", "3s");
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
    subText.appendChild(document.createTextNode(`Subtitle for scene ${scene + 1}`));
    sc.appendChild(subText);

    // Image overlay
    const img = document.createElement("ef-image");
    img.setAttribute("src", `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='hsl(${scene * 45},60%25,50%25)' width='80' height='80' rx='8'/%3E%3C/svg%3E`);
    img.setAttribute("duration", "5s");
    img.style.cssText = "position:absolute;top:12px;right:12px;width:48px;height:48px;";
    sc.appendChild(img);

    // Labels
    for (let j = 0; j < 4; j++) {
      const label = document.createElement("ef-text");
      label.setAttribute("duration", "5s");
      label.style.cssText = `position:absolute;${j < 2 ? "top" : "bottom"}:${j < 2 ? "120" : "40"}px;${j % 2 === 0 ? "left" : "right"}:20px;background:rgba(0,0,0,0.5);color:white;padding:4px 12px;border-radius:4px;font-size:12px;`;
      label.textContent = `Label ${j + 1}`;
      sc.appendChild(label);
    }

    // Nested decorative timegroup
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
  return root;
}

// ============================================================================
// Benchmarks
// ============================================================================

describe("temporal culling scaling", () => {
  beforeAll(async () => {
    injectAnimations();
    await customElements.whenDefined("ef-timegroup");
    await customElements.whenDefined("ef-text");
    await customElements.whenDefined("ef-image");
  });

  /**
   * Measures deepGetTemporalElements: collects ALL temporal elements in tree.
   * If this scales with N, it's collecting invisible elements.
   */
  it("scaling: deepGetTemporalElements", async () => {
    console.log("\n=== SCALING: deepGetTemporalElements ===");
    console.log("Collects all temporal elements from root. Should ideally be O(visible), is likely O(total).\n");

    for (const sceneCount of SCENE_COUNTS) {
      const tg = createScalingTimeline(sceneCount);
      document.body.appendChild(tg);
      await tg.updateComplete;
      await new Promise((r) => setTimeout(r, 200));

      // Seek to middle of first scene — only 1 scene visible
      tg.currentTimeMs = SCENE_DURATION_MS / 2;
      await tg.updateComplete;
      updateAnimations(tg);

      const timeMs = SCENE_DURATION_MS / 2;
      const times: number[] = [];
      for (let i = 0; i < WARMUP; i++) {
        deepGetTemporalElements(tg, timeMs);
      }
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        const result = deepGetTemporalElements(tg, timeMs);
        times.push(performance.now() - t0);
        if (i === 0) {
          console.log(`  scenes=${sceneCount}: collected ${result.elements.length} temporal elements (${result.pruned.size} pruned)`);
        }
      }
      console.log(`  ${fmt(`scenes=${String(sceneCount).padStart(3)}`, times)}`);

      tg.remove();
    }

    expect(true).toBe(true);
  }, 120000);

  /**
   * Measures getAnimations({ subtree: true }) on root.
   * This is a browser DOM API call that returns all animations in the tree.
   */
  it("scaling: getAnimations({ subtree: true })", async () => {
    console.log("\n=== SCALING: getAnimations({ subtree: true }) ===");
    console.log("Browser API to collect all CSS animations. Walks entire subtree.\n");

    for (const sceneCount of SCENE_COUNTS) {
      const tg = createScalingTimeline(sceneCount);
      document.body.appendChild(tg);
      await tg.updateComplete;
      await new Promise((r) => setTimeout(r, 200));

      tg.currentTimeMs = SCENE_DURATION_MS / 2;
      await tg.updateComplete;
      updateAnimations(tg);

      const times: number[] = [];
      for (let i = 0; i < WARMUP; i++) {
        tg.getAnimations({ subtree: true });
      }
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        const result = tg.getAnimations({ subtree: true });
        times.push(performance.now() - t0);
        if (i === 0) {
          console.log(`  scenes=${sceneCount}: found ${result.length} animations`);
        }
      }
      console.log(`  ${fmt(`scenes=${String(sceneCount).padStart(3)}`, times)}`);

      tg.remove();
    }

    expect(true).toBe(true);
  }, 120000);

  /**
   * Measures updateAnimations() as a whole.
   * This calls deepGetTemporalElements + getAnimations + phase evaluation +
   * animation partitioning + visual state application.
   */
  it("scaling: updateAnimations()", async () => {
    console.log("\n=== SCALING: updateAnimations() ===");
    console.log("Full animation update pass. Includes element collection, phase eval, animation coordination.\n");

    for (const sceneCount of SCENE_COUNTS) {
      const tg = createScalingTimeline(sceneCount);
      document.body.appendChild(tg);
      await tg.updateComplete;
      await new Promise((r) => setTimeout(r, 200));

      // Seek to middle of first scene
      tg.currentTimeMs = SCENE_DURATION_MS / 2;
      await tg.updateComplete;

      const times: number[] = [];
      for (let i = 0; i < WARMUP; i++) {
        updateAnimations(tg);
      }
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        updateAnimations(tg);
        times.push(performance.now() - t0);
      }
      console.log(`  ${fmt(`scenes=${String(sceneCount).padStart(3)}`, times)}`);

      tg.remove();
    }

    expect(true).toBe(true);
  }, 120000);

  /**
   * Measures FrameController.renderFrame() — queryVisibleElements + prepare + render + animations.
   */
  it("scaling: FrameController.renderFrame()", async () => {
    console.log("\n=== SCALING: FrameController.renderFrame() ===");
    console.log("Full frame render: query visible elements + prepare + render + updateAnimations.\n");

    for (const sceneCount of SCENE_COUNTS) {
      const tg = createScalingTimeline(sceneCount);
      document.body.appendChild(tg);
      await tg.updateComplete;
      await new Promise((r) => setTimeout(r, 200));

      const fc = new FrameController(tg);
      const timeMs = SCENE_DURATION_MS / 2;
      tg.currentTimeMs = timeMs;
      await tg.updateComplete;

      const times: number[] = [];
      for (let i = 0; i < WARMUP; i++) {
        fc.abort();
        await fc.renderFrame(timeMs + i * 0.01, {
          waitForLitUpdate: false,
          onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
        });
      }
      for (let i = 0; i < ITERATIONS; i++) {
        fc.abort();
        const t0 = performance.now();
        await fc.renderFrame(timeMs + WARMUP + i * 0.01, {
          waitForLitUpdate: false,
          onAnimationsUpdate: (root) => updateAnimations(root as typeof tg),
        });
        times.push(performance.now() - t0);
      }
      console.log(`  ${fmt(`scenes=${String(sceneCount).padStart(3)}`, times)}`);

      fc.abort();
      tg.remove();
    }

    expect(true).toBe(true);
  }, 120000);

  /**
   * Measures captureTimelineToDataUri() — DOM serialization with temporal culling.
   * This walk DOES prune invisible subtrees, so it should scale better.
   */
  it("scaling: captureTimelineToDataUri()", async () => {
    console.log("\n=== SCALING: captureTimelineToDataUri() ===");
    console.log("DOM serialization. Has subtree pruning — should scale better than others.\n");

    for (const sceneCount of SCENE_COUNTS) {
      const tg = createScalingTimeline(sceneCount);
      document.body.appendChild(tg);
      await tg.updateComplete;
      await new Promise((r) => setTimeout(r, 200));

      const timeMs = SCENE_DURATION_MS / 2;
      tg.currentTimeMs = timeMs;
      await tg.updateComplete;
      updateAnimations(tg);

      const times: number[] = [];
      for (let i = 0; i < WARMUP; i++) {
        await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs });
      }
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs });
        times.push(performance.now() - t0);
      }
      console.log(`  ${fmt(`scenes=${String(sceneCount).padStart(3)}`, times)}`);

      tg.remove();
    }

    expect(true).toBe(true);
  }, 120000);

  /**
   * Measures the full seekForRender() pipeline — the actual hot path during video export.
   * This is the end-to-end cost per frame including all the walks.
   */
  it("scaling: seekForRender() (full video export frame)", async () => {
    console.log("\n=== SCALING: seekForRender() ===");
    console.log("Full video export frame pipeline: time set + Lit updates + FrameController + updateAnimations.\n");

    for (const sceneCount of SCENE_COUNTS) {
      const tg = createScalingTimeline(sceneCount);
      document.body.appendChild(tg);
      await tg.updateComplete;
      await new Promise((r) => setTimeout(r, 200));

      const timeMs = SCENE_DURATION_MS / 2;

      const times: number[] = [];
      for (let i = 0; i < WARMUP; i++) {
        await tg.seekForRender(timeMs + i * 0.01);
      }
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        await tg.seekForRender(timeMs + WARMUP + i * 0.01);
        times.push(performance.now() - t0);
      }
      console.log(`  ${fmt(`scenes=${String(sceneCount).padStart(3)}`, times)}`);

      tg.remove();
    }

    expect(true).toBe(true);
  }, 120000);

  /**
   * Combined summary: runs the full per-frame pipeline (seekForRender + serialize)
   * and reports total cost to produce one frame of video output at each scale.
   */
  it("scaling: full frame (seekForRender + captureTimelineToDataUri)", async () => {
    console.log("\n=== SCALING: FULL VIDEO FRAME (seek + serialize) ===");
    console.log("Complete cost to produce one frame during video export.\n");

    const results: Array<{ scenes: number; avg: number; p95: number }> = [];

    for (const sceneCount of SCENE_COUNTS) {
      const tg = createScalingTimeline(sceneCount);
      document.body.appendChild(tg);
      await tg.updateComplete;
      await new Promise((r) => setTimeout(r, 200));

      const timeMs = SCENE_DURATION_MS / 2;

      const times: number[] = [];
      for (let i = 0; i < WARMUP; i++) {
        await tg.seekForRender(timeMs + i * 0.01);
        await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs });
      }
      for (let i = 0; i < ITERATIONS; i++) {
        const frameTime = timeMs + WARMUP + i * 0.01;
        const t0 = performance.now();
        await tg.seekForRender(frameTime);
        await captureTimelineToDataUri(tg, W, H, { canvasScale: 1, timeMs: frameTime });
        times.push(performance.now() - t0);
      }

      const s = stats(times);
      results.push({ scenes: sceneCount, avg: s.avg, p95: s.p95 });
      console.log(`  ${fmt(`scenes=${String(sceneCount).padStart(3)}`, times)}`);

      tg.remove();
    }

    // Print scaling summary
    console.log("\n  --- Scaling Summary ---");
    const baseline = results[0]!;
    for (const r of results) {
      const ratio = r.avg / baseline.avg;
      console.log(
        `  scenes=${String(r.scenes).padStart(3)}: avg=${r.avg.toFixed(2)}ms  ` +
        `${ratio.toFixed(1)}x vs baseline (${r.scenes}x more scenes)`
      );
    }

    expect(true).toBe(true);
  }, 180000);
});
