/**
 * Position calculation utilities for timeline with zoom support
 */

/**
 * Convert time in milliseconds to pixel position accounting for zoom
 */
export function timeToPixels(
  timeMs: number,
  durationMs: number,
  containerWidth: number,
  zoomScale: number,
): number {
  if (durationMs <= 0 || containerWidth <= 0) return 0;
  const pixelsPerSecond = (containerWidth * zoomScale) / durationMs;
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
  if (durationMs <= 0 || containerWidth <= 0) return 0;
  const pixelsPerSecond = (containerWidth * zoomScale) / durationMs;
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

