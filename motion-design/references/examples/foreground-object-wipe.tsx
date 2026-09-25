import { TransitionStudy } from "./shared/transition-studies";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 2.5;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return <TransitionStudy id={id} aspect={frame} kind="foreground" />;
}
