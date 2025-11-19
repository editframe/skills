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
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
  };
}

export function useTimelineZoom({
  durationMs,
  containerWidth,
  containerRef,
}: UseTimelineZoomOptions): UseTimelineZoomReturn {
  const [zoomScale, setZoomScale] = useState(DEFAULT_ZOOM);
  const pinchStartRef = useRef<{
    distance: number;
    centerTimeMs: number;
    scale: number;
  } | null>(null);

  const clampZoom = useCallback((scale: number): number => {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
  }, []);

  const setZoomWithCenter = useCallback(
    (newScale: number, centerTimeMs?: number) => {
      const clampedScale = clampZoom(newScale);
      
      // Use functional update to get current zoom scale
      setZoomScale((currentScale) => {
        // If center point provided, maintain it during zoom
        if (centerTimeMs !== undefined && containerRef.current) {
          const container = containerRef.current;
          const scrollLeft = container.scrollLeft;
          const currentPixelsPerSecond =
            (containerWidth * currentScale) / durationMs;
          const newPixelsPerSecond = (containerWidth * clampedScale) / durationMs;

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
    [clampZoom, containerRef, containerWidth, durationMs],
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

      // Get current zoom scale from state using a ref or functional update
      setZoomScale((currentZoomScale) => {
        // Calculate mouse position relative to container
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const scrollLeft = container.scrollLeft;

        // Calculate the time at the mouse position before zoom
        const currentPixelsPerSecond = (containerWidth * currentZoomScale) / durationMs;
        const mouseTimeMs =
          ((scrollLeft + mouseX) / currentPixelsPerSecond) * 1000;

        // Calculate new zoom scale
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const newScale = clampZoom(currentZoomScale * delta);

        // Update zoom maintaining center point
        if (containerRef.current) {
          const container = containerRef.current;
          const scrollLeft = container.scrollLeft;
          const currentPixelsPerSecond = (containerWidth * currentZoomScale) / durationMs;
          const newPixelsPerSecond = (containerWidth * newScale) / durationMs;

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
      containerWidth,
      clampZoom,
    ],
  );

  const getTouchDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getTouchCenterTime = useCallback(
    (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const container = containerRef.current;
      if (!container || durationMs <= 0) return 0;

      const rect = container.getBoundingClientRect();
      const centerX =
        (touches[0].clientX + touches[1].clientX) / 2 - rect.left;
      const scrollLeft = container.scrollLeft;

      const currentPixelsPerSecond = (containerWidth * zoomScale) / durationMs;
      return ((scrollLeft + centerX) / currentPixelsPerSecond) * 1000;
    },
    [containerRef, durationMs, containerWidth, zoomScale],
  );

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const distance = getTouchDistance(e.touches);
        const centerTimeMs = getTouchCenterTime(e.touches);
        pinchStartRef.current = {
          distance,
          centerTimeMs,
          scale: zoomScale,
        };
      } else {
        pinchStartRef.current = null;
      }
    },
    [getTouchDistance, getTouchCenterTime, zoomScale],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartRef.current) {
        e.preventDefault(); // Prevent browser swipe gestures

        const currentDistance = getTouchDistance(e.touches);
        const scaleDelta = currentDistance / pinchStartRef.current.distance;
        const newScale = clampZoom(
          pinchStartRef.current.scale * scaleDelta,
        );

        setZoomWithCenter(newScale, pinchStartRef.current.centerTimeMs);
      }
    },
    [getTouchDistance, clampZoom, setZoomWithCenter],
  );

  const onTouchEnd = useCallback(() => {
    pinchStartRef.current = null;
  }, []);

  return {
    zoomScale,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom: setZoomWithCenter,
    handlers: {
      onWheel,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}

