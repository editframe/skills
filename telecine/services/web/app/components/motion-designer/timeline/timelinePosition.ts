/**
 * Position calculation utilities for timeline with zoom support
 */

// Base pixels per second at 1x zoom
const BASE_PIXELS_PER_SECOND = 100;

/**
 * Convert time in milliseconds to pixel position accounting for zoom
 * At 1x zoom: 100 pixels per second
 * At 10x zoom: 1000 pixels per second
 */
export function timeToPixels(
  timeMs: number,
  durationMs: number,
  containerWidth: number,
  zoomScale: number,
): number {
  if (durationMs <= 0) return 0;
  // Fixed pixels per second that scales with zoom
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomScale;
  return (timeMs / 1000) * pixelsPerSecond;
}

/**
 * Convert pixel position to time in milliseconds accounting for zoom
 */
export function pixelsToTime(
  pixels: number,
  durationMs: number,
  containerWidth: number,
  zoomScale: number,
): number {
  if (durationMs <= 0) return 0;
  // Fixed pixels per second that scales with zoom
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomScale;
  return (pixels / pixelsPerSecond) * 1000;
}

/**
 * Calculate the total content width needed for the timeline at a given zoom level
 */
export function calculateContentWidth(
  durationMs: number,
  containerWidth: number,
  zoomScale: number,
): number {
  return timeToPixels(durationMs, durationMs, containerWidth, zoomScale);
}
