import React, { useState, useCallback } from "react";
import {
  TransformHandles as EFTransformHandles,
  OverlayItem,
} from "@editframe/react";
import type { TransformBounds, OverlayItemPosition } from "@editframe/elements";
import type {
  ElementNode,
  MotionDesignerState,
} from "~/lib/motion-designer/types";
import { getSizeDimensions } from "~/lib/motion-designer/sizingUtils";
import { normalizeSize } from "~/lib/motion-designer/sizingTypes";
import { hasRotateAnimations } from "../rendering/styleGenerators/rotationUtils";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { usePanZoomScale } from "./usePanZoomScale";

interface TransformHandlesWrapperProps {
  element: ElementNode;
  state: MotionDesignerState;
  isSelected: boolean;
}

function isParentFlexContainer(
  element: ElementNode,
  state: MotionDesignerState,
): boolean {
  if (!element.parentId) return false;

  const parent = state.composition.elements[element.parentId];
  if (!parent) return false;

  const isContainer = parent.type === "div" || parent.type === "timegroup";
  return isContainer && parent.props.display === "flex";
}

export function TransformHandlesWrapper({
  element,
  state,
  isSelected,
}: TransformHandlesWrapperProps) {
  const actions = useMotionDesignerActions();
  const canvasScale = usePanZoomScale();
  const dimensionsRef = React.useRef({ width: 0, height: 0 });
  const [bounds, setBounds] = useState<TransformBounds>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });

  const isRootTimegroup =
    element.type === "timegroup" && element.parentId === null;
  const showRotateHandle = !isRootTimegroup;
  const hasRotateAnims = hasRotateAnimations(element);

  // Update dimensions ref when element changes
  React.useEffect(() => {
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
  }, [element.id, element.props.size]);

  // Handle position updates from OverlayItem
  // Event handler receives the Event object, extract detail from CustomEvent
  const handlePositionChanged = useCallback((e: Event) => {
    const position = (e as CustomEvent<OverlayItemPosition>).detail;
    // Update bounds for the LitElement
    // Bounds are in overlay coordinates (screen pixels relative to overlay layer)
    setBounds({
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      rotation: position.rotation,
    });
  }, []);

  // Handle bounds change from LitElement
  // The EFTransformHandles works in overlay coordinates, but we need to convert to canvas coordinates
  // Overlay coordinates are screen pixels relative to overlay layer
  // Canvas coordinates = (overlay coordinates) / canvasScale (since overlay doesn't scale)
  const handleBoundsChange = useCallback(
    (e: CustomEvent<{ bounds: TransformBounds }>) => {
      const newBounds = e.detail.bounds;

      // Convert overlay coordinates to canvas coordinates
      const newCanvasX = newBounds.x / canvasScale;
      const newCanvasY = newBounds.y / canvasScale;
      const newCanvasWidth = newBounds.width / canvasScale;
      const newCanvasHeight = newBounds.height / canvasScale;

      const currentX = element.props.position?.x ?? 0;
      const currentY = element.props.position?.y ?? 0;
      const sizeDimensions = getSizeDimensions(element.props?.size);
      const currentWidth =
        sizeDimensions.width || dimensionsRef.current.width / canvasScale;
      const currentHeight =
        sizeDimensions.height || dimensionsRef.current.height / canvasScale;

      const updates: Partial<ElementNode["props"]> = {};

      // Update position if it changed
      const positionChanged =
        Math.abs(newCanvasX - currentX) > 0.1 ||
        Math.abs(newCanvasY - currentY) > 0.1;
      if (positionChanged) {
        updates.position = {
          x: newCanvasX,
          y: newCanvasY,
        };
      }

      // Update size if it changed (resize)
      const sizeChanged =
        Math.abs(newCanvasWidth - currentWidth) > 0.1 ||
        Math.abs(newCanvasHeight - currentHeight) > 0.1;
      if (sizeChanged) {
        const normalizedSize = normalizeSize(element.props?.size);
        const currentWidthMode = normalizedSize?.widthMode || "fixed";
        const currentHeightMode = normalizedSize?.heightMode || "fixed";

        const inFlexContainer = isParentFlexContainer(element, state);
        const isResizingWidth = Math.abs(newCanvasWidth - currentWidth) > 0.1;
        const isResizingHeight =
          Math.abs(newCanvasHeight - currentHeight) > 0.1;

        updates.size = {
          widthMode: isResizingWidth ? "fixed" : currentWidthMode,
          widthValue: newCanvasWidth,
          heightMode: isResizingHeight ? "fixed" : currentHeightMode,
          heightValue: newCanvasHeight,
        };

        // Position adjustment for resize is already handled by EFTransformHandles
        // It keeps the opposite corner fixed, so we just need to use the new position
        if (!inFlexContainer && !positionChanged) {
          // The EFTransformHandles already calculated the correct position to keep opposite corner fixed
          // We just need to convert it to canvas coordinates
          updates.position = {
            x: newCanvasX,
            y: newCanvasY,
          };
        }
      }

      if (Object.keys(updates).length > 0) {
        actions.updateElement(element.id, updates);
      }
    },
    [bounds, element, state, canvasScale, actions],
  );

  // Handle rotation change from LitElement
  const handleRotationChange = useCallback(
    (e: CustomEvent<{ rotation: number }>) => {
      const newRotation = e.detail.rotation;
      actions.updateElement(element.id, {
        rotation: newRotation,
      });
    },
    [element.id, actions],
  );

  if (!isSelected) return null;

  return (
    <OverlayItem
      elementId={element.id}
      onPositionChanged={handlePositionChanged}
      style={{
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <EFTransformHandles
        bounds={bounds}
        enableRotation={showRotateHandle}
        enableResize={true}
        enableDrag={true}
        onBoundsChange={handleBoundsChange}
        onRotationChange={handleRotationChange}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </OverlayItem>
  );
}
