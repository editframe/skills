import React from "react";
import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import { PropertySectionRenderer } from "./config/PropertySectionRenderer";
import { propertySections } from "./config/propertyConfig";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";

interface DesignTabProps {
  element: ElementNode;
  state: MotionDesignerState;
}

export function DesignTab({ element, state }: DesignTabProps) {
  const actions = useMotionDesignerActions();
  const handleUpdate = (updates: Partial<ElementNode["props"]>) => {
    actions.updateElement(element.id, updates);
  };

  return (
    <div>
      <PropertySectionRenderer
        sections={propertySections}
        element={element}
        state={state}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
