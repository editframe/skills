import React, { useEffect, useRef, useState } from "react";
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
  const initialSize = element.props?.size || { width: 960, height: 540 };
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [actualDimensions, setActualDimensions] = useState<{ width: number; height: number } | null>(null);

  // Sync wrapper div dimensions to actual rendered ef-timegroup dimensions
  useEffect(() => {
    let rafId: number;
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE_MS = 16; // ~60fps max update rate
    
    const updateDimensions = (currentTime: number) => {
      // Throttle updates to reduce jitter
      if (currentTime - lastUpdateTime < UPDATE_THROTTLE_MS) {
        rafId = requestAnimationFrame(updateDimensions);
        return;
      }
      lastUpdateTime = currentTime;
      
      if (!wrapperRef.current) {
        rafId = requestAnimationFrame(updateDimensions);
        return;
      }
      
      // Find the actual ef-timegroup element inside the wrapper
      const timegroupElement = wrapperRef.current.querySelector(`ef-timegroup#${element.id}`) as HTMLElement;
      const measureElement = timegroupElement || wrapperRef.current;
      
      // Use offsetWidth/offsetHeight which gives us the intrinsic size
      const width = measureElement.offsetWidth;
      const height = measureElement.offsetHeight;
      
      // Only update if dimensions actually changed (larger threshold to reduce jitter)
      if (width > 0 && height > 0) {
        setActualDimensions((prev) => {
          if (!prev || Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1) {
            return { width, height };
          }
          return prev;
        });
      }
      
      rafId = requestAnimationFrame(updateDimensions);
    };
    
    rafId = requestAnimationFrame(updateDimensions);
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [element.id, canvasScale]);

  // Use actual dimensions if available, otherwise fall back to initial size
  const displaySize = actualDimensions || initialSize;
  
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

