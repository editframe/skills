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
 * Yield one macrotask via MessageChannel.
 *
 * React's scheduler (used by R3F's reconciler) also uses MessageChannel,
 * so yielding a macrotask gives it a chance to commit pending fiber work.
 * Unlike setTimeout(0), MessageChannel is NOT throttled in hidden tabs.
 */
export function yieldToScheduler(): Promise<void> {
  return new Promise(resolve => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(null);
  });
}

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
 * Imperatively flush R3F rendering pipeline with synchronous WebGL rendering.
 *
 * Replaces R3F's rAF-driven advance() cycle entirely so that timeline-driven
 * rendering works regardless of tab visibility. The three steps mirror what
 * advance() does internally:
 *
 *   1. Invoke useFrame subscribers — updates camera, lights, and any other
 *      objects that derive state inside useFrame callbacks.
 *   2. gl.render(scene, camera) — synchronous WebGL draw.
 *   3. gl.finish() — GPU sync so pixels are ready for readback.
 *
 * Pixel capture from the WebGL canvas is handled separately by
 * readWebGLPixels() in serializeTimelineDirect.ts (uses gl.readPixels to
 * bypass the compositor's presentation layer, which is suspended in hidden
 * browser tabs).
 *
 * @param canvasContainer - The container element that holds the R3F canvas
 */
export function flushR3F(canvasContainer: HTMLElement | null): void {
  if (!canvasContainer) return;

  const canvas = canvasContainer.querySelector('canvas');
  const r3fStore = (canvas as any)?.__r3f;

  if (r3fStore) {
    const state = r3fStore.store?.getState?.();
    if (state?.gl && state?.scene && state?.camera) {
      // 1. Run useFrame subscribers (camera, lights, etc.)
      //    Without this, objects that update in useFrame are frozen when
      //    advance() doesn't fire (hidden tabs, faster-than-realtime export).
      if (state.internal?.subscribers) {
        for (const sub of state.internal.subscribers) {
          try {
            sub.ref.current(state, 0);
          } catch (e) {
            console.warn('[flushR3F] useFrame subscriber error:', e);
          }
        }
      }

      // 2. Synchronous WebGL render
      state.gl.render(state.scene, state.camera);

      // 3. GPU sync — ensures drawing buffer is complete for readPixels
      state.gl.getContext().finish();
    }
  }
}
