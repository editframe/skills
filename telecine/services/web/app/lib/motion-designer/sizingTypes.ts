export type SizingMode = "hug" | "fill" | "fixed" | "fraction";

export interface FractionRatio {
  numerator: number;
  denominator: number;
}

export interface ElementSize {
  widthMode: SizingMode;
  widthValue: number | FractionRatio;
  heightMode: SizingMode;
  heightValue: number | FractionRatio;
}

export interface LegacyElementSize {
  width: number;
  height: number;
}

export function isLegacySize(size: ElementSize | LegacyElementSize): size is LegacyElementSize {
  return "width" in size && typeof size.width === "number" && "height" in size && typeof size.height === "number";
}

export function migrateSize(legacySize: LegacyElementSize): ElementSize {
  return {
    widthMode: "fixed",
    widthValue: legacySize.width,
    heightMode: "fixed",
    heightValue: legacySize.height,
  };
}

export function normalizeSize(size: ElementSize | LegacyElementSize | undefined): ElementSize | undefined {
  if (!size) return undefined;
  if (isLegacySize(size)) {
    return migrateSize(size);
  }
  return size;
}

export const FRACTION_RATIOS: FractionRatio[] = [
  { numerator: 1, denominator: 6 },
  { numerator: 1, denominator: 5 },
  { numerator: 1, denominator: 4 },
  { numerator: 1, denominator: 3 },
  { numerator: 2, denominator: 5 },
  { numerator: 1, denominator: 2 },
  { numerator: 3, denominator: 5 },
  { numerator: 2, denominator: 3 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 5 },
  { numerator: 5, denominator: 6 },
];

export function fractionToPercentage(fraction: FractionRatio): number {
  return (fraction.numerator / fraction.denominator) * 100;
}

export function fractionToString(fraction: FractionRatio): string {
  return `${fraction.numerator}/${fraction.denominator}`;
}

export function isFractionRatio(value: number | FractionRatio): value is FractionRatio {
  return typeof value === "object" && "numerator" in value && "denominator" in value;
}

export const SIZING_MODE_LABELS: Record<SizingMode, string> = {
  hug: "Fit Content",
  fill: "Fill Space",
  fixed: "Specific Size",
  fraction: "Responsive",
};

export function fractionToDisplayString(fraction: FractionRatio): string {
  const percentage = fractionToPercentage(fraction);
  const roundedPercentage = Math.round(percentage * 1000) / 1000;
  return `${roundedPercentage}%`;
}

