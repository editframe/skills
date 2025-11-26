export function rotatePoint(
  cx: number,
  cy: number,
  x: number,
  y: number,
  radians: number,
): Point2D {
  const nx = Math.cos(radians) * (x - cx) - Math.sin(radians) * (y - cy) + cx;
  const ny = Math.cos(radians) * (y - cy) + Math.sin(radians) * (x - cx) + cy;

  return { x: nx, y: ny };
}
