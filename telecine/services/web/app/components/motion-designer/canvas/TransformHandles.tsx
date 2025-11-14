import React, { useRef, useEffect, useState } from "react";
import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";

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
  return rotatePoint(centerX, centerY, localCornerX, localCornerY, rotationRadians);
}

// Get opposite corner magnitudes for a handle
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
  const positionRef = useRef({ x: 0, y: 0 });
  const [, forceUpdate] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [rotationStartAngle, setRotationStartAngle] = useState<number | null>(null);
  const [rotationStartRotation, setRotationStartRotation] = useState<number>(0);
  const [resizeStartCorner, setResizeStartCorner] = useState<{ x: number; y: number } | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState<{ width: number; height: number } | null>(null);
  const [resizeStartPosition, setResizeStartPosition] = useState<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);

  const isRootTimegroup = element.type === "timegroup" && element.parentId === null;
  const showRotateHandle = !isRootTimegroup;

  // Continuously measure element using RAF to get actual DOM position
  // Throttle updates to reduce jitter during zoom
  useEffect(() => {
    let rafId: number;
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE_MS = 16; // ~60fps max update rate
    
    const updateMeasurements = (currentTime: number) => {
      // Throttle updates to reduce jitter during zoom
      if (currentTime - lastUpdateTime < UPDATE_THROTTLE_MS) {
        rafId = requestAnimationFrame(updateMeasurements);
        return;
      }
      lastUpdateTime = currentTime;
      
      const contentElement = document.querySelector(
        `[data-element-id="${element.id}"]`,
      ) as HTMLElement;
      
      // Find the canvas container
      let canvasContainer: HTMLElement | null = null;
      if (overlayRef.current) {
        // Find the overlay layer (has transform translate)
        const overlayLayer = overlayRef.current.closest('[style*="transform"]') as HTMLElement;
        // Canvas container is the parent of the overlay layer
        canvasContainer = overlayLayer?.parentElement as HTMLElement;
      }
      
      // Fallback: find by class selector
      if (!canvasContainer) {
        canvasContainer = document.querySelector('.flex-1.overflow-hidden.relative.bg-gray-950') as HTMLElement;
      }
      
      if (contentElement && canvasContainer) {
        // Find the overlay layer element (parent of overlayRef)
        let overlayLayer: HTMLElement | null = null;
        if (overlayRef.current) {
          overlayLayer = overlayRef.current.parentElement as HTMLElement;
        }
        
        if (!overlayLayer) {
          // Fallback: find overlay layer by traversing up from content element
          const contentParent = contentElement.parentElement;
          if (contentParent) {
            // Content layer is a sibling of overlay layer, both children of canvas container
            const siblings = Array.from(canvasContainer.children);
            overlayLayer = siblings.find(
              (el) => el !== contentParent && (el as HTMLElement).style.transform?.includes('translate')
            ) as HTMLElement | null;
          }
        }
        
        if (contentElement && overlayLayer) {
          // Get actual DOM positions using getBoundingClientRect
          // This gives us the element's position AFTER all CSS transforms (content layer transform)
          const elementRect = contentElement.getBoundingClientRect();
          const overlayLayerRect = overlayLayer.getBoundingClientRect();
          
          // Store intrinsic size (offsetWidth/offsetHeight give layout size before CSS transforms)
          const intrinsicWidth = contentElement.offsetWidth;
          const intrinsicHeight = contentElement.offsetHeight;
          
          // Calculate element's center point (in screen coordinates)
          // When rotated, the bounding box center is the element's rotation center
          const elementCenterX = elementRect.left + elementRect.width / 2;
          const elementCenterY = elementRect.top + elementRect.height / 2;
          
          // Convert element center to overlay layer coordinates
          const elementCenterOverlayX = elementCenterX - overlayLayerRect.left;
          const elementCenterOverlayY = elementCenterY - overlayLayerRect.top;
          
          // Calculate overlay size in screen coordinates (scaled, matching render logic)
          const screenWidth = intrinsicWidth * canvasScale;
          const screenHeight = intrinsicHeight * canvasScale;
          
          // Position overlay so its center aligns with element's center
          // Both rotate around their centers, so centers must match exactly
          const overlayX = elementCenterOverlayX - screenWidth / 2;
          const overlayY = elementCenterOverlayY - screenHeight / 2;
          
          // Update if position or dimensions changed (with larger threshold to reduce jitter)
          const positionChanged = 
            Math.abs(positionRef.current.x - overlayX) > 1 ||
            Math.abs(positionRef.current.y - overlayY) > 1;
          const dimensionsChanged = 
            intrinsicWidth > 0 && intrinsicHeight > 0 &&
            (Math.abs(dimensionsRef.current.width - intrinsicWidth) > 1 ||
             Math.abs(dimensionsRef.current.height - intrinsicHeight) > 1);
          
          if (positionChanged || dimensionsChanged) {
            positionRef.current = { x: overlayX, y: overlayY };
            if (intrinsicWidth > 0 && intrinsicHeight > 0) {
              dimensionsRef.current = { 
                width: intrinsicWidth, 
                height: intrinsicHeight,
              };
            }
            forceUpdate({});
          }
        }
      }
      
      rafId = requestAnimationFrame(updateMeasurements);
    };
    
    rafId = requestAnimationFrame(updateMeasurements);
    
    return () => cancelAnimationFrame(rafId);
  }, [element.id, element.props.position, element.props.size, state, canvasScale, canvasTranslateX, canvasTranslateY]);

  const currentX = element.props.position?.x ?? 0;
  const currentY = element.props.position?.y ?? 0;
  const currentWidth = element.props.size?.width ?? dimensionsRef.current.width;
  const currentHeight = element.props.size?.height ?? dimensionsRef.current.height;
  const currentRotation = element.props.rotation ?? 0;

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
    
    // Store initial state for corner-based resize (keeps opposite corner fixed)
    const oppositeCorner = getOppositeCorner(handle);
    const rotationRadians = (currentRotation * Math.PI) / 180;
    const initialCorner = getCornerPoint(
      currentX,
      currentY,
      currentWidth,
      currentHeight,
      rotationRadians,
      oppositeCorner.x,
      oppositeCorner.y,
    );
    
    setResizeStartCorner(initialCorner);
    setResizeStartSize({ width: currentWidth, height: currentHeight });
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
      setRotationStartRotation(currentRotation);
    }
    
    hasDraggedRef.current = false;
  };

  useEffect(() => {
    if (!isDragging && !isResizing && !isRotating) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Read current values from element props to avoid stale closure values
      const currentElementX = element.props.position?.x ?? 0;
      const currentElementY = element.props.position?.y ?? 0;
      const currentElementWidth = element.props.size?.width ?? dimensionsRef.current.width;
      const currentElementHeight = element.props.size?.height ?? dimensionsRef.current.height;
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
      } else if (isResizing && dragStart && resizeStartCorner && resizeStartSize && resizeStartPosition) {
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
        
        // Prepare update object
        const updates: Partial<ElementNode["props"]> = {
          size: { width: newWidth, height: newHeight },
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
        const centerX = rect.left + rect.width / 2;  // Screen coordinates
        const centerY = rect.top + rect.height / 2;   // Screen coordinates
        
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

  // Use element props for size (source of truth), fallback to measured dimensions if not set
  // This ensures Design panel changes are immediately reflected in the overlay
  const overlayWidth = element.props.size?.width ?? dimensionsRef.current.width;
  const overlayHeight = element.props.size?.height ?? dimensionsRef.current.height;
  
  // Position overlay using actual DOM measurements
  // positionRef.current contains overlay layer coordinates (already converted from screen coords)
  // Overlay layer has transform: translate(canvasTranslateX, canvasTranslateY)
  // So final screen position will be: (positionRef.x + translateX, positionRef.y + translateY)
  // Which matches the element's screen position: (canvasX * scale + translateX, canvasY * scale + translateY)
  const screenX = positionRef.current.x;
  const screenY = positionRef.current.y;
  const screenWidth = overlayWidth * canvasScale;
  const screenHeight = overlayHeight * canvasScale;

  return (
    <div
      ref={overlayRef}
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

      {/* Resize handles */}
      {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => {
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
      })}

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

