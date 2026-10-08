import {
  line,
  PosterHandoff,
  posterGround,
  text,
  type C,
  type Poster,
} from "./shared/transition-film";
import type { StudyProps } from "./shared/geometry-studies";
import { clamp01, type TransitionEffect } from "./shared/transition-compositor";
export const duration = 8;
export const posterTime = 2.5;
export const aspect = "landscape" as const;
const palette = { ground: "#dbe3ca", ink: "#183f3b", accent: "#d88b46", support: "#b2c1aa" };
/** Contour lines of one terrain, every fourth an accented index line; `phase` shifts its ridges. */
function contours(
  c: C,
  h: number,
  back: string,
  fore: string,
  phase: number,
  title: string,
  caption: string,
) {
  const { s, cy } = posterGround(c, h, back);
  text(c, title, 60, 100, 48, fore);
  c.save();
  c.beginPath();
  c.rect(65, 150, 1070, h - 310);
  c.clip();
  for (let j = 0; j < 26; j++) {
    const yy = cy + ((j - 13) * s) / 20;
    const pts = Array.from({ length: 81 }, (_, i) => [
      50 + i * 14,
      yy + Math.sin(i * 0.075 + phase) * s * 0.15 + Math.cos(i * 0.15 + j * 0.16) * s * 0.085,
    ]);
    line(c, pts, j % 4 === 0 ? palette.accent : fore, j % 4 === 0 ? 4 : 1.4);
  }
  c.restore();
  text(c, caption, 65, h - 75, 25, fore, "Courier New");
}
const readTheLand: Poster = (c, h) =>
  contours(c, h, palette.ground, palette.ink, 0, "READ THE LAND", "01 / ELEVATION");
const underTheSurface: Poster = (c, h) =>
  contours(c, h, palette.ink, palette.ground, 0.8, "UNDER THE SURFACE", "02 / DEPTH");
const scratch = new WeakMap<
  C,
  {
    layer: HTMLCanvasElement;
    mask: HTMLCanvasElement;
    map: Float32Array;
    pixels: ImageData;
    ratio: number;
  }
>();
function buffers(c: C, w: number, h: number) {
  let b = scratch.get(c);
  if (!b || b.ratio !== h / w) {
    const layer = document.createElement("canvas"),
      mask = document.createElement("canvas");
    mask.width = 300;
    mask.height = Math.ceil((300 * h) / w);
    const pixels = mask.getContext("2d")!.createImageData(mask.width, mask.height),
      map = new Float32Array(mask.width * mask.height);
    // A fixed grayscale relief map. Thresholding its values controls the reveal,
    // rather than reseeding noise or painting randomly chosen cells every frame.
    for (let y = 0; y < mask.height; y++)
      for (let x = 0; x < mask.width; x++) {
        const nx = x / mask.width,
          ny = y / mask.height;
        map[y * mask.width + x] = clamp01(
          0.5 + 0.23 * Math.sin(nx * 9 + Math.sin(ny * 7) * 1.4) + 0.19 * Math.cos(ny * 8 - nx * 3),
        );
      }
    b = { layer, mask, map, pixels, ratio: h / w };
    scratch.set(c, b);
  }
  if (b.layer.width !== w) b.layer.width = w;
  if (b.layer.height !== h) b.layer.height = h;
  return b;
}
/** Scene B appears where the relief map falls below a rising threshold. */
export const lumaReveal: TransitionEffect = ({ c, b, w, h, q }) => {
  const { layer, mask, map, pixels } = buffers(c, w, h),
    mc = mask.getContext("2d")!,
    lc = layer.getContext("2d")!;
  for (let i = 0; i < map.length; i++) {
    pixels.data[i * 4 + 3] = Math.round(255 * clamp01((q * 1.1 - 0.05 - map[i]!) / 0.065 + 0.5));
  }
  mc.putImageData(pixels, 0, 0);
  lc.clearRect(0, 0, w, h);
  lc.drawImage(b, 0, 0, w, h);
  lc.globalCompositeOperation = "destination-in";
  lc.drawImage(mask, 0, 0, w, h);
  lc.globalCompositeOperation = "source-over";
  c.drawImage(layer, 0, 0);
};
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <PosterHandoff
      id={id}
      aspect={frame}
      label="luma transition between two original compositions"
      background={palette.ground}
      from={readTheLand}
      to={underTheSurface}
      effect={lumaReveal}
      edge={palette.support}
    />
  );
}
