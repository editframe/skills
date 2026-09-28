import {
  bg,
  circle,
  ContinuousScene,
  line,
  text,
  type ScenePainter,
} from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 2.45;
export const aspect = "landscape" as const;
const palette = { ground: "#f1e7d3", ink: "#203c43", accent: "#df7847", support: "#afd0c3" };
/** Two camera positions on the same pendulum; the oblique one foreshortens its width. */
const front = {
  back: palette.ground,
  ink: palette.ink,
  grid: "#d7c9b3",
  projection: 1,
  title: "FOLLOW THE SWING",
  caption: "01 / FRONT",
};
const oblique: typeof front = {
  back: palette.ink,
  ink: palette.ground,
  grid: "#43666a",
  projection: 0.46,
  title: "A CHANGE OF VIEW",
  caption: "02 / OBLIQUE",
};
/** The pendulum swings continuously; the view cuts to the oblique camera mid-swing and back. */
const followTheSwing: ScenePainter = (c, h, { t }) => {
  const view = t >= 2.4 && t < 6.4 ? oblique : front,
    length = Math.min(500, h * 0.36),
    cy = Math.max(210, h * 0.26) + length,
    angle = 0.65 * Math.sin(((t - 2.4) * Math.PI) / 2);
  bg(c, h, view.back);
  const { ink, projection } = view,
    x = 600 + Math.sin(angle) * length * projection,
    y = cy - length + Math.cos(angle) * length;
  text(c, view.title, 60, 105, 54, ink);
  for (let i = -3; i <= 3; i++)
    line(
      c,
      [
        [600 + i * 120 * projection, cy - length - 30],
        [600 + i * 120 * projection, cy + 130],
      ],
      view.grid,
      1,
    );
  line(
    c,
    [
      [360, cy - length],
      [840, cy - length],
    ],
    ink,
    10,
  );
  line(
    c,
    [
      [600, cy - length],
      [x, y],
    ],
    ink,
    5,
  );
  circle(c, x, y, 55, palette.accent);
  circle(c, 600, cy - length, 9, palette.support);
  text(c, view.caption, 60, h - 75, 24, ink, "Courier New");
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <ContinuousScene
      id={id}
      aspect={frame}
      label="action transition between two original compositions"
      background={palette.ground}
      scene={followTheSwing}
    />
  );
}
