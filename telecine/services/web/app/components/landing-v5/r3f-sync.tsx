/**
 * React Three Fiber synchronization utilities for Editframe timeline integration.
 * 
 * These utilities handle the coordination between R3F's render loop and Editframe's
 * timeline system, ensuring that 3D content renders correctly in both live playback
 * and render clones.
 */

import { useEffect } from "react";
import { useThree, useFrame, _roots, flushSync as r3fFlushSync } from "@react-three/fiber";
import type { RootState } from "@react-three/fiber";

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
 * Look up the R3F root state for a canvas element.
 *
 * R3F v9 stores root state in a module-level Map (`_roots`), keyed by the
 * canvas DOM element. The legacy `canvas.__r3f` property does not exist in v9.
 */
export function getR3FState(canvas: HTMLCanvasElement | null): RootState | undefined {
  if (!canvas) return undefined;
  return _roots.get(canvas)?.store?.getState?.();
}

/**
 * Flush R3F's reconciler synchronously.
 *
 * After react-dom's flushSync processes a state update (e.g. setTimeMs),
 * R3F's separate reconciler still has pending work (updated props for
 * Three.js scene objects). This call forces R3F to commit those updates
 * synchronously so the scene graph is up to date before we render.
 */
export { r3fFlushSync };

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
 * @param canvasContainer - The container element that holds the R3F canvas
 */
export function flushR3F(canvasContainer: HTMLElement | null): void {
  if (!canvasContainer) return;

  const canvas = canvasContainer.querySelector('canvas') as HTMLCanvasElement | null;
  const state = getR3FState(canvas);

  if (!state?.gl || !state?.scene || !state?.camera) return;

  // 1. Run useFrame subscribers (camera, lights, etc.)
  const subs = state.internal?.subscribers;
  if (subs) {
    for (let i = 0; i < subs.length; i++) {
      try {
        const sub = subs[i]!;
        sub.ref.current(sub.store.getState(), 0);
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
