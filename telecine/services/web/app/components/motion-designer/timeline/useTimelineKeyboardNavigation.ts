import { useEffect, useRef } from "react";
import { quantizeToFrameTimeMs } from "@editframe/elements";

interface UseTimelineKeyboardNavigationOptions {
  currentTime: number;
  durationMs: number;
  fps: number;
  onSeek: (time: number) => void;
  containerRef: React.RefObject<HTMLElement>;
}

/**
 * Hook for handling keyboard navigation in the timeline.
 * When the timeline container is focused:
 * - Left/Right arrow keys: move by one frame
 * - Shift+Left/Right arrow keys: move by one second (1000ms)
 */
export function useTimelineKeyboardNavigation({
  currentTime,
  durationMs,
  fps,
  onSeek,
  containerRef,
}: UseTimelineKeyboardNavigationOptions) {
  const currentTimeRef = useRef(currentTime);
  
  // Keep ref in sync with current time
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
        return;
      }

      // Check if the timeline container or one of its children is focused
      const activeElement = document.activeElement;
      if (!activeElement || !container.contains(activeElement)) {
        return;
      }

      // Don't handle if user is typing in an input/textarea
      if (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        (activeElement as HTMLElement).isContentEditable
      ) {
        return;
      }

      e.preventDefault();

      const isShiftPressed = e.shiftKey;
      const isRightArrow = e.key === "ArrowRight";
      
      let newTime: number;

      if (isShiftPressed) {
        // Shift+arrow: move by 1 second (1000ms)
        const deltaMs = isRightArrow ? 1000 : -1000;
        newTime = currentTimeRef.current + deltaMs;
      } else {
        // Arrow: move by one frame
        const frameIntervalMs = fps > 0 ? 1000 / fps : 1000 / 30;
        const deltaMs = isRightArrow ? frameIntervalMs : -frameIntervalMs;
        newTime = currentTimeRef.current + deltaMs;
        
        // Quantize to frame boundaries
        newTime = quantizeToFrameTimeMs(newTime, fps);
      }

      // Clamp to bounds
      newTime = Math.max(0, Math.min(newTime, durationMs));

      // Seek to new time
      onSeek(newTime);
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, durationMs, fps, onSeek]);
}


