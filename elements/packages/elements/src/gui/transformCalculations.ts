import { getCornerPoint, getOppositeCorner } from "./transformUtils.js";
import type { TransformBounds } from "./EFTransformHandles.js";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/**
 * Calculate the axis-aligned bounding box of a rotated rectangle.
 * Given the element's position (top-left), size, and rotation,
 * returns the min/max x/y that fully contains the rotated rectangle.
 */
export function getRotatedBoundingBox(
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDegrees: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  // If no rotation, simple case
  if (rotationDegrees === 0) {
    return { minX: x, minY: y, maxX: x + width, maxY: y + height };
  }

  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);

  // Center of the rectangle
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  // Half dimensions
  const halfW = width / 2;
  const halfH = height / 2;

  // Four corners relative to center (before rotation)
  const corners = [
    { x: -halfW, y: -halfH }, // top-left
    { x: halfW, y: -halfH }, // top-right
    { x: halfW, y: halfH }, // bottom-right
    { x: -halfW, y: halfH }, // bottom-left
  ];

  // Rotate each corner and find bounds
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const corner of corners) {
    // Rotate corner around center
    const rotatedX = corner.x * cos - corner.y * sin + centerX;
    const rotatedY = corner.x * sin + corner.y * cos + centerY;

    minX = Math.min(minX, rotatedX);
    minY = Math.min(minY, rotatedY);
    maxX = Math.max(maxX, rotatedX);
    maxY = Math.max(maxY, rotatedY);
  }

  return { minX, minY, maxX, maxY };
}

type CursorType =
  | "n-resize"
  | "e-resize"
  | "s-resize"
  | "w-resize"
  | "ne-resize"
  | "nw-resize"
  | "se-resize"
  | "sw-resize";

/**
 * Get the cursor type for a resize handle based on rotation.
 * The cursor should reflect the actual direction the handle will resize in screen space.
 *
 * @param handle - The resize handle identifier
 * @param rotationDegrees - Current rotation in degrees (0-360)
 * @returns CSS cursor value
 */
export function getResizeHandleCursor(
  handle: ResizeHandle,
  rotationDegrees: number,
): CursorType {
  // Map handles to their base angles (in degrees, where 0° is north, clockwise)
  const handleAngles: Record<ResizeHandle, number> = {
    n: 0,
    ne: 45,
    e: 90,
    se: 135,
    s: 180,
    sw: 225,
    w: 270,
    nw: 315,
  };

  // Calculate the effective angle after rotation
  const baseAngle = handleAngles[handle];
  const effectiveAngle = (baseAngle + rotationDegrees) % 360;
  const normalizedAngle =
    effectiveAngle < 0 ? effectiveAngle + 360 : effectiveAngle;

  // Map angle back to cursor
  // Edge handles (n, e, s, w) map to cardinal directions
  // Corner handles (ne, nw, se, sw) map to diagonal directions
  if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) {
    return "n-resize";
  } else if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
    return "ne-resize";
  } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
    return "e-resize";
  } else if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) {
    return "se-resize";
  } else if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) {
    return "s-resize";
  } else if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) {
    return "sw-resize";
  } else if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) {
    return "w-resize";
  } else {
    // 292.5 to 337.5
    return "nw-resize";
  }
}

/**
 * Convert screen coordinate delta to canvas coordinate delta.
 * @param screenDeltaX - Screen pixel delta X
 * @param screenDeltaY - Screen pixel delta Y
 * @param canvasScale - Canvas zoom scale (must be > 0)
 * @returns Canvas coordinate delta
 */
export function screenToCanvasDelta(
  screenDeltaX: number,
  screenDeltaY: number,
  canvasScale: number,
): { x: number; y: number } {
  if (canvasScale <= 0) {
    throw new Error("Canvas scale must be greater than 0");
  }
  return {
    x: screenDeltaX / canvasScale,
    y: screenDeltaY / canvasScale,
  };
}

/**
 * Convert canvas coordinate delta to screen coordinate delta.
 * @param canvasDeltaX - Canvas coordinate delta X
 * @param canvasDeltaY - Canvas coordinate delta Y
 * @param canvasScale - Canvas zoom scale (must be > 0)
 * @returns Screen pixel delta
 */
export function canvasToScreenDelta(
  canvasDeltaX: number,
  canvasDeltaY: number,
  canvasScale: number,
): { x: number; y: number } {
  if (canvasScale <= 0) {
    throw new Error("Canvas scale must be greater than 0");
  }
  return {
    x: canvasDeltaX * canvasScale,
    y: canvasDeltaY * canvasScale,
  };
}

