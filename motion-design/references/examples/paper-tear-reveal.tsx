import {
  line,
  PosterHandoff,
  posterGround,
  TAU,
  text,
  type C,
  type Poster,
} from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
import { smooth, type TransitionEffect } from "./shared/transition-compositor";
export const duration = 8;
export const posterTime = 2.5;
export const aspect = "landscape" as const;
const palette = { ground: "#ece2ca", ink: "#36523f", accent: "#ad673c", support: "#d6c9a7" };
/** A printed page of five leafy stems under a masthead, above a ruled caption. */
function page(
  c: C,
  h: number,
  back: string,
  fore: string,
  title: string,
  issue: string,
  caption: string,
) {
  const { s, cy } = posterGround(c, h, back);
  text(c, title, 65, 135, 72, fore, "Georgia", "400");
  text(c, issue, 70, 185, 23, fore, "Georgia", "400");
  for (let i = 0; i < 5; i++) {
    const x = 290 + i * 145,
      y = cy + s * 0.28;
    line(
      c,
      [
        [x, y],
        [x + Math.sin(i) * 45, y - s * 0.7],
      ],
      fore,
      3,
    );
    for (let j = 0; j < 5; j++) {
      c.save();
      c.translate(x + Math.sin(i) * j * 7, y - j * s * 0.13);
      c.rotate((j % 2 ? 1 : -1) * 0.65);
      c.beginPath();
      c.ellipse(0, -30, 18, 50, 0, 0, TAU);
      c.fillStyle = j % 2 ? palette.accent : palette.support;
      c.fill();
      c.restore();
    }
  }
  line(
    c,
    [
      [65, h - 135],
      [1135, h - 135],
    ],
    fore,
    1,
  );
  text(c, caption, 65, h - 80, 29, fore, "Georgia", "400");
}
const theGarden: Poster = (c, h) =>
  page(
    c,
    h,
    palette.ground,
    palette.ink,
    "THE GARDEN",
    "No. 01 / Growing things",
    "Every leaf leaves a trace.",
  );
const fieldNotes: Poster = (c, h) =>
  page(
    c,
    h,
    palette.ink,
    palette.ground,
    "FIELD NOTES",
    "No. 02 / Collected forms",
    "A study of what remains.",
  );
/** A lightly torn edge advances in measured steps, outlined in the edge color. */
export const paperTear: TransitionEffect = ({ c, b, w, h, q, edge }) => {
  c.beginPath();
  const stepped = Math.floor(q * 22) / 22,
    front = (-0.1 + smooth(stepped) * 1.2) * w;
  const points = Array.from({ length: 81 }, (_, i) => [
    front + Math.sin(i * 2.37) * w * 0.006 + Math.sin(i * 0.7) * w * 0.004,
    (i / 80) * h,
  ]);
  c.moveTo(0, 0);
  points.forEach(([x, y]) => c.lineTo(x!, y!));
  c.lineTo(0, h);
  c.closePath();
  c.clip();
  c.drawImage(b, 0, 0, w, h);
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!)));
  c.strokeStyle = edge;
  c.lineWidth = w * 0.009;
  c.stroke();
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <PosterHandoff
      id={id}
      aspect={frame}
      label="paper transition between two original compositions"
      background={palette.ground}
      from={theGarden}
      to={fieldNotes}
      effect={paperTear}
      edge={palette.support}
    />
  );
}
