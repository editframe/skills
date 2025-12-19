/**
 * Overlay State Management
 *
 * This module provides a clean separation between:
 * - SEMANTICS: What should be shown? (OverlayTargets)
 * - MECHANISM: How to calculate screen bounds (calculateOverlayState)
 *
 * INVARIANTS:
 * 1. Overlay is visible iff bounds are non-null with positive dimensions
 * 2. All bounds are in screen coordinates (relative to viewport origin)
 * 3. Only one element can be highlighted at a time
 *
 * COORDINATE SPACES:
 * - Canvas space: Logical coordinates, unaffected by zoom (used for element positioning)
 * - Screen space: Viewport coordinates (used for overlay positioning)
 */

import type { PanZoomTransform } from "../../elements/EFPanZoom.js";
import type { SelectionContext } from "../selection/selectionContext.js";
import { getElementBounds } from "../getElementBounds.js";

// ============================================================================
// TYPES: Core Concepts
// ============================================================================

/**
 * Screen-space bounding box for overlay positioning.
 * All values are in viewport coordinates (pixels from viewport origin).
 */
export interface ScreenBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

/**
 * Canvas-space bounding box (from selection context).
 */
export interface CanvasBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The complete state of all overlays.
 * Each property is either a ScreenBounds or null.
 * An overlay is visible iff its bounds are non-null.
 */
export interface OverlayState {
  selection: ScreenBounds | null;
  boxSelect: ScreenBounds | null;
  highlight: ScreenBounds | null;
}

/**
 * SEMANTICS: What elements should have overlays?
 * This represents the "what" without the "how".
 */
export interface OverlayTargets {
  selectedIds: Set<string>;
  boxSelectBounds: CanvasBounds | null;
  highlightedElementId: string | null;
}

/**
 * Interface for canvas element data (metadata).
 */
export interface ElementMetadata {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

/**
 * Interface for canvas that provides element data.
 */
export interface CanvasWithMetadata {
  getElementData(elementId: string): ElementMetadata | undefined;
  getElement?(elementId: string): HTMLElement | undefined;
  querySelector(selector: string): HTMLElement | null;
  shadowRoot: ShadowRoot | null;
}

// ============================================================================
// SEMANTICS: Extract what should be shown
// ============================================================================

/**
 * Extract overlay targets from selection context and highlighted element.
 * This is pure SEMANTICS - it determines WHAT should be shown.
 */
export function getOverlayTargets(
  selection: SelectionContext | undefined,
  highlightedElement: HTMLElement | null,
): OverlayTargets {
  return {
    selectedIds: selection?.selectedIds ?? new Set(),
    boxSelectBounds: selection?.boxSelectBounds ?? null,
    highlightedElementId:
      highlightedElement?.getAttribute("data-element-id") ??
      highlightedElement?.id ??
      null,
  };
}

// ============================================================================
// MECHANISM: Calculate screen bounds
// ============================================================================

/**
 * Calculate screen bounds for a single element.
 * This is the SINGLE SOURCE OF TRUTH for element → screen bounds conversion.
 *
 * Strategy:
 * 1. Try to use metadata (already in canvas coordinates)
 * 2. Fall back to DOM measurement if metadata unavailable
 *
 * @param elementId - The element's ID (data-element-id or id attribute)
 * @param canvas - Canvas element with getElementData method
 * @param canvasRect - Canvas content element's bounding rect
 * @param scale - Current zoom scale
 * @returns Screen bounds or null if element not found
 */
export function calculateElementScreenBounds(
  elementId: string,
  canvas: CanvasWithMetadata,
  canvasRect: DOMRect,
  scale: number,
): ScreenBounds | null {
  const metadata = canvas.getElementData(elementId);

  if (metadata && metadata.width > 0 && metadata.height > 0) {
    // Use metadata (already in canvas coordinates)
    // For rotated elements, we position from the CENTER (stable during rotation)
    // Then apply CSS transform: rotate() with transform-origin: center
    const centerCanvasX = metadata.x + metadata.width / 2;
    const centerCanvasY = metadata.y + metadata.height / 2;
    const screenWidth = metadata.width * scale;
    const screenHeight = metadata.height * scale;

    return {
      x: canvasRect.left + centerCanvasX * scale - screenWidth / 2,
      y: canvasRect.top + centerCanvasY * scale - screenHeight / 2,
      width: screenWidth,
      height: screenHeight,
      rotation: metadata.rotation ?? 0,
    };
  }

  // Fallback: find element and use DOM measurement
  const element = findElement(elementId, canvas);
  if (!element) return null;

  const bounds = getElementBounds(element);
  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
  };
}

/**
 * Find an element by ID in the canvas (checks both light DOM and shadow DOM).
 */
function findElement(
  elementId: string,
  canvas: CanvasWithMetadata,
): HTMLElement | null {
  // Try canvas's getElement method first
  if (canvas.getElement) {
    const element = canvas.getElement(elementId);
    if (element) return element;
  }

  // Try shadow DOM
  if (canvas.shadowRoot) {
    const element = canvas.shadowRoot.querySelector(
      `[data-element-id="${elementId}"]`,
    ) as HTMLElement | null;
    if (element) return element;
  }

  // Try light DOM
  return canvas.querySelector(
    `[data-element-id="${elementId}"]`,
  ) as HTMLElement | null;
}

