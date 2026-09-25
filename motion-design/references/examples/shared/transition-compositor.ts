/** Pure, seekable two-image transitions. All progress comes from the composition clock. */
export type TransitionKind =
  | "cut"
  | "dissolve"
  | "foreground"
  | "luma"
  | "liquid"
  | "paper"
  | "blocks"
  | "cards"
  | "smear"
  | "warp"
  | "rings"
  | "push"
  | "rise"
  | "iris"
  | "blinds"
  | "zoom"
  | "blur";
type C = CanvasRenderingContext2D;
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {
  const t = clamp01(n);
  return t * t * (3 - 2 * t);
};
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
export function compositeTransition(
  c: C,
  a: HTMLCanvasElement,
  b: HTMLCanvasElement,
  w: number,
  h: number,
  progress: number,
  kind: TransitionKind,
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
    if (kind === "cut") {
      c.drawImage(q < 0.5 ? a : b, 0, 0, w, h);
      return;
    }
    c.drawImage(a, 0, 0, w, h);
    if (kind === "dissolve") {
      c.globalAlpha = p;
      c.drawImage(b, 0, 0, w, h);
      return;
    }
    if (kind === "push" || kind === "rise") {
      const dx = kind === "push" ? w * p : 0,
        dy = kind === "rise" ? h * p : 0;
      c.drawImage(a, -dx, -dy, w, h);
      c.drawImage(b, kind === "push" ? w - dx : 0, kind === "rise" ? h - dy : 0, w, h);
      return;
    }
    if (kind === "blinds") {
      c.beginPath();
      for (let i = 0; i < 12; i++) c.rect(0, (i * h) / 12, w, (h / 12) * p);
      c.clip();
      c.drawImage(b, 0, 0, w, h);
      return;
    }
    if (kind === "zoom") {
      c.save();
      const scale = 1 + p * 0.22;
      c.translate(w / 2, h / 2);
      c.scale(scale, scale);
      c.drawImage(a, -w / 2, -h / 2, w, h);
      c.restore();
      c.globalAlpha = p;
      const incomingScale = 1.22 - p * 0.22;
      c.translate(w / 2, h / 2);
      c.scale(incomingScale, incomingScale);
      c.drawImage(b, -w / 2, -h / 2, w, h);
      return;
    }
    if (kind === "blur") {
      c.filter = `blur(${Math.sin(q * Math.PI) * w * 0.014}px)`;
      const pad = Math.sin(q * Math.PI) * 0.04;
      c.drawImage(a, -w * pad, -h * pad, w * (1 + 2 * pad), h * (1 + 2 * pad));
      c.globalAlpha = p;
      c.drawImage(b, -w * pad, -h * pad, w * (1 + 2 * pad), h * (1 + 2 * pad));
      return;
    }
    if (kind === "cards") {
      // Orthographic rotation about each card's Y axis; its back has a distinct image.
      c.fillStyle = edge;
      c.fillRect(0, 0, w, h);
      const cols = 6,
        rows = 4,
        cw = w / cols,
        ch = h / rows;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const t = smooth((q - (x + y) * 0.033) / 0.7),
            scale = Math.abs(Math.cos(t * Math.PI)),
            dw = cw * scale;
          const image = t < 0.5 ? a : b;
          c.drawImage(
            image,
            x * cw,
            y * ch,
            cw,
            ch,
            x * cw + (cw - dw) / 2,
            y * ch,
            dw + 0.15,
            ch + 0.25,
          );
          c.globalAlpha = 0.24 * Math.sin(t * Math.PI);
          c.fillStyle = "#12121a";
          c.fillRect(x * cw + (cw - dw) / 2, y * ch, dw, ch);
          c.globalAlpha = 1;
        }
      return;
    }
    if (kind === "blocks") {
      const cols = 24,
        rows = Math.ceil((cols * h) / w),
        cw = w / cols,
        ch = h / rows;
      c.beginPath();
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
          if ((hash % 997) / 997 < q) c.rect(x * cw, y * ch, cw + 0.6, ch + 0.6);
        }
      c.clip();
      c.drawImage(b, 0, 0, w, h);
      return;
    }
    if (kind === "luma") {
      const { layer, mask, map, pixels } = buffers(c, w, h),
        mc = mask.getContext("2d")!,
        lc = layer.getContext("2d")!;
      for (let i = 0; i < map.length; i++) {
        pixels.data[i * 4 + 3] = Math.round(255 * clamp01((q * 1.1 - 0.05 - map[i]) / 0.065 + 0.5));
      }
      mc.putImageData(pixels, 0, 0);
      lc.clearRect(0, 0, w, h);
      lc.drawImage(b, 0, 0, w, h);
      lc.globalCompositeOperation = "destination-in";
      lc.drawImage(mask, 0, 0, w, h);
      lc.globalCompositeOperation = "source-over";
      c.drawImage(layer, 0, 0);
      return;
    }
    if (kind === "rings" || kind === "iris") {
      c.beginPath();
      c.arc(w / 2, h / 2, Math.hypot(w, h) * 0.51 * p, 0, Math.PI * 2);
      c.clip();
      c.drawImage(b, 0, 0, w, h);
      return;
    }
    if (kind === "smear" || kind === "warp") {
      const amp = Math.sin(q * Math.PI),
        image = q < 0.5 ? a : b,
        rows = kind === "smear" ? 30 : 100,
        sh = h / rows;
      // Wrapping source strips keeps every pixel covered at maximum displacement.
      for (let y = 0; y < rows; y++) {
        const shift =
          kind === "smear"
            ? amp * w * (0.16 + 0.2 * Math.sin(y * 2.4))
            : Math.sin((y / rows) * 9 - q * 6) * amp * w * 0.085;
        const stretch = kind === "smear" ? 1 + amp * (0.18 + 0.15 * Math.sin(y * 1.8)) : 1;
        for (const wrap of [-1, 0, 1])
          c.drawImage(
            image,
            0,
            y * sh,
            w,
            sh,
            shift + wrap * w * stretch,
            y * sh,
            w * stretch,
            sh + 0.5 * amp,
          );
      }
      // Blend a complete warped incoming image over the outgoing during the handoff.
      // Both scenes reach the same displacement at the swap, avoiding an exposed cut.
      if (q > 0.38 && q < 0.62) {
        c.globalAlpha = smooth((q - 0.38) / 0.24);
        if (q >= 0.5) c.globalAlpha = 1 - c.globalAlpha;
        const other = q < 0.5 ? b : a;
        for (let y = 0; y < rows; y++) {
          const shift =
            kind === "smear"
              ? amp * w * (0.16 + 0.2 * Math.sin(y * 2.4))
              : Math.sin((y / rows) * 9 - q * 6) * amp * w * 0.085;
          const stretch = kind === "smear" ? 1 + amp * (0.18 + 0.15 * Math.sin(y * 1.8)) : 1;
          for (const wrap of [-1, 0, 1])
            c.drawImage(
              other,
              0,
              y * sh,
              w,
              sh,
              shift + wrap * w * stretch,
              y * sh,
              w * stretch,
              sh + 0.5 * amp,
            );
        }
      }
      return;
    }
    c.beginPath();
    if (kind === "liquid") {
      const yy = -h * 0.12 + p * h * 1.24,
        amplitude = h * 0.065 * Math.sin(q * Math.PI);
      c.moveTo(0, 0);
      c.lineTo(w, 0);
      for (let x = w; x >= 0; x -= w / 120)
        c.lineTo(
          x,
          yy + amplitude * (Math.sin((x / w) * 8 + q * 3) + 0.28 * Math.sin((x / w) * 19 - q * 5)),
        );
      c.lineTo(0, yy);
      c.closePath();
      c.clip();
      c.drawImage(b, 0, 0, w, h);
      return;
    }
    if (kind === "paper") {
      const stepped = Math.floor(q * 22) / 22,
        front = (-0.1 + smooth(stepped) * 1.2) * w;
      const points = Array.from({ length: 81 }, (_, i) => [
        front + Math.sin(i * 2.37) * w * 0.006 + Math.sin(i * 0.7) * w * 0.004,
        (i / 80) * h,
      ]);
      c.moveTo(0, 0);
      points.forEach(([x, y]) => c.lineTo(x, y));
      c.lineTo(0, h);
      c.closePath();
      c.clip();
      c.drawImage(b, 0, 0, w, h);
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.strokeStyle = edge;
      c.lineWidth = w * 0.009;
      c.stroke();
      return;
    }
    // The visible foreground sail drives the same boundary that reveals scene B.
    const front = (-0.5 + p * 2) * w;
    c.moveTo(0, 0);
    c.lineTo(front - w * 0.1, 0);
    c.lineTo(front + w * 0.2, h * 0.55);
    c.lineTo(front - w * 0.12, h);
    c.lineTo(0, h);
    c.closePath();
    c.clip();
    c.drawImage(b, 0, 0, w, h);
    c.restore();
    c.save();
    c.beginPath();
    c.moveTo(front - w * 0.1, 0);
    c.lineTo(front + w * 0.2, h * 0.55);
    c.lineTo(front - w * 0.12, h);
    c.lineTo(front - w * 0.34, h * 0.82);
    c.closePath();
    c.fillStyle = edge;
    c.fill();
  } finally {
    c.restore();
  }
}
