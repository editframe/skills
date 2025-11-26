/**
 * Coordinate transformation functions for overlay system.
 *
 * Core invariant: Overlay layer translates but does not scale.
 *
 * Semantics (what should it be?): Pure functions that transform coordinates
 * between screen space and overlay layer coordinate space.
 */

/**
 * Transform screen coordinates to overlay layer coordinates.
 *
 * @param screenX - X coordinate in screen space (getBoundingClientRect)
 * @param screenY - Y coordinate in screen space (getBoundingClientRect)
 * @param overlayLayerRect - Bounding rect of overlay layer element
 * @returns Position in overlay layer coordinate space
 */
export function screenToOverlay(
  screenX: number,
  screenY: number,
  overlayLayerRect: DOMRect,
): { x: number; y: number } {
  return {
    x: screenX - overlayLayerRect.left,
    y: screenY - overlayLayerRect.top,
  };
}

/**
 * Transform overlay layer coordinates to screen coordinates.
 *
 * @param overlayX - X coordinate in overlay layer space
 * @param overlayY - Y coordinate in overlay layer space
 * @param overlayLayerRect - Bounding rect of overlay layer element
 * @returns Position in screen space
 */
export function overlayToScreen(
  overlayX: number,
  overlayY: number,
  overlayLayerRect: DOMRect,
): { x: number; y: number } {
  return {
    x: overlayX + overlayLayerRect.left,
    y: overlayY + overlayLayerRect.top,
  };
}

/**
 * Transform element's screen position to overlay position.
 * Includes width, height, and rotation.
 *
 * @param elementRect - Element's bounding rect (screen coordinates)
 * @param overlayLayerRect - Overlay layer's bounding rect
 * @param rotation - Element's rotation in degrees
 * @returns Complete overlay position
 */
export function elementScreenToOverlay(
  elementRect: DOMRect,
  overlayLayerRect: DOMRect,
  rotation: number = 0,
): {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
} {
  const position = screenToOverlay(
    elementRect.left,
    elementRect.top,
    overlayLayerRect,
  );

  return {
    x: position.x,
    y: position.y,
    width: elementRect.width, // Width/height stay the same (overlay doesn't scale)
    height: elementRect.height,
    rotation, // Rotation passes through unchanged
  };
}
