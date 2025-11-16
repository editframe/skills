import React, { useState, useRef, useEffect } from "react";
import { getElementIcon } from "~/lib/motion-designer/elementTypes";
import type { MotionDesignerState, ElementNode } from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { useDragContext } from "./DragContext";
import { behaviorRegistry } from "~/lib/motion-designer/behaviors";

interface HierarchyItemProps {
  element: ElementNode;
  state: MotionDesignerState;
  depth: number;
}

type DropPosition = "before" | "after" | "inside" | null;

export function HierarchyItem({
  element,
  state,
  depth,
}: HierarchyItemProps) {
  const actions = useMotionDesignerActions();
  const { dragState, startDrag, setDropTarget } = useDragContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const itemRef = useRef<HTMLDivElement>(null);
  const isSelected = state.ui.selectedElementId === element.id;
  const activeRootTimegroupId = getActiveRootTimegroupId(state);
  const isRoot = state.composition.rootTimegroupIds.includes(element.id);
  const isActiveRoot = activeRootTimegroupId === element.id && isRoot;
  const hasChildren = element.childIds && element.childIds.length > 0;

  const isDragging = dragState.draggedElementId === element.id;
  const isDragTarget = dragState.draggedElementId !== null && dragState.draggedElementId !== element.id;
  const isCurrentDropTarget = dragState.dropTarget?.elementId === element.id;
  const dropPosition: DropPosition = isCurrentDropTarget ? dragState.dropTarget.position : null;

  const handleClick = () => {
    if (!dragState.draggedElementId) {
      actions.selectElement(element.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.deleteElement(element.id);
    if (isSelected) {
      actions.selectElement(null);
    }
  };

  const findParentId = (elementId: string, state: MotionDesignerState): string | null => {
    for (const element of Object.values(state.composition.elements)) {
      if (element.childIds.includes(elementId)) {
        return element.id;
      }
    }
    return null;
  };

  const calculateDropPosition = (
    clientY: number,
    elementRect: DOMRect,
  ): DropPosition => {
    const relativeY = clientY - elementRect.top;
    const elementHeight = elementRect.height;
    const threshold = elementHeight / 3;

    if (relativeY < threshold) {
      return "before";
    } else if (relativeY > elementHeight - threshold) {
      return "after";
    } else {
      return "inside";
    }
  };

  const canDropAt = (
    draggedElementId: string,
    targetElementId: string,
    position: DropPosition,
  ): boolean => {
    if (!position) return false;

    const draggedElement = state.composition.elements[draggedElementId];
    if (!draggedElement) return false;

    if (position === "inside") {
      const targetElement = state.composition.elements[targetElementId];
      if (!targetElement) return false;
      return behaviorRegistry.canMove(draggedElementId, targetElementId, undefined, state);
    } else {
      const targetElement = state.composition.elements[targetElementId];
      if (!targetElement) return false;

      const parentId = findParentId(targetElementId, state);
      const siblings = parentId
        ? state.composition.elements[parentId]?.childIds || []
        : state.composition.rootTimegroupIds;

      const targetIndex = siblings.indexOf(targetElementId);
      const newIndex = position === "before" ? targetIndex : targetIndex + 1;

      return behaviorRegistry.canMove(draggedElementId, parentId, newIndex, state);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const isDraggable = element.type !== "timegroup" || !isRoot;
    if (!isDraggable) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(element.id, { x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!dragState.draggedElementId || !dragState.dragPosition || !itemRef.current) {
      if (isCurrentDropTarget) {
        setDropTarget(null);
      }
      return;
    }

    if (dragState.draggedElementId === element.id) {
      return;
    }

    const elementRect = itemRef.current.getBoundingClientRect();
    const isOverElement =
      dragState.dragPosition.x >= elementRect.left &&
      dragState.dragPosition.x <= elementRect.right &&
      dragState.dragPosition.y >= elementRect.top &&
      dragState.dragPosition.y <= elementRect.bottom;

    if (isOverElement) {
      const position = calculateDropPosition(dragState.dragPosition.y, elementRect);

      if (position && canDropAt(dragState.draggedElementId, element.id, position)) {
        setDropTarget({
          elementId: element.id,
          position,
        });
      } else {
        if (isCurrentDropTarget) {
          setDropTarget(null);
        }
      }
    } else {
      if (isCurrentDropTarget) {
        setDropTarget(null);
      }
    }
  }, [dragState.dragPosition, dragState.draggedElementId, element.id, state, setDropTarget, isCurrentDropTarget]);

  const isDraggable = element.type !== "timegroup" || !isRoot;
  const IconComponent = getElementIcon(element.type);

  return (
    <div>
      {dropPosition === "before" && (
        <div 
          className="h-1.5 bg-blue-500 my-0.5 rounded-full shadow-lg" 
          style={{ marginLeft: `${depth * 16 + 8}px`, marginRight: "8px" }} 
        />
      )}
      <div
        ref={itemRef}
        onPointerDown={handlePointerDown}
        className={`group flex items-center gap-1 px-2 py-1 rounded transition-colors ${
          isDraggable ? "cursor-move" : "cursor-pointer"
        } ${
          isDragging
            ? "opacity-50 cursor-grabbing"
            : dropPosition === "inside"
              ? "bg-blue-500/40 border-2 border-blue-400"
              : isSelected
                ? "bg-blue-600"
                : isActiveRoot
                  ? "bg-gray-700"
                  : "hover:bg-gray-700"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-4 h-4 flex items-center justify-center"
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="text-xs">
          <IconComponent size={16} />
        </span>
        <span className="text-sm flex-1 truncate">
          {element.type === "timegroup" && isRoot
            ? "Root Timegroup"
            : element.type}
        </span>
        {!isDragging && (
          <button
            onClick={handleDelete}
            className={`w-4 h-4 flex items-center justify-center hover:bg-red-600 rounded transition-opacity ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            title="Delete element"
          >
            <span className="text-xs">×</span>
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {element.childIds.map((childId) => {
            const child = state.composition.elements[childId];
            if (!child) return null;
            return (
              <HierarchyItem
                key={childId}
                element={child}
                state={state}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
      {dropPosition === "after" && (
        <div 
          className="h-1.5 bg-blue-500 my-0.5 rounded-full shadow-lg" 
          style={{ marginLeft: `${depth * 16 + 8}px`, marginRight: "8px" }} 
        />
      )}
    </div>
  );
}
