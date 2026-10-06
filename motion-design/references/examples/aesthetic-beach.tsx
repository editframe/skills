import { AestheticFilm, type AestheticLook } from "./shared/aesthetic-film";
import { TAU, circle, ease, loadFontFace, loadImage, rect, type C } from "./shared/canvas-paint";
import { caption, plate, serif, text } from "./shared/world-paint";
import { liquidFlow } from "./liquid-scene-flow";
import type { Aspect } from "../src/primitives";
export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
const beachPlate = "/assets/motion-catalog/aesthetics/beach.png";
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
function archedShoreline(c: C, h: number, t: number, p: string[]) {
  const [, teal, coral, foam] = p,
    tall = h > 900;
  rect(c, 0, 0, 1200, h, coral);
  const x = tall ? 130 : 605,
    y = tall ? h * 0.33 : 45,
    w = tall ? 940 : 535,
    hh = tall ? h * 0.6 : h - 90;
  c.save();
  c.beginPath();
  c.roundRect(x, y, w, hh, [w / 2, w / 2, 0, 0]);
  c.clip();
  plate(c, beachPlate, x, y, w, hh, t, 1.08);
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
  caption(c, "POSTCARDS FROM NOWHERE", h, teal);
}
function postcardSunburst(c: C, h: number, t: number, p: string[]) {
  const [sand, teal, coral, foam] = p,
    tall = h > 900;
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
  plate(c, beachPlate, -w / 2 + 18, -hh / 2 + 18, w - 36, hh - 100, t, 1.15);
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
  caption(c, "POSTCARDS FROM NOWHERE", h, teal);
}
function tidalSun(c: C, h: number, t: number, p: string[]) {
  const [sand, teal, coral, foam] = p,
    tall = h > 900;
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
  caption(c, "POSTCARDS FROM NOWHERE", h, foam);
}
export const look: AestheticLook = {
  palette: ["#f1d4b0", "#174f54", "#ef8768", "#fff9e9"],
  scenes: [archedShoreline, postcardSunburst, tidalSun],
  handoff: {
    effect: liquidFlow,
    duration: 1.5,
    label: "Tidal scene reveal",
    reason: "The incoming shore washes down behind a broad, uneven wave front.",
    study: "liquid-scene-flow",
  },
  prepare: () =>
    Promise.all([
      loadImage(beachPlate),
      loadFontFace(
        "Catalog Soft Serif",
        "/assets/motion-catalog/aesthetics/fonts/Fraunces-Variable.ttf",
        "100 900",
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
      label="Beach: Nothing on your calendar. Three composed scenes with connected transitions."
    />
  );
}
