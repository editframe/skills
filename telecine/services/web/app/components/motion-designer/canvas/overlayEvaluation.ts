/**
 * Overlay evaluation - determine what overlay position should be.
 * 
 * Semantics: What should it be? (read from DOM)
 * Separated from mechanism (how to apply it).
 */

import type { OverlayPosition } from "./overlayTypes";
import { evaluateOverlayPosition } from "./overlayPosition";

/**
 * Determine what overlay position should be (read from DOM).
 */
export function evaluateOverlayPositionForElement(
  elementId: string,
  overlayLayerRect: DOMRect,
  canvasScale: number,
): OverlayPosition | null {
  // Read browser's computed position (source of truth)
  // Transform to overlay coordinates
  return evaluateOverlayPosition(elementId, overlayLayerRect, canvasScale);
}

