import { AestheticFilm, type AestheticLook, type CoverPainter } from "./shared/aesthetic-film";
import {
  TAU,
  circle,
  ease,
  line,
  loadFontFace,
  loadImage,
  rect,
  type C,
} from "./shared/canvas-paint";
import { caption, plate, text } from "./shared/world-paint";
import type { Aspect } from "../src/primitives";
export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
const gothPlate = "/assets/motion-catalog/aesthetics/goth.png";
function lancet(c: C, x: number, y: number, w: number, h: number) {
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + w * 0.52);
  c.bezierCurveTo(x, y + w * 0.25, x + w * 0.24, y + w * 0.1, x + w * 0.5, y);
  c.bezierCurveTo(x + w * 0.76, y + w * 0.1, x + w, y + w * 0.25, x + w, y + w * 0.52);
  c.lineTo(x + w, y + h);
  c.closePath();
}
function rosette(c: C, x: number, y: number, r: number, t: number, p: string[]) {
  const [, ivory, ruby, silver] = p;
  circle(c, x, y, r, silver, true, 1);
  circle(c, x, y, r * 0.91, silver, true, 1);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.065;
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.beginPath();
    c.ellipse(0, -r * 0.47, r * 0.14, r * 0.41, 0, 0, TAU);
    c.strokeStyle = i % 3 ? silver : ruby;
    c.lineWidth = 2.3;
    c.stroke();
    c.restore();
  }
  circle(c, x, y, r * 0.15, ivory, true, 1);
}
function gothicTitle(
  c: C,
  label: string,
  x: number,
  y: number,
  size: number,
  color: string,
  max = 1080,
) {
  text(c, label, x, y, size, color, '"Catalog Blackletter", Georgia, serif', "700", "center", max);
}
function roseWindowAperture(c: C, h: number, t: number, p: string[]) {
  const [black, ivory, ruby, silver] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, black);
  const x = tall ? 220 : 610,
    y = tall ? h * 0.25 : 38,
    w = tall ? 760 : 530,
    hh = tall ? h * 0.68 : h - 76;
  rect(c, 0, 0, tall ? 1200 : 390, tall ? 150 : h, ruby);
  c.save();
  lancet(c, x, y, w, hh);
  c.clip();
  plate(c, gothPlate, x, y, w, hh, t, 1.08);
  const glow = c.createRadialGradient(
    x + w / 2,
    y + hh * 0.45,
    0,
    x + w / 2,
    y + hh * 0.45,
    w * 0.65,
  );
  glow.addColorStop(0, ruby + "65");
  glow.addColorStop(1, black + "00");
  c.fillStyle = glow;
  c.fillRect(x, y, w, hh);
  rosette(c, x + w / 2, y + hh * 0.43, w * 0.36 * (0.7 + 0.3 * ease(t / 3)), t, p);
  c.restore();
  lancet(c, x, y, w, hh);
  c.strokeStyle = silver;
  c.lineWidth = 2;
  c.stroke();
  c.save();
  c.translate(tall ? 600 : 365, tall ? h * 0.2 : h * 0.43);
  c.globalAlpha = ease(t / 1.5);
  gothicTitle(c, "After", 0, 0, tall ? 235 : 210, ivory, tall ? 1000 : 670);
  gothicTitle(c, "dark", 0, tall ? 220 : 195, tall ? 268 : 235, ivory, tall ? 1000 : 670);
  c.restore();
  line(
    c,
    [
      [70, h - 66],
      [420, h - 66],
    ],
    ruby,
    3,
  );
  caption(c, "NOCTURNE", h, silver);
}
function threeLancets(c: C, h: number, t: number, p: string[]) {
  const [black, ivory, ruby, silver] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, black);
  rect(c, 0, 0, 1200, h, ivory);
  const top = tall ? h * 0.25 : 170;
  for (let i = 0; i < 3; i++) {
    const w = [290, 390, 255][i],
      x = [55, 385, 845][i],
      hh = (tall ? h * 0.51 : 340) * [0.86, 1, 0.72][i],
      y = top + (1 - ease((t - i * 0.3) / 1.8)) * 140 + (i === 1 ? 0 : 60);
    c.save();
    lancet(c, x, y, w, hh);
    c.clip();
    rect(c, x, y, w, hh, black);
    plate(c, gothPlate, x, y, w, hh, t + i, 1.2);
    rect(c, x, y, w, hh, ruby + (i === 1 ? "aa" : "35"));
    rosette(c, x + w / 2, y + hh * 0.43, w * 0.42, t + i, p);
    for (let j = 1; j < 5; j++)
      line(
        c,
        [
          [x + (w * j) / 5, y],
          [x + (w * j) / 5, y + hh],
        ],
        black,
        7,
      );
    c.restore();
  }
  gothicTitle(c, "Devotion", 600, tall ? h * 0.16 : 119, tall ? 180 : 135, black);
  gothicTitle(c, "in the details.", 600, h - 75, tall ? 115 : 86, ruby);
  caption(c, "NOCTURNE", h, silver);
}
function archTunnel(c: C, h: number, t: number, p: string[]) {
  const [black, ivory, ruby, silver] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, black);
  const cy = h * 0.51,
    r = tall ? 410 : 285;
  for (let i = 0; i < 9; i++) {
    const scale = 1 - i * 0.09,
      spread = 1 + 0.07 * Math.sin(t * 0.32);
    c.save();
    c.translate(600, cy);
    lancet(c, -r * scale * spread, -r * 1.17 * scale, r * 2 * scale * spread, r * 2.4 * scale);
    c.strokeStyle = i % 3 ? ruby : ivory;
    c.lineWidth = i === 0 ? 6 : 1.6;
    c.stroke();
    c.restore();
  }
  c.save();
  c.translate(600, cy);
  const pulse = 1 + 0.018 * Math.sin(t * 0.5);
  c.scale(pulse, pulse);
  gothicTitle(c, "Remain.", 0, 40, tall ? 233 : 203, ivory);
  c.restore();
  for (const x of [110, 1090]) {
    line(
      c,
      [
        [x, h * 0.22],
        [x, h * 0.77],
      ],
      ruby,
      2,
    );
    circle(c, x, h * 0.22, 5, ivory);
  }
  caption(c, "NOCTURNE", h, silver);
}
/** Dark curtains meet at the center along wine-red seams, then part again. */
const closingCurtains: CoverPainter = (c, h, _q, coverage, p) => {
  const w = 600 * coverage;
  rect(c, 0, 0, w, h, p[0]!);
  rect(c, 1200 - w, 0, w, h, p[0]!);
  line(
    c,
    [
      [w, 0],
      [w, h],
    ],
    p[2]!,
    2,
  );
  line(
    c,
    [
      [1200 - w, 0],
      [1200 - w, h],
    ],
    p[2]!,
    2,
  );
};
export const look: AestheticLook = {
  palette: ["#100b10", "#f2e8d7", "#822c42", "#b5b0bb"],
  scenes: [roseWindowAperture, threeLancets, archTunnel],
  handoff: {
    cover: closingCurtains,
    label: "Closing curtains",
    reason: "Dark curtains and a wine-red seam preserve the theatrical pause.",
    study: "horizontal-panel-wipe",
  },
  prepare: () =>
    Promise.all([
      loadImage(gothPlate),
      loadFontFace(
        "Catalog Blackletter",
        "/assets/motion-catalog/aesthetics/fonts/UnifrakturCook-Bold.ttf",
        "700",
      ),
    ]),
  stableRaster: true,
};
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      look={look}
      label="Goth: Beauty in the shadows. Three composed scenes with connected transitions."
    />
  );
}
