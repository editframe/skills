import type { ElementNode } from "~/lib/motion-designer/types";
import type { CSSProperties } from "react";

export function generateTextStyles(
  element: ElementNode,
): CSSProperties {
  if (element.type !== "text") {
    return {};
  }

  const styles: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
  };

  if (element.props.fontFamily) {
    styles.fontFamily = element.props.fontFamily;
  }
  if (element.props.fontSize) {
    styles.fontSize = `${element.props.fontSize}px`;
  }
  if (element.props.textAlign) {
    const alignMap: Record<string, string> = {
      left: "flex-start",
      center: "center",
      right: "flex-end",
      justify: "space-between",
    };
    styles.justifyContent = alignMap[element.props.textAlign] || "flex-start";
    styles.textAlign = element.props.textAlign;
  }
  if (element.props.lineHeight) {
    styles.lineHeight = element.props.lineHeight;
  }
  if (element.props.letterSpacing) {
    styles.letterSpacing = element.props.letterSpacing;
  }
  if (element.props.textTransform) {
    styles.textTransform = element.props.textTransform;
  }

  return styles;
}

