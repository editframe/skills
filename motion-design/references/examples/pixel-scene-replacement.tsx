import { PosterHandoff, posterGround, text, type C, type Poster } from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
import type { TransitionEffect } from "./shared/transition-compositor";
export const duration = 8;
export const posterTime = 2.5;
export const aspect = "landscape" as const;
const palette = { ground: "#151e27", ink: "#a8d09c", accent: "#64a4a2", support: "#e8ba79" };
/** A status board of lit cells; `offset` changes which cells take the accent. */
function board(
  c: C,
  h: number,
  back: string,
  fore: string,
  offset: number,
  title: string,
  status: string,
) {
  const { s, cx, cy } = posterGround(c, h, back);
  text(c, title, 65, 115, 66, fore, "Courier New");
  const unit = s / 12;
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 12; x++) {
      c.fillStyle = (x * 7 + y * 3 + offset) % 13 < 6 ? palette.accent : palette.support;
      c.fillRect(cx - s / 2 + x * unit, cy - s * 0.35 + y * unit, unit * 0.72, unit * 0.72);
    }
  text(c, status, 65, h - 80, 29, fore, "Courier New");
}
const dayShift: Poster = (c, h) =>
  board(c, h, palette.ground, palette.ink, 0, "DAY SHIFT", "SYSTEM 01 / ONLINE");
const nightShift: Poster = (c, h) =>
  board(c, h, palette.ink, palette.ground, 11, "NIGHT SHIFT", "SYSTEM 02 / ONLINE");
/** Screen cells switch to scene B in a fixed hashed order. */
export const pixelReplacement: TransitionEffect = ({ c, b, w, h, q }) => {
  const cols = 24,
    rows = Math.ceil((cols * h) / w),
    cw = w / cols,
    ch = h / rows;
  c.beginPath();
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      if ((hash % 997) / 997 < q) c.rect(x * cw, y * ch, cw + 0.6, ch + 0.6);
    }
  c.clip();
  c.drawImage(b, 0, 0, w, h);
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <PosterHandoff
      id={id}
      aspect={frame}
      label="blocks transition between two original compositions"
      background={palette.ground}
      from={dayShift}
      to={nightShift}
      effect={pixelReplacement}
      edge={palette.support}
    />
  );
}
