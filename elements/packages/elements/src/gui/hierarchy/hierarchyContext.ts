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
  updateDropTarget(
    targetId: string | null,
    position: "before" | "after" | "inside" | null,
  ): void;
  endDrag(): void;
  reorder(
    sourceId: string,
    targetId: string,
    position: "before" | "after" | "inside",
  ): void;
}

export interface HierarchyContext {
  state: HierarchyState;
  actions: HierarchyActions;
  getCanvasSelectionContext?: () =>
    | import("../../canvas/selection/selectionContext.js").SelectionContext
    | undefined;
  /**
   * Get the currently highlighted element from the canvas.
   */
  getHighlightedElement?: () => HTMLElement | null;
  /**
   * Set the highlighted element on the canvas.
   */
  setHighlightedElement?: (element: HTMLElement | null) => void;
}

export const hierarchyContext = createContext<HierarchyContext>(
  Symbol("hierarchyContext"),
);
