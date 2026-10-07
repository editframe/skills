import { AestheticFilm, type AestheticLook } from "./shared/aesthetic-film";
import { TAU, ease, line, mix, orbitType, sans, serif, text, type C } from "./shared/canvas-paint";
import { liquidFlow } from "./liquid-scene-flow";
import type { Aspect } from "../src/primitives";

export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
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
/** Every scene sits in the same warm light, brightest just right of center. */
function warmWash(c: C, h: number, palette: string[]) {
  const [bg, , clay] = palette;
  const wash = c.createRadialGradient(770, h * 0.46, 30, 700, h * 0.45, Math.max(h, 1100) * 0.7);
  wash.addColorStop(0, clay);
  wash.addColorStop(1, bg);
  c.fillStyle = wash;
  c.fillRect(0, 0, 1200, h);
}
function softLantern(c: C, h: number, t: number, palette: string[]) {
  const [, cream] = palette,
    tall = h > 900;
  warmWash(c, h, palette);
  const cy = tall ? h * 0.49 : h * 0.45,
    hh = tall ? h * 0.61 : h * 0.72;
  lantern(c, tall ? 650 : 830, cy, tall ? 760 : 570, hh, t, palette);
  c.save();
  c.globalAlpha = ease(t / 1.9);
  text(c, "Soft", 60, tall ? h * 0.27 : 260, tall ? 215 : 190, cream, serif, "italic");
  c.globalAlpha = ease((t - 0.3) / 1.9);
  text(c, "by nature.", 60, tall ? h * 0.84 : 565, tall ? 175 : 145, cream, serif, "italic");
  c.restore();
  text(c, "Light. Form. A little room to breathe.", 64, h - 61, 23, cream, serif);
}
function mergingBodies(c: C, h: number, t: number, palette: string[]) {
  const [, cream, , glow] = palette,
    tall = h > 900;
  warmWash(c, h, palette);
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
}
function lanternTrio(c: C, h: number, t: number, palette: string[]) {
  const [, cream, clay, glow] = palette,
    tall = h > 900;
  warmWash(c, h, palette);
  const cy = tall ? h * 0.5 : h * 0.49,
    hh = tall ? h * 0.53 : h * 0.59;
  lantern(c, 600, cy, 600, hh, t + 12, palette);
  lantern(c, 220, cy + hh * 0.13, 250, hh * 0.6, t + 13, palette);
  lantern(c, 985, cy - hh * 0.12, 240, hh * 0.64, t + 14, palette);
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
function seriesMarks(c: C, h: number, scene: number, p: string[]) {
  const n = String(scene + 1).padStart(2, "0");
  text(c, "FORM & FEELING", 58, 48, 16, p[1], sans);
  text(c, `${n} / CONTINUOUS STUDIES`, 1142, h - 35, 13, p[1], sans, "400", "right");
}
export const look: AestheticLook = {
  palette: ["#281414", "#fff3d1", "#9f4b30", "#edc284"],
  scenes: [softLantern, mergingBodies, lanternTrio],
  labels: seriesMarks,
  handoff: {
    effect: liquidFlow,
    duration: 1.5,
    label: "Continuous liquid flow",
    reason:
      "An uneven flowing boundary carries the soft, breathing forms directly into the next scene.",
    study: "liquid-scene-flow",
  },
};
/** Three composed scenes; source mechanisms and research: data/aesthetics.json. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      look={look}
      label="Liquid Organic: Nothing moves alone. Three scenes combine type, form, and layout with connecting transitions."
    />
  );
}
