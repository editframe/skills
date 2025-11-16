import React, { createContext, useContext, useState, useCallback, useRef } from "react";

interface DropTarget {
  elementId: string;
  position: "before" | "after" | "inside";
}

interface DragState {
  draggedElementId: string | null;
  dragPosition: { x: number; y: number } | null;
  dropTarget: DropTarget | null;
}

interface DragContextValue {
  dragState: DragState;
  startDrag: (elementId: string, position: { x: number; y: number }) => void;
  updateDrag: (position: { x: number; y: number }) => void;
  setDropTarget: (target: DropTarget | null) => void;
  endDrag: () => void;
  performDrop: () => { elementId: string; parentId: string | null; index: number | undefined } | null;
}

const DragContext = createContext<DragContextValue | null>(null);

export function DragProvider({ children }: { children: React.ReactNode }) {
  const [dragState, setDragState] = useState<DragState>({
    draggedElementId: null,
    dragPosition: null,
    dropTarget: null,
  });
  const dropExecutedRef = useRef(false);

  const startDrag = useCallback((elementId: string, position: { x: number; y: number }) => {
    dropExecutedRef.current = false;
    setDragState({
      draggedElementId: elementId,
      dragPosition: position,
      dropTarget: null,
    });
  }, []);

  const updateDrag = useCallback((position: { x: number; y: number }) => {
    setDragState((prev: DragState) => {
      if (!prev.draggedElementId) return prev;
      return {
        ...prev,
        dragPosition: position,
      };
    });
  }, []);

  const setDropTarget = useCallback((target: DropTarget | null) => {
    setDragState((prev: DragState) => {
      if (!prev.draggedElementId) return prev;
      return {
        ...prev,
        dropTarget: target,
      };
    });
  }, []);

  const performDrop = useCallback((): { elementId: string; parentId: string | null; index: number | undefined } | null => {
    if (dropExecutedRef.current || !dragState.draggedElementId || !dragState.dropTarget) {
      return null;
    }

    dropExecutedRef.current = true;
    return {
      elementId: dragState.draggedElementId,
      parentId: dragState.dropTarget.elementId === "__root__" ? null : dragState.dropTarget.elementId,
      index: dragState.dropTarget.position === "inside" ? undefined : undefined,
    };
  }, [dragState]);

  const endDrag = useCallback(() => {
    dropExecutedRef.current = false;
    setDragState({
      draggedElementId: null,
      dragPosition: null,
      dropTarget: null,
    });
  }, []);

  return (
    <DragContext.Provider
      value={{
        dragState,
        startDrag,
        updateDrag,
        setDropTarget,
        endDrag,
        performDrop,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}

export function useDragContext(): DragContextValue {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDragContext must be used within DragProvider");
  }
  return context;
}
