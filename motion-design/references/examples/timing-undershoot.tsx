import { TimingStudy } from "./shared/timing/TimingStudy";
import { smooth, type TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

export const profile = {
  id: "undershoot",
  name: "Undershoot",
  group: "Arrival",
  gesture: 1.6,
  description: "Stop at 82% of the journey, hesitate, then make a small final correction.",
  use: "Suggest a cautious arrival or a mechanism finding its final position.",
} as const satisfies TimingProfile;

export const undershoot = (x: number, landing = 0.82) =>
  x < 0.55
    ? landing * (1 - (1 - x / 0.55) ** 3)
    : x < 0.73
      ? landing
      : landing + (1 - landing) * smooth((x - 0.73) / 0.27);

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={undershoot} />;
}
