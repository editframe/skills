import { SolidStage, box, smooth, type Face, type Vec3 } from "./shared/solid-studies";
import type { Aspect } from "../src/primitives";

export const duration = 8.4;
export const posterTime = 3.55;
export const aspect = "square" as const;

/** Columns stay anchored; a localized crest passes through their spatial phase. */
export function scene(t: number) {
  const faces: Face[] = box([0, -0.68, 0], [6.28, 0.16, 6.28], "#264c48");
  const envelope = smooth((t - 0.6) / 0.7) * (1 - smooth((t - 6.8) / 0.9));
  const front = -4 + (t - 0.7) * 3.75;
  for (let z = 0; z < 9; z++)
    for (let x = 0; x < 9; x++) {
      const phase = x + z * 0.84;
      const leading = Math.exp(-(((phase - front) / 1.65) ** 2));
      const trailing = 0.4 * Math.exp(-(((phase - front + 4) / 1.8) ** 2));
      const height = 0.3 + envelope * (leading + trailing) * 1.83;
      const color =
        leading * envelope > 0.53 ? "#e0f4ab" : trailing * envelope > 0.19 ? "#81baa2" : "#4c8b7e";
      faces.push(
        ...box([(x - 4) * 0.69, -0.59 + height / 2, (z - 4) * 0.69], [0.59, height, 0.59], color),
      );
    }
  return { faces, eye: [8.5, 9.5, 10.5] as Vec3, target: [0, 0.15, 0] as Vec3, focal: 1230 };
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SolidStage
      id={id}
      aspect={frame}
      duration={duration}
      background="#132e2c"
      label="Two traveling crests propagate diagonally across a field of eighty-one anchored solid columns"
      scene={scene}
    />
  );
}
