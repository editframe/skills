/**
 * R3F (React Three Fiber) integration for Editframe compositions.
 *
 * This module provides components and utilities for rendering 3D scenes
 * with React Three Fiber in Editframe timelines, with support for:
 * - Offscreen canvas rendering in web workers (OffscreenCompositionCanvas)
 * - Main-thread rendering for compatibility (CompositionCanvas)
 * - Time synchronization with Editframe's timeline system
 * - Deterministic frame-by-frame rendering for video export
 */

export { OffscreenCompositionCanvas } from "./OffscreenCompositionCanvas";
export type { OffscreenCompositionCanvasProps } from "./OffscreenCompositionCanvas";

export { CompositionCanvas, useCompositionTime } from "./CompositionCanvas";
export type { CompositionCanvasProps } from "./CompositionCanvas";

export { renderOffscreen } from "./renderOffscreen";

export type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  RenderFramePayload,
} from "./worker-protocol";
