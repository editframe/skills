import { useRef, useState, useEffect } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { TimeManager } from "./TimeManager";

export function useTimeManager(
  activeTimegroupId: string | null,
  state: MotionDesignerState | undefined,
) {
  const isScrubbingRef = useRef(false);
  const timeManagerRef = useRef<TimeManager | null>(null);
  const [currentTime, setCurrentTime] = useState(state?.ui?.currentTime ?? 0);
  const [duration, setDuration] = useState(5000);
  
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
    
    // Subscribe to duration updates
    const unsubscribeDuration = timeManager.subscribeDuration((durationMs: number) => {
      setDuration(durationMs);
    });
    
    // Set active timegroup
    timeManager.setActiveTimegroup(activeTimegroupId);
    
    // Initialize duration from TimeManager
    setDuration(timeManager.getDuration());
    
    // Sync scrubbing state
    timeManager.setIsScrubbing(isScrubbingRef.current);
    
    return () => {
      unsubscribe();
      unsubscribeDuration();
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

