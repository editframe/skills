import {
  SolidStage,
  add,
  sub,
  mul,
  unit,
  cross,
  rx,
  type Vec3,
  type Face,
} from "./shared/solid-studies";
import type { Aspect } from "../src/primitives";
export const duration = 10;
export const posterTime = 1.8;
export const aspect = "square" as const;
const count = 96,
  sides = 10;
const curve = (t: number): Vec3 =>
  rx(
    [
      (1.62 + 0.56 * Math.cos(3 * t)) * Math.cos(2 * t),
      (1.62 + 0.56 * Math.cos(3 * t)) * Math.sin(2 * t),
      0.68 * Math.sin(3 * t),
    ],
    0.5,
  );
const rings = Array.from({ length: count }, (_, i) => {
  const t = (i / count) * Math.PI * 2,
    center = curve(t);
  const tangent = unit(sub(curve(t + 0.001), curve(t - 0.001)));
  const normal = unit(cross(tangent, [0, 0, 1]));
  const binormal = cross(tangent, normal);
  return Array.from(
    { length: sides },
    (_, j): Vec3 =>
      add(
        center,
        add(
          mul(normal, Math.cos((j / sides) * Math.PI * 2) * 0.32),
          mul(binormal, Math.sin((j / sides) * Math.PI * 2) * 0.32),
        ),
      ),
  );
});
const sculpture: Face[] = rings.flatMap((ring, i) =>
  ring.map((p, j) => ({
    vertices: [
      p,
      ring[(j + 1) % sides],
      rings[(i + 1) % count][(j + 1) % sides],
      rings[(i + 1) % count][j],
    ],
    color: i < count / 3 ? "#f1ba8b" : i < (count * 2) / 3 ? "#d79074" : "#e6a182",
  })),
);
function scene(t: number) {
  const angle = ((t % duration) / duration) * Math.PI * 2;
  return {
    faces: sculpture,
    eye: [Math.sin(angle) * 9, 2.5 + Math.sin(angle) * 0.8, Math.cos(angle) * 9] as Vec3,
    focal: 1320,
  };
}
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SolidStage
      id={id}
      aspect={frame}
      duration={duration}
      background="#263a3b"
      label="An orbiting camera reveals the interlocking depth of a continuous three-dimensional knot sculpture"
      scene={scene}
    />
  );
}
