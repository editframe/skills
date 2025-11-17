import React, { useState, useRef, useEffect } from "react";
import type { MotionDesignerState, ElementNode } from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { PlayLoopButton } from "../controls/PlayLoopButton";
import { PlayPauseButton } from "../controls/PlayPauseButton";
import { hasRotateAnimations, parseRotationFromTransform } from "../rendering/styleGenerators/rotationUtils";

interface CanvasRootTimegroupOverlayProps {
  element: ElementNode;
  state: MotionDesignerState;
  canvasScale: number;
}

export function CanvasRootTimegroupOverlay({
  element,
  state,
  canvasScale,
}: CanvasRootTimegroupOverlayProps) {
  const actions = useMotionDesignerActions();
  const activeRootTimegroupId = getActiveRootTimegroupId(state);
  const isActive = activeRootTimegroupId === element.id;
  const isSelected = state.ui.selectedElementId === element.id;
  const canvasPosition = element.props.canvasPosition || { x: 100, y: 100 };
  const duration = element.props.duration || "0s";
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState({});
  const hasDraggedRef = useRef(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dimensionsRef = useRef<{ width: number; height: number }>({ width: 400, height: 300 });

  // Force re-render on every animation frame to keep overlay in sync
  // Throttle updates to reduce jitter during zoom
  useEffect(() => {
    let rafId: number;
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE_MS = 16; // ~60fps max update rate
    
    const updateOverlay = (currentTime: number) => {
      // Throttle updates to reduce jitter during zoom
      if (currentTime - lastUpdateTime < UPDATE_THROTTLE_MS) {
        rafId = requestAnimationFrame(updateOverlay);
        return;
      }
      lastUpdateTime = currentTime;
      
      // Find the wrapper div first
      const wrapperElement = document.querySelector(`[data-timegroup-id="${element.id}"]`) as HTMLElement;
      if (wrapperElement) {
        // Then find the actual ef-timegroup element inside it
        const timegroupElement = wrapperElement.querySelector(`ef-timegroup#${element.id}`) as HTMLElement;
        const measureElement = timegroupElement || wrapperElement;
        
        // Use offsetWidth/offsetHeight which gives us the intrinsic size
        const width = measureElement.offsetWidth;
        const height = measureElement.offsetHeight;
        
        // Only force update if dimensions actually changed (larger threshold to reduce jitter)
        if (width > 0 && height > 0) {
          if (Math.abs(dimensionsRef.current.width - width) > 1 || 
              Math.abs(dimensionsRef.current.height - height) > 1) {
            dimensionsRef.current = { width, height };
            forceUpdate({});
          }
        }
      }
      
      rafId = requestAnimationFrame(updateOverlay);
    };
    
    rafId = requestAnimationFrame(updateOverlay);
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [element.id, canvasScale]);

  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    dragStartPositionRef.current = { x: canvasPosition.x, y: canvasPosition.y };
    hasDraggedRef.current = false;
    actions.selectElement(element.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragStart && dragStartPositionRef.current) {
      e.stopPropagation();
      // Calculate cumulative delta from drag start
      const screenDeltaX = e.clientX - dragStart.x;
      const screenDeltaY = e.clientY - dragStart.y;
      const canvasDeltaX = screenDeltaX / canvasScale;
      const canvasDeltaY = screenDeltaY / canvasScale;
      if (Math.abs(screenDeltaX) > 2 || Math.abs(screenDeltaY) > 2) {
        hasDraggedRef.current = true;
      }
      
      // Update position relative to drag start position (cumulative delta)
      const newX = dragStartPositionRef.current.x + canvasDeltaX;
      const newY = dragStartPositionRef.current.y + canvasDeltaY;
      actions.updateElement(element.id, {
        canvasPosition: { x: newX, y: newY },
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      e.stopPropagation();
      setIsDragging(false);
      setDragStart(null);
      hasDraggedRef.current = false;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Only handle click if we didn't drag
    if (!hasDraggedRef.current) {
      if (state.ui.placementMode && isActive) {
        // Don't allow placing timegroups inside timegroups
        if (state.ui.placementMode === "timegroup") {
          console.warn("Cannot place nested timegroups. Timegroups must be at root level.");
          actions.setPlacementMode(null);
          return;
        }
        
        // Create element at click position
        actions.addElement(
          {
            type: state.ui.placementMode as ElementNode["type"],
            parentId: element.id,
            childIds: [],
            props: {},
            animations: [],
          },
          element.id,
        );
      }
    }
    hasDraggedRef.current = false;
  };

  // Handle global mouse events for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragStart && dragStartPositionRef.current) {
        // Calculate cumulative delta from drag start
        const screenDeltaX = e.clientX - dragStart.x;
        const screenDeltaY = e.clientY - dragStart.y;
        const canvasDeltaX = screenDeltaX / canvasScale;
        const canvasDeltaY = screenDeltaY / canvasScale;
        if (Math.abs(screenDeltaX) > 2 || Math.abs(screenDeltaY) > 2) {
          hasDraggedRef.current = true;
        }
        
        // Update position relative to drag start position (cumulative delta)
        const newX = dragStartPositionRef.current.x + canvasDeltaX;
        const newY = dragStartPositionRef.current.y + canvasDeltaY;
        actions.updateElement(element.id, {
          canvasPosition: { x: newX, y: newY },
        });
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      setDragStart(null);
      dragStartPositionRef.current = null;
      hasDraggedRef.current = false;
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, canvasScale, actions, element.id]);

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Use element props as source of truth
    const currentSize = element.props?.size || { width: 960, height: 540 };
    const currentPosition = element.props?.canvasPosition || { x: 100, y: 100 };
    // Use computed rotation from DOM when rotate animations are active, otherwise use design property
    const hasRotateAnims = hasRotateAnimations(element);
    let currentRotation = element.props?.rotation || 0;
    if (hasRotateAnims) {
      const contentElement = document.querySelector(
        `[data-element-id="${element.id}"]`,
      ) as HTMLElement;
      if (contentElement) {
        const computedStyle = window.getComputedStyle(contentElement);
        const transform = computedStyle.transform;
        const computedRot = parseRotationFromTransform(transform);
        if (computedRot !== 0) {
          currentRotation = computedRot;
        }
      }
    }
    const rotationRadians = (currentRotation * Math.PI) / 180;
    
    // Get opposite corner (the one that should stay fixed)
    const oppositeCorner = getOppositeCorner(handle);
    
    // Calculate initial opposite corner position in canvas coordinates
    const initialOppositeCorner = getCornerPoint(
      currentPosition.x,
      currentPosition.y,
      currentSize.width,
      currentSize.height,
      rotationRadians,
      oppositeCorner.x,
      oppositeCorner.y,
    );
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = currentSize.width;
    const startHeight = currentSize.height;
    const startCanvasX = currentPosition.x;
    const startCanvasY = currentPosition.y;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const deltaX = (e.clientX - startX) / canvasScale;
      const deltaY = (e.clientY - startY) / canvasScale;

      // Rotate the delta vector by negative rotation to convert screen movement to local coordinates
      // This compensates for the element's rotation when resizing
      const cos = Math.cos(-rotationRadians);
      const sin = Math.sin(-rotationRadians);
      const rotatedDeltaX = cos * deltaX - sin * deltaY;
      const rotatedDeltaY = sin * deltaX + cos * deltaY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      // Handle different resize directions with rotated delta
      if (handle.includes("e")) newWidth = startWidth + rotatedDeltaX;
      if (handle.includes("w")) newWidth = startWidth - rotatedDeltaX;
      if (handle.includes("s")) newHeight = startHeight + rotatedDeltaY;
      if (handle.includes("n")) newHeight = startHeight - rotatedDeltaY;

      // Minimum size
      const minSize = 50;
      const constrainedWidth = Math.max(minSize, newWidth);
      const constrainedHeight = Math.max(minSize, newHeight);

      // Calculate new opposite corner position with new size
      const newOppositeCorner = getCornerPoint(
        startCanvasX,
        startCanvasY,
        constrainedWidth,
        constrainedHeight,
        rotationRadians,
        oppositeCorner.x,
        oppositeCorner.y,
      );

      // Adjust position to keep opposite corner fixed
      const offsetX = initialOppositeCorner.x - newOppositeCorner.x;
      const offsetY = initialOppositeCorner.y - newOppositeCorner.y;

      const finalX = startCanvasX + offsetX;
      const finalY = startCanvasY + offsetY;

      // Update element directly - one-way data flow
      actions.updateElement(element.id, {
        size: { width: Math.round(constrainedWidth), height: Math.round(constrainedHeight) },
        canvasPosition: { x: Math.round(finalX), y: Math.round(finalY) },
      });
    };

    const handleGlobalMouseUp = () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);
  };

  // Helper function to get opposite corner
  function getOppositeCorner(handle: string): { x: number; y: number } {
    switch (handle) {
      case "nw": return { x: 1, y: 1 }; // se corner
      case "n": return { x: 0.5, y: 1 }; // s corner
      case "ne": return { x: 0, y: 1 }; // sw corner
      case "e": return { x: 0, y: 0.5 }; // w corner
      case "se": return { x: 0, y: 0 }; // nw corner
      case "s": return { x: 0.5, y: 0 }; // n corner
      case "sw": return { x: 1, y: 0 }; // ne corner
      case "w": return { x: 1, y: 0.5 }; // e corner
      default: return { x: 0.5, y: 0.5 };
    }
  }

  // Helper function to rotate a point around a center
  function rotatePoint(
    cx: number,
    cy: number,
    x: number,
    y: number,
    radians: number,
  ): { x: number; y: number } {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nx = cos * (x - cx) - sin * (y - cy) + cx;
    const ny = sin * (x - cx) + cos * (y - cy) + cy;
    return { x: nx, y: ny };
  }

  // Helper function to calculate corner point in canvas coordinates for a rotated element
  function getCornerPoint(
    x: number,
    y: number,
    width: number,
    height: number,
    rotationRadians: number,
    xMagnitude: number,
    yMagnitude: number,
  ): { x: number; y: number } {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const localCornerX = x + xMagnitude * width;
    const localCornerY = y + yMagnitude * height;
    return rotatePoint(centerX, centerY, localCornerX, localCornerY, rotationRadians);
  }

  // Overlay must be positioned and sized in screen coordinates
  // Since overlay parent only translates (no scale), we must apply scale here
  // Use element props as source of truth, fallback to measured dimensions
  const elementSize = element.props?.size || dimensionsRef.current;
  const screenX = canvasPosition.x * canvasScale;
  const screenY = canvasPosition.y * canvasScale;
  const screenWidth = elementSize.width * canvasScale;
  const screenHeight = elementSize.height * canvasScale;

  const resizeHandles = [
    { position: "nw", cursor: "nwse-resize", style: { top: -4, left: -4 } },
    { position: "n", cursor: "ns-resize", style: { top: -4, left: "50%", transform: "translateX(-50%)" } },
    { position: "ne", cursor: "nesw-resize", style: { top: -4, right: -4 } },
    { position: "e", cursor: "ew-resize", style: { top: "50%", right: -4, transform: "translateY(-50%)" } },
    { position: "se", cursor: "nwse-resize", style: { bottom: -4, right: -4 } },
    { position: "s", cursor: "ns-resize", style: { bottom: -4, left: "50%", transform: "translateX(-50%)" } },
    { position: "sw", cursor: "nesw-resize", style: { bottom: -4, left: -4 } },
    { position: "w", cursor: "ew-resize", style: { top: "50%", left: -4, transform: "translateY(-50%)" } },
  ];

  return (
    <div
      ref={contentRef}
      className="absolute"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
        border: "1px solid",
        borderColor: isActive ? "rgb(59, 130, 246)" : isSelected ? "rgb(96, 165, 250)" : "rgb(75, 85, 99)",
        pointerEvents: "auto",
        userSelect: "none",
        cursor: isDragging ? "grabbing" : "move",
        zIndex: 5, // Lower than child element handles (zIndex 10)
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {isActive && (
        <div className="absolute bottom-full mb-1 left-0 flex items-center gap-2 text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded z-10 pointer-events-auto">
          <PlayPauseButton
            targetId={element.id}
            playButtonClassName="w-4 h-4 flex items-center justify-center hover:text-white"
            pauseButtonClassName="w-4 h-4 flex items-center justify-center hover:text-white"
            iconSize={12}
          />
          <PlayLoopButton
            targetId={element.id}
            className="w-4 h-4 flex items-center justify-center rounded transition-colors hover:text-white"
            activeClassName="bg-blue-500/20 text-blue-400 border border-blue-500/50"
            iconSize={12}
          />
          <span>
            Timegroup · {duration} · {Math.round(elementSize.width)}×{Math.round(elementSize.height)}
          </span>
        </div>
      )}
      
      {(isActive || isSelected) && resizeHandles.map((handle) => (
        <div
          key={handle.position}
          className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm z-10"
          style={{
            ...handle.style,
            cursor: handle.cursor,
            pointerEvents: "auto",
          }}
          onMouseDown={(e) => handleResizeStart(e, handle.position)}
        />
      ))}
    </div>
  );
}
