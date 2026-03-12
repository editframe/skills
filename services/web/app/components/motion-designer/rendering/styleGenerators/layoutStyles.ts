import type {
  ElementNode,
  MotionDesignerState,
} from "~/lib/motion-designer/types";
import type { CSSProperties } from "react";

function isContainer(element: ElementNode): boolean {
  return element.type === "div" || element.type === "timegroup";
}

function isTimegroup(element: ElementNode): boolean {
  return element.type === "timegroup";
}

function isContentElement(element: ElementNode): boolean {
  return (
    element.type === "text" ||
    element.type === "audio" ||
    element.type === "video" ||
    element.type === "image" ||
    element.type === "waveform" ||
    element.type === "captions"
  );
}

function isMediaElement(element: ElementNode): boolean {
  return element.type === "video" || element.type === "image";
}

function isRootTimegroup(
  element: ElementNode,
  state: MotionDesignerState,
): boolean {
  return (
    element.type === "timegroup" &&
    state.composition.rootTimegroupIds.includes(element.id)
  );
}

function isChildOfContainer(
  element: ElementNode,
  state: MotionDesignerState,
): boolean {
  if (!element.parentId) return false;
  const parent = state.composition.elements[element.parentId];
  return parent ? isContainer(parent) : false;
}

function generatePaddingStyles(
  padding:
    | { top?: number; right?: number; bottom?: number; left?: number }
    | undefined,
): CSSProperties {
  if (!padding) {
    return {};
  }

  // Check if any padding value is explicitly set (not undefined)
  const hasAnyValue =
    padding.top !== undefined ||
    padding.right !== undefined ||
    padding.bottom !== undefined ||
    padding.left !== undefined;
  if (!hasAnyValue) {
    return {};
  }

  const top = padding.top ?? 0;
  const right = padding.right ?? 0;
  const bottom = padding.bottom ?? 0;
  const left = padding.left ?? 0;

  // If all sides are equal, use shorthand
  if (top === right && right === bottom && bottom === left) {
    return { padding: `${top}px` };
  }

  // If top/bottom equal and left/right equal, use two-value shorthand
  if (top === bottom && left === right) {
    return { padding: `${top}px ${right}px` };
  }

  // Otherwise use individual properties
  const styles: CSSProperties = {};
  if (padding.top !== undefined) {
    styles.paddingTop = `${top}px`;
  }
  if (padding.right !== undefined) {
    styles.paddingRight = `${right}px`;
  }
  if (padding.bottom !== undefined) {
    styles.paddingBottom = `${bottom}px`;
  }
  if (padding.left !== undefined) {
    styles.paddingLeft = `${left}px`;
  }

  return styles;
}

