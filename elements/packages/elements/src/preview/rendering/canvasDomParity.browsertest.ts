/**
 * Canvas/DOM parity tests: foreignObject serializer vs native Blink renderer.
 *
 * Compares:
 *   foreignObject path — captureTimelineToDataUri (SVG serialization of computed styles)
 *   native path        — renderToImageNative (drawElementImage, Blink ground truth)
 *
 * Tests are written to FAIL before the fix and PASS after.
 *
 * Run: ./scripts/browsertest packages/elements/src/preview/rendering/canvasDomParity.browsertest.ts
 */

import { describe, it, beforeAll } from "vitest";
import { captureTimelineToDataUri } from "./serializeTimelineDirect.js";
import { loadImageFromDataUri } from "./loadImage.js";
import { renderToImageNative } from "./renderToImageNative.js";
import { isNativeCanvasApiAvailable } from "../previewSettings.js";
import { expectCanvasesToMatch } from "../../../test/visualRegressionUtils.js";
import { EFTimegroup } from "../../elements/EFTimegroup.js";
import "../../elements/EFText.js";

const TEST_NAME = "canvasDomParity";

/** Capture both render paths and return their canvases. */
async function captureBothPaths(
  tg: EFTimegroup,
  w: number,
  h: number,
): Promise<{
  foreignCanvas: HTMLCanvasElement;
  nativeCanvas: HTMLCanvasElement;
}> {
  const dataUri = await captureTimelineToDataUri(tg, w, h, {
    canvasScale: 1,
    timeMs: 0,
  });
  const img = await loadImageFromDataUri(dataUri);
  const fc = document.createElement("canvas");
  fc.width = w;
  fc.height = h;
  fc.getContext("2d")!.drawImage(img, 0, 0);

  const nc = await renderToImageNative(tg, w, h, { skipDprScaling: true });
  return { foreignCanvas: fc, nativeCanvas: nc };
}

