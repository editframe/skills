import React from "react";
import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import { ElementRenderer } from "../rendering/ElementRenderer";

interface CanvasRootTimegroupProps {
  element: ElementNode;
  state: MotionDesignerState;
  canvasScale: number;
  showOverlay: boolean;
}

export function CanvasRootTimegroup({
  element,
  state,
  canvasScale,
  showOverlay,
}: CanvasRootTimegroupProps) {
  const position = element.props?.canvasPosition || { x: 0, y: 0 };
  const size = element.props?.size || { width: 960, height: 540 };
  
  return (
    <div
      data-timegroup-id={element.id}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        border: state.ui.selectedElementId === element.id ? "2px solid #3b82f6" : "1px solid #374151",
        containerType: "size",
      }}
    >
      <ElementRenderer
        element={element}
        state={state}
        currentTime={state.ui.currentTime}
      />
    </div>
  );
}

