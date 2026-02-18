/**
 * Editframe GUI Theme Utilities
 *
 * Shared utilities for working with theme tokens.
 */

/**
 * Fallback colors for element types when CSS variables are not available.
 * These match the default values in ef-theme.css.
 */
const fallbackTypeColors: Record<string, string> = {
  video: "rgb(59, 130, 246)", // blue-500
  audio: "rgb(34, 197, 94)", // green-500
  image: "rgb(168, 85, 247)", // purple-500
  text: "rgb(249, 115, 22)", // orange-500
  captions: "rgb(34, 197, 94)", // green-500
  timegroup: "rgb(148, 163, 184)", // slate-400
};

/**
 * Get the color for a specific element type from CSS variables.
 * Falls back to hardcoded values if the CSS variable is not defined.
 *
 * @param type - The element type (video, audio, image, text, captions, timegroup)
 * @param element - Optional element to compute styles from (defaults to document.documentElement)
 * @returns The color string (rgb format)
 */
export function getElementTypeColor(
  type: string,
  element: Element = document.documentElement,
): string {
  const varName = `--ef-color-type-${type}`;
  const computedValue = getComputedStyle(element)
    .getPropertyValue(varName)
    .trim();

  return (
    computedValue || fallbackTypeColors[type] || fallbackTypeColors.timegroup!
  );
}

/**
 * Get a theme token value from CSS variables.
 *
 * @param tokenName - The CSS variable name (with or without -- prefix)
 * @param element - Optional element to compute styles from (defaults to document.documentElement)
 * @returns The token value, or empty string if not defined
 */
export function getThemeToken(
  tokenName: string,
  element: Element = document.documentElement,
): string {
  const varName = tokenName.startsWith("--") ? tokenName : `--${tokenName}`;
  return getComputedStyle(element).getPropertyValue(varName).trim();
}

/**
 * Check if light mode is active on the given element or any ancestor.
 *
 * @param element - The element to check
 * @returns true if light mode is active
 */
export function isLightMode(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (current.classList.contains("light")) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}
