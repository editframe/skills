import React, { useState, useRef, useEffect } from "react";
import { SneakerMove, CaretDown, CaretRight } from "@phosphor-icons/react";
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
  highlightedElementId?: string | null;
  onHighlightChange?: (elementId: string | null) => void;
  hoveredElementId?: string | null;
  onHoverChange?: (elementId: string | null) => void;
}

function extractFilename(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();
    return filename || null;
  } catch {
    const parts = url.split("/");
    const filename = parts[parts.length - 1];
    return filename || null;
  }
}

function getTargetElementName(targetId: string | undefined, state: MotionDesignerState): string | null {
  if (!targetId) return null;
  const targetElement = state.composition.elements[targetId];
  if (!targetElement) return null;
  
  if (targetElement.type === "text") {
    return targetElement.props.content || targetId;
  }
  
  return targetElement.props.name || targetId;
}

function isDescendantOf(elementId: string, ancestorId: string, state: MotionDesignerState): boolean {
  if (elementId === ancestorId) return false;
  
  const ancestor = state.composition.elements[ancestorId];
  if (!ancestor) return false;
  
  for (const childId of ancestor.childIds) {
    if (childId === elementId) return true;
    if (isDescendantOf(elementId, childId, state)) return true;
  }
  
  return false;
}

export function HierarchyItem({
  element,
  state,
  depth,
  dropTarget,
  registerElementRef,
  unregisterElementRef,
  highlightedElementId,
  onHighlightChange,
  hoveredElementId,
  onHoverChange,
}: HierarchyItemProps) {
  const actions = useMotionDesignerActions();
  const { dragState, startDrag } = useDragContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const isSelected = state.ui.selectedElementId === element.id;
  const activeRootTimegroupId = getActiveRootTimegroupId(state);
  const isRoot = state.composition.rootTimegroupIds.includes(element.id);
  const isActiveRoot = activeRootTimegroupId === element.id && isRoot;
  const hasChildren = element.childIds && element.childIds.length > 0;
  const hasAnimations = element.animations.length > 0;
  const isHighlighted = highlightedElementId === element.id;
  const isHovered = hoveredElementId === element.id;
  const isChildOfHovered = hoveredElementId && hoveredElementId !== element.id && isDescendantOf(hoveredElementId, element.id, state);

  const isDragging = dragState.draggedElementId === element.id;
  const isCurrentDropTarget = dropTarget?.elementId === element.id;
  const dropPosition = isCurrentDropTarget ? dropTarget.position : null;

  const handleClick = () => {
    if (!dragState.draggedElementId && !isRenaming) {
      // Toggle selection: if already selected, deselect; otherwise select
      if (isSelected) {
        actions.selectElement(null);
      } else {
        actions.selectElement(element.id);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (element.type === "text") return;
    if (dragState.draggedElementId) return;
    e.stopPropagation();
    setIsRenaming(true);
    const mediaFilename = (element.type === "video" || element.type === "image" || element.type === "audio") 
      ? extractFilename(element.props.src) 
      : null;
    const currentName = element.props.name || mediaFilename || (element.type === "timegroup" && isRoot ? "Root Timegroup" : element.type);
    setRenameValue(currentName);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      saveRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelRename();
    }
  };

  const handleRenameBlur = () => {
    saveRename();
  };

  const saveRename = () => {
    if (renameValue.trim() !== "") {
      actions.updateElement(element.id, { name: renameValue.trim() });
    }
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setRenameValue("");
  };

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

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
    if (isRenaming) return;
    e.stopPropagation();

    const isDraggable = element.type !== "timegroup" || !isRoot;
    if (!isDraggable) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(element.id, { x: e.clientX, y: e.clientY });
  };

  const handleMouseEnter = () => {
    if (element.props.target && onHighlightChange) {
      onHighlightChange(element.props.target);
    }
    if (onHoverChange) {
      onHoverChange(element.id);
    }
  };

  const handleMouseLeave = () => {
    if (element.props.target && onHighlightChange) {
      onHighlightChange(null);
    }
    if (onHoverChange) {
      onHoverChange(null);
    }
  };


  const isDraggable = element.type !== "timegroup" || !isRoot;
  const IconComponent = getElementIcon(element.type);

  const getDisplayName = () => {
    if (element.type === "text") {
      return element.props.content || "text";
    }
    
    const mediaFilename = (element.type === "video" || element.type === "image" || element.type === "audio") 
      ? extractFilename(element.props.src) 
      : null;
    
    if (mediaFilename) {
      return mediaFilename;
    }
    
    if (element.props.name) {
      return element.props.name;
    }
    if (element.type === "timegroup" && isRoot) {
      return "Root Timegroup";
    }
    return element.type;
  };

  const displayName = getDisplayName();
  const mediaFilename = (element.type === "video" || element.type === "image" || element.type === "audio") 
    ? extractFilename(element.props.src) 
    : null;
  const targetName = (element.type === "waveform" || element.type === "captions" || element.type === "surface")
    ? getTargetElementName(element.props.target, state)
    : null;

  const indentPerLevel = 10;
  const baseIndent = 8;
  const totalIndent = depth * indentPerLevel + baseIndent;

  return (
    <div className="relative">
      <div
        ref={itemRef}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group flex items-center gap-1 px-2 py-1 rounded transition-colors relative ${
          isDraggable ? "cursor-move" : "cursor-pointer"
        } ${
          isDragging
            ? "opacity-50 cursor-grabbing"
            : isHighlighted
              ? "bg-blue-500/20 border-l-2 border-blue-400"
              : dropPosition === "inside"
                ? "bg-blue-500/30 border-l-4 border-blue-500"
                : isSelected
                  ? "bg-blue-600"
                  : isHovered || isChildOfHovered
                    ? "bg-gray-700/50"
                    : isActiveRoot
                      ? "bg-gray-700"
                      : "hover:bg-gray-700"
        }`}
        style={{ paddingLeft: `${totalIndent}px` }}
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
            className="w-3 h-3 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
          >
            {isExpanded ? (
              <CaretDown size={10} weight="fill" />
            ) : (
              <CaretRight size={10} weight="fill" />
            )}
          </button>
        )}
        {!hasChildren && <span className="w-3" />}
        <span className="text-xs">
          <IconComponent size={16} />
        </span>
        {hasAnimations && (
          <span className="text-xs text-yellow-400/70" title={`${element.animations.length} animation${element.animations.length > 1 ? "s" : ""}`}>
            <SneakerMove size={12} weight="fill" />
          </span>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameBlur}
              onClick={(e) => e.stopPropagation()}
              className="text-sm bg-gray-600 text-white px-1 rounded border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ width: "100%" }}
            />
          ) : (
            <>
              <span className="text-sm truncate">{displayName}</span>
              {targetName && (
                <span className="text-xs text-gray-400 truncate">
                  → {targetName}
                </span>
              )}
            </>
          )}
        </div>
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
                highlightedElementId={highlightedElementId}
                onHighlightChange={onHighlightChange}
                hoveredElementId={hoveredElementId}
                onHoverChange={onHoverChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
