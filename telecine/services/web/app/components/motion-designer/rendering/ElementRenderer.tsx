import React, { type MouseEvent } from "react";
import type { MotionDesignerState, ElementNode } from "~/lib/motion-designer/types";
import { elementRegistry, TextSegment } from "./elementRegistry";
import { generateAnimationStyles } from "../animations/generateStyles";
import { generateAnimationStyle } from "./styleGenerators/animationStyles";
import { useElementStyles } from "./hooks/useElementStyles";
import { useElementProps } from "./hooks/useElementProps";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { generateTextSplitAnimationCSS, createAnimationKey } from "./animationCSS";
import { useAnimationStyleElement } from "./hooks/useAnimationStyleElement";

interface ElementRendererProps {
  element: ElementNode;
  state: MotionDesignerState;
  currentTime: number;
}

// ============================================================================
// Element Resolution
// ============================================================================

/**
 * Resolves the React component for an element type from the registry.
 *
 * WHY: Element types map to React components via a registry. This function
 * makes that mapping explicit and handles the case where an element type
 * doesn't exist in the registry (returns null).
 */
const resolveElementComponent = (
  elementType: ElementNode["type"],
): React.ComponentType<any> | null => {
  return elementRegistry[elementType] || null;
};

// ============================================================================
// Style Composition
// ============================================================================

/**
 * Composes final styles by merging design styles with element props styles.
 *
 * WHY: Design styles (from useElementStyles) should override element props styles
 * to ensure consistent visual appearance. This function makes the merge order
 * explicit: props.style is the base, designStyles override it.
 */
const composeElementStyles = (
  existingStyle: React.CSSProperties | undefined,
  designStyles: React.CSSProperties,
): React.CSSProperties => {
  return {
    ...existingStyle,
    ...designStyles,
  };
};

// ============================================================================
// Animation CSS Assembly
// ============================================================================

/**
 * Assembles complete CSS string for animation style element injection.
 *
 * WHY: Animation CSS consists of two parts: keyframes (from generateAnimationStyles)
 * and element rules (from generateAnimationStyle or generateTextSplitAnimationCSS).
 * This function makes the relationship explicit and handles the different paths
 * for text split animations vs regular animations.
 */
const assembleAnimationCSS = (
  element: ElementNode,
  keyframeStyles: string | null,
  animationStyle: React.CSSProperties | null,
  isTextWithSplit: boolean,
): string => {
  let fullCSS = "";

  // Add keyframes if present
  if (keyframeStyles) {
    fullCSS += keyframeStyles;
  }

  // Add element rules based on animation type
  if (isTextWithSplit && element.animations.length > 0) {
    // Text split uses CSS rules targeting ef-text-segment
    fullCSS += generateTextSplitAnimationCSS(element);
  } else if (animationStyle) {
    // Regular animations use inline style rules
    const selector = `[data-element-id="${element.id}"]`;
    if (animationStyle.animation === "none") {
      fullCSS += `\n${selector} {\n  animation: none;\n}`;
    } else if (animationStyle.animation) {
      fullCSS += `\n${selector} {\n  animation: ${animationStyle.animation};\n}`;
    }
  }

  return fullCSS;
};

// ============================================================================
// Interaction Policy
// ============================================================================

/**
 * Builds interaction props based on element type policy.
 *
 * WHY: Timegroup elements should not be clickable or stop propagation, allowing
 * clicks to pass through to parent elements. Other elements should be clickable
 * and stop propagation to prevent parent handlers from firing. This policy
 * makes the distinction explicit.
 */
const buildInteractionProps = (
  element: ElementNode,
  finalProps: Record<string, any>,
  mergedStyle: React.CSSProperties,
  handleClick: (e: MouseEvent) => void,
): Record<string, any> => {
  const baseProps = {
    ...finalProps,
    style: mergedStyle,
    "data-element-id": element.id,
  };

  if (element.type !== "timegroup") {
    // Non-timegroup elements: clickable with pointer cursor
    return {
      ...baseProps,
      onClick: handleClick,
      style: { ...mergedStyle, cursor: "pointer" },
    };
  }

  // Timegroup elements: no click handler, no cursor change
  return baseProps;
};

// ============================================================================
// Component Key Generation
// ============================================================================

/**
 * Generates stable component key for React reconciliation.
 *
 * WHY: Text elements need composite keys that include content and styling
 * properties to ensure React properly reconciles when these change. Non-text
 * elements can use their ID directly since they don't have content-driven
 * reconciliation needs.
 */
const generateComponentKey = (
  element: ElementNode,
  textContent: string | null,
): string => {
  if (element.type === "text") {
    return `${element.id}-${textContent || ""}-${element.props.fontSize || ""}-${element.props.fontFamily || ""}-${element.props.textAlign || ""}`;
  }
  return element.id;
};

// ============================================================================
// Recursive Rendering
// ============================================================================

/**
 * Renders child elements recursively.
 *
 * WHY: Elements form a tree structure via childIds. This function makes
 * the recursive rendering explicit and handles missing child elements gracefully.
 */
const renderChildren = (
  element: ElementNode,
  state: MotionDesignerState,
  currentTime: number,
): (React.ReactElement | null)[] => {
  return element.childIds.map((childId) => {
    const child = state.composition.elements[childId];
    if (!child) return null;
    return (
      <ElementRenderer
        key={childId}
        element={child}
        state={state}
        currentTime={currentTime}
      />
    );
  });
};

// ============================================================================
// Main Component
// ============================================================================

export function ElementRenderer({
  element,
  state,
  currentTime,
}: ElementRendererProps) {
  // Resolve element component
  const Component = resolveElementComponent(element.type);
  if (!Component) {
    return null;
  }

  // Get hooks data
  const actions = useMotionDesignerActions();
  const { styles: designStyles } = useElementStyles(element, state);
  const { props: finalProps, textContent } = useElementProps(element);

  // Assemble animation CSS
  const keyframeStyles = generateAnimationStyles(element);
  const isTextWithSplit = element.type === "text" && element.props.split;
  const animationStyle = isTextWithSplit
    ? null // Text split uses CSS rules, not inline styles
    : generateAnimationStyle(element);

  const fullCSS = assembleAnimationCSS(
    element,
    keyframeStyles,
    animationStyle,
    isTextWithSplit,
  );

  // Create stable dependency key for animations
  const animationKey = createAnimationKey(element);

  // Inject CSS via style element (mechanism separated from CSS generation)
  useAnimationStyleElement(element.id, fullCSS, `${animationKey}-${isTextWithSplit}`);

  // Build interaction props
  const handleClick = (e: MouseEvent) => {
    if (element.type !== "timegroup") {
      e.stopPropagation();
      actions.selectElement(element.id);
    }
  };

  const existingStyle = (finalProps as any).style || {};
  const mergedStyle = composeElementStyles(existingStyle, designStyles);
  const interactiveProps = buildInteractionProps(
    element,
    finalProps,
    mergedStyle,
    handleClick,
  );

  // Generate component key
  const componentKey = generateComponentKey(element, textContent);

  // Render element with children
  return (
    <Component key={componentKey} {...interactiveProps}>
      {element.type === "text" && textContent ? (
        <>
          <TextSegment />
          {textContent}
        </>
      ) : (
        textContent
      )}
      {renderChildren(element, state, currentTime)}
    </Component>
  );
}
