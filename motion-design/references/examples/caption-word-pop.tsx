import { type Aspect } from "../src/primitives";
import { CaptionStudy } from "./shared/caption-studies";

export const duration = 10;
export const posterTime = 2.25;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return <CaptionStudy id={id} aspect={frame} variant="pop" />;
}