describe("canvas/DOM parity: foreignObject vs native", () => {
  beforeAll(async () => {
    await customElements.whenDefined("ef-timegroup");
  });

  // ── MR1: text-shadow via inline style ──────────────────────────────────
  // text-shadow is absent from SERIALIZED_STYLE_PROPERTIES, so the glow is
  // lost when animation:none freezes the element in the foreignObject output.
  // Inline style is skipped by serializeAttributes; computed style is used instead.
  it("MR1: text-shadow from inline style", async () => {
    if (!isNativeCanvasApiAvailable()) return;

    const W = 400;
    const H = 200;
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = `width:${W}px;height:${H}px;background:#000;position:relative;overflow:hidden;`;
    const el = document.createElement("div");
    el.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "font-size:60px;font-weight:900;color:white;font-family:monospace;" +
      "text-shadow:0 0 40px #ff0080,0 0 80px #ff0080;";
    el.textContent = "GLOW";
    tg.appendChild(el);
    document.body.appendChild(tg);
    await tg.updateComplete;

    const { foreignCanvas, nativeCanvas } = await captureBothPaths(tg, W, H);
    await expectCanvasesToMatch(
      foreignCanvas,
      nativeCanvas,
      TEST_NAME,
      "mr1-text-shadow-inline",
      {
        acceptableDiffPercentage: 0.5,
      },
    );
    tg.remove();
  }, 30000);

  // ── MR2: text-shadow via @keyframes ────────────────────────────────────
  // @keyframes sets both color and text-shadow. Animation is paused so the
  // computed style is deterministic (at the from/0% keyframe).
  it("MR2: text-shadow from @keyframes", async () => {
    if (!isNativeCanvasApiAvailable()) return;

    const W = 400;
    const H = 200;
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = `width:${W}px;height:${H}px;background:#000;position:relative;overflow:hidden;`;
    const style = document.createElement("style");
    style.textContent = `
      @keyframes constant-glow {
        from, to { color: #ff0080; text-shadow: 0 0 40px #ff0080, 0 0 80px #ff0080; }
      }
    `;
    tg.appendChild(style);
    const el = document.createElement("div");
    el.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "font-size:60px;font-weight:900;font-family:monospace;" +
      "animation:constant-glow 1s linear infinite;animation-play-state:paused;";
    el.textContent = "GLOW";
    tg.appendChild(el);
    document.body.appendChild(tg);
    await tg.updateComplete;

    const { foreignCanvas, nativeCanvas } = await captureBothPaths(tg, W, H);
    await expectCanvasesToMatch(
      foreignCanvas,
      nativeCanvas,
      TEST_NAME,
      "mr2-text-shadow-keyframes",
      {
        acceptableDiffPercentage: 0.5,
      },
    );
    tg.remove();
  }, 30000);

  // ── MR3: clip-path via inline style ────────────────────────────────────
  // clipPath is unconditionally skipped in the serializer to avoid serializing
  // the proxy-mode sentinel inset(100%). All clip-path values are lost.
  it("MR3: clip-path from inline style", async () => {
    if (!isNativeCanvasApiAvailable()) return;

    const W = 400;
    const H = 200;
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = `width:${W}px;height:${H}px;background:#111;position:relative;overflow:hidden;`;
    const el = document.createElement("div");
    // White panel clipped to the center horizontal band — top 20% and bottom 40% removed.
    // Without clip-path the entire element is white; with clip-path only the center band shows.
    el.style.cssText =
      "position:absolute;inset:0;background:white;" +
      "clip-path:inset(20% 0 40% 0);";
    tg.appendChild(el);
    document.body.appendChild(tg);
    await tg.updateComplete;

    const { foreignCanvas, nativeCanvas } = await captureBothPaths(tg, W, H);
    await expectCanvasesToMatch(
      foreignCanvas,
      nativeCanvas,
      TEST_NAME,
      "mr3-clip-path-inline",
      {
        acceptableDiffPercentage: 0.5,
      },
    );
    tg.remove();
  }, 30000);

  // ── MR4: clip-path via @keyframes ──────────────────────────────────────
  it("MR4: clip-path from @keyframes", async () => {
    if (!isNativeCanvasApiAvailable()) return;

    const W = 400;
    const H = 200;
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = `width:${W}px;height:${H}px;background:#111;position:relative;overflow:hidden;`;
    const style = document.createElement("style");
    style.textContent = `
      @keyframes constant-clip {
        from, to { clip-path: inset(20% 0 40% 0); }
      }
    `;
    tg.appendChild(style);
    const el = document.createElement("div");
    el.style.cssText =
      "position:absolute;inset:0;background:white;" +
      "animation:constant-clip 1s steps(1) infinite;animation-play-state:paused;";
    tg.appendChild(el);
    document.body.appendChild(tg);
    await tg.updateComplete;

    const { foreignCanvas, nativeCanvas } = await captureBothPaths(tg, W, H);
    await expectCanvasesToMatch(
      foreignCanvas,
      nativeCanvas,
      TEST_NAME,
      "mr4-clip-path-keyframes",
      {
        acceptableDiffPercentage: 0.5,
      },
    );
    tg.remove();
  }, 30000);

  // ── MR5: core of the rave composition ──────────────────────────────────
  // Exercises all known parity gaps together: rainbow-shift (text-shadow via
  // @keyframes), glitch-h (clip-path via @keyframes), neon-flicker (text-shadow
  // via @keyframes). Animations paused for deterministic capture at from/0%.
  it("MR5: rave composition (text-shadow + clip-path combined)", async () => {
    if (!isNativeCanvasApiAvailable()) return;

    const CW = 1920;
    const CH = 1080;
    const container = document.createElement("div");
    container.style.cssText =
      "position:fixed;top:0;left:0;pointer-events:none;z-index:-1;";
    container.innerHTML = `
      <ef-timegroup mode="fixed" duration="10s"
        style="width:${CW}px;height:${CH}px;position:relative;overflow:hidden;background:#000;">
        <style>
          @keyframes rainbow-shift-paused {
            from, to { color: #ff0080; text-shadow: 0 0 40px #ff0080, 0 0 80px #ff0080, 0 0 120px #ff0080; }
          }
          @keyframes glitch-h-paused {
            from, to { clip-path: inset(20% 0 60% 0); }
          }
          @keyframes neon-flicker-paused {
            from, to {
              text-shadow: 0 0 10px #fff, 0 0 30px #fff, 0 0 60px #ff00de, 0 0 100px #ff00de;
              opacity: 1;
            }
          }
        </style>
        <div style="position:absolute;top:50%;left:50%;
          font-size:160px;font-weight:900;color:#ff003380;letter-spacing:4px;
          white-space:nowrap;font-family:Impact,sans-serif;text-transform:uppercase;
          animation:rainbow-shift-paused 1.5s linear infinite;animation-play-state:paused;">
          HELLO WORLD
        </div>
        <div style="position:absolute;top:50%;left:50%;
          font-size:160px;font-weight:900;color:#00ffff;letter-spacing:4px;
          white-space:nowrap;font-family:Impact,sans-serif;text-transform:uppercase;
          animation:glitch-h-paused 0.4s steps(1) infinite;animation-play-state:paused;">
          HELLO WORLD
        </div>
        <div style="position:absolute;top:50%;left:50%;
          font-size:160px;font-weight:900;letter-spacing:4px;
          white-space:nowrap;font-family:Impact,sans-serif;text-transform:uppercase;
          animation:rainbow-shift-paused 1.5s linear infinite;animation-play-state:paused;
          filter:drop-shadow(0 0 30px currentColor);">
          HELLO WORLD
        </div>
        <div style="position:absolute;bottom:60px;left:50%;transform:translateX(-50%);
          font-size:28px;font-weight:700;color:white;letter-spacing:18px;
          text-transform:uppercase;white-space:nowrap;font-family:monospace;
          animation:neon-flicker-paused 2s linear infinite;animation-play-state:paused;">
          WELCOME TO THE SIMULATION
        </div>
      </ef-timegroup>`;
    document.body.appendChild(container);
    const tg = container.querySelector("ef-timegroup") as EFTimegroup;
    await tg.updateComplete;

    const { foreignCanvas, nativeCanvas } = await captureBothPaths(tg, CW, CH);
    await expectCanvasesToMatch(
      foreignCanvas,
      nativeCanvas,
      TEST_NAME,
      "mr5-rave-composition",
      {
        acceptableDiffPercentage: 2.0,
      },
    );
    container.remove();
  }, 60000);
});
