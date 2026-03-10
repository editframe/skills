import { isEFTemporal, type TemporalMixinInterface } from "../../elements/EFTemporal.js";
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
        // Skip child elements that are consolidated into their parent track
        const tagName = (child as Element).tagName?.toUpperCase();

        // Skip captions child elements - they're shown inline in the captions track
        if (
          tagName === "EF-CAPTIONS-ACTIVE-WORD" ||
          tagName === "EF-CAPTIONS-SEGMENT" ||
          tagName === "EF-CAPTIONS-BEFORE-ACTIVE-WORD" ||
          tagName === "EF-CAPTIONS-AFTER-ACTIVE-WORD"
        ) {
          continue;
        }

        // Skip text segments - they're shown inline in the text track
        if (tagName === "EF-TEXT-SEGMENT") {
          continue;
        }

        rows.push(...flattenHierarchy(child as TemporalMixinInterface & Element, startDepth + 1));
      }
    }
  }

  return rows;
}
