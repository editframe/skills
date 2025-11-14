import React from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import { usePanZoom } from "./usePanZoom";
import { CanvasRootTimegroup } from "./CanvasRootTimegroup";
import { CanvasRootTimegroupOverlay } from "./CanvasRootTimegroupOverlay";
import { ChildElementOverlays } from "./ChildElementOverlays";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";

interface CanvasProps {
  state: MotionDesignerState;
}

export function Canvas({ state }: CanvasProps) {
  const actions = useMotionDesignerActions();
  const clickStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const hasDraggedRef = React.useRef(false);

  const { transform, containerRef, handlers } = usePanZoom(
    state.ui.canvasTransform,
    actions.updateCanvasTransform,
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle pan if clicking directly on canvas background
    // Don't interfere with child element interactions
    if (e.target === e.currentTarget) {
      clickStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      hasDraggedRef.current = false;
      handlers.onMouseDown(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only handle pan if we started on canvas background
    if (clickStartRef.current && e.target === e.currentTarget) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - clickStartRef.current.x, 2) +
          Math.pow(e.clientY - clickStartRef.current.y, 2),
      );
      if (distance > 5) {
        hasDraggedRef.current = true;
      }
      handlers.onMouseMove(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    handlers.onMouseUp(e);
    // Don't reset hasDraggedRef here - we need it for the click handler
    // It will be reset on the next mousedown
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only handle clicks on the canvas background, not on elements
    // Don't handle if we've dragged or if it's been too long since mousedown
    if (
      e.target === e.currentTarget &&
      state.ui.placementMode &&
      !hasDraggedRef.current &&
      clickStartRef.current &&
      Date.now() - clickStartRef.current.time < 300
    ) {
      // Get click position in canvas coordinates
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
      const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;

      // Timegroups can ONLY be placed at the root level
      if (state.ui.placementMode === "timegroup") {
        actions.addElement(
          {
            type: "timegroup",
            parentId: null,
            childIds: [],
            props: {
              mode: "fixed",
              duration: "5s",
              canvasPosition: { x: canvasX, y: canvasY },
              size: { width: 960, height: 540 },
            },
            animations: [],
          },
          null, // parentId = null for root timegroups
        );
        actions.setPlacementMode(null);
      }
      // Other elements go inside the active root timegroup
      else {
        const activeRootTimegroupId = getActiveRootTimegroupId(state);
        if (activeRootTimegroupId) {
          const elementType = state.ui.placementMode as import("~/lib/motion-designer/types").ElementNode["type"];
          
          // Set default props based on element type
          const defaultProps: any = {
            position: { x: canvasX, y: canvasY },
            size: { width: 200, height: 100 },
            fill: { enabled: true, color: "#FFFFFF" },
          };

          if (elementType === "text") {
            defaultProps.content = "Text";
            defaultProps.fontSize = 32;
            defaultProps.textAlign = "left";
            defaultProps.fill = { enabled: true, color: "#000000" };
            defaultProps.split = "word";
            defaultProps.stagger = "0ms";
            defaultProps.easing = "linear";
          } else if (elementType === "div") {
            defaultProps.fill = { enabled: true, color: "#9333EA" };
          } else if (elementType === "image" || elementType === "video") {
            defaultProps.size = { width: 400, height: 300 };
          }
          
          actions.addElement(
            {
              type: elementType,
              parentId: activeRootTimegroupId,
              childIds: [],
              props: defaultProps,
              animations: [],
            },
            activeRootTimegroupId,
          );
          actions.setPlacementMode(null);
        }
      }
    }
    // Reset for next interaction
    clickStartRef.current = null;
    hasDraggedRef.current = false;
  };

  // Add wheel event listener with passive: false
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wheelHandler = (e: WheelEvent) => {
      handlers.onWheel(e as any);
    };

    container.addEventListener("wheel", wheelHandler, { passive: false });

    return () => {
      container.removeEventListener("wheel", wheelHandler);
    };
  }, [handlers]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative bg-gray-950"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{
        touchAction: "none",
        overscrollBehavior: "none",
        overscrollBehaviorX: "none",
        overscrollBehaviorY: "none",
        WebkitOverflowScrolling: "auto",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        // Extra protection against browser navigation
        position: "relative",
        isolation: "isolate",
      }}
    >
      {/* Content layer - scales with zoom */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          touchAction: "none",
        }}
      >
        {state.composition.rootTimegroupIds.map((id) => {
          const element = state.composition.elements[id];
          if (!element) return null;
          return (
                <CanvasRootTimegroup
                  key={id}
                  element={element}
                  state={state}
                  canvasScale={transform.scale}
                  showOverlay={false}
                />
          );
        })}
      </div>
      
      {/* Overlay layer - does NOT scale, only translates */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px)`,
          transformOrigin: "0 0",
          pointerEvents: "auto",
        }}
      >
        {state.composition.rootTimegroupIds.map((id) => {
          const element = state.composition.elements[id];
          if (!element) return null;
          return (
            <React.Fragment key={id}>
              <CanvasRootTimegroupOverlay
                element={element}
                state={state}
                canvasScale={transform.scale}
              />
              <ChildElementOverlays
                rootTimegroup={element}
                state={state}
                canvasScale={transform.scale}
                canvasTranslateX={transform.x}
                canvasTranslateY={transform.y}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

