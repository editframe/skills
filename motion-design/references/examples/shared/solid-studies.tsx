import { memo, useCallback, useMemo } from "react";
import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, type Aspect } from "../../src/primitives";

export type Vec3 = [number, number, number];
export type Face = { vertices: Vec3[]; color: string };
export type SolidFrame = { faces: Face[]; eye: Vec3; target?: Vec3; focal?: number };
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const unit = (a: Vec3): Vec3 => mul(a, 1 / (Math.hypot(...a) || 1));
export const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
export const rx = ([x, y, z]: Vec3, a: number): Vec3 => [
  x,
  y * Math.cos(a) - z * Math.sin(a),
  y * Math.sin(a) + z * Math.cos(a),
];
export const ry = ([x, y, z]: Vec3, a: number): Vec3 => [
  x * Math.cos(a) + z * Math.sin(a),
  y,
  -x * Math.sin(a) + z * Math.cos(a),
];
export function box(center: Vec3, dimensions: Vec3, color: string): Face[] {
  const v: Vec3[] = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ].map((p) => add(center, p.map((n, i) => (n * dimensions[i]) / 2) as Vec3));
  return [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [3, 7, 6, 2],
    [0, 4, 7, 3],
    [1, 2, 6, 5],
  ].map((indices) => ({ vertices: indices.map((i) => v[i]), color }));
}
const light = unit([-3, 5, 7]);
function lit(hex: string, normal: Vec3) {
  const amount = 0.37 + 0.63 * Math.max(0, dot(normal, light));
  const rgb = hex
    .replace("#", "")
    .match(/../g)!
    .map((v) => Math.round(parseInt(v, 16) * amount));
  return `rgb(${rgb.join(",")})`;
}
export function project(frame: SolidFrame) {
  const forward = unit(sub(frame.target ?? [0, 0, 0], frame.eye));
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return frame.faces
    .flatMap((face) => {
      const normal = unit(
        cross(sub(face.vertices[1], face.vertices[0]), sub(face.vertices[2], face.vertices[0])),
      );
      const center = mul(
        face.vertices.reduce((sum, p) => add(sum, p), [0, 0, 0]),
        1 / face.vertices.length,
      );
      if (dot(normal, sub(frame.eye, center)) <= 0) return [];
      const points = face.vertices.map((p) => {
        const delta = sub(p, frame.eye),
          depth = dot(delta, forward);
        return {
          x: 500 + (dot(delta, right) / depth) * (frame.focal ?? 1200),
          y: 500 - (dot(delta, up) / depth) * (frame.focal ?? 1200),
          depth,
        };
      });
      return [
        {
          points: points.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(" "),
          depth: points.reduce((sum, p) => sum + p.depth, 0) / points.length,
          color: lit(face.color, normal),
        },
      ];
    })
    .sort((a, b) => b.depth - a.depth);
}
// Initializers can be reapplied by React (including StrictMode) or clone setup.
// There must be exactly one renderer per root, even when setup is repeated.
const renderers = new WeakMap<EFTimegroupElement, () => void>();

/** Every initializer queries its own cloned tree; no closure captures a source DOM node. */
export const SolidStage = memo(function SolidStage({
  id,
  aspect,
  duration,
  background,
  label,
  scene,
}: {
  id: string;
  aspect: Aspect;
  duration: number;
  background: string;
  label: string;
  scene: (time: number) => SolidFrame;
}) {
  const [width, height] = ASPECT[aspect];
  // Transport updates must not reconcile the animated polygons back to frame zero.
  const initial = useMemo(() => project(scene(0)), [scene]);
  const initialize = useCallback(
    (root: EFTimegroupElement) => {
      renderers.get(root)?.();
      renderers.delete(root);
      const group = root.querySelector<SVGGElement>("[data-solid-faces]");
      if (!group) return;
      const nodes = Array.from(group.children) as SVGPolygonElement[];
      const previous: ReturnType<typeof project> = [];
      let visibleCount = nodes.length;
      let lastTime: number | undefined;
      const draw = (time: number) => {
        if (time === lastTime) return;
        lastTime = time;
        const faces = project(scene(time));
        // Keep the pool and its fixed SVG styling; only patch changed geometry/color.
        while (nodes.length < faces.length) {
          const node = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
          group.appendChild(node);
          nodes.push(node);
        }
        for (let i = 0; i < faces.length; i++) {
          const node = nodes[i],
            face = faces[i],
            before = previous[i];
          if (i >= visibleCount || !before) node.removeAttribute("display");
          if (before?.points !== face.points) node.setAttribute("points", face.points);
          if (before?.color !== face.color) {
            node.setAttribute("fill", face.color);
            node.setAttribute("stroke", face.color);
          }
          previous[i] = face;
        }
        for (let i = faces.length; i < visibleCount; i++) nodes[i].setAttribute("display", "none");
        visibleCount = faces.length;
      };
      draw(root.currentTime);
      renderers.set(
        root,
        root.addFrameTask(({ ownCurrentTime }) => draw(ownCurrentTime)),
      );
    },
    [scene],
  );
  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration={`${duration}s`}
      loop
      initializer={initialize}
      style={{ position: "relative", width, height, overflow: "hidden", background }}
    >
      <svg
        viewBox="0 0 1000 1000"
        role="img"
        aria-label={label}
        style={{ position: "absolute", inset: "5%", width: "90%", height: "90%" }}
      >
        <g data-solid-faces="" strokeWidth={0.6} strokeLinejoin="round">
          {initial.map((face, i) => (
            <polygon key={i} points={face.points} fill={face.color} stroke={face.color} />
          ))}
        </g>
      </svg>
    </Timegroup>
  );
});
