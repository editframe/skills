import { fontFor, imageFilter, labelsOn, loadedImage, mono, type C } from "./canvas-paint";

/** Typography and photographic plates for the illustrated aesthetic worlds. */
export const serif = "Georgia, Times New Roman, serif";
/** Centered text capped at `max` units wide; a chosen typeface keeps its own width. */
export function text(
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
  const family = fontFor(c, font);
  c.font = `${weight} ${size}px ${family}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = "alphabetic";
  c.fillText(label, x, y, max);
}
/** Covers the rectangle with a loaded image that drifts slowly with `t`. */
export function plate(
  c: C,
  src: string,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  zoom: number,
) {
  const image = loadedImage(src);
  if (!image?.complete || !image.naturalWidth) return;
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * zoom,
    iw = image.naturalWidth * scale,
    ih = image.naturalHeight * scale;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.filter = imageFilter(c);
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
export function caption(c: C, label: string, h: number, color: string) {
  if (labelsOn(c)) text(c, label, 600, h - 35, 15, color, mono, "400");
}
