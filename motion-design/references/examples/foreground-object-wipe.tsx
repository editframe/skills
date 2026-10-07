import {
  line,
  PosterHandoff,
  shoreline,
  text,
  type C,
  type Poster,
} from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
import type { TransitionEffect } from "./shared/transition-compositor";
export const duration = 8;
export const posterTime = 2.5;
export const aspect = "landscape" as const;
const palette = { ground: "#edd9b0", ink: "#1a4b59", accent: "#d65635", support: "#f2e9d5" };
/** Sailboats moored on the water, their sails in the scene's ink. */
function harbor(c: C, h: number, night: boolean, boats: number, title: string) {
  const { horizon, ink } = shoreline(c, h, night, palette);
  for (let i = 0; i < boats; i++) {
    const x = 145 + i * 260,
      y = horizon + 40 + (i % 2) * 85;
    c.fillStyle = palette.accent;
    c.beginPath();
    c.moveTo(x - 60, y);
    c.lineTo(x + 65, y);
    c.lineTo(x + 35, y + 22);
    c.lineTo(x - 40, y + 22);
    c.closePath();
    c.fill();
    line(
      c,
      [
        [x, y],
        [x, y - 140],
      ],
      ink,
      3,
    );
    c.fillStyle = ink;
    c.beginPath();
    c.moveTo(x - 5, y - 133);
    c.lineTo(x - 65, y - 10);
    c.lineTo(x - 5, y - 10);
    c.fill();
  }
  text(c, title, 60, 100, 45, ink);
  text(c, "Wind carries us onward.", 60, h - 60, 23, ink, "Georgia", "400");
}
const inTheHarbor: Poster = (c, h) => harbor(c, h, false, 4, "IN THE HARBOR");
const openWater: Poster = (c, h) => harbor(c, h, true, 2, "OPEN WATER");
/** The visible foreground sail drives the same boundary that reveals scene B. */
export const foregroundWipe: TransitionEffect = ({ c, b, w, h, p, edge }) => {
  c.beginPath();
  const front = (-0.5 + p * 2) * w;
  c.moveTo(0, 0);
  c.lineTo(front - w * 0.1, 0);
  c.lineTo(front + w * 0.2, h * 0.55);
  c.lineTo(front - w * 0.12, h);
  c.lineTo(0, h);
  c.closePath();
  c.clip();
  c.drawImage(b, 0, 0, w, h);
  // Drops the reveal clip; the compositor's final restore balances the new save.
  c.restore();
  c.save();
  c.beginPath();
  c.moveTo(front - w * 0.1, 0);
  c.lineTo(front + w * 0.2, h * 0.55);
  c.lineTo(front - w * 0.12, h);
  c.lineTo(front - w * 0.34, h * 0.82);
  c.closePath();
  c.fillStyle = edge;
  c.fill();
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <PosterHandoff
      id={id}
      aspect={frame}
      label="foreground transition between two original compositions"
      background={palette.ground}
      from={inTheHarbor}
      to={openWater}
      effect={foregroundWipe}
      edge={palette.support}
    />
  );
}
