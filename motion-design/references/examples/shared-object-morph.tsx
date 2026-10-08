import {
  bg,
  circle,
  ContinuousScene,
  line,
  TAU,
  text,
  type ScenePainter,
} from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
import { smooth } from "./shared/transition-compositor";
export const duration = 8;
export const posterTime = 3.3;
export const aspect = "landscape" as const;
const palette = { ground: "#f1debd", ink: "#224e49" };
/** A ribbon becomes a river; its banks, sun and title fade around the one shape. */
const ribbonIntoRiver: ScenePainter = (c, h, { q, returning }) => {
  const p = returning ? 1 - smooth(q) : smooth(q),
    mix = (a: number, b: number) => a + (b - a) * p,
    s = Math.min(690, h * 0.61),
    cy = h * 0.52;
  bg(c, h, palette.ground);
  c.save();
  c.globalAlpha = p;
  for (let i = 0; i < 5; i++)
    line(
      c,
      [
        [0, cy + s * 0.05 + i * 45],
        [1200, cy + s * 0.05 + i * 45],
      ],
      "#b9bba0",
      2,
    );
  circle(c, 950, 190, 55, "#d88b46");
  c.restore();
  // One persistent closed contour, with corresponding vertices at both endpoints.
  const center = (x: number) =>
    mix(Math.sin((x / 1200) * TAU) * s * 0.05, Math.sin((x / 1200) * 5 - 1) * s * 0.2);
  c.beginPath();
  for (let i = 0; i <= 100; i++) {
    const x = mix(270, 0) + (i / 100) * mix(660, 1200),
      yy = cy + center(x) - mix(55, 38 + Math.sin((i / 100) * Math.PI) * 50);
    i ? c.lineTo(x, yy) : c.moveTo(x, yy);
  }
  for (let i = 100; i >= 0; i--) {
    const x = mix(270, 0) + (i / 100) * mix(660, 1200);
    c.lineTo(x, cy + center(x) + mix(55, 38 + Math.sin((i / 100) * Math.PI) * 50));
  }
  c.closePath();
  c.fillStyle = `rgb(${Math.round(mix(200, 34))},${Math.round(mix(82, 78))},${Math.round(mix(56, 73))})`;
  c.fill();
  c.save();
  c.globalAlpha = 1 - smooth(p * 2.5);
  text(c, "A RIBBON", 60, 120, 90, palette.ink, "Georgia", "400");
  text(c, "One line, waiting to travel.", 60, h - 75, 29, palette.ink, "Georgia", "400");
  c.restore();
  c.save();
  c.globalAlpha = smooth((p - 0.6) * 2.5);
  text(c, "A RIVER", 60, 120, 90, palette.ink, "Georgia", "400");
  text(c, "The same line, finding its way.", 60, h - 75, 29, palette.ink, "Georgia", "400");
  c.restore();
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <ContinuousScene
      id={id}
      aspect={frame}
      label="morph transition between two original compositions"
      background={palette.ground}
      scene={ribbonIntoRiver}
    />
  );
}
