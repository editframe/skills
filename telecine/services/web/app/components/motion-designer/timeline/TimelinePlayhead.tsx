import { useRef } from "react";
import { useTimelineScrubbing } from "./useTimelineScrubbing";
import { timeToPixels } from "./timelinePosition";

interface TimelinePlayheadProps {
  currentTime: number;
  durationMs: number;
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  onSeek: (time: number) => void;
  isScrubbingRef: React.MutableRefObject<boolean>;
  activeTimegroupId: string | null;
  zoomScale: number;
  containerWidth: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function TimelinePlayhead({
  currentTime,
  durationMs,
  timelineContainerRef,
  onSeek,
  isScrubbingRef,
  activeTimegroupId,
  zoomScale,
  containerWidth,
  scrollContainerRef,
}: TimelinePlayheadProps) {
  const playheadRef = useRef<HTMLDivElement>(null);

  // Calculate playhead position in pixels with zoom
  // Fallback to timelineContainerRef width if containerWidth is not available
  const effectiveWidth = containerWidth > 0 
    ? containerWidth 
    : (timelineContainerRef.current?.getBoundingClientRect().width || 0);
  
  const positionPixels = durationMs > 0 && effectiveWidth > 0
    ? timeToPixels(currentTime, durationMs, effectiveWidth, zoomScale)
    : 0;

  // Use shared scrubbing hook
  const { handleMouseDown } = useTimelineScrubbing({
    timelineContainerRef,
    durationMs,
    onSeek,
    isScrubbingRef,
    zoomScale,
    containerWidth,
    scrollContainerRef,
  });

  // Handle mouse down with stopPropagation to prevent ruler/tracks handlers
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleMouseDown(e);
  };

  if (durationMs <= 0) {
    return null;
  }

  return (
    <div
      ref={playheadRef}
      className="absolute top-0 bottom-0 w-0.5 pointer-events-auto cursor-ew-resize z-30"
      style={{ left: `${positionPixels}px` }}
      onMouseDown={handlePlayheadMouseDown}
    >
      {/* Vertical line */}
      <div className="w-full h-full bg-blue-500" />
      {/* Draggable handle */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full -translate-y-1/2" />
    </div>
  );
}

