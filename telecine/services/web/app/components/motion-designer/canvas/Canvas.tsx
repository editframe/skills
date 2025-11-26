import React from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import {
  createDefaultSize,
  createDefaultSizeForFlexChild,
  isFlexChild,
} from "~/lib/motion-designer/defaultSizes";
import { usePanZoom } from "./usePanZoom";
import { CanvasRootTimegroup } from "./CanvasRootTimegroup";
import { CanvasRootTimegroupOverlay } from "./CanvasRootTimegroupOverlay";
import { ChildElementOverlays } from "./ChildElementOverlays";
import { DragCreationPreview } from "./DragCreationPreview";
import { CanvasContextMenu } from "./CanvasContextMenu";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { OverlayUpdateLoop } from "./OverlayUpdateLoop";

interface CanvasProps {
  state: MotionDesignerState;
}

export function Canvas({ state }: CanvasProps) {
  const actions = useMotionDesignerActions();
  const clickStartRef = React.useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const hasDraggedRef = React.useRef(false);
  const [dragStart, setDragStart] = React.useState<{
    canvasX: number;
    canvasY: number;
  } | null>(null);
  const [dragCurrent, setDragCurrent] = React.useState<{
    canvasX: number;
    canvasY: number;
  } | null>(null);
  const [canvasContextMenu, setCanvasContextMenu] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const lastClickTimeRef = React.useRef<number>(0);
  const overlayLayerRef = React.useRef<HTMLDivElement>(null);

  const { transform, containerRef, handlers } = usePanZoom(
    state.ui.canvasTransform,
    actions.updateCanvasTransform,
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle pan if clicking directly on canvas background
    // Don't interfere with child element interactions
    if (e.target === e.currentTarget) {
      const now = Date.now();
      const isDoubleClick = now - lastClickTimeRef.current < 300;
      lastClickTimeRef.current = now;

      clickStartRef.current = { x: e.clientX, y: e.clientY, time: now };
      hasDraggedRef.current = false;

      // If in placement mode (and not text), start drag-to-create
      if (state.ui.placementMode && state.ui.placementMode !== "text") {
        e.preventDefault();
        e.stopPropagation();
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const canvasX =
            (e.clientX - rect.left - transform.x) / transform.scale;
          const canvasY =
            (e.clientY - rect.top - transform.y) / transform.scale;
          setDragStart({ canvasX, canvasY });
          setDragCurrent({ canvasX, canvasY });
        }
        return; // Don't start panning when creating element
      }

      handlers.onMouseDown(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle drag-to-create (only if we're dragging to create)
    if (dragStart) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
        const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;
        setDragCurrent({ canvasX, canvasY });
        hasDraggedRef.current = true;
      }
      return; // Don't pan when dragging to create
    }

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
    // Handle drag-to-create completion
    if (
      dragStart &&
      dragCurrent &&
      state.ui.placementMode &&
      state.ui.placementMode !== "text"
    ) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
        const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;

        const finalX = Math.min(dragStart.canvasX, canvasX);
        const finalY = Math.min(dragStart.canvasY, canvasY);
        const finalWidth = Math.abs(canvasX - dragStart.canvasX);
        const finalHeight = Math.abs(canvasY - dragStart.canvasY);

        // Only create if drag was significant (or if it's a timegroup, allow any size)
        if (
          (finalWidth > 10 && finalHeight > 10) ||
          state.ui.placementMode === "timegroup"
        ) {
          const elementType = state.ui
            .placementMode as import("~/lib/motion-designer/types").ElementNode["type"];

          // Timegroups can ONLY be placed at the root level
          if (elementType === "timegroup") {
            // Use minimum size if drag was too small
            const width = finalWidth > 10 ? finalWidth : 960;
            const height = finalHeight > 10 ? finalHeight : 540;
            actions.addElement(
              {
                type: "timegroup",
                parentId: null,
                childIds: [],
                props: {
                  mode: "fixed",
                  duration: "5s",
                  canvasPosition: { x: finalX, y: finalY },
                  size: createDefaultSize("timegroup", width, height),
                },
                animations: [],
              },
              null,
            );
          } else {
            // Other elements go inside the active root timegroup
            const activeRootTimegroupId = getActiveRootTimegroupId(state);
            if (activeRootTimegroupId) {
              const parentElement =
                state.composition.elements[activeRootTimegroupId];
              const isParentFlex = parentElement?.props.display === "flex";

              const defaultProps: any = {
                position: { x: finalX, y: finalY },
                fill: { enabled: true, color: "#FFFFFF" },
              };

              // Use appropriate default size based on context
              if (isParentFlex) {
                defaultProps.size = createDefaultSizeForFlexChild(elementType);
              } else {
                defaultProps.size = createDefaultSize(
                  elementType,
                  finalWidth,
                  finalHeight,
                );
              }

              if (elementType === "div") {
                defaultProps.fill = { enabled: true, color: "#9333EA" };
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
            }
          }
        }
      }

      setDragStart(null);
      setDragCurrent(null);
      hasDraggedRef.current = false;
      clickStartRef.current = null;
      return;
    }

    handlers.onMouseUp(e);
    // Don't reset hasDraggedRef here - we need it for the click handler
    // It will be reset on the next mousedown
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    // Handle double-click to create element with default size
    if (
      e.target === e.currentTarget &&
      state.ui.placementMode &&
      state.ui.placementMode !== "text"
    ) {
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
      const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;

      const elementType = state.ui
        .placementMode as import("~/lib/motion-designer/types").ElementNode["type"];

      // Timegroups can ONLY be placed at the root level
      if (elementType === "timegroup") {
        actions.addElement(
          {
            type: "timegroup",
            parentId: null,
            childIds: [],
            props: {
              mode: "fixed",
              duration: "5s",
              canvasPosition: { x: canvasX, y: canvasY },
              size: createDefaultSize("timegroup", 960, 540),
            },
            animations: [],
          },
          null,
        );
      } else {
        // Other elements go inside the active root timegroup
        const activeRootTimegroupId = getActiveRootTimegroupId(state);
        if (activeRootTimegroupId) {
          const parentElement =
            state.composition.elements[activeRootTimegroupId];
          const isParentFlex = parentElement?.props.display === "flex";

          const defaultProps: any = {
            position: { x: canvasX, y: canvasY },
            fill: { enabled: true, color: "#FFFFFF" },
          };

          // Use appropriate default size based on context and element type
          if (isParentFlex) {
            defaultProps.size = createDefaultSizeForFlexChild(elementType);
          } else {
            if (elementType === "image" || elementType === "video") {
              defaultProps.size = createDefaultSize(elementType, 400, 300);
            } else {
              defaultProps.size = createDefaultSize(elementType, 200, 100);
            }
          }

          if (elementType === "div") {
            defaultProps.fill = { enabled: true, color: "#9333EA" };
          } else if (elementType === "captions") {
            defaultProps.showBefore = true;
            defaultProps.showAfter = true;
            defaultProps.showActive = true;
            defaultProps.showSegment = true;
          } else if (elementType === "waveform") {
            defaultProps.mode = "bars";
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
        }
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Don't handle click if we're in drag-to-create mode (non-text elements)
    if (
      dragStart ||
      (state.ui.placementMode && state.ui.placementMode !== "text")
    ) {
      return;
    }

    // Only handle clicks on the canvas background, not on elements
    if (
      e.target === e.currentTarget &&
      !hasDraggedRef.current &&
      clickStartRef.current &&
      Date.now() - clickStartRef.current.time < 300
    ) {
      // If not in placement mode, deselect any selected element
      if (!state.ui.placementMode) {
        actions.selectElement(null);
        clickStartRef.current = null;
        hasDraggedRef.current = false;
        return;
      }

      // Handle placement mode (text elements)
      // Get click position in canvas coordinates
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
      const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;

      // Only handle text elements via click (others use drag-to-create)
      if (state.ui.placementMode === "text") {
        const activeRootTimegroupId = getActiveRootTimegroupId(state);
        if (activeRootTimegroupId) {
          const parentElement =
            state.composition.elements[activeRootTimegroupId];
          const isParentFlex = parentElement?.props.display === "flex";

          const defaultProps: any = {
            position: { x: canvasX, y: canvasY },
            content: "Text",
            fontSize: 32,
            textAlign: "left",
            fill: { enabled: true, color: "#000000" },
            split: "word",
            stagger: "0ms",
            easing: "linear",
          };

          // Text elements default to hug mode (size to content)
          defaultProps.size = createDefaultSize("text", 0, 0);

          actions.addElement(
            {
              type: "text",
              parentId: activeRootTimegroupId,
              childIds: [],
              props: defaultProps,
              animations: [],
            },
            activeRootTimegroupId,
          );
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

  // Handle global mouse events for drag-to-create
  React.useEffect(() => {
    if (!dragStart) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
        const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;
        setDragCurrent({ canvasX, canvasY });
        hasDraggedRef.current = true;
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (
        dragStart &&
        state.ui.placementMode &&
        state.ui.placementMode !== "text"
      ) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && dragCurrent) {
          const canvasX =
            (e.clientX - rect.left - transform.x) / transform.scale;
          const canvasY =
            (e.clientY - rect.top - transform.y) / transform.scale;

          const finalX = Math.min(dragStart.canvasX, canvasX);
          const finalY = Math.min(dragStart.canvasY, canvasY);
          const finalWidth = Math.abs(canvasX - dragStart.canvasX);
          const finalHeight = Math.abs(canvasY - dragStart.canvasY);

          // Create element (use minimum size if drag was too small)
          const elementType = state.ui
            .placementMode as import("~/lib/motion-designer/types").ElementNode["type"];

          // Timegroups can ONLY be placed at the root level
          if (elementType === "timegroup") {
            // Use minimum size if drag was too small
            const width = finalWidth > 10 ? finalWidth : 960;
            const height = finalHeight > 10 ? finalHeight : 540;
            actions.addElement(
              {
                type: "timegroup",
                parentId: null,
                childIds: [],
                props: {
                  mode: "fixed",
                  duration: "5s",
                  canvasPosition: { x: finalX, y: finalY },
                  size: createDefaultSize("timegroup", width, height),
                },
                animations: [],
              },
              null,
            );
          } else {
            // Other elements go inside the active root timegroup
            const activeRootTimegroupId = getActiveRootTimegroupId(state);
            if (activeRootTimegroupId) {
              // Only create if drag was significant
              if (finalWidth > 10 && finalHeight > 10) {
                const parentElement =
                  state.composition.elements[activeRootTimegroupId];
                const isParentFlex = parentElement?.props.display === "flex";

                const defaultProps: any = {
                  position: { x: finalX, y: finalY },
                  fill: { enabled: true, color: "#FFFFFF" },
                };

                // Use appropriate default size based on context
                if (isParentFlex) {
                  defaultProps.size =
                    createDefaultSizeForFlexChild(elementType);
                } else {
                  defaultProps.size = createDefaultSize(
                    elementType,
                    finalWidth,
                    finalHeight,
                  );
                }

                if (elementType === "div") {
                  defaultProps.fill = { enabled: true, color: "#9333EA" };
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
              }
            }
          }
        }
      }

      setDragStart(null);
      setDragCurrent(null);
      hasDraggedRef.current = false;
      clickStartRef.current = null;
    };

    document.addEventListener("mousemove", handleGlobalMouseMove, {
      passive: false,
    });
    document.addEventListener("mouseup", handleGlobalMouseUp, {
      passive: false,
    });

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [dragStart, dragCurrent, state.ui.placementMode, transform, actions]);

  // Determine cursor based on placement mode
  const getCursor = () => {
    if (state.ui.placementMode) {
      // Text uses text cursor, others use crosshair
      return state.ui.placementMode === "text" ? "text" : "crosshair";
    }
    return "default";
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    // Only show context menu if clicking on canvas background
    if (e.target === e.currentTarget) {
      e.preventDefault();
      setCanvasContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative bg-gray-950"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onDoubleClick={handleCanvasDoubleClick}
      onContextMenu={handleCanvasContextMenu}
      style={{
        touchAction: "none",
        overscrollBehavior: "none",
        overscrollBehaviorX: "none",
        overscrollBehaviorY: "none",
        WebkitOverflowScrolling: "auto",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        cursor: getCursor(),
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
        ref={overlayLayerRef}
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

        {/* Drag creation preview */}
        {dragStart &&
          dragCurrent &&
          state.ui.placementMode &&
          state.ui.placementMode !== "text" && (
            <DragCreationPreview
              startX={dragStart.canvasX}
              startY={dragStart.canvasY}
              currentX={dragCurrent.canvasX}
              currentY={dragCurrent.canvasY}
              canvasScale={transform.scale}
              canvasTranslateX={transform.x}
              canvasTranslateY={transform.y}
              elementType={state.ui.placementMode}
            />
          )}
      </div>

      {/* Overlay update loop */}
      <OverlayUpdateLoop
        state={state}
        canvasTransform={transform}
        overlayLayerRef={overlayLayerRef}
      />

      {/* Canvas context menu */}
      {canvasContextMenu && (
        <CanvasContextMenu
          x={canvasContextMenu.x}
          y={canvasContextMenu.y}
          onSelectTool={(tool) => {
            actions.setPlacementMode(tool);
          }}
          onClose={() => setCanvasContextMenu(null)}
        />
      )}
    </div>
  );
}
