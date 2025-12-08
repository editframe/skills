import { useEffect, useState } from "react";
import type { EFPanZoom } from "@editframe/elements";

/**
 * Hook to get PanZoom scale from DOM context.
 * Reads scale from PanZoom element found via OverlayLayer parent.
 * This allows components inside OverlayLayer to derive scale without props.
 */
export function usePanZoomScale(): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const findAndUpdate = () => {
      // Find OverlayLayer (components using this hook are rendered inside it)
      const overlayLayer = document.querySelector("ef-overlay-layer");
      if (!overlayLayer) {
        setScale(1);
        return;
      }

      // Find PanZoom element (sibling of OverlayLayer)
      const container = overlayLayer.parentElement;
      const panZoomElement = container?.querySelector("ef-pan-zoom") as EFPanZoom | null;
      
      if (panZoomElement && typeof panZoomElement.scale === "number") {
        setScale(panZoomElement.scale);
      } else {
        setScale(1);
      }
    };

    // Initial update
    findAndUpdate();

    // Listen for transform changes from PanZoom
    const overlayLayer = document.querySelector("ef-overlay-layer");
    if (overlayLayer) {
      const container = overlayLayer.parentElement;
      const panZoomElement = container?.querySelector("ef-pan-zoom") as EFPanZoom | null;
      
      if (panZoomElement) {
        const handleTransformChanged = () => {
          if (typeof panZoomElement.scale === "number") {
            setScale(panZoomElement.scale);
          }
        };

        panZoomElement.addEventListener("transform-changed", handleTransformChanged);
        
        return () => {
          panZoomElement.removeEventListener("transform-changed", handleTransformChanged);
        };
      }
    }
  }, []);

  return scale;
}

