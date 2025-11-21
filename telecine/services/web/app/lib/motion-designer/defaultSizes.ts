import type { ElementSize } from "./sizingTypes";
import type { ElementNode, MotionDesignerState } from "./types";

export function createDefaultSize(
  elementType: ElementNode["type"],
  width: number,
  height: number,
): ElementSize {
  // Text elements default to hug mode
  if (elementType === "text") {
    return {
      widthMode: "hug",
      widthValue: 0,
      heightMode: "hug",
      heightValue: 0,
    };
  }
  
  // Other elements default to fixed
  return {
    widthMode: "fixed",
    widthValue: width,
    heightMode: "fixed",
    heightValue: height,
  };
}

export function createDefaultSizeForFlexChild(
  elementType: ElementNode["type"],
): ElementSize {
  // Flex children default to fill mode for equal distribution
  if (elementType === "text") {
    return {
      widthMode: "hug",
      widthValue: 0,
      heightMode: "hug",
      heightValue: 0,
    };
  }
  
  return {
    widthMode: "fill",
    widthValue: 0,
    heightMode: "fill",
    heightValue: 0,
  };
}

export function isFlexChild(
  element: ElementNode,
  state: MotionDesignerState,
): boolean {
  if (!element.parentId) return false;
  
  const parent = state.composition.elements[element.parentId];
  if (!parent) return false;
  
  const isContainer = parent.type === "div" || parent.type === "timegroup";
  return isContainer && parent.props.display === "flex";
}



