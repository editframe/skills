/**
 * Worker-side entry point for offscreen R3F rendering.
 * 
 * This extends @react-three/offscreen's render() function with:
 * - Time synchronization store for composition time
 * - Frame rendering + pixel capture pipeline
 * - Support for deterministic frame-by-frame rendering
 * 
 * Based on @react-three/offscreen render.ts but extended for Editframe's needs.
 */

import * as React from 'react';
import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
import mitt, { Emitter } from 'mitt';
import { extend, createRoot, createEvents, ReconcilerRoot, Dpr, Size, RootState, EventManager, Events } from '@react-three/fiber';
import type { UseBoundStore } from 'zustand';
import { DomEvent } from '@react-three/fiber/dist/declarations/src/core/events';
import type { RenderFramePayload } from './worker-protocol';

/* ━━ Event handling (from @react-three/offscreen) ━━━━━━━━━━━━━━━━━━━━━ */

const EVENTS = {
  onClick: ['click', false],
  onContextMenu: ['contextmenu', false],
  onDoubleClick: ['dblclick', false],
  onWheel: ['wheel', true],
  onPointerDown: ['pointerdown', true],
  onPointerUp: ['pointerup', true],
  onPointerLeave: ['pointerleave', true],
  onPointerMove: ['pointermove', true],
  onPointerCancel: ['pointercancel', true],
  onLostPointerCapture: ['lostpointercapture', true],
} as const;

function createPointerEvents(emitter: Emitter<Record<any, unknown>>) {
  return (store: UseBoundStore<RootState>): EventManager<HTMLElement> => {
    const { handlePointer } = createEvents(store);

    return {
      priority: 1,
      enabled: true,
      compute(event, state) {
        state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1);
        state.raycaster.setFromCamera(state.pointer, state.camera);
      },

      connected: undefined,
      handlers: Object.keys(EVENTS).reduce(
        (acc, key) => ({ ...acc, [key]: handlePointer(key) }),
        {}
      ) as unknown as Events,
      connect: (target) => {
        const { set, events } = store.getState();
        events.disconnect?.();
        set((state) => ({ events: { ...state.events, connected: target } }));
        Object.entries(events?.handlers ?? []).forEach(([name, event]) => {
          const [eventName] = EVENTS[name as keyof typeof EVENTS];
          emitter.on(eventName as any, event as any);
        });
      },
      disconnect: () => {
        const { set, events } = store.getState();
        if (events.connected) {
          Object.entries(events.handlers ?? []).forEach(([name, event]) => {
            const [eventName] = EVENTS[name as keyof typeof EVENTS];
            emitter.off(eventName as any, event as any);
          });
          set((state) => ({ events: { ...state.events, connected: undefined } }));
        }
      },
    };
  };
}

/* ━━ Time synchronization store ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface TimeStore {
  timeMs: number;
  durationMs: number;
  listeners: Set<() => void>;
  update(timeMs: number, durationMs: number): void;
}

const timeStore: TimeStore = {
  timeMs: 0,
  durationMs: 0,
  listeners: new Set(),
  update(timeMs: number, durationMs: number) {
    this.timeMs = timeMs;
    this.durationMs = durationMs;
    this.listeners.forEach(l => l());
  }
};

/**
 * Hook to read composition time inside R3F scenes running in a worker.
 * Must be used within a scene rendered by renderOffscreen().
 */
export function useCompositionTime() {
  const timeMs = useSyncExternalStore(
    (callback) => {
      timeStore.listeners.add(callback);
      return () => timeStore.listeners.delete(callback);
    },
    () => timeStore.timeMs
  );
  
  const durationMs = useSyncExternalStore(
    (callback) => {
      timeStore.listeners.add(callback);
      return () => timeStore.listeners.delete(callback);
    },
    () => timeStore.durationMs
  );
  
  return { timeMs, durationMs };
}

/* ━━ Worker entry point ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Render a React Three Fiber scene in a web worker with offscreen canvas.
 * 
 * @param children - React node containing the R3F scene
 * 
 * @example
 * ```typescript
 * // worker.ts
 * import { renderOffscreen } from '@editframe/react/r3f';
 * import { MyScene } from './MyScene';
 * 
 * renderOffscreen(<MyScene />);
 * ```
 */
