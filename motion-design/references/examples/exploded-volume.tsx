import { SolidStage, box, smooth, type Face, type Vec3 } from "./shared/solid-studies";
import type { Aspect } from "../src/primitives";
export const duration = 8;
export const posterTime = 3.3;
export const aspect = "square" as const;

function scene(t: number) {
  const faces: Face[] = [];
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++)
      for (let x = -1; x <= 1; x++) {
        const shell = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
        const delay = (y + 1) * 0.13 + (z + 1) * 0.045;
        const apart = smooth((t - 0.85 - delay) / 1.75) * (1 - smooth((t - 4.8 - delay) / 1.7));
        const spacing = 1.025 + apart * 0.77;
        const center: Vec3 = [x * spacing, y * spacing, z * spacing];
        const palette = ["#ee986e", "#f1c493", "#fff0c5"];
        faces.push(...box(center, [0.98, 0.98, 0.98], shell ? palette[y + 1] : "#bd6050"));
      }
  const orbit = 0.62 + 0.13 * Math.sin((t / duration) * Math.PI * 2);
  return {
    faces,
    eye: [Math.sin(orbit) * 10, 6.3, Math.cos(orbit) * 10] as Vec3,
    target: [0, -0.4, 0] as Vec3,
    focal: 1220,
  };
}
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SolidStage
      id={id}
      aspect={frame}
      duration={duration}
      background="#292934"
      label="A solid cube separates into twenty-seven lit volumes and reassembles"
      scene={scene}
    />
  );
}
