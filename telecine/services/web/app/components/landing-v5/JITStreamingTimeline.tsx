// @ts-nocheck - React Three Fiber JSX intrinsics
import React, { Suspense, useState, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { Timegroup } from "@editframe/react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { JITStreamingScene } from "./jit-streaming-scene";
import { InvalidateOnTimeChange, flushR3F, yieldToScheduler } from "./r3f-sync";


export function JITStreamingTimeline() {
  const timegroupRef = useRef(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [timeMs, setTimeMs] = useState(0);

  useLayoutEffect(() => {
    const tg = timegroupRef.current;
    if (!tg?.addFrameTask) return;

    let prevFramePixelHash = 0;
    let frameSeq = 0;

    return tg.addFrameTask(async ({ currentTimeMs }: { currentTimeMs: number }) => {
      const seq = frameSeq++;
      const hidden = document.hidden;

      console.log('[R3F_DIAG] frameTask:start', JSON.stringify({ seq, currentTimeMs, hidden }));

      flushSync(() => {
        setTimeMs(currentTimeMs);
      });

      console.log('[R3F_DIAG] frameTask:afterFlushSync', JSON.stringify({ seq, currentTimeMs }));

      await yieldToScheduler();

      console.log('[R3F_DIAG] frameTask:afterYield', JSON.stringify({ seq, currentTimeMs }));

      const container = canvasContainerRef.current;
      const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;
      const r3fStore = (canvas as any)?.__r3f;
      const state = r3fStore?.store?.getState?.();

      // Camera position before flushR3F (captures useFrame state)
      const camBefore = state?.camera
        ? { x: +state.camera.position.x.toFixed(3), y: +state.camera.position.y.toFixed(3), z: +state.camera.position.z.toFixed(3) }
        : null;

      flushR3F(container);

      // Camera position after flushR3F (after useFrame ran)
      const camAfter = state?.camera
        ? { x: +state.camera.position.x.toFixed(3), y: +state.camera.position.y.toFixed(3), z: +state.camera.position.z.toFixed(3) }
        : null;

      // Sample 4 pixels from the drawing buffer to detect change
      let pixelHash = 0;
      if (canvas) {
        const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
        if (gl) {
          const probe = new Uint8Array(4);
          // Center pixel
          gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe);
          pixelHash = (probe[0]! << 24) | (probe[1]! << 16) | (probe[2]! << 8) | probe[3]!;
        }
      }

      const pixelChanged = pixelHash !== prevFramePixelHash;
      console.log('[R3F_DIAG] frameTask:afterFlushR3F', JSON.stringify({
        seq, currentTimeMs, hidden,
        camBefore, camAfter,
        pixelHash: '0x' + (pixelHash >>> 0).toString(16).padStart(8, '0'),
        pixelChanged,
        subscriberCount: state?.internal?.subscribers?.size ?? 0,
        canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null,
      }));

      prevFramePixelHash = pixelHash;
    });
  }, []);

  return (
    <Timegroup
      ref={timegroupRef}
      mode="fixed"
      duration="30s"
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "16/10", background: "#1e2233" }}
    >
      <div ref={canvasContainerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <Canvas
          shadows
          frameloop="demand"
          dpr={[1, 2]}
          gl={{
            preserveDrawingBuffer: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.8,
          }}
          camera={{ fov: 50, near: 0.1, far: 100 }}
          scene={{ background: new THREE.Color(0x1e2233), fog: new THREE.Fog(0x1e2233, 12, 28) }}
          style={{ width: "100%", height: "100%" }}
        >
          <Suspense fallback={null}>
            <InvalidateOnTimeChange timeMs={timeMs} />
            <JITStreamingScene currentTimeMs={timeMs} />
          </Suspense>
        </Canvas>
      </div>
    </Timegroup>
  );
}
