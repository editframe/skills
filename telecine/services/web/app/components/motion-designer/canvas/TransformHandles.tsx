import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import type {
  ElementNode,
  MotionDesignerState,
} from "~/lib/motion-designer/types";
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
import { hasRotateAnimations } from "../rendering/styleGenerators/rotationUtils";
import { evaluateOverlayPositionForElement } from "./overlayEvaluation";
import type { OverlayPosition } from "./overlayTypes";

interface TransformHandlesProps {
  element: ElementNode;
  state: MotionDesignerState;
  isSelected: boolean;
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
}

// Rotate a point around a center point by given radians
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

// Calculate corner point in canvas coordinates for a rotated element
// xMagnitude: 0 = left, 0.5 = center, 1 = right
// yMagnitude: 0 = top, 0.5 = center, 1 = bottom
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

// Get opposite corner magnitudes for a handle
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

// Check if an element's parent is a flex container
function isParentFlexContainer(
  element: ElementNode,
  state: MotionDesignerState,
): boolean {
  if (!element.parentId) return false;

  const parent = state.composition.elements[element.parentId];
  if (!parent) return false;

  // Check if parent is a container (div or timegroup) with display: flex
  const isContainer = parent.type === "div" || parent.type === "timegroup";
  return isContainer && parent.props.display === "flex";
}

