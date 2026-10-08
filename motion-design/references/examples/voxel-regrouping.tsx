import { SolidStage, box, smooth, type Face, type Vec3 } from "./shared/solid-studies";
import type { Aspect } from "../src/primitives";

export const duration = 9;
export const posterTime = 4.3;
export const aspect = "square" as const;
const counts = [24, 32, 40];
const colors = ["#d97b60", "#d7b15f", "#929ecb"];
const units = counts.flatMap((count, group) =>
  Array.from({ length: count }, (_, index) => ({ group, index })),
);

/** Stable identities and a coprime permutation preserve all 96 colored units. */
export function scene(t: number) {
  const faces: Face[] = [];
  units.forEach(({ group, index }, identity) => {
    const cell = (identity * 37) % 96;
    const source: Vec3 = [
      ((cell % 6) - 2.5) * 0.54,
      ((Math.floor(cell / 6) % 4) - 1.5) * 0.54,
      (Math.floor(cell / 24) - 1.5) * 0.54,
    ];
    const destination: Vec3 = [
      (group - 1) * 2.25 + ((index % 2) - 0.5) * 0.43,
      -1.12 + Math.floor(index / 8) * 0.43,
      ((Math.floor(index / 2) % 4) - 1.5) * 0.43,
    ];
    const delay = group * 0.2 + Math.floor(index / 8) * 0.055;
    const progress = smooth((t - 0.8 - delay) / 1.8) * (1 - smooth((t - 5.9 - delay) / 1.65));
    const arc = Math.sin(progress * Math.PI);
    const center: Vec3 = [
      source[0] + (destination[0] - source[0]) * progress,
      source[1] + (destination[1] - source[1]) * progress + arc * (0.65 + group * 0.18),
      source[2] + (destination[2] - source[2]) * progress + arc * (group - 1) * 0.45,
    ];
    faces.push(...box(center, [0.37, 0.37, 0.37], colors[group]));
  });
  return { faces, eye: [5.2, 6.4, 12.5] as Vec3, target: [0, -0.25, 0] as Vec3, focal: 1550 };
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SolidStage
      id={id}
      aspect={frame}
      duration={duration}
      background="#e8e6df"
      label="Ninety-six stable colored voxels sort from a mixed volume into three populations of twenty-four, thirty-two, and forty"
      scene={scene}
    />
  );
}
