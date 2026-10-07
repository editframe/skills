import {
  circle,
  PosterHandoff,
  posterGround,
  TAU,
  text,
  type C,
  type Poster,
} from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
import type { TransitionEffect } from "./shared/transition-compositor";
export const duration = 8;
export const posterTime = 2.5;
export const aspect = "landscape" as const;
const palette = { ground: "#301b43", ink: "#f2d18d", accent: "#c9636e", support: "#74325b" };
/** A sphere wrapped in six tilted current lines. */
function currents(
  c: C,
  h: number,
  back: string,
  fore: string,
  tilt: number,
  title: string,
  caption: string,
) {
  const { s, cx, cy } = posterGround(c, h, back);
  circle(c, cx, cy, s * 0.44, palette.accent);
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.ellipse(cx, cy + (i - 2.5) * s * 0.09, s * 0.44, s * 0.12, tilt, 0, TAU);
    c.strokeStyle = fore;
    c.lineWidth = 2;
    c.stroke();
  }
  text(c, title, 60, 120, 66, fore, "Georgia", "400");
  text(c, caption, 60, h - 75, 30, fore, "Georgia", "400");
}
const takeABreath: Poster = (c, h) =>
  currents(c, h, palette.ground, palette.ink, 0.2, "TAKE A BREATH", "Let the moment expand.");
const intoTheFlow: Poster = (c, h) =>
  currents(c, h, palette.ink, palette.ground, -0.3, "INTO THE FLOW", "A new shape of things.");
/** An uneven wave front descends, revealing scene B above it. */
export const liquidFlow: TransitionEffect = ({ c, b, w, h, q, p }) => {
  c.beginPath();
  const yy = -h * 0.12 + p * h * 1.24,
    amplitude = h * 0.065 * Math.sin(q * Math.PI);
  c.moveTo(0, 0);
  c.lineTo(w, 0);
  for (let x = w; x >= 0; x -= w / 120)
    c.lineTo(
      x,
      yy + amplitude * (Math.sin((x / w) * 8 + q * 3) + 0.28 * Math.sin((x / w) * 19 - q * 5)),
    );
  c.lineTo(0, yy);
  c.closePath();
  c.clip();
  c.drawImage(b, 0, 0, w, h);
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <PosterHandoff
      id={id}
      aspect={frame}
      label="liquid transition between two original compositions"
      background={palette.ground}
      from={takeABreath}
      to={intoTheFlow}
      effect={liquidFlow}
      edge={palette.support}
    />
  );
}
