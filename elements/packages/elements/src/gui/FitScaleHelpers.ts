import type { ContainerInfo } from "../elements/ContainerInfo.js";
import { getContainerInfoFromElement } from "../elements/ContainerInfo.js";

/**
 * Determines if an element needs FitScale wrapping based on its parent container
 * and whether it has explicit size.
 *
 * FitScale is needed when:
 * - Parent is a grid container (grid or flex display)
 * - Element doesn't have explicit width/height
 *
 * @param parentElement - The parent element (can be HTMLElement or null)
 * @param elementHasExplicitSize - Whether the element has explicit width/height
 * @returns true if FitScale should be applied
 *
 * @public
 */
export function needsFitScale(
  parentElement: HTMLElement | null,
  elementHasExplicitSize: boolean,
): boolean {
  if (!parentElement) {
    return false;
  }

  const containerInfo = getContainerInfoFromElement(parentElement);
  const isInGridContainer =
    containerInfo.displayMode === "grid" || containerInfo.displayMode === "flex";

  return isInGridContainer && !elementHasExplicitSize;
}

/**
 * Determines if an element needs FitScale wrapping by checking computed styles.
 * This is a convenience function that reads the element's computed style to check
 * for explicit size.
 *
 * @param element - The element to check
 * @param parentElement - The parent element (can be HTMLElement or null)
 * @returns true if FitScale should be applied
 *
 * @public
 */
export function elementNeedsFitScale(
  element: HTMLElement,
  parentElement: HTMLElement | null,
): boolean {
  const computedStyle = window.getComputedStyle(element);
  const hasExplicitSize =
    !!(computedStyle.width && computedStyle.width !== "auto") ||
    !!(computedStyle.height && computedStyle.height !== "auto");

  return needsFitScale(parentElement, hasExplicitSize);
}







