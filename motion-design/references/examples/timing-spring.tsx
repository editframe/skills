import { TimingStudy } from "./shared/timing/TimingStudy";
import { smooth, type TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

export const profile = {
  id: "spring",
  name: "Spring",
  group: "Arrival",
  gesture: 1.6,
  description: "Cross the target repeatedly with a diminishing, deterministic recoil.",
  use: "Suggest stored energy resolving through several corrections.",
} as const satisfies TimingProfile;

/** The recoil fades out over the last fifth so the gesture lands exactly on its target. */
export const spring = (x: number, damping = 6, oscillations = 3) =>
  1 - Math.exp(-damping * x) * Math.cos(oscillations * Math.PI * x) * (1 - smooth((x - 0.8) / 0.2));

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={spring} />;
}
