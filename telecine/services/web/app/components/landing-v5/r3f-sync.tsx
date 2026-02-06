/**
 * React Three Fiber synchronization utilities for Editframe timeline integration.
 * 
 * @deprecated These utilities are for main-thread R3F rendering only.
 * For new code, use OffscreenCompositionCanvas from @editframe/react/r3f which
 * renders in a web worker and continues working even when the browser tab is hidden.
 * 
 * These utilities handle the coordination between R3F's render loop and Editframe's
 * timeline system, ensuring that 3D content renders correctly in both live playback
 * and render clones.
 * 
 * LIMITATION: Main-thread rendering is suspended by Chrome when the tab is hidden,
 * causing video exports to capture frozen frames. Use OffscreenCompositionCanvas
 * to avoid this issue.
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
 * Imperatively flush R3F rendering pipeline with synchronous WebGL rendering.
 * 
 * This function bypasses R3F's requestAnimationFrame-based render loop and directly
 * calls the WebGL render function. This is critical for timeline-driven rendering where:
 * - Frames must render deterministically regardless of tab visibility
 * - Export rendering happens faster than display refresh rate
 * - Multiple frames may be rendered in background tabs
 * 
 * The function:
 * 1. Accesses the R3F store via the undocumented __r3f property on the canvas
 * 2. Directly calls gl.render(scene, camera) to render synchronously
 * 3. Calls gl.finish() to force GPU sync (ensures pixels are ready for capture)
 * 
 * This avoids the RAF-based advance() method which:
 * - Gets throttled/paused in hidden browser tabs
 * - Is capped at display refresh rate (typically 60fps)
 * - Renders asynchronously, breaking deterministic frame capture
 * 
 * **CRITICAL LIMITATION**: Chrome suspends WebGL rendering in hidden tabs.
 * Even though we call gl.render() directly, Chrome's renderer process is suspended
 * when the tab is not visible, causing WebGL commands to not execute. This means:
 * - Video exports will capture stale/frozen frames if the tab is hidden
 * - Users MUST keep the rendering tab visible during export
 * - No reliable workaround exists without --disable-renderer-backgrounding flag
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
    if (state?.gl && state?.scene && state?.camera) {
      // Warn if tab is hidden during rendering (WebGL commands won't execute)
      if (document.hidden) {
        console.warn(
          '[flushR3F] Tab is hidden - WebGL rendering is suspended by Chrome. ' +
          'Video frames will be frozen. Keep the tab visible during export.'
        );
      }
      
      // Direct synchronous WebGL render - bypasses RAF entirely
      state.gl.render(state.scene, state.camera);
      // Force GPU sync to ensure pixels are ready for capture
      state.gl.getContext().finish();
    }
  }
}
