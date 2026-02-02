/**
 * Preview settings module with localStorage persistence.
 * Manages configuration for the preview rendering system.
 */

const STORAGE_KEY_NATIVE_CANVAS_API = "ef-preview-native-canvas-api-enabled";
const STORAGE_KEY_PRESENTATION_MODE = "ef-preview-presentation-mode";
const STORAGE_KEY_RENDER_MODE = "ef-preview-render-mode";
const STORAGE_KEY_RESOLUTION_SCALE = "ef-preview-resolution-scale";
const STORAGE_KEY_SHOW_STATS = "ef-preview-show-stats";
const STORAGE_KEY_SHOW_THUMBNAIL_TIMESTAMPS = "ef-preview-show-thumbnail-timestamps";

/**
 * Render mode for HTML-to-canvas capture operations.
 * - "foreignObject": SVG foreignObject serialization (fallback, works everywhere)
 * - "native": Chrome's experimental drawElementImage API (fastest when available)
 */
export type RenderMode = "foreignObject" | "native";

/**
 * Preview resolution scale factor.
 * Controls how much to reduce the preview render resolution for better performance.
 * - 1: Full resolution (default)
 * - 0.75: 3/4 resolution
 * - 0.5: Half resolution
 * - 0.25: Quarter resolution
 * - "auto": Adaptive resolution that scales down during motion to prevent dropped frames,
 *           and renders at full resolution when at rest
 */
export type PreviewResolutionScale = 1 | 0.75 | 0.5 | 0.25 | "auto";

/**
 * Preview presentation mode determines how content is rendered in the workbench.
 * - "clone": Show a clone with computed styles applied (alias for "computed")
 * - "dom": Show the original DOM content directly (alias for "original")
 * - "original": Show the original DOM content directly
 * - "computed": Show a clone with computed styles applied
 * - "canvas": Render to canvas using the active rendering path
 */
export type PreviewPresentationMode = "dom" | "canvas";

/**
 * Cached detection result for native HTML-in-Canvas API availability.
 * This is separate from the user preference - it detects browser capability.
 */
let _nativeApiAvailable: boolean | null = null;

/**
 * Detect if the native HTML-in-Canvas API (drawElementImage) is available in this browser.
 * This checks browser capability, not user preference.
 * 
 * The API is available in Chrome Canary with chrome://flags/#canvas-draw-element
 * @see https://github.com/WICG/html-in-canvas
 */
export function isNativeCanvasApiAvailable(): boolean {
  if (_nativeApiAvailable === null) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    _nativeApiAvailable = ctx !== null && "drawElementImage" in ctx;
  }
  return _nativeApiAvailable;
}

/**
 * Check if the native Canvas API is enabled by the user.
 * Returns true only if:
 * 1. The API is available in the browser
 * 2. The user has not explicitly disabled it
 * 
 * Default is enabled when available (opt-out model).
 */
export function isNativeCanvasApiEnabled(): boolean {
  if (!isNativeCanvasApiAvailable()) {
    return false;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NATIVE_CANVAS_API);
    // Default to true (enabled) when available, unless explicitly disabled
    if (stored === null) {
      return true;
    }
    return stored === "true";
  } catch {
    // localStorage not available (e.g., private browsing)
    return true;
  }
}

/**
 * Set whether the native Canvas API should be used (when available).
 * Persists to localStorage and dispatches a change event.
 */
export function setNativeCanvasApiEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_NATIVE_CANVAS_API, String(enabled));
  } catch {
    // localStorage not available
  }
  
  // Dispatch event so components can react to the change
  window.dispatchEvent(new CustomEvent("ef-preview-settings-changed", {
    detail: { nativeCanvasApiEnabled: enabled }
  }));
}

/**
 * Get the current raw user preference (ignoring availability).
 * Returns null if no preference is set.
 */
export function getNativeCanvasApiPreference(): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NATIVE_CANVAS_API);
    if (stored === null) {
      return null;
    }
    return stored === "true";
  } catch {
    return null;
  }
}

/**
 * Subscribe to preview settings changes.
 * @returns Unsubscribe function
 */
export function onPreviewSettingsChanged(
  callback: (detail: PreviewSettingsChangedDetail) => void
): () => void {
  const handler = (event: Event) => {
    callback((event as CustomEvent).detail);
  };
  window.addEventListener("ef-preview-settings-changed", handler);
  return () => window.removeEventListener("ef-preview-settings-changed", handler);
}

/**
 * Detail object for preview settings change events.
 */
export interface PreviewSettingsChangedDetail {
  nativeCanvasApiEnabled?: boolean;
  presentationMode?: PreviewPresentationMode;
  renderMode?: RenderMode;
  resolutionScale?: PreviewResolutionScale;
  showStats?: boolean;
  showThumbnailTimestamps?: boolean;
}

