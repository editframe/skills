import { AESTHETIC_TRANSITION_PROFILES } from "./aesthetic-transitions";
import { compositeTransition } from "./transition-compositor";
import { fontFamily, prepareAestheticFont } from "./aesthetic-fonts";
import { shiftPalette } from "./aesthetic-palette";
import { isWorld, paintWorld, prepareWorld, worldTransition } from "./aesthetic-worlds";
import { memo, useCallback } from "react";
import {
  AESTHETIC_PALETTES as palettes,
  type Aesthetic,
  type AestheticSettings,
  aestheticSceneAt,
} from "./aesthetic-settings";
export type { Aesthetic } from "./aesthetic-settings";
import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, type Aspect } from "../../src/primitives";
import { box, project, rx, ry, type Face, type Vec3 } from "./solid-studies";

type C = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const sans = "Arial, Helvetica, sans-serif",
  mono = "Courier New, monospace",
  serif = "Georgia, serif";
// Settings belong to the canvas being painted, including independently mounted
// render clones. No shared palette or live preview is mutated by another canvas.
const settingsByContext = new WeakMap<C, AestheticSettings>();
const transitionCanvases = new WeakMap<C, [HTMLCanvasElement, HTMLCanvasElement]>();
const paletteFor = (c: C, kind: Aesthetic) => settingsByContext.get(c)?.palette ?? palettes[kind];
const fontFor = (c: C, font: string, size: number) => {
  const choice = settingsByContext.get(c)?.font;
  return fontFamily(choice, font);
};

