/**
 * Core concept types for the overlay system.
 * 
 * The overlay system maintains one invariant: Coordinate Space Transformation
 * screen = canvas * scale + translate
 * canvas = (screen - translate) / scale
 */

/**
 * Browser computed position (source of truth).
 * The browser has already applied all transforms, animations, parent hierarchy.
 */
export interface ComputedElementPosition {
  screenX: number;  // Screen coordinates (from getBoundingClientRect)
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  rotation: number;  // Degrees (from computed transform)
}

/**
 * Overlay position (after coordinate transformation).
 * All values are in overlay layer coordinate space.
 */
export interface OverlayPosition {
  x: number;  // Overlay layer coordinates
  y: number;
  width: number;  // Already in screen space (overlay doesn't scale)
  height: number;
  rotation: number;  // Degrees
  coordinateSpace: "overlay";  // Invariant: always overlay space
}


