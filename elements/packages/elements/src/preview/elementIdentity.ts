/**
 * Element identity tracking across clone boundaries.
 * 
 * Provides utilities for finding corresponding elements in cloned DOM trees
 * using multiple fallback strategies.
 */

/**
 * Find corresponding element in clone tree using multiple strategies.
 * 
 * Strategies (in order):
 * 1. data-element-id attribute (used by canvas system)
 * 2. id attribute (standard HTML id)
 * 3. Structural path traversal (index-based fallback)
 * 
 * @param cloneRoot - Root element of the cloned tree
 * @param originalElement - Element to find in the clone
 * @returns Corresponding element in clone tree
 * @throws Error if element cannot be found
 */
export function findCorrespondingElement(
  cloneRoot: Element,
  originalElement: Element
): Element {
  // Strategy 1: data-element-id attribute
  const dataElementId = originalElement.getAttribute('data-element-id');
  if (dataElementId) {
    const found = cloneRoot.querySelector(`[data-element-id="${dataElementId}"]`);
    if (found) {
      return found;
    }
  }
  
  // Strategy 2: id attribute
  const id = originalElement.id;
  if (id) {
    const found = cloneRoot.querySelector(`#${CSS.escape(id)}`);
    if (found) {
      return found;
    }
  }
  
  // Strategy 3: Structural path traversal
  // Get path from original root to original element
  const originalRoot = findCommonRoot(cloneRoot, originalElement);
  if (!originalRoot) {
    throw new Error('Cannot find common root for element');
  }
  
  const path = getElementPath(originalRoot, originalElement);
  const found = followPath(cloneRoot, path);
  
  if (!found) {
    throw new Error('Cannot find corresponding element in clone');
  }
  
  return found;
}

/**
 * Find common root between clone root and original element.
 * Walks up from original element to find the root that corresponds to cloneRoot.
 */
function findCommonRoot(cloneRoot: Element, originalElement: Element): Element | null {
  // If cloneRoot has data-element-id or id, try to find matching original
  const cloneId = cloneRoot.getAttribute('data-element-id') || cloneRoot.id;
  
  if (cloneId) {
    // Walk up from originalElement to find element with matching id
    let current: Element | null = originalElement;
    while (current) {
      const currentId = current.getAttribute('data-element-id') || current.id;
      if (currentId === cloneId) {
        return current;
      }
      current = current.parentElement;
    }
  }
  
  // Fallback: assume originalElement's root is the common root
  let root: Element = originalElement;
  while (root.parentElement) {
    root = root.parentElement;
  }
  return root;
}

/**
 * Get structural path from root to element (index-based).
 * Returns array of child indices to traverse from root to element.
 * 
 * @param root - Root element to start from
 * @param element - Target element to find path to
 * @returns Array of child indices
 */
function getElementPath(root: Element, element: Element): number[] {
  const path: number[] = [];
  let current: Element | null = element;
  
  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) {
      break;
    }
    
    // Find index of current element in parent's children
    const children = Array.from(parent.children);
    const index = children.indexOf(current);
    
    if (index === -1) {
      throw new Error('Element not found in parent children');
    }
    
    path.unshift(index);
    current = parent;
  }
  
  return path;
}

/**
 * Follow structural path in clone tree.
 * Traverses clone tree using array of child indices.
 * 
 * @param root - Root element to start from
 * @param path - Array of child indices to follow
 * @returns Element at the end of the path, or null if path is invalid
 */
function followPath(root: Element, path: number[]): Element | null {
  let current: Element | undefined = root;
  
  for (const index of path) {
    if (!current) {
      return null;
    }
    const children: Element[] = Array.from(current.children);
    if (index >= children.length) {
      return null;
    }
    current = children[index];
  }
  
  return current ?? null;
}
