import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { HierarchyItem } from "./HierarchyItem";

interface HierarchyTreeProps {
  state: MotionDesignerState;
}

export function HierarchyTree({ state }: HierarchyTreeProps) {
  return (
    <div>
      {state.composition.rootTimegroupIds.map((id) => {
        const element = state.composition.elements[id];
        if (!element) return null;
        return (
          <HierarchyItem
            key={id}
            element={element}
            state={state}
            depth={0}
          />
        );
      })}
    </div>
  );
}

