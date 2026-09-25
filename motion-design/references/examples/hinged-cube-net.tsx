import {
  SolidStage,
  box,
  rx,
  ry,
  add,
  sub,
  smooth,
  type Vec3,
  type Face,
} from "./shared/solid-studies";
import type { Aspect } from "../src/primitives";
export const duration = 9;
export const posterTime = 3.7;
export const aspect = "square" as const;
const hinge = (point: Vec3, origin: Vec3, axis: "x" | "y", angle: number): Vec3 =>
  add(origin, (axis === "x" ? rx : ry)(sub(point, origin), angle));
function fold(t: number, start: number, end: number) {
  return (smooth((t - start) / 1.5) * (1 - smooth((t - end) / 1.5)) * Math.PI) / 2;
}
function scene(t: number) {
  const north = fold(t, 0.75, 6.3),
    south = fold(t, 1.05, 6.0),
    east = fold(t, 1.4, 5.7),
    west = fold(t, 1.7, 5.4),
    lid = fold(t, 2.9, 4.6);
  const center = smooth((t - 0.75) / 3.65) * (1 - smooth((t - 4.6) / 3.2));
  const panels: { center: Vec3; color: string; transform: (p: Vec3) => Vec3 }[] = [
    { center: [0, 0, 0], color: "#f2dcb5", transform: (p) => p },
    { center: [0, 2, 0], color: "#e8af78", transform: (p) => hinge(p, [0, 1, 0], "x", north) },
    { center: [0, -2, 0], color: "#e9bd8b", transform: (p) => hinge(p, [0, -1, 0], "x", -south) },
    { center: [2, 0, 0], color: "#c87561", transform: (p) => hinge(p, [1, 0, 0], "y", -east) },
    { center: [-2, 0, 0], color: "#d78f6e", transform: (p) => hinge(p, [-1, 0, 0], "y", west) },
    {
      center: [0, 4, 0],
      color: "#efcda3",
      transform: (p) => hinge(hinge(p, [0, 3, 0], "x", lid), [0, 1, 0], "x", north),
    },
  ];
  const faces: Face[] = panels.flatMap((panel) =>
    box(panel.center, [1.976, 1.976, 0.025], panel.color).map((face) => ({
      ...face,
      vertices: face.vertices.map(panel.transform),
    })),
  );
  return {
    faces,
    eye: [7, 9, 12] as Vec3,
    target: [0, 1 - center, center] as Vec3,
    focal: 1510 + center * 650,
  };
}
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SolidStage
      id={id}
      aspect={frame}
      duration={duration}
      background="#243a47"
      label="Six connected panels hinge from a flat cross into a solid cube, then unfold"
      scene={scene}
    />
  );
}
