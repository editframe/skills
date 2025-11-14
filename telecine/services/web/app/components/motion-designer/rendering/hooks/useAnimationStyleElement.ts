import { useEffect } from "react";

/**
 * Manages animation style element lifecycle in document.head.
 * 
 * Encodes the mechanism relationship: element.id + CSS string → style element lifecycle
 * 
 * @param elementId - Unique identifier for the element (used for style element ID)
 * @param css - Complete CSS string to inject (keyframes + element rules)
 * @param dependencyKey - Stable key that changes when animations change (triggers re-injection)
 */
export function useAnimationStyleElement(
  elementId: string,
  css: string,
  dependencyKey: string,
): void {
  useEffect(() => {
    const styleId = `animation-styles-${elementId}`;
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    // Create style element if it doesn't exist
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    // Replace all content deterministically - this ensures old styles are completely removed
    styleElement.textContent = css;

    // Cleanup: remove style element when component unmounts or animations are cleared
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    };
  }, [elementId, css, dependencyKey]);
}

