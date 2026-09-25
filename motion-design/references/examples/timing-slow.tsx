import { TimingStudy } from "./shared/timing/TimingStudy";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 2.45;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TimingStudy id={id} aspect={frame} timing="slow" />;
}
