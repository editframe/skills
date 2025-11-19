import React, { useState, useEffect, useRef } from "react";
import type { ElementNode } from "~/lib/motion-designer/types";
import { pixelsToTime, calculateContentWidth } from "./timelinePosition";

interface VideoThumbnailTrackProps {
  element: ElementNode;
  durationMs: number;
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  zoomScale: number;
  containerWidth: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  showLabel?: boolean;
}

export function VideoThumbnailTrack({
  element,
  durationMs,
  timelineContainerRef,
  zoomScale,
  containerWidth,
  scrollContainerRef,
  showLabel = true,
}: VideoThumbnailTrackProps) {
  const [visibleStartTimeMs, setVisibleStartTimeMs] = useState<number>(0);
  const [visibleEndTimeMs, setVisibleEndTimeMs] = useState<number>(0);
  const [viewportWidth, setViewportWidth] = useState<number>(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  // Calculate visible time range based on scroll position and zoom
  useEffect(() => {
    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer || durationMs <= 0 || zoomScale <= 0) {
      return;
    }

    const updateVisibleRange = () => {
      const scrollLeft = scrollContainer.scrollLeft || 0;
      const viewportWidth = scrollContainer.clientWidth;
      const contentWidth = scrollContainer.scrollWidth;
      
      if (viewportWidth <= 0) {
        return;
      }
      
      // Update viewport width for thumbnail strip sizing
      setViewportWidth(viewportWidth);
      
      // Calculate logical end time based on content width (may extend beyond video duration)
      const logicalEndTimeMs = pixelsToTime(contentWidth, durationMs, containerWidth, zoomScale);
      
      // Calculate time at left edge of viewport
      const startTime = pixelsToTime(scrollLeft, durationMs, viewportWidth, zoomScale);
      
      // Calculate time at right edge of viewport
      const endTime = pixelsToTime(scrollLeft + viewportWidth, durationMs, viewportWidth, zoomScale);
      
      // Add a small buffer to ensure thumbnails load slightly outside viewport
      const bufferMs = Math.max(1000, durationMs * 0.05);
      
      setVisibleStartTimeMs(Math.max(0, startTime - bufferMs));
      // Use logical end time instead of clamping to durationMs
      setVisibleEndTimeMs(Math.min(logicalEndTimeMs, endTime + bufferMs));
    };

    // Initial calculation
    updateVisibleRange();

    scrollContainer.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    return () => {
      scrollContainer.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [scrollContainerRef, durationMs, zoomScale]);

  // Position strip fixed to viewport (only on mount/resize)
  useEffect(() => {
    const scrollContainer = scrollContainerRef?.current;
    const strip = stripRef.current;
    const placeholder = placeholderRef.current;
    if (!scrollContainer || !strip || !placeholder) return;

    const updatePosition = () => {
      const scrollRect = scrollContainer.getBoundingClientRect();
      const placeholderRect = placeholder.getBoundingClientRect();
      strip.style.position = 'fixed';
      strip.style.left = `${scrollRect.left}px`;
      strip.style.top = `${placeholderRect.top}px`;
      strip.style.width = `${scrollContainer.clientWidth}px`;
    };

    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(scrollContainer);
    window.addEventListener('resize', updatePosition);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePosition);
    };
  }, [scrollContainerRef]);

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
    // Map visible time range to trimmed timeline coordinates
    const trimmedDuration = trimEnd - trimStart;
    
    // Check if visible range overlaps with trimmed range
    if (visibleEndTimeMs > trimStart && visibleStartTimeMs < trimEnd) {
      // Convert visible times from full timeline to trimmed timeline
      // Clamp to trimmed range
      const trimmedStartTime = Math.max(0, visibleStartTimeMs - trimStart);
      const trimmedEndTime = Math.min(trimmedDuration, visibleEndTimeMs - trimStart);
      
      // Only set if valid range
      if (trimmedEndTime > trimmedStartTime) {
        startTimeMs = trimmedStartTime;
        endTimeMs = trimmedEndTime;
      }
    }
  } else if (trimStart !== undefined) {
    // Only trimStart exists - show from trimStart to end
    // Check if visible range overlaps with trimmed range
    if (visibleEndTimeMs > trimStart) {
      const trimmedStartTime = Math.max(0, visibleStartTimeMs - trimStart);
      const trimmedEndTime = visibleEndTimeMs - trimStart;
      
      if (trimmedEndTime > trimmedStartTime) {
        startTimeMs = trimmedStartTime;
        endTimeMs = trimmedEndTime;
      }
    }
  } else if (trimEnd !== undefined) {
    // Only trimEnd exists - show from start to trimEnd
    // Check if visible range overlaps with trimmed range
    if (visibleStartTimeMs < trimEnd) {
      const trimmedStartTime = Math.max(0, visibleStartTimeMs);
      const trimmedEndTime = Math.min(trimEnd, visibleEndTimeMs);
      
      if (trimmedEndTime > trimmedStartTime) {
        startTimeMs = trimmedStartTime;
        endTimeMs = trimmedEndTime;
      }
    }
  } else {
    // No trim points - use visible range directly
    if (visibleEndTimeMs > visibleStartTimeMs) {
      startTimeMs = visibleStartTimeMs;
      endTimeMs = visibleEndTimeMs;
    }
  }

  const stripContent = (
    <div className="relative h-full">
      <div ref={placeholderRef} className="h-full" style={{ width: viewportWidth > 0 ? `${viewportWidth}px` : '100%' }} />
      <div
        ref={stripRef}
        className="bg-gray-900/20 overflow-hidden"
        style={{ height: '48px', zIndex: 10 }}
      >
        <ef-thumbnail-strip
          target={element.id}
          use-intrinsic-duration="false"
          thumbnail-width={80}
          start-time-ms={startTimeMs}
          end-time-ms={endTimeMs}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
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
      <div className="flex-1 relative h-full bg-gray-900/20 overflow-hidden">
        {stripContent}
      </div>
    </div>
  );
}

