import { AestheticFilm, type AestheticLook, type CoverPainter } from "./shared/aesthetic-film";
import {
  circle,
  clamp,
  ease,
  line,
  loadImage,
  mix,
  mono,
  rect,
  sans,
  type C,
} from "./shared/canvas-paint";
import { caption, plate, serif, text } from "./shared/world-paint";
import type { Aspect } from "../src/primitives";
export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
const stonePlate = "/assets/motion-catalog/aesthetics/stone.png";
function stoneBlock(
  c: C,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  p: string[],
  depth = 30,
) {
  const [, ink, , edge] = p;
  c.save();
  c.translate(x, y);
  c.shadowColor = ink + "38";
  c.shadowBlur = 25;
  c.shadowOffsetX = 20;
  c.shadowOffsetY = 25;
  rect(c, 0, 0, w, h, p[0]);
  c.shadowBlur = 0;
  c.shadowOffsetX = 0;
  c.shadowOffsetY = 0;
  c.beginPath();
  c.moveTo(w, 0);
  c.lineTo(w + depth, -depth * 0.6);
  c.lineTo(w + depth, h - depth * 0.6);
  c.lineTo(w, h);
  c.closePath();
  c.fillStyle = edge;
  c.fill();
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(depth, -depth * 0.6);
  c.lineTo(w + depth, -depth * 0.6);
  c.lineTo(w, 0);
  c.closePath();
  c.fillStyle = p[2];
  c.fill();
  plate(c, stonePlate, 0, 0, w, h, t, 1.1);
  rect(c, 0, 0, w, h, p[0] + "15");
  c.restore();
}
function stackedSlabs(c: C, h: number, t: number, p: string[]) {
  const [, ink, light, edge] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, ink);
  const x = tall ? 295 : 710,
    bw = tall ? 575 : 350,
    bh = tall ? 150 : 98,
    base = h * (tall ? 0.63 : 0.53),
    separation = 12 + 75 * ease((t - 0.3) / 3.5);
  for (let i = 2; i >= 0; i--)
    stoneBlock(c, x, base + (i - 1) * (bh + separation), bw, bh, t + i, p, 65);
  text(c, "Built", 65, tall ? h * 0.16 : 240, tall ? 205 : 168, light, sans, "900", "left", 650);
  text(
    c,
    "to last.",
    65,
    tall ? h * 0.16 + 200 : 415,
    tall ? 190 : 155,
    light,
    sans,
    "900",
    "left",
    670,
  );
  line(
    c,
    [
      [70, h - 70],
      [550, h - 70],
    ],
    edge,
    1,
  );
  for (let i = 0; i <= 12; i++)
    line(
      c,
      [
        [70 + i * 40, h - 70],
        [70 + i * 40, h - 70 - (i % 3 ? 9 : 20)],
      ],
      light,
      1,
    );
  caption(c, "MATERIAL / TRAVERTINE", h, light);
}
function grainMagnifier(c: C, h: number, t: number, p: string[]) {
  const [, ink, light, edge] = p,
    tall = h > 900;
  plate(c, stonePlate, 0, 0, 1200, h, t, 1.3);
  const band = tall ? 270 : 250;
  rect(c, 1200 - band, 0, band, h, ink);
  const lx = 480 + 110 * Math.sin(t * 0.3),
    ly = h * 0.43,
    r = tall ? 245 : 190;
  c.save();
  circle(c, lx + 12, ly + 14, r, ink + "40");
  circle(c, lx, ly, r, light);
  c.clip();
  plate(c, stonePlate, lx - r, ly - r, r * 2, r * 2, t, 3.2);
  c.restore();
  circle(c, lx, ly, r, light, true, 5);
  circle(c, lx, ly, r + 16, ink, true, 1);
  line(
    c,
    [
      [lx + r * 0.7, ly - r * 0.7],
      [1010, h * 0.24],
      [1130, h * 0.24],
    ],
    light,
    2,
  );
  text(c, "× 3.2", 1065, h * 0.24 - 20, 29, light, mono);
  text(c, "GRAIN", 60, h * 0.8, tall ? 165 : 155, ink, sans, "900", "left", 835);
  text(c, "of time", 65, h * 0.8 + 75, 61, ink, serif, "italic", "left", 800);
  caption(c, "MATERIAL / TRAVERTINE", h, edge);
}
function lintelSupports(c: C, h: number, t: number, p: string[]) {
  const [, ink, light, edge] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, light);
  const unit = tall ? 215 : 170,
    base = h * (tall ? 0.76 : 0.82),
    left = 600 - unit * 1.55,
    rows = 3;
  for (let i = 0; i < 6; i++) {
    const col = i % 2,
      row = Math.floor(i / 2),
      q = ease((t - i * 0.23) / 1.65),
      xx = left + col * unit * 2.1,
      yy = base - row * (unit * 0.68 + 6);
    stoneBlock(
      c,
      mix(col ? 1180 : -unit, xx, q),
      mix(yy - 120, yy, q),
      unit,
      unit * 0.68,
      t + i,
      p,
      38,
    );
  }
  const q = ease((t - 1.5) / 2.1);
  stoneBlock(
    c,
    600 - unit * 1.55,
    mix(-unit, base - rows * (unit * 0.68 + 6), q),
    unit * 3.1,
    unit * 0.65,
    t,
    p,
    38,
  );
  text(c, "Every part", 600, tall ? h * 0.14 : 90, tall ? 115 : 75, ink, sans, "900");
  text(c, "holds.", 600, tall ? h * 0.14 + 125 : 174, tall ? 140 : 90, ink, sans, "900");
  line(
    c,
    [
      [80, base + unit * 0.68 + 25],
      [1120, base + unit * 0.68 + 25],
    ],
    edge,
    2,
  );
  caption(c, "MATERIAL / TRAVERTINE", h, edge);
}
/** Four staggered slabs rise from the bottom to cover the frame, then lift away upward. */
const risingSlabs: CoverPainter = (c, h, q, coverage, p) => {
  for (let i = 0; i < 4; i++) {
    const hh = h * clamp(coverage * 1.25 - i * 0.075);
    rect(c, i * 300, q < 0.5 ? h - hh : 0, 301, hh, p[0]!);
  }
};
export const look: AestheticLook = {
  palette: ["#d5c8b4", "#39342e", "#eee6d6", "#92826e"],
  scenes: [stackedSlabs, grainMagnifier, lintelSupports],
  handoff: {
    cover: risingSlabs,
    label: "Rising slabs",
    reason: "Heavy segmented planes continue the stacked stone forms.",
    study: "horizontal-panel-wipe",
  },
  prepare: () => loadImage(stonePlate),
  stableRaster: true,
};
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      look={look}
      label="Stone: The grain of time. Three composed scenes with connected transitions."
    />
  );
}