/**
 * Calculate new bounds for drag operation in canvas coordinates.
 * Pure function - no side effects.
 *
 * Works in canvas coordinate space with zoom as a parameter.
 * Converts screen deltas to canvas deltas.
 *
 * @param startPosition - Starting position in canvas coordinates
 * @param screenDeltaX - Mouse movement delta in screen pixels
 * @param screenDeltaY - Mouse movement delta in screen pixels
 * @param zoomScale - Canvas zoom scale (1.0 = no zoom, 2.0 = 2x zoom, etc.)
 * @returns New bounds with updated position (in canvas coordinates)
 */
export function calculateDragBounds(
  startPosition: { x: number; y: number },
  screenDeltaX: number,
  screenDeltaY: number,
  zoomScale: number = 1,
): { x: number; y: number } {
  if (zoomScale <= 0) {
    throw new Error("Zoom scale must be greater than 0");
  }

  // Convert screen deltas to canvas deltas
  const canvasDeltaX = screenDeltaX / zoomScale;
  const canvasDeltaY = screenDeltaY / zoomScale;

  return {
    x: startPosition.x + canvasDeltaX,
    y: startPosition.y + canvasDeltaY,
  };
}

/**
 * Options for resize calculation.
 * Modifier keys and constraints.
 */
export interface ResizeOptions {
  /** Lock aspect ratio (Shift key or multi-selection) */
  lockAspectRatio?: boolean;
  /** Resize from center instead of opposite corner (Ctrl key) */
  resizeFromCenter?: boolean;
}

/**
 * Calculate new bounds for resize operation in canvas coordinates.
 * Pure function - no side effects.
 *
 * Works in canvas coordinate space with zoom as a parameter.
 * Converts screen deltas to canvas deltas, calculates new bounds in canvas coordinates.
 *
 * @param startSize - Starting size in canvas coordinates
 * @param startPosition - Starting position in canvas coordinates
 * @param startCorner - Starting corner position in canvas coordinates
 * @param handle - Resize handle being dragged
 * @param screenDeltaX - Mouse movement delta in screen pixels
 * @param screenDeltaY - Mouse movement delta in screen pixels
 * @param rotationDegrees - Current rotation in degrees
 * @param minSize - Minimum size constraint in canvas coordinates
 * @param zoomScale - Canvas zoom scale (1.0 = no zoom, 2.0 = 2x zoom, etc.)
 * @param options - Optional resize modifiers (lockAspectRatio, resizeFromCenter)
 * @returns New bounds with updated size and position (in canvas coordinates)
 */
