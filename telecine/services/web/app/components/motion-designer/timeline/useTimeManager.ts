import { useRef, useMemo } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";

/**
 * Parses duration string (e.g., "5s", "1.5s", "500ms") to milliseconds
 */
function parseDurationToMs(duration: string | undefined | null): number {
  if (!duration) return 5000; // Default fallback
  
  const trimmed = duration.trim();
  
  // Handle "ms" suffix
  if (trimmed.endsWith("ms")) {
    const value = parseFloat(trimmed.slice(0, -2));
    return isNaN(value) ? 5000 : Math.max(0, value);
  }
  
  // Handle "s" suffix
  if (trimmed.endsWith("s")) {
    const value = parseFloat(trimmed.slice(0, -1));
    return isNaN(value) ? 5000 : Math.max(0, value * 1000);
  }
  
  // Try parsing as number (assume milliseconds)
  const value = parseFloat(trimmed);
  return isNaN(value) ? 5000 : Math.max(0, value);
}

export function useTimeManager(
  activeTimegroupId: string | null,
  state: MotionDesignerState | undefined,
) {
  const isScrubbingRef = useRef(false);
  
  // Get duration from timegroup element props
  const duration = useMemo(() => {
    if (!activeTimegroupId || !state?.composition?.elements) return 5000;
    
    const timegroupElement = state.composition.elements[activeTimegroupId];
    if (!timegroupElement || timegroupElement.type !== "timegroup") {
      return 5000;
    }
    
    const durationString = timegroupElement.props?.duration;
    return parseDurationToMs(durationString);
  }, [activeTimegroupId, state?.composition?.elements]);
  
  // TODO: Implement actual time management with TimeManager class
  // For now, return implementation that uses state
  return {
    currentTime: state?.ui?.currentTime ?? 0,
    duration,
    isScrubbingRef,
    seek: (time: number) => {
      // Seek updates will be handled via actions.setCurrentTime in Timeline component
      // This is a placeholder - actual implementation will integrate with TimeManager class
    },
  };
}

