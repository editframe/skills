import type { PanZoomTransform } from "../elements/EFPanZoom.js";

/**
 * Convert screen coordinates to canvas coordinates.
 * Accounts for PanZoom transform if provided.
 *
 * @param screenX - X coordinate in screen space (e.g., event.clientX)
 * @param screenY - Y coordinate in screen space (e.g., event.clientY)
 * @param canvasRect - Canvas element bounding rect
 * @param panZoomTransform - Optional PanZoom transform from context
 * @returns Object with x, y in canvas coordinate space
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  panZoomTransform?: PanZoomTransform,
): { x: number; y: number } {
  if (!panZoomTransform) {
    return {
      x: screenX - canvasRect.left,
      y: screenY - canvasRect.top,
    };
  }
  // canvasRect already includes the panzoom transform (since canvas is inside .content-wrapper)
  // So we only need to:
  // 1. Get position relative to canvas in screen space: screenX - canvasRect.left
  // 2. Divide by scale to get canvas coordinates
  // We don't need to subtract panZoomTransform.x/y because it's already accounted for in canvasRect
  return {
    x: (screenX - canvasRect.left) / panZoomTransform.scale,
    y: (screenY - canvasRect.top) / panZoomTransform.scale,
  };
}

/**
 * Convert canvas coordinates to screen coordinates.
 * Accounts for PanZoom transform if provided.
 *
 * @param canvasX - X coordinate in canvas space
 * @param canvasY - Y coordinate in canvas space
 * @param canvasRect - Canvas element bounding rect
 * @param panZoomTransform - Optional PanZoom transform from context
 * @returns Object with x, y in screen coordinate space
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  canvasRect: DOMRect,
  panZoomTransform?: PanZoomTransform,
): { x: number; y: number } {
  if (!panZoomTransform) {
    return {
      x: canvasRect.left + canvasX,
      y: canvasRect.top + canvasY,
    };
  }
  // canvasRect already includes the panzoom transform (since canvas is inside .content-wrapper)
  // So we only need to:
  // 1. Multiply canvas coordinates by scale to get screen-space offset
  // 2. Add to canvasRect.left/top (which already includes pan)
  // We don't need to add panZoomTransform.x/y because it's already accounted for in canvasRect
  return {
    x: canvasRect.left + canvasX * panZoomTransform.scale,
    y: canvasRect.top + canvasY * panZoomTransform.scale,
  };
}

