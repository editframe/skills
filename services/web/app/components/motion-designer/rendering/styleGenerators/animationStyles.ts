import type { ElementNode } from "~/lib/motion-designer/types";
import type { CSSProperties } from "react";
import {
  generateAnimationStrings,
  formatAnimationStringForElement,
} from "../animationCSS";
import { isTransformProperty } from "../../animations/generateStyles";

export function generateAnimationStyle(element: ElementNode): CSSProperties {
  // Explicitly clear animations when there are none to ensure cleanup
  // Don't include animationPlayState when animation is "none" to avoid React warnings
  if (element.animations.length === 0) {
    return {
      animation: "none",
    };
  }

  // Use unified animation string generation (One Direction of Truth)
  const animationStrings = generateAnimationStrings(
    element.animations,
    element.id,
  );
  const formattedStrings = animationStrings.map(
    formatAnimationStringForElement,
  );

  // Build style object - play-state is included in the animation shorthand
  // This avoids React warnings about mixing shorthand and non-shorthand properties
  const style: CSSProperties = {
    animation: formattedStrings.join(", "),
  };

  return style;
}

export function hasOpacityAnimations(element: ElementNode): boolean {
  return element.animations.some((anim) => anim.property === "opacity");
}

export function hasTransformAnimations(element: ElementNode): boolean {
  return element.animations.some((anim) => isTransformProperty(anim.property));
}
