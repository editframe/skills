// @ts-nocheck - React Three Fiber JSX intrinsics
import React, { Suspense, useState, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { Timegroup } from "@editframe/react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { JITStreamingScene } from "./jit-streaming-scene";
import { InvalidateOnTimeChange, flushR3F, yieldToScheduler, getR3FState, r3fFlushSync } from "./r3f-sync";


export function JITStreamingTimeline() {
  const timegroupRef = useRef(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [timeMs, setTimeMs] = useState(0);

  useLayoutEffect(() => {
    const tg = timegroupRef.current;
    if (!tg?.addFrameTask) return;

    let r3fReady = false;

    return tg.addFrameTask(async ({ currentTimeMs }: { currentTimeMs: number }) => {
      // 1. Flush react-dom: updates timeMs state, re-renders Canvas component.
      //    Canvas layout effect starts async run() → await configure() yields microtask.
      flushSync(() => {
        setTimeMs(currentTimeMs);
      });

      // 2. On first frame, R3F Canvas needs a macrotask for ResizeObserver to fire
      //    and useMeasure to report size, which triggers R3F initialization.
      //    After R3F is ready, only a microtask yield is needed (for Canvas's
      //    async run() → render() to execute after await configure()).
      if (!r3fReady) {
        await yieldToScheduler();
        flushSync(() => {});
      }

      // 3. Microtask yield: lets Canvas async run() call render(children)
      //    after configure() resolves.
      await Promise.resolve();

      // 4. Flush R3F's reconciler synchronously so the Three.js scene graph
      //    reflects the latest React props (currentTimeMs, etc).
      r3fFlushSync(() => {});

      if (!r3fReady) {
        const canvas = canvasContainerRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
        if (getR3FState(canvas)?.gl) r3fReady = true;
      }

      // 5. Imperatively render: runs useFrame subscribers + gl.render + gl.finish
      flushR3F(canvasContainerRef.current);
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
