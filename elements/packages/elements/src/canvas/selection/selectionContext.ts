import { createContext } from "@lit/context";
import type { SelectionState } from "../api/types.js";

/**
 * Selection context interface for Lit context.
 */
export interface SelectionContext {
  selectedIds: ReadonlySet<string>;
  selectionMode: SelectionState;
  boxSelectBounds: DOMRect | null;
  select: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  startBoxSelect: (x: number, y: number) => void;
  updateBoxSelect: (x: number, y: number) => void;
  endBoxSelect: (
    hitTest: (bounds: DOMRect) => string[],
    addToSelection?: boolean,
  ) => void;
  createGroup: (ids: string[]) => string;
  ungroup: (groupId: string) => void;
  selectGroup: (groupId: string) => void;
  getGroupId: (elementId: string) => string | undefined;
  getGroupElements: (groupId: string) => string[];
  addEventListener: (
    type: "selectionchange",
    listener: (event: CustomEvent) => void,
  ) => void;
  removeEventListener: (
    type: "selectionchange",
    listener: (event: CustomEvent) => void,
  ) => void;
}

/**
 * Lit context for selection state.
 * Provided by EFCanvas, consumed by child elements.
 */
export const selectionContext = createContext<SelectionContext>(
  Symbol("selectionContext"),
);