export function TransformHandles({
  element,
  state,
  isSelected,
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
}: TransformHandlesProps) {
  const actions = useMotionDesignerActions();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const [overlayPosition, setOverlayPosition] =
    useState<OverlayPosition | null>(null);
  const [computedRotation, setComputedRotation] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [rotationStartAngle, setRotationStartAngle] = useState<number | null>(
    null,
  );
  const [rotationStartRotation, setRotationStartRotation] = useState<number>(0);
  const [resizeStartCorner, setResizeStartCorner] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [resizeStartPosition, setResizeStartPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const hasDraggedRef = useRef(false);

  const isRootTimegroup =
    element.type === "timegroup" && element.parentId === null;
  const showRotateHandle = !isRootTimegroup;
  const hasRotateAnims = hasRotateAnimations(element);

  // Read overlay position from DOM using centralized function
  // This handles parent hierarchy, scaling, and animations correctly
  useLayoutEffect(() => {
    if (!overlayRef.current) return;

    // Find overlay layer
    const overlayLayer = overlayRef.current.parentElement as HTMLElement;
    if (!overlayLayer) return;

    const overlayLayerRect = overlayLayer.getBoundingClientRect();

    // Use centralized position reading function
    const position = evaluateOverlayPositionForElement(
      element.id,
      overlayLayerRect,
      canvasScale,
    );

    if (!position) return;

    // Update overlay DOM directly - no React re-render needed
    overlayRef.current.style.left = `${position.x}px`;
    overlayRef.current.style.top = `${position.y}px`;
    overlayRef.current.style.width = `${position.width}px`;
    overlayRef.current.style.height = `${position.height}px`;
    overlayRef.current.style.transform = `rotate(${position.rotation}deg)`;

    // Update state for rotation handle calculations
    if (hasRotateAnims) {
      setComputedRotation(position.rotation);
    } else {
      setComputedRotation(null);
    }

    // Update dimensions ref for size calculations
    // Get intrinsic size from DOM element
    const contentElement = document.querySelector(
      `[data-element-id="${element.id}"]`,
    ) as HTMLElement;
    if (contentElement) {
      const intrinsicWidth = contentElement.offsetWidth;
      const intrinsicHeight = contentElement.offsetHeight;
      if (intrinsicWidth > 0 && intrinsicHeight > 0) {
        dimensionsRef.current = {
          width: intrinsicWidth,
          height: intrinsicHeight,
        };
      }
    }

    // Store position for use in render
    setOverlayPosition(position);
  }, [
    element.id,
    element.props.position,
    element.props.size,
    state,
    canvasScale,
    canvasTranslateX,
    canvasTranslateY,
    hasRotateAnims,
  ]);

  // Use RAF only for continuous updates during interactions (dragging, resizing, rotating)
  // This ensures smooth updates during user interactions
  useEffect(() => {
    if (!isDragging && !isResizing && !isRotating) return;

    let rafId: number;

    const updateMeasurements = () => {
      if (!overlayRef.current) {
        rafId = requestAnimationFrame(updateMeasurements);
        return;
      }

      // Find overlay layer
      const overlayLayer = overlayRef.current.parentElement as HTMLElement;
      if (!overlayLayer) {
        rafId = requestAnimationFrame(updateMeasurements);
        return;
      }

      const overlayLayerRect = overlayLayer.getBoundingClientRect();

      // Use centralized position reading function
      const position = evaluateOverlayPositionForElement(
        element.id,
        overlayLayerRect,
        canvasScale,
      );

      if (!position) {
        rafId = requestAnimationFrame(updateMeasurements);
        return;
      }

      // Update overlay DOM directly
      overlayRef.current.style.left = `${position.x}px`;
      overlayRef.current.style.top = `${position.y}px`;
      overlayRef.current.style.width = `${position.width}px`;
      overlayRef.current.style.height = `${position.height}px`;
      overlayRef.current.style.transform = `rotate(${position.rotation}deg)`;

      // Read computed rotation during interactions
      if (hasRotateAnims) {
        setComputedRotation(position.rotation);
      }

      setOverlayPosition(position);

      // Update dimensions ref
      const contentElement = document.querySelector(
        `[data-element-id="${element.id}"]`,
      ) as HTMLElement;
      if (contentElement) {
        const intrinsicWidth = contentElement.offsetWidth;
        const intrinsicHeight = contentElement.offsetHeight;
        if (intrinsicWidth > 0 && intrinsicHeight > 0) {
          dimensionsRef.current = {
            width: intrinsicWidth,
            height: intrinsicHeight,
          };
        }
      }

      rafId = requestAnimationFrame(updateMeasurements);
    };

    rafId = requestAnimationFrame(updateMeasurements);
    return () => cancelAnimationFrame(rafId);
  }, [
    isDragging,
    isResizing,
    isRotating,
    element.id,
    canvasScale,
    hasRotateAnims,
  ]);

  const currentX = element.props.position?.x ?? 0;
  const currentY = element.props.position?.y ?? 0;
  const sizeDimensions = getSizeDimensions(element.props?.size);
  const currentWidth = sizeDimensions.width || dimensionsRef.current.width;
  const currentHeight = sizeDimensions.height || dimensionsRef.current.height;
  // Use computed rotation from DOM when rotate animations are active, otherwise use design property
  const currentRotation =
    hasRotateAnims && computedRotation !== null
      ? computedRotation
      : (element.props.rotation ?? 0);

  // Mouse handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelected) return;

    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartPosition({ x: currentX, y: currentY });
    hasDraggedRef.current = false;
    actions.selectElement(element.id);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    setIsResizing(handle);
    setDragStart({ x: e.clientX, y: e.clientY });

    // Convert to fixed mode if currently in hug/fill mode (resize converts to fixed)
    const fixedSize = convertToFixedSize(
      element.props?.size,
      currentWidth,
      currentHeight,
    );
    const fixedWidth = fixedSize.widthValue;
    const fixedHeight = fixedSize.heightValue;

    // Store initial state for corner-based resize (keeps opposite corner fixed)
    const oppositeCorner = getOppositeCorner(handle);
    const rotationRadians = (currentRotation * Math.PI) / 180;
    const initialCorner = getCornerPoint(
      currentX,
      currentY,
      fixedWidth,
      fixedHeight,
      rotationRadians,
      oppositeCorner.x,
      oppositeCorner.y,
    );

    setResizeStartCorner(initialCorner);
    setResizeStartSize({ width: fixedWidth, height: fixedHeight });
    setResizeStartPosition({ x: currentX, y: currentY });
    hasDraggedRef.current = false;
  };

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    setDragStart({ x: e.clientX, y: e.clientY });

    // Calculate initial angle from mouse position to element center
    const contentElement = document.querySelector(
      `[data-element-id="${element.id}"]`,
    ) as HTMLElement;

    if (contentElement) {
      const rect = contentElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const radians = Math.atan2(dy, dx);
      const degrees = radians * (180 / Math.PI) + 90;
      setRotationStartAngle(degrees);
      // Use computed rotation as starting point when animations are active
      const startRotation =
        hasRotateAnims && computedRotation !== null
          ? computedRotation
          : currentRotation;
      setRotationStartRotation(startRotation);
    }

    hasDraggedRef.current = false;
  };

  useEffect(() => {
    if (!isDragging && !isResizing && !isRotating) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Read current values from element props to avoid stale closure values
      const currentElementX = element.props.position?.x ?? 0;
      const currentElementY = element.props.position?.y ?? 0;
      const currentElementSizeDimensions = getSizeDimensions(
        element.props?.size,
      );
      const currentElementWidth =
        currentElementSizeDimensions.width || dimensionsRef.current.width;
      const currentElementHeight =
        currentElementSizeDimensions.height || dimensionsRef.current.height;
      const currentElementRotation = element.props.rotation ?? 0;

      if (isDragging && dragStart) {
        // Screen pixel delta needs to be divided by scale to get canvas coordinate delta
        const screenDeltaX = e.clientX - dragStart.x;
        const screenDeltaY = e.clientY - dragStart.y;
        if (Math.abs(screenDeltaX) > 2 || Math.abs(screenDeltaY) > 2) {
          hasDraggedRef.current = true;
        }

        // Convert screen delta to canvas coordinates
        const canvasDeltaX = screenDeltaX / canvasScale;
        const canvasDeltaY = screenDeltaY / canvasScale;

        // Update position in real-time while dragging (matching CanvasRootTimegroupOverlay pattern)
        const newX = dragStartPosition.x + canvasDeltaX;
        const newY = dragStartPosition.y + canvasDeltaY;
        actions.updateElement(element.id, {
          position: { x: newX, y: newY },
        });

        // Update dragStart for next move event (incremental deltas, not cumulative)
        // This prevents cumulative error and matches the working pattern
        setDragStart({ x: e.clientX, y: e.clientY });
        setDragStartPosition({ x: newX, y: newY });
      } else if (
        isResizing &&
        dragStart &&
        resizeStartCorner &&
        resizeStartSize &&
        resizeStartPosition
      ) {
        // Calculate delta from last mouse position (incremental, not cumulative)
        const screenDeltaX = e.clientX - dragStart.x;
        const screenDeltaY = e.clientY - dragStart.y;
        const canvasDeltaX = screenDeltaX / canvasScale;
        const canvasDeltaY = screenDeltaY / canvasScale;

        const rotationRadians = (currentElementRotation * Math.PI) / 180;

        // Get the opposite corner (the one that should stay fixed)
        const oppositeCorner = getOppositeCorner(isResizing);

        // Use stored initial corner position (calculated when resize started)
        const initialCorner = resizeStartCorner;

        // Rotate the delta vector by negative rotation to convert screen movement to local coordinates
        // This compensates for the element's rotation when resizing
        // Rotate around origin (0,0) to rotate the vector itself
        const cos = Math.cos(-rotationRadians);
        const sin = Math.sin(-rotationRadians);
        const rotatedDeltaX = cos * canvasDeltaX - sin * canvasDeltaY;
        const rotatedDeltaY = sin * canvasDeltaX + cos * canvasDeltaY;

        // Calculate new size based on handle direction and rotated delta
        // Use current size and apply incremental delta
        let newWidth = currentElementWidth;
        let newHeight = currentElementHeight;

        // Determine which dimensions to update based on handle
        // Project the rotated delta onto the appropriate axis
        if (isResizing.includes("e")) {
          newWidth = currentElementWidth + rotatedDeltaX;
        } else if (isResizing.includes("w")) {
          newWidth = currentElementWidth - rotatedDeltaX;
        }

        if (isResizing.includes("s")) {
          newHeight = currentElementHeight + rotatedDeltaY;
        } else if (isResizing.includes("n")) {
          newHeight = currentElementHeight - rotatedDeltaY;
        }

        // Ensure minimum size
        newWidth = Math.max(10, newWidth);
        newHeight = Math.max(10, newHeight);

        // Check if element is in a flex container
        const inFlexContainer = isParentFlexContainer(element, state);

        // Determine which dimensions are being resized based on the handle
        const isResizingWidth =
          isResizing.includes("e") || isResizing.includes("w");
        const isResizingHeight =
          isResizing.includes("n") || isResizing.includes("s");

        // Get current sizing modes to preserve non-resized dimensions
        const normalizedSize = normalizeSize(element.props?.size);
        const currentWidthMode = normalizedSize?.widthMode || "fixed";
        const currentHeightMode = normalizedSize?.heightMode || "fixed";

        // Only convert resized dimensions to fixed, preserve others
        const updates: Partial<ElementNode["props"]> = {
          size: {
            widthMode: isResizingWidth ? "fixed" : currentWidthMode,
            widthValue: newWidth,
            heightMode: isResizingHeight ? "fixed" : currentHeightMode,
            heightValue: newHeight,
          },
        };

        // Only adjust position if NOT in a flex container
        // In flex containers, position is determined by flexbox layout, not by coordinates
        if (!inFlexContainer) {
          // Calculate new opposite corner position after resize
          // Use current position to see where opposite corner would be with new size
          const newOppositeCorner = getCornerPoint(
            currentElementX,
            currentElementY,
            newWidth,
            newHeight,
            rotationRadians,
            oppositeCorner.x,
            oppositeCorner.y,
          );

          // Adjust position to keep opposite corner fixed
          // The offset is the difference between where the opposite corner should be (initial)
          // and where it would be with the new size at the current position
          const offsetX = initialCorner.x - newOppositeCorner.x;
          const offsetY = initialCorner.y - newOppositeCorner.y;

          // Apply offset to position (both are in canvas coordinates)
          const newX = currentElementX + offsetX;
          const newY = currentElementY + offsetY;

          updates.position = { x: newX, y: newY };
        }

        actions.updateElement(element.id, updates);

        // Update dragStart for next move event (prevents cumulative error)
        setDragStart({ x: e.clientX, y: e.clientY });
      } else if (isRotating && dragStart && rotationStartAngle !== null) {
        // Use getBoundingClientRect to get actual screen position of element
        // This accounts for all transforms (scale, translate, rotation) applied by CSS
        const contentElement = document.querySelector(
          `[data-element-id="${element.id}"]`,
        ) as HTMLElement;

        if (!contentElement) return;

        const rect = contentElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2; // Screen coordinates
        const centerY = rect.top + rect.height / 2; // Screen coordinates

        // Calculate current angle from center (both in screen coordinates)
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const radians = Math.atan2(dy, dx);
        const currentAngle = radians * (180 / Math.PI) + 90; // +90 to match old system (0° = up)

        // Calculate delta from initial angle and apply to initial rotation
        // This preserves relative rotation behavior while using accurate screen coordinates
        const deltaAngle = currentAngle - rotationStartAngle;
        const newRotation = rotationStartRotation + deltaAngle;

        actions.updateElement(element.id, {
          rotation: newRotation,
        });

        // Update dragStart for next move event
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      setIsRotating(false);
      setDragStart(null);
      setDragStartPosition({ x: 0, y: 0 });
      setRotationStartAngle(null);
      setRotationStartRotation(0);
      setResizeStartCorner(null);
      setResizeStartSize(null);
      setResizeStartPosition(null);
      hasDraggedRef.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    isRotating,
    dragStart,
    dragStartPosition,
    rotationStartAngle,
    rotationStartRotation,
    resizeStartCorner,
    resizeStartSize,
    resizeStartPosition,
    currentX,
    currentY,
    currentWidth,
    currentHeight,
    currentRotation,
    element.id,
    element.props.position,
    element.props.size,
    actions,
    canvasScale,
  ]);

  if (!isSelected) return null;

  // Position is set directly on DOM in useLayoutEffect
  // Use state values for initial render (will be updated synchronously in useLayoutEffect)
  const screenX = overlayPosition?.x ?? 0;
  const screenY = overlayPosition?.y ?? 0;
  const screenWidth = overlayPosition?.width ?? 0;
  const screenHeight = overlayPosition?.height ?? 0;

  return (
    <div
      ref={overlayRef}
      data-overlay-id={element.id}
      className="absolute pointer-events-none"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
        transform: `rotate(${currentRotation}deg)`,
        transformOrigin: "center",
        zIndex: 10, // Ensure handles are above other overlays
      }}
    >
      {/* Selection border */}
      <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />

      {/* Drag area */}
      <div
        className="absolute inset-0 cursor-move pointer-events-auto"
        onMouseDown={(e) => {
          e.stopPropagation(); // Prevent parent overlays from intercepting
          handleMouseDown(e);
        }}
      />

      {/* Resize handles - only show for fixed sizing modes */}
      {(() => {
        const normalizedSize = normalizeSize(element.props?.size);
        const canResizeWidth =
          !normalizedSize ||
          isLegacySize(normalizedSize) ||
          normalizedSize.widthMode === "fixed";
        const canResizeHeight =
          !normalizedSize ||
          isLegacySize(normalizedSize) ||
          normalizedSize.heightMode === "fixed";

        const handles = [
          {
            position: "nw" as const,
            visible: canResizeWidth && canResizeHeight,
          },
          { position: "n" as const, visible: canResizeHeight },
          {
            position: "ne" as const,
            visible: canResizeWidth && canResizeHeight,
          },
          { position: "e" as const, visible: canResizeWidth },
          {
            position: "se" as const,
            visible: canResizeWidth && canResizeHeight,
          },
          { position: "s" as const, visible: canResizeHeight },
          {
            position: "sw" as const,
            visible: canResizeWidth && canResizeHeight,
          },
          { position: "w" as const, visible: canResizeWidth },
        ];

        return handles
          .filter((h) => h.visible)
          .map(({ position: handle }) => {
            const handleStyles: React.CSSProperties = {
              width: "8px",
              height: "8px",
              background: "white",
              border: "1px solid blue",
              position: "absolute",
              pointerEvents: "auto",
            };

            switch (handle) {
              case "nw":
                handleStyles.top = "-4px";
                handleStyles.left = "-4px";
                handleStyles.cursor = "nw-resize";
                break;
              case "n":
                handleStyles.top = "-4px";
                handleStyles.left = "50%";
                handleStyles.transform = "translateX(-50%)";
                handleStyles.cursor = "n-resize";
                break;
              case "ne":
                handleStyles.top = "-4px";
                handleStyles.right = "-4px";
                handleStyles.cursor = "ne-resize";
                break;
              case "e":
                handleStyles.top = "50%";
                handleStyles.right = "-4px";
                handleStyles.transform = "translateY(-50%)";
                handleStyles.cursor = "e-resize";
                break;
              case "se":
                handleStyles.bottom = "-4px";
                handleStyles.right = "-4px";
                handleStyles.cursor = "se-resize";
                break;
              case "s":
                handleStyles.bottom = "-4px";
                handleStyles.left = "50%";
                handleStyles.transform = "translateX(-50%)";
                handleStyles.cursor = "s-resize";
                break;
              case "sw":
                handleStyles.bottom = "-4px";
                handleStyles.left = "-4px";
                handleStyles.cursor = "sw-resize";
                break;
              case "w":
                handleStyles.top = "50%";
                handleStyles.left = "-4px";
                handleStyles.transform = "translateY(-50%)";
                handleStyles.cursor = "w-resize";
                break;
            }

            return (
              <div
                key={handle}
                style={handleStyles}
                onMouseDown={(e) => {
                  e.stopPropagation(); // Prevent parent overlays from intercepting
                  handleResizeMouseDown(e, handle);
                }}
              />
            );
          });
      })()}

      {/* Rotate handle */}
      {showRotateHandle && (
        <div
          className="absolute pointer-events-auto"
          style={{
            top: "-30px",
            left: "50%",
            transform: "translateX(-50%)",
            cursor: "grab",
          }}
        >
          <div
            className="w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center"
            onMouseDown={(e) => {
              e.stopPropagation(); // Prevent parent overlays from intercepting
              handleRotateMouseDown(e);
            }}
          >
            <span className="text-xs text-white">↻</span>
          </div>
        </div>
      )}
    </div>
  );
}
