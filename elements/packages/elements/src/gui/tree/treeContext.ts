import { createContext } from "@lit/context";
import type { TemplateResult } from "lit";

/**
 * Generic tree item data structure.
 * Used by ef-tree for data-driven tree rendering.
 */
export interface TreeItem {
  /** Unique identifier for this item */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon (Lit TemplateResult or string) */
  icon?: TemplateResult | string;
  /** Child items (folders have children, leaves don't) */
  children?: TreeItem[];
  /** Arbitrary payload data */
  data?: unknown;
}

/**
 * Tree component state
 */
export interface TreeState {
  /** Currently selected item ID */
  selectedId: string | null;
  /** Set of expanded item IDs */
  expandedIds: Set<string>;
}

/**
 * Tree component actions
 */
export interface TreeActions {
  /** Select an item by ID */
  select: (id: string | null) => void;
  /** Toggle an item's expanded state */
  toggleExpanded: (id: string) => void;
  /** Set an item's expanded state explicitly */
  setExpanded: (id: string, expanded: boolean) => void;
}

/**
 * Tree context provided to tree items
 */
export interface TreeContext {
  state: TreeState;
  actions: TreeActions;
}

/**
 * Lit context for tree components
 */
export const treeContext = createContext<TreeContext>("ef-tree-context");

/**
 * Helper to collect all item IDs from a tree (for default expanded state)
 */
export function collectAllIds(items: TreeItem[]): Set<string> {
  const ids = new Set<string>();
  
  function traverse(item: TreeItem) {
    ids.add(item.id);
    if (item.children) {
      for (const child of item.children) {
        traverse(child);
      }
    }
  }
  
  for (const item of items) {
    traverse(item);
  }
  
  return ids;
}
