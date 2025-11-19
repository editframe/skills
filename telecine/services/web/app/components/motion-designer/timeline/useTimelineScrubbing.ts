import { useState, useEffect, useCallback } from "react";
import { pixelsToTime } from "./timelinePosition";
import { quantizeToFrameTimeMs } from "./TimelineRuler";

interface UseTimelineScrubbingOptions {
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  durationMs: number;
  onSeek: (time: number) => void;
  isScrubbingRef: React.MutableRefObject<boolean>;
  zoomScale?: number;
  containerWidth?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>; // The actual scrolling container
  enabled?: boolean;
  fps?: number; // FPS for frame quantization during scrubbing
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
  fps,
}: UseTimelineScrubbingOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [rawScrubTime, setRawScrubTime] = useState<number | null>(null);

  // Calculate raw (unquantized) time from mouse position
  const calculateRawTimeFromMouse = useCallback((clientX: number): number => {
    if (durationMs <= 0) return 0;
    
    const scrollContainer = scrollContainerRef?.current || timelineContainerRef.current;
    if (!scrollContainer) return 0;
    
    const scrollContainerRect = scrollContainer.getBoundingClientRect();
    const scrollLeft = scrollContainer.scrollLeft || 0;
    const x = clientX - scrollContainerRect.left;
    const pixelPosition = scrollLeft + x;
    const effectiveWidth = containerWidth > 0 ? containerWidth : scrollContainerRect.width;
    if (effectiveWidth <= 0) return 0;
    
    const rawTime = pixelsToTime(pixelPosition, durationMs, effectiveWidth, zoomScale);
    return Math.max(0, Math.min(rawTime, durationMs));
  }, [scrollContainerRef, timelineContainerRef, durationMs, zoomScale, containerWidth]);

  // Calculate time from mouse X position relative to container bounds, accounting for zoom and scroll
  const calculateTimeFromMouse = useCallback((clientX: number): number => {
    const rawTime = calculateRawTimeFromMouse(clientX);
    
    // Store raw time for visual feedback during scrubbing
    setRawScrubTime(rawTime);
    
    // Quantize to frame boundaries if FPS is provided
    // This ensures the playhead snaps to frame markers during scrubbing
    if (fps && fps > 0) {
      return quantizeToFrameTimeMs(rawTime, fps);
    }
    
    return rawTime;
  }, [calculateRawTimeFromMouse, fps]);

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
      setRawScrubTime(null); // Clear raw scrub time when done
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
    rawScrubTime: isDragging ? rawScrubTime : null, // Only return raw time while dragging
  };
}

