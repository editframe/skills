import { useRef, useLayoutEffect, useState } from "react";
import type {
  ElementNode,
  MotionDesignerState,
} from "~/lib/motion-designer/types";
import { ElementRenderer } from "../rendering/ElementRenderer";
import { getSizeDimensions } from "~/lib/motion-designer/sizingUtils";

interface CanvasRootTimegroupProps {
  element: ElementNode;
  state: MotionDesignerState;
  showOverlay: boolean;
}

export function CanvasRootTimegroup({
  element,
  state,
}: CanvasRootTimegroupProps) {
  const position = element.props?.canvasPosition || { x: 0, y: 0 };
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState<{
    width: number;
    height: number;
  }>(() => {
    const sizeDimensions = getSizeDimensions(element.props?.size);
    return {
      width: sizeDimensions.width || 960,
      height: sizeDimensions.height || 540,
    };
  });

  // Read dimensions on-demand when element or size changes
  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

      // Find the actual ef-timegroup element inside the wrapper
      const timegroupElement = wrapperRef.current.querySelector(
        `ef-timegroup#${element.id}`,
      ) as HTMLElement;
      const measureElement = timegroupElement || wrapperRef.current;

      // Use offsetWidth/offsetHeight which gives us the intrinsic size
      const width = measureElement.offsetWidth;
      const height = measureElement.offsetHeight;

    // Update if dimensions are valid
      if (width > 0 && height > 0) {
      setDisplaySize({ width, height });
      }
  }, [element.id, element.props?.size]);

  return (
    <div
      ref={wrapperRef}
      data-timegroup-id={element.id}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${displaySize.width}px`,
        height: `${displaySize.height}px`,
        border:
          state.ui.selectedElementId === element.id
            ? "2px solid #3b82f6"
            : "1px solid #374151",
        containerType: "size",
      }}
    >
      <ElementRenderer
        element={element}
        state={state}
      />
    </div>
  );
}
