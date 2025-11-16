import React, { useRef, useEffect, useState } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { HierarchyItem } from "./HierarchyItem";
import { useDragContext } from "./DragContext";
import { behaviorRegistry } from "~/lib/motion-designer/behaviors";
import { isTemporalElement } from "~/lib/motion-designer/temporalUtils";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";

interface HierarchyTreeProps {
  state: MotionDesignerState;
}

export function HierarchyTree({ state }: HierarchyTreeProps) {
  const { dragState, setDropTarget, endDrag, updateDrag } = useDragContext();
  const actions = useMotionDesignerActions();
  const rootContainerRef = useRef<HTMLDivElement>(null);
  const [rootDropIndex, setRootDropIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!dragState.draggedElementId || !dragState.dragPosition || !rootContainerRef.current) {
      setRootDropIndex(null);
      if (dragState.dropTarget?.elementId === "__root__") {
        setDropTarget(null);
      }
      return;
    }

    const draggedElement = state.composition.elements[dragState.draggedElementId];
    if (!draggedElement || !isTemporalElement(draggedElement)) {
      setRootDropIndex(null);
      if (dragState.dropTarget?.elementId === "__root__") {
        setDropTarget(null);
      }
      return;
    }

    const containerRect = rootContainerRef.current.getBoundingClientRect();
    const isOverContainer =
      dragState.dragPosition.x >= containerRect.left &&
      dragState.dragPosition.x <= containerRect.right &&
      dragState.dragPosition.y >= containerRect.top &&
      dragState.dragPosition.y <= containerRect.bottom;

    if (!isOverContainer) {
      setRootDropIndex(null);
      if (dragState.dropTarget?.elementId === "__root__") {
        setDropTarget(null);
      }
      return;
    }

    const relativeY = dragState.dragPosition.y - containerRect.top;
    const rootTimegroupIds = state.composition.rootTimegroupIds;
    let dropIndex: number | null = null;

    for (let i = 0; i < rootTimegroupIds.length; i++) {
      const elementId = rootTimegroupIds[i];
      const element = state.composition.elements[elementId];
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

    if (dropIndex !== null && behaviorRegistry.canMove(dragState.draggedElementId, null, dropIndex, state)) {
      setRootDropIndex(dropIndex);
      setDropTarget({
        elementId: "__root__",
        position: "before",
      });
    } else {
      setRootDropIndex(null);
      if (dragState.dropTarget?.elementId === "__root__") {
        setDropTarget(null);
      }
    }
  }, [dragState.dragPosition, dragState.draggedElementId, dragState.dropTarget, state, setDropTarget]);

  useEffect(() => {
    if (!dragState.draggedElementId) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!dragState.draggedElementId) return;
      updateDrag({ x: e.clientX, y: e.clientY });
    };

    const handleGlobalPointerUp = () => {
      if (!dragState.draggedElementId || !dragState.dropTarget) {
        endDrag();
        return;
      }

      const draggedElementId = dragState.draggedElementId;
      const dropTarget = dragState.dropTarget;

      if (dropTarget.elementId === "__root__" && rootDropIndex !== null) {
        actions.moveElement(draggedElementId, null, rootDropIndex);
      } else {
        const targetElement = state.composition.elements[dropTarget.elementId];
        if (targetElement) {
          if (dropTarget.position === "inside") {
            actions.moveElement(draggedElementId, dropTarget.elementId);
          } else {
            const parentId = findParentId(dropTarget.elementId, state);
            const siblings = parentId
              ? state.composition.elements[parentId]?.childIds || []
              : state.composition.rootTimegroupIds;

            const targetIndex = siblings.indexOf(dropTarget.elementId);
            const newIndex = dropTarget.position === "before" ? targetIndex : targetIndex + 1;
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
  }, [dragState.draggedElementId, dragState.dropTarget, rootDropIndex, endDrag, updateDrag, actions, state]);

  const findParentId = (elementId: string, state: MotionDesignerState): string | null => {
    for (const element of Object.values(state.composition.elements)) {
      if (element.childIds.includes(elementId)) {
        return element.id;
      }
    }
    return null;
  };

  return (
    <div ref={rootContainerRef}>
      {state.composition.rootTimegroupIds.map((id, index) => {
        const element = state.composition.elements[id];
        if (!element) return null;
        return (
          <React.Fragment key={id}>
            {rootDropIndex === index && (
              <div className="h-1.5 bg-blue-500 my-0.5 rounded-full shadow-lg mx-2" />
            )}
            <HierarchyItem
              element={element}
              state={state}
              depth={0}
            />
          </React.Fragment>
        );
      })}
      {rootDropIndex === state.composition.rootTimegroupIds.length && (
        <div className="h-1.5 bg-blue-500 my-0.5 rounded-full shadow-lg mx-2" />
      )}
    </div>
  );
}
