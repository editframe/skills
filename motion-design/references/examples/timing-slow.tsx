import { TimingStudy } from "./shared/timing/TimingStudy";
import type { TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
import { linear } from "./timing-linear";
export const duration = 8;
export const posterTime = 2.45;
export const aspect = "landscape" as const;

export const profile = {
  id: "slow",
  name: "Slow",
  group: "Tempo",
  gesture: 2.8,
  description: "Give the same linear gesture more time, shortening the resting hold.",
  use: "Let a transformation feel deliberate and easy to follow.",
} as const satisfies TimingProfile;

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={linear} />;
}
