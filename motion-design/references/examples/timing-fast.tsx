import { TimingStudy } from "./shared/timing/TimingStudy";
import type { TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
import { linear } from "./timing-linear";
export const duration = 8;
export const posterTime = 1.1;
export const aspect = "landscape" as const;

export const profile = {
  id: "fast",
  name: "Fast",
  group: "Tempo",
  gesture: 0.48,
  description: "Compress the same linear gesture into a quick move, then hold the result.",
  use: "Create urgency without reducing the time available to read the result.",
} as const satisfies TimingProfile;

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={linear} />;
}
