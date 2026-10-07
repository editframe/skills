import { TimingStudy } from "./shared/timing/TimingStudy";
import type { TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

export const profile = {
  id: "speed-ramp",
  name: "Speed Ramp",
  group: "Acceleration",
  gesture: 1.6,
  description: "Ramp velocity from 0.2× to 1.8× and back to 0.2× within one gesture.",
  use: "Pass quickly through the middle while keeping both ends legible.",
} as const satisfies TimingProfile;

export const speedRamp = (x: number) =>
  x < 0.5 ? 0.2 * x + 1.6 * x * x : 1 - (0.2 * (1 - x) + 1.6 * (1 - x) ** 2);

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={speedRamp} />;
}
