import type { ElementSize, LegacyElementSize } from "./sizingTypes";
import { isLegacySize, normalizeSize } from "./sizingTypes";

export function getSizeDimensions(
  size: ElementSize | LegacyElementSize | undefined,
): {
  width: number;
  height: number;
} {
  if (!size) return { width: 0, height: 0 };

  const normalized = normalizeSize(size);
  if (!normalized) return { width: 0, height: 0 };

  if (isLegacySize(size as LegacyElementSize)) {
    return {
      width: (size as LegacyElementSize).width,
      height: (size as LegacyElementSize).height,
    };
  }

  // For new format, return the values (for fixed mode) or 0 (for hug/fill)
  const newSize = normalized as ElementSize;
  return {
    width: newSize.widthMode === "fixed" ? newSize.widthValue : 0,
    height: newSize.heightMode === "fixed" ? newSize.heightValue : 0,
  };
}

export function convertToFixedSize(
  size: ElementSize | LegacyElementSize | undefined,
  currentWidth: number,
  currentHeight: number,
): ElementSize {
  const normalized = normalizeSize(size);
  if (!normalized) {
    return {
      widthMode: "fixed",
      widthValue: currentWidth || 100,
      heightMode: "fixed",
      heightValue: currentHeight || 100,
    };
  }

  if (isLegacySize(size as LegacyElementSize)) {
    return {
      widthMode: "fixed",
      widthValue: (size as LegacyElementSize).width,
      heightMode: "fixed",
      heightValue: (size as LegacyElementSize).height,
    };
  }

  // Convert hug/fill modes to fixed using current dimensions
  const newSize = normalized as ElementSize;
  return {
    widthMode: "fixed",
    widthValue:
      newSize.widthMode === "fixed" ? newSize.widthValue : currentWidth || 100,
    heightMode: "fixed",
    heightValue:
      newSize.heightMode === "fixed"
        ? newSize.heightValue
        : currentHeight || 100,
  };
}
