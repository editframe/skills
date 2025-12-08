import { createContext } from "@lit/context";

export interface HierarchyState {
  selectedElementId: string | null;
  expandedIds: Set<string>;
  draggedElementId: string | null;
  dropTargetId: string | null;
  dropPosition: "before" | "after" | "inside" | null;
}

export interface HierarchyActions {
  select(elementId: string | null): void;
  toggleExpanded(elementId: string): void;
  setExpanded(elementId: string, expanded: boolean): void;
  startDrag(elementId: string): void;
  updateDropTarget(targetId: string | null, position: "before" | "after" | "inside" | null): void;
  endDrag(): void;
  reorder(sourceId: string, targetId: string, position: "before" | "after" | "inside"): void;
}

export interface HierarchyContext {
  state: HierarchyState;
  actions: HierarchyActions;
  getCanvasSelectionContext?: () => import("../../canvas/selection/selectionContext.js").SelectionContext | undefined;
}

export const hierarchyContext = createContext<HierarchyContext>(Symbol("hierarchyContext"));

