import React, { useRef, useEffect, useState, useCallback } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { HierarchyItem } from "./HierarchyItem";
import { useDragContext } from "./DragContext";
import { behaviorRegistry } from "~/lib/motion-designer/behaviors";
import { isTemporalElement } from "~/lib/motion-designer/temporalUtils";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { evaluateDropTarget, type DropTarget, type ElementRef } from "./dropTargetResolver";
import { DropZoneStateMachine } from "./dropZone";

interface HierarchyTreeProps {
  state: MotionDesignerState;
}

export function HierarchyTree({ state }: HierarchyTreeProps) {
  const { dragState, setDropTarget, endDrag, updateDrag } = useDragContext();
  const actions = useMotionDesignerActions();
  const rootContainerRef = useRef<HTMLDivElement>(null);
  const [rootDropIndex, setRootDropIndex] = useState<number | null>(null);
  const [resolvedDropTarget, setResolvedDropTarget] = useState<DropTarget | null>(null);
  const elementRefsRef = useRef<Map<string, { element: HTMLDivElement; depth: number }>>(new Map());
  const zoneStateMachineRef = useRef<DropZoneStateMachine>(new DropZoneStateMachine());
  const rafIdRef = useRef<number | null>(null);

  // Use a ref to store the latest state so we don't need it in the dependency array
  // This prevents infinite loops when state changes frequently (e.g., during video scrubbing)
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const resolveDropTargetForAllElements = useCallback(() => {
    const currentState = stateRef.current;
    
    if (!dragState.draggedElementId || !dragState.dragPosition) {
      setResolvedDropTarget(null);
      setRootDropIndex(null);
      if (dragState.dropTarget?.elementId === "__root__") {
        setDropTarget(null);
      }
      return;
    }

    const draggedElement = currentState.composition.elements[dragState.draggedElementId];
    if (!draggedElement) {
      setResolvedDropTarget(null);
      setRootDropIndex(null);
      return;
    }

    const containerRect = rootContainerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      setResolvedDropTarget(null);
      setRootDropIndex(null);
      return;
    }

    const isOverContainer =
      dragState.dragPosition.x >= containerRect.left &&
      dragState.dragPosition.x <= containerRect.right &&
      dragState.dragPosition.y >= containerRect.top &&
      dragState.dragPosition.y <= containerRect.bottom;

    if (!isOverContainer) {
      setResolvedDropTarget(null);
      setRootDropIndex(null);
      if (dragState.dropTarget?.elementId === "__root__") {
        setDropTarget(null);
      }
      return;
    }

    const elementRefs: ElementRef[] = [];
    for (const [elementId, ref] of elementRefsRef.current.entries()) {
      const element = currentState.composition.elements[elementId];
      if (!element) continue;
      const rect = ref.element.getBoundingClientRect();
      elementRefs.push({
        elementId,
        element,
        rect,
        depth: ref.depth,
      });
    }

    const target = evaluateDropTarget(
      dragState.dragPosition,
      elementRefs,
      dragState.draggedElementId,
      currentState,
      (elementId, cursorY, rect, canHaveChildren) =>
        zoneStateMachineRef.current.determineZone(elementId, cursorY, rect, canHaveChildren),
      (elementId) => zoneStateMachineRef.current.resetElement(elementId),
    );

    setResolvedDropTarget(target);
    if (target) {
      setDropTarget(target);
    } else if (dragState.dropTarget) {
      setDropTarget(null);
    }

    if (isTemporalElement(draggedElement) && !target) {
      const relativeY = dragState.dragPosition.y - containerRect.top;
      const rootTimegroupIds = currentState.composition.rootTimegroupIds;
      let dropIndex: number | null = null;

      for (let i = 0; i < rootTimegroupIds.length; i++) {
        const elementId = rootTimegroupIds[i];
        const element = currentState.composition.elements[elementId];
        if (!element) continue;

        const elementTop = containerRect.top + (i * 32);
        const elementBottom = elementTop + 32;

        if (relativeY >= elementTop && relativeY <= elementBottom) {
          const elementCenter = (elementTop + elementBottom) / 2;
          dropIndex = relativeY < elementCenter ? i : i + 1;
          break;
        }
      }

      if (dropIndex === null) {
        dropIndex = rootTimegroupIds.length;
      }

      if (dropIndex !== null && behaviorRegistry.canMove(dragState.draggedElementId, null, dropIndex, currentState)) {
        setRootDropIndex(dropIndex);
        setDropTarget({
          elementId: "__root__",
          position: "before",
        });
      } else {
        setRootDropIndex(null);
      }
    } else {
      setRootDropIndex(null);
    }
  }, [dragState.dragPosition, dragState.draggedElementId, dragState.dropTarget, setDropTarget]);

  useEffect(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      resolveDropTargetForAllElements();
      rafIdRef.current = null;
    });

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [resolveDropTargetForAllElements]);

  useEffect(() => {
    if (!dragState.draggedElementId) {
      zoneStateMachineRef.current.reset();
      setResolvedDropTarget(null);
      return;
    }

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!dragState.draggedElementId) return;
      updateDrag({ x: e.clientX, y: e.clientY });
    };

    const handleGlobalPointerUp = () => {
      const draggedElementId = dragState.draggedElementId;
      if (!draggedElementId) {
        zoneStateMachineRef.current.reset();
        endDrag();
        return;
      }

      const currentDropTarget = resolvedDropTarget;
      const currentRootDropIndex = rootDropIndex;

      zoneStateMachineRef.current.reset();

      if (!currentDropTarget && currentRootDropIndex === null) {
        endDrag();
        return;
      }

      if (currentDropTarget?.elementId === "__root__" && currentRootDropIndex !== null) {
        actions.moveElement(draggedElementId, null, currentRootDropIndex);
      } else if (currentDropTarget) {
        const currentState = stateRef.current;
        const targetElement = currentState.composition.elements[currentDropTarget.elementId];
        if (targetElement) {
          if (currentDropTarget.position === "inside") {
            actions.moveElement(draggedElementId, currentDropTarget.elementId);
          } else {
            const parentId = findParentId(currentDropTarget.elementId, currentState);
            const siblings = parentId
              ? currentState.composition.elements[parentId]?.childIds || []
              : currentState.composition.rootTimegroupIds;

            const targetIndex = siblings.indexOf(currentDropTarget.elementId);
            let newIndex = currentDropTarget.position === "before" ? targetIndex : targetIndex + 1;

            const draggedIndex = siblings.indexOf(draggedElementId);
            if (draggedIndex !== -1) {
              if (draggedIndex < targetIndex) {
                newIndex = currentDropTarget.position === "before" ? targetIndex - 1 : targetIndex;
              } else if (draggedIndex > targetIndex) {
                newIndex = currentDropTarget.position === "before" ? targetIndex : targetIndex + 1;
              } else {
                return;
              }
            }

            actions.moveElement(draggedElementId, parentId, newIndex);
          }
        }
      }

      endDrag();
    };

    document.addEventListener("pointermove", handleGlobalPointerMove);
    document.addEventListener("pointerup", handleGlobalPointerUp);

    return () => {
      document.removeEventListener("pointermove", handleGlobalPointerMove);
      document.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [dragState.draggedElementId, resolvedDropTarget, rootDropIndex, endDrag, updateDrag, actions]);

  const findParentId = (elementId: string, state: MotionDesignerState): string | null => {
    for (const element of Object.values(state.composition.elements)) {
      if (element.childIds.includes(elementId)) {
        return element.id;
      }
    }
    return null;
  };

  const registerElementRef = useCallback((elementId: string, element: HTMLDivElement, depth: number) => {
    elementRefsRef.current.set(elementId, { element, depth });
  }, []);

  const unregisterElementRef = useCallback((elementId: string) => {
    elementRefsRef.current.delete(elementId);
  }, []);

  const handleTreeClick = (e: React.MouseEvent) => {
    // If clicking directly on the tree container (not on any element), deselect
    if (e.target === e.currentTarget) {
      actions.selectElement(null);
    }
  };

  return (
    <div ref={rootContainerRef} onClick={handleTreeClick}>
      {state.composition.rootTimegroupIds.map((id, index) => {
        const element = state.composition.elements[id];
        if (!element) return null;
        return (
          <HierarchyItem
            key={id}
            element={element}
            state={state}
            depth={0}
            dropTarget={resolvedDropTarget}
            registerElementRef={registerElementRef}
            unregisterElementRef={unregisterElementRef}
          />
        );
      })}
    </div>
  );
}
