import type { CanvasElementBounds } from "./api/types.js";

/**
 * Get element bounds using the CanvasElementBounds protocol if available,
 * otherwise fall back to getBoundingClientRect().
 *
 * This allows elements to provide custom hit testing areas or account for
 * visual bounds that differ from DOM bounds.
 * 
 * IMPORTANT: This returns a DOMRect in SCREEN SPACE (like getBoundingClientRect).
 * 
 * For ROTATED elements, the returned rect is the AXIS-ALIGNED BOUNDING BOX:
 * - rect.width/height are the bounding box dimensions, NOT the element's actual dimensions
 * - rect.left/top are the bounding box corner, NOT the element's visual top-left
 * 
 * CORRECT USAGE:
 * 
 * ✅ Getting element CENTER (rotation-invariant):
 *    const rect = getElementBounds(element);
 *    const centerX = rect.left + rect.width / 2;
 *    const centerY = rect.top + rect.height / 2;
 * 
 * ✅ Hit testing (checking if a point is inside the bounding box):
 *    const rect = getElementBounds(element);
 *    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) { ... }
 * 
 * ❌ Getting element DIMENSIONS (wrong for rotated elements):
 *    const rect = getElementBounds(element);
 *    const width = rect.width;  // WRONG! This is bounding box width, not element width
 * 
 * For actual dimensions, use element.offsetWidth / element.offsetHeight instead.
 * These return layout dimensions unaffected by CSS transforms.
 */
export function getElementBounds(element: HTMLElement): DOMRect {
  if (
    "getCanvasBounds" in element &&
    typeof (element as any).getCanvasBounds === "function"
  ) {
    return (element as CanvasElementBounds).getCanvasBounds();
  }
  return element.getBoundingClientRect();
}





