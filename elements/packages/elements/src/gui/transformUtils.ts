/**
 * Pure utility functions for transform calculations.
 * Extracted from motion designer TransformHandles component.
 */

/**
 * Rotate a point around a center point by given radians.
 */
export function rotatePoint(
  cx: number,
  cy: number,
  x: number,
  y: number,
  radians: number,
): { x: number; y: number } {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const nx = cos * (x - cx) - sin * (y - cy) + cx;
  const ny = sin * (x - cx) + cos * (y - cy) + cy;
  return { x: nx, y: ny };
}

/**
 * Calculate corner point in canvas coordinates for a rotated element.
 * @param x - Element x position
 * @param y - Element y position
 * @param width - Element width
 * @param height - Element height
 * @param rotationRadians - Rotation in radians
 * @param xMagnitude - 0 = left, 0.5 = center, 1 = right
 * @param yMagnitude - 0 = top, 0.5 = center, 1 = bottom
 */
export function getCornerPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  rotationRadians: number,
  xMagnitude: number,
  yMagnitude: number,
): { x: number; y: number } {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const localCornerX = x + xMagnitude * width;
  const localCornerY = y + yMagnitude * height;
  return rotatePoint(
    centerX,
    centerY,
    localCornerX,
    localCornerY,
    rotationRadians,
  );
}

/**
 * Get opposite corner magnitudes for a handle.
 * Used to determine which corner stays fixed during resize.
 */
export function getOppositeCorner(handle: string): { x: number; y: number } {
  switch (handle) {
    case "nw":
      return { x: 1, y: 1 }; // se corner
    case "n":
      return { x: 0.5, y: 1 }; // s corner
    case "ne":
      return { x: 0, y: 1 }; // sw corner
    case "e":
      return { x: 0, y: 0.5 }; // w corner
    case "se":
      return { x: 0, y: 0 }; // nw corner
    case "s":
      return { x: 0.5, y: 0 }; // n corner
    case "sw":
      return { x: 1, y: 0 }; // ne corner
    case "w":
      return { x: 1, y: 0.5 }; // e corner
    default:
      return { x: 0.5, y: 0.5 };
  }
}
