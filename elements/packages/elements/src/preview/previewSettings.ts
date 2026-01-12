/**
 * Preview settings module with localStorage persistence.
 * Manages configuration for the preview rendering system.
 */

const STORAGE_KEY_NATIVE_CANVAS_API = "ef-preview-native-canvas-api-enabled";
const STORAGE_KEY_PRESENTATION_MODE = "ef-preview-presentation-mode";

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

