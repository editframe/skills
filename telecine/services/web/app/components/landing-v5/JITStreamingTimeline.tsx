// @ts-nocheck - React Three Fiber JSX intrinsics
import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import { Timegroup } from "@editframe/react";

/**
 * JIT Streaming Timeline — 30-second 3D animation rendered on an OffscreenCanvas
 * via a Web Worker so that Chrome's hidden-tab renderer suspension doesn't freeze
 * the 3D content.
 *
 * Architecture:
 *   Main thread: Timegroup → addFrameTask → worker.postMessage({ timeMs })
 *   Worker:      Receives timeMs → R3F scene updates → gl.render() on OffscreenCanvas
 *   Browser:     Composites OffscreenCanvas to the visible <canvas> element
 *
 * Because the Worker has its own V8 isolate and WebGL context, rendering continues
 * even when the main thread's renderer is suspended (hidden/background tab).
 */

export function JITStreamingTimeline() {
  const timegroupRef = useRef(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [worker, setWorker] = useState<Worker | null>(null);

  // ── Create Worker and transfer canvas ────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let offscreen: OffscreenCanvas;
    try {
      offscreen = canvas.transferControlToOffscreen();
    } catch {
      console.error(
        "[JITStreamingTimeline] transferControlToOffscreen() not supported",
      );
      return;
    }

    const w = new Worker(
      new URL("./jit-streaming-worker.tsx", import.meta.url),
      { type: "module" },
    );

    w.onerror = (e) => {
      console.error("[JITStreamingTimeline] Worker error:", e);
    };
    w.onmessage = (e) => {
      if (e.data.type === "error") {
        console.error("[JITStreamingTimeline] Worker init error:", e.data.message);
      }
    };

    const { width, height } = canvas.getBoundingClientRect();

    w.postMessage(
      {
        type: "init",
        canvas: offscreen,
        width: width || 800,
        height: height || 500,
        pixelRatio: window.devicePixelRatio,
      },
      [offscreen],
    );

    setWorker(w);

    // Resize observer — keep Worker's viewport in sync
    const ro = new ResizeObserver(([entry]) => {
      const { width: rw, height: rh } = entry.contentRect;
      if (rw > 0 && rh > 0) {
        w.postMessage({ type: "resize", width: rw, height: rh });
      }
    });
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      w.terminate();
      setWorker(null);
    };
  }, []);

  // ── Drive the Worker from the Editframe timeline ─────────────────
  useLayoutEffect(() => {
    const tg = timegroupRef.current;
    if (!tg?.addFrameTask || !worker) return;

    return tg.addFrameTask(({ currentTimeMs }: { currentTimeMs: number }) => {
      worker.postMessage({ type: "setTime", timeMs: currentTimeMs });
    });
  }, [worker]);

  return (
    <Timegroup
      ref={timegroupRef}
      mode="fixed"
      duration="30s"
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "16/10", background: "#1e2233" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </Timegroup>
  );
}
