import { PosterHandoff, shoreline, text, type C, type Poster } from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
import type { TransitionEffect } from "./shared/transition-compositor";
export const duration = 8;
export const posterTime = 3.3;
export const aspect = "landscape" as const;
const palette = { ground: "#efd7b7", ink: "#172d4a", accent: "#e9a653", support: "#c9d9d8" };
/** The same hills above the water at two hours of the day. */
function hillside(c: C, h: number, night: boolean, hills: string, title: string) {
  const { horizon, ink } = shoreline(c, h, night, palette);
  c.beginPath();
  c.moveTo(0, horizon);
  c.bezierCurveTo(220, horizon - 85, 320, horizon + 80, 510, horizon);
  c.bezierCurveTo(670, horizon - 140, 890, horizon - 40, 1200, horizon + 15);
  c.lineTo(1200, h);
  c.lineTo(0, h);
  c.fillStyle = hills;
  c.fill();
  text(c, title, 60, 100, 45, ink);
  text(c, "The same place. Another hour.", 60, h - 60, 23, ink, "Georgia", "400");
}
const beforeDusk: Poster = (c, h) => hillside(c, h, false, "#6e8a78", "BEFORE DUSK");
const afterDark: Poster = (c, h) => hillside(c, h, true, "#274d59", "AFTER DARK");
/** The incoming image fades in over the outgoing one. */
export const dissolve: TransitionEffect = ({ c, b, w, h, p }) => {
  c.globalAlpha = p;
  c.drawImage(b, 0, 0, w, h);
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <PosterHandoff
      id={id}
      aspect={frame}
      label="dissolve transition between two original compositions"
      background={palette.ground}
      from={beforeDusk}
      to={afterDark}
      effect={dissolve}
      edge={palette.support}
    />
  );
}
