/**
 * Browser tests proving:
 * 1. WebGL (Three.js) rendering works via addFrameTask synchronous pipeline
 * 2. OffscreenCanvas + Worker renders WebGL correctly
 * 3. Worker rendering continues when page is hidden (background rendering)
 * 4. Real tab switch: worker renders while another window has focus
 */

import { describe, test, assert, beforeEach } from "vitest";
import * as THREE from "three";
import type { EFTimegroup } from "@editframe/elements/elements/EFTimegroup.js";
import "@editframe/elements/elements/EFTimegroup.js";

beforeEach(() => {
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
});

/* ━━ Helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function readWebGLCenterPixel(canvas: HTMLCanvasElement): [number, number, number, number] {
  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true })
    || canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) throw new Error("No WebGL context");
  const pixel = new Uint8Array(4);
  gl.readPixels(
    Math.floor(canvas.width / 2),
    Math.floor(canvas.height / 2),
    1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel,
  );
  return [pixel[0], pixel[1], pixel[2], pixel[3]];
}

/* ━━ 1. Three.js WebGL rendering via addFrameTask ━━━━━━━━━━━━━━━━━ */

describe("Three.js WebGL rendering via addFrameTask", () => {
  test("renders different colors at different time positions using Three.js", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.width = "200px";
    tg.style.height = "200px";
    tg.setAttribute("duration", "1s");

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    canvas.id = "three-canvas";
    tg.appendChild(canvas);

    tg.initializer = (instance) => {
      const c = instance.querySelector("#three-canvas") as HTMLCanvasElement;
      if (!c) return;

      const renderer = new THREE.WebGLRenderer({ canvas: c, preserveDrawingBuffer: true });
      renderer.setSize(200, 200, false);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);

      // Red at t=0, blue at t=1000ms
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0, 0) });
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
      const cloneCanvas = clone.querySelector("#three-canvas") as HTMLCanvasElement;
      assert.isNotNull(cloneCanvas, "Clone should have the canvas");

      // Seek to 0ms → red
      await clone.seekForRender(0);
      const gl0 = cloneCanvas.getContext("webgl2", { preserveDrawingBuffer: true })
        || cloneCanvas.getContext("webgl", { preserveDrawingBuffer: true });
      assert.isNotNull(gl0, "Should have WebGL context");
      const pixel0 = new Uint8Array(4);
      gl0!.readPixels(100, 100, 1, 1, gl0!.RGBA, gl0!.UNSIGNED_BYTE, pixel0);

      // Seek to 900ms → mostly blue
      await clone.seekForRender(900);
      const pixel900 = new Uint8Array(4);
      gl0!.readPixels(100, 100, 1, 1, gl0!.RGBA, gl0!.UNSIGNED_BYTE, pixel900);

      // At 0ms: red dominant
      assert.isAbove(pixel0[0], 150, `At t=0 red should be high, got ${pixel0[0]}`);
      assert.isBelow(pixel0[2], 100, `At t=0 blue should be low, got ${pixel0[2]}`);

      // At 900ms: blue dominant over red (WebGL gamma/sRGB may shift values)
      assert.isAbove(pixel900[2], pixel900[0], `At t=900 blue (${pixel900[2]}) should exceed red (${pixel900[0]})`);
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
    canvas.id = "det-canvas";
    tg.appendChild(canvas);

    tg.initializer = (instance) => {
      const c = instance.querySelector("#det-canvas") as HTMLCanvasElement;
      if (!c) return;

      const renderer = new THREE.WebGLRenderer({ canvas: c, preserveDrawingBuffer: true });
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
      const cloneCanvas = clone.querySelector("#det-canvas") as HTMLCanvasElement;
      const gl = cloneCanvas.getContext("webgl2", { preserveDrawingBuffer: true })
        || cloneCanvas.getContext("webgl", { preserveDrawingBuffer: true });

      // Seek to 500ms twice
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

describe("OffscreenCanvas + Worker WebGL rendering", () => {
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
        worker.postMessage(
          { type: "render", canvas: offscreen, color: [0, 1, 0] },
          [offscreen],
        );
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

/* ━━ 3. Background rendering: Worker continues while page is hidden ━━ */

describe("Background rendering: Worker + OffscreenCanvas immune to page visibility", () => {
  test("Worker renders correctly while document.hidden is true", async () => {
    const blitCanvas = document.createElement("canvas");
    blitCanvas.width = 64;
    blitCanvas.height = 64;
    document.body.appendChild(blitCanvas);

    const workerSource = `
      self.onmessage = async (e) => {
        if (e.data.type === 'render') {
          const { canvas, color, requestId } = e.data;
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
          self.postMessage({ type: 'rendered', bitmap, requestId }, [bitmap]);
        }
      };
    `;

    const blob = new Blob([workerSource], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    const originalHidden = Object.getOwnPropertyDescriptor(Document.prototype, "hidden");
    const originalVisState = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");

    try {
      // Phase 1: Render red while page is visible
      const offscreen1 = new OffscreenCanvas(64, 64);
      const bitmap1 = await new Promise<ImageBitmap>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout phase 1")), 5000);
        worker.onmessage = (e) => {
          clearTimeout(timeout);
          if (e.data.type === "rendered" && e.data.requestId === 1) resolve(e.data.bitmap);
          else if (e.data.type === "error") reject(new Error(e.data.message));
        };
        worker.postMessage(
          { type: "render", canvas: offscreen1, color: [1, 0, 0], requestId: 1 },
          [offscreen1],
        );
      });

      const ctx = blitCanvas.getContext("2d")!;
      ctx.drawImage(bitmap1, 0, 0);
      bitmap1.close();

      const pixel1 = ctx.getImageData(32, 32, 1, 1).data;
      assert.isAbove(pixel1[0]!, 200, "Phase 1: Red channel should be high");
      assert.isBelow(pixel1[1]!, 50, "Phase 1: Green should be low");

      // Phase 2: Simulate hidden tab, then render blue in worker
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });

      assert.isTrue(document.hidden, "Document should now report hidden");
      assert.equal(document.visibilityState, "hidden");

      const offscreen2 = new OffscreenCanvas(64, 64);
      const bitmap2 = await new Promise<ImageBitmap>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout phase 2 (hidden)")), 5000);
        worker.onmessage = (e) => {
          clearTimeout(timeout);
          if (e.data.type === "rendered" && e.data.requestId === 2) resolve(e.data.bitmap);
          else if (e.data.type === "error") reject(new Error(e.data.message));
        };
        worker.postMessage(
          { type: "render", canvas: offscreen2, color: [0, 0, 1], requestId: 2 },
          [offscreen2],
        );
      });

      ctx.drawImage(bitmap2, 0, 0);
      bitmap2.close();

      const pixel2 = ctx.getImageData(32, 32, 1, 1).data;
      assert.isAbove(pixel2[2]!, 200, "Phase 2 (hidden): Blue channel should be high");
      assert.isBelow(pixel2[0]!, 50, "Phase 2 (hidden): Red should be low");
      assert.equal(pixel2[3]!, 255, "Phase 2 (hidden): Should be fully opaque");

    } finally {
      if (originalHidden) {
        Object.defineProperty(Document.prototype, "hidden", originalHidden);
      } else {
        Object.defineProperty(document, "hidden", { value: false, configurable: true });
      }
      if (originalVisState) {
        Object.defineProperty(Document.prototype, "visibilityState", originalVisState);
      } else {
        Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      }

      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      blitCanvas.remove();
    }
  });

  test("Worker renders multiple frames with different colors while hidden", async () => {
    const blitCanvas = document.createElement("canvas");
    blitCanvas.width = 64;
    blitCanvas.height = 64;
    document.body.appendChild(blitCanvas);

    const workerSource = `
      self.onmessage = async (e) => {
        if (e.data.type === 'render') {
          const { canvas, color, requestId } = e.data;
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) {
            self.postMessage({ type: 'error', message: 'No WebGL context' });
            return;
          }
          const [cr, cg, cb] = color;
          gl.clearColor(cr, cg, cb, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.finish();
          const bitmap = await createImageBitmap(canvas);
          self.postMessage({ type: 'rendered', bitmap, requestId }, [bitmap]);
        }
      };
    `;

    const blob = new Blob([workerSource], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    const originalHidden = Object.getOwnPropertyDescriptor(Document.prototype, "hidden");
    const originalVisState = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");

    try {
      // Simulate hidden
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });

      const ctx = blitCanvas.getContext("2d")!;
      const colors: [number, number, number][] = [
        [1, 0, 0], // red
        [0, 1, 0], // green
        [0, 0, 1], // blue
        [1, 1, 0], // yellow
        [1, 0, 1], // magenta
      ];

      const results: number[][] = [];

      for (let i = 0; i < colors.length; i++) {
        const offscreen = new OffscreenCanvas(64, 64);
        const bitmap = await new Promise<ImageBitmap>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error(`Timeout frame ${i}`)), 5000);
          worker.onmessage = (e) => {
            clearTimeout(timeout);
            if (e.data.type === "rendered" && e.data.requestId === i) resolve(e.data.bitmap);
            else if (e.data.type === "error") reject(new Error(e.data.message));
          };
          worker.postMessage(
            { type: "render", canvas: offscreen, color: colors[i], requestId: i },
            [offscreen],
          );
        });

        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const pixel = ctx.getImageData(32, 32, 1, 1).data;
        results.push([pixel[0]!, pixel[1]!, pixel[2]!, pixel[3]!]);
      }

      // Verify each frame has the expected dominant channel
      // red: [255, 0, 0]
      assert.isAbove(results[0]![0]!, 200, "Frame 0 red channel");
      assert.isBelow(results[0]![1]!, 50, "Frame 0 green channel");
      // green: [0, 255, 0]
      assert.isBelow(results[1]![0]!, 50, "Frame 1 red channel");
      assert.isAbove(results[1]![1]!, 200, "Frame 1 green channel");
      // blue: [0, 0, 255]
      assert.isBelow(results[2]![0]!, 50, "Frame 2 red channel");
      assert.isAbove(results[2]![2]!, 200, "Frame 2 blue channel");
      // yellow: [255, 255, 0]
      assert.isAbove(results[3]![0]!, 200, "Frame 3 red channel");
      assert.isAbove(results[3]![1]!, 200, "Frame 3 green channel");
      // magenta: [255, 0, 255]
      assert.isAbove(results[4]![0]!, 200, "Frame 4 red channel");
      assert.isAbove(results[4]![2]!, 200, "Frame 4 blue channel");

    } finally {
      if (originalHidden) {
        Object.defineProperty(Document.prototype, "hidden", originalHidden);
      } else {
        Object.defineProperty(document, "hidden", { value: false, configurable: true });
      }
      if (originalVisState) {
        Object.defineProperty(Document.prototype, "visibilityState", originalVisState);
      } else {
        Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      }

      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      blitCanvas.remove();
    }
  });

  test("Real window switch: worker renders while popup has focus", async () => {
    const blitCanvas = document.createElement("canvas");
    blitCanvas.width = 64;
    blitCanvas.height = 64;
    document.body.appendChild(blitCanvas);

    const workerSource = `
      self.onmessage = async (e) => {
        if (e.data.type === 'render') {
          const { canvas, color, requestId } = e.data;
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) {
            self.postMessage({ type: 'error', message: 'No WebGL context' });
            return;
          }
          const [cr, cg, cb] = color;
          gl.clearColor(cr, cg, cb, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.finish();
          const bitmap = await createImageBitmap(canvas);
          self.postMessage({ type: 'rendered', bitmap, requestId }, [bitmap]);
        }
      };
    `;

    const blob = new Blob([workerSource], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    let popup: Window | null = null;

    try {
      const ctx = blitCanvas.getContext("2d")!;

      // Phase 1: Render green while focused
      const offscreen1 = new OffscreenCanvas(64, 64);
      const bitmap1 = await new Promise<ImageBitmap>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout phase 1")), 5000);
        worker.onmessage = (e) => {
          if (e.data.requestId === 1) { clearTimeout(timeout); resolve(e.data.bitmap); }
        };
        worker.postMessage(
          { type: "render", canvas: offscreen1, color: [0, 1, 0], requestId: 1 },
          [offscreen1],
        );
      });

      ctx.drawImage(bitmap1, 0, 0);
      bitmap1.close();
      const p1 = ctx.getImageData(32, 32, 1, 1).data;
      assert.isAbove(p1[1]!, 200, "Phase 1: Green channel should be high");

      // Phase 2: Open popup to steal focus, then render magenta
      popup = window.open("about:blank", "_blank", "width=100,height=100");
      await new Promise((r) => setTimeout(r, 500));

      const offscreen2 = new OffscreenCanvas(64, 64);
      const bitmap2 = await new Promise<ImageBitmap>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout phase 2 (unfocused)")), 5000);
        worker.onmessage = (e) => {
          if (e.data.requestId === 2) { clearTimeout(timeout); resolve(e.data.bitmap); }
        };
        worker.postMessage(
          { type: "render", canvas: offscreen2, color: [1, 0, 1], requestId: 2 },
          [offscreen2],
        );
      });

      ctx.drawImage(bitmap2, 0, 0);
      bitmap2.close();
      const p2 = ctx.getImageData(32, 32, 1, 1).data;
      assert.isAbove(p2[0]!, 200, "Phase 2: Red channel high (magenta)");
      assert.isBelow(p2[1]!, 50, "Phase 2: Green channel low");
      assert.isAbove(p2[2]!, 200, "Phase 2: Blue channel high (magenta)");

    } finally {
      if (popup) popup.close();
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      blitCanvas.remove();
    }
  });
});
