import { useState, useEffect, useCallback } from "react";

interface UseTimelineScrubbingOptions {
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  durationMs: number;
  onSeek: (time: number) => void;
  isScrubbingRef: React.MutableRefObject<boolean>;
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
  enabled = true,
}: UseTimelineScrubbingOptions) {
  const [isDragging, setIsDragging] = useState(false);

  // Calculate time from mouse X position relative to container bounds
  const calculateTimeFromMouse = useCallback((clientX: number): number => {
    if (!timelineContainerRef.current || durationMs <= 0) return 0;
    
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const newTime = Math.max(0, Math.min((x / rect.width) * durationMs, durationMs));
    return newTime;
  }, [timelineContainerRef, durationMs]);

  // Handle mouse down to start scrubbing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    isScrubbingRef.current = true;
    
    // Seek immediately on click
    const newTime = calculateTimeFromMouse(e.clientX);
    onSeek(newTime);
  };

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

