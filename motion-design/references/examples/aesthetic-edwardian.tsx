import { AestheticFilm, type AestheticLook } from "./shared/aesthetic-film";
import {
  TAU,
  circle,
  ease,
  imageFilter,
  line,
  loadFontFace,
  loadImage,
  loadedImage,
  mix,
  rect,
  type C,
} from "./shared/canvas-paint";
import { caption, serif, text } from "./shared/world-paint";
import { paperTear } from "./paper-tear-reveal";
import type { Aspect } from "../src/primitives";
export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
const edwardianPlate = "/assets/motion-catalog/aesthetics/edwardian.png";
function flourish(c: C, x: number, y: number, w: number, color: string, t: number) {
  c.save();
  c.beginPath();
  c.rect(x - w / 2, y - 45, w * ease(t), 90);
  c.clip();
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + side * w * 0.1, y - 30, x + side * w * 0.22, y + 30, x + side * w * 0.4, y);
    c.bezierCurveTo(
      x + side * w * 0.5,
      y - 20,
      x + side * w * 0.43,
      y - 36,
      x + side * w * 0.34,
      y - 17,
    );
    c.strokeStyle = color;
    c.lineWidth = 1.3;
    c.stroke();
  }
  c.restore();
}
/** Nine-slices the paper plate so its border keeps its proportions at every frame height. */
function stationery(c: C, h: number) {
  const image = loadedImage(edwardianPlate);
  if (!image?.naturalWidth) return;
  const sw = image.naturalWidth,
    sh = image.naturalHeight,
    bx = sw * 0.24,
    by = sh * 0.29,
    dx = 288,
    dy = (dx * by) / bx;
  const sx = [0, bx, sw - bx, sw],
    sy = [0, by, sh - by, sh],
    xx = [0, dx, 1200 - dx, 1200],
    yy = [0, dy, h - dy, h];
  c.save();
  c.filter = imageFilter(c);
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 3; x++)
      c.drawImage(
        image,
        sx[x],
        sy[y],
        sx[x + 1] - sx[x],
        sy[y + 1] - sy[y],
        xx[x],
        yy[y],
        xx[x + 1] - xx[x],
        yy[y + 1] - yy[y],
      );
  c.restore();
}
function botanical(c: C, x: number, y: number, scale: number, t: number, p: string[]) {
  c.save();
  c.translate(x, y);
  c.scale(scale, Math.abs(scale));
  const q = ease(t / 2.8);
  c.beginPath();
  c.rect(-160, -370 * q, 320, 380 * q);
  c.clip();
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(-55, -140, 62, -190, 0, -340);
  c.strokeStyle = p[1];
  c.lineWidth = 2;
  c.stroke();
  for (let i = 0; i < 8; i++) {
    const yy = -35 - i * 35,
      side = i % 2 ? 1 : -1,
      xx = Math.sin(i * 0.9) * 20;
    c.beginPath();
    c.moveTo(xx, yy);
    c.bezierCurveTo(xx + side * 95, yy - 8, xx + side * 100, yy - 64, xx + side * 25, yy - 38);
    c.quadraticCurveTo(xx + side * 8, yy - 16, xx, yy);
    c.fillStyle = p[1] + "20";
    c.fill();
    c.strokeStyle = p[1];
    c.lineWidth = 1;
    c.stroke();
    line(
      c,
      [
        [xx, yy],
        [xx + side * 65, yy - 35],
      ],
      p[2],
      1,
    );
  }
  c.restore();
}
function scriptType(
  c: C,
  label: string,
  x: number,
  y: number,
  size: number,
  color: string,
  max = 1080,
) {
  text(c, label, x, y, size, color, '"Catalog Script", Georgia, serif', "400", "center", max);
}
function waxSeal(c: C, x: number, y: number, r: number, p: string[], t: number) {
  c.save();
  c.translate(x, y);
  const q = ease(t / 1.5);
  c.scale(0.8 + 0.2 * q, 0.8 + 0.2 * q);
  c.shadowColor = p[1] + "55";
  c.shadowBlur = 13;
  c.shadowOffsetY = 7;
  c.beginPath();
  for (let i = 0; i <= 100; i++) {
    const a = (i / 100) * TAU,
      rr = r * (1 + 0.045 * Math.sin(a * 13));
    i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(rr, 0);
  }
  c.fillStyle = p[3];
  c.fill();
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;
  circle(c, 0, 0, r * 0.79, p[2], true, 2);
  scriptType(c, "&", 0, r * 0.3, r * 1.3, p[0]);
  c.restore();
}
function botanicalInvitation(c: C, h: number, t: number, p: string[]) {
  const [paper, green, gold] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, paper);
  stationery(c, h);
  const cy = h * 0.5;
  botanical(c, 140, h * 0.82, tall ? 1.3 : 1, t, p);
  botanical(c, 1060, h * 0.82, tall ? -1.3 : -1, t - 0.2, p);
  text(c, "THE GARDEN SOCIETY", 600, h * 0.23, 24, green, serif);
  flourish(c, 600, h * 0.29, 440, gold, t / 2);
  c.save();
  c.beginPath();
  c.rect(220, h * 0.3, 760, h * 0.42 * ease(t / 2.8));
  c.clip();
  scriptType(c, "A garden of", 600, cy, tall ? 180 : 142, green, 800);
  scriptType(c, "possibilities", 600, cy + (tall ? 164 : 112), tall ? 178 : 148, green, 840);
  c.restore();
  flourish(c, 600, h * 0.76, 390, gold, (t - 0.8) / 2);
  text(c, "1905", 600, h * 0.86, 22, gold, serif);
  caption(c, "THE GARDEN PAPERS", h, green);
}
function folioSpread(c: C, h: number, t: number, p: string[]) {
  const [paper, green, gold, rose] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, paper);
  stationery(c, h);
  const w = 940,
    hh = tall ? h * 0.6 : 470,
    x = 130,
    y = (h - hh) / 2;
  c.save();
  c.shadowColor = green + "35";
  c.shadowBlur = 35;
  c.shadowOffsetY = 18;
  rect(c, x, y, w, hh, paper);
  c.restore();
  // A spread opens from its spine; the drawing and type are registered to the leaves.
  const open = 0.3 + 0.7 * ease(t / 2.5);
  c.save();
  c.translate(600, y);
  c.scale(open, 1);
  rect(c, -470, 0, 940, hh, paper);
  line(
    c,
    [
      [-450, 20],
      [450, 20],
      [450, hh - 20],
      [-450, hh - 20],
      [-450, 20],
    ],
    gold,
    1,
  );
  const shade = c.createLinearGradient(-32, 0, 32, 0);
  shade.addColorStop(0, green + "00");
  shade.addColorStop(0.5, green + "25");
  shade.addColorStop(1, green + "00");
  c.fillStyle = shade;
  c.fillRect(-32, 0, 64, hh);
  botanical(c, -220, hh * 0.84, (hh * 0.6) / 340, t, p);
  scriptType(c, "Florilegium", -240, hh * 0.2, tall ? 85 : 63, green, 400);
  for (let i = 0; i < 3; i++) {
    const yy = hh * (0.24 + i * 0.25);
    text(c, ["I", "II", "III"][i], 65, yy, 20, gold, serif, "400", "left");
    scriptType(c, ["Gather", "Arrange", "Delight"][i], 245, yy + 25, tall ? 86 : 66, green, 350);
    flourish(c, 245, yy + 55, 255, rose, (t - i * 0.3) / 2);
  }
  c.restore();
  caption(c, "THE GARDEN PAPERS", h, green);
}
function sealedEnvelope(c: C, h: number, t: number, p: string[]) {
  const [paper, green, gold, rose] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, paper);
  stationery(c, h);
  const w = 850,
    hh = tall ? 570 : 350,
    x = (1200 - w) / 2,
    y = h * 0.35;
  rect(c, x + 14, y + 18, w, hh, green + "20");
  rect(c, x, y, w, hh, paper);
  line(
    c,
    [
      [x, y],
      [x + w / 2, y + hh * 0.64],
      [x + w, y],
    ],
    gold,
    2,
  );
  line(
    c,
    [
      [x, y + hh],
      [x + w / 2, y + hh * 0.4],
      [x + w, y + hh],
    ],
    gold,
    1,
  );
  const fold = ease(t / 2.4);
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + w, y);
  c.lineTo(600, y + mix(-hh * 0.55, hh * 0.58, fold));
  c.closePath();
  c.fillStyle = paper;
  c.fill();
  c.strokeStyle = gold;
  c.lineWidth = 2;
  c.stroke();
  if (t > 1.5) {
    c.save();
    c.globalAlpha = ease((t - 1.5) / 1);
    waxSeal(c, 600, y + hh * 0.57, tall ? 105 : 65, p, t - 1.5);
    c.restore();
  }
  scriptType(c, "Yours, in good company.", 600, h * 0.22, tall ? 120 : 100, green, 1060);
  flourish(c, 600, y + hh + 65, 450, rose, (t - 2) / 2);
  caption(c, "THE GARDEN PAPERS", h, green);
}
export const look: AestheticLook = {
  palette: ["#f5ecd9", "#3e503a", "#ae8d52", "#bd8390"],
  scenes: [botanicalInvitation, folioSpread, sealedEnvelope],
  handoff: {
    effect: paperTear,
    duration: 1.3,
    label: "Paper edge reveal",
    reason:
      "A lightly torn paper edge and measured stepped motion carry the printed keepsake into its next arrangement.",
    study: "paper-tear-reveal",
  },
  prepare: () =>
    Promise.all([
      loadImage(edwardianPlate),
      loadFontFace(
        "Catalog Script",
        "/assets/motion-catalog/aesthetics/fonts/Italianno-Regular.ttf",
        "400",
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
      label="Edwardian: Most cordially invited. Three composed scenes with connected transitions."
    />
  );
}
