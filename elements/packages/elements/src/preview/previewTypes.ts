/**
 * Shared types and constants for preview rendering.
 * 
 * Consolidates duplicate definitions from renderTimegroupToCanvas.ts and
 * renderTimegroupPreview.ts into a single source of truth.
 */

// ============================================================================
// Temporal Types
// ============================================================================

/**
 * Element with temporal properties (startTimeMs, endTimeMs).
 * Used for temporal visibility checks during preview rendering.
 */
export interface TemporalElement extends Element {
  startTimeMs?: number;
  endTimeMs?: number;
  src?: string;
}

/**
 * Type guard to check if an element has temporal properties.
 */
export function isTemporal(el: Element): el is TemporalElement {
  return "startTimeMs" in el && "endTimeMs" in el;
}

/**
 * Get temporal bounds for an element, treating invalid ranges as unbounded.
 * Invalid range (end <= start) means element hasn't computed its duration yet.
 */
export function getTemporalBounds(el: Element): { startMs: number; endMs: number } {
  if (!isTemporal(el)) return { startMs: -Infinity, endMs: Infinity };

  const startMs = el.startTimeMs ?? -Infinity;
  const endMs = el.endTimeMs ?? Infinity;

  // Invalid range (end <= start) means element hasn't computed its duration yet
  if (endMs <= startMs) return { startMs: -Infinity, endMs: Infinity };

  return { startMs, endMs };
}

/**
 * Check if an element is temporally visible at the given time.
 */
export function isVisibleAtTime(element: Element, timeMs: number): boolean {
  const { startMs, endMs } = getTemporalBounds(element);
  return timeMs >= startMs && timeMs <= endMs;
}

// ============================================================================
// Constants
// ============================================================================

/** Default timegroup dimensions when not measurable */
export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;

/** Default scale for thumbnail captures */
export const DEFAULT_THUMBNAIL_SCALE = 0.25;

/** Default timeout for blocking content readiness mode (ms) */
export const DEFAULT_BLOCKING_TIMEOUT_MS = 5000;

/** JPEG quality settings for different canvas scales */
export const JPEG_QUALITY_HIGH = 0.95;
export const JPEG_QUALITY_MEDIUM = 0.85;

// ============================================================================
// Container Creation
// ============================================================================

/**
 * Options for creating a preview container.
 */
export interface PreviewContainerOptions {
  width: number;
  height: number;
  background?: string;
  position?: "relative" | "absolute" | "fixed";
}

/**
 * Create a preview container with standard styling.
 * Consolidates the repeated container creation pattern across preview functions.
 */
export function createPreviewContainer(options: PreviewContainerOptions): HTMLDivElement {
  const { width, height, background = "#000", position = "relative" } = options;

  const container = document.createElement("div");
  container.style.cssText = `
    width: ${width}px;
    height: ${height}px;
    position: ${position};
    overflow: hidden;
    background: ${background};
  `;
  return container;
}

// ============================================================================
// Style Injection
// ============================================================================

/**
 * Inject document styles into a container for foreignObject rendering.
 * SVG foreignObject needs all CSS rules inlined since it can't access
 * the document's stylesheets.
 */
export function injectDocumentStyles(
  container: HTMLElement,
  collectStyles: () => string,
): HTMLStyleElement {
  const styleEl = document.createElement("style");
  styleEl.textContent = collectStyles();
  container.appendChild(styleEl);
  return styleEl;
}
