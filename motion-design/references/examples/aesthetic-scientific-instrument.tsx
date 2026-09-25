import { AestheticFilm } from "./shared/aesthetic-studies";
import type { Aspect } from "../src/primitives";

export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
/** Three composed scenes; source mechanisms and research: data/aesthetics.json. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      kind="instrument"
      label="Scientific Instrument: Make the invisible legible. Three scenes combine type, form, and layout with connecting transitions."
    />
  );
}
