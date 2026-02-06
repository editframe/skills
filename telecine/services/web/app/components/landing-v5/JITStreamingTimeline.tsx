// @ts-nocheck - React Three Fiber JSX intrinsics
import React, { Suspense, useState, useLayoutEffect, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { Timegroup } from "@editframe/react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { JITStreamingScene } from "./jit-streaming-scene";

/** Forces gl.finish() every R3F frame so pixels are ready for capture. */
function GLSync() {
  const { gl } = useThree();
  useFrame(() => {
    gl.getContext().finish();
  });
  return null;
}

/** Triggers an R3F render when time changes (frameloop="demand"). */
function InvalidateOnTimeChange({ timeMs }: { timeMs: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidate();
  }, [timeMs, invalidate]);
  return null;
}

export function JITStreamingTimeline() {
  const timegroupRef = useRef(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [timeMs, setTimeMs] = useState(0);

  // Register an addFrameTask on the parent timegroup.
  // - Live playback: the playback loop fires frame tasks on every frame.
  // - Render clones: seekForRender awaits #executeCustomFrameTasks().
  // flushSync ensures React processes the state update synchronously
  // before the frame is captured.
  // useLayoutEffect (not useEffect) so this registers synchronously
  // during TimelineRoot's flushSync render for clones.
  useLayoutEffect(() => {
    const tg = timegroupRef.current;
    if (!tg?.addFrameTask) return;

    return tg.addFrameTask(({ currentTimeMs }: { currentTimeMs: number }) => {
      flushSync(() => {
        setTimeMs(currentTimeMs);
      });

      // After flushSync, React has updated props/state but R3F hasn't rendered.
      // InvalidateOnTimeChange uses useEffect (async), so we must imperatively
      // force R3F to render a frame now. This is required for render clones
      // where requestAnimationFrame may not fire.
      const canvas = canvasContainerRef.current?.querySelector('canvas');
      const r3fStore = (canvas as any)?.__r3f;

      if (r3fStore) {
        const state = r3fStore.store?.getState?.();
        if (state) {
          state.invalidate();
          state.advance(performance.now(), true);
          state.gl?.getContext?.()?.finish?.();
        }
      }
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
            <GLSync />
            <InvalidateOnTimeChange timeMs={timeMs} />
            <JITStreamingScene currentTimeMs={timeMs} />
          </Suspense>
        </Canvas>
      </div>
    </Timegroup>
  );
}
