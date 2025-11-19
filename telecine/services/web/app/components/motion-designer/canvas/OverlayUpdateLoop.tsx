/**
 * Overlay Update Loop - Single RAF loop that updates all overlays every frame.
 * 
 * Simpler approach: Update everything every frame. DOM reads are fast when batched,
 * and the overhead of tracking dirty state is comparable to just updating everything.
 */

import React, { useEffect } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { evaluateOverlayPositionForElement } from "./overlayEvaluation";
import { batchOverlayUpdates } from "./overlayApplication";
import type { OverlayPosition } from "./overlayTypes";

interface OverlayUpdateLoopProps {
  state: MotionDesignerState;
  canvasTransform: { x: number; y: number; scale: number };
  overlayLayerRef: React.RefObject<HTMLElement>;
}

/**
 * Collect all element IDs from the composition tree.
 */
function collectAllElementIds(state: MotionDesignerState): string[] {
  const elementIds: string[] = [];

  function collect(elementId: string): void {
    elementIds.push(elementId);
    const element = state.composition.elements[elementId];
    if (element) {
      for (const childId of element.childIds) {
        collect(childId);
      }
    }
  }

  for (const rootId of state.composition.rootTimegroupIds) {
    collect(rootId);
  }

  return elementIds;
}

/**
 * Process overlay updates for all elements.
 * Batches DOM reads first, then batch DOM writes.
 */
function processAllOverlayUpdates(
  elementIds: string[],
  overlayLayerRect: DOMRect,
  canvasScale: number,
): void {
  // Batch DOM reads first
  const updates: Array<{ elementId: string; position: OverlayPosition | null }> =
    [];

  for (const elementId of elementIds) {
    const position = evaluateOverlayPositionForElement(
      elementId,
      overlayLayerRect,
      canvasScale,
    );
    updates.push({ elementId, position });
  }

  // Then batch DOM writes
  const validUpdates = updates.filter(
    (u) => u.position !== null,
  ) as Array<{ elementId: string; position: OverlayPosition }>;
  batchOverlayUpdates(validUpdates, (element, position) => {
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.width = `${position.width}px`;
    element.style.height = `${position.height}px`;
    element.style.transform = `rotate(${position.rotation}deg)`;
    element.style.transformOrigin = "center";
  });
}

/**
 * OverlayUpdateLoop component.
 * Updates all overlays every animation frame.
 */
export function OverlayUpdateLoop({
  state,
  canvasTransform,
  overlayLayerRef,
}: OverlayUpdateLoopProps) {
  useEffect(() => {
    const overlayLayer = overlayLayerRef.current;
    if (!overlayLayer) return;

    let rafId: number;

    const updateLoop = () => {
      const overlayLayerRect = overlayLayer.getBoundingClientRect();
      const elementIds = collectAllElementIds(state);

      // Update all overlays every frame
      if (elementIds.length > 0) {
        processAllOverlayUpdates(
          elementIds,
          overlayLayerRect,
          canvasTransform.scale,
        );
      }

      // Continue loop
      rafId = requestAnimationFrame(updateLoop);
    };

    // Start loop
    rafId = requestAnimationFrame(updateLoop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [overlayLayerRef, canvasTransform.scale, state]);

  // This component doesn't render anything
  return null;
}