export function renderOffscreen(children: React.ReactNode) {
  console.log('[renderOffscreen] Worker started, extending THREE');
  extend(THREE);

  let root: ReconcilerRoot<HTMLCanvasElement> | null = null;
  let offscreenCanvas: OffscreenCanvas | null = null;
  let dpr: Dpr = [1, 2];
  let size: Size = { width: 0, height: 0, top: 0, left: 0, updateStyle: false };
  const emitter = mitt();
  
  console.log('[renderOffscreen] Ready to receive messages');

  /* ━━ Init handler ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  
  const handleInit = (payload: any) => {
    const { props, drawingSurface: canvas, width, top, left, height, pixelRatio } = payload;
    
    console.log('[renderOffscreen] Init received', { width, height, pixelRatio });
    
    try {
      // Unmount root if already mounted
      if (root) {
        root.unmount();
      }

      offscreenCanvas = canvas;

      // Shim the canvas into a fake window/document
      Object.assign(canvas, {
        pageXOffset: left,
        pageYOffset: top,
        clientLeft: left,
        clientTop: top,
        clientWidth: width,
        clientHeight: height,
        style: { touchAction: 'none' },
        ownerDocument: canvas,
        documentElement: canvas,
        getBoundingClientRect() {
          return size;
        },
        setAttribute() {},
        setPointerCapture() {},
        releasePointerCapture() {},
        addEventListener(event: string, callback: () => void) {
          emitter.on(event, callback);
        },
        removeEventListener(event: string, callback: () => void) {
          emitter.off(event, callback);
        },
      });

      // Create react-three-fiber root
      root = createRoot(canvas);
      
      // Configure root
      root.configure({
        events: createPointerEvents(emitter),
        size: (size = { width, height, top, left, updateStyle: false }),
        dpr: (dpr = Math.min(Math.max(1, pixelRatio), 2)),
        frameloop: 'demand',  // Critical: only render when invalidated
        ...props,
        onCreated: (state) => {
          if (props.eventPrefix) {
            state.setEvents({
              compute: (event, state) => {
                const x = event[(props.eventPrefix + 'X') as keyof DomEvent] as number;
                const y = event[(props.eventPrefix + 'Y') as keyof DomEvent] as number;
                state.pointer.set((x / state.size.width) * 2 - 1, -(y / state.size.height) * 2 + 1);
                state.raycaster.setFromCamera(state.pointer, state.camera);
              },
            });
          }
        },
      });

      // Render children once
      console.log('[renderOffscreen] Rendering children');
      root.render(children);
      console.log('[renderOffscreen] Init complete');
    } catch (e: any) {
      console.error('[renderOffscreen] Init error:', e);
      postMessage({ type: 'error', payload: e?.message });
    }

    // Shim window to the canvas from here on
    (self as any).window = canvas;
  };

  /* ━━ Resize handler ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  
  const handleResize = ({ width, height, top, left }: Size) => {
    if (!root) return;
    root.configure({ size: (size = { width, height, top, left, updateStyle: false }), dpr });
  };

  /* ━━ Event handler ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  
  const handleEvents = (payload: any) => {
    emitter.emit(payload.eventName, { ...payload, preventDefault() {}, stopPropagation() {} });
  };

  /* ━━ Props handler ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  
  const handleProps = (payload: any) => {
    if (!root) return;
    if (payload.dpr) dpr = payload.dpr;
    root.configure({ size, dpr, ...payload });
  };

  /* ━━ Frame rendering + pixel capture ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  
  const handleRenderFrame = async ({ timeMs, durationMs, requestId }: RenderFramePayload) => {
    console.log('[renderOffscreen] Render frame', { timeMs, requestId });
    
    try {
      // 1. Update time store (triggers React re-render via useSyncExternalStore)
      timeStore.update(timeMs, durationMs);

      // 2. Force R3F to process the state change and render synchronously
      const state = root?.store?.getState?.();
      if (!state) {
        throw new Error('[renderOffscreen] No R3F root state available');
      }
      
      if (state?.gl && state?.scene && state?.camera) {
        // Mark as needing render
        state.invalidate();
        
        // Synchronous render (bypasses RAF)
        state.gl.render(state.scene, state.camera);
        
        // GPU sync - ensure all WebGL commands complete
        state.gl.getContext().finish();
      } else {
        throw new Error('[renderOffscreen] Missing gl/scene/camera in state');
      }

      // 3. Capture pixels without clearing the canvas
      if (!offscreenCanvas) {
        throw new Error('[renderOffscreen] No offscreen canvas available');
      }
      
      const bitmap = await createImageBitmap(offscreenCanvas);
      console.log('[renderOffscreen] Bitmap created', { width: bitmap.width, height: bitmap.height });

      // 4. Transfer back to main thread (zero-copy transfer)
      postMessage({ type: 'frameRendered', requestId, bitmap }, [bitmap as any]);
    } catch (e: any) {
      console.error('[renderOffscreen] Frame render error:', e);
      postMessage({ type: 'error', message: e?.message || 'Unknown error in handleRenderFrame' });
    }
  };

  /* ━━ Message routing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  
  const handlerMap = {
    resize: handleResize,
    init: handleInit,
    dom_events: handleEvents,
    props: handleProps,
    renderFrame: handleRenderFrame,
  };

  self.onmessage = (event) => {
    const { type, payload } = event.data;
    const handler = handlerMap[type as keyof typeof handlerMap];
    if (handler) handler(payload);
  };

  /* ━━ Three.js shims for worker environment ━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  
  // Override ImageLoader to use fetch + createImageBitmap instead of DOM Image
  (THREE.ImageLoader.prototype as any).load = function (
    url: string,
    onLoad: (img: ImageBitmap) => void,
    onProgress: () => void,
    onError: (e: Error) => void
  ) {
    if (this.path !== undefined) url = this.path + url;
    url = this.manager.resolveURL(url);
    const scope = this;
    const cached = THREE.Cache.get(url);

    if (cached !== undefined) {
      scope.manager.itemStart(url);
      if (onLoad) onLoad(cached);
      scope.manager.itemEnd(url);
      return cached;
    }

    fetch(url)
      .then((res) => res.blob())
      .then((res) => createImageBitmap(res, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
      .then((bitmap) => {
        THREE.Cache.add(url, bitmap);
        if (onLoad) onLoad(bitmap);
        scope.manager.itemEnd(url);
      })
      .catch(onError);
    
    return {};
  };

  /* ━━ DOM shims for worker environment ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  
  (self as any).window = {};
  (self as any).document = {};
  (self as any).Image = class {
    height = 1;
    width = 1;
    set onload(callback: any) {
      callback(true);
    }
  };
}
