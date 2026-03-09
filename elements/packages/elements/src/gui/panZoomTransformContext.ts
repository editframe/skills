import { createContext } from "@lit/context";
import type { PanZoomTransform } from "../elements/EFPanZoom.js";

/**
 * Lit context for PanZoom transform.
 * Provided by EFPanZoom component, consumed by overlay components.
 */
export const panZoomTransformContext = createContext<PanZoomTransform | undefined>(
  Symbol("panZoomTransform"),
);
