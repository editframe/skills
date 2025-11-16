import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import { HierarchyTree } from "./HierarchyTree";
import { DragProvider } from "./DragContext";

interface HierarchyPanelProps {
  state: MotionDesignerState;
}

export function HierarchyPanel({ state }: HierarchyPanelProps) {
  const activeRootTimegroupId = getActiveRootTimegroupId(state);
  const activeRootTimegroup = activeRootTimegroupId
    ? state.composition.elements[activeRootTimegroupId]
    : null;
  const panelTitle = activeRootTimegroup ? `Timegroup ${activeRootTimegroup.id.slice(0, 4)}` : "Elements";

  return (
    <DragProvider>
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <span className="text-sm font-medium">{panelTitle}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <HierarchyTree state={state} />
        </div>
      </div>
    </DragProvider>
  );
}

