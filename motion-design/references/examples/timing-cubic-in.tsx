import { TimingStudy } from "./shared/timing/TimingStudy";
import type { TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

export const profile = {
  id: "cubic-in",
  name: "Cubic In",
  group: "Acceleration",
  gesture: 1.6,
  description: "Start gently and accelerate into the destination with cubic progress.",
  use: "Build momentum or send an element decisively out of frame.",
} as const satisfies TimingProfile;

export const cubicIn = (x: number) => x ** 3;

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={cubicIn} />;
}
