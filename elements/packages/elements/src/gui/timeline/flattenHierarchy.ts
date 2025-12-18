import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../../elements/EFTemporal.js";
import { EFTimegroup } from "../../elements/EFTimegroup.js";

export interface TimelineRowModel {
  element: TemporalMixinInterface & Element;
  depth: number;
}

/**
 * Flattens a hierarchical temporal element tree into a flat array of rows.
 * Each row contains the element and its depth in the hierarchy.
 *
 * @param root - The root temporal element to flatten
 * @param startDepth - Starting depth (default 0)
 * @returns Array of {element, depth} in depth-first order
 */
export function flattenHierarchy(
  root: TemporalMixinInterface & Element,
  startDepth = 0,
): TimelineRowModel[] {
  const rows: TimelineRowModel[] = [{ element: root, depth: startDepth }];

  if (root instanceof EFTimegroup) {
    for (const child of root.children) {
      if (isEFTemporal(child)) {
        rows.push(
          ...flattenHierarchy(
            child as TemporalMixinInterface & Element,
            startDepth + 1,
          ),
        );
      }
    }
  }

  return rows;
}

