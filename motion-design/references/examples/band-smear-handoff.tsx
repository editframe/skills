import { PosterHandoff, posterGround, text, type C, type Poster } from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
import { displaceStrips, type TransitionEffect } from "./shared/transition-compositor";
export const duration = 8;
export const posterTime = 2.5;
export const aspect = "landscape" as const;
const palette = { ground: "#28204b", ink: "#f3cce0", accent: "#f19456", support: "#6a87c7" };
/** One word stacked three times, the middle repeat in the accent color. */
function stack(c: C, h: number, back: string, fore: string, word: string, caption: string) {
  const { cy } = posterGround(c, h, back);
  const size = 132;
  for (let i = 0; i < 3; i++) {
    text(c, word, 80, cy + (i - 1) * 155, size, i === 1 ? palette.accent : fore, "Arial", "900");
  }
  text(c, caption, 80, h - 70, 24, fore, "Georgia", "400");
}
const stretch: Poster = (c, h) =>
  stack(c, h, palette.ground, palette.ink, "STRETCH", "Carry the energy forward.");
const release: Poster = (c, h) =>
  stack(c, h, palette.ink, palette.ground, "RELEASE", "Room to become something else.");
/** Thirty bands shift and stretch by different amounts, like a disturbed display. */
export const bandSmear: TransitionEffect = (frame) => {
  const { w } = frame;
  displaceStrips(
    frame,
    30,
    (y, amp) => amp * w * (0.16 + 0.2 * Math.sin(y * 2.4)),
    (y, amp) => 1 + amp * (0.18 + 0.15 * Math.sin(y * 1.8)),
  );
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <PosterHandoff
      id={id}
      aspect={frame}
      label="smear transition between two original compositions"
      background={palette.ground}
      from={stretch}
      to={release}
      effect={bandSmear}
      edge={palette.support}
    />
  );
}
