import { useState, useEffect, useCallback } from "react";
import { pixelsToTime } from "./timelinePosition";

interface UseTimelineScrubbingOptions {
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  durationMs: number;
  onSeek: (time: number) => void;
  isScrubbingRef: React.MutableRefObject<boolean>;
  zoomScale?: number;
  containerWidth?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>; // The actual scrolling container
  enabled?: boolean;
}

/**
 * Shared hook for timeline scrubbing logic.
 * Calculates time from mouse position and handles drag interactions.
 */
export function useTimelineScrubbing({
  timelineContainerRef,
  durationMs,
  onSeek,
  isScrubbingRef,
  zoomScale = 1,
  containerWidth = 0,
  scrollContainerRef,
  enabled = true,
}: UseTimelineScrubbingOptions) {
  const [isDragging, setIsDragging] = useState(false);

  // Calculate time from mouse X position relative to container bounds, accounting for zoom and scroll
  const calculateTimeFromMouse = useCallback((clientX: number): number => {
    if (!timelineContainerRef.current || durationMs <= 0) return 0;
    
    const rect = timelineContainerRef.current.getBoundingClientRect();
    // Use scrollContainerRef if provided (the actual scrolling container), otherwise fall back to timelineContainerRef
    const scrollContainer = scrollContainerRef?.current || timelineContainerRef.current;
    const scrollLeft = scrollContainer.scrollLeft || 0;
    const x = clientX - rect.left;
    
    // Account for scroll position: actual pixel position = scrollLeft + x
    const pixelPosition = scrollLeft + x;
    
    // Convert pixels to time using zoom-aware calculation
    // Use containerWidth if available, otherwise fall back to rect.width
    const effectiveWidth = containerWidth > 0 ? containerWidth : rect.width;
    if (effectiveWidth <= 0) return 0; // Guard against zero width
    
    const newTime = pixelsToTime(pixelPosition, durationMs, effectiveWidth, zoomScale);
    
    return Math.max(0, Math.min(newTime, durationMs));
  }, [timelineContainerRef, scrollContainerRef, durationMs, zoomScale, containerWidth]);

  // Handle mouse down to start scrubbing - memoized to prevent recreation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    isScrubbingRef.current = true;
    
    // Seek immediately on click
    const newTime = calculateTimeFromMouse(e.clientX);
    onSeek(newTime);
  }, [enabled, calculateTimeFromMouse, onSeek, isScrubbingRef]);

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging || !enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newTime = calculateTimeFromMouse(e.clientX);
      onSeek(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      isScrubbingRef.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, enabled, calculateTimeFromMouse, onSeek, isScrubbingRef]);

  return {
    handleMouseDown,
    isDragging,
  };
}

