import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import type { CSSProperties } from "react";
import type { ElementSize, LegacyElementSize } from "~/lib/motion-designer/sizingTypes";
import { isLegacySize, normalizeSize } from "~/lib/motion-designer/sizingTypes";

// Check if an element's parent is a flex container
function isParentFlexContainer(
  element: ElementNode,
  state: MotionDesignerState,
): boolean {
  if (!element.parentId) return false;
  
  const parent = state.composition.elements[element.parentId];
  if (!parent) return false;
  
  // Check if parent is a container (div or timegroup) with display: flex
  const isContainer = parent.type === "div" || parent.type === "timegroup";
  return isContainer && parent.props.display === "flex";
}

// Check if element is a text element
function isTextElement(element: ElementNode): boolean {
  return element.type === "text";
}

// Convert sizing mode to CSS width/height
function applySizingMode(
  widthMode: "hug" | "fill" | "fixed",
  widthValue: number,
  heightMode: "hug" | "fill" | "fixed",
  heightValue: number,
  element: ElementNode,
  state: MotionDesignerState,
  styles: CSSProperties,
): void {
  const isFlexChild = isParentFlexContainer(element, state);
  const isText = isTextElement(element);
  const parent = element.parentId ? state.composition.elements[element.parentId] : null;
  const flexDirection = parent?.props.flexDirection || "row";

  // Determine flex property based on flex direction and sizing modes
  // In flex containers, only one dimension controls flex behavior:
  // - Row: width controls flex
  // - Column: height controls flex
  if (isFlexChild) {
    if (flexDirection === "row") {
      // In row flex container, width controls flex behavior
      if (widthMode === "fill") {
        styles.flex = "1 1 0%";
      } else {
        // Hug or fixed: don't grow/shrink, use natural size
        styles.flex = "0 0 auto";
      }
    } else {
      // Column flex container, height controls flex behavior
      if (heightMode === "fill") {
        styles.flex = "1 1 0%";
      } else {
        // Hug or fixed: don't grow/shrink, use natural size
        styles.flex = "0 0 auto";
      }
    }
  }

  // Handle width
  if (widthMode === "hug") {
    // Use fit-content for block elements to shrink-wrap to content
    // For text elements, min-content is more appropriate
    styles.width = isText ? "min-content" : "fit-content";
    // Ensure block elements can shrink-wrap by using inline-block
    // Only if not in flex, not text, and not already a flex container
    if (!isFlexChild && !isText && element.props.display !== "flex") {
      // Mark that we're setting display for hug mode
      (styles as any)._hugDisplaySet = true;
      styles.display = "inline-block";
    }
  } else if (widthMode === "fill") {
    if (!isFlexChild || flexDirection !== "row") {
      // Not in flex or column flex, use percentage
      styles.width = "100%";
    }
    // In row flex, flex property handles sizing
  } else {
    // Fixed mode
    styles.width = `${widthValue}px`;
  }

  // Handle height
  if (heightMode === "hug") {
    // Use fit-content or min-content to shrink-wrap to content
    styles.height = isText ? "min-content" : "fit-content";
    // Text elements get minimum height of 1 line height
    if (isText) {
      styles.minHeight = "1lh";
    }
  } else if (heightMode === "fill") {
    if (!isFlexChild || flexDirection !== "column") {
      // Not in flex or row flex, use percentage
      styles.height = "100%";
    }
    // In column flex, flex property handles sizing
  } else {
    // Fixed mode
    styles.height = `${heightValue}px`;
  }
}

export function generateLayoutStyles(
  element: ElementNode,
  state: MotionDesignerState,
): CSSProperties {
  const styles: CSSProperties = {};

  // Only apply position styles if parent is NOT a flex container
  // In flex containers, position is determined by flexbox layout
  if (element.props.position && !isParentFlexContainer(element, state)) {
    styles.position = element.props.positionMode || "relative";
    styles.left = `${element.props.position.x}px`;
    styles.top = `${element.props.position.y}px`;
  }

  // Handle both legacy and new sizing formats
  const size = normalizeSize(element.props.size);
  if (size) {
    if (isLegacySize(size as LegacyElementSize)) {
      // Legacy format: { width: number, height: number }
      styles.width = `${(size as LegacyElementSize).width}px`;
      styles.height = `${(size as LegacyElementSize).height}px`;
    } else {
      // New format: { widthMode, widthValue, heightMode, heightValue }
      const newSize = size as ElementSize;
      applySizingMode(
        newSize.widthMode,
        newSize.widthValue,
        newSize.heightMode,
        newSize.heightValue,
        element,
        state,
        styles,
      );
    }
  }

  // Set display property, but don't override inline-block set for hug mode
  if (element.props.display) {
    // Only set display if we didn't already set it for hug mode
    if (!(styles as any)._hugDisplaySet) {
      styles.display = element.props.display;
    }
    // Clean up the marker
    delete (styles as any)._hugDisplaySet;
  }

  if (element.props.flexDirection) {
    styles.flexDirection = element.props.flexDirection;
  }
  if (element.props.justifyContent) {
    styles.justifyContent = element.props.justifyContent;
  }
  if (element.props.alignItems) {
    styles.alignItems = element.props.alignItems;
  }
  if (element.props.gap !== undefined) {
    styles.gap = `${element.props.gap}px`;
  }

  if (element.props.padding) {
    if (element.props.padding.top !== undefined) {
      styles.paddingTop = `${element.props.padding.top}px`;
    }
    if (element.props.padding.right !== undefined) {
      styles.paddingRight = `${element.props.padding.right}px`;
    }
    if (element.props.padding.bottom !== undefined) {
      styles.paddingBottom = `${element.props.padding.bottom}px`;
    }
    if (element.props.padding.left !== undefined) {
      styles.paddingLeft = `${element.props.padding.left}px`;
    }
  }

  if (element.props.margin) {
    if (element.props.margin.top !== undefined) {
      styles.marginTop = `${element.props.margin.top}px`;
    }
    if (element.props.margin.right !== undefined) {
      styles.marginRight = `${element.props.margin.right}px`;
    }
    if (element.props.margin.bottom !== undefined) {
      styles.marginBottom = `${element.props.margin.bottom}px`;
    }
    if (element.props.margin.left !== undefined) {
      styles.marginLeft = `${element.props.margin.left}px`;
    }
  }

  return styles;
}