/**
 * Calculate the union of multiple bounds (bounding box that contains all).
 */
export function unionBounds(bounds: ScreenBounds[]): ScreenBounds | null {
  if (bounds.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of bounds) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate selection bounds for all selected elements.
 */
export function calculateSelectionBounds(
  selectedIds: Set<string>,
  canvas: CanvasWithMetadata,
  canvasRect: DOMRect,
  scale: number,
): ScreenBounds | null {
  if (selectedIds.size === 0) return null;

  const elementBounds = Array.from(selectedIds)
    .map((id) => calculateElementScreenBounds(id, canvas, canvasRect, scale))
    .filter((b): b is ScreenBounds => b !== null);

  return unionBounds(elementBounds);
}

/**
 * Calculate box-select bounds (convert canvas bounds to screen bounds).
 *
 * @param boxSelectBounds - Box selection bounds in canvas coordinates
 * @param panZoomElement - The pan-zoom element (for canvasToScreen conversion)
 * @param panZoomTransform - Current pan-zoom transform
 * @returns Screen bounds or null
 */
export function calculateBoxSelectBounds(
  boxSelectBounds: CanvasBounds | null,
  panZoomElement: HTMLElement | null,
  panZoomTransform: PanZoomTransform | undefined,
): ScreenBounds | null {
  if (!boxSelectBounds || !panZoomElement || !panZoomTransform) {
    return null;
  }

  // Try to use EFPanZoom's canvasToScreen method if available
  const pz = panZoomElement as any;
  if (typeof pz.canvasToScreen === "function") {
    const topLeft = pz.canvasToScreen(boxSelectBounds.left, boxSelectBounds.top);
    const bottomRight = pz.canvasToScreen(
      boxSelectBounds.right,
      boxSelectBounds.bottom,
    );

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  // Fallback: manual calculation
  const panZoomRect = panZoomElement.getBoundingClientRect();
  const { scale, x, y } = panZoomTransform;

  const screenLeft = panZoomRect.left + boxSelectBounds.left * scale + x;
  const screenTop = panZoomRect.top + boxSelectBounds.top * scale + y;
  const screenRight = panZoomRect.left + boxSelectBounds.right * scale + x;
  const screenBottom = panZoomRect.top + boxSelectBounds.bottom * scale + y;

  return {
    x: screenLeft,
    y: screenTop,
    width: screenRight - screenLeft,
    height: screenBottom - screenTop,
  };
}

/**
 * Calculate highlight bounds for the highlighted element.
 */
export function calculateHighlightBounds(
  highlightedElementId: string | null,
  canvas: CanvasWithMetadata,
  canvasRect: DOMRect,
  scale: number,
): ScreenBounds | null {
  if (!highlightedElementId) return null;

  return calculateElementScreenBounds(
    highlightedElementId,
    canvas,
    canvasRect,
    scale,
  );
}

// ============================================================================
// MAIN: Calculate complete overlay state
// ============================================================================

/**
 * Calculate the complete overlay state from targets.
 * This is the main entry point that combines semantics and mechanism.
 *
 * @param targets - What should be shown (from getOverlayTargets)
 * @param canvas - Canvas element with metadata
 * @param canvasRect - Canvas content bounding rect
 * @param panZoomElement - Pan-zoom element (for box-select conversion)
 * @param panZoomTransform - Current transform
 * @returns Complete overlay state
 */
export function calculateOverlayState(
  targets: OverlayTargets,
  canvas: CanvasWithMetadata,
  canvasRect: DOMRect,
  panZoomElement: HTMLElement | null,
  panZoomTransform: PanZoomTransform | undefined,
): OverlayState {
  const scale = panZoomTransform?.scale ?? 1;

  // INVARIANT: Don't show highlight when element is also selected
  // This prevents duplicate overlays and visual clutter
  const shouldShowHighlight =
    targets.highlightedElementId !== null &&
    !targets.selectedIds.has(targets.highlightedElementId);

  return {
    selection: calculateSelectionBounds(
      targets.selectedIds,
      canvas,
      canvasRect,
      scale,
    ),
    boxSelect: calculateBoxSelectBounds(
      targets.boxSelectBounds,
      panZoomElement,
      panZoomTransform,
    ),
    highlight: shouldShowHighlight
      ? calculateHighlightBounds(
          targets.highlightedElementId,
          canvas,
          canvasRect,
          scale,
        )
      : null,
  };
}

// ============================================================================
// INVARIANTS: Helper functions to check invariants
// ============================================================================

/**
 * INVARIANT: Overlay is visible iff bounds exist with positive dimensions.
 */
export function isOverlayVisible(bounds: ScreenBounds | null): boolean {
  return bounds !== null && bounds.width > 0 && bounds.height > 0;
}

/**
 * Check if overlay state has any visible overlays.
 */
export function hasVisibleOverlays(state: OverlayState): boolean {
  return (
    isOverlayVisible(state.selection) ||
    isOverlayVisible(state.boxSelect) ||
    isOverlayVisible(state.highlight)
  );
}

