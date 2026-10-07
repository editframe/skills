import { AestheticFilm, type AestheticLook } from "./shared/aesthetic-film";
import { TAU, ease, fontFor, line, mono, rect, sans, text, type C } from "./shared/canvas-paint";
import { lumaReveal } from "./luma-contour-reveal";
import type { Aspect } from "../src/primitives";

export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
function warpedStripes(c: C, h: number, t: number, palette: string[]) {
  const [paper, ink] = palette,
    tall = h > 900;
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
}
function echoTunnel(c: C, h: number, t: number, palette: string[]) {
  const [paper, ink] = palette,
    tall = h > 900;
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
    c.font = `900 ${tall ? 172 : 150}px ${fontFor(c, sans)}`;
    c.textAlign = "center";
    c.lineWidth = 1.4;
    c.strokeStyle = ink;
    const y = cy + 64 - i * (8 + ease(t / 2) * 7);
    if (i) c.strokeText("ECHO", 600, y);
    else text(c, "ECHO", 600, y, tall ? 172 : 150, ink, sans, "900", "center");
  }
}
function contourLens(c: C, h: number, t: number, palette: string[]) {
  const [paper, ink] = palette,
    tall = h > 900;
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
function experimentTag(c: C, _h: number, scene: number, p: string[]) {
  const n = String(scene + 1).padStart(2, "0");
  rect(c, 38, 24, 335, 29, p[0]);
  text(c, `PERCEPTION / EXPERIMENT ${n}`, 49, 44, 14, p[1], mono, "700");
}
export const look: AestheticLook = {
  palette: ["#ffffff", "#101010"],
  scenes: [warpedStripes, echoTunnel, contourLens],
  labels: experimentTag,
  handoff: {
    effect: lumaReveal,
    duration: 1.25,
    label: "Contour threshold",
    reason:
      "Interlocking regions exchange figure and ground while both geometric fields remain visible.",
    study: "luma-contour-reveal",
  },
};
/** Three composed scenes; source mechanisms and research: data/aesthetics.json. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      look={look}
      label="Optical Rhythm: Look, then look again. Three scenes combine type, form, and layout with connecting transitions."
    />
  );
}
