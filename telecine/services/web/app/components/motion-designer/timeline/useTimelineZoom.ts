import { useState, useRef, useCallback } from "react";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.1; // 10% per step

interface UseTimelineZoomOptions {
  durationMs: number;
  containerWidth: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

interface UseTimelineZoomReturn {
  zoomScale: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoom: (scale: number, centerTimeMs?: number) => void;
  handlers: {
    onWheel: (e: WheelEvent) => void;
  };
}

export function useTimelineZoom({
  durationMs,
  containerWidth,
  containerRef,
}: UseTimelineZoomOptions): UseTimelineZoomReturn {
  const [zoomScale, setZoomScale] = useState(DEFAULT_ZOOM);

  const clampZoom = useCallback((scale: number): number => {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
  }, []);

  const setZoomWithCenter = useCallback(
    (newScale: number, centerTimeMs?: number) => {
      const clampedScale = clampZoom(newScale);
      const BASE_PIXELS_PER_SECOND = 100;
      
      // Use functional update to get current zoom scale
      setZoomScale((currentScale) => {
        // If center point provided, maintain it during zoom
        if (centerTimeMs !== undefined && containerRef.current) {
          const container = containerRef.current;
          const scrollLeft = container.scrollLeft;
          const currentPixelsPerSecond = BASE_PIXELS_PER_SECOND * currentScale;
          const newPixelsPerSecond = BASE_PIXELS_PER_SECOND * clampedScale;

          // Calculate center point position in current zoom
          const centerPixelCurrent = (centerTimeMs / 1000) * currentPixelsPerSecond;
          // Calculate where center point should be in new zoom
          const centerPixelNew = (centerTimeMs / 1000) * newPixelsPerSecond;

          // Adjust scroll to keep center point fixed
          const scrollDelta = centerPixelNew - centerPixelCurrent;
          // Use requestAnimationFrame to ensure DOM has updated
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.scrollLeft = scrollLeft + scrollDelta;
            }
          });
        }
        
        return clampedScale;
      });
    },
    [clampZoom, containerRef, durationMs],
  );

  const zoomIn = useCallback(() => {
    setZoomScale((currentScale) => {
      const newScale = clampZoom(currentScale + ZOOM_STEP);
      return newScale;
    });
  }, [clampZoom]);

  const zoomOut = useCallback(() => {
    setZoomScale((currentScale) => {
      const newScale = clampZoom(currentScale - ZOOM_STEP);
      return newScale;
    });
  }, [clampZoom]);

  const resetZoom = useCallback(() => {
    setZoomScale(DEFAULT_ZOOM);
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  }, [containerRef]);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const container = containerRef.current;
      if (!container || durationMs <= 0) return;

      const BASE_PIXELS_PER_SECOND = 100;

      // Get current zoom scale from state using a ref or functional update
      setZoomScale((currentZoomScale) => {
        // Calculate mouse position relative to container
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const scrollLeft = container.scrollLeft;

        // Calculate the time at the mouse position before zoom
        const currentPixelsPerSecond = BASE_PIXELS_PER_SECOND * currentZoomScale;
        const mouseTimeMs =
          ((scrollLeft + mouseX) / currentPixelsPerSecond) * 1000;

        // Calculate new zoom scale
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const newScale = clampZoom(currentZoomScale * delta);

        // Update zoom maintaining center point
        if (containerRef.current) {
          const container = containerRef.current;
          const scrollLeft = container.scrollLeft;
          const currentPixelsPerSecond = BASE_PIXELS_PER_SECOND * currentZoomScale;
          const newPixelsPerSecond = BASE_PIXELS_PER_SECOND * newScale;

          // Calculate center point position in current zoom
          const centerPixelCurrent = (mouseTimeMs / 1000) * currentPixelsPerSecond;
          // Calculate where center point should be in new zoom
          const centerPixelNew = (mouseTimeMs / 1000) * newPixelsPerSecond;

          // Adjust scroll to keep center point fixed
          const scrollDelta = centerPixelNew - centerPixelCurrent;
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.scrollLeft = scrollLeft + scrollDelta;
            }
          });
        }

        return newScale;
      });
    },
    [
      containerRef,
      durationMs,
      clampZoom,
    ],
  );

  return {
    zoomScale,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom: setZoomWithCenter,
    handlers: {
      onWheel,
    },
  };
}

