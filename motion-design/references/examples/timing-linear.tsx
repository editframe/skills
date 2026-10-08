import { TimingStudy } from "./shared/timing/TimingStudy";
import type { TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

export const profile = {
  id: "linear",
  name: "Linear",
  group: "Continuity",
  gesture: 1.6,
  description: "Travel at a constant rate from start to finish.",
  use: "Make distance and elapsed time easy to compare.",
} as const satisfies TimingProfile;

export const linear = (x: number) => x;

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={linear} />;
}
