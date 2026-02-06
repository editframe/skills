// @ts-nocheck — Worker context requires non-standard globals
/// <reference lib="webworker" />

/**
 * JIT Streaming Worker — R3F scene rendering on OffscreenCanvas.
 *
 * Renders JITStreamingScene using React Three Fiber inside a Web Worker.
 * Workers have their own V8 isolate, so WebGL rendering continues even when
 * Chrome suspends the main thread's renderer for hidden tabs.
 *
 * Message protocol (main → worker):
 *   { type: 'init',    canvas, width, height, pixelRatio }
 *   { type: 'setTime', timeMs }
 *   { type: 'resize',  width, height }
 */

// Shims MUST be first — R3F checks `typeof window` at module evaluation.
import "./worker-shims";

import * as THREE from "three";
import * as React from "react";
import { useState, useEffect, Suspense } from "react";
import { extend, createRoot, useThree, useFrame } from "@react-three/fiber";
import { JITStreamingScene } from "./jit-streaming-scene";

extend(THREE);

/* ━━ Worker-side React components ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let _setTimeFn: ((t: number) => void) | null = null;

function InvalidateOnTimeChange({ timeMs }: { timeMs: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidate();
  }, [timeMs, invalidate]);
  return null;
}

function GLFinish() {
  const { gl } = useThree();
  useFrame(() => {
    gl.getContext().finish();
  });
  return null;
}

function WorkerApp() {
  const [timeMs, setTimeMs] = useState(0);

  useEffect(() => {
    _setTimeFn = setTimeMs;
    return () => {
      _setTimeFn = null;
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <InvalidateOnTimeChange timeMs={timeMs} />
      <GLFinish />
      <JITStreamingScene currentTimeMs={timeMs} />
    </Suspense>
  );
}

/* ━━ R3F root management ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let root: ReturnType<typeof createRoot> | null = null;

/* ━━ Message handling ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

self.onmessage = (event: MessageEvent) => {
  const { type, ...data } = event.data;

  if (type === "init") {
    const { canvas, width, height, pixelRatio } = data;

    // Shim OffscreenCanvas → HTMLCanvasElement interface for R3F
    Object.assign(canvas, {
      style: { touchAction: "none" },
      ownerDocument: canvas,
      documentElement: canvas,
      clientWidth: width,
      clientHeight: height,
      getBoundingClientRect: () => ({
        width,
        height,
        top: 0,
        left: 0,
        x: 0,
        y: 0,
        bottom: height,
        right: width,
        toJSON: () => ({}),
      }),
      setAttribute() {},
      setPointerCapture() {},
      releasePointerCapture() {},
      addEventListener() {},
      removeEventListener() {},
    });

    root = createRoot(canvas);
    root.configure({
      frameloop: "demand",
      shadows: true,
      size: { width, height, top: 0, left: 0, updateStyle: false },
      dpr: Math.min(Math.max(1, pixelRatio), 2),
      gl: {
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.8,
      },
      camera: { fov: 50, near: 0.1, far: 100 },
      scene: {
        background: new THREE.Color(0x1e2233),
        fog: new THREE.Fog(0x1e2233, 12, 28),
      },
    });

    root.render(<WorkerApp />);

    // Point window shim at the canvas (R3F stores reference on it)
    (self as any).window = canvas;

    // Override ImageLoader for Worker (no DOM Image element)
    THREE.ImageLoader.prototype.load = function (
      url: string,
      onLoad: any,
      _onProgress: any,
      onError: any,
    ) {
      if (this.path !== undefined) url = this.path + url;
      url = this.manager.resolveURL(url);
      const cached = THREE.Cache.get(url);
      if (cached) {
        this.manager.itemStart(url);
        if (onLoad) onLoad(cached);
        this.manager.itemEnd(url);
        return cached;
      }
      const scope = this;
      scope.manager.itemStart(url);
      fetch(url)
        .then((r) => r.blob())
        .then((r) =>
          createImageBitmap(r, {
            premultiplyAlpha: "none",
            colorSpaceConversion: "none",
          }),
        )
        .then((bitmap) => {
          THREE.Cache.add(url, bitmap);
          if (onLoad) onLoad(bitmap);
          scope.manager.itemEnd(url);
        })
        .catch((err) => {
          scope.manager.itemError(url);
          if (onError) onError(err);
        });
      return {};
    };

    postMessage({ type: "ready" });
  }

  if (type === "setTime") {
    _setTimeFn?.(data.timeMs);
  }

  if (type === "resize") {
    if (!root) return;
    const state = (root as any).store?.getState();
    const canvas = state?.gl?.domElement;
    if (canvas) {
      canvas.clientWidth = data.width;
      canvas.clientHeight = data.height;
      canvas.getBoundingClientRect = () => ({
        width: data.width,
        height: data.height,
        top: 0,
        left: 0,
        x: 0,
        y: 0,
        bottom: data.height,
        right: data.width,
        toJSON: () => ({}),
      });
    }
    root.configure({
      size: {
        width: data.width,
        height: data.height,
        top: 0,
        left: 0,
        updateStyle: false,
      },
    });
  }
};
