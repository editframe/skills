import { useEffect } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";

interface UseInitializationProps {
  isHydrated: boolean;
  state: MotionDesignerState;
  onAddElement: (
    element: Omit<import("~/lib/motion-designer/types").ElementNode, "id">,
    parentId: string | null,
  ) => void;
}

export function useInitialization({
  isHydrated,
  state,
  onAddElement,
}: UseInitializationProps) {
  useEffect(() => {
    if (isHydrated && state.composition.rootTimegroupIds.length === 0) {
      onAddElement(
        {
          type: "timegroup",
          parentId: null,
          childIds: [],
          props: {
            mode: "fixed",
            duration: "5s",
            canvasPosition: { x: 100, y: 100 },
            size: { width: 960, height: 540 },
          },
          animations: [],
        },
        null,
      );
    }
  }, [isHydrated, state.composition.rootTimegroupIds.length, onAddElement]);
}

