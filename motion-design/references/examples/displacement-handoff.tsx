import {
  circle,
  line,
  PosterHandoff,
  posterGround,
  TAU,
  text,
  type C,
  type Poster,
} from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
import { displaceStrips, type TransitionEffect } from "./shared/transition-compositor";
export const duration = 8;
export const posterTime = 2.5;
export const aspect = "landscape" as const;
const palette = { ground: "#d9e5e2", ink: "#183e59", accent: "#6e9b9e", support: "#b4c8d4" };
/** A lens of eight tilted rings over a field of vertical rules. */
function lens(
  c: C,
  h: number,
  back: string,
  fore: string,
  tilt: number,
  title: string,
  caption: string,
) {
  const { s, cx, cy } = posterGround(c, h, back);
  for (let x = 0; x < 1200; x += 38)
    line(
      c,
      [
        [x, 160],
        [x, h - 140],
      ],
      palette.support,
      1.5,
    );
  circle(c, cx, cy, s * 0.38, palette.accent);
  for (let i = 0; i < 8; i++) {
    c.beginPath();
    c.ellipse(cx, cy, s * (0.08 + i * 0.044), s * 0.38, tilt, 0, TAU);
    c.strokeStyle = fore;
    c.lineWidth = 3;
    c.stroke();
  }
  text(c, title, 60, 110, 64, fore, "Georgia", "400");
  text(c, caption, 60, h - 70, 27, fore, "Georgia", "400");
}
const shiftTheLight: Poster = (c, h) =>
  lens(c, h, palette.ground, palette.ink, -0.6, "SHIFT THE LIGHT", "Look through the surface.");
const anotherView: Poster = (c, h) =>
  lens(c, h, palette.ink, palette.ground, 0.6, "ANOTHER VIEW", "Perspective changes everything.");
/** A traveling sine wave bends a hundred thin strips without stretching them. */
export const displacement: TransitionEffect = (frame) => {
  const { w, q } = frame,
    rows = 100;
  displaceStrips(
    frame,
    rows,
    (y, amp) => Math.sin((y / rows) * 9 - q * 6) * amp * w * 0.085,
    () => 1,
  );
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <PosterHandoff
      id={id}
      aspect={frame}
      label="warp transition between two original compositions"
      background={palette.ground}
      from={shiftTheLight}
      to={anotherView}
      effect={displacement}
      edge={palette.support}
    />
  );
}
