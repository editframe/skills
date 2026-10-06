import { circle, PosterHandoff, posterGround, text, type C } from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
import { smooth, type TransitionEffect } from "./shared/transition-compositor";
export const duration = 8;
export const posterTime = 2.55;
export const aspect = "landscape" as const;
const palette = { ground: "#2542c7", ink: "#fee568", accent: "#f486ac", support: "#1b2534" };
/** The card fronts: a disc crossed by a tilted bar. */
function play(c: C, h: number) {
  const { ground, ink, accent, support } = palette;
  const { s, cx, cy } = posterGround(c, h, ground);
  text(c, "PLAY.", 60, 160, 150, ink, "Arial", "900");
  circle(c, cx, cy, s * 0.43, accent);
  c.save();
  c.translate(cx, cy);
  c.rotate(-0.4);
  c.fillStyle = support;
  c.fillRect(-s * 0.53, -s * 0.07, s * 1.06, s * 0.14);
  c.restore();
  text(c, "Every surface has another side.", 60, h - 70, 27, ink, "Georgia", "400");
}
/** The card backs, composed differently: three round-topped pillars. */
function again(c: C, h: number) {
  const { ground, ink, accent, support } = palette;
  const { s, cx, cy } = posterGround(c, h, ink);
  text(c, "AGAIN.", 60, 160, 150, ground, "Arial", "900");
  for (let i = 0; i < 3; i++) {
    c.fillStyle = i === 1 ? accent : support;
    c.fillRect(cx - s * 0.44 + i * s * 0.3, cy - s * 0.3, s * 0.24, s * 0.65);
    circle(c, cx - s * 0.32 + i * s * 0.3, cy - s * 0.3, s * 0.12, i === 1 ? accent : support);
  }
  text(c, "A different side of the same story.", 60, h - 70, 27, ground, "Georgia", "400");
}
/** Orthographic rotation about each card's Y axis; its back has a distinct image. */
export const cardFlip: TransitionEffect = ({ c, a, b, w, h, q, edge }) => {
  c.fillStyle = edge;
  c.fillRect(0, 0, w, h);
  const cols = 6,
    rows = 4,
    cw = w / cols,
    ch = h / rows;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const t = smooth((q - (x + y) * 0.033) / 0.7),
        scale = Math.abs(Math.cos(t * Math.PI)),
        dw = cw * scale;
      const image = t < 0.5 ? a : b;
      c.drawImage(
        image,
        x * cw,
        y * ch,
        cw,
        ch,
        x * cw + (cw - dw) / 2,
        y * ch,
        dw + 0.15,
        ch + 0.25,
      );
      c.globalAlpha = 0.24 * Math.sin(t * Math.PI);
      c.fillStyle = "#12121a";
      c.fillRect(x * cw + (cw - dw) / 2, y * ch, dw, ch);
      c.globalAlpha = 1;
    }
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <PosterHandoff
      id={id}
      aspect={frame}
      label="cards transition between two original compositions"
      background={palette.ground}
      from={play}
      to={again}
      effect={cardFlip}
      edge={palette.support}
    />
  );
}