export function generateLayoutStyles(
  element: ElementNode,
  state: MotionDesignerState,
): CSSProperties {
  const styles: CSSProperties = {};

  // Apply box-sizing: border-box to all elements for consistent sizing
  styles.boxSizing = "border-box";

  const isContainerElement = isContainer(element);
  const isContent = isContentElement(element);
  const isMedia = isMediaElement(element);

  // Position: Only for root timegroups or elements not in containers
  if (
    element.props.position &&
    (isRootTimegroup(element, state) || !isChildOfContainer(element, state))
  ) {
    styles.position = element.props.positionMode || "absolute";
    styles.left = `${element.props.position.x}px`;
    styles.top = `${element.props.position.y}px`;
  }

  // Size: Fixed pixel dimensions
  // Handle both legacy size format and direct width/height props
  let width: number | undefined;
  let height: number | undefined;

  if (element.props.size) {
    if (
      typeof element.props.size === "object" &&
      "width" in element.props.size &&
      "height" in element.props.size
    ) {
      // Legacy format: { width: number, height: number }
      // Treat 0 as "not set" (undefined)
      if (element.props.size.width !== 0) {
        width = element.props.size.width;
      }
      if (element.props.size.height !== 0) {
        height = element.props.size.height;
      }
    } else if (
      typeof element.props.size === "object" &&
      "widthMode" in element.props.size
    ) {
      // New format with modes - extract fixed values if available
      const sizeObj = element.props.size as any;
      if (
        sizeObj.widthMode === "fixed" &&
        typeof sizeObj.widthValue === "number" &&
        sizeObj.widthValue !== 0
      ) {
        width = sizeObj.widthValue;
      }
      if (
        sizeObj.heightMode === "fixed" &&
        typeof sizeObj.heightValue === "number" &&
        sizeObj.heightValue !== 0
      ) {
        height = sizeObj.heightValue;
      }
    }
  }

  // Fallback to direct props (but NOT for timegroups - they use size property only)
  if (!isTimegroup(element)) {
    if (
      width === undefined &&
      element.props.width !== undefined &&
      element.props.width !== 0
    ) {
      width = element.props.width;
    }
    if (
      height === undefined &&
      element.props.height !== undefined &&
      element.props.height !== 0
    ) {
      height = element.props.height;
    }
  }

  // Check if this element is a child of a grid container
  const isInGridContainer = isChildOfContainer(element, state);

  // Apply size
  if (isTimegroup(element)) {
    // Timegroups: Always have fixed pixel size (default to 100px if not set)
    // Timegroups define the composition size, so they must have explicit dimensions
    // IMPORTANT: Only use element.props.size for timegroups, never fallback width/height props
    styles.width = `${width ?? 100}px`;
    styles.height = `${height ?? 100}px`;
  } else if (isContainerElement) {
    // Divs (containers): Set width/height if explicitly provided
    // If in grid container and no explicit size, fill grid cell
    if (width !== undefined && width !== 0) {
      styles.width = `${width}px`;
    } else if (isInGridContainer) {
      // Fill grid cell if no explicit width
      styles.width = "100%";
    }

    if (height !== undefined && height !== 0) {
      styles.height = `${height}px`;
    } else if (isInGridContainer) {
      // Fill grid cell if no explicit height
      styles.height = "100%";
    }
  } else if (isContent) {
    if (width !== undefined && width !== 0) {
      // Explicit width set
      styles.width = `${width}px`;
    } else if (isInGridContainer) {
      if (isMedia) {
        // Media elements: Don't set width/height - let ef-fit-scale measure intrinsic size
        // ef-fit-scale will wrap these and scale them to fit
      } else {
        // Non-media content in grid: fill grid cell
        styles.width = "100%";
      }
    }

    if (height !== undefined && height !== 0) {
      // Explicit height set
      styles.height = `${height}px`;
    } else if (isInGridContainer) {
      if (isMedia) {
        // Media elements: Don't set height - let ef-fit-scale measure intrinsic size
      } else {
        // Non-media content in grid: fill grid cell
        styles.height = "100%";
      }
    }
  }

  // Container layout: Grid with horizontal or vertical direction
  if (isContainerElement) {
    styles.display = "grid";
    const layoutDirection = element.props.layoutDirection || "vertical";

    if (layoutDirection === "horizontal") {
      // Horizontal: children flow in columns (side by side)
      // Auto-place children in columns, each taking equal space
      styles.gridAutoFlow = "column";
      styles.gridAutoColumns = "1fr";
      styles.gridTemplateRows = "1fr";
    } else {
      // Vertical: children flow in rows (stacked)
      // Auto-place children in rows, each taking equal space
      styles.gridAutoFlow = "row";
      styles.gridAutoRows = "1fr";
      styles.gridTemplateColumns = "1fr";
    }

    // Gap between children
    if (element.props.gap !== undefined) {
      styles.gap = `${element.props.gap}px`;
    }

    // Alignment: justify-items (horizontal) and align-items (vertical)
    // These control how children align within their grid cells
    if (element.props.justifyItems) {
      styles.justifyItems = element.props.justifyItems;
    }
    if (element.props.alignItems) {
      styles.alignItems = element.props.alignItems;
    }

    // Containers clip their children (especially media elements that render at intrinsic size)
    styles.overflow = "hidden";
  }

  // Set container-type: size for containers to enable container query units (cqh, cqw)
  if (isContainerElement) {
    styles.containerType = "size";
  }

  // Padding: Apply to all elements
  const paddingStyles = generatePaddingStyles(element.props.padding);
  Object.assign(styles, paddingStyles);

  return styles;
}
