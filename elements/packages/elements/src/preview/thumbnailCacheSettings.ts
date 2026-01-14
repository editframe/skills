/**
 * Thumbnail cache settings module with localStorage persistence.
 * Manages configuration for the thumbnail cache system.
 */

const STORAGE_KEY_MAX_SIZE = "ef-thumbnail-cache-max-size";

/**
 * Default maximum cache size (number of items).
 */
const DEFAULT_MAX_SIZE = 1000;

/**
 * Get the current thumbnail cache max size.
 * Defaults to 1000 if not set.
 */
export function getThumbnailCacheMaxSize(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MAX_SIZE);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return DEFAULT_MAX_SIZE;
  } catch {
    return DEFAULT_MAX_SIZE;
  }
}

/**
 * Set the thumbnail cache max size.
 * Persists to localStorage and dispatches a change event.
 */
export function setThumbnailCacheMaxSize(size: number): void {
  if (size <= 0) {
    throw new Error("Cache size must be greater than 0");
  }
  
  try {
    localStorage.setItem(STORAGE_KEY_MAX_SIZE, String(size));
  } catch {
    // localStorage not available
  }
  
  // Dispatch event so components can react to the change
  window.dispatchEvent(new CustomEvent("ef-thumbnail-cache-settings-changed", {
    detail: { maxSize: size }
  }));
}

/**
 * Subscribe to thumbnail cache settings changes.
 * @returns Unsubscribe function
 */
export function onThumbnailCacheSettingsChanged(
  callback: (detail: ThumbnailCacheSettingsChangedDetail) => void
): () => void {
  const handler = (event: Event) => {
    callback((event as CustomEvent).detail);
  };
  window.addEventListener("ef-thumbnail-cache-settings-changed", handler);
  return () => window.removeEventListener("ef-thumbnail-cache-settings-changed", handler);
}

/**
 * Detail object for thumbnail cache settings change events.
 */
export interface ThumbnailCacheSettingsChangedDetail {
  maxSize?: number;
}
