import type { CanvasElementBounds } from "./api/types.js";

/**
 * Get element bounds using the CanvasElementBounds protocol if available,
 * otherwise fall back to getBoundingClientRect().
 *
 * This allows elements to provide custom hit testing areas or account for
 * visual bounds that differ from DOM bounds.
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





