/**
 * Evaluates a CSS easing function at a given progress (0-1)
 * Supports standard CSS easing functions and cubic-bezier
 */
export function evaluateEasing(easing: string, progress: number): number {
  // Clamp progress to 0-1
  progress = Math.max(0, Math.min(1, progress));

  // Handle standard CSS easing functions
  switch (easing.trim().toLowerCase()) {
    case "linear":
      return progress;
    case "ease":
      return cubicBezier(0.25, 0.1, 0.25, 1, progress);
    case "ease-in":
      return cubicBezier(0.42, 0, 1, 1, progress);
    case "ease-out":
      return cubicBezier(0, 0, 0.58, 1, progress);
    case "ease-in-out":
      return cubicBezier(0.42, 0, 0.58, 1, progress);
    default: {
      // Try to parse as cubic-bezier
      const cubicBezierMatch = easing.match(
        /cubic-bezier\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i,
      );
      if (
        cubicBezierMatch?.[1] &&
        cubicBezierMatch[2] &&
        cubicBezierMatch[3] &&
        cubicBezierMatch[4]
      ) {
        const x1 = Number.parseFloat(cubicBezierMatch[1]);
        const y1 = Number.parseFloat(cubicBezierMatch[2]);
        const x2 = Number.parseFloat(cubicBezierMatch[3]);
        const y2 = Number.parseFloat(cubicBezierMatch[4]);
        return cubicBezier(x1, y1, x2, y2, progress);
      }
      // Default to linear if unknown
      return progress;
    }
  }
}

/**
 * Evaluates a cubic-bezier curve at a given progress (0-1)
 * Uses binary search to find the t value that corresponds to the given x
 */
function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
): number {
  // Clamp x to 0-1
  x = Math.max(0, Math.min(1, x));

  // Handle edge cases
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Binary search for t that gives us the desired x
  let t = 0.5;
  let minT = 0;
  let maxT = 1;

  // Iterate until we're close enough
  for (let i = 0; i < 20; i++) {
    const currentX = bezierX(t, x1, x2);
    const diff = currentX - x;

    if (Math.abs(diff) < 0.0001) {
      break;
    }

    if (diff > 0) {
      maxT = t;
    } else {
      minT = t;
    }

    t = (minT + maxT) / 2;
  }

  // Return the y value at this t
  return bezierY(t, y1, y2);
}

/**
 * Calculates the x coordinate of a cubic bezier curve at parameter t
 */
function bezierX(t: number, x1: number, x2: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;

  return 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3;
}

/**
 * Calculates the y coordinate of a cubic bezier curve at parameter t
 */
function bezierY(t: number, y1: number, y2: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;

  return 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3;
}
