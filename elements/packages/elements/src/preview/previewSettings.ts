/**
 * Preview settings module with localStorage persistence.
 * Manages configuration for the preview rendering system.
 */

const STORAGE_KEY_NATIVE_CANVAS_API = "ef-preview-native-canvas-api-enabled";
const STORAGE_KEY_PRESENTATION_MODE = "ef-preview-presentation-mode";
const STORAGE_KEY_RENDER_MODE = "ef-preview-render-mode";
const STORAGE_KEY_RESOLUTION_SCALE = "ef-preview-resolution-scale";

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
 */
export type PreviewResolutionScale = 1 | 0.75 | 0.5 | 0.25;

/**
 * Preview presentation mode determines how content is rendered in the workbench.
 * - "original": Show the original DOM content directly
 * - "computed": Show a clone with computed styles applied
 * - "canvas": Render to canvas using the active rendering path
 */
export type PreviewPresentationMode = "original" | "computed" | "canvas";

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
}

/**
 * Get the current preview presentation mode.
 * Defaults to "original" if not set.
 */
export function getPreviewPresentationMode(): PreviewPresentationMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PRESENTATION_MODE);
    if (stored === "original" || stored === "computed" || stored === "canvas") {
      return stored;
    }
    return "original";
  } catch {
    return "original";
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
 */
export function getRenderMode(): RenderMode {
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
 * Valid resolution scale values.
 */
const VALID_RESOLUTION_SCALES: PreviewResolutionScale[] = [1, 0.75, 0.5, 0.25];

/**
 * Get the current preview resolution scale.
 * Defaults to 1 (full resolution) if not set.
 */
export function getPreviewResolutionScale(): PreviewResolutionScale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RESOLUTION_SCALE);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (VALID_RESOLUTION_SCALES.includes(parsed as PreviewResolutionScale)) {
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

