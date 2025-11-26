import React from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import {
  createDefaultSize,
  createDefaultSizeForFlexChild,
} from "~/lib/motion-designer/defaultSizes";
import { PanZoom, OverlayLayer } from "@editframe/react";
import type { PanZoomTransform } from "@editframe/elements";
import { CanvasRootTimegroup } from "./CanvasRootTimegroup";
import { CanvasRootTimegroupOverlay } from "./CanvasRootTimegroupOverlay";
import { ChildElementOverlays } from "./ChildElementOverlays";
import { DragCreationPreview } from "./DragCreationPreview";
import { CanvasContextMenu } from "./CanvasContextMenu";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";

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
  const panZoomRef = React.useRef<any>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Stable key for PanZoom to prevent remounting - only used for initial props
  const initialTransformKey = React.useRef(
    `${state.ui.canvasTransform.x}-${state.ui.canvasTransform.y}-${state.ui.canvasTransform.scale}`,
  );

  // Helper to read transform values for child components that still need them
  // TODO: These child components should be refactored to not need manual transform values
  const getTransformValues = () => {
    if (panZoomRef.current) {
      return {
        scale: panZoomRef.current.scale ?? 1,
        x: panZoomRef.current.x ?? 0,
        y: panZoomRef.current.y ?? 0,
      };
    }
    return { scale: 1, x: 0, y: 0 };
  };

  // Handle transform changes from PanZoom
  const handleTransformChanged = React.useCallback(
    (e: CustomEvent<PanZoomTransform>) => {
      const newTransform = e.detail;

      // Update application state for persistence
      // Note: OverlayLayer reads directly from PanZoom element via DOM query
      actions.updateCanvasTransform(newTransform);
    },
    [actions],
  );

  // Sync state changes to PanZoom (e.g., from reset button or loading a project)
  // This allows external updates to PanZoom while still letting PanZoom control transforms during user interaction
  React.useEffect(() => {
    const panZoomElement = panZoomRef.current;
    if (!panZoomElement) return;

    // Only update if PanZoom's current values differ from state (external change)
    const currentX = panZoomElement.x ?? 0;
    const currentY = panZoomElement.y ?? 0;
    const currentScale = panZoomElement.scale ?? 1;

    const stateX = state.ui.canvasTransform.x;
    const stateY = state.ui.canvasTransform.y;
    const stateScale = state.ui.canvasTransform.scale;

    // If state differs from PanZoom, update PanZoom (external change like reset button)
    // OverlayLayer will automatically discover the new transform via its RAF loop
    if (
      Math.abs(currentX - stateX) > 0.01 ||
      Math.abs(currentY - stateY) > 0.01 ||
      Math.abs(currentScale - stateScale) > 0.01
    ) {
      panZoomElement.x = stateX;
      panZoomElement.y = stateY;
      panZoomElement.scale = stateScale;
    }
  }, [
    state.ui.canvasTransform.x,
    state.ui.canvasTransform.y,
    state.ui.canvasTransform.scale,
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle drag-to-create if clicking directly on canvas background (not on PanZoom or its children)
    // PanZoom uses pointer events, so mouse events on PanZoom should be ignored here
    const target = e.target as HTMLElement;
    if (target === e.currentTarget || target.closest("ef-pan-zoom")) {
      // If clicking on PanZoom, let it handle pointer events - don't interfere
      if (target.closest("ef-pan-zoom")) {
        return;
      }

      const now = Date.now();
      lastClickTimeRef.current = now;

      clickStartRef.current = { x: e.clientX, y: e.clientY, time: now };
      hasDraggedRef.current = false;

      // If in placement mode (and not text), start drag-to-create
      if (state.ui.placementMode && state.ui.placementMode !== "text") {
        e.preventDefault();
        e.stopPropagation();
        if (panZoomRef.current) {
          const canvasPos = panZoomRef.current.screenToCanvas(
            e.clientX,
            e.clientY,
          );
          setDragStart({ canvasX: canvasPos.x, canvasY: canvasPos.y });
          setDragCurrent({ canvasX: canvasPos.x, canvasY: canvasPos.y });
        }
        return; // Don't start panning when creating element
      }
      // Otherwise, let PanZoom handle panning via pointer events
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle drag-to-create (only if we're dragging to create)
    if (dragStart && panZoomRef.current) {
      const canvasPos = panZoomRef.current.screenToCanvas(e.clientX, e.clientY);
      setDragCurrent({ canvasX: canvasPos.x, canvasY: canvasPos.y });
      hasDraggedRef.current = true;
      return; // Don't pan when dragging to create
    }

    // Track if we've dragged (for click detection)
    if (clickStartRef.current) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - clickStartRef.current.x, 2) +
          Math.pow(e.clientY - clickStartRef.current.y, 2),
      );
      if (distance > 5) {
        hasDraggedRef.current = true;
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Handle drag-to-create completion
    if (
      dragStart &&
      dragCurrent &&
      state.ui.placementMode &&
      state.ui.placementMode !== "text" &&
      panZoomRef.current
    ) {
      const canvasPos = panZoomRef.current.screenToCanvas(e.clientX, e.clientY);
      const canvasX = canvasPos.x;
      const canvasY = canvasPos.y;

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

      setDragStart(null);
      setDragCurrent(null);
      hasDraggedRef.current = false;
      clickStartRef.current = null;
      return;
    }

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
      if (!rect || !panZoomRef.current) return;

      const canvasPos = panZoomRef.current.screenToCanvas(e.clientX, e.clientY);
      const canvasX = canvasPos.x;
      const canvasY = canvasPos.y;

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
      if (!rect || !panZoomRef.current) return;

      const canvasPos = panZoomRef.current.screenToCanvas(e.clientX, e.clientY);
      const canvasX = canvasPos.x;
      const canvasY = canvasPos.y;

      // Only handle text elements via click (others use drag-to-create)
      if (state.ui.placementMode === "text") {
        const activeRootTimegroupId = getActiveRootTimegroupId(state);
        if (activeRootTimegroupId) {
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

  // Forward wheel events to PanZoom so it can handle pan/zoom
  // PanZoom handles wheel events internally, we just need to ensure they reach it
  React.useEffect(() => {
    const container = containerRef.current;
    const panZoomElement = panZoomRef.current;
    if (!container || !panZoomElement) return;

    const wheelHandler = (e: WheelEvent) => {
      // If event is already from PanZoom or its children, let it bubble naturally
      const target = e.target as HTMLElement;
      if (target.closest("ef-pan-zoom")) {
        return; // PanZoom will handle it
      }

      // If in placement mode, allow browser to handle wheel events
      if (state.ui.placementMode && state.ui.placementMode !== "text") {
        return;
      }

      // Prevent default browser zoom/scroll
      e.preventDefault();
      e.stopPropagation();

      // Forward the wheel event to PanZoom so it can handle pan/zoom
      // Create a new event to dispatch to PanZoom (don't bubble to avoid loop)
      const panZoomWheelEvent = new WheelEvent("wheel", {
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        bubbles: false, // Don't bubble to prevent infinite loop
        cancelable: true,
      });

      panZoomElement.dispatchEvent(panZoomWheelEvent);
    };

    container.addEventListener("wheel", wheelHandler, { passive: false });

    return () => {
      container.removeEventListener("wheel", wheelHandler);
    };
  }, [state.ui.placementMode]);

  // Handle global mouse events for drag-to-create
  React.useEffect(() => {
    if (!dragStart) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (panZoomRef.current) {
        const canvasPos = panZoomRef.current.screenToCanvas(
          e.clientX,
          e.clientY,
        );
        setDragCurrent({ canvasX: canvasPos.x, canvasY: canvasPos.y });
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
        if (dragCurrent && panZoomRef.current) {
          const canvasPos = panZoomRef.current.screenToCanvas(
            e.clientX,
            e.clientY,
          );
          const canvasX = canvasPos.x;
          const canvasY = canvasPos.y;

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
  }, [dragStart, dragCurrent, state.ui.placementMode, actions]);

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
      {/* Content layer - scales with zoom, wrapped in PanZoom */}
      {/* PanZoom handles all transforms internally - we pass initial props, then PanZoom controls everything */}
      <PanZoom
        key={initialTransformKey.current}
        ref={panZoomRef}
        x={state.ui.canvasTransform.x}
        y={state.ui.canvasTransform.y}
        scale={state.ui.canvasTransform.scale}
        onTransformChanged={handleTransformChanged}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents:
            state.ui.placementMode && state.ui.placementMode !== "text"
              ? "none"
              : "auto",
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
              canvasScale={getTransformValues().scale}
              showOverlay={false}
            />
          );
        })}
      </PanZoom>

      {/* Overlay layer - does NOT scale, only translates */}
      {/* OverlayLayer reads transform directly from PanZoom element - no React coordination needed */}
      <OverlayLayer
        ref={overlayLayerRef}
        style={{
          position: "absolute",
          inset: 0,
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
                canvasScale={getTransformValues().scale}
              />
              <ChildElementOverlays
                rootTimegroup={element}
                state={state}
                canvasScale={getTransformValues().scale}
                canvasTranslateX={getTransformValues().x}
                canvasTranslateY={getTransformValues().y}
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
              canvasScale={getTransformValues().scale}
              canvasTranslateX={getTransformValues().x}
              canvasTranslateY={getTransformValues().y}
              elementType={state.ui.placementMode}
            />
          )}
      </OverlayLayer>

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
