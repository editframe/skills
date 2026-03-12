import { useEffect } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";

interface UseTimeSyncProps {
  activeRootTimegroupId: string | null;
  currentTime: number;
  onSetCurrentTime: (time: number) => void;
  isScrubbingRef: React.MutableRefObject<boolean>;
  state: MotionDesignerState;
}

export function useTimeSync({
  activeRootTimegroupId,
  currentTime,
  onSetCurrentTime,
  isScrubbingRef,
  state,
}: UseTimeSyncProps) {
  // Sync currentTime from TimeManager to React state
  // currentTime comes from useTimeManager hook in Timeline component
  useEffect(() => {
    onSetCurrentTime(currentTime);
  }, [currentTime, onSetCurrentTime]);
}
