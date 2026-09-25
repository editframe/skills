import { SolidStage, add, rx, ry, type Face, type Vec3 } from "./shared/solid-studies";
import type { Aspect } from "../src/primitives";

export const duration = 10;
export const posterTime = 2.65;
export const aspect = "square" as const;
const tau = Math.PI * 2;
const orbits = [
  { radius: 1.22, tilt: -1.05, color: "#e8bd83", speed: 3, size: 0.21 },
  { radius: 1.83, tilt: 0.08, color: "#89b5c9", speed: 2, size: 0.26 },
  { radius: 2.45, tilt: 1.12, color: "#e5927c", speed: 1, size: 0.32 },
];
const orient = (p: Vec3, tilt: number): Vec3 => ry(rx(p, tilt), -0.25);

function torus(radius: number, tilt: number, color: string): Face[] {
  const around = 48,
    sides = 4,
    tube = 0.065;
  const point = (i: number, j: number): Vec3 => {
    const u = (i / around) * tau,
      v = (j / sides) * tau;
    return orient(
      [
        (radius + tube * Math.cos(v)) * Math.cos(u),
        (radius + tube * Math.cos(v)) * Math.sin(u),
        tube * Math.sin(v),
      ],
      tilt,
    );
  };
  return Array.from({ length: around }, (_, i) =>
    Array.from({ length: sides }, (_, j) => ({
      vertices: [point(i, j), point(i + 1, j), point(i + 1, j + 1), point(i, j + 1)],
      color,
    })),
  ).flat();
}

function sphere(center: Vec3, radius: number, color: string): Face[] {
  const latitudes = 6,
    longitudes = 10;
  const point = (i: number, j: number): Vec3 => {
    const latitude = -Math.PI / 2 + (i / latitudes) * Math.PI,
      longitude = (j / longitudes) * tau;
    return add(center, [
      radius * Math.cos(latitude) * Math.cos(longitude),
      radius * Math.sin(latitude),
      radius * Math.cos(latitude) * Math.sin(longitude),
    ]);
  };
  const faces: Face[] = [];
  for (let i = 0; i < latitudes; i++)
    for (let j = 0; j < longitudes; j++) {
      const vertices =
        i === 0
          ? [point(0, j), point(1, j), point(1, j + 1)]
          : i === latitudes - 1
            ? [point(i, j), point(i + 1, j), point(i, j + 1)]
            : [point(i, j), point(i + 1, j), point(i + 1, j + 1), point(i, j + 1)];
      faces.push({ vertices, color });
    }
  return faces;
}
const rings = orbits.flatMap(({ radius, tilt, color }) => torus(radius, tilt, color));
const core = sphere([0, 0, 0], 0.49, "#e9e0ce");

export function scene(t: number) {
  const progress = Math.max(0, Math.min(1, t / duration));
  // The shared clock slows around alignment without stopping the independent orbits.
  const phase = tau * progress - 0.42 * Math.sin(tau * progress);
  const bodies = orbits.flatMap(({ radius, tilt, color, speed, size }) => {
    const angle = phase * speed;
    return sphere(
      orient([radius * Math.cos(angle), radius * Math.sin(angle), 0], tilt),
      size,
      color,
    );
  });
  return { faces: [...rings, ...core, ...bodies], eye: [4.8, 3.4, 10] as Vec3, focal: 1430 };
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SolidStage
      id={id}
      aspect={frame}
      duration={duration}
      background="#202631"
      label="Three solid satellites follow tilted tubular orbits at different rates, periodically aligning around a central sphere"
      scene={scene}
    />
  );
}
