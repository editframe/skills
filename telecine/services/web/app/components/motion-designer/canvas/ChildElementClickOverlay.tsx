import React, { useRef, useEffect, useState } from "react";
import type {
  ElementNode,
  MotionDesignerState,
} from "~/lib/motion-designer/types";
import {
  createDefaultSize,
  createDefaultSizeForFlexChild,
} from "~/lib/motion-designer/defaultSizes";
import { getSizeDimensions } from "~/lib/motion-designer/sizingUtils";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { hasRotateAnimations } from "../rendering/styleGenerators/rotationUtils";
import { ElementContextMenu } from "./ElementContextMenu";
import { evaluateOverlayPositionForElement } from "./overlayEvaluation";
import type { OverlayPosition } from "./overlayTypes";

interface ChildElementClickOverlayProps {
  element: ElementNode;
  state: MotionDesignerState;
  isSelected: boolean;
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
}

/**
 * Renders an invisible clickable overlay for unselected child elements.
 * This allows users to click on elements in the canvas to select them.
 *
 * When the element is selected, TransformHandles will render on top with higher z-index,
 * so this overlay only needs to handle unselected elements.
 */
export function ChildElementClickOverlay({
  element,
  state,
  isSelected,
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
}: ChildElementClickOverlayProps) {
  const actions = useMotionDesignerActions();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const [overlayPosition, setOverlayPosition] =
    useState<OverlayPosition | null>(null);
  const hasRotateAnims = hasRotateAnimations(element);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Continuously measure element using RAF to get actual DOM position
  // Uses centralized position reading function
  useEffect(() => {
    // Early return if selected - don't measure for selected elements
    if (isSelected) return;
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

      // Update state if position changed significantly
      const threshold = 0.5; // pixels
      if (
        !overlayPosition ||
        Math.abs(overlayPosition.x - position.x) > threshold ||
        Math.abs(overlayPosition.y - position.y) > threshold ||
        Math.abs(overlayPosition.width - position.width) > threshold ||
        Math.abs(overlayPosition.height - position.height) > threshold ||
        Math.abs(overlayPosition.rotation - position.rotation) > 0.1
      ) {
        setOverlayPosition(position);
      }

      rafId = requestAnimationFrame(updateMeasurements);
    };

    rafId = requestAnimationFrame(updateMeasurements);

    return () => cancelAnimationFrame(rafId);
  }, [
    element.id,
    element.props.position,
    element.props.size,
    state,
    canvasScale,
    canvasTranslateX,
    canvasTranslateY,
    isSelected,
    hasRotateAnims,
    overlayPosition,
  ]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent canvas pan/zoom and timegroup selection

    // If placement mode is active and this element can contain children, place the new element inside
    if (state.ui.placementMode) {
      // Only timegroups and divs can contain children
      const canContainChildren =
        element.type === "timegroup" || element.type === "div";

      if (canContainChildren) {
        // Don't allow placing timegroups inside other timegroups (only at root level)
        if (
          state.ui.placementMode === "timegroup" &&
          element.type === "timegroup"
        ) {
          console.warn(
            "Cannot place nested timegroups. Timegroups must be at root level.",
          );
          actions.setPlacementMode(null);
          return;
        }

        // Get click position relative to the element for positioning
        const rect = e.currentTarget.getBoundingClientRect();
        const elementX = (e.clientX - rect.left) / canvasScale;
        const elementY = (e.clientY - rect.top) / canvasScale;

        // Set default props based on element type
        const defaultProps: any = {
          position: { x: elementX, y: elementY },
          fill: { enabled: true, color: "#FFFFFF" },
        };

        const elementType = state.ui.placementMode as ElementNode["type"];
        const isParentFlex = element.props.display === "flex";

        // Use appropriate default size based on context
        if (isParentFlex) {
          defaultProps.size = createDefaultSizeForFlexChild(elementType);
        } else {
          if (elementType === "image" || elementType === "video") {
            defaultProps.size = createDefaultSize(elementType, 400, 300);
          } else {
            defaultProps.size = createDefaultSize(elementType, 200, 100);
          }
        }

        if (elementType === "text") {
          defaultProps.content = "Text";
          defaultProps.fontSize = 32;
          defaultProps.textAlign = "left";
          defaultProps.fill = { enabled: true, color: "#000000" };
          defaultProps.split = "word";
          defaultProps.stagger = "0ms";
          defaultProps.easing = "linear";
          // Text elements always use hug mode
          defaultProps.size = createDefaultSize("text", 0, 0);
        } else if (elementType === "div") {
          defaultProps.fill = { enabled: true, color: "#9333EA" };
        } else if (elementType === "captions") {
          defaultProps.showBefore = true;
          defaultProps.showAfter = true;
          defaultProps.showActive = true;
          defaultProps.showSegment = true;
        } else if (elementType === "waveform") {
          defaultProps.mode = "bars";
        }

        // Add element as child of the clicked container
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
        return;
      }
    }

    // Otherwise, toggle selection: if already selected, deselect; otherwise select
    if (isSelected) {
      actions.selectElement(null);
    } else {
      actions.selectElement(element.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDuplicate = () => {
    const parentId = element.parentId;
    actions.addElement(
      {
        type: element.type,
        parentId,
        childIds: [],
        props: { ...element.props },
        animations: [...element.animations],
      },
      parentId,
    );
  };

  const handleCopy = () => {
    // For now, copy is the same as duplicate
    handleDuplicate();
  };

  // Only render overlay for unselected elements
  // Selected elements are handled by TransformHandles
  if (isSelected) return null;

  // Use position from centralized reading function
  const screenX = overlayPosition?.x ?? 0;
  const screenY = overlayPosition?.y ?? 0;
  const screenWidth = overlayPosition?.width ?? 0;
  const screenHeight = overlayPosition?.height ?? 0;
  const currentRotation =
    overlayPosition?.rotation ?? element.props.rotation ?? 0;

  return (
    <>
      <div
        ref={overlayRef}
        data-overlay-id={element.id}
        className="absolute pointer-events-auto cursor-pointer"
        style={{
          left: `${screenX}px`,
          top: `${screenY}px`,
          width: `${screenWidth}px`,
          height: `${screenHeight}px`,
          transform: `rotate(${currentRotation}deg)`,
          transformOrigin: "center",
          zIndex: 5, // Lower than TransformHandles (z-index: 10) so handles take precedence when selected
          // Invisible but clickable
          background: "transparent",
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />
      {contextMenu && (
        <ElementContextMenu
          element={element}
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={() => {
            actions.deleteElement(element.id);
            actions.selectElement(null);
          }}
          onDuplicate={handleDuplicate}
          onCopy={handleCopy}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
