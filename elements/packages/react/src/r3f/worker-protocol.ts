/**
 * Message protocol for main thread <-> worker communication in offscreen R3F rendering.
 *
 * These messages are additive to @react-three/offscreen's built-in messages
 * (init, resize, dom_events, props). Our custom messages handle time synchronization
 * and pixel capture for video export.
 */

/**
 * Messages sent from main thread to worker.
 */
export type MainToWorkerMessage = {
  type: "renderFrame";
  timeMs: number;
  durationMs: number;
  requestId: number;
};

/**
 * Messages sent from worker to main thread.
 */
export type WorkerToMainMessage =
  | { type: "frameRendered"; requestId: number; bitmap: ImageBitmap }
  | { type: "error"; message: string };

/**
 * Payload for renderFrame message.
 */
export interface RenderFramePayload {
  timeMs: number;
  durationMs: number;
  requestId: number;
}
