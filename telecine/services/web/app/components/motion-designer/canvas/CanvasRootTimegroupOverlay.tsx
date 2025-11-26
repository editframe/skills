import React, { useState, useRef, useEffect } from "react";
import type {
  MotionDesignerState,
  ElementNode,
} from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import {
  createDefaultSize,
  createDefaultSizeForFlexChild,
} from "~/lib/motion-designer/defaultSizes";
import {
  getSizeDimensions,
  convertToFixedSize,
} from "~/lib/motion-designer/sizingUtils";
import {
  normalizeSize,
  isLegacySize,
  type ElementSize,
} from "~/lib/motion-designer/sizingTypes";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { PlayLoopButton } from "../controls/PlayLoopButton";
import { PlayPauseButton } from "../controls/PlayPauseButton";
import { OverlayItem } from "@editframe/react";
import { hasRotateAnimations } from "../rendering/styleGenerators/rotationUtils";
import { parseRotationFromTransform } from "../rendering/styleGenerators/rotationUtils";

/**
 * Formats duration in milliseconds to human-readable string
 * - If >= 1000ms: format as seconds with 1 decimal (e.g., "5.0s", "1.5s")
 * - If < 1000ms: format as milliseconds (e.g., "500ms")
 */
function formatDuration(durationMs: number): string {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }
  return `${Math.round(durationMs)}ms`;
}

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const hasDraggedRef = useRef(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dimensionsRef = useRef<{ width: number; height: number }>({
    width: 400,
    height: 300,
  });
  const [durationMs, setDurationMs] = useState(0);
  const durationRef = useRef(0);

  // Update dimensions ref when element changes
  useEffect(() => {
    const wrapperElement = document.querySelector(
      `[data-timegroup-id="${element.id}"]`,
    ) as HTMLElement;
    if (wrapperElement) {
      const timegroupElement = wrapperElement.querySelector(
        `ef-timegroup#${element.id}`,
      ) as any;
      const measureElement = timegroupElement || wrapperElement;
      const width = measureElement.offsetWidth;
      const height = measureElement.offsetHeight;
      if (width > 0 && height > 0) {
        dimensionsRef.current = { width, height };
      }
    }
  }, [element.id, element.props.size]);

  // Read duration from DOM element
  useEffect(() => {
    let rafId: number;
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE_MS = 16; // ~60fps max update rate

    const updateDuration = (currentTime: number) => {
      if (currentTime - lastUpdateTime < UPDATE_THROTTLE_MS) {
        rafId = requestAnimationFrame(updateDuration);
        return;
      }
      lastUpdateTime = currentTime;

      const wrapperElement = document.querySelector(
        `[data-timegroup-id="${element.id}"]`,
      ) as HTMLElement;
      if (wrapperElement) {
        const timegroupElement = wrapperElement.querySelector(
          `ef-timegroup#${element.id}`,
        ) as any;
        if (
          timegroupElement &&
          typeof timegroupElement.durationMs === "number"
        ) {
          const newDurationMs = timegroupElement.durationMs;
          if (Math.abs(newDurationMs - durationRef.current) > 1) {
            durationRef.current = newDurationMs;
            setDurationMs(newDurationMs);
          }
        }
      }

      rafId = requestAnimationFrame(updateDuration);
    };

    rafId = requestAnimationFrame(updateDuration);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [element.id]);

  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const wasSelectedAtMouseDownRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    dragStartPositionRef.current = { x: canvasPosition.x, y: canvasPosition.y };
    hasDraggedRef.current = false;
    // Track if element was already selected before this mousedown
    wasSelectedAtMouseDownRef.current = isSelected;
    // Only select if not already selected
    if (!isSelected) {
      actions.selectElement(element.id);
    }
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
    // Reset the ref after mouseup
    wasSelectedAtMouseDownRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Only handle click if we didn't drag
    if (!hasDraggedRef.current) {
      // If it was already selected before mousedown and not in placement mode, deselect
      if (wasSelectedAtMouseDownRef.current && !state.ui.placementMode) {
        actions.selectElement(null);
        hasDraggedRef.current = false;
        return;
      }

      if (state.ui.placementMode && isActive) {
        // Don't allow placing timegroups inside timegroups
        if (state.ui.placementMode === "timegroup") {
          console.warn(
            "Cannot place nested timegroups. Timegroups must be at root level.",
          );
          actions.setPlacementMode(null);
          return;
        }

        // Create element at click position
        const elementType = state.ui.placementMode as ElementNode["type"];
        const isParentFlex = element.props.display === "flex";

        const defaultProps: any = {};
        if (isParentFlex) {
          defaultProps.size = createDefaultSizeForFlexChild(elementType);
        } else {
          if (elementType === "image" || elementType === "video") {
            defaultProps.size = createDefaultSize(elementType, 400, 300);
          } else if (elementType === "text") {
            defaultProps.size = createDefaultSize("text", 0, 0);
          } else {
            defaultProps.size = createDefaultSize(elementType, 200, 100);
          }
        }

        if (elementType === "captions") {
          defaultProps.showBefore = true;
          defaultProps.showAfter = true;
          defaultProps.showActive = true;
          defaultProps.showSegment = true;
        } else if (elementType === "waveform") {
          defaultProps.mode = "bars";
        }

        actions.addElement(
          {
            type: elementType,
            parentId: element.id,
            childIds: [],
            props: defaultProps,
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

    // Get current dimensions (handles both legacy and new format)
    const sizeDimensions = getSizeDimensions(element.props?.size);
    const currentWidth = sizeDimensions.width || 960;
    const currentHeight = sizeDimensions.height || 540;

    // Convert to fixed mode if currently in hug/fill mode (resize converts to fixed)
    const fixedSize = convertToFixedSize(
      element.props?.size,
      currentWidth,
      currentHeight,
    );

    const currentSize = {
      width: fixedSize.widthValue,
      height: fixedSize.heightValue,
    };
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
      // Determine which dimensions are being resized based on the handle
      const isResizingWidth = handle.includes("e") || handle.includes("w");
      const isResizingHeight = handle.includes("n") || handle.includes("s");

      // Get current sizing modes to preserve non-resized dimensions
      const normalizedSize = normalizeSize(element.props?.size);
      const currentWidthMode = normalizedSize?.widthMode || "fixed";
      const currentHeightMode = normalizedSize?.heightMode || "fixed";

      // Only convert resized dimensions to fixed, preserve others
      actions.updateElement(element.id, {
        size: {
          widthMode: isResizingWidth ? "fixed" : currentWidthMode,
          widthValue: Math.round(constrainedWidth),
          heightMode: isResizingHeight ? "fixed" : currentHeightMode,
          heightValue: Math.round(constrainedHeight),
        },
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
      case "nw":
        return { x: 1, y: 1 }; // se corner
      case "n":
        return { x: 0.5, y: 1 }; // s corner
      case "ne":
        return { x: 0, y: 1 }; // sw corner
      case "e":
        return { x: 0, y: 0.5 }; // w corner
      case "se":
        return { x: 0, y: 0 }; // nw corner
      case "s":
        return { x: 0.5, y: 0 }; // n corner
      case "sw":
        return { x: 1, y: 0 }; // ne corner
      case "w":
        return { x: 1, y: 0.5 }; // e corner
      default:
        return { x: 0.5, y: 0.5 };
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
    return rotatePoint(
      centerX,
      centerY,
      localCornerX,
      localCornerY,
      rotationRadians,
    );
  }

  const elementWidth = dimensionsRef.current.width;
  const elementHeight = dimensionsRef.current.height;

  // Determine which resize handles should be visible based on sizing mode
  const normalizedSize = normalizeSize(element.props?.size);
  const canResizeWidth =
    !normalizedSize ||
    isLegacySize(normalizedSize) ||
    normalizedSize.widthMode === "fixed";
  const canResizeHeight =
    !normalizedSize ||
    isLegacySize(normalizedSize) ||
    normalizedSize.heightMode === "fixed";

  const resizeHandles = [
    {
      position: "nw" as const,
      cursor: "nwse-resize",
      style: { top: -4, left: -4 },
      visible: canResizeWidth && canResizeHeight,
    },
    {
      position: "n" as const,
      cursor: "ns-resize",
      style: { top: -4, left: "50%", transform: "translateX(-50%)" },
      visible: canResizeHeight,
    },
    {
      position: "ne" as const,
      cursor: "nesw-resize",
      style: { top: -4, right: -4 },
      visible: canResizeWidth && canResizeHeight,
    },
    {
      position: "e" as const,
      cursor: "ew-resize",
      style: { top: "50%", right: -4, transform: "translateY(-50%)" },
      visible: canResizeWidth,
    },
    {
      position: "se" as const,
      cursor: "nwse-resize",
      style: { bottom: -4, right: -4 },
      visible: canResizeWidth && canResizeHeight,
    },
    {
      position: "s" as const,
      cursor: "ns-resize",
      style: { bottom: -4, left: "50%", transform: "translateX(-50%)" },
      visible: canResizeHeight,
    },
    {
      position: "sw" as const,
      cursor: "nesw-resize",
      style: { bottom: -4, left: -4 },
      visible: canResizeWidth && canResizeHeight,
    },
    {
      position: "w" as const,
      cursor: "ew-resize",
      style: { top: "50%", left: -4, transform: "translateY(-50%)" },
      visible: canResizeWidth,
    },
  ];

  return (
    <OverlayItem
      elementId={element.id}
      style={{
        pointerEvents: "auto",
      }}
    >
      <div
        ref={contentRef}
        className="w-full h-full"
        style={{
          border: "1px solid",
          borderColor: isActive
            ? "rgb(59, 130, 246)"
            : isSelected
              ? "rgb(96, 165, 250)"
              : "rgb(75, 85, 99)",
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
              Timegroup · {formatDuration(durationMs)} ·{" "}
              {Math.round(elementWidth)}×{Math.round(elementHeight)}
            </span>
          </div>
        )}

        {(isActive || isSelected) &&
          resizeHandles
            .filter((handle) => handle.visible)
            .map((handle) => (
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
    </OverlayItem>
  );
}
