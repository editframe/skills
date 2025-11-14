import { useEffect } from "react";
import { useTimeManager } from "../timeline/useTimeManager";
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
  const { currentTime: timeManagerTime, isScrubbingRef: timeManagerScrubbingRef } = useTimeManager(activeRootTimegroupId, state);

  useEffect(() => {
    onSetCurrentTime(timeManagerTime);
  }, [timeManagerTime, onSetCurrentTime]);

  useEffect(() => {
    if (isScrubbingRef) {
      isScrubbingRef.current = timeManagerScrubbingRef.current;
    }
  }, [timeManagerScrubbingRef, isScrubbingRef]);
}

