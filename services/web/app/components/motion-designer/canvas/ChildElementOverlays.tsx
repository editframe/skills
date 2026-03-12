import React from "react";
import type {
  ElementNode,
  MotionDesignerState,
} from "~/lib/motion-designer/types";
import { TransformHandlesWrapper } from "./TransformHandlesWrapper";
import { ChildElementClickOverlay } from "./ChildElementClickOverlay";

interface ChildElementOverlaysProps {
  rootTimegroup: ElementNode;
  state: MotionDesignerState;
}

export function ChildElementOverlays({
  rootTimegroup,
  state,
}: ChildElementOverlaysProps) {
  // Recursively collect all child elements
  const collectChildren = (element: ElementNode): ElementNode[] => {
    const children: ElementNode[] = [];
    for (const childId of element.childIds) {
      const child = state.composition.elements[childId];
      if (child) {
        children.push(child);
        children.push(...collectChildren(child));
      }
    }
    return children;
  };

  const allChildren = collectChildren(rootTimegroup);

  return (
    <>
      {allChildren.map((child) => {
        const isSelected = state.ui.selectedElementId === child.id;
        // Hide child overlays when parent is selected/active to avoid blocking parent's drag handles
        const isParentSelected =
          child.parentId && state.ui.selectedElementId === child.parentId;
        const isChildOfSelectedParent = isSelected || isParentSelected;
        return (
          <React.Fragment key={child.id}>
            {/* Click overlay for unselected elements */}
            <ChildElementClickOverlay
              element={child}
              state={state}
              isSelected={isChildOfSelectedParent}
            />
            {/* Transform handles for selected elements */}
            <TransformHandlesWrapper
              element={child}
              state={state}
              isSelected={isSelected}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}
