import { useRef } from "react";
import { useTimelineScrubbing } from "./useTimelineScrubbing";

interface TimelinePlayheadProps {
  currentTime: number;
  durationMs: number;
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  onSeek: (time: number) => void;
  isScrubbingRef: React.MutableRefObject<boolean>;
  activeTimegroupId: string | null;
}

export function TimelinePlayhead({
  currentTime,
  durationMs,
  timelineContainerRef,
  onSeek,
  isScrubbingRef,
  activeTimegroupId,
}: TimelinePlayheadProps) {
  const playheadRef = useRef<HTMLDivElement>(null);

  // Calculate playhead position as percentage
  const positionPercent = durationMs > 0 ? (currentTime / durationMs) * 100 : 0;

  // Use shared scrubbing hook
  const { handleMouseDown } = useTimelineScrubbing({
    timelineContainerRef,
    durationMs,
    onSeek,
    isScrubbingRef,
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
      style={{ left: `${positionPercent}%` }}
      onMouseDown={handlePlayheadMouseDown}
    >
      {/* Vertical line */}
      <div className="w-full h-full bg-blue-500" />
      {/* Draggable handle */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full -translate-y-1/2" />
    </div>
  );
}

