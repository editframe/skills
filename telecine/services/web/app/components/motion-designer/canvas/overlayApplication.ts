/**
 * Overlay application - how to apply overlay positions.
 *
 * Mechanism: How to apply it? (update DOM)
 * Separated from semantics (what should it be).
 */

import type { OverlayPosition } from "./overlayTypes";

/**
 * Apply overlay position to DOM.
 * Updates the overlay element's style to match the evaluated position.
 */
export function applyOverlayPosition(
  overlayElement: HTMLElement,
  position: OverlayPosition,
): void {
  // Update DOM with position
  overlayElement.style.left = `${position.x}px`;
  overlayElement.style.top = `${position.y}px`;
  overlayElement.style.width = `${position.width}px`;
  overlayElement.style.height = `${position.height}px`;
  overlayElement.style.transform = `rotate(${position.rotation}deg)`;
  overlayElement.style.transformOrigin = "center";
}

/**
 * Batch multiple overlay updates.
 * Prevents layout thrashing by batching DOM reads first, then writes.
 */
export function batchOverlayUpdates(
  updates: Array<{ elementId: string; position: OverlayPosition }>,
  applyFn: typeof applyOverlayPosition,
): void {
  // Batch DOM writes
  updates.forEach(({ elementId, position }) => {
    const overlayElement = document.querySelector(
      `[data-overlay-id="${elementId}"]`,
    ) as HTMLElement | null;
    if (overlayElement) {
      applyFn(overlayElement, position);
    }
  });
}
