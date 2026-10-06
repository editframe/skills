import { AestheticFilm, type AestheticLook } from "./shared/aesthetic-film";
import {
  circle,
  ease,
  line,
  loadImage,
  mix,
  rect,
  sans,
  sharePaint,
  type C,
} from "./shared/canvas-paint";
import { caption, text } from "./shared/world-paint";
import { displacement } from "./displacement-handoff";
import type { Aspect } from "../src/primitives";
export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
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
/** Paints the ice backdrop offscreen so the panes can sample the scene behind them. */
function sceneBehindGlass(c: C, h: number, p: string[]) {
  const [ice, , white] = p,
    source = opticalSurface(c, h),
    b = source.getContext("2d", { willReadFrequently: true })!;
  sharePaint(c, b);
  b.clearRect(0, 0, 1200, h);
  rect(b, 0, 0, 1200, h, ice);
  const g = b.createLinearGradient(0, 0, 1200, h);
  g.addColorStop(0, white);
  g.addColorStop(1, ice);
  b.fillStyle = g;
  b.fillRect(0, 0, 1200, h);
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
function flutedPanes(c: C, h: number, t: number, p: string[]) {
  const [, ink, , blue] = p,
    tall = h > 900,
    b = sceneBehindGlass(c, h, p),
    source = b.canvas,
    cy = h * 0.49;
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
  caption(c, "OPTICAL MATERIAL", h, ink);
}
function movingLens(c: C, h: number, t: number, p: string[]) {
  const [, ink, white, blue] = p,
    tall = h > 900,
    b = sceneBehindGlass(c, h, p),
    source = b.canvas,
    cy = h * 0.49;
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
  caption(c, "OPTICAL MATERIAL", h, ink);
}
function layeredPanes(c: C, h: number, t: number, p: string[]) {
  const [, ink, white, blue] = p,
    tall = h > 900,
    b = sceneBehindGlass(c, h, p),
    source = b.canvas,
    cy = h * 0.49;
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
  caption(c, "OPTICAL MATERIAL", h, white);
}
export const look: AestheticLook = {
  palette: ["#dceafb", "#173662", "#ffffff", "#7896d8"],
  scenes: [flutedPanes, movingLens, layeredPanes],
  handoff: {
    effect: displacement,
    duration: 1.4,
    label: "Refractive displacement",
    reason:
      "A traveling distortion bends the outgoing and incoming arrangements before settling clear.",
    study: "displacement-handoff",
  },
  prepare: () => loadImage("/assets/motion-catalog/aesthetics/glass.png"),
  stableRaster: true,
};
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      look={look}
      label="Glass: Stronger in layers. Three composed scenes with connected transitions."
    />
  );
}
