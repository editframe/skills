import { useRef, useState, useEffect, useMemo } from "react";

interface TimelineRulerProps {
  durationMs: number;
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

export function TimelineRuler({ durationMs }: TimelineRulerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Initialize width from getBoundingClientRect on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerWidth(rect.width);
    }
  }, []);

  // Use ResizeObserver to track container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setContainerWidth(width);
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate optimal interval based on width and duration
  const intervalMs = useMemo(() => {
    if (containerWidth <= 0) {
      // Fallback to current logic when width not yet measured
      return durationMs < 5000 ? 500 : 1000;
    }
    return calculateOptimalInterval(containerWidth, durationMs, MIN_SPACING_PX);
  }, [containerWidth, durationMs]);

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
        const positionPercent = (timeMs / durationMs) * 100;
        const timeSeconds = timeMs / 1000;
        const displayTime = timeSeconds % 1 === 0 ? `${timeSeconds}s` : `${timeSeconds.toFixed(1)}s`;
        
        return (
          <div
            key={timeMs}
            className="absolute top-0 bottom-0 flex flex-col items-start"
            style={{ left: `${positionPercent}%` }}
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

