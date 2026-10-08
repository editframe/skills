import { TimingStudy } from "./shared/timing/TimingStudy";
import type { TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

export const profile = {
  id: "overshoot",
  name: "Overshoot",
  group: "Arrival",
  gesture: 1.6,
  description: "Pass the destination once, then correct back to the target.",
  use: "Suggest momentum continuing beyond an intended stopping point.",
} as const satisfies TimingProfile;

export const overshoot = (x: number, strength = 1.70158) =>
  1 + (strength + 1) * (x - 1) ** 3 + strength * (x - 1) ** 2;

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={overshoot} />;
}
