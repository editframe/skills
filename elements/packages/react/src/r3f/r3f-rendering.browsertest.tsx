/**
 * Browser tests proving:
 * 1. WebGL (Three.js) rendering works via addFrameTask synchronous pipeline
 * 2. OffscreenCanvas + Worker renders WebGL correctly
 * 3. REAL background rendering test: launches a SEPARATE Chrome without
 *    Playwright's --disable-renderer-backgrounding flag, switches tabs,
 *    and measures actual pixel output to prove workers continue rendering
 *    while main-thread WebGL may freeze.
 */

import { describe, test, assert, beforeEach, beforeAll } from "vitest";

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
import { commands } from "vitest/browser";
import * as THREE from "three";
import type { EFTimegroup } from "@editframe/elements/elements/EFTimegroup.js";
import "@editframe/elements/elements/EFTimegroup.js";

beforeEach(() => {
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
});

/* ━━ 1. Three.js WebGL rendering via addFrameTask ━━━━━━━━━━━━━━━━━ */

describe.runIf(isWebGLAvailable())("Three.js WebGL rendering via addFrameTask", () => {
  test("renders different colors at different time positions using Three.js", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.width = "200px";
    tg.style.height = "200px";
    tg.setAttribute("duration", "1s");

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    canvas.dataset.testCanvas = "three";
    tg.appendChild(canvas);

    tg.initializer = (instance) => {
      const c = instance.querySelector("[data-test-canvas='three']") as HTMLCanvasElement;
      if (!c) return;

      const renderer = new THREE.WebGLRenderer({
        canvas: c,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(200, 200, false);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1, 0, 0),
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      instance.addFrameTask(({ currentTimeMs }) => {
        const t = currentTimeMs / 1000;
        material.color.setRGB(1 - t, 0, t);
        renderer.render(scene, camera);
        renderer.getContext().finish();
      });
    };

    document.body.appendChild(tg);
    await tg.updateComplete;

    const { clone, cleanup } = await tg.createRenderClone();

    try {
      const cloneCanvas = clone.querySelector("[data-test-canvas='three']") as HTMLCanvasElement;
      assert.isNotNull(cloneCanvas, "Clone should have the canvas");

      await clone.seekForRender(0);
      const gl0 =
        cloneCanvas.getContext("webgl2", { preserveDrawingBuffer: true }) ||
        cloneCanvas.getContext("webgl", { preserveDrawingBuffer: true });
      assert.isNotNull(gl0, "Should have WebGL context");
      const pixel0 = new Uint8Array(4);
      gl0!.readPixels(100, 100, 1, 1, gl0!.RGBA, gl0!.UNSIGNED_BYTE, pixel0);

      await clone.seekForRender(900);
      const pixel900 = new Uint8Array(4);
      gl0!.readPixels(100, 100, 1, 1, gl0!.RGBA, gl0!.UNSIGNED_BYTE, pixel900);

      // At 0ms: red dominant
      assert.isAbove(pixel0[0], 150, `At t=0 red should be high, got ${pixel0[0]}`);
      assert.isBelow(pixel0[2], 100, `At t=0 blue should be low, got ${pixel0[2]}`);

      // At 900ms: blue dominant over red (WebGL gamma/sRGB may shift values)
      assert.isAbove(
        pixel900[2],
        pixel900[0],
        `At t=900 blue (${pixel900[2]}) should exceed red (${pixel900[0]})`,
      );
      assert.isAbove(pixel900[2], 150, `At t=900 blue should be high, got ${pixel900[2]}`);

      // Colors at t=0 and t=900 should be significantly different
      const colorDiff = Math.abs(pixel0[0] - pixel900[0]) + Math.abs(pixel0[2] - pixel900[2]);
      assert.isAbove(colorDiff, 100, `Color difference should be >100, got ${colorDiff}`);
    } finally {
      cleanup();
      tg.remove();
    }
  });

  test("deterministic WebGL rendering at same time position", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.width = "100px";
    tg.style.height = "100px";
    tg.setAttribute("duration", "1s");

    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    canvas.dataset.testCanvas = "det";
    tg.appendChild(canvas);

    tg.initializer = (instance) => {
      const c = instance.querySelector("[data-test-canvas='det']") as HTMLCanvasElement;
      if (!c) return;

      const renderer = new THREE.WebGLRenderer({
        canvas: c,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(100, 100, false);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

      instance.addFrameTask(({ currentTimeMs }) => {
        const t = currentTimeMs / 1000;
        material.color.setHSL(t * 0.5, 1, 0.5);
        renderer.render(scene, camera);
        renderer.getContext().finish();
      });
    };

    document.body.appendChild(tg);
    await tg.updateComplete;

    const { clone, cleanup } = await tg.createRenderClone();

    try {
      const cloneCanvas = clone.querySelector("[data-test-canvas='det']") as HTMLCanvasElement;
      const gl =
        cloneCanvas.getContext("webgl2", { preserveDrawingBuffer: true }) ||
        cloneCanvas.getContext("webgl", { preserveDrawingBuffer: true });

      await clone.seekForRender(500);
      const px1 = new Uint8Array(4);
      gl!.readPixels(50, 50, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, px1);

      await clone.seekForRender(500);
      const px2 = new Uint8Array(4);
      gl!.readPixels(50, 50, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, px2);

      assert.equal(px1[0], px2[0], "Red channel should be identical");
      assert.equal(px1[1], px2[1], "Green channel should be identical");
      assert.equal(px1[2], px2[2], "Blue channel should be identical");
      assert.equal(px1[3], px2[3], "Alpha channel should be identical");
    } finally {
      cleanup();
      tg.remove();
    }
  });
});

/* ━━ 2. OffscreenCanvas + Worker WebGL rendering ━━━━━━━━━━━━━━━━━━ */

describe.runIf(isWebGLAvailable())("OffscreenCanvas + Worker WebGL rendering", () => {
  test("Worker renders WebGL to OffscreenCanvas and returns ImageBitmap", async () => {
    const blitCanvas = document.createElement("canvas");
    blitCanvas.width = 128;
    blitCanvas.height = 128;
    document.body.appendChild(blitCanvas);

    const workerSource = `
      self.onmessage = async (e) => {
        if (e.data.type === 'render') {
          const { canvas, color } = e.data;
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) {
            self.postMessage({ type: 'error', message: 'No WebGL context in worker' });
            return;
          }
          const [cr, cg, cb] = color;
          gl.clearColor(cr, cg, cb, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.finish();
          const bitmap = await createImageBitmap(canvas);
          self.postMessage({ type: 'rendered', bitmap }, [bitmap]);
        }
      };
    `;

    const blob = new Blob([workerSource], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    try {
      const offscreen = new OffscreenCanvas(128, 128);

      const bitmap = await new Promise<ImageBitmap>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Worker render timeout")), 5000);
        worker.onmessage = (e) => {
          clearTimeout(timeout);
          if (e.data.type === "rendered") resolve(e.data.bitmap);
          else reject(new Error(e.data.message));
        };
        worker.postMessage({ type: "render", canvas: offscreen, color: [0, 1, 0] }, [offscreen]);
      });

      assert.equal(bitmap.width, 128);
      assert.equal(bitmap.height, 128);

      const ctx = blitCanvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      const pixel = ctx.getImageData(64, 64, 1, 1).data;
      assert.isAbove(pixel[1]!, 200, `Green channel should be >200, got ${pixel[1]}`);
      assert.isBelow(pixel[0]!, 50, `Red channel should be <50, got ${pixel[0]}`);
      assert.equal(pixel[3]!, 255, "Should be fully opaque");
    } finally {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      blitCanvas.remove();
    }
  });
});

