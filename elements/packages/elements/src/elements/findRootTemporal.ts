import { isEFTemporal, type TemporalMixinInterface } from "./EFTemporal.js";

/**
 * Finds the outermost temporal element in the DOM ancestry of the given element.
 * 
 * Walks up from the element toward the document root, collecting all temporal
 * elements (ef-timegroup, ef-video, ef-audio) in the ancestry, and returns
 * the outermost one (closest to document root).
 * 
 * This is a pure function - no caching, no stored state. Called fresh whenever
 * the root temporal is needed.
 * 
 * @param element - The element to start searching from
 * @returns The outermost temporal element, or null if none found
 */
export function findRootTemporal(
  element: Element | null,
): (TemporalMixinInterface & HTMLElement) | null {
  if (!element) {
    return null;
  }

  let current: Node | null = element;
  let outermostTemporal: (TemporalMixinInterface & HTMLElement) | null = null;

  // Walk up the DOM tree toward document root
  while (current && current !== document) {
    // Check if current node is a temporal element
    if (current instanceof HTMLElement && isEFTemporal(current)) {
      outermostTemporal = current as TemporalMixinInterface & HTMLElement;
    }
    current = current.parentNode;
  }

  return outermostTemporal;
}




