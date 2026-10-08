import { TimingStudy } from "./shared/timing/TimingStudy";
import type { TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

export const profile = {
  id: "glitchy",
  name: "Glitchy",
  group: "Continuity",
  gesture: 1.6,
  description: "Use an authored sequence of uneven holds, jumps, and brief reversals.",
  use: "Make continuity feel interrupted while keeping the outcome repeatable.",
} as const satisfies TimingProfile;

/** [gesture progress, held position]; each position holds until the next entry. */
const holds: [number, number][] = [
  [0, 0],
  [0.12, 0.13],
  [0.2, 0.07],
  [0.29, 0.4],
  [0.43, 0.4],
  [0.48, 0.32],
  [0.54, 0.7],
  [0.63, 0.61],
  [0.7, 0.89],
  [0.82, 0.83],
  [0.9, 1],
];
export const glitchHold = (x: number) => holds.filter(([at]) => at <= x).at(-1)![1];
/** `strength` blends from continuous travel (0) to the authored holds (1). */
export const glitchy = (x: number, strength = 1) => x + (glitchHold(x) - x) * strength;
export const glitchJumps = holds.slice(1).map(([at]) => at);

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <TimingStudy id={id} aspect={frame} profile={profile} curve={glitchy} jumps={glitchJumps} />
  );
}
