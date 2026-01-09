/**
 * Frame timing utilities for quantizing time values to frame boundaries.
 * These utilities ensure consistent frame-aligned timing across the codebase.
 */

/** Default FPS when none is specified */
export const DEFAULT_FPS = 30;

/**
 * Calculate the duration of a single frame in milliseconds.
 */
export function calculateFrameIntervalMs(fps: number): number {
  if (fps <= 0) return 1000 / DEFAULT_FPS;
  return 1000 / fps;
}

/**
 * Quantize a time value (in milliseconds) to the nearest frame boundary.
 * This ensures frame markers align perfectly with playhead position.
 */
export function quantizeToFrameTimeMs(timeMs: number, fps: number): number {
  if (!fps || fps <= 0) return timeMs;
  const frameDurationMs = calculateFrameIntervalMs(fps);
  return Math.round(timeMs / frameDurationMs) * frameDurationMs;
}

/**
 * Quantize a time value (in seconds) to the nearest frame boundary.
 * This ensures time values align with frame boundaries for consistent rendering.
 */
export function quantizeToFrameTimeS(timeSeconds: number, fps: number): number {
  if (!fps || fps <= 0) return timeSeconds;
  const frameDurationS = 1 / fps;
  return Math.round(timeSeconds / frameDurationS) * frameDurationS;
}

/**
 * Clamp and quantize a seek time to valid range.
 * Prevents "Sample not found" errors at video boundaries.
 * 
 * @param desiredSeekTimeMs - The desired seek time in milliseconds
 * @param durationMs - The total duration in milliseconds
 * @param fps - Frames per second (defaults to 30)
 * @returns Clamped and quantized time in milliseconds
 */
export function clampAndQuantizeSeekTimeMs(
  desiredSeekTimeMs: number,
  durationMs: number,
  fps: number = DEFAULT_FPS,
): number {
  if (durationMs <= 0) return 0;

  // Quantize to frame boundaries
  const quantizedMs = quantizeToFrameTimeMs(desiredSeekTimeMs, fps);

  // Clamp to valid range [0, lastFrameTime]
  // The last valid frame is at durationMs - frameDurationMs to ensure we don't
  // seek past the last decodable frame
  const frameDurationMs = calculateFrameIntervalMs(fps);
  const maxValidTime = Math.max(0, durationMs - frameDurationMs);
  return Math.max(0, Math.min(quantizedMs, maxValidTime));
}




