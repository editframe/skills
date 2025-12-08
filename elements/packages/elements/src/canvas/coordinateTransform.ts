import type { PanZoomTransform } from "../elements/EFPanZoom.js";

/**
 * =============================================================================
 * COORDINATE SPACES
 * =============================================================================
 * 
 * This module provides utilities for converting between two coordinate spaces:
 * 
 * 1. SCREEN SPACE (viewport coordinates)
 *    - Origin: Top-left of browser viewport
 *    - Units: Physical screen pixels
 *    - Used by: getBoundingClientRect(), mouse events (clientX/clientY)
 *    - AFFECTED by: zoom/scale transforms
 *    
 * 2. CANVAS SPACE (logical coordinates)
 *    - Origin: Top-left of the canvas content area
 *    - Units: CSS pixels at 1:1 scale (unaffected by zoom)
 *    - Used by: Element positioning (style.left/top), metadata storage
 *    - NOT AFFECTED by: zoom/scale transforms
 * 
 * KEY RELATIONSHIP:
 *   screenPosition = canvasRect.origin + (canvasPosition * scale)
 *   canvasPosition = (screenPosition - canvasRect.origin) / scale
 * 
 * IMPORTANT: These functions convert POSITIONS, not DIMENSIONS.
 * 
 * For positions (like element center or mouse coordinates):
 *   - Use screenToCanvas() / canvasToScreen() for conversion
 * 
 * For dimensions (like element width/height):
 *   - Screen dimensions = canvas dimensions * scale
 *   - Canvas dimensions = screen dimensions / scale
 *   - OR better: use offsetWidth/offsetHeight which are already in canvas space
 * 
 * =============================================================================
 */

/**
 * Convert screen coordinates to canvas coordinates.
 * 
 * Use this for converting POSITIONS from screen space (getBoundingClientRect,
 * mouse events) to canvas space (element positioning, metadata).
 * 
 * Example: Converting a click position to canvas coordinates for hit testing.
 * Example: Converting element center from screen to canvas for metadata.
 * 
 * @param screenX - X coordinate in screen space (e.g., event.clientX, rect.left)
 * @param screenY - Y coordinate in screen space (e.g., event.clientY, rect.top)
 * @param canvasRect - Canvas content element's bounding rect (.canvas-content, not <ef-canvas>)
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
 * 
 * Use this for converting POSITIONS from canvas space (element positioning,
 * metadata) to screen space (overlay positioning, visual display).
 * 
 * Example: Converting element top-left from metadata to screen position for overlays.
 * Example: Converting a canvas point to screen coordinates for rendering guides.
 * 
 * @param canvasX - X coordinate in canvas space (from metadata or style.left)
 * @param canvasY - Y coordinate in canvas space (from metadata or style.top)
 * @param canvasRect - Canvas content element's bounding rect (.canvas-content, not <ef-canvas>)
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

