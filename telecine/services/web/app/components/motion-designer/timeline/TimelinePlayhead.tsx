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
  rawScrubTime?: number | null; // Raw (unquantized) mouse position during scrubbing
  fps?: number; // FPS for frame quantization
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
  rawScrubTime,
  fps,
}: TimelinePlayheadProps) {
  const playheadRef = useRef<HTMLDivElement>(null);

  // Calculate playhead position in pixels with zoom
  // Fallback to timelineContainerRef width if containerWidth is not available
  const effectiveWidth =
    containerWidth > 0
      ? containerWidth
      : timelineContainerRef.current?.getBoundingClientRect().width || 0;

  const positionPixels =
    durationMs > 0 && effectiveWidth > 0
      ? timeToPixels(currentTime, durationMs, effectiveWidth, zoomScale)
      : 0;

  // Use shared scrubbing hook
  const { handleMouseDown, rawScrubTime: playheadRawScrubTime } =
    useTimelineScrubbing({
      timelineContainerRef,
      durationMs,
      onSeek,
      isScrubbingRef,
      zoomScale,
      containerWidth,
      scrollContainerRef,
      fps,
    });

  // Use rawScrubTime from props (from ruler/tracks scrubbing) or from playhead's own scrubbing
  const effectiveRawScrubTime = rawScrubTime ?? playheadRawScrubTime;

  // Calculate raw scrub position (faint playhead) if scrubbing
  const rawScrubPositionPixels =
    effectiveRawScrubTime !== null &&
    effectiveRawScrubTime !== undefined &&
    durationMs > 0 &&
    effectiveWidth > 0
      ? timeToPixels(
          effectiveRawScrubTime,
          durationMs,
          effectiveWidth,
          zoomScale,
        )
      : null;

  // Handle mouse down with stopPropagation to prevent ruler/tracks handlers
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleMouseDown(e);
  };

  if (durationMs <= 0) {
    return null;
  }

  return (
    <>
      {/* Faint playhead showing raw mouse position during scrubbing */}
      {rawScrubPositionPixels !== null &&
        rawScrubPositionPixels !== positionPixels && (
          <div
            className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-20"
            style={{ left: `${rawScrubPositionPixels}px` }}
          >
            {/* Faint vertical line */}
            <div className="w-full h-full bg-blue-500/20" />
          </div>
        )}
      {/* Main playhead (snapped to frame boundaries) */}
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
    </>
  );
}
