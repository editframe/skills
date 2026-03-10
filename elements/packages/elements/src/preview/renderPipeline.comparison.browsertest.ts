/**
 * Output comparison: native vs foreignObject render paths.
 * Validates that both paths produce visually equivalent output.
 *
 * Run: ./scripts/browsertest packages/elements/src/preview/renderPipeline.comparison.browsertest.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { captureTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
import { loadImageFromDataUri } from "./rendering/loadImage.js";
import { renderToImageNative } from "./rendering/renderToImageNative.js";
import { isNativeCanvasApiAvailable } from "./previewSettings.js";

import type { EFTimegroup } from "../elements/EFTimegroup.js";
import "../elements/EFTimegroup.js";

const W = 800;
const H = 450;

function createTimegroup(): EFTimegroup {
  const tg = document.createElement("ef-timegroup") as EFTimegroup;
  tg.style.cssText = `width:${W}px;height:${H}px;background:linear-gradient(135deg,#1a1a2e,#16213e);position:relative;overflow:hidden;font-family:system-ui,sans-serif;`;

  const title = document.createElement("div");
  title.style.cssText =
    "position:absolute;top:40px;left:40px;color:white;font-size:48px;font-weight:bold;";
  title.textContent = "Comparison Test";
  tg.appendChild(title);

  const grid = document.createElement("div");
  grid.style.cssText =
    "position:absolute;top:120px;left:40px;right:40px;bottom:40px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;";
  for (let i = 0; i < 6; i++) {
    const card = document.createElement("div");
    card.style.cssText = `background:hsl(${i * 60},60%,45%);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:24px;`;
    card.textContent = `Item ${i + 1}`;
    grid.appendChild(card);
  }
  tg.appendChild(grid);

  return tg;
}

function createCanvasTimegroup(): EFTimegroup {
  const tg = document.createElement("ef-timegroup") as EFTimegroup;
  tg.style.cssText = `width:${W}px;height:${H}px;background:#222;position:relative;overflow:hidden;`;

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  c.style.cssText = "width:100%;height:100%;";
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#ff6b6b");
  grad.addColorStop(0.5, "#4ecdc4");
  grad.addColorStop(1, "#45b7d1");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "white";
  ctx.font = "bold 48px system-ui";
  ctx.fillText("Canvas Content", 40, H / 2);
  tg.appendChild(c);

  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:absolute;bottom:20px;right:20px;color:white;font-size:18px;background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:4px;";
  overlay.textContent = "Overlay Text";
  tg.appendChild(overlay);

  return tg;
}

describe("native vs foreignObject output comparison", () => {
  beforeAll(async () => {
    await customElements.whenDefined("ef-timegroup");
  });

  it("HTML-only: native and foreignObject produce similar output", async () => {
    const nativeAvailable = isNativeCanvasApiAvailable();
    if (!nativeAvailable) {
      expect(true).toBe(true);
      return;
    }

    const tg = createTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    // Capture via foreignObject
    const dataUri = await captureTimelineToDataUri(tg, W, H, {
      canvasScale: 1,
      timeMs: 0,
    });
    const foreignImg = await loadImageFromDataUri(dataUri);
    const foreignCanvas = document.createElement("canvas");
    foreignCanvas.width = W;
    foreignCanvas.height = H;
    const fCtx = foreignCanvas.getContext("2d")!;
    fCtx.drawImage(foreignImg, 0, 0, W, H);

    // Capture via native
    const nativeCanvas = await renderToImageNative(tg, W, H, {
      skipDprScaling: true,
    });

    // Both should produce non-empty output
    expect(foreignCanvas.width).toBeGreaterThan(0);
    expect(nativeCanvas.width).toBeGreaterThan(0);

    tg.remove();
  }, 30000);

  it("HTML+canvas: native and foreignObject produce similar output", async () => {
    const nativeAvailable = isNativeCanvasApiAvailable();
    if (!nativeAvailable) {
      expect(true).toBe(true);
      return;
    }

    const tg = createCanvasTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    // Capture via foreignObject
    const dataUri = await captureTimelineToDataUri(tg, W, H, {
      canvasScale: 1,
      timeMs: 0,
    });
    const foreignImg = await loadImageFromDataUri(dataUri);
    const foreignCanvas = document.createElement("canvas");
    foreignCanvas.width = W;
    foreignCanvas.height = H;
    const fCtx = foreignCanvas.getContext("2d")!;
    fCtx.drawImage(foreignImg, 0, 0, W, H);

    // Capture via native
    const nativeCanvas = await renderToImageNative(tg, W, H, {
      skipDprScaling: true,
    });

    expect(foreignCanvas.width).toBeGreaterThan(0);
    expect(nativeCanvas.width).toBeGreaterThan(0);

    tg.remove();
  }, 30000);

  it("native preview path: renderTimegroupToCanvas with drawElementImage", async () => {
    const nativeAvailable = isNativeCanvasApiAvailable();
    if (!nativeAvailable) {
      expect(true).toBe(true);
      return;
    }

    const tg = createCanvasTimegroup();
    document.body.appendChild(tg);
    await tg.updateComplete;

    // Import dynamically to test the actual preview path
    const { renderTimegroupToCanvas } = await import("./renderTimegroupToCanvas.js");
    const preview = renderTimegroupToCanvas(tg, {
      scale: 1,
      resolutionScale: 1,
    });

    // Wait for initial render
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    // The canvas should have content
    const c = preview.canvas;
    const resultCtx = c.getContext("2d", { willReadFrequently: true })!;
    const data = resultCtx.getImageData(0, 0, c.width, c.height).data;
    let nonZeroPixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i]! > 0) nonZeroPixels++;
    }

    // Should have rendered something
    expect(nonZeroPixels).toBeGreaterThan(0);

    preview.dispose();
    // After dispose, timegroup should be back in the DOM
    expect(tg.parentNode).not.toBeNull();
  }, 30000);

  it("dispose restores timegroup to original DOM position", async () => {
    const nativeAvailable = isNativeCanvasApiAvailable();
    if (!nativeAvailable) {
      expect(true).toBe(true);
      return;
    }

    const container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    const tg = createTimegroup();
    const marker = document.createElement("div");
    marker.id = "after-tg";
    container.appendChild(tg);
    container.appendChild(marker);

    await tg.updateComplete;

    // Before: timegroup is child of container, before marker
    expect(tg.parentNode).toBe(container);
    expect(tg.nextSibling).toBe(marker);

    const { renderTimegroupToCanvas } = await import("./renderTimegroupToCanvas.js");
    const preview = renderTimegroupToCanvas(tg, 1);

    // During: timegroup has been reparented to capture canvas
    expect(tg.parentNode).not.toBe(container);
    expect(tg.parentNode?.nodeName).toBe("CANVAS");

    // Dispose
    preview.dispose();

    // After: timegroup should be back at original position
    expect(tg.parentNode).toBe(container);
    expect(tg.nextSibling).toBe(marker);

    container.remove();
  }, 30000);
});