function rect(c: C, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function circle(c: C, x: number, y: number, r: number, color: string) {
  c.beginPath();
  c.arc(x, y, Math.max(0, r), 0, TAU);
  c.fillStyle = color;
  c.fill();
}
function line(c: C, points: number[][], color: string, width = 2) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function text(
  c: C,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  font = sans,
  weight = "400",
  align: CanvasTextAlign = "left",
) {
  const chosenFont = fontFor(c, font, size);
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = "alphabetic";
  if (chosenFont === font) {
    c.font = `${weight} ${size}px ${font}`;
    c.fillText(value, x, y);
  } else {
    c.font = `${weight} ${size}px ${font}`;
    const originalWidth = c.measureText(value).width;
    c.font = `${weight} ${size}px ${chosenFont}`;
    c.fillText(value, x, y, Math.max(1, originalWidth));
  }
}
function detail(...args: Parameters<typeof text>) {
  if (settingsByContext.get(args[0])?.labels === true) text(...args);
}

function reveal(
  c: C,
  words: string[],
  x: number,
  y: number,
  size: number,
  color: string,
  t: number,
  font = sans,
  weight = "700",
) {
  words.forEach((word, i) => {
    const p = ease((t - 0.15 - i * 0.16) / 0.85);
    c.save();
    c.beginPath();
    c.rect(x - 5, y + (i - 1) * size * 1.03 + size * 0.08, 1100, size * 1.05);
    c.clip();
    text(c, word, x, y + i * size * 1.03 + (1 - p) * size * 1.15, size, color, font, weight);
    c.restore();
  });
}
function strokeCircle(c: C, x: number, y: number, r: number, color: string, width = 2) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function solid(c: C, faces: Face[], x: number, y: number, size: number, eye: Vec3 = [5, 3.8, 10]) {
  c.save();
  c.translate(x - size / 2, y - size / 2);
  c.scale(size / 1000, size / 1000);
  for (const face of project({ faces, eye, focal: 1450 })) {
    const points = face.points.split(" ").map((p) => p.split(",").map(Number));
    c.beginPath();
    points.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
    c.fillStyle = face.color;
    c.fill();
    c.strokeStyle = face.color;
    c.lineWidth = 0.7;
    c.stroke();
  }
  c.restore();
}
function cubes(
  c: C,
  x: number,
  y: number,
  size: number,
  t: number,
  colors: string[],
  explode = 0,
  wire = false,
) {
  const faces = Array.from({ length: 3 }, (_, i) =>
    box([0, (i - 1) * (0.95 + explode), 0], [2.1, 0.76, 2.1], colors[i % colors.length]),
  )
    .flat()
    .map((f) => ({
      ...f,
      vertices: f.vertices.map((p) => ry(p, -0.35 + Math.sin(t * 0.35) * 0.35)),
    }));
  if (!wire) solid(c, faces, x, y, size);
  else {
    c.save();
    c.translate(x - size / 2, y - size / 2);
    c.scale(size / 1000, size / 1000);
    for (const f of project({ faces, eye: [5, 4, 10], focal: 1450 })) {
      line(
        c,
        [
          ...f.points.split(" ").map((p) => p.split(",").map(Number)),
          f.points.split(" ")[0].split(",").map(Number),
        ],
        colors[0],
        2,
      );
    }
    c.restore();
  }
}
function orbitType(
  c: C,
  label: string,
  x: number,
  y: number,
  r: number,
  t: number,
  color: string,
  font = sans,
) {
  [...label].forEach((ch, i) => {
    const a = (i / label.length) * TAU + t * 0.17;
    c.save();
    c.translate(x + Math.sin(a) * r, y - Math.cos(a) * r);
    c.rotate(a);
    text(c, ch, 0, 0, r * 0.12, color, font, "700", "center");
    c.restore();
  });
}
// Each film has its own framing and typographic hierarchy, not a shared title/object template.
function furniture(c: C, h: number, kind: Aesthetic, scene: number) {
  if (isWorld(kind)) return;
  const p = paletteFor(c, kind),
    n = String(scene + 1).padStart(2, "0");
  if (kind === "swiss") {
    text(c, "FORM / STUDIES IN ORDER", 48, 38, 15, p[1], sans, "700");
    text(c, `${n} — 03`, 1152, 38, 15, p[1], sans, "700", "right");
  }
  if (kind === "memphis") {
    text(c, "THE PLAY DEPARTMENT", 48, 38, 16, p[4], mono, "700");
    text(c, `VOL. ${n}`, 1152, 38, 16, p[4], mono, "700", "right");
  }
  if (kind === "instrument") {
    text(c, "OBSERVATIONS OF RELATIVE MOTION", 600, 48, 15, p[1], serif, "400", "center");
    text(c, `PLATE ${["I", "II", "III"][scene]}`, 600, h - 28, 15, p[1], serif, "400", "center");
  }
  if (kind === "organic") {
    text(c, "FORM & FEELING", 58, 48, 16, p[1], sans);
    text(c, `${n} / CONTINUOUS STUDIES`, 1142, h - 35, 13, p[1], sans, "400", "right");
  }
  if (kind === "terminal") {
    text(c, "FORM.OS  /  EXPERIMENTAL WORKSTATION", 65, 43, 15, p[1], mono);
    text(c, `SESSION 00${scene + 1}`, 1135, 43, 15, p[1], mono, "400", "right");
  }
  if (kind === "optical") {
    rect(c, 38, 24, 335, 29, p[0]);
    text(c, `PERCEPTION / EXPERIMENT ${n}`, 49, 44, 14, p[1], mono, "700");
  }
}
function swiss(c: C, h: number, s: number, t: number) {
  const [red, ink, paper, pink] = paletteFor(c, "swiss"),
    tall = h > 900;
  if (s === 0) {
    const top = 70,
      bottom = tall ? h * 0.66 : h * 0.55;
    // The diagonal grid is also the plan of the exploded object: flat bars acquire depth.
    c.save();
    c.beginPath();
    c.rect(0, top, 1200, bottom - top);
    c.clip();
    c.translate(590, (top + bottom) / 2);
    c.rotate(-Math.PI / 5);
    for (let i = 0; i < 5; i++) {
      const delay = i * 0.09,
        p = ease((t - delay) / 0.65);
      rect(c, -850 + (1 - p) * 160, (i - 2) * 95, 1700, 58, i === 2 ? paper : ink);
    }
    c.restore();
    const depth = 0.08 + 0.56 * ease((t - 1) / 2);
    cubes(
      c,
      tall ? 800 : 900,
      tall ? h * 0.38 : 250,
      h > 1600 ? 1080 : tall ? 760 : 510,
      t * 0.22,
      [paper, pink, paper],
      depth,
    );
    const y = bottom + (h > 1600 ? 190 : 125);
    reveal(
      c,
      ["form follows", "order."],
      48,
      y,
      h > 1600 ? 183 : tall ? 123 : 119,
      ink,
      t,
      sans,
      "900",
    );
    detail(c, "01 / VOLUME", tall ? 55 : 790, h - 66, 17, ink, mono);
    detail(c, "Three parts. One system.", tall ? 55 : 790, h - 39, 18, ink, sans);
  } else if (s === 1) {
    const cut = mix(600, 760, ease((t - 0.4) / 2)),
      top = 80,
      foot = h - 80;
    rect(c, 0, top, cut, foot - top, ink);
    rect(c, cut + 12, top, 1200 - cut - 12, foot - top, paper);
    c.save();
    c.beginPath();
    c.rect(0, top, cut, foot - top);
    c.clip();
    text(
      c,
      "Aa",
      35,
      top + Math.min(foot - top, h > 1600 ? 610 : tall ? 410 : 270),
      h > 1600 ? 530 : tall ? 420 : 330,
      red,
      sans,
      "900",
    );
    cubes(
      c,
      cut * 0.5,
      top + (foot - top) * (h > 1600 ? 0.61 : 0.72),
      h > 1600 ? 1080 : tall ? 720 : 450,
      t * 0.22,
      [paper, paper, pink],
      0.48,
    );
    c.restore();
    const x = cut + 36,
      step = (foot - top) / 3;
    ["ALIGN", "SPACE", "REPEAT"].forEach((v, i) => {
      const yy = top + i * step;
      line(
        c,
        [
          [x, yy + 18],
          [1170, yy + 18],
        ],
        ink,
        2,
      );
      text(c, `0${i + 1}`, x, yy + 56, 23, ink, mono);
      text(
        c,
        v,
        x,
        yy + Math.min(step - 20, 140),
        Math.min(61, (1200 - x - 25) / (v.length * 0.64)),
        ink,
        sans,
        "900",
      );
    });
    text(c, "A PLACE FOR EVERYTHING.", 48, h - 31, 27, ink, sans, "700");
  } else {
    reveal(
      c,
      ["every part", "counts."],
      48,
      tall ? 220 : 177,
      tall ? 157 : 150,
      ink,
      t,
      sans,
      "900",
    );
    if (h > 1600) {
      const top = 560,
        row = (h - 700) / 3,
        p = ease((t - 0.2) / 1.5);
      for (let g = 0; g < 3; g++) {
        const yy = top + g * row;
        line(
          c,
          [
            [48, yy],
            [1152, yy],
          ],
          ink,
          2,
        );
        text(c, ["20", "25", "15"][g], 48, yy + 175, 168, ink, sans, "900");
        text(c, ["FORM", "SPACE", "RHYTHM"][g], 52, yy + 235, 26, ink, mono);
        for (let i = 0; i < [20, 25, 15][g]; i++) {
          const n = i + [0, 20, 45][g];
          rect(
            c,
            mix(250 + (n % 10) * 55, 580 + (i % 5) * 66, p),
            mix(850 + Math.floor(n / 10) * 55, yy + 65 + Math.floor(i / 5) * 66, p),
            51,
            51,
            g === 1 ? paper : ink,
          );
        }
      }
      return;
    }
    const top = tall ? h * 0.39 : 360,
      bottom = h - 95,
      gw = 344,
      gap = tall ? 42 : 31,
      unit = tall ? 32 : 23,
      p = ease((t - 0.2) / 1.5);
    for (let g = 0; g < 3; g++) {
      const x = 48 + g * 374;
      line(
        c,
        [
          [x, top],
          [x + gw, top],
        ],
        ink,
        2,
      );
      const yy = tall ? top + 130 : top + 40;
      text(c, ["20", "25", "15"][g], x, yy, tall ? 110 : 37, ink, sans, "900");
      const gridY = tall ? yy + 65 : yy + 30;
      for (let i = 0; i < [20, 25, 15][g]; i++) {
        const global = i + [0, 20, 45][g],
          dx = x + (i % 5) * gap,
          dy = gridY + Math.floor(i / 5) * gap;
        rect(
          c,
          mix(420 + (global % 10) * 34, dx, p),
          mix(gridY + Math.floor(global / 10) * 34, dy, p),
          unit,
          unit,
          g === 1 ? paper : ink,
        );
      }
      text(c, ["FORM", "SPACE", "RHYTHM"][g], x, bottom + 45, 18, ink, mono);
    }
  }
}
function toy(c: C, x: number, y: number, size: number, t: number, p: string[], variant = 0) {
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
      vertices: f.vertices.map((v) => ry(v, Math.sin(t * 0.7 + variant) * 0.22 - 0.25)),
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
function memphis(c: C, h: number, s: number, t: number) {
  const p = paletteFor(c, "memphis"),
    [blue, ink, pink, orange, yellow, mint] = p,
    tall = h > 900;
  if (s === 0) {
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
    toy(c, 780, cy, tall ? 1050 : 700, t, p);
    const drift = Math.sin(t * 3) * Math.exp(-t * 0.7) * 0.06;
    sticker(c, "MAKE", 55, tall ? 145 : 150, 510, -0.07 + drift, yellow, ink, 117);
    sticker(c, "SOME", 80, tall ? 330 : 310, 480, 0.07 - drift, mint, ink, 114);
    sticker(c, "NOISE!", 55, tall ? 515 : 465, 590, -0.045 + drift, pink, ink, 119);
    if (tall) {
      rect(c, 55, h - 285, 1090, 170, yellow);
      squiggles(c, 55, h - 285, 1090, 170, ink);
      sticker(c, "SERIOUSLY PLAYFUL.", 165, h - 255, 860, -0.035, blue, yellow, 58);
    }
  } else if (s === 1) {
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
      toy(c, 385, ch * 0.52, Math.min(ch * 1.7, 650), t + i, p, i);
      c.restore();
    }
  } else {
    const cy = h * 0.5,
      r = Math.min(390, h * 0.39);
    circle(c, 600, cy, r, yellow);
    squiggles(c, 0, 70, 180, h - 140, mint);
    squiggles(c, 1020, 70, 180, h - 140, mint);
    orbitType(c, "MORE • IS • MORE • IS • ", 600, cy, r + 28, t * 1.7, pink, sans);
    toy(c, 600, cy, r * 2.2, t + 12, p);
    sticker(c, "BETTER TOGETHER", 220, h - 145, 810, -0.025, mint, ink, 66);
  }
}
function calibrated(c: C, x: number, y: number, r: number, ink: string) {
  strokeCircle(c, x, y, r, ink, 1);
  strokeCircle(c, x, y, r + 10, ink, 0.8);
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * TAU,
      d = i % 10 === 0 ? 15 : i % 5 === 0 ? 9 : 4;
    line(
      c,
      [
        [x + Math.cos(a) * r, y + Math.sin(a) * r],
        [x + Math.cos(a) * (r - d), y + Math.sin(a) * (r - d)],
      ],
      ink,
      0.8,
    );
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    text(
      c,
      String(i * 30),
      x + Math.sin(a) * (r + 28),
      y - Math.cos(a) * (r + 28) + 4,
      12,
      ink,
      serif,
      "400",
      "center",
    );
  }
}
function engravedOrbit(c: C, x: number, y: number, r: number, t: number, p: string[]) {
  const [, ink, copper, blue] = p;
  calibrated(c, x, y, r * 1.52, ink);
  for (let i = 0; i < 3; i++)
    for (let edge = -1; edge <= 1; edge++) {
      const rr = (1 + i * 0.2) * r + edge * 3,
        pts = Array.from({ length: 145 }, (_, j) => {
          const a = (j / 144) * TAU,
            v = ry(
              rx([Math.cos(a) * rr, Math.sin(a) * rr, 0], i * 0.65 + 0.3),
              0.45 + Math.sin(t * 0.12) * 0.08,
            );
          return [x + v[0], y + v[1]];
        });
      line(c, pts, i === 1 ? copper : ink, edge === 0 ? 1.5 : 0.6);
    }
  for (let i = 0; i < 3; i++) {
    const a = t * (0.21 + i * 0.07) + i * 2,
      v = ry(
        rx([Math.cos(a) * (1 + i * 0.2) * r, Math.sin(a) * (1 + i * 0.2) * r, 0], i * 0.65 + 0.3),
        0.45,
      );
    circle(c, x + v[0], y + v[1], 6, i === 1 ? blue : copper);
  }
  circle(c, x, y, r * 0.16, p[0]);
  strokeCircle(c, x, y, r * 0.16, ink, 1);
  for (let i = -5; i <= 5; i++) {
    const yy = i * r * 0.025,
      xx = Math.sqrt(Math.max(0, (r * 0.15) ** 2 - yy * yy));
    line(
      c,
      [
        [x - xx, y + yy],
        [x + xx, y + yy],
      ],
      ink,
      0.55,
    );
  }
  line(
    c,
    [
      [x - r * 1.8, y],
      [x + r * 1.8, y],
    ],
    ink,
    0.45,
  );
  line(
    c,
    [
      [x, y - r * 1.8],
      [x, y + r * 1.8],
    ],
    ink,
    0.45,
  );
}
function instrument(c: C, h: number, s: number, t: number) {
  const p = paletteFor(c, "instrument"),
    [paper, ink, copper, blue] = p,
    tall = h > 900;
  // Registered paper marks are deterministic and stationary; the instrument supplies the motion.
  c.save();
  c.globalAlpha = 0.16;
  for (let i = 0; i < 950; i++) {
    const x = 35 + ((i * 173.23) % 1130),
      y = 65 + ((i * 97.71) % (h - 130));
    line(
      c,
      [
        [x, y],
        [x + 1.6, y + 0.4],
      ],
      copper,
      0.6,
    );
  }
  c.restore();
  line(
    c,
    [
      [30, 66],
      [1170, 66],
      [1170, h - 60],
      [30, h - 60],
      [30, 66],
    ],
    ink,
    0.8,
  );
  line(
    c,
    [
      [38, 73],
      [1162, 73],
      [1162, h - 67],
      [38, h - 67],
      [38, 73],
    ],
    ink,
    0.4,
  );
  const titles = ["An atlas of motion", "A closer observation", "On periodic relations"];
  const label = titles[s].slice(0, Math.floor(t * 36));
  text(c, label, 600, 125, tall ? 58 : 44, ink, serif, "400", "center");
  text(
    c,
    [
      "FIG. I — CIRCLES OF REVOLUTION",
      "FIG. II — OBSERVATION & ENLARGEMENT",
      "FIG. III — THE ORBIT & ITS TRACE",
    ][s],
    600,
    157,
    13,
    copper,
    serif,
    "400",
    "center",
  );
  if (s === 0) {
    const cy = tall ? h * 0.51 : 375,
      r = tall ? Math.min(260, (h - 420) / 3.7) : 105;
    engravedOrbit(c, 600, cy, r, t, p);
    const a = t * 0.21,
      v = ry(rx([Math.cos(a) * r, Math.sin(a) * r, 0], 0.3), 0.45),
      ax = 600 + v[0],
      ay = cy + v[1];
    line(
      c,
      [
        [ax, ay],
        [tall ? 920 : 920, cy - r * 0.6],
        [1090, cy - r * 0.6],
      ],
      copper,
      0.9,
    );
    text(c, "a. Satellite", 940, cy - r * 0.6 - 8, 18, ink, serif, "italic");
    for (let i = 0; i < 2; i++) {
      const x = 165 + i * 870,
        y = tall ? cy + 180 : 455;
      strokeCircle(c, x, y, 45, ink, 0.8);
      line(
        c,
        [
          [x - 58, y],
          [x + 58, y],
        ],
        ink,
        0.7,
      );
      line(
        c,
        [
          [x, y - 58],
          [x, y + 58],
        ],
        ink,
        0.7,
      );
      text(c, i ? "Meridian" : "Equator", x, y + 77, 17, ink, serif, "italic", "center");
    }
    text(
      c,
      "The position changes; the relation endures.",
      600,
      h - 91,
      22,
      ink,
      serif,
      "italic",
      "center",
    );
  } else if (s === 1) {
    const cx = tall ? 600 : 360,
      cy = tall ? h * 0.4 : 390,
      r = tall ? Math.min(220, h * 0.145) : 112;
    engravedOrbit(c, cx, cy, r, t + 6, p);
    const ix = tall ? 600 : 910,
      iy = tall ? h * 0.74 : 385,
      ir = tall ? Math.min(225, h * 0.14) : 150;
    line(
      c,
      [
        [cx + r * 0.25, cy - r * 0.25],
        [ix, iy - ir],
      ],
      copper,
      1,
    );
    strokeCircle(c, cx, cy, r * 0.3, copper, 1.5);
    circle(c, ix, iy, ir, paper);
    calibrated(c, ix, iy, ir, ink);
    c.save();
    c.beginPath();
    c.arc(ix, iy, ir - 12, 0, TAU);
    c.clip();
    engravedOrbit(c, ix - 40, iy + 35, r * 2.5, t + 6, p);
    c.restore();
    text(c, "Detail of the same orbit · 2½×", ix, iy + ir + 47, 19, ink, serif, "italic", "center");
  } else {
    const cy = tall ? h * 0.36 : 348,
      cx = tall ? 600 : 310,
      r = tall ? Math.min(220, h * 0.13) : 99;
    engravedOrbit(c, cx, cy, r, t + 12, p);
    const gx = tall ? 160 : 625,
      gy = tall ? h * 0.72 : 365,
      gw = tall ? 880 : 480,
      gh = tall ? Math.min(185, h * 0.12) : 125;
    for (let i = 0; i < 7; i++)
      line(
        c,
        [
          [gx, gy - gh + (i * gh) / 3],
          [gx + gw, gy - gh + (i * gh) / 3],
        ],
        copper,
        0.35,
      );
    for (let i = 0; i < 9; i++)
      line(
        c,
        [
          [gx + (i * gw) / 8, gy - gh],
          [gx + (i * gw) / 8, gy + gh],
        ],
        copper,
        0.35,
      );
    line(
      c,
      [
        [gx, gy - gh],
        [gx, gy + gh],
        [gx + gw, gy + gh],
      ],
      ink,
      1,
    );
    const count = Math.max(2, Math.floor(200 * ease((t - 0.3) / 3))),
      points = Array.from({ length: count }, (_, i) => [
        gx + (i / 199) * gw,
        gy + Math.sin((i / 199) * TAU * 1.5 + t * 0.18) * gh * 0.8,
      ]);
    line(c, points, blue, 2.2);
    const end = points.at(-1)!;
    circle(c, end[0], end[1], 3, copper);
    text(c, "Time →", gx + gw, gy + gh + 28, 16, ink, serif, "italic", "right");
    text(
      c,
      "An illustrative trace of periodic motion.",
      600,
      h - 91,
      21,
      ink,
      serif,
      "italic",
      "center",
    );
  }
}
// Isocontour of a smooth scalar field: shared necks form before the bodies merge.
function metaballs(c: C, cx: number, cy: number, r: number, spread: number, color: string) {
  const centers = Array.from({ length: 3 }, (_, i) => [
    cx + Math.cos((i / 3) * TAU - Math.PI / 2) * spread,
    cy + Math.sin((i / 3) * TAU - Math.PI / 2) * spread,
  ]);
  const step = 9,
    left = cx - spread - r * 1.7,
    top = cy - spread - r * 1.7,
    n = Math.ceil(((spread + r * 1.7) * 2) / step);
  const field = Array.from({ length: n + 1 }, (_, y) =>
    Array.from(
      { length: n + 1 },
      (_, x) =>
        centers.reduce(
          (sum, [px, py]) =>
            sum + (r * r) / Math.max(1, (left + x * step - px) ** 2 + (top + y * step - py) ** 2),
          0,
        ) - 1.5,
    ),
  );
  c.beginPath();
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const vertices = [
        [left + x * step, top + y * step, field[y][x]],
        [left + (x + 1) * step, top + y * step, field[y][x + 1]],
        [left + (x + 1) * step, top + (y + 1) * step, field[y + 1][x + 1]],
        [left + x * step, top + (y + 1) * step, field[y + 1][x]],
      ];
      if (vertices.every((v) => v[2] < 0)) continue;
      if (vertices.every((v) => v[2] >= 0)) {
        c.rect(vertices[0][0], vertices[0][1], step, step);
        continue;
      }
      for (const indexes of [
        [0, 1, 2],
        [0, 2, 3],
      ]) {
        const points: number[][] = [];
        indexes.forEach((index, i) => {
          const a = vertices[index],
            b = vertices[indexes[(i + 1) % 3]];
          if (a[2] >= 0) points.push(a);
          if (a[2] >= 0 !== b[2] >= 0) {
            const t = a[2] / (a[2] - b[2]);
            points.push([mix(a[0], b[0], t), mix(a[1], b[1], t)]);
          }
        });
        if (points.length) {
          points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
          c.closePath();
        }
      }
    }
  c.fillStyle = color;
  c.fill();
}
function lantern(c: C, x: number, y: number, w: number, hh: number, t: number, p: string[]) {
  const [, cream, clay, glow] = p,
    breath = 1 + Math.sin(t * 0.65) * 0.035;
  c.save();
  c.translate(x, y);
  c.scale(breath, 1 / breath);
  const contour = (v: number) =>
      w * (0.31 + 0.16 * Math.cos(v * Math.PI) + 0.05 * Math.sin(v * 7 + t * 0.5)),
    shift = (v: number) => Math.sin(v * 4 + t * 0.4) * w * 0.07;
  const outline = () => {
    c.beginPath();
    for (let i = 0; i <= 80; i++) {
      const v = -1 + i / 40,
        xx = shift(v) + contour(v);
      i ? c.lineTo(xx, (v * hh) / 2) : c.moveTo(xx, (v * hh) / 2);
    }
    for (let i = 80; i >= 0; i--) {
      const v = -1 + i / 40;
      c.lineTo(shift(v) - contour(v), (v * hh) / 2);
    }
    c.closePath();
  };
  const halo = c.createRadialGradient(0, 0, w * 0.1, 0, 0, w * 0.8);
  halo.addColorStop(0, glow + "30");
  halo.addColorStop(1, glow + "00");
  c.fillStyle = halo;
  c.fillRect(-w, -hh, w * 2, hh * 2);
  outline();
  const light = c.createRadialGradient(-w * 0.12, -hh * 0.12, 0, 0, 0, hh * 0.7);
  light.addColorStop(0, cream);
  light.addColorStop(0.5, glow);
  light.addColorStop(1, clay);
  c.fillStyle = light;
  c.fill();
  c.save();
  c.clip();
  for (let i = 0; i < 44; i++) {
    const v = -1 + i / 21.5,
      yy = (v * hh) / 2,
      r = contour(v),
      sx = shift(v);
    c.beginPath();
    c.ellipse(sx, yy, r, hh * 0.012, 0, 0, TAU);
    c.strokeStyle = clay;
    c.globalAlpha = 0.36;
    c.lineWidth = 0.9;
    c.stroke();
  }
  c.globalAlpha = 0.1;
  for (let i = 0; i < 20; i++)
    line(
      c,
      [
        [(-0.45 + i / 21) * w, -hh / 2],
        [(-0.5 + i / 21) * w, hh / 2],
      ],
      cream,
      0.8,
    );
  c.restore();
  c.restore();
}
function organic(c: C, h: number, s: number, t: number) {
  const p = paletteFor(c, "organic"),
    [bg, cream, clay, glow] = p,
    tall = h > 900;
  const wash = c.createRadialGradient(770, h * 0.46, 30, 700, h * 0.45, Math.max(h, 1100) * 0.7);
  wash.addColorStop(0, clay);
  wash.addColorStop(1, bg);
  c.fillStyle = wash;
  c.fillRect(0, 0, 1200, h);
  if (s === 0) {
    const cy = tall ? h * 0.49 : h * 0.45,
      hh = tall ? h * 0.61 : h * 0.72;
    lantern(c, tall ? 650 : 830, cy, tall ? 760 : 570, hh, t, p);
    c.save();
    c.globalAlpha = ease(t / 1.9);
    text(c, "Soft", 60, tall ? h * 0.27 : 260, tall ? 215 : 190, cream, serif, "italic");
    c.globalAlpha = ease((t - 0.3) / 1.9);
    text(c, "by nature.", 60, tall ? h * 0.84 : 565, tall ? 175 : 145, cream, serif, "italic");
    c.restore();
    text(c, "Light. Form. A little room to breathe.", 64, h - 61, 23, cream, serif);
  } else if (s === 1) {
    const cy = tall ? h * 0.5 : h * 0.46,
      r = tall ? 175 : 90,
      spread = mix(r * 1.8, r * 0.58, ease(t / 2) * (1 - ease((t - 3.6) / 2)));
    c.save();
    c.shadowColor = glow;
    c.shadowBlur = 35;
    metaballs(c, 600, cy, r, spread, glow);
    c.restore();
    orbitType(
      c,
      "SEPARATE · TOGETHER · ",
      600,
      cy,
      Math.min(435, h * (tall ? 0.36 : 0.33)),
      t * 0.5,
      cream,
      serif,
    );
    text(c, "A common warmth.", 600, h - 79, tall ? 62 : 38, cream, serif, "italic", "center");
  } else {
    const cy = tall ? h * 0.5 : h * 0.49,
      hh = tall ? h * 0.53 : h * 0.59;
    lantern(c, 600, cy, 600, hh, t + 12, p);
    lantern(c, 220, cy + hh * 0.13, 250, hh * 0.6, t + 13, p);
    lantern(c, 985, cy - hh * 0.12, 240, hh * 0.64, t + 14, p);
    text(
      c,
      "Nothing moves alone.",
      600,
      tall ? 220 : 139,
      tall ? 85 : 67,
      cream,
      serif,
      "italic",
      "center",
    );
    const yy = h - 120;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-40, yy + i * 16);
      c.bezierCurveTo(
        300,
        yy - 80 + Math.sin(t * 0.5) * 25 + i * 16,
        850,
        yy + 60 + i * 16,
        1240,
        yy - 20 + i * 16,
      );
      c.strokeStyle = [clay, glow, cream][i];
      c.lineWidth = [14, 8, 3][i];
      c.stroke();
    }
  }
}
function terminal(c: C, h: number, s: number, t: number) {
  const [bg, ink, amber, dim] = paletteFor(c, "terminal"),
    tall = h > 900;
  // A single amber phosphor, inset screen, and dense character cells establish a workstation.
  c.save();
  c.beginPath();
  c.roundRect(35, 67, 1130, h - 118, 24);
  c.fillStyle = bg;
  c.fill();
  c.strokeStyle = dim;
  c.lineWidth = 2;
  c.stroke();
  c.clip();
  const glow = c.createRadialGradient(600, h / 2, 100, 600, h / 2, h);
  glow.addColorStop(0, dim + "35");
  glow.addColorStop(1, bg);
  c.fillStyle = glow;
  c.fillRect(36, 68, 1128, h - 120);
  rect(c, 58, 86, 1084, 32, ink);
  text(
    c,
    [
      " FORM.OS  /  BOOT SEQUENCE",
      " FORM.OS  /  STRUCTURE INSPECTOR",
      " FORM.OS  /  MEMORY REALLOCATION",
    ][s],
    67,
    109,
    20,
    bg,
    mono,
    "700",
  );
  c.shadowColor = ink;
  c.shadowBlur = 3;
  const cmd = ["> boot --assemble", "> inspect --structure", "> redistribute --keep-total"][s];
  text(c, cmd.slice(0, Math.floor(t * 38)), 67, 154, 24, ink, mono);
  if (s === 0) {
    const log = [
      "ROM CHECK ............. OK",
      "CLOCK SYNC ............ OK",
      "FRAME BUFFER .......... OK",
      "LOADING 64 CELLS .........",
      "LINKING COORDINATES ......",
      "DISPLAY READY.",
    ];
    log.forEach((v, i) => {
      if (t > i * 0.38)
        text(
          c,
          v.slice(0, Math.floor((t - i * 0.38) * 48)),
          68,
          214 + i * (h > 1600 ? 53 : 37),
          h > 1600 ? 31 : 21,
          i === 5 ? ink : amber,
          mono,
        );
    });
    const cx = tall ? 600 : 885,
      cy = tall ? h * 0.62 : 335,
      size = tall ? Math.min(600, h * 0.3) : 235,
      p = ease((t - 0.3) / 2.4);
    line(
      c,
      [
        [cx - size * 0.64, cy - size * 0.64],
        [cx + size * 0.64, cy - size * 0.64],
        [cx + size * 0.64, cy + size * 0.64],
        [cx - size * 0.64, cy + size * 0.64],
        [cx - size * 0.64, cy - size * 0.64],
      ],
      dim,
      1,
    );
    for (let i = 0; i < 64; i++) {
      const x0 = cx + Math.sin(i * 5) * size * 0.6,
        y0 = cy + Math.cos(i * 7) * size * 0.6,
        x1 = cx + ((i % 8) - 3.5) * size * 0.11,
        y1 = cy + (Math.floor(i / 8) - 3.5) * size * 0.11;
      rect(c, mix(x0, x1, p), mix(y0, y1, p), size * 0.083, size * 0.083, ink);
    }
    text(
      c,
      `${String(Math.min(64, Math.floor(p * 64))).padStart(2, "0")} / 64 CELLS`,
      cx,
      cy + size * 0.64 + 32,
      20,
      amber,
      mono,
      "400",
      "center",
    );
  } else if (s === 1) {
    const cx = tall ? 600 : 390,
      cy = tall ? h * 0.42 : 340;
    line(
      c,
      [
        [65, 180],
        [tall ? 1135 : 725, 180],
      ],
      dim,
    );
    cubes(
      c,
      cx,
      cy,
      h > 1600 ? 1300 : tall ? 850 : 580,
      Math.floor(t * 6) / 6,
      [ink],
      0.6 * ease(t / 2),
      true,
    );
    const xx = tall ? 95 : 770,
      yy = tall ? h * 0.65 : 225;
    [
      "OBJECT ......... VOL_003",
      "VERTICES ........... 024",
      "EDGES .............. 036",
      "LAYERS ............. 003",
      "PROJECTION ..... ACTIVE",
    ].forEach((v, i) =>
      text(
        c,
        v.slice(0, Math.max(0, Math.floor((t - i * 0.17) * 60))),
        xx,
        yy + i * (h > 1600 ? 53 : 39),
        h > 1600 ? 31 : 20,
        ink,
        mono,
      ),
    );
    for (let i = 0; i < 3; i++) {
      const y = yy + (h > 1600 ? 300 : 225) + i * 26;
      text(c, ["X", "Y", "Z"][i], xx, y, 16, amber, mono);
      for (let j = 0; j < 18; j++)
        rect(c, xx + 30 + j * 15, y - 12, 10, 12, j < 9 + Math.sin(t * 0.7 + i) * 6 ? ink : dim);
    }
  } else {
    const yy = tall ? h * 0.3 : 235,
      unit = tall ? 38 : 23,
      gap = unit * 1.3,
      p = ease((t - 0.3) / 2.1);
    for (let g = 0; g < 3; g++) {
      const x = 90 + g * 365;
      text(c, `BANK 0${g + 1}`, x, yy - 30, 20, amber, mono);
      line(
        c,
        [
          [x, yy - 15],
          [x + 290, yy - 15],
        ],
        dim,
      );
    }
    for (let i = 0; i < 60; i++) {
      const g = i < 20 ? 0 : i < 45 ? 1 : 2,
        n = i - [0, 20, 45][g];
      rect(
        c,
        mix(390 + (i % 10) * gap, 90 + g * 365 + (n % 5) * gap, p),
        mix(yy + Math.floor(i / 10) * gap, yy + Math.floor(n / 5) * gap, p),
        unit,
        unit,
        ink,
      );
    }
    if (t > 2.5) {
      const y = tall ? h * 0.66 : 463;
      text(c, "60 IN / 60 OUT / 0 LOST", 68, y, h > 1600 ? 48 : 31, ink, mono, "700");
      text(
        c,
        "CHECKSUM .... VERIFIED",
        68,
        y + (h > 1600 ? 68 : 43),
        h > 1600 ? 32 : 22,
        amber,
        mono,
      );
      text(
        c,
        "> all parts accounted for_",
        68,
        y + (h > 1600 ? 125 : 80),
        h > 1600 ? 32 : 22,
        ink,
        mono,
      );
    }
  }
  c.shadowBlur = 0;
  line(
    c,
    [
      [65, h - 99],
      [1135, h - 99],
    ],
    dim,
  );
  text(c, "F1 HELP    F2 VIEW    F3 TRACE", 67, h - 74, 16, amber, mono);
  text(c, "ONLINE", 1135, h - 74, 16, ink, mono, "400", "right");
  c.globalAlpha = 0.1;
  for (let y = 68; y < h - 51; y += 5) rect(c, 36, y, 1128, 1, bg);
  c.restore();
}
function optical(c: C, h: number, s: number, t: number) {
  const [paper, ink] = paletteFor(c, "optical"),
    tall = h > 900;
  if (s === 0) {
    // Two smooth wave terms distort a full-frame stripe field without brightness flicker.
    for (let i = -5; i < 42; i++) {
      c.beginPath();
      for (let j = 0; j <= 90; j++) {
        const y = (j / 90) * h,
          x =
            i * 38 +
            Math.sin((y / h) * TAU * 1.3 + t * 0.3) * 60 +
            Math.sin((y / h) * TAU * 2.1 - t * 0.24) * 35;
        j ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      for (let j = 90; j >= 0; j--) {
        const y = (j / 90) * h,
          x =
            i * 38 +
            19 +
            Math.sin((y / h) * TAU * 1.3 + t * 0.3 + 0.12) * 60 +
            Math.sin((y / h) * TAU * 2.1 - t * 0.24) * 35;
        c.lineTo(x, y);
      }
      c.closePath();
      c.fillStyle = ink;
      c.fill();
    }
    const yy = h * 0.43,
      hh = tall ? 400 : 280;
    rect(c, 100, yy - hh * 0.48, 1000, hh, paper);
    c.save();
    c.globalAlpha = ease(t / 0.65);
    text(c, "LOOK", 600, yy + 5, tall ? 194 : 150, ink, sans, "900", "center");
    c.globalAlpha = ease((t - 0.2) / 0.65);
    text(c, "AGAIN", 600, yy + (tall ? 160 : 119), tall ? 194 : 150, ink, sans, "900", "center");
    c.restore();
  } else if (s === 1) {
    const cy = h * 0.5,
      max = Math.hypot(1200, h) * 0.75;
    for (let i = 26; i >= 0; i--) {
      const r = max * Math.pow(i / 26, 1.65),
        a = Math.sin(t * 0.25 + i * 0.1) * 0.23;
      c.save();
      c.translate(600, cy);
      c.rotate(a);
      rect(c, -r, -r, r * 2, r * 2, i % 2 ? paper : ink);
      c.restore();
    }
    rect(c, 175, cy - 100, 850, 205, paper);
    for (let i = 4; i >= 0; i--) {
      c.font = `900 ${tall ? 172 : 150}px ${fontFor(c, sans, 150)}`;
      c.textAlign = "center";
      c.lineWidth = 1.4;
      c.strokeStyle = ink;
      const y = cy + 64 - i * (8 + ease(t / 2) * 7);
      if (i) c.strokeText("ECHO", 600, y);
      else text(c, "ECHO", 600, y, tall ? 172 : 150, ink, sans, "900", "center");
    }
  } else {
    // Contour slices become an architectural lens, continuous with the surrounding field.
    const cy = h * 0.5,
      rx = 470,
      ry = tall ? h * 0.35 : h * 0.44;
    for (let i = 0; i < 38; i++) {
      const yy = (i / 37) * h;
      line(
        c,
        [
          [0, yy],
          [1200, yy],
        ],
        ink,
        2.5,
      );
    }
    c.save();
    c.beginPath();
    c.ellipse(600, cy, rx, ry, 0, 0, TAU);
    c.clip();
    rect(c, 100, cy - ry, 1000, ry * 2, paper);
    for (let i = -27; i <= 27; i++) {
      const v = i / 27,
        yy = cy + v * ry,
        w = rx * Math.sqrt(Math.max(0, 1 - v * v));
      c.beginPath();
      c.ellipse(
        600 + Math.sin(t * 0.3 + v * 2) * 22,
        yy,
        w,
        Math.max(1, (1 - v * v) * ry * 0.105),
        Math.sin(t * 0.2) * 0.1,
        0,
        TAU,
      );
      c.lineWidth = 4;
      c.strokeStyle = ink;
      c.stroke();
    }
    c.restore();
    const yy = tall ? h * 0.14 : 127;
    rect(c, 195, yy - 67, 810, 86, paper);
    text(c, "CHANGE YOUR VIEW", 600, yy, 63, ink, sans, "900", "center");
    rect(c, 350, h - 94, 500, 43, paper);
    text(c, "FLAT / VOLUME / FLAT", 600, h - 64, 22, ink, mono, "400", "center");
  }
}
const painters = { swiss, memphis, instrument, organic, terminal, optical };
/** A full-cover handoff connects scenes; each aesthetic uses a different boundary. */
function transition(c: C, h: number, kind: Aesthetic, q: number) {
  const p = paletteFor(c, kind),
    amount = q < 0.5 ? ease(q * 2) : ease((1 - q) * 2);
  if (isWorld(kind)) {
    worldTransition(c, h, kind, q, p);
    return;
  }
  if (kind === "swiss") {
    const w = 1200 * amount;
    rect(c, q < 0.5 ? 0 : 1200 - w, 0, w, h, p[0]);
  } else if (kind === "memphis") {
    for (let i = 0; i < 4; i++) {
      const a = clamp(amount * 1.3 - i * 0.09);
      rect(c, i * 300, q < 0.5 ? h * (1 - a) : 0, 301, h * a, p[2 + (i % 4)]);
    }
  } else if (kind === "instrument" || kind === "organic") {
    const r = Math.hypot(1200, h) * 0.6 * amount;
    circle(c, 600, h * 0.5, r, p[kind === "organic" ? 2 : 0]);
    if (kind === "instrument") strokeCircle(c, 600, h * 0.5, r, p[2], 4);
  } else if (kind === "terminal") {
    for (let j = 0; j < Math.ceil(h / 60); j++)
      for (let i = 0; i < 20; i++) {
        const threshold = ((i * 13 + j * 7) % 20) / 25;
        if (amount >= threshold + 0.2) rect(c, i * 60, j * 60, 61, 61, p[1]);
      }
  } else {
    c.save();
    c.translate(600, h / 2);
    c.rotate((1 - amount) * 0.6);
    const r = Math.hypot(1200, h) * amount;
    rect(c, -r / 2, -r / 2, r, r, p[1]);
    c.restore();
  }
}
const worldSurfaces = new WeakMap<C, HTMLCanvasElement>();
function paintScene(
  c: C,
  width: number,
  height: number,
  kind: Aesthetic,
  index: number,
  at: number,
  settings?: AestheticSettings,
) {
  if (!isWorld(kind)) {
    paintSceneDirect(c, width, height, kind, index, at, settings);
    return;
  }
  // Texture sampling stays on one stable raster backend even when the editor
  // canvas is read back, resized, or reused for an original graphic study.
  let surface = worldSurfaces.get(c);
  if (!surface) {
    surface = document.createElement("canvas");
    worldSurfaces.set(c, surface);
  }
  if (surface.width !== width) surface.width = width;
  if (surface.height !== height) surface.height = height;
  paintSceneDirect(
    surface.getContext("2d", { willReadFrequently: true })!,
    width,
    height,
    kind,
    index,
    at,
    settings,
  );
  c.drawImage(surface, 0, 0);
}
function paintSceneDirect(
  c: C,
  width: number,
  height: number,
  kind: Aesthetic,
  index: number,
  at: number,
  settings?: AestheticSettings,
) {
  const previous = settingsByContext.get(c);
  if (settings) settingsByContext.set(c, settings);
  else settingsByContext.delete(c);
  c.save();
  try {
    c.scale(width / 1200, width / 1200);
    const h = (height / width) * 1200;
    rect(c, 0, 0, 1200, h, paletteFor(c, kind)[0]);
    if (isWorld(kind)) paintWorld(c, h, kind, index, at, paletteFor(c, kind), settings);
    else painters[kind](c, h, index, at);
    if (settings?.labels === true) furniture(c, h, kind, index);
  } finally {
    c.restore();
    if (previous) settingsByContext.set(c, previous);
    else settingsByContext.delete(c);
  }
}
export function paintAesthetic(
  c: C,
  width: number,
  height: number,
  kind: Aesthetic,
  time: number,
  settings?: AestheticSettings,
  isolatedScene?: number,
) {
  if (settings)
    settings = { ...settings, palette: shiftPalette(settings.palette, settings.colorShift) };
  const t = ((time % 18) + 18) % 18,
    base = isolatedScene ?? Math.floor(t / 6),
    local = t % 6;
  if (isolatedScene !== undefined) {
    paintScene(c, width, height, kind, base, local, settings);
    return;
  }
  const profile = AESTHETIC_TRANSITION_PROFILES[kind],
    choice = settings?.transition ?? "authored";
  const mode = choice === "authored" ? profile.kind : choice;
  // Retained art-directed covers keep their established midpoint handoff.
  if (mode === "cover") {
    const q = (local - 5.05) / 0.95,
      index = q >= 0.5 ? (base + 1) % 3 : base,
      at = q >= 0.5 ? local - 5.525 : local + 0.475;
    paintScene(c, width, height, kind, index, at, settings);
    if (q > 0) {
      const previous = settingsByContext.get(c);
      if (settings) settingsByContext.set(c, settings);
      c.save();
      try {
        c.scale(width / 1200, width / 1200);
        transition(c, (height / width) * 1200, kind, q);
      } finally {
        c.restore();
        if (previous) settingsByContext.set(c, previous);
        else settingsByContext.delete(c);
      }
    }
    return;
  }
  if (mode === "cut") {
    paintScene(c, width, height, kind, base, local, settings);
    return;
  }
  const duration = choice === "authored" ? profile.duration : 1.2,
    start = 6 - duration,
    q = (local - start) / duration;
  // The incoming clock advances throughout the overlap, then continues from the
  // same age after the six-second boundary, including the third-to-first handoff.
  if (q <= 0) {
    paintScene(c, width, height, kind, base, local + duration, settings);
    return;
  }
  let pair = transitionCanvases.get(c);
  if (!pair) {
    pair = [document.createElement("canvas"), document.createElement("canvas")];
    transitionCanvases.set(c, pair);
  }
  for (const canvas of pair) {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }
  paintScene(pair[0].getContext("2d")!, width, height, kind, base, local + duration, settings);
  paintScene(
    pair[1].getContext("2d")!,
    width,
    height,
    kind,
    (base + 1) % 3,
    local - start,
    settings,
  );
  compositeTransition(
    c,
    pair[0],
    pair[1],
    width,
    height,
    q,
    mode,
    (settings?.palette ?? palettes[kind])[2],
  );
}
// Canvas frame tasks share the timeline clock across preview and export.
const renderers = new WeakMap<EFTimegroupElement, () => void>();
export const AestheticFilm = memo(function AestheticFilm({
  id,
  aspect,
  kind,
  label,
  settings,
  scene,
}: {
  id: string;
  aspect: Aspect;
  kind: Aesthetic;
  label: string;
  settings?: AestheticSettings;
  scene?: number;
}) {
  const [width, height] = ASPECT[aspect];
  const speed = settings?.speed ?? 1;
  const initialize = useCallback(
    (root: EFTimegroupElement) => {
      renderers.get(root)?.();
      const canvas = root.querySelector("canvas");
      const c = canvas?.getContext("2d");
      if (!canvas || !c) return;
      const draw = (time: number) => {
        paintAesthetic(c, width, height, kind, time * speed, settings, scene);
        canvas.dataset.motionTime = String(time * speed);
        canvas.dataset.scene = String(
          (scene ?? aestheticSceneAt(time * speed, settings?.transition, kind)) + 1,
        );
      };
      let active = true;
      const present = async (time: number) => {
        if (isWorld(kind)) await prepareWorld(kind);
        await prepareAestheticFont(settings?.font).catch(() => {});
        if (active) draw(time);
      };
      // Async frame work participates in Editframe's presentation contract; late asset
      // loads from a previous preset cannot repaint a canvas after its cleanup.
      void present(root.currentTime).catch(() => {});
      const unregister = root.addFrameTask(({ ownCurrentTime }) => present(ownCurrentTime));
      renderers.set(root, () => {
        active = false;
        unregister();
      });
    },
    [width, height, kind, settings, scene, speed],
  );
  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration={`${(scene === undefined ? 18 : 6) / speed}s`}
      loop
      initializer={initialize}
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        background: settings?.palette[0] ?? palettes[kind][0],
      }}
    >
      <canvas
        width={width}
        height={height}
        role="img"
        aria-label={label}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </Timegroup>
  );
});
