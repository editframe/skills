/** Pure, seekable two-image transitions. All progress comes from the composition clock. */
type C = CanvasRenderingContext2D;
/** One in-between frame. The outgoing image `a` is already painted underneath. */
type TransitionFrame = {
  c: C;
  a: HTMLCanvasElement;
  b: HTMLCanvasElement;
  w: number;
  h: number;
  /** Linear progress, strictly between 0 and 1. */
  q: number;
  /** Smoothstep-eased progress. */
  p: number;
  edge: string;
};
export type TransitionEffect = (frame: TransitionFrame) => void;
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {
  const t = clamp01(n);
  return t * t * (3 - 2 * t);
};
export function compositeTransition(
  c: C,
  a: HTMLCanvasElement,
  b: HTMLCanvasElement,
  w: number,
  h: number,
  progress: number,
  effect: TransitionEffect,
  edge = "#fff4db",
) {
  const q = clamp01(progress),
    p = smooth(q);
  c.save();
  try {
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    if (q <= 0) {
      c.drawImage(a, 0, 0, w, h);
      return;
    }
    if (q >= 1) {
      c.drawImage(b, 0, 0, w, h);
      return;
    }
    c.drawImage(a, 0, 0, w, h);
    effect({ c, a, b, w, h, q, p, edge });
  } finally {
    c.restore();
  }
}
/**
 * Displaces horizontal strips of the dominant image, then blends in the equally
 * displaced other image around the swap. `shift` and `stretch` receive the strip
 * index and the displacement amplitude.
 */
export function displaceStrips(
  { c, a, b, w, h, q }: TransitionFrame,
  rows: number,
  shift: (y: number, amp: number) => number,
  stretch: (y: number, amp: number) => number,
) {
  const amp = Math.sin(q * Math.PI),
    image = q < 0.5 ? a : b,
    sh = h / rows;
  // Wrapping source strips keeps every pixel covered at maximum displacement.
  for (let y = 0; y < rows; y++) {
    const dx = shift(y, amp);
    const sx = stretch(y, amp);
    for (const wrap of [-1, 0, 1])
      c.drawImage(image, 0, y * sh, w, sh, dx + wrap * w * sx, y * sh, w * sx, sh + 0.5 * amp);
  }
  // Blend a complete warped incoming image over the outgoing during the handoff.
  // Both scenes reach the same displacement at the swap, avoiding an exposed cut.
  if (q > 0.38 && q < 0.62) {
    c.globalAlpha = smooth((q - 0.38) / 0.24);
    if (q >= 0.5) c.globalAlpha = 1 - c.globalAlpha;
    const other = q < 0.5 ? b : a;
    for (let y = 0; y < rows; y++) {
      const dx = shift(y, amp);
      const sx = stretch(y, amp);
      for (const wrap of [-1, 0, 1])
        c.drawImage(other, 0, y * sh, w, sh, dx + wrap * w * sx, y * sh, w * sx, sh + 0.5 * amp);
    }
  }
}
