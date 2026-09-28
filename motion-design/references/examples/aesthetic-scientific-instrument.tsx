import { AestheticFilm, type AestheticLook } from "./shared/aesthetic-film";
import { TAU, circle, ease, line, serif, text, type C } from "./shared/canvas-paint";
import { rx, ry } from "./shared/solid-studies";
import type { TransitionEffect } from "./shared/transition-compositor";
import type { Aspect } from "../src/primitives";

export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
function calibrated(c: C, x: number, y: number, r: number, ink: string) {
  circle(c, x, y, r, ink, true, 1);
  circle(c, x, y, r + 10, ink, true, 0.8);
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
  circle(c, x, y, r * 0.16, ink, true, 1);
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
/** The ruled plate each figure is engraved on, with its typed title and figure caption. */
function plate(c: C, h: number, t: number, palette: string[], title: string, figure: string) {
  const [, ink, copper] = palette,
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
  const label = title.slice(0, Math.floor(t * 36));
  text(c, label, 600, 125, tall ? 58 : 44, ink, serif, "400", "center");
  text(c, figure, 600, 157, 13, copper, serif, "400", "center");
}
function circlesOfRevolution(c: C, h: number, t: number, palette: string[]) {
  const [, ink, copper] = palette,
    tall = h > 900;
  plate(c, h, t, palette, "An atlas of motion", "FIG. I — CIRCLES OF REVOLUTION");
  const cy = tall ? h * 0.51 : 375,
    r = tall ? Math.min(260, (h - 420) / 3.7) : 105;
  engravedOrbit(c, 600, cy, r, t, palette);
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
    circle(c, x, y, 45, ink, true, 0.8);
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
}
function enlargedDetail(c: C, h: number, t: number, palette: string[]) {
  const [paper, ink, copper] = palette,
    tall = h > 900;
  plate(c, h, t, palette, "A closer observation", "FIG. II — OBSERVATION & ENLARGEMENT");
  const cx = tall ? 600 : 360,
    cy = tall ? h * 0.4 : 390,
    r = tall ? Math.min(220, h * 0.145) : 112;
  engravedOrbit(c, cx, cy, r, t + 6, palette);
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
  circle(c, cx, cy, r * 0.3, copper, true, 1.5);
  circle(c, ix, iy, ir, paper);
  calibrated(c, ix, iy, ir, ink);
  c.save();
  c.beginPath();
  c.arc(ix, iy, ir - 12, 0, TAU);
  c.clip();
  engravedOrbit(c, ix - 40, iy + 35, r * 2.5, t + 6, palette);
  c.restore();
  text(c, "Detail of the same orbit · 2½×", ix, iy + ir + 47, 19, ink, serif, "italic", "center");
}
function periodicTrace(c: C, h: number, t: number, palette: string[]) {
  const [, ink, copper, blue] = palette,
    tall = h > 900;
  plate(c, h, t, palette, "On periodic relations", "FIG. III — THE ORBIT & ITS TRACE");
  const cy = tall ? h * 0.36 : 348,
    cx = tall ? 600 : 310,
    r = tall ? Math.min(220, h * 0.13) : 99;
  engravedOrbit(c, cx, cy, r, t + 12, palette);
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
function plateCaptions(c: C, h: number, scene: number, p: string[]) {
  text(c, "OBSERVATIONS OF RELATIVE MOTION", 600, 48, 15, p[1], serif, "400", "center");
  text(c, `PLATE ${["I", "II", "III"][scene]}`, 600, h - 28, 15, p[1], serif, "400", "center");
}
/** A circle centered on the instrument widens until scene B fills the frame. */
export const ringScan: TransitionEffect = ({ c, b, w, h, p }) => {
  c.beginPath();
  c.arc(w / 2, h / 2, Math.hypot(w, h) * 0.51 * p, 0, Math.PI * 2);
  c.clip();
  c.drawImage(b, 0, 0, w, h);
};
export const look: AestheticLook = {
  palette: ["#f3e8ce", "#42392c", "#a36f49", "#58767a"],
  scenes: [circlesOfRevolution, enlargedDetail, periodicTrace],
  labels: plateCaptions,
  handoff: {
    effect: ringScan,
    duration: 1.2,
    label: "Calibrated ring scan",
    reason: "A concentric reveal compares two plates through the same instrument center.",
    study: "circular-bloom-wipe",
  },
};
/** Three composed scenes; source mechanisms and research: data/aesthetics.json. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      look={look}
      label="Scientific Instrument: Make the invisible legible. Three scenes combine type, form, and layout with connecting transitions."
    />
  );
}
