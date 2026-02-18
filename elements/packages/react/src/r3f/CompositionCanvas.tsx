/**
 * CompositionCanvas — R3F Canvas that automatically bridges
 * Editframe composition time into the 3D scene.
 *
 * Handles: addFrameTask → React state, preserveDrawingBuffer,
 * gl.finish(), frameloop="demand", and invalidation.
 *
 * Usage:
 * ```tsx
 * <Timegroup mode="fixed" duration="14s">
 *   <CompositionCanvas shadows>
 *     <MyScene />
 *   </CompositionCanvas>
 * </Timegroup>
 * ```
 *
 * Inside scene components, use `useCompositionTime()` to read the
 * current composition time in milliseconds.
 */

import * as React from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { flushSync } from "react-dom";
import type { CanvasProps } from "@react-three/fiber";

/* ━━ Context for composition time ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const CompositionTimeContext = createContext<{
  timeMs: number;
  durationMs: number;
}>({ timeMs: 0, durationMs: 0 });

/**
 * Hook to read the current composition time inside an R3F scene.
 * Must be used within a `<CompositionCanvas>`.
 *
 * @returns { timeMs, durationMs } — current time and total duration in ms
 */
export function useCompositionTime() {
  return useContext(CompositionTimeContext);
}

/* ━━ Internal: GL sync for renderToVideo ━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function GLSync() {
  const { gl } = useThree();
  useFrame(() => {
    gl.getContext().finish();
  });
  return null;
}

/* ━━ Internal: invalidate on time change ━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function InvalidateOnTimeChange({ timeMs }: { timeMs: number }) {
  const { invalidate } = useThree();
  // useLayoutEffect fires synchronously during flushSync, ensuring
  // invalidate() runs before the addFrameTask callback returns.
  useLayoutEffect(() => {
    invalidate();
  }, [timeMs, invalidate]);
  return null;
}

/* ━━ CompositionCanvas ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export interface CompositionCanvasProps extends Omit<CanvasProps, "frameloop"> {
  /** Extra styles for the container div */
  containerStyle?: React.CSSProperties;
  /** Extra className for the container div */
  containerClassName?: string;
}

export function CompositionCanvas({
  children,
  containerStyle,
  containerClassName,
  gl: glProp,
  ...canvasProps
}: CompositionCanvasProps) {
  const [timeMs, setTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Walk up to find the ef-timegroup ancestor
    const tg = el.closest("ef-timegroup") as HTMLElement & {
      addFrameTask?: (
        cb: (info: { ownCurrentTimeMs: number; durationMs: number }) => void,
      ) => () => void;
      durationMs?: number;
    } | null;

    if (!tg) {
      console.warn(
        "[CompositionCanvas] No ef-timegroup ancestor found. " +
        "Wrap CompositionCanvas inside a <Timegroup>.",
      );
      return;
    }

    if (tg.durationMs) setDurationMs(tg.durationMs);

    const cleanup = tg.addFrameTask?.(({ ownCurrentTimeMs, durationMs: dur }) => {
      // flushSync commits the state update synchronously so the
      // useLayoutEffect → invalidate() fires before we return.
      // R3F's demand render then runs useFrame subscribers (which
      // update instancedMesh matrices, cameras, etc.) and gl.render
      // in a single pass — no duplicate GPU work.
      flushSync(() => {
        setTimeMs(ownCurrentTimeMs);
        setDurationMs(dur);
      });
    });

    return cleanup;
  }, []);

  // Merge user gl options with required defaults
  const mergedGl = typeof glProp === "object"
    ? { preserveDrawingBuffer: true, ...glProp }
    : glProp ?? { preserveDrawingBuffer: true };

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
      <Canvas
        frameloop="demand"
        gl={mergedGl}
        {...canvasProps}
        style={{ width: "100%", height: "100%", ...canvasProps.style }}
      >
        <CompositionTimeContext.Provider value={{ timeMs, durationMs }}>
          <GLSync />
          <InvalidateOnTimeChange timeMs={timeMs} />
          {children}
        </CompositionTimeContext.Provider>
      </Canvas>
    </div>
  );
}
