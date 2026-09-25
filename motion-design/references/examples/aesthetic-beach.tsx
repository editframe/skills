import { AestheticFilm } from "./shared/aesthetic-studies";
import type { Aspect } from "../src/primitives";
export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      kind="beach"
      label="Beach: Nothing on your calendar. Three composed scenes with connected transitions."
    />
  );
}
