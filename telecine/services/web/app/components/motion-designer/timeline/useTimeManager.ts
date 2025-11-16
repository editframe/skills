import { useRef, useMemo, useState, useEffect } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { TimeManager } from "./TimeManager";

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
  const timeManagerRef = useRef<TimeManager | null>(null);
  const [currentTime, setCurrentTime] = useState(state?.ui?.currentTime ?? 0);
  
  // Initialize TimeManager instance
  useEffect(() => {
    if (!timeManagerRef.current) {
      timeManagerRef.current = new TimeManager();
    }
    
    const timeManager = timeManagerRef.current;
    
    // Subscribe to time updates
    const unsubscribe = timeManager.subscribe((time: number) => {
      setCurrentTime(time);
    });
    
    // Set active timegroup
    timeManager.setActiveTimegroup(activeTimegroupId);
    
    // Sync scrubbing state
    timeManager.setIsScrubbing(isScrubbingRef.current);
    
    return () => {
      unsubscribe();
    };
  }, [activeTimegroupId]);
  
  // Sync scrubbing state - use a polling approach since refs don't trigger re-renders
  useEffect(() => {
    if (!timeManagerRef.current) return;
    
    const intervalId = setInterval(() => {
      if (timeManagerRef.current) {
        timeManagerRef.current.setIsScrubbing(isScrubbingRef.current);
      }
    }, 100); // Poll every 100ms
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Sync time from state to TimeManager only when scrubbing (user-initiated changes)
  // During playback, TimeManager is the source of truth, so we don't sync back
  useEffect(() => {
    if (timeManagerRef.current && state?.ui?.currentTime !== undefined && isScrubbingRef.current) {
      const stateTime = state.ui.currentTime;
      const managerTime = timeManagerRef.current.getCurrentTime();
      
      // Only sync if there's a significant difference (user scrubbed)
      if (Math.abs(stateTime - managerTime) > 16) {
        timeManagerRef.current.setCurrentTime(stateTime);
      }
    }
  }, [state?.ui?.currentTime, isScrubbingRef]);
  
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
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeManagerRef.current) {
        timeManagerRef.current.cleanup();
        timeManagerRef.current = null;
      }
    };
  }, []);
  
  return {
    currentTime,
    duration,
    isScrubbingRef,
    seek: (time: number) => {
      if (timeManagerRef.current) {
        timeManagerRef.current.seek(time);
      }
    },
  };
}

