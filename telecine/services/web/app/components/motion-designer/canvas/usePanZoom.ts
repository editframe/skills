import { useRef, useCallback } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface UsePanZoomReturn {
  transform: Transform;
  containerRef: React.RefObject<HTMLDivElement>;
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onWheel: (e: WheelEvent) => void;
  };
}

export function usePanZoom(
  initialTransform: MotionDesignerState["ui"]["canvasTransform"],
  onUpdate: (transform: Partial<Transform>) => void
): UsePanZoomReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartTransformRef = useRef<Transform | null>(null);

  const updateTransform = useCallback(
    (updates: Partial<Transform>) => {
      onUpdate(updates);
    },
    [onUpdate]
  );

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only handle left mouse button
    isDraggingRef.current = true;
    dragStartMousePosRef.current = { x: e.clientX, y: e.clientY };
    // Store the transform at drag start
    dragStartTransformRef.current = {
      x: initialTransform.x,
      y: initialTransform.y,
      scale: initialTransform.scale,
    };
  }, [initialTransform.x, initialTransform.y, initialTransform.scale]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current || !dragStartMousePosRef.current || !dragStartTransformRef.current) return;

      // Calculate cumulative delta from drag start
      const deltaX = e.clientX - dragStartMousePosRef.current.x;
      const deltaY = e.clientY - dragStartMousePosRef.current.y;

      // Invert delta: dragging right should move canvas left (show content to left)
      // This matches typical pan behavior where dragging moves the viewport
      updateTransform({
        x: dragStartTransformRef.current.x - deltaX,
        y: dragStartTransformRef.current.y - deltaY,
      });
    },
    [updateTransform]
  );

  const onMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartMousePosRef.current = null;
    dragStartTransformRef.current = null;
  }, []);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      
      const container = containerRef.current;
      if (!container) return;
      
      // Check for modifier key (Cmd on Mac, Ctrl on Windows/Linux)
      const isZoom = e.metaKey || e.ctrlKey;
      
      if (isZoom) {
        // Zoom mode: zoom centered on mouse position
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const currentX = initialTransform.x;
        const currentY = initialTransform.y;
        const currentScale = initialTransform.scale;
        
        // Calculate mouse position in canvas coordinates before zoom
        const canvasX = (mouseX - currentX) / currentScale;
        const canvasY = (mouseY - currentY) / currentScale;
        
        // Calculate new scale - use smaller delta for smoother zooming
        // 0.95/1.05 gives 5% change per step, which is more reasonable
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const newScale = Math.max(0.1, Math.min(5, currentScale * delta));
        
        // Calculate new translate to keep mouse point fixed in canvas space
        // This is the correct formula: newX = mouseX - canvasX * newScale
        const newX = mouseX - canvasX * newScale;
        const newY = mouseY - canvasY * newScale;
        
        updateTransform({
          x: newX,
          y: newY,
          scale: newScale,
        });
      } else {
        // Pan mode: translate canvas based on wheel delta
        // Invert delta: scrolling right should move canvas left (show content to left)
        const deltaX = -e.deltaX;
        const deltaY = -e.deltaY;
        
        updateTransform({
          x: initialTransform.x + deltaX,
          y: initialTransform.y + deltaY,
        });
      }
    },
    [updateTransform, initialTransform]
  );

  // Return current transform from state (always up-to-date)
  return {
    transform: {
      x: initialTransform.x,
      y: initialTransform.y,
      scale: initialTransform.scale,
    },
    containerRef,
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onWheel,
    },
  };
}

