import { createContext } from "@lit/context";

/**
 * The core invariant of the timeline system.
 * Everything else (ruler positions, track positions, playhead position) derives from this.
 */
export interface TimelineState {
  /** Pixels per millisecond - the single zoom value */
  pixelsPerMs: number;
  /** Current playhead position in milliseconds */
  currentTimeMs: number;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Viewport scroll position in pixels - single source of truth for visible time range */
  viewportScrollLeft: number;
  /** Seek to a specific time */
  seek: (timeMs: number) => void;
  /** Zoom in */
  zoomIn: () => void;
  /** Zoom out */
  zoomOut: () => void;
}

export const timelineStateContext = createContext<TimelineState>("timeline-state");

/**
 * Convert time to pixel position
 */
export function timeToPx(timeMs: number, pixelsPerMs: number): number {
  return timeMs * pixelsPerMs;
}

/**
 * Convert pixel position to time
 */
export function pxToTime(px: number, pixelsPerMs: number): number {
  return px / pixelsPerMs;
}

/**
 * Default pixels per ms at 100% zoom (100 pixels per second)
 */
export const DEFAULT_PIXELS_PER_MS = 0.1;

/**
 * Calculate pixels per ms from a zoom scale
 */
export function zoomToPixelsPerMs(zoomScale: number): number {
  return DEFAULT_PIXELS_PER_MS * zoomScale;
}

/**
 * Calculate zoom scale from pixels per ms
 */
export function pixelsPerMsToZoom(pixelsPerMs: number): number {
  return pixelsPerMs / DEFAULT_PIXELS_PER_MS;
}


