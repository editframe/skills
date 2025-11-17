import type { ElementNode } from "~/lib/motion-designer/types";
import type { CSSProperties } from "react";
import { hasRotateAnimations } from "./rotationUtils";

export function generateVisualStyles(
  element: ElementNode,
  hasOpacityAnimations: boolean,
  hasTransformAnimations: boolean,
): CSSProperties {
  const styles: CSSProperties = {};

  if (element.props.opacity !== undefined && !hasOpacityAnimations) {
    styles.opacity = element.props.opacity;
  }

  if (element.props.cornerRadius) {
    styles.borderRadius = `${element.props.cornerRadius}px`;
  }

  if (element.props.fill?.enabled && element.props.fill.color) {
    // Text elements use color for fill, other elements use backgroundColor
    if (element.type === "text") {
      styles.color = element.props.fill.color;
    } else {
      styles.backgroundColor = element.props.fill.color;
    }
  }

  if (element.props.stroke?.enabled) {
    styles.border = `${element.props.stroke.width || 1}px solid ${element.props.stroke.color || "#000"}`;
  }

  if (element.props.shadow?.enabled) {
    const { x = 0, y = 0, blur = 10, color = "#000" } = element.props.shadow;
    styles.boxShadow = `${x}px ${y}px ${blur}px ${color}`;
  }

  if (element.props.blur?.enabled && element.props.blur.amount) {
    styles.filter = `blur(${element.props.blur.amount}px)`;
  }

  // Only suppress design rotation when rotate animations exist (not all transform animations)
  // Other transform animations (translateX, scale) don't conflict with rotation
  const hasRotateAnims = hasRotateAnimations(element);
  if (element.props.rotation && !hasRotateAnims) {
    styles.transform = `rotate(${element.props.rotation}deg)`;
    styles.transformOrigin = "center";
  }

  return styles;
}

