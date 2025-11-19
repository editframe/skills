import React from "react";
import type { ElementNode } from "~/lib/motion-designer/types";
import { calculateContentWidth } from "./timelinePosition";

interface VideoThumbnailTrackProps {
  element: ElementNode;
  durationMs: number;
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  zoomScale: number;
  containerWidth: number;
  showLabel?: boolean;
}

export function VideoThumbnailTrack({
  element,
  durationMs,
  timelineContainerRef,
  zoomScale,
  containerWidth,
  showLabel = true,
}: VideoThumbnailTrackProps) {
  // Calculate content width based on zoom
  const contentWidth = calculateContentWidth(durationMs, containerWidth, zoomScale);

  // Read trim points from element props (read-only)
  const trimStart = element.props?.trimstart;
  const trimEnd = element.props?.trimend;

  // Calculate start-time-ms and end-time-ms for thumbnail strip
  // In trimmed mode (use-intrinsic-duration=false), these are relative to trimmed timeline
  // 0ms = start of trimmed portion, trimmedDuration = end of trimmed portion
  let startTimeMs: number | undefined;
  let endTimeMs: number | undefined;
  
  if (trimStart !== undefined && trimEnd !== undefined) {
    // Both trim points exist - show trimmed portion
    // In trimmed timeline coordinates: 0 = trimStart, trimmedDuration = trimEnd - trimStart
    startTimeMs = 0;
    endTimeMs = trimEnd - trimStart;
  } else if (trimStart !== undefined || trimEnd !== undefined) {
    // Only one trim point exists - show from trimStart to end (or start to trimEnd)
    if (trimStart !== undefined) {
      startTimeMs = 0;
      // endTimeMs remains undefined to show rest of video
    } else {
      // trimEnd exists
      startTimeMs = undefined;
      endTimeMs = trimEnd;
    }
  }
  // If no trim points, startTimeMs and endTimeMs remain undefined (show full video)

  const stripContent = (
    <div className="relative h-full bg-gray-900/20 w-full">
      <ef-thumbnail-strip
        target={element.id}
        use-intrinsic-duration="false"
        thumbnail-width={80}
        start-time-ms={startTimeMs}
        end-time-ms={endTimeMs}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );

  if (!showLabel) {
    return (
      <div className="border-b border-gray-700/50 h-12 hover:bg-gray-800/30">
        {stripContent}
      </div>
    );
  }

  return (
    <div className="flex items-center border-b border-gray-700/50 h-12 hover:bg-gray-800/30">
      <div className="text-xs text-gray-400 truncate px-2 flex items-center gap-1 min-w-[60px]">
        <span className="text-gray-500 text-[10px]">›</span>
        <span className="truncate font-light">video {element.id.slice(0, 4)}</span>
      </div>
      <div className="flex-1 relative h-full bg-gray-900/20">
        {stripContent}
      </div>
    </div>
  );
}

