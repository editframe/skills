/**
 * Overlay position reading and transformation.
 * 
 * Core concept: Browser's computed position is the source of truth.
 * We read it from the DOM and transform to overlay coordinates.
 */

import type { ComputedElementPosition, OverlayPosition } from "./overlayTypes";
import { parseRotationFromTransform } from "../rendering/styleGenerators/rotationUtils";

/**
 * Read element's computed position from DOM.
 * The browser has already applied all transforms, animations, parent hierarchy.
 * Handles both regular elements (data-element-id) and root timegroups (data-timegroup-id).
 */
export function readElementComputedPosition(
  elementId: string,
): ComputedElementPosition | null {
  // Try regular element first
  let element = document.querySelector(
    `[data-element-id="${elementId}"]`,
  ) as HTMLElement;
  
  // If not found, try root timegroup wrapper
  if (!element) {
    const wrapper = document.querySelector(
      `[data-timegroup-id="${elementId}"]`,
    ) as HTMLElement;
    if (wrapper) {
      // Root timegroup wrapper contains the actual ef-timegroup element
      const timegroupElement = wrapper.querySelector(`ef-timegroup#${elementId}`) as any;
      element = timegroupElement || wrapper;
    }
  }
  
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  return {
    screenX: rect.left,
    screenY: rect.top,
    screenWidth: rect.width,
    screenHeight: rect.height,
    rotation: parseRotationFromTransform(computedStyle.transform),
  };
}

/**
 * Transform computed position to overlay coordinates.
 * Apply coordinate space transformation invariant.
 * 
 * Overlay layer only translates (no scale), so we convert screen coordinates
 * to overlay layer coordinates by subtracting the overlay layer's position.
 */
export function transformToOverlayCoordinates(
  computed: ComputedElementPosition,
  overlayLayerRect: DOMRect,
  canvasScale: number,
): OverlayPosition {
  // Convert screen coordinates to overlay layer coordinates
  const overlayX = computed.screenX - overlayLayerRect.left;
  const overlayY = computed.screenY - overlayLayerRect.top;

  // Width/height are already in screen space (getBoundingClientRect returns screen coords)
  // Overlay layer doesn't scale, so dimensions stay as-is
  const overlayWidth = computed.screenWidth;
  const overlayHeight = computed.screenHeight;

  return {
    x: overlayX,
    y: overlayY,
    width: overlayWidth,
    height: overlayHeight,
    rotation: computed.rotation,
    coordinateSpace: "overlay",
  };
}

/**
 * Evaluate overlay position from DOM.
 * Single function that determines overlay position.
 */
export function evaluateOverlayPosition(
  elementId: string,
  overlayLayerRect: DOMRect,
  canvasScale: number,
): OverlayPosition | null {
  const computed = readElementComputedPosition(elementId);
  if (!computed) return null;

  return transformToOverlayCoordinates(computed, overlayLayerRect, canvasScale);
}

