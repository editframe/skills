/**
 * OffscreenCompositionCanvas — R3F Canvas that renders in a web worker via OffscreenCanvas.
 *
 * This component integrates with Editframe's timeline system by:
 * - Registering an addFrameTask that sends time updates to the worker
 * - Receiving rendered frames (ImageBitmap) from the worker
 * - Drawing frames onto a hidden capture canvas for video export
 *
 * The worker handles all R3F rendering, keeping the main thread free and enabling
 * rendering to continue even when the browser tab is hidden.
 *
 * Usage:
 * ```tsx
 * const worker = new Worker(new URL('./scene-worker.ts', import.meta.url), { type: 'module' });
 *
 * <Timegroup mode="fixed" duration="14s">
 *   <OffscreenCompositionCanvas
 *     worker={worker}
 *     fallback={<MainThreadFallback />}
 *     canvasProps={{ shadows: true, dpr: [1, 2] }}
 *   />
 * </Timegroup>
 * ```
 */

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Canvas as OffscreenCanvas } from "@react-three/offscreen";
import type { CanvasProps } from "@react-three/fiber";
import type { EFTimegroup } from "@editframe/elements";

/* ━━ Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export interface OffscreenCompositionCanvasProps {
  /** Web worker that will handle R3F rendering */
  worker: Worker;
  /** Fallback content for browsers without OffscreenCanvas support (Safari) */
  fallback?: React.ReactNode;
  /** Extra styles for the container div */
  containerStyle?: React.CSSProperties;
  /** Extra className for the container div */
  containerClassName?: string;
  /** Canvas props to forward to @react-three/offscreen Canvas (shadows, dpr, gl, camera, scene, etc.) */
  canvasProps?: Omit<CanvasProps, "frameloop">;
}

/* ━━ Helper: Wait for bitmap from worker ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function waitForBitmap(
  worker: Worker,
  requestId: number,
): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.removeEventListener("message", handler);
      reject(
        new Error(
          `[OffscreenCompositionCanvas] Timeout waiting for frame ${requestId}`,
        ),
      );
    }, 5000); // 5 second timeout

    const handler = (e: MessageEvent) => {
      if (e.data.type === "frameRendered" && e.data.requestId === requestId) {
        clearTimeout(timeout);
        worker.removeEventListener("message", handler);
        resolve(e.data.bitmap);
      } else if (e.data.type === "error") {
        clearTimeout(timeout);
        worker.removeEventListener("message", handler);
        reject(
          new Error(
            `[OffscreenCompositionCanvas] Worker error: ${e.data.message}`,
          ),
        );
      }
    };

    worker.addEventListener("message", handler);
  });
}

/* ━━ Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function OffscreenCompositionCanvas({
  worker,
  fallback,
  containerStyle,
  containerClassName,
  canvasProps,
}: OffscreenCompositionCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  /* ━━ Resize observer to keep capture canvas in sync ━━━━━━━━━━━━━━━━━ */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  /* ━━ addFrameTask integration ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Walk up to find the parent ef-timegroup
    const tg = container.closest("ef-timegroup") as
      | (HTMLElement & EFTimegroup)
      | null;

    if (!tg) {
      console.warn(
        "[OffscreenCompositionCanvas] No ef-timegroup ancestor found. " +
          "Wrap OffscreenCompositionCanvas inside a <Timegroup>.",
      );
      return;
    }

    if (!tg.addFrameTask) {
      console.warn(
        "[OffscreenCompositionCanvas] ef-timegroup does not have addFrameTask method",
      );
      return;
    }

    let nextRequestId = 0;

    const cleanup = tg.addFrameTask(
      async ({ ownCurrentTimeMs, durationMs }) => {
        const requestId = nextRequestId++;

        // Send render request to worker
        worker.postMessage({
          type: "renderFrame",
          timeMs: ownCurrentTimeMs,
          durationMs,
          requestId,
        });

        try {
          // Wait for worker to finish rendering and return pixels
          const bitmap = await waitForBitmap(worker, requestId);

          // Draw onto capture canvas so serialization pipeline can read pixels
          const captureCanvas = captureCanvasRef.current;
          if (captureCanvas) {
            const ctx = captureCanvas.getContext("2d");
            if (ctx) {
              // Resize capture canvas to match bitmap
              if (
                captureCanvas.width !== bitmap.width ||
                captureCanvas.height !== bitmap.height
              ) {
                captureCanvas.width = bitmap.width;
                captureCanvas.height = bitmap.height;
              }

              // Draw the bitmap
              ctx.drawImage(bitmap, 0, 0);
            }

            // Close bitmap to free memory
            bitmap.close();
          }
        } catch (error) {
          console.error(
            "[OffscreenCompositionCanvas] Frame render error:",
            error,
          );
        }
      },
    );

    return cleanup;
  }, [worker]);

  /* ━━ Render ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        ...containerStyle,
      }}
    >
      {/* Display canvas - handled by @react-three/offscreen */}
      <OffscreenCanvas
        worker={worker}
        fallback={fallback}
        {...canvasProps}
        style={{ width: "100%", height: "100%", ...canvasProps?.style }}
      />

      {/* Hidden capture canvas for video export */}
      <canvas
        ref={captureCanvasRef}
        data-offscreen-capture="true"
        style={{ display: "none" }}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}
