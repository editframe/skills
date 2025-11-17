import React, { useRef, useEffect, useState } from "react";
import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { hasRotateAnimations, parseRotationFromTransform } from "../rendering/styleGenerators/rotationUtils";

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
  const overlayRef = useRef<HTMLDivElement>(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const computedRotationRef = useRef<number | null>(null);
  const [, forceUpdate] = useState({});
  const hasRotateAnims = hasRotateAnimations(element);

  // Continuously measure element using RAF to get actual DOM position
  // This matches the positioning logic from TransformHandles
  // Note: We must call all hooks before any early returns to follow Rules of Hooks
  useEffect(() => {
    // Early return if selected - don't measure for selected elements
    if (isSelected) return;
    let rafId: number;
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE_MS = 16; // ~60fps max update rate
    
    const updateMeasurements = (currentTime: number) => {
      // Throttle updates to reduce jitter during zoom
      if (currentTime - lastUpdateTime < UPDATE_THROTTLE_MS) {
        rafId = requestAnimationFrame(updateMeasurements);
        return;
      }
      lastUpdateTime = currentTime;
      
      const contentElement = document.querySelector(
        `[data-element-id="${element.id}"]`,
      ) as HTMLElement;
      
      // Find the canvas container
      let canvasContainer: HTMLElement | null = null;
      if (overlayRef.current) {
        // Find the overlay layer (has transform translate)
        const overlayLayer = overlayRef.current.closest('[style*="transform"]') as HTMLElement;
        // Canvas container is the parent of the overlay layer
        canvasContainer = overlayLayer?.parentElement as HTMLElement;
      }
      
      // Fallback: find by class selector
      if (!canvasContainer) {
        canvasContainer = document.querySelector('.flex-1.overflow-hidden.relative.bg-gray-950') as HTMLElement;
      }
      
      if (contentElement && canvasContainer) {
        // Find the overlay layer element (parent of overlayRef)
        let overlayLayer: HTMLElement | null = null;
        if (overlayRef.current) {
          overlayLayer = overlayRef.current.parentElement as HTMLElement;
        }
        
        if (!overlayLayer) {
          // Fallback: find overlay layer by traversing up from content element
          const contentParent = contentElement.parentElement;
          if (contentParent) {
            // Content layer is a sibling of overlay layer, both children of canvas container
            const siblings = Array.from(canvasContainer.children);
            overlayLayer = siblings.find(
              (el) => el !== contentParent && (el as HTMLElement).style.transform?.includes('translate')
            ) as HTMLElement | null;
          }
        }
        
        if (contentElement && overlayLayer) {
          // Get actual DOM positions using getBoundingClientRect
          // This gives us the element's position AFTER all CSS transforms (content layer transform)
          const elementRect = contentElement.getBoundingClientRect();
          const overlayLayerRect = overlayLayer.getBoundingClientRect();
          
          // Store intrinsic size (offsetWidth/offsetHeight give layout size before CSS transforms)
          const intrinsicWidth = contentElement.offsetWidth;
          const intrinsicHeight = contentElement.offsetHeight;
          
          // Calculate element's center point (in screen coordinates)
          // When rotated, the bounding box center is the element's rotation center
          const elementCenterX = elementRect.left + elementRect.width / 2;
          const elementCenterY = elementRect.top + elementRect.height / 2;
          
          // Convert element center to overlay layer coordinates
          const elementCenterOverlayX = elementCenterX - overlayLayerRect.left;
          const elementCenterOverlayY = elementCenterY - overlayLayerRect.top;
          
          // Calculate overlay size in screen coordinates (scaled, matching render logic)
          const screenWidth = intrinsicWidth * canvasScale;
          const screenHeight = intrinsicHeight * canvasScale;
          
          // Position overlay so its center aligns with element's center
          // Both rotate around their centers, so centers must match exactly
          const overlayX = elementCenterOverlayX - screenWidth / 2;
          const overlayY = elementCenterOverlayY - screenHeight / 2;
          
          // Read computed rotation from DOM when rotate animations are active
          if (hasRotateAnims) {
            const computedStyle = window.getComputedStyle(contentElement);
            const transform = computedStyle.transform;
            const computedRot = parseRotationFromTransform(transform);
            if (computedRot !== computedRotationRef.current) {
              computedRotationRef.current = computedRot;
              forceUpdate({});
            }
          } else {
            computedRotationRef.current = null;
          }
          
          // Update if position or dimensions changed (with larger threshold to reduce jitter)
          const positionChanged = 
            Math.abs(positionRef.current.x - overlayX) > 1 ||
            Math.abs(positionRef.current.y - overlayY) > 1;
          const dimensionsChanged = 
            intrinsicWidth > 0 && intrinsicHeight > 0 &&
            (Math.abs(dimensionsRef.current.width - intrinsicWidth) > 1 ||
             Math.abs(dimensionsRef.current.height - intrinsicHeight) > 1);
          
          if (positionChanged || dimensionsChanged) {
            positionRef.current = { x: overlayX, y: overlayY };
            if (intrinsicWidth > 0 && intrinsicHeight > 0) {
              dimensionsRef.current = { 
                width: intrinsicWidth, 
                height: intrinsicHeight,
              };
            }
            forceUpdate({});
          }
        }
      }
      
      rafId = requestAnimationFrame(updateMeasurements);
    };
    
    rafId = requestAnimationFrame(updateMeasurements);
    
    return () => cancelAnimationFrame(rafId);
  }, [element.id, element.props.position, element.props.size, state, canvasScale, canvasTranslateX, canvasTranslateY, isSelected, hasRotateAnims]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent canvas pan/zoom and timegroup selection
    
    // If placement mode is active and this element can contain children, place the new element inside
    if (state.ui.placementMode) {
      // Only timegroups and divs can contain children
      const canContainChildren = element.type === "timegroup" || element.type === "div";
      
      if (canContainChildren) {
        // Don't allow placing timegroups inside other timegroups (only at root level)
        if (state.ui.placementMode === "timegroup" && element.type === "timegroup") {
          console.warn("Cannot place nested timegroups. Timegroups must be at root level.");
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
          size: { width: 200, height: 100 },
          fill: { enabled: true, color: "#FFFFFF" },
        };

        const elementType = state.ui.placementMode as ElementNode["type"];
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
        actions.setPlacementMode(null);
        return;
      }
    }
    
    // Otherwise, select the element
    actions.selectElement(element.id);
  };

  // Only render overlay for unselected elements
  // Selected elements are handled by TransformHandles
  if (isSelected) return null;

  // Use element props for size (source of truth), fallback to measured dimensions if not set
  const overlayWidth = element.props.size?.width ?? dimensionsRef.current.width;
  const overlayHeight = element.props.size?.height ?? dimensionsRef.current.height;
  // Use computed rotation from DOM when rotate animations are active, otherwise use design property
  const currentRotation = hasRotateAnims && computedRotationRef.current !== null
    ? computedRotationRef.current
    : element.props.rotation ?? 0;
  
  // Position overlay using actual DOM measurements
  // positionRef.current contains overlay layer coordinates (already converted from screen coords)
  const screenX = positionRef.current.x;
  const screenY = positionRef.current.y;
  const screenWidth = overlayWidth * canvasScale;
  const screenHeight = overlayHeight * canvasScale;

  return (
    <div
      ref={overlayRef}
      className="absolute pointer-events-auto cursor-pointer"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
        transform: `rotate(${currentRotation}deg)`,
        transformOrigin: "center",
        zIndex: 5, // Lower than TransformHandles (z-index: 10) so handles take precedence when selected
        // Invisible but clickable
        background: "transparent",
      }}
      onClick={handleClick}
    />
  );
}

