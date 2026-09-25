import { fontFamily } from "./aesthetic-fonts";
import { paletteImageFilter } from "./aesthetic-palette";
import type { Aesthetic, AestheticSettings } from "./aesthetic-settings";

export const WORLD_KEYS = ["vaporwave", "goth", "edwardian", "beach", "stone", "glass"] as const;
export type World = (typeof WORLD_KEYS)[number];
export const isWorld = (kind: Aesthetic): kind is World => WORLD_KEYS.includes(kind as World);
type C = CanvasRenderingContext2D;
const TAU = Math.PI * 2,
  clamp = (v: number) => Math.max(0, Math.min(1, v)),
  ease = (v: number) => {
    const x = clamp(v);
    return x * x * (3 - 2 * x);
  },
  mix = (a: number, b: number, t: number) => a + (b - a) * t;
const serif = "Georgia, Times New Roman, serif",
  sans = "Arial, Helvetica, sans-serif",
  mono = "Courier New, monospace";
const worldFonts: Partial<Record<World, { family: string; file: string; weight: string }>> = {
  goth: { family: "Catalog Blackletter", file: "UnifrakturCook-Bold.ttf", weight: "700" },
  edwardian: { family: "Catalog Script", file: "Italianno-Regular.ttf", weight: "400" },
  beach: { family: "Catalog Soft Serif", file: "Fraunces-Variable.ttf", weight: "100 900" },
};
const fontLoads = new Map<World, Promise<void>>();
function prepareWorldFont(kind: World) {
  const spec = worldFonts[kind];
  if (!spec) return Promise.resolve();
  if (!fontLoads.has(kind)) {
    const face = new FontFace(
      spec.family,
      `url(/assets/motion-catalog/aesthetics/fonts/${spec.file})`,
      { weight: spec.weight },
    );
    fontLoads.set(
      kind,
      face.load().then((font) => {
        document.fonts.add(font);
      }),
    );
  }
  return fontLoads.get(kind)!;
}
const assets = new Map<World, { image: HTMLImageElement; ready: Promise<HTMLImageElement> }>();
/** A frame callback awaits decoding, so scrubbing, posters and render clones use the same pixels. */
export function prepareWorld(kind: World) {
  let entry = assets.get(kind);
  if (!entry) {
    const image = new Image();
    image.src = `/assets/motion-catalog/aesthetics/${kind}.png`;
    entry = { image, ready: image.decode().then(() => image) };
    assets.set(kind, entry);
  }
  return Promise.all([entry.ready, prepareWorldFont(kind)]).then(([image]) => image);
}
const current = new WeakMap<C, AestheticSettings | undefined>();
function text(
  c: C,
  label: string,
  x: number,
  y: number,
  size: number,
  color: string,
  font = serif,
  weight = "400",
  align: CanvasTextAlign = "center",
  max = 1080,
) {
  const choice = current.get(c)?.font;
  const family = fontFamily(choice, font);
  c.font = `${weight} ${size}px ${family}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = "alphabetic";
  c.fillText(label, x, y, max);
}

function rect(c: C, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function line(c: C, pts: number[][], color: string, width = 1) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function circle(c: C, x: number, y: number, r: number, color: string, stroke = false, width = 1) {
  c.beginPath();
  c.arc(x, y, Math.max(0, r), 0, TAU);
  if (stroke) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
  } else {
    c.fillStyle = color;
    c.fill();
  }
}
function plate(c: C, kind: World, x: number, y: number, w: number, h: number, t = 0, zoom = 1.035) {
  const image = assets.get(kind)?.image;
  if (!image?.complete || !image.naturalWidth) return;
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * zoom,
    iw = image.naturalWidth * scale,
    ih = image.naturalHeight * scale;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.filter = paletteImageFilter(current.get(c)?.colorShift);
  c.imageSmoothingQuality = "high";
  c.drawImage(
    image,
    x + (w - iw) / 2 + Math.sin(t * 0.12) * (iw - w) * 0.15,
    y + (h - ih) / 2 + Math.cos(t * 0.1) * (ih - h) * 0.12,
    iw,
    ih,
  );
  c.restore();
}
function caption(c: C, label: string, h: number, color: string) {
  if (current.get(c)?.labels === true) text(c, label, 600, h - 35, 15, color, mono, "400");
}
function orbitalLetters(
  c: C,
  label: string,
  x: number,
  y: number,
  r: number,
  t: number,
  color: string,
  font = serif,
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
  plate(c, "vaporwave", x + 7, y + 43, w - 14, hh - 50, t, 1.15);
  wireSphere(c, x + w * 0.64, y + hh * 0.58, hh * 0.29, t, p[3]);
}
function vaporwave(c: C, h: number, s: number, t: number, p: string[]) {
  const [violet, cream, pink, cyan] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, violet);
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, violet);
  sky.addColorStop(0.65, pink + "70");
  sky.addColorStop(1, violet);
  c.fillStyle = sky;
  c.fillRect(0, 0, 1200, h);
  if (s === 0) {
    const cy = h * (tall ? 0.49 : 0.42),
      r = tall ? 330 : 245;
    c.save();
    circle(c, 800, cy, r, cream);
    c.clip();
    plate(c, "vaporwave", 800 - r, cy - r, r * 2, r * 2, t, 1.06);
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
  } else if (s === 1) {
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
  } else {
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
    plate(c, "vaporwave", -r, -r, r * 2, r * 2, t, 1.15);
    wireSphere(c, 0, 0, r * 0.78, t, cyan);
    c.restore();
    orbitalLetters(
      c,
      "FOREVER · LOADING · FOREVER · LOADING · ",
      600,
      cy,
      r * 0.88,
      t,
      cream,
      mono,
    );
    chromeType(c, "ENDLESS", 600, h * 0.84, tall ? 195 : 150, p);
    text(c, "Nothing really ends.", 600, h * 0.91, 27, cream, mono);
  }
  c.save();
  c.globalAlpha = 0.08;
  for (let y = 0; y < h; y += 5) rect(c, 0, y, 1200, 1, violet);
  c.restore();
  caption(c, "DREAM ARCHIVE / ENDLESS SUMMER", h, cream);
}
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
function goth(c: C, h: number, s: number, t: number, p: string[]) {
  const [black, ivory, ruby, silver] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, black);
  if (s === 0) {
    const x = tall ? 220 : 610,
      y = tall ? h * 0.25 : 38,
      w = tall ? 760 : 530,
      hh = tall ? h * 0.68 : h - 76;
    rect(c, 0, 0, tall ? 1200 : 390, tall ? 150 : h, ruby);
    c.save();
    lancet(c, x, y, w, hh);
    c.clip();
    plate(c, "goth", x, y, w, hh, t, 1.08);
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
  } else if (s === 1) {
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
      plate(c, "goth", x, y, w, hh, t + i, 1.2);
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
  } else {
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
  }
  caption(c, "NOCTURNE", h, silver);
}
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
function stationery(c: C, h: number) {
  const image = assets.get("edwardian")?.image;
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
  c.filter = paletteImageFilter(current.get(c)?.colorShift);
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
function edwardian(c: C, h: number, s: number, t: number, p: string[]) {
  const [paper, green, gold, rose] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, paper);
  stationery(c, h);
  if (s === 0) {
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
  } else if (s === 1) {
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
  } else {
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
  }
  caption(c, "THE GARDEN PAPERS", h, green);
}
function beachType(
  c: C,
  label: string,
  x: number,
  y: number,
  size: number,
  color: string,
  max = 1080,
) {
  text(c, label, x, y, size, color, '"Catalog Soft Serif", Georgia, serif', "900", "center", max);
}
function scallop(c: C, x: number, y: number, r: number, color: string, t: number) {
  c.beginPath();
  for (let i = 0; i <= 240; i++) {
    const a = (i / 240) * TAU,
      rr = r * (1 + 0.055 * Math.cos(a * 18));
    const xx = x + Math.cos(a + t * 0.03) * rr,
      yy = y + Math.sin(a + t * 0.03) * rr;
    i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}
function beach(c: C, h: number, s: number, t: number, p: string[]) {
  const [sand, teal, coral, foam] = p,
    tall = h > 900;
  if (s === 0) {
    rect(c, 0, 0, 1200, h, coral);
    const x = tall ? 130 : 605,
      y = tall ? h * 0.33 : 45,
      w = tall ? 940 : 535,
      hh = tall ? h * 0.6 : h - 90;
    c.save();
    c.beginPath();
    c.roundRect(x, y, w, hh, [w / 2, w / 2, 0, 0]);
    c.clip();
    plate(c, "beach", x, y, w, hh, t, 1.08);
    c.restore();
    for (let i = 0; i < 9; i++) rect(c, 0, h * 0.73 + i * 18, tall ? 150 : 470, 8, foam);
    c.save();
    c.translate(tall ? 600 : 370, tall ? h * 0.15 : h * 0.29);
    c.rotate(-0.065);
    const shift = 40 * (1 - ease(t / 2));
    beachType(c, "Take it", 0, shift, tall ? 156 : 110, teal, tall ? 1050 : 700);
    beachType(c, "SLOW", 0, (tall ? 245 : 175) + shift, tall ? 260 : 195, foam, tall ? 1080 : 740);
    c.restore();
    scallop(c, tall ? 1055 : 1050, tall ? h * 0.42 : 140, tall ? 107 : 74, foam, t);
    circle(c, tall ? 1055 : 1050, tall ? h * 0.42 : 140, tall ? 64 : 43, coral);
  } else if (s === 1) {
    rect(c, 0, 0, 1200, h, foam);
    for (let i = 0; i < 16; i++) {
      c.save();
      c.translate(920, h * 0.42);
      c.rotate((i * TAU) / 16 + t * 0.025);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(-60, -h);
      c.lineTo(60, -h);
      c.closePath();
      c.fillStyle = coral + "70";
      c.fill();
      c.restore();
    }
    const w = tall ? 790 : 650,
      hh = tall ? h * 0.47 : 465,
      cx = tall ? 540 : 435,
      cy = h * (tall ? 0.4 : 0.45);
    c.save();
    c.translate(cx, cy + 60 * (1 - ease(t / 2)));
    c.rotate(-0.075 + Math.sin(t * 0.45) * 0.015);
    rect(c, -w / 2 + 15, -hh / 2 + 15, w, hh, teal + "30");
    rect(c, -w / 2, -hh / 2, w, hh, foam);
    plate(c, "beach", -w / 2 + 18, -hh / 2 + 18, w - 36, hh - 100, t, 1.15);
    beachType(c, "the slow days", 0, hh / 2 - 30, 43, teal, w - 50);
    c.restore();
    const tx = tall ? 550 : 910,
      ty = tall ? h * 0.73 : h * 0.37;
    c.save();
    c.translate(tx, ty);
    c.rotate(0.1);
    rect(c, -235, -65, 470, 130, teal);
    beachType(c, "SUN CLUB", 0, 16, 52, foam, 430);
    rect(c, -235, 84, 470, 106, sand);
    text(c, "nowhere to be", 0, 149, 32, teal, serif, "italic");
    c.restore();
    beachType(c, "Collect moments.", 600, h - 64, tall ? 91 : 66, teal);
  } else {
    rect(c, 0, 0, 1200, h, teal);
    const cy = h * 0.38,
      r = tall ? 310 : 210;
    scallop(c, 600, cy, r, coral, t);
    beachType(c, "Stay", 600, cy + 30, tall ? 233 : 187, foam);
    beachType(c, "awhile.", 600, cy + (tall ? 233 : 170), tall ? 223 : 181, foam);
    for (let j = 0; j < 4; j++) {
      c.beginPath();
      c.moveTo(0, h);
      for (let x = 0; x <= 1200; x += 12)
        c.lineTo(x, h * 0.82 + j * 38 + Math.sin(x * 0.005 + t * 0.48 + j * 0.4) * 32);
      c.lineTo(1200, h);
      c.closePath();
      c.fillStyle = [sand, coral, foam, teal][j];
      c.fill();
    }
  }
  caption(c, "POSTCARDS FROM NOWHERE", h, s === 2 ? foam : teal);
}
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
  plate(c, "stone", 0, 0, w, h, t, 1.1);
  rect(c, 0, 0, w, h, p[0] + "15");
  c.restore();
}
function stone(c: C, h: number, s: number, t: number, p: string[]) {
  const [limestone, ink, light, edge] = p,
    tall = h > 900;
  if (s === 0) {
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
  } else if (s === 1) {
    plate(c, "stone", 0, 0, 1200, h, t, 1.3);
    const band = tall ? 270 : 250;
    rect(c, 1200 - band, 0, band, h, ink);
    const lx = 480 + 110 * Math.sin(t * 0.3),
      ly = h * 0.43,
      r = tall ? 245 : 190;
    c.save();
    circle(c, lx + 12, ly + 14, r, ink + "40");
    circle(c, lx, ly, r, light);
    c.clip();
    plate(c, "stone", lx - r, ly - r, r * 2, r * 2, t, 3.2);
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
  } else {
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
  }
  caption(c, "MATERIAL / TRAVERTINE", h, s === 0 ? light : edge);
}
const opticalSurfaces = new WeakMap<C, HTMLCanvasElement>();
function opticalSurface(c: C, h: number) {
  let b = opticalSurfaces.get(c);
  if (!b) {
    b = document.createElement("canvas");
    opticalSurfaces.set(c, b);
  }
  if (b.width !== 1200) b.width = 1200;
  if (b.height !== Math.ceil(h)) b.height = Math.ceil(h);
  return b;
}
function refract(
  c: C,
  source: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  hh: number,
  t: number,
  p: string[],
  rounded = 30,
) {
  c.save();
  c.beginPath();
  c.roundRect(x, y, w, hh, rounded);
  c.clip();
  // Sample the scene behind the pane. The curved horizontal mapping magnifies
  // its center and compresses its edges instead of substituting an unrelated image.
  for (let dx = 0; dx < w; dx += 1) {
    const u = dx / w,
      offset = Math.sin(u * Math.PI * 2 + t * 0.18) * 26,
      sx = Math.max(0, Math.min(1198, x + dx + offset));
    c.drawImage(source, sx, 0, 1.5, source.height, x + dx, 0, 1.15, source.height);
  }
  const sheen = c.createLinearGradient(x, 0, x + w, 0);
  sheen.addColorStop(0, p[2] + "c0");
  sheen.addColorStop(0.12, p[3] + "25");
  sheen.addColorStop(0.48, p[2] + "05");
  sheen.addColorStop(0.9, p[3] + "35");
  sheen.addColorStop(1, p[2] + "d0");
  c.fillStyle = sheen;
  c.fillRect(x, y, w, hh);
  c.restore();
  c.beginPath();
  c.roundRect(x, y, w, hh, rounded);
  c.strokeStyle = p[2];
  c.lineWidth = 2;
  c.stroke();
  line(
    c,
    [
      [x + 6, y + rounded],
      [x + 6, y + hh - rounded],
    ],
    p[3] + "90",
    2,
  );
}
function glass(c: C, h: number, s: number, t: number, p: string[]) {
  const [ice, ink, white, blue] = p,
    tall = h > 900,
    source = opticalSurface(c, h),
    b = source.getContext("2d", { willReadFrequently: true })!;
  current.set(b, current.get(c));
  b.clearRect(0, 0, 1200, h);
  rect(b, 0, 0, 1200, h, ice);
  const g = b.createLinearGradient(0, 0, 1200, h);
  g.addColorStop(0, white);
  g.addColorStop(1, ice);
  b.fillStyle = g;
  b.fillRect(0, 0, 1200, h);
  const cy = h * 0.49;
  if (s === 0) {
    text(b, "CLEAR", 600, cy, tall ? 273 : 247, ink, sans, "900");
    text(b, "by design.", 600, cy + (tall ? 130 : 100), tall ? 120 : 84, ink, sans, "400");
    circle(b, 980, h * 0.22, 95, blue);
    line(
      b,
      [
        [70, h * 0.78],
        [1130, h * 0.78],
      ],
      blue,
      2,
    );
    c.drawImage(source, 0, 0);
    for (let i = 0; i < 4; i++) {
      const x = 130 + i * 245 + Math.sin(t * 0.38 + i * 0.5) * 48,
        y = h * 0.14 + (i % 2) * 35;
      refract(c, source, x, y, 180, h * 0.7, t + i, p, 85);
    }
  } else if (s === 1) {
    for (let i = 0; i < 15; i++) rect(b, i * 92 - 20, 0, 35, h, blue + "38");
    text(b, "See", 600, cy - 20, tall ? 310 : 255, ink, sans, "900");
    text(b, "through.", 600, cy + (tall ? 210 : 160), tall ? 210 : 167, ink, sans, "900");
    c.drawImage(source, 0, 0);
    const r = tall ? 345 : 244,
      cx = 600 + Math.sin(t * 0.36) * 205,
      yy = cy - 15;
    c.save();
    circle(c, cx, yy, r, white);
    c.clip();
    c.translate(cx, yy);
    c.scale(1.33, 1.33);
    c.drawImage(source, -cx, -yy);
    c.restore();
    const gl = c.createRadialGradient(cx - r * 0.3, yy - r * 0.4, r * 0.1, cx, yy, r);
    gl.addColorStop(0, white + "00");
    gl.addColorStop(0.82, white + "00");
    gl.addColorStop(0.94, blue + "70");
    gl.addColorStop(1, white + "d0");
    circle(c, cx, yy, r, white + "00");
    c.fillStyle = gl;
    c.fill();
    circle(c, cx, yy, r, white, true, 4);
    circle(c, cx - 4, yy - 4, r - 10, blue + "60", true, 2);
    const a = t * 0.5;
    circle(c, cx + Math.cos(a) * r, yy + Math.sin(a) * r, 8, white);
  } else {
    rect(b, 0, 0, 1200, h, ink);
    text(b, "IN", 600, cy - (tall ? 160 : 70), tall ? 285 : 200, white, sans, "900");
    text(b, "LAYERS", 600, cy + (tall ? 80 : 110), tall ? 228 : 201, white, sans, "900");
    for (let i = 0; i < 6; i++)
      line(
        b,
        [
          [0, h * 0.83 + i * 11],
          [1200, h * 0.83 + i * 11],
        ],
        blue,
        2,
      );
    c.drawImage(source, 0, 0);
    for (let i = 0; i < 3; i++) {
      const q = ease((t - i * 0.45) / 3.0),
        x = mix([-350, 1200, 420][i], [115, 425, 735][i], q),
        y = mix([h * 0.3, h * 0.12, h][i], h * 0.17, q);
      refract(c, source, x, y, 350, h * 0.65, t + i, p, 26);
    }
  }
  caption(c, "OPTICAL MATERIAL", h, s === 2 ? white : ink);
}
const painters = { vaporwave, goth, edwardian, beach, stone, glass };
export function paintWorld(
  c: C,
  h: number,
  kind: World,
  s: number,
  t: number,
  p: string[],
  settings?: AestheticSettings,
) {
  const previous = current.get(c);
  current.set(c, settings);
  try {
    painters[kind](c, h, s, t, p);
  } finally {
    current.set(c, previous);
  }
}
/** Full-cover boundaries inherit each world's physical or graphic vocabulary. */
export function worldTransition(c: C, h: number, kind: World, q: number, p: string[]) {
  const a = q < 0.5 ? ease(q * 2) : ease((1 - q) * 2);
  if (kind === "vaporwave") {
    for (let i = 0; i < 14; i++) {
      const w = 1200 * clamp(a * 1.2 - (i % 3) * 0.06);
      rect(c, q < 0.5 ? 0 : 1200 - w, (i * h) / 14, w, h / 14 + 1, p[i % 2 ? 2 : 3]);
    }
  } else if (kind === "goth") {
    const w = 600 * a;
    rect(c, 0, 0, w, h, p[0]);
    rect(c, 1200 - w, 0, w, h, p[0]);
    line(
      c,
      [
        [w, 0],
        [w, h],
      ],
      p[2],
      2,
    );
    line(
      c,
      [
        [1200 - w, 0],
        [1200 - w, h],
      ],
      p[2],
      2,
    );
  } else if (kind === "edwardian") {
    const w = 1200 * a;
    rect(c, q < 0.5 ? 0 : 1200 - w, 0, w, h, p[0]);
  } else if (kind === "beach") {
    const yy = (h + 180) * a - 90;
    c.beginPath();
    c.moveTo(0, -10);
    c.lineTo(1200, -10);
    for (let x = 1200; x >= 0; x -= 15) c.lineTo(x, yy + Math.sin(x * 0.009) * 50);
    c.closePath();
    c.fillStyle = p[3];
    c.fill();
  } else if (kind === "stone") {
    for (let i = 0; i < 4; i++) {
      const hh = h * clamp(a * 1.25 - i * 0.075);
      rect(c, i * 300, q < 0.5 ? h - hh : 0, 301, hh, p[0]);
    }
  } else {
    const r = Math.hypot(1200, h) * a;
    circle(c, 600, h / 2, r, p[2]);
  }
}
