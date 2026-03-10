/**
 * Container information interface for elements that can contain children.
 * Provides information about container capabilities and display mode.
 */

export interface ContainerInfo {
  /**
   * Whether this element is a container that can contain children.
   */
  isContainer: boolean;

  /**
   * The display mode of the container.
   * "flex" | "grid" | "block" | null
   */
  displayMode: "flex" | "grid" | "block" | null;

  /**
   * Whether this container can contain children.
   * This may differ from isContainer if the container is not configured to accept children.
   */
  canContainChildren: boolean;
}

/**
 * Helper function to get container info from any HTMLElement.
 * Reads computed styles to determine display mode.
 */
export function getContainerInfoFromElement(element: HTMLElement | null): ContainerInfo {
  if (!element) {
    return {
      isContainer: false,
      displayMode: null,
      canContainChildren: false,
    };
  }

  const computedStyle = window.getComputedStyle(element);
  const display = computedStyle.display;

  // Determine if it's a container (grid or flex)
  const isGrid = display === "grid" || display === "inline-grid";
  const isFlex = display === "flex" || display === "inline-flex";
  const isBlock = display === "block" || display === "inline-block";

  const isContainer = isGrid || isFlex || isBlock;

  let displayMode: "flex" | "grid" | "block" | null = null;
  if (isFlex) {
    displayMode = "flex";
  } else if (isGrid) {
    displayMode = "grid";
  } else if (isBlock) {
    displayMode = "block";
  }

  return {
    isContainer,
    displayMode,
    canContainChildren: isContainer,
  };
}
