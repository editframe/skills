import { AestheticFilm, type AestheticLook } from "./shared/aesthetic-film";
import {
  TAU,
  circle,
  line,
  mono,
  orbitType,
  rect,
  sans,
  solid,
  text,
  type C,
} from "./shared/canvas-paint";
import { box, ry, type Vec3 } from "./shared/solid-studies";
import { cardFlip } from "./card-flip-transition";
import type { Aspect } from "../src/primitives";

export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
function toy(c: C, x: number, y: number, size: number, t: number, p: string[], phase = 0) {
  const bounce = Math.sin(t * 3.5) * Math.exp(-t * 0.8) * 0.3;
  const pieces = [
    ...box([0, -1.7, 0], [3.4, 0.45, 1.5], p[4]),
    ...box([-0.9, -0.65, 0], [0.55, 1.75, 1], p[2]),
    ...box([0.9, -0.65, 0], [0.55, 1.75, 1], p[5]),
    ...box([0, 0.15 + bounce, 0], [3.1, 0.4, 1.3], p[3]),
    ...box([0, 1 + bounce, 0], [0.65, 1.5, 0.85], p[4]),
    ...box([0, 1.9 + bounce, 0], [2, 0.35, 1.15], p[2]),
  ];
  // Diagonal braces make a furniture-like assemblage rather than another stack of slabs.
  for (const side of [-1, 1])
    pieces.push(
      ...box([0, 0, 0], [0.42, 1.7, 0.8], p[side === 1 ? 5 : 3]).map((f) => ({
        ...f,
        vertices: f.vertices.map(
          ([a, b, z]) =>
            [
              a * Math.cos(side * 0.65) - b * Math.sin(side * 0.65) + side * 1.2,
              b * Math.cos(side * 0.65) + a * Math.sin(side * 0.65) + 0.85,
              z,
            ] as Vec3,
        ),
      })),
    );
  solid(
    c,
    pieces.map((f) => ({
      ...f,
      vertices: f.vertices.map((v) => ry(v, Math.sin(t * 0.7 + phase) * 0.22 - 0.25)),
    })),
    x,
    y,
    size,
    [3, 2.2, 12],
  );
}
function squiggles(c: C, x: number, y: number, w: number, h: number, ink: string) {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  for (let j = 0; j < h / 42 + 1; j++)
    for (let i = 0; i < w / 55 + 1; i++) {
      const xx = x + i * 55 + (j % 2) * 23,
        yy = y + j * 42;
      c.save();
      c.translate(xx, yy);
      c.rotate((i + j) % 2 ? 0.6 : -0.4);
      line(
        c,
        [
          [0, 0],
          [7, -6],
          [14, 0],
          [21, -6],
          [28, 0],
        ],
        ink,
        3,
      );
      c.restore();
    }
  c.restore();
}
function sticker(
  c: C,
  label: string,
  x: number,
  y: number,
  w: number,
  angle: number,
  bg: string,
  ink: string,
  size: number,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  rect(c, 8, 8, w, size * 1.25, ink);
  rect(c, 0, 0, w, size * 1.25, bg);
  text(c, label, 17, size, size, ink, sans, "900");
  c.restore();
}
function noisePoster(c: C, h: number, t: number, palette: string[]) {
  const [blue, ink, pink, orange, yellow, mint] = palette,
    tall = h > 900;
  const cy = tall ? h * 0.55 : h * 0.53,
    r = tall ? 400 : 250;
  circle(c, 770, cy, r, pink);
  squiggles(c, 650, 70, 600, h - 110, ink);
  c.save();
  c.beginPath();
  c.arc(770, cy, r, 0, TAU);
  c.clip();
  rect(c, 370, cy - r, 800, r * 2, pink);
  for (let i = 0; i < 12; i++)
    line(
      c,
      [
        [380 + i * 75, cy - r],
        [180 + i * 75, cy + r],
      ],
      orange,
      17,
    );
  c.restore();
  toy(c, 780, cy, tall ? 1050 : 700, t, palette);
  const drift = Math.sin(t * 3) * Math.exp(-t * 0.7) * 0.06;
  sticker(c, "MAKE", 55, tall ? 145 : 150, 510, -0.07 + drift, yellow, ink, 117);
  sticker(c, "SOME", 80, tall ? 330 : 310, 480, 0.07 - drift, mint, ink, 114);
  sticker(c, "NOISE!", 55, tall ? 515 : 465, 590, -0.045 + drift, pink, ink, 119);
  if (tall) {
    rect(c, 55, h - 285, 1090, 170, yellow);
    squiggles(c, 55, h - 285, 1090, 170, ink);
    sticker(c, "SERIOUSLY PLAYFUL.", 165, h - 255, 860, -0.035, blue, yellow, 58);
  }
}
function playTiles(c: C, h: number, t: number, palette: string[]) {
  const [blue, ink, pink, orange, yellow, mint] = palette;
  const top = 90,
    hh = h - 145,
    ch = (hh - 18) / 2,
    cw = 531;
  for (let i = 0; i < 4; i++) {
    const x = 60 + (i % 2) * 549,
      y = top + Math.floor(i / 2) * (ch + 18),
      tt = Math.max(0, t - i * 0.13),
      dy = Math.sin(tt * 5) * Math.exp(-tt * 0.9) * 22;
    c.save();
    c.translate(x, y + dy);
    rect(c, 8, 8, cw, ch, ink);
    rect(c, 0, 0, cw, ch, [pink, yellow, mint, orange][i]);
    c.beginPath();
    c.rect(0, 0, cw, ch);
    c.clip();
    if (i % 2 === 0) squiggles(c, 0, 0, cw, ch, blue);
    else
      for (let j = 0; j < 10; j++)
        line(
          c,
          [
            [j * 65, 0],
            [j * 65 - 160, ch],
          ],
          ink,
          5,
        );
    circle(c, 160, ch * 0.48, Math.min(ch * 0.39, 165), [yellow, pink, orange, mint][i]);
    text(c, ["P", "L", "A", "Y"][i], 45, ch * 0.72, Math.min(ch * 0.85, 280), ink, sans, "900");
    toy(c, 385, ch * 0.52, Math.min(ch * 1.7, 650), t + i, palette, i);
    c.restore();
  }
}
function mottoOrbit(c: C, h: number, t: number, palette: string[]) {
  const [, ink, pink, , yellow, mint] = palette;
  const cy = h * 0.5,
    r = Math.min(390, h * 0.39);
  circle(c, 600, cy, r, yellow);
  squiggles(c, 0, 70, 180, h - 140, mint);
  squiggles(c, 1020, 70, 180, h - 140, mint);
  orbitType(c, "MORE • IS • MORE • IS • ", 600, cy, r + 28, t * 1.7, pink, sans);
  toy(c, 600, cy, r * 2.2, t + 12, palette);
  sticker(c, "BETTER TOGETHER", 220, h - 145, 810, -0.025, mint, ink, 66);
}
function masthead(c: C, _h: number, scene: number, p: string[]) {
  const n = String(scene + 1).padStart(2, "0");
  text(c, "THE PLAY DEPARTMENT", 48, 38, 16, p[4], mono, "700");
  text(c, `VOL. ${n}`, 1152, 38, 16, p[4], mono, "700", "right");
}
export const look: AestheticLook = {
  palette: ["#2542eb", "#181317", "#ff80bf", "#ff6339", "#ffe433", "#60e7bb"],
  scenes: [noisePoster, playTiles, mottoOrbit],
  labels: masthead,
  handoff: {
    effect: cardFlip,
    duration: 1.15,
    label: "Playful tile turnover",
    reason:
      "A staggered flip carries the patchwork colors and toy-like surfaces into the next scene.",
    study: "card-flip-transition",
  },
};
/** Three composed scenes; source mechanisms and research: data/aesthetics.json. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      look={look}
      label="Memphis Play: A little more, please. Three scenes combine type, form, and layout with connecting transitions."
    />
  );
}
