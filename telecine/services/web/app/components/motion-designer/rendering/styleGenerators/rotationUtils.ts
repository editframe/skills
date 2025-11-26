import type { ElementNode } from "~/lib/motion-designer/types";

/**
 * Checks if an element has rotate animations (property === "rotate").
 * This is more specific than checking for all transform animations.
 */
export function hasRotateAnimations(element: ElementNode): boolean {
  return element.animations.some((anim) => anim.property === "rotate");
}

/**
 * Parses rotation value in degrees from a CSS transform string.
 * Handles formats like:
 * - "rotate(45deg)"
 * - "rotate(45deg) translateX(10px)" (extracts rotate value)
 * - "matrix(...)" (extracts rotation from matrix)
 * - "none"
 *
 * Returns rotation in degrees, or 0 if no rotation found.
 */
export function parseRotationFromTransform(
  transformString: string | null | undefined,
): number {
  if (!transformString || transformString === "none") {
    return 0;
  }

  // Try to match rotate() function first (most common case)
  const rotateMatch = transformString.match(/rotate\(([^)]+)\)/);
  if (rotateMatch) {
    const value = rotateMatch[1];
    // Extract numeric value and unit
    const numMatch = value.match(/(-?\d+\.?\d*)/);
    if (numMatch) {
      const degrees = parseFloat(numMatch[1]);
      // Handle rad units (convert to degrees)
      if (value.includes("rad")) {
        return degrees * (180 / Math.PI);
      }
      return degrees;
    }
  }

  // Try to extract from matrix() - matrix(a, b, c, d, e, f)
  // Rotation angle = atan2(b, a) * (180 / PI)
  const matrixMatch = transformString.match(/matrix\(([^)]+)\)/);
  if (matrixMatch) {
    const values = matrixMatch[1].split(",").map((v) => parseFloat(v.trim()));
    if (values.length >= 4) {
      const a = values[0];
      const b = values[1];
      // Calculate rotation angle from matrix
      const radians = Math.atan2(b, a);
      return radians * (180 / Math.PI);
    }
  }

  // Try matrix3d() - matrix3d(a, b, c, 0, e, f, g, 0, i, j, k, 0, m, n, o, p)
  // For 2D rotation, we use a, b, e, f
  const matrix3dMatch = transformString.match(/matrix3d\(([^)]+)\)/);
  if (matrix3dMatch) {
    const values = matrix3dMatch[1].split(",").map((v) => parseFloat(v.trim()));
    if (values.length >= 6) {
      const a = values[0];
      const b = values[1];
      const radians = Math.atan2(b, a);
      return radians * (180 / Math.PI);
    }
  }

  return 0;
}

/**
 * Gets the base rotation from design property.
 * When rotate animations exist, this is the base that animations add to.
 * When no rotate animations exist, this is the effective rotation.
 *
 * For animated rotation, use parseRotationFromTransform() on computed DOM style.
 */
export function getBaseRotation(element: ElementNode): number {
  return element.props.rotation ?? 0;
}