/**
 * Get the current preview presentation mode.
 * Defaults to "dom" if not set.
 */
export function getPreviewPresentationMode(): PreviewPresentationMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PRESENTATION_MODE);
    if (stored === "dom" || stored === "canvas") {
      return stored;
    }
    return "dom";
  } catch {
    return "dom";
  }
}

/**
 * Set the preview presentation mode.
 * Persists to localStorage and dispatches a change event.
 */
export function setPreviewPresentationMode(mode: PreviewPresentationMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRESENTATION_MODE, mode);
  } catch {
    // localStorage not available
  }
  
  // Dispatch event so components can react to the change
  window.dispatchEvent(new CustomEvent("ef-preview-settings-changed", {
    detail: { presentationMode: mode }
  }));
}

/**
 * Get the current render mode for HTML-to-canvas capture.
 * Defaults to "native" if available, otherwise "foreignObject".
 * 
 * Checks EF_NATIVE_RENDER URL parameter to force native mode when set.
 */
export function getRenderMode(): RenderMode {
  // Check URL parameter first (CLI flag override)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("EF_NATIVE_RENDER") === "1") {
      // Force native mode if available, otherwise fall back to foreignObject
      return isNativeCanvasApiAvailable() ? "native" : "foreignObject";
    }
  } catch {
    // URL parsing failed, continue with normal logic
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY_RENDER_MODE);
    if (stored === "foreignObject" || stored === "native") {
      return stored;
    }
    // Default: prefer native if available, otherwise foreignObject
    return isNativeCanvasApiAvailable() ? "native" : "foreignObject";
  } catch {
    return isNativeCanvasApiAvailable() ? "native" : "foreignObject";
  }
}

/**
 * Set the render mode for HTML-to-canvas capture.
 * Persists to localStorage and dispatches a change event.
 */
export function setRenderMode(mode: RenderMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_RENDER_MODE, mode);
  } catch {
    // localStorage not available
  }
  
  // Dispatch event so components can react to the change
  window.dispatchEvent(new CustomEvent("ef-preview-settings-changed", {
    detail: { renderMode: mode }
  }));
}

/**
 * Valid numeric resolution scale values.
 */
const VALID_NUMERIC_SCALES: number[] = [1, 0.75, 0.5, 0.25];

/**
 * Get the current preview resolution scale.
 * Defaults to 1 (full resolution) if not set.
 */
export function getPreviewResolutionScale(): PreviewResolutionScale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RESOLUTION_SCALE);
    if (stored !== null) {
      // Check for "auto" string first
      if (stored === "auto") {
        return "auto";
      }
      // Then check numeric values
      const parsed = parseFloat(stored);
      if (VALID_NUMERIC_SCALES.includes(parsed)) {
        return parsed as PreviewResolutionScale;
      }
    }
    return 1;
  } catch {
    return 1;
  }
}

/**
 * Set the preview resolution scale.
 * Persists to localStorage and dispatches a change event.
 */
export function setPreviewResolutionScale(scale: PreviewResolutionScale): void {
  try {
    localStorage.setItem(STORAGE_KEY_RESOLUTION_SCALE, String(scale));
  } catch {
    // localStorage not available
  }
  
  // Dispatch event so components can react to the change
  window.dispatchEvent(new CustomEvent("ef-preview-settings-changed", {
    detail: { resolutionScale: scale }
  }));
}

/**
 * Get whether performance stats should be shown.
 * Defaults to false (stats hidden by default).
 */
export function getShowStats(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SHOW_STATS);
    return stored === "true";
  } catch {
    return false;
  }
}

/**
 * Set whether performance stats should be shown.
 * Persists to localStorage and dispatches a change event.
 */
export function setShowStats(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_SHOW_STATS, String(enabled));
  } catch {
    // localStorage not available
  }
  
  // Dispatch event so components can react to the change
  window.dispatchEvent(new CustomEvent("ef-preview-settings-changed", {
    detail: { showStats: enabled }
  }));
}

/**
 * Get whether thumbnail timestamps should be shown.
 * Defaults to false (timestamps hidden by default).
 */
export function getShowThumbnailTimestamps(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SHOW_THUMBNAIL_TIMESTAMPS);
    return stored === "true";
  } catch {
    return false;
  }
}

/**
 * Set whether thumbnail timestamps should be shown.
 * Persists to localStorage and dispatches a change event.
 */
export function setShowThumbnailTimestamps(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_SHOW_THUMBNAIL_TIMESTAMPS, String(enabled));
  } catch {
    // localStorage not available
  }
  
  // Dispatch event so components can react to the change
  window.dispatchEvent(new CustomEvent("ef-preview-settings-changed", {
    detail: { showThumbnailTimestamps: enabled }
  }));
}