export function calculateResizeBounds(
  startSize: { width: number; height: number },
  startPosition: { x: number; y: number },
  startCorner: { x: number; y: number },
  handle: ResizeHandle,
  screenDeltaX: number,
  screenDeltaY: number,
  rotationDegrees: number,
  minSize: number,
  zoomScale: number = 1,
  options: ResizeOptions = {},
): TransformBounds {
  if (zoomScale <= 0) {
    throw new Error("Zoom scale must be greater than 0");
  }

  const { lockAspectRatio = false, resizeFromCenter = false } = options;
  const initialAspectRatio = startSize.width / startSize.height;

  // Convert screen deltas to canvas deltas
  const canvasDeltaX = screenDeltaX / zoomScale;
  const canvasDeltaY = screenDeltaY / zoomScale;

  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  const oppositeCorner = getOppositeCorner(handle);

  // Rotate canvas deltas to align with element's local coordinate system
  const cos = Math.cos(-rotationRadians);
  const sin = Math.sin(-rotationRadians);
  const rotatedDeltaX = cos * canvasDeltaX - sin * canvasDeltaY;
  const rotatedDeltaY = sin * canvasDeltaX + cos * canvasDeltaY;

  // For center resize, delta applies to both sides (double effect)
  const deltaMultiplier = resizeFromCenter ? 2 : 1;

  // Calculate new size in canvas coordinates
  let newWidth = startSize.width;
  let newHeight = startSize.height;

  if (handle.includes("e")) {
    newWidth = startSize.width + rotatedDeltaX * deltaMultiplier;
  } else if (handle.includes("w")) {
    newWidth = startSize.width - rotatedDeltaX * deltaMultiplier;
  }

  if (handle.includes("s")) {
    newHeight = startSize.height + rotatedDeltaY * deltaMultiplier;
  } else if (handle.includes("n")) {
    newHeight = startSize.height - rotatedDeltaY * deltaMultiplier;
  }

  // Apply aspect ratio constraint if enabled
  if (lockAspectRatio) {
    const isCornerHandle = handle.length === 2; // "ne", "nw", "se", "sw"
    const isHorizontalOnly = handle === "e" || handle === "w";
    const isVerticalOnly = handle === "n" || handle === "s";

    if (isCornerHandle) {
      // For corners: use the dimension with larger change
      const widthScale = newWidth / startSize.width;
      const heightScale = newHeight / startSize.height;
      const uniformScale =
        Math.abs(widthScale - 1) > Math.abs(heightScale - 1)
          ? widthScale
          : heightScale;
      newWidth = startSize.width * uniformScale;
      newHeight = startSize.height * uniformScale;
    } else if (isHorizontalOnly) {
      // Horizontal handle: adjust height to match aspect ratio
      newHeight = newWidth / initialAspectRatio;
    } else if (isVerticalOnly) {
      // Vertical handle: adjust width to match aspect ratio
      newWidth = newHeight * initialAspectRatio;
    }
  }

  // Apply min size constraint (in canvas coordinates)
  newWidth = Math.max(minSize, newWidth);
  newHeight = Math.max(minSize, newHeight);

  // Re-apply aspect ratio after min size if needed
  if (lockAspectRatio && (newWidth === minSize || newHeight === minSize)) {
    if (newWidth === minSize) {
      newHeight = Math.max(minSize, minSize / initialAspectRatio);
    } else {
      newWidth = Math.max(minSize, minSize * initialAspectRatio);
    }
  }

  // Calculate new position based on resize mode
  let newX: number;
  let newY: number;

  if (resizeFromCenter) {
    // Keep center fixed
    const centerX = startPosition.x + startSize.width / 2;
    const centerY = startPosition.y + startSize.height / 2;
    newX = centerX - newWidth / 2;
    newY = centerY - newHeight / 2;
  } else {
    // Keep opposite corner fixed
    const newOppositeCorner = getCornerPoint(
      startPosition.x,
      startPosition.y,
      newWidth,
      newHeight,
      rotationRadians,
      oppositeCorner.x,
      oppositeCorner.y,
    );

    const offsetX = startCorner.x - newOppositeCorner.x;
    const offsetY = startCorner.y - newOppositeCorner.y;
    newX = startPosition.x + offsetX;
    newY = startPosition.y + offsetY;
  }

  return {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Calculate new rotation angle.
 * Pure function - no side effects.
 *
 * @param startAngle - Starting angle in degrees (0-360)
 * @param startRotation - Starting rotation value in degrees
 * @param currentMouseX - Current mouse X in screen pixels
 * @param currentMouseY - Current mouse Y in screen pixels
 * @param centerX - Element center X in screen pixels
 * @param centerY - Element center Y in screen pixels
 * @param rotationStep - Optional rotation step for snapping (in degrees)
 * @returns New rotation angle in degrees
 */
export function calculateRotation(
  startAngle: number,
  startRotation: number,
  currentMouseX: number,
  currentMouseY: number,
  centerX: number,
  centerY: number,
  rotationStep?: number,
): number {
  const dx = currentMouseX - centerX;
  const dy = currentMouseY - centerY;
  const radians = Math.atan2(dy, dx);
  const currentAngle = radians * (180 / Math.PI) + 90;

  // Normalize angle difference to [-180, 180] to avoid wrapping issues
  let deltaAngle = currentAngle - startAngle;
  while (deltaAngle > 180) deltaAngle -= 360;
  while (deltaAngle < -180) deltaAngle += 360;

  let newRotation = startRotation + deltaAngle;

  if (rotationStep !== undefined && rotationStep > 0) {
    newRotation = Math.round(newRotation / rotationStep) * rotationStep;
  }

  return newRotation;
}

/**
 * Parse rotation angle from CSS transform.
 * Handles both rotate() syntax and matrix() transforms.
 * Pure function - no side effects.
 *
 * @param transform - CSS transform string (e.g., "rotate(45deg)" or "matrix(a, b, c, d, e, f)")
 * @returns Rotation angle in degrees
 */
export function parseRotationFromTransform(transform: string): number {
  if (!transform || transform === "none") return 0;

  // Try rotate() syntax first (e.g., "rotate(45deg)", "rotate(0.5rad)")
  const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
  if (rotateMatch?.[1]) {
    const value = rotateMatch[1].trim();
    const numValue = parseFloat(value);
    const unit = value.replace(String(numValue), "").trim();
    if (unit === "rad" || unit === "radians") {
      return (numValue * 180) / Math.PI;
    }
    return numValue; // degrees (default)
  }

  // Fall back to matrix transform: matrix(a, b, c, d, tx, ty)
  // For rotation: a = cos(θ), b = sin(θ)
  const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
  if (!matrixMatch?.[1]) return 0;

  const values = matrixMatch[1].split(",").map((v) => parseFloat(v.trim()));
  if (values.length < 2) return 0;

  const a = values[0];
  const b = values[1];
  if (a === undefined || b === undefined || isNaN(a) || isNaN(b)) {
    return 0;
  }

  return Math.atan2(b, a) * (180 / Math.PI);
}
