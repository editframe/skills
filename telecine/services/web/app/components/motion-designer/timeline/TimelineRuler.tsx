import { useRef, useState, useEffect, useMemo } from "react";
import { timeToPixels } from "./timelinePosition";

interface TimelineRulerProps {
  durationMs: number;
  zoomScale: number;
  containerWidth: number;
}

const MIN_SPACING_PX = 100;

export function calculateOptimalInterval(
  width: number,
  durationMs: number,
  minSpacing: number,
): number {
  if (width <= 0 || durationMs <= 0) {
    return 1000; // fallback to 1 second
  }

  const maxMarkers = Math.floor(width / minSpacing);
  if (maxMarkers <= 0) {
    return durationMs; // if container is too small, show only start and end
  }

  const minIntervalMs = durationMs / maxMarkers;
  
  // Use the calculated interval directly (prioritize visual clarity over round numbers)
  return minIntervalMs;
}

export function TimelineRuler({ durationMs, zoomScale, containerWidth }: TimelineRulerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  // Initialize width from getBoundingClientRect on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMeasuredWidth(rect.width);
    }
  }, []);

  // Use ResizeObserver to track container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setMeasuredWidth(width);
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate optimal interval based on zoomed width and duration
  const effectiveWidth = useMemo(() => {
    // Use zoomed width for interval calculation
    return containerWidth * zoomScale;
  }, [containerWidth, zoomScale]);

  const intervalMs = useMemo(() => {
    if (effectiveWidth <= 0) {
      // Fallback to current logic when width not yet measured
      return durationMs < 5000 ? 500 : 1000;
    }
    return calculateOptimalInterval(effectiveWidth, durationMs, MIN_SPACING_PX);
  }, [effectiveWidth, durationMs]);

  if (durationMs <= 0) {
    return null;
  }

  // Generate time markers
  const markers: number[] = [];
  for (let timeMs = 0; timeMs <= durationMs; timeMs += intervalMs) {
    markers.push(timeMs);
  }

  return (
    <div ref={containerRef} className="absolute inset-0 flex pointer-events-none">
      {markers.map((timeMs) => {
        // Use pixel-based positioning with zoom
        const positionPixels = timeToPixels(timeMs, durationMs, containerWidth, zoomScale);
        const timeSeconds = timeMs / 1000;
        const displayTime = timeSeconds % 1 === 0 ? `${timeSeconds}s` : `${timeSeconds.toFixed(1)}s`;
        
        return (
          <div
            key={timeMs}
            className="absolute top-0 bottom-0 flex flex-col items-start"
            style={{ left: `${positionPixels}px` }}
          >
            {/* Tick mark */}
            <div className="w-px h-full bg-gray-600" />
            {/* Time label */}
            <div className="text-xs text-gray-400 font-mono mt-0.5 whitespace-nowrap">
              {displayTime}
            </div>
          </div>
        );
      })}
    </div>
  );
}

