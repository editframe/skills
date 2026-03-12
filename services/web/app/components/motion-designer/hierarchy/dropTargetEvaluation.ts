import type {
  MotionDesignerState,
  ElementNode,
} from "~/lib/motion-designer/types";
import { behaviorRegistry } from "~/lib/motion-designer/behaviors";
import type { DropZone } from "./dropZone";

export interface DropTarget {
  elementId: string;
  position: "before" | "after" | "inside";
}

export interface ElementRef {
  elementId: string;
  element: ElementNode;
  rect: DOMRect;
  depth: number;
}

function findParentId(
  elementId: string,
  state: MotionDesignerState,
): string | null {
  for (const element of Object.values(state.composition.elements)) {
    if (element.childIds.includes(elementId)) {
      return element.id;
    }
  }
  return null;
}

function canDropInside(
  draggedElementId: string,
  targetElementId: string,
  state: MotionDesignerState,
): boolean {
  return behaviorRegistry.canMove(
    draggedElementId,
    targetElementId,
    undefined,
    state,
  );
}

function canDropBeforeAfter(
  draggedElementId: string,
  targetElementId: string,
  position: "before" | "after",
  state: MotionDesignerState,
): boolean {
  const parentId = findParentId(targetElementId, state);
  const siblings = parentId
    ? state.composition.elements[parentId]?.childIds || []
    : state.composition.rootTimegroupIds;

  const targetIndex = siblings.indexOf(targetElementId);
  const newIndex = position === "before" ? targetIndex : targetIndex + 1;

  return behaviorRegistry.canMove(draggedElementId, parentId, newIndex, state);
}

function canDropAtPosition(
  draggedElementId: string,
  targetElementId: string,
  zone: DropZone,
  state: MotionDesignerState,
): boolean {
  if (zone === "none") return false;

  if (zone === "inside") {
    return canDropInside(draggedElementId, targetElementId, state);
  }

  return canDropBeforeAfter(
    draggedElementId,
    targetElementId,
    zone === "before" ? "before" : "after",
    state,
  );
}

function canElementHaveChildren(element: ElementNode): boolean {
  return (
    element.childIds.length > 0 ||
    element.type === "div" ||
    element.type === "timegroup"
  );
}

function isCursorOverElement(
  cursorPosition: { x: number; y: number },
  rect: DOMRect,
): boolean {
  return (
    cursorPosition.x >= rect.left &&
    cursorPosition.x <= rect.right &&
    cursorPosition.y >= rect.top &&
    cursorPosition.y <= rect.bottom
  );
}

function selectBestTarget(
  candidates: Array<{ elementRef: ElementRef; zone: DropZone }>,
): DropTarget | null {
  if (candidates.length === 0) return null;

  let best: { elementRef: ElementRef; zone: DropZone } | null = null;
  let bestDepth = -1;

  for (const candidate of candidates) {
    if (candidate.elementRef.depth > bestDepth) {
      bestDepth = candidate.elementRef.depth;
      best = candidate;
    }
  }

  if (!best) return null;

  return {
    elementId: best.elementRef.elementId,
    position:
      best.zone === "before"
        ? "before"
        : best.zone === "after"
          ? "after"
          : "inside",
  };
}

export function evaluateDropTarget(
  cursorPosition: { x: number; y: number },
  elementRefs: ElementRef[],
  draggedElementId: string,
  state: MotionDesignerState,
  determineZone: (
    elementId: string,
    cursorY: number,
    rect: DOMRect,
    canHaveChildren: boolean,
  ) => DropZone,
  resetElementZone: (elementId: string) => void,
): DropTarget | null {
  if (!draggedElementId || elementRefs.length === 0) {
    return null;
  }

  const draggedElement = state.composition.elements[draggedElementId];
  if (!draggedElement) return null;

  const candidates: Array<{ elementRef: ElementRef; zone: DropZone }> = [];

  for (const elementRef of elementRefs) {
    if (elementRef.elementId === draggedElementId) continue;

    if (!isCursorOverElement(cursorPosition, elementRef.rect)) {
      resetElementZone(elementRef.elementId);
      continue;
    }

    const canHaveChildren = canElementHaveChildren(elementRef.element);
    const zone = determineZone(
      elementRef.elementId,
      cursorPosition.y,
      elementRef.rect,
      canHaveChildren,
    );

    if (zone === "none") continue;

    if (
      !canDropAtPosition(draggedElementId, elementRef.elementId, zone, state)
    ) {
      continue;
    }

    candidates.push({ elementRef, zone });
  }

  return selectBestTarget(candidates);
}
