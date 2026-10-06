import { TimingStudy } from "./shared/timing/TimingStudy";
import type { TimingProfile } from "./shared/timing/gesture";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

export const profile = {
  id: "stepped",
  name: "Stepped",
  group: "Continuity",
  gesture: 1.6,
  description: "Divide progress into eight evenly timed held positions.",
  use: "Give motion a deliberate stop-motion or discrete-update character.",
} as const satisfies TimingProfile;

export const stepped = (x: number, steps = 8) => Math.floor(x * steps) / steps;
/** Each hold ends in a cut, so tracks need duplicate keyframes rather than travel. */
export const stepJumps = (steps = 8) => Array.from({ length: steps }, (_, i) => (i + 1) / steps);
const jumps = stepJumps();

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} profile={profile} curve={stepped} jumps={jumps} />;
}
