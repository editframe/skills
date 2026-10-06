import { SolidStage, smooth, type Face, type Vec3 } from "./shared/solid-studies";
import type { Aspect } from "../src/primitives";

export const duration = 8.6;
export const posterTime = 3.8;
export const aspect = "square" as const;
const layers = 23,
  facets = 36;

function section(
  center: Vec3,
  radiusX: number,
  radiusZ: number,
  angle: number,
  color: string,
): Face[] {
  const ring = (height: number): Vec3[] =>
    Array.from({ length: facets }, (_, j) => {
      const theta = (j / facets) * Math.PI * 2;
      const x = radiusX * Math.cos(theta),
        z = radiusZ * Math.sin(theta);
      return [
        center[0] + x * Math.cos(angle) - z * Math.sin(angle),
        center[1] + height,
        center[2] + x * Math.sin(angle) + z * Math.cos(angle),
      ];
    });
  const lower = ring(-0.085),
    upper = ring(0.085);
  return [
    { vertices: lower, color },
    { vertices: [...upper].reverse(), color },
    ...lower.map((p, j) => ({
      vertices: [p, upper[j], upper[(j + 1) % facets], lower[(j + 1) % facets]],
      color,
    })),
  ];
}

export function scene(t: number) {
  const faces: Face[] = [];
  for (let i = 0; i < layers; i++) {
    const u = i / (layers - 1),
      delay = (1 - u) * 0.65;
    const shear = smooth((t - 0.8 - delay) / 1.55) * (1 - smooth((t - 5.05 - delay) / 1.6));
    const contour = Math.sin(u * Math.PI);
    const center: Vec3 = [
      0.52 * Math.sin(u * Math.PI * 2) + shear * 1.35 * Math.sin(u * Math.PI * 2),
      (u - 0.5) * 4.4,
      shear * 0.85 * Math.sin(u * Math.PI * 2 + 0.7),
    ];
    const color = i % 6 < 2 ? "#f3caad" : i % 6 < 4 ? "#c3abe0" : "#9b82be";
    faces.push(
      ...section(
        center,
        0.5 + 0.7 * contour,
        0.42 + 0.51 * contour,
        u * 0.85 + shear * 0.32,
        color,
      ),
    );
  }
  return { faces, eye: [6.3, 4.5, 11.7] as Vec3, target: [0, -0.08, 0] as Vec3, focal: 1530 };
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SolidStage
      id={id}
      aspect={frame}
      duration={duration}
      background="#302737"
      label="Twenty-three solid contour slices shear into a flowing S-shaped sculpture and settle back into a compact layered volume"
      scene={scene}
    />
  );
}
