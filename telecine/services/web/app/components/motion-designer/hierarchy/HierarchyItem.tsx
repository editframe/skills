import React, { useState, useRef, useEffect } from "react";
import { getElementIcon } from "~/lib/motion-designer/elementTypes";
import type { MotionDesignerState, ElementNode } from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { useDragContext } from "./DragContext";
import type { DropTarget } from "./dropTargetResolver";

interface HierarchyItemProps {
  element: ElementNode;
  state: MotionDesignerState;
  depth: number;
  dropTarget: DropTarget | null;
  registerElementRef: (elementId: string, element: HTMLDivElement, depth: number) => void;
  unregisterElementRef: (elementId: string) => void;
}

export function HierarchyItem({
  element,
  state,
  depth,
  dropTarget,
  registerElementRef,
  unregisterElementRef,
}: HierarchyItemProps) {
  const actions = useMotionDesignerActions();
  const { dragState, startDrag } = useDragContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const itemRef = useRef<HTMLDivElement>(null);
  const isSelected = state.ui.selectedElementId === element.id;
  const activeRootTimegroupId = getActiveRootTimegroupId(state);
  const isRoot = state.composition.rootTimegroupIds.includes(element.id);
  const isActiveRoot = activeRootTimegroupId === element.id && isRoot;
  const hasChildren = element.childIds && element.childIds.length > 0;

  const isDragging = dragState.draggedElementId === element.id;
  const isCurrentDropTarget = dropTarget?.elementId === element.id;
  const dropPosition = isCurrentDropTarget ? dropTarget.position : null;

  const handleClick = () => {
    if (!dragState.draggedElementId) {
      actions.selectElement(element.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    actions.deleteElement(element.id);
    if (isSelected) {
      actions.selectElement(null);
    }
  };

  const handleDeletePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  useEffect(() => {
    if (itemRef.current) {
      registerElementRef(element.id, itemRef.current, depth);
      return () => {
        unregisterElementRef(element.id);
      };
    }
  }, [element.id, depth, registerElementRef, unregisterElementRef]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const isDraggable = element.type !== "timegroup" || !isRoot;
    if (!isDraggable) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(element.id, { x: e.clientX, y: e.clientY });
  };


  const isDraggable = element.type !== "timegroup" || !isRoot;
  const IconComponent = getElementIcon(element.type);

  return (
    <div className="relative">
      <div
        ref={itemRef}
        onPointerDown={handlePointerDown}
        className={`group flex items-center gap-1 px-2 py-1 rounded transition-colors relative ${
          isDraggable ? "cursor-move" : "cursor-pointer"
        } ${
          isDragging
            ? "opacity-50 cursor-grabbing"
            : dropPosition === "inside"
              ? "bg-blue-500/30 border-l-4 border-blue-500"
              : isSelected
                ? "bg-blue-600"
                : isActiveRoot
                  ? "bg-gray-700"
                  : "hover:bg-gray-700"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {dropPosition === "before" && (
          <div className="absolute left-0 right-0 top-0 pointer-events-none z-10" style={{ transform: "translateY(-50%)" }}>
            <div className="relative mx-2">
              <div className="h-0.5 bg-blue-500 w-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full -ml-1.5" />
            </div>
          </div>
        )}
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
            onPointerDown={handleDeletePointerDown}
            className={`w-4 h-4 flex items-center justify-center hover:bg-red-600 rounded transition-opacity ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            title="Delete element"
          >
            <span className="text-xs">×</span>
          </button>
        )}
        {dropPosition === "after" && (
          <div className="absolute left-0 right-0 bottom-0 pointer-events-none z-10" style={{ transform: "translateY(50%)" }}>
            <div className="relative mx-2">
              <div className="h-0.5 bg-blue-500 w-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full -ml-1.5" />
            </div>
          </div>
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
                dropTarget={dropTarget}
                registerElementRef={registerElementRef}
                unregisterElementRef={unregisterElementRef}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
