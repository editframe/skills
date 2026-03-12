/**
 * Coordinate transformation utilities for the canvas overlay system.
 *
 * The canvas uses a two-layer system:
 * 1. Content layer: Scales with zoom (transform: translate(x,y) scale(scale))
 * 2. Overlay layer: Only translates, does not scale (transform: translate(x,y))
 *
 * This module provides utilities to convert between coordinate spaces.
 */

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Convert canvas coordinates to screen coordinates.
 * Used for positioning elements in the content layer.
 *
 * @param canvasX - X coordinate in canvas space
 * @param canvasY - Y coordinate in canvas space
 * @param transform - Canvas transform (translate and scale)
 * @returns Screen coordinates
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  transform: CanvasTransform,
): { x: number; y: number } {
  return {
    x: canvasX * transform.scale + transform.x,
    y: canvasY * transform.scale + transform.y,
  };
}

/**
 * Convert screen coordinates to canvas coordinates.
 * Used when handling mouse events to determine canvas position.
 *
 * @param screenX - X coordinate in screen space
 * @param screenY - Y coordinate in screen space
 * @param transform - Canvas transform (translate and scale)
 * @returns Canvas coordinates
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  transform: CanvasTransform,
): { x: number; y: number } {
  return {
    x: (screenX - transform.x) / transform.scale,
    y: (screenY - transform.y) / transform.scale,
  };
}

/**
 * Convert canvas size to screen size.
 * Used for sizing elements in the overlay layer (which doesn't scale).
 *
 * @param canvasWidth - Width in canvas space
 * @param canvasHeight - Height in canvas space
 * @param scale - Canvas scale factor
 * @returns Screen size
 */
export function canvasSizeToScreen(
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
): { width: number; height: number } {
  return {
    width: canvasWidth * scale,
    height: canvasHeight * scale,
  };
}

/**
 * Convert screen size to canvas size.
 * Used when calculating element dimensions from screen measurements.
 *
 * @param screenWidth - Width in screen space
 * @param screenHeight - Height in screen space
 * @param scale - Canvas scale factor
 * @returns Canvas size
 */
export function screenSizeToCanvas(
  screenWidth: number,
  screenHeight: number,
  scale: number,
): { width: number; height: number } {
  return {
    width: screenWidth / scale,
    height: screenHeight / scale,
  };
}

/**
 * Convert screen coordinates relative to a container to canvas coordinates.
 * Used when handling mouse events on the canvas container.
 *
 * @param clientX - Mouse clientX
 * @param clientY - Mouse clientY
 * @param containerRect - Bounding rect of the canvas container
 * @param transform - Canvas transform (translate and scale)
 * @returns Canvas coordinates
 */
export function clientToCanvas(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  transform: CanvasTransform,
): { x: number; y: number } {
  const relativeX = clientX - containerRect.left;
  const relativeY = clientY - containerRect.top;
  return screenToCanvas(relativeX, relativeY, transform);
}

/**
 * Convert canvas coordinates to overlay layer coordinates.
 * The overlay layer only translates (no scale), so we need to apply scale manually.
 *
 * @param canvasX - X coordinate in canvas space
 * @param canvasY - Y coordinate in canvas space
 * @param transform - Canvas transform (translate and scale)
 * @returns Overlay layer coordinates (screen space, but relative to overlay container)
 */
export function canvasToOverlay(
  canvasX: number,
  canvasY: number,
  transform: CanvasTransform,
): { x: number; y: number } {
  // Overlay layer only translates, so we apply scale here
  return {
    x: canvasX * transform.scale + transform.x,
    y: canvasY * transform.scale + transform.y,
  };
}
