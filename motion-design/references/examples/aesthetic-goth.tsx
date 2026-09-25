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
      kind="goth"
      label="Goth: Beauty in the shadows. Three composed scenes with connected transitions."
    />
  );
}
