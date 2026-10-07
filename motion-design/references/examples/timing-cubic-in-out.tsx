import { TimingStudy } from "./shared/timing/TimingStudy";
import type { TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

export const profile = {
  id: "cubic-in-out",
  name: "Cubic In / Out",
  group: "Acceleration",
  gesture: 1.6,
  description: "Accelerate out of rest and decelerate back into rest symmetrically.",
  use: "Connect two stable states with a smooth, self-contained move.",
} as const satisfies TimingProfile;

export const cubicInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={cubicInOut} />;
}
