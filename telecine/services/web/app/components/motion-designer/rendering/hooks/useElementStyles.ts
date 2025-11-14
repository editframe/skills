import React from "react";
import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import { generateVisualStyles } from "../styleGenerators/visualStyles";
import { generateLayoutStyles } from "../styleGenerators/layoutStyles";
import { generateTextStyles } from "../styleGenerators/textStyles";

export function useElementStyles(element: ElementNode, state: MotionDesignerState): { styles: React.CSSProperties } {
  // Check if element has opacity or transform animations
  const hasOpacityAnimations = element.animations.some((anim) => anim.property === "opacity");
  const hasTransformAnimations = element.animations.some((anim) => 
    anim.property === "rotation" || anim.property === "position" || anim.property === "scale"
  );
  
  // Combine all style generators: layout (position, size) + visual (colors, effects) + text (typography)
  const layoutStyles = generateLayoutStyles(element, state);
  const visualStyles = generateVisualStyles(element, hasOpacityAnimations, hasTransformAnimations);
  const textStyles = generateTextStyles(element);
  
  const styles = {
    ...layoutStyles,
    ...visualStyles,
    ...textStyles,
  };
  
  return { styles };
}
