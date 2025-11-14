import { useState, useRef } from "react";
import { getElementIcon } from "~/lib/motion-designer/elementTypes";
import type { MotionDesignerState, ElementNode } from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";

interface HierarchyItemProps {
  element: ElementNode;
  state: MotionDesignerState;
  depth: number;
}

export function HierarchyItem({
  element,
  state,
  depth,
}: HierarchyItemProps) {
  const actions = useMotionDesignerActions();
  const [isExpanded, setIsExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const dragOverTimeoutRef = useRef<number | null>(null);
  const isSelected = state.ui.selectedElementId === element.id;
  const activeRootTimegroupId = getActiveRootTimegroupId(state);
  const isRoot = state.composition.rootTimegroupIds.includes(element.id);
  const isActiveRoot = activeRootTimegroupId === element.id && isRoot;

  const handleClick = () => {
    actions.selectElement(element.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.deleteElement(element.id);
    if (isSelected) {
      actions.selectElement(null);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", element.id);
    e.dataTransfer.setData("application/element-type", element.type);
  };

  const isDescendant = (ancestorId: string, descendantId: string): boolean => {
    const ancestor = state.composition.elements[ancestorId];
    if (!ancestor) return false;
    
    if (ancestor.childIds.includes(descendantId)) return true;
    
    for (const childId of ancestor.childIds) {
      if (isDescendant(childId, descendantId)) return true;
    }
    
    return false;
  };


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedElementId = e.dataTransfer.getData("text/plain");
    const draggedElement = state.composition.elements[draggedElementId];
    
    if (!draggedElement) {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    
    const canDrop = 
      draggedElementId !== element.id &&
      !isDescendant(draggedElementId, element.id) &&
      draggedElement.type !== "timegroup" &&
      element.type === "timegroup" &&
      isRoot;
    
    if (canDrop) {
      e.dataTransfer.dropEffect = "move";
      setDragOver(true);
      
      if (dragOverTimeoutRef.current) {
        clearTimeout(dragOverTimeoutRef.current);
      }
      
      dragOverTimeoutRef.current = window.setTimeout(() => {
        if (!isExpanded && hasChildren) {
          setIsExpanded(true);
        }
      }, 500);
    } else {
      e.dataTransfer.dropEffect = "none";
      setDragOver(false);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOver(false);
    if (dragOverTimeoutRef.current) {
      clearTimeout(dragOverTimeoutRef.current);
      dragOverTimeoutRef.current = null;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    if (dragOverTimeoutRef.current) {
      clearTimeout(dragOverTimeoutRef.current);
      dragOverTimeoutRef.current = null;
    }
    
    const draggedElementId = e.dataTransfer.getData("text/plain");
    const draggedElement = state.composition.elements[draggedElementId];
    
    if (!draggedElement) return;
    
    const canDrop = 
      draggedElementId !== element.id &&
      !isDescendant(draggedElementId, element.id) &&
      draggedElement.type !== "timegroup" &&
      element.type === "timegroup" &&
      isRoot;
    
    if (canDrop) {
      actions.moveElement(draggedElementId, element.id);
    }
  };

  const hasChildren = element.childIds && element.childIds.length > 0;
  const canDelete = true;
  const IconComponent = getElementIcon(element.type);
  
  const isDraggable = element.type !== "timegroup" || !isRoot;

  return (
    <div>
      <div
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group flex items-center gap-1 px-2 py-1 rounded ${
          isDraggable ? "cursor-move" : "cursor-pointer"
        } ${
          dragOver
            ? "bg-blue-500 border-2 border-blue-300"
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
        {canDelete && (
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
    </div>
  );
}
