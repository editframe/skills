import React, { useState } from "react";
import type {
  ElementNode,
  MotionDesignerState,
} from "~/lib/motion-designer/types";
import {
  createDefaultSize,
  createDefaultSizeForFlexChild,
} from "~/lib/motion-designer/defaultSizes";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { ElementContextMenu } from "./ElementContextMenu";
import { OverlayItem } from "@editframe/react";

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
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

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

  // Use OverlayItem to track element position automatically
  return (
    <>
      <OverlayItem
        elementId={element.id}
        style={{
          pointerEvents: "auto",
          cursor: "pointer",
          zIndex: 5, // Lower than TransformHandles (z-index: 10) so handles take precedence when selected
          background: "transparent",
        }}
      >
        <div
          className="w-full h-full"
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        />
      </OverlayItem>
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
