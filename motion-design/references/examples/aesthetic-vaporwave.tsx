import { AestheticFilm, type AestheticLook } from "./shared/aesthetic-film";
import {
  TAU,
  circle,
  ease,
  line,
  loadImage,
  mix,
  mono,
  rect,
  sans,
  type C,
} from "./shared/canvas-paint";
import { caption, plate, text } from "./shared/world-paint";
import { bandSmear } from "./band-smear-handoff";
import type { Aspect } from "../src/primitives";
export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
const vaporwavePlate = "/assets/motion-catalog/aesthetics/vaporwave.png";
const credit = "DREAM ARCHIVE / ENDLESS SUMMER";
function orbitalLetters(
  c: C,
  label: string,
  x: number,
  y: number,
  r: number,
  t: number,
  color: string,
  font: string,
) {
  [...label].forEach((letter, i) => {
    const a = (i / label.length) * TAU + t * 0.08;
    c.save();
    c.translate(x + Math.sin(a) * r, y - Math.cos(a) * r);
    c.rotate(a);
    text(c, letter, 0, 0, r * 0.1, color, font, "400", "center", 100);
    c.restore();
  });
}
function wireSphere(c: C, x: number, y: number, r: number, t: number, color: string) {
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.ellipse(x, y, r * Math.abs(Math.cos((i * Math.PI) / 9 + t * 0.14)), r, 0, 0, TAU);
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    c.stroke();
  }
  for (let i = -3; i <= 3; i++) {
    const v = i / 4;
    c.beginPath();
    c.ellipse(x, y + v * r, r * Math.sqrt(1 - v * v), r * 0.14 * Math.sqrt(1 - v * v), 0, 0, TAU);
    c.stroke();
  }
}
/** Chrome is drawn in the same typography layer, so user font overrides still apply. */
function chromeType(
  c: C,
  label: string,
  x: number,
  y: number,
  size: number,
  p: string[],
  max = 1080,
) {
  c.save();
  text(c, label, x + 5, y + 7, size, p[0], sans, "italic 900", "center", max);
  const g = c.createLinearGradient(0, y - size, 0, y + 10);
  [
    [0, p[1]],
    [0.33, p[3]],
    [0.49, p[1]],
    [0.5, p[0]],
    [0.63, p[2]],
    [0.85, p[1]],
    [1, p[3]],
  ].forEach(([at, color]) => g.addColorStop(at as number, color as string));
  c.fillStyle = g;
  c.fillText(label, x, y, max);
  c.strokeStyle = p[1];
  c.lineWidth = 1;
  c.strokeText(label, x, y, max);
  c.restore();
}
function vaporGrid(c: C, h: number, t: number, p: string[], horizon: number) {
  c.save();
  c.globalAlpha = 0.65;
  for (let i = -10; i <= 10; i++)
    line(
      c,
      [
        [600 + i * 25, horizon],
        [600 + i * 210, h],
      ],
      p[3],
      1.2,
    );
  for (let i = 0; i < 17; i++) {
    const v = ((i / 17 + t * 0.036) % 1) ** 2;
    line(
      c,
      [
        [0, horizon + v * (h - horizon)],
        [1200, horizon + v * (h - horizon)],
      ],
      p[2],
      2,
    );
  }
  c.restore();
}
function vaporWindow(
  c: C,
  x: number,
  y: number,
  w: number,
  hh: number,
  t: number,
  p: string[],
  name: string,
) {
  rect(c, x + 12, y + 14, w, hh, p[0] + "a0");
  rect(c, x, y, w, hh, p[1]);
  rect(c, x + 5, y + 5, w - 10, 32, p[0]);
  text(c, name, x + 16, y + 28, 18, p[1], mono, "400", "left", w - 65);
  text(c, "×", x + w - 20, y + 29, 24, p[1], sans);
  plate(c, vaporwavePlate, x + 7, y + 43, w - 14, hh - 50, t, 1.15);
  wireSphere(c, x + w * 0.64, y + hh * 0.58, hh * 0.29, t, p[3]);
}
function dreamSky(c: C, h: number, p: string[]) {
  const [violet, , pink] = p;
  rect(c, 0, 0, 1200, h, violet);
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, violet);
  sky.addColorStop(0.65, pink + "70");
  sky.addColorStop(1, violet);
  c.fillStyle = sky;
  c.fillRect(0, 0, 1200, h);
}
function scanlines(c: C, h: number, color: string) {
  c.save();
  c.globalAlpha = 0.08;
  for (let y = 0; y < h; y += 5) rect(c, 0, y, 1200, 1, color);
  c.restore();
}
function stripedSun(c: C, h: number, t: number, p: string[]) {
  const [violet, cream, , cyan] = p,
    tall = h > 900;
  dreamSky(c, h, p);
  const cy = h * (tall ? 0.49 : 0.42),
    r = tall ? 330 : 245;
  c.save();
  circle(c, 800, cy, r, cream);
  c.clip();
  plate(c, vaporwavePlate, 800 - r, cy - r, r * 2, r * 2, t, 1.06);
  for (let i = 0; i < 7; i++) rect(c, 800 - r, cy + (i * r) / 8, r * 2, 3 + i * 2, violet);
  c.restore();
  vaporGrid(c, h, t, p, h * 0.67);
  const enter = ease(t / 2.2);
  c.save();
  c.translate(0, 36 * (1 - enter));
  c.globalAlpha = 0.4 + 0.6 * enter;
  chromeType(c, "PARADISE", 600, h * (tall ? 0.26 : 0.4), tall ? 181 : 184, p, 1090);
  c.restore();
  text(c, "is a place in memory", tall ? 600 : 360, h * (tall ? 0.34 : 0.52), 27, cream, mono);
  c.save();
  c.shadowColor = cyan;
  c.shadowBlur = 16;
  wireSphere(c, tall ? 600 : 330, h * 0.77, tall ? 195 : 105, t, cyan);
  c.restore();
  for (let i = 0; i < 4; i++) {
    const x = 130 + i * 275,
      y = h * 0.13 + Math.sin(i * 2 + t * 0.25) * 15;
    line(
      c,
      [
        [x - 9, y],
        [x + 9, y],
      ],
      cream,
      1,
    );
    line(
      c,
      [
        [x, y - 9],
        [x, y + 9],
      ],
      cream,
      1,
    );
  }
  scanlines(c, h, violet);
  caption(c, credit, h, cream);
}
function desktopWindows(c: C, h: number, t: number, p: string[]) {
  const [violet, cream, pink, cyan] = p,
    tall = h > 900;
  dreamSky(c, h, p);
  vaporGrid(c, h, t, p, h * 0.5);
  const top = tall ? h * 0.19 : 80;
  vaporWindow(c, 90, top, 730, tall ? 690 : 440, t, p, "paradise.exe");
  const q = ease((t - 0.5) / 2);
  c.save();
  c.translate(mix(260, 560, q), top + (tall ? 480 : 235) + Math.sin(t * 0.6) * 12);
  vaporWindow(c, 0, 0, 520, tall ? 410 : 280, t + 2, p, "memory_02.exe");
  c.restore();
  for (let i = 0; i < 3; i++) {
    const yy = top + 50 + i * 105;
    rect(c, 940, yy, 57, 42, cyan);
    rect(c, 940, yy - 8, 25, 10, pink);
    text(c, ["dreams", "summer", "forever"][i], 968, yy + 65, 18, cream, mono);
  }
  text(c, "OPEN A MEMORY", 90, h - 58, 34, cream, mono, "700", "left");
  scanlines(c, h, violet);
  caption(c, credit, h, cream);
}
function checkerboardPortal(c: C, h: number, t: number, p: string[]) {
  const [violet, cream, , cyan] = p,
    tall = h > 900;
  dreamSky(c, h, p);
  const cy = h * 0.46,
    r = tall ? 330 : 222;
  vaporGrid(c, h, t, p, h * 0.65);
  c.save();
  c.translate(600, cy);
  c.rotate(-0.09 + Math.sin(t * 0.2) * 0.03);
  const outer = r + 68;
  for (let row = 0; row < 10; row++)
    for (let col = 0; col < 10; col++)
      if ((row + col) % 2 === 0)
        rect(
          c,
          -outer + (col * outer) / 5,
          -outer + (row * outer) / 5,
          outer / 5 + 1,
          outer / 5 + 1,
          cream,
        );
  rect(c, -r, -r, r * 2, r * 2, violet);
  plate(c, vaporwavePlate, -r, -r, r * 2, r * 2, t, 1.15);
  wireSphere(c, 0, 0, r * 0.78, t, cyan);
  c.restore();
  orbitalLetters(c, "FOREVER · LOADING · FOREVER · LOADING · ", 600, cy, r * 0.88, t, cream, mono);
  chromeType(c, "ENDLESS", 600, h * 0.84, tall ? 195 : 150, p);
  text(c, "Nothing really ends.", 600, h * 0.91, 27, cream, mono);
  scanlines(c, h, violet);
  caption(c, credit, h, cream);
}
export const look: AestheticLook = {
  palette: ["#40216d", "#fff2f5", "#fa83cb", "#74edf0"],
  scenes: [stripedSun, desktopWindows, checkerboardPortal],
  handoff: {
    effect: bandSmear,
    duration: 1.15,
    label: "Horizontal band smear",
    reason: "Stretched horizontal bands turn the scene change into a brief display disturbance.",
    study: "band-smear-handoff",
  },
  prepare: () => loadImage(vaporwavePlate),
  stableRaster: true,
};
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      look={look}
      label="Vaporwave: A place in memory. Three composed scenes with connected transitions."
    />
  );
}
