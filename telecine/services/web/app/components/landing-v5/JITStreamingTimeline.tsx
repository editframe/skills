// @ts-nocheck - React Three Fiber JSX intrinsics
import React, { Suspense, useState, useLayoutEffect, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { Timegroup } from "@editframe/react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { JITStreamingScene } from "./jit-streaming-scene";
import { InvalidateOnTimeChange, flushR3F } from "./r3f-sync";


export function JITStreamingTimeline() {
  const timegroupRef = useRef(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [timeMs, setTimeMs] = useState(0);

  useLayoutEffect(() => {
    const tg = timegroupRef.current;
    if (!tg?.addFrameTask) return;

    return tg.addFrameTask(({ currentTimeMs }: { currentTimeMs: number }) => {
      flushSync(() => {
        setTimeMs(currentTimeMs);
      });

      flushR3F(canvasContainerRef.current);
    });
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && canvasContainerRef.current) {
        flushR3F(canvasContainerRef.current);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Listen for WebGL context loss to confirm Chrome is actually killing it
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      const canvas = container.querySelector("canvas");
      if (canvas) {
        observer.disconnect();
        canvas.addEventListener("webglcontextlost", (e) => {
          console.error(
            "[JITStreamingTimeline] WebGL context LOST.",
            "document.hidden:", document.hidden,
            "visibilityState:", document.visibilityState,
            "event:", e,
          );
        });
        canvas.addEventListener("webglcontextrestored", () => {
          console.warn("[JITStreamingTimeline] WebGL context restored.");
        });
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    // Also check if canvas already exists
    const existing = container.querySelector("canvas");
    if (existing) {
      observer.disconnect();
      existing.addEventListener("webglcontextlost", (e) => {
        console.error(
          "[JITStreamingTimeline] WebGL context LOST.",
          "document.hidden:", document.hidden,
          "visibilityState:", document.visibilityState,
          "event:", e,
        );
      });
      existing.addEventListener("webglcontextrestored", () => {
        console.warn("[JITStreamingTimeline] WebGL context restored.");
      });
    }

    return () => observer.disconnect();
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
