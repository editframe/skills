/**
 * React Three Fiber synchronization utilities for Editframe timeline integration.
 * 
 * These utilities handle the coordination between R3F's render loop and Editframe's
 * timeline system, ensuring that 3D content renders correctly in both live playback
 * and render clones.
 */

import { useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";

/**
 * Forces GPU sync (gl.finish()) on every R3F frame.
 * This ensures pixels are ready for capture in render clones.
 * 
 * Note: This component is kept for reference but should generally not be used.
 * The flushR3F function handles GPU sync more efficiently by only calling
 * finish() when needed (during addFrameTask callbacks).
 */
export function GLSync() {
  const { gl } = useThree();
  useFrame(() => {
    gl.getContext().finish();
  });
  return null;
}

/**
 * Triggers an R3F render when time changes.
 * Use with frameloop="demand" to invalidate the canvas when timeline time updates.
 */
export function InvalidateOnTimeChange({ timeMs }: { timeMs: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidate();
  }, [timeMs, invalidate]);
  return null;
}

/**
 * Imperatively flush R3F rendering pipeline.
 * 
 * This function:
 * 1. Accesses the R3F store via the undocumented __r3f property on the canvas
 * 2. Invalidates the scene to trigger a render
 * 3. Advances the render loop with the current timestamp
 * 4. Calls gl.finish() to force GPU sync (ensures pixels are ready for capture)
 * 
 * Call this from addFrameTask callbacks to ensure R3F content is rendered
 * synchronously before frame capture in render clones.
 * 
 * @param canvasContainer - The container element that holds the R3F canvas
 * 
 * @example
 * ```tsx
 * useLayoutEffect(() => {
 *   const tg = timegroupRef.current;
 *   if (!tg?.addFrameTask) return;
 *   
 *   return tg.addFrameTask(({ currentTimeMs }) => {
 *     flushSync(() => setTimeMs(currentTimeMs));
 *     flushR3F(canvasContainerRef.current);
 *   });
 * }, []);
 * ```
 */
export function flushR3F(canvasContainer: HTMLElement | null): void {
  if (!canvasContainer) return;

  const canvas = canvasContainer.querySelector('canvas');
  const r3fStore = (canvas as any)?.__r3f;

  if (r3fStore) {
    const state = r3fStore.store?.getState?.();
    if (state) {
      state.invalidate();
      state.advance(performance.now(), true);
      state.gl?.getContext?.()?.finish?.();
    }
  }
}
