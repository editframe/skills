import { fontFamily, type AestheticFont } from "./aesthetic-fonts";
import { paletteImageFilter, type PaletteShift } from "./aesthetic-palette";
import { box, project, ry, type Face, type Vec3 } from "./solid-studies";

/** Canvas drawing kit for aesthetic films. Painters draw on a frame 1200 units wide. */
export type C = CanvasRenderingContext2D;
export const TAU = Math.PI * 2;
export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const sans = "Arial, Helvetica, sans-serif",
  mono = "Courier New, monospace",
  serif = "Georgia, serif";

/** Viewer choices that apply to every painter drawing on one canvas. */
type Paint = { font?: AestheticFont; labels?: boolean; colorShift?: PaletteShift };
// Paint belongs to the canvas being painted, including independently mounted
// render clones. No shared palette or live preview is mutated by another canvas.
const paints = new WeakMap<C, Paint>();
export function withPaint(c: C, paint: Paint | undefined, draw: () => void) {
  const previous = paints.get(c);
  if (paint) paints.set(c, paint);
  else paints.delete(c);
  try {
    draw();
  } finally {
    if (previous) paints.set(c, previous);
    else paints.delete(c);
  }
}
/** An offscreen layer uses the paint of the canvas it is composited into. */
export function sharePaint(from: C, to: C) {
  const paint = paints.get(from);
  if (paint) paints.set(to, paint);
  else paints.delete(to);
}
export const fontFor = (c: C, font: string) => fontFamily(paints.get(c)?.font, font);
export const labelsOn = (c: C) => paints.get(c)?.labels === true;
export const imageFilter = (c: C) => paletteImageFilter(paints.get(c)?.colorShift);

const images = new Map<string, { image: HTMLImageElement; ready: Promise<HTMLImageElement> }>();
/** A frame callback awaits decoding, so scrubbing, posters and render clones use the same pixels. */
export function loadImage(src: string) {
  let entry = images.get(src);
  if (!entry) {
    const image = new Image();
    image.src = src;
    entry = { image, ready: image.decode().then(() => image) };
    images.set(src, entry);
  }
  return entry.ready;
}
export const loadedImage = (src: string) => images.get(src)?.image;
const fontFaces = new Map<string, Promise<void>>();
export function loadFontFace(family: string, src: string, weight: string) {
  let pending = fontFaces.get(family);
  if (!pending) {
    pending = new FontFace(family, `url(${src})`, { weight }).load().then((font) => {
      document.fonts.add(font);
    });
    fontFaces.set(family, pending);
  }
  return pending;
}

export function rect(c: C, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
export function circle(
  c: C,
  x: number,
  y: number,
  r: number,
  color: string,
  stroke = false,
  width = 1,
) {
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
export function line(c: C, points: number[][], color: string, width = 2) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
/** A chosen typeface is fitted to the width of the aesthetic's own face. */
export function text(
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
  const chosenFont = fontFor(c, font);
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
export function orbitType(
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
export function solid(
  c: C,
  faces: Face[],
  x: number,
  y: number,
  size: number,
  eye: Vec3 = [5, 3.8, 10],
) {
  c.save();
  c.translate(x - size / 2, y - size / 2);
  c.scale(size / 1000, size / 1000);
  for (const face of project({ faces, eye, focal: 1450 })) {
    const points = face.points.split(" ").map((p) => p.split(",").map(Number));
    c.beginPath();
    points.forEach(([px, py], i) => (i ? c.lineTo(px!, py!) : c.moveTo(px!, py!)));
    c.closePath();
    c.fillStyle = face.color;
    c.fill();
    c.strokeStyle = face.color;
    c.lineWidth = 0.7;
    c.stroke();
  }
  c.restore();
}
/** Faces of three stacked slabs turning slowly; `explode` separates them. */
export function stackedSlabs(t: number, colors: string[], explode: number): Face[] {
  return Array.from({ length: 3 }, (_, i) =>
    box([0, (i - 1) * (0.95 + explode), 0], [2.1, 0.76, 2.1], colors[i % colors.length]!),
  )
    .flat()
    .map((f) => ({
      ...f,
      vertices: f.vertices.map((p) => ry(p, -0.35 + Math.sin(t * 0.35) * 0.35)),
    }));
}
