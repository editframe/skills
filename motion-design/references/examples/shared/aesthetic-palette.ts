export type PaletteShift = { hue: number; saturation: number; lightness: number };
export const DEFAULT_SHIFT: PaletteShift = { hue: 0, saturation: 100, lightness: 0 };
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
/** Move every swatch through the same color transform while retaining its role and tonal order. */
export function shiftPalette(palette: string[], shift: PaletteShift = DEFAULT_SHIFT): string[] {
  if (shift.hue === 0 && shift.saturation === 100 && shift.lightness === 0) return palette;
  return palette.map((hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255),
      max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d = max - min;
    let l = (max + min) / 2,
      s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h =
      d === 0 ? 30 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    if (d !== 0) h *= 60;
    h = (((h + shift.hue) % 360) + 360) % 360;
    // Neutral swatches acquire a restrained tint when the hue changes, including optical black/white.
    s = clamp(
      ((s + (1 - s) * Math.min(0.12, Math.abs(shift.hue) / 1500)) * shift.saturation) / 100,
    );
    l = clamp(l + shift.lightness / 100);
    const c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2;
    const rgb =
      h < 60
        ? [c, x, 0]
        : h < 120
          ? [x, c, 0]
          : h < 180
            ? [0, c, x]
            : h < 240
              ? [0, x, c]
              : h < 300
                ? [x, 0, c]
                : [c, 0, x];
    return (
      "#" +
      rgb
        .map((v) =>
          Math.round((v + m) * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  });
}
export function paletteImageFilter(shift?: PaletteShift) {
  return !shift || (shift.hue === 0 && shift.saturation === 100 && shift.lightness === 0)
    ? "none"
    : `hue-rotate(${shift.hue}deg) saturate(${shift.saturation}%) brightness(${100 + shift.lightness}%)`;
}
