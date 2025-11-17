export type SizingMode = "hug" | "fill" | "fixed";

export interface ElementSize {
  widthMode: SizingMode;
  widthValue: number;
  heightMode: SizingMode;
  heightValue: number;
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

