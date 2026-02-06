// @ts-nocheck - React Three Fiber JSX intrinsics
import React, { Suspense, useState, useEffect } from "react";
import { Timegroup } from "@editframe/react";
import { OffscreenCompositionCanvas } from "@editframe/react/r3f";
import * as THREE from "three";
import { JITStreamingScene } from "./jit-streaming-scene";

export function JITStreamingTimeline() {
  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    // Create worker only on client side
    const w = new Worker(
      new URL('./jit-streaming-worker.ts', import.meta.url),
      { type: 'module' }
    );
    setWorker(w);
    
    return () => w.terminate();
  }, []);

  // During SSR or before worker is ready, show nothing (will hydrate on client)
  if (!worker) {
    return (
      <Timegroup
        mode="fixed"
        duration="30s"
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16/10", background: "#1e2233" }}
      />
    );
  }

  return (
    <Timegroup
      mode="fixed"
      duration="30s"
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "16/10", background: "#1e2233" }}
    >
      <OffscreenCompositionCanvas
        worker={worker}
        fallback={
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            background: '#1e2233'
          }}>
            OffscreenCanvas not supported
          </div>
        }
        canvasProps={{
          shadows: true,
          dpr: [1, 2],
          gl: {
            preserveDrawingBuffer: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.8,
          },
          camera: { fov: 50, near: 0.1, far: 100 },
          scene: { background: new THREE.Color(0x1e2233), fog: new THREE.Fog(0x1e2233, 12, 28) },
        }}
      />
    </Timegroup>
  );
}
