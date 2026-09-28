import { TimingStudy } from "./shared/timing/TimingStudy";
import type { TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

export const profile = {
  id: "cubic-out",
  name: "Cubic Out",
  group: "Acceleration",
  gesture: 1.6,
  description: "Move immediately, then decelerate into a precise resting position.",
  use: "Bring attention into a composition with a readable landing.",
} as const satisfies TimingProfile;

export const cubicOut = (x: number) => 1 - (1 - x) ** 3;

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={cubicOut} />;
}
