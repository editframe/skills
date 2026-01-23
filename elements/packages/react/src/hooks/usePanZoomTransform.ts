import { type PanZoomTransform } from "@editframe/elements";
import React, { useEffect, useState } from "react";

/**
 * Hook to get PanZoom transform values from a PanZoom element ref.
 * Listens to transform-changed events to keep transform values in sync.
 *
 * @param panZoomRef - Ref to the PanZoom element
 * @returns Current transform values (scale, x, y)
 *
 * @example
 * const panZoomRef = useRef<EFPanZoom | null>(null);
 * const transform = usePanZoomTransform(panZoomRef);
 * // transform.scale, transform.x, transform.y
 */
export function usePanZoomTransform(
  panZoomRef: React.RefObject<(EventTarget & { scale: number; x: number; y: number }) | null>,
): PanZoomTransform {
  const [transform, setTransform] = useState<PanZoomTransform>({
    scale: 1,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const panZoom = panZoomRef.current;
    if (!panZoom) {
      return;
    }

    // Initialize with current values
    setTransform({
      scale: panZoom.scale ?? 1,
      x: panZoom.x ?? 0,
      y: panZoom.y ?? 0,
    });

    // Listen for transform changes
    const handleTransformChanged = (e: Event) => {
      const customEvent = e as CustomEvent<PanZoomTransform>;
      if (customEvent.detail) {
        setTransform(customEvent.detail);
      } else {
        // Fallback to reading from element if detail is not available
        setTransform({
          scale: panZoom.scale ?? 1,
          x: panZoom.x ?? 0,
          y: panZoom.y ?? 0,
        });
      }
    };

    panZoom.addEventListener("transform-changed", handleTransformChanged);

    return () => {
      panZoom.removeEventListener("transform-changed", handleTransformChanged);
    };
  }, [panZoomRef]);

  return transform;
}
