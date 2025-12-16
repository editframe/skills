import type { LitElement } from "lit";

/**
 * Element position information interface.
 * Provides computed position, bounds, and transform information for elements.
 */
export interface ElementPositionInfo {
  /**
   * The bounding rectangle of the element in screen coordinates.
   */
  bounds: DOMRect;

  /**
   * The computed transform string (e.g., "translate(10px, 20px) rotate(45deg)").
   */
  transform: string;

  /**
   * The rotation angle in degrees, extracted from the transform.
   */
  rotation: number;
}

/**
 * Mixin that adds getPositionInfo() method to LitElement.
 * Elements can use this to expose their position information.
 */
export function PositionInfoMixin<T extends typeof LitElement>(superClass: T) {
  class PositionInfoElement extends superClass {
    /**
     * Get position information for this element.
     * Returns computed bounds, transform, and rotation.
     *
     * @public
     */
    getPositionInfo(): ElementPositionInfo | null {
      return getPositionInfoFromElement(this as unknown as HTMLElement);
    }
  }

  return PositionInfoElement as T;
}

/**
 * Helper function to get position info from any HTMLElement.
 * Reads computed styles and bounding rect to determine position.
 */
export function getPositionInfoFromElement(
  element: HTMLElement | null,
): ElementPositionInfo | null {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  const transform = computedStyle.transform;

  // Parse rotation from transform matrix
  let rotation = 0;
  if (transform && transform !== "none") {
    // Transform matrix format: matrix(a, b, c, d, e, f)
    // Rotation = atan2(b, a) * (180 / Math.PI)
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const values = matrixMatch[1].split(",").map((v) => parseFloat(v.trim()));
      if (values.length >= 4) {
        const a = values[0];
        const b = values[1];
        rotation = Math.atan2(b, a) * (180 / Math.PI);
      }
    }
  }

  return {
    bounds: rect,
    transform: transform || "none",
    rotation,
  };
}