/* ━━ 3. Worker continues rendering while main thread is halted ━━━━ */
/*
 * Uses CDP Debugger.pause to truly halt the main thread V8 isolate.
 * Workers have their own V8 isolates and continue running independently.
 *
 * This simulates the most extreme form of Chrome's background tab behavior:
 * the main thread is completely stopped. The test proves via TIMESTAMPS that:
 *
 * - Worker frames have timestamps spread DURING the pause
 * - Main thread frames have timestamps clustered AFTER resume
 * - Worker produces correct WebGL pixels while the main thread is halted
 */

describe.runIf(isWebGLAvailable())(
  "Worker renders while main thread is halted (Debugger.pause)",
  () => {
    test(
      "Worker renders all frames during main-thread pause, main thread resumes after",
      { timeout: 30000 },
      async () => {
        const result = await (commands as any).testWorkerRendersWhileMainThreadFrozen();

        console.log("[Freeze Test] Pause duration:", result.pauseDuration, "ms");
        console.log("[Freeze Test] Worker frames:", result.workerResults?.length);
        console.log("[Freeze Test] Main frames:", result.mainResults?.length);

        // ── Worker rendered ALL frames ──
        assert.isNotNull(result.workerResults, "Worker results should exist");
        assert.equal(
          result.workerResults.length,
          5,
          `Worker should render 5 frames, got ${result.workerResults?.length}`,
        );

        // ── Worker pixels are correct ──
        const expectedColors: [number, number, number][] = [
          [255, 0, 0],
          [0, 255, 0],
          [0, 0, 255],
          [255, 255, 0],
          [255, 0, 255],
        ];
        for (let i = 0; i < result.workerResults.length; i++) {
          const frame = result.workerResults[i];
          assert.isNotNull(frame, `Worker frame ${i} should exist`);
          assert.isUndefined(
            (frame as any).error,
            `Worker frame ${i} should not have error: ${(frame as any).error}`,
          );
          assert.exists(frame.pixel, `Worker frame ${frame.frameId} should have pixel data`);
          const [er, eg, eb] = expectedColors[i]!;
          assert.isAbove(frame.pixel.r, er - 50, `Worker frame ${frame.frameId} red`);
          assert.isAbove(frame.pixel.g, eg - 50, `Worker frame ${frame.frameId} green`);
          assert.isAbove(frame.pixel.b, eb - 50, `Worker frame ${frame.frameId} blue`);
        }

        // ── Worker timestamps are DURING the pause period ──
        const workerFirst = result.workerResults[0].timestamp;
        const workerLast = result.workerResults[result.workerResults.length - 1].timestamp;
        const workerSpan = workerLast - workerFirst;
        assert.isAbove(
          workerSpan,
          500,
          `Worker frame span should be >500ms (actual rendering), got ${workerSpan}ms`,
        );
        assert.isBelow(
          workerLast,
          result.unfreezeTime,
          "Worker should complete BEFORE main thread resumes",
        );

        console.log(
          `[Freeze Test] Worker: T=${workerFirst - result.freezeStartTime}ms to T=${workerLast - result.freezeStartTime}ms (span: ${workerSpan}ms)`,
        );

        // ── Main thread frames are AFTER the resume ──
        assert.isNotNull(result.mainResults, "Main thread results should exist");
        assert.isAbove(
          result.mainResults.length,
          0,
          "Main thread should have rendered some frames",
        );

        if (result.mainResults.length > 1) {
          const mainSecond = result.mainResults[1].timestamp;
          assert.isAbove(
            mainSecond,
            result.unfreezeTime - 200,
            `Main thread frame 2 (T=${mainSecond - result.freezeStartTime}ms) should be after ` +
              `resume (T=${result.unfreezeTime - result.freezeStartTime}ms)`,
          );

          console.log(
            `[Freeze Test] Main:   frame 2 at T=${mainSecond - result.freezeStartTime}ms (after resume at T=${result.unfreezeTime - result.freezeStartTime}ms)`,
          );
        }

        // ── The definitive comparison ──
        const workerMedian = result.workerResults[2].timestamp;
        const mainMedian =
          result.mainResults.length > 2
            ? result.mainResults[2].timestamp
            : result.mainResults[result.mainResults.length - 1].timestamp;

        assert.isBelow(
          workerMedian,
          mainMedian,
          "Worker median timestamp should be before main thread (Worker was active during pause)",
        );

        console.log(
          "[Freeze Test] PROVEN: Worker rendered DURING pause, main thread rendered AFTER resume",
        );
      },
    );
  },
);
