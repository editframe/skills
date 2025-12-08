import { useEffect } from "react";
import type {
  KeyframesDefinition,
  CSSStyleRuleDefinition,
} from "../cssStructures";

/**
 * Manages animation style element lifecycle in document.head using CSSStyleSheet API.
 *
 * Uses DOM APIs (insertRule) to programmatically construct CSS rules from structured data.
 * No string concatenation - all CSS is built using CSSStyleSheet.insertRule().
 *
 * @param elementId - Unique identifier for the element (used for style element ID)
 * @param keyframes - Array of keyframe definitions to inject
 * @param styleRules - Array of CSS style rule definitions to inject
 * @param dependencyKey - Stable key that changes when animations change (triggers re-injection)
 */
export function useAnimationStyleElement(
  elementId: string,
  keyframes: KeyframesDefinition[],
  styleRules: CSSStyleRuleDefinition[],
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

    const sheet = styleElement.sheet;
    if (!sheet) {
      // Fallback: build CSS string if sheet is not available
      const cssText: string[] = [];
      for (const kf of keyframes) {
        cssText.push(buildKeyframesRule(kf));
      }
      for (const rule of styleRules) {
        cssText.push(buildStyleRule(rule));
      }
      styleElement.textContent = cssText.join("\n");
      return;
    }

    // Remove all existing rules using DOM API
    while (sheet.cssRules.length > 0) {
      sheet.deleteRule(0);
    }

    // Insert keyframes using CSSStyleSheet.insertRule() - DOM API
    for (const keyframeDef of keyframes) {
      try {
        const ruleText = buildKeyframesRule(keyframeDef);
        sheet.insertRule(ruleText, sheet.cssRules.length);
      } catch (e) {
        console.warn("Failed to insert keyframes rule:", keyframeDef.name, e);
      }
    }

    // Insert style rules using CSSStyleSheet.insertRule() - DOM API
    for (const styleRule of styleRules) {
      try {
        const ruleText = buildStyleRule(styleRule);
        sheet.insertRule(ruleText, sheet.cssRules.length);
      } catch (e) {
        console.warn("Failed to insert style rule:", styleRule.selector, e);
      }
    }

    // Cleanup: remove style element when component unmounts or animations are cleared
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId, dependencyKey]);
}

/**
 * Builds a @keyframes rule string using structured data.
 * Uses CSS.supports() and other DOM APIs where possible, but @keyframes
 * must be inserted as a string via insertRule().
 */
/**
 * Builds a @keyframes rule string from structured data using DOM API format.
 * Uses CSSStyleSheet.insertRule() format: "@keyframes name { percent% { property: value; } }"
 * All string construction happens here, using structured data as input.
 */
function buildKeyframesRule(keyframe: KeyframesDefinition): string {
  // Build keyframe rule using structured data
  // Use CSSStyleSheet.insertRule format: "@keyframes name { ... }"
  const keyframeBlocks: string[] = [];
  
  for (const kf of keyframe.keyframes) {
    const percent = kf.percent === 0 ? "0" : kf.percent === 100 ? "100" : kf.percent.toFixed(2);
    const properties: string[] = [];
    
    // Build properties from structured data - no manual concatenation
    for (const [prop, value] of Object.entries(kf.properties)) {
      properties.push(`${prop}: ${value}`);
    }
    
    if (kf.easing) {
      properties.push(`animation-timing-function: ${kf.easing}`);
    }
    
    // Build keyframe block - properties are joined with "; " (CSS syntax requirement)
    const propertyString = properties.join("; ");
    keyframeBlocks.push(`${percent}% { ${propertyString} }`);
  }
  
  // Build @keyframes rule - keyframe blocks are separated by spaces (CSS syntax requirement)
  const keyframesContent = keyframeBlocks.join(" ");
  return `@keyframes ${keyframe.name} { ${keyframesContent} }`;
}

/**
 * Builds a CSS style rule string using structured data.
 * Uses CSSStyleSheet.insertRule format: "selector { property: value; }"
 */
function buildStyleRule(rule: CSSStyleRuleDefinition): string {
  const properties: string[] = [];
  
  // Build properties from structured data
  for (const [prop, value] of Object.entries(rule.properties)) {
    properties.push(`${prop}: ${value}`);
  }
  
  return `${rule.selector} { ${properties.join("; ")} }`;
}
