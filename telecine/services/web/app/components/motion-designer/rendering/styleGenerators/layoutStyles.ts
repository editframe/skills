import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import type { CSSProperties } from "react";

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

  if (element.props.size) {
    styles.width = `${element.props.size.width}px`;
    styles.height = `${element.props.size.height}px`;
  }

  if (element.props.display) {
    styles.display = element.props.display;
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

