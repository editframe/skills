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

export function ElementRenderer({
  element,
  state,
  currentTime,
}: ElementRendererProps) {
  const Component = elementRegistry[element.type];
  if (!Component) {
    return null;
  }

  const actions = useMotionDesignerActions();
  const { styles: designStyles } = useElementStyles(element, state);
  const { props: finalProps, textContent } = useElementProps(element);

  // Generate animation CSS
  const keyframeStyles = generateAnimationStyles(element);
  const isTextWithSplit = element.type === "text" && element.props.split;
  const animationStyle = isTextWithSplit 
    ? null // Text split uses CSS rules, not inline styles
    : generateAnimationStyle(element);

  // Build complete CSS string for style element injection
  let fullCSS = "";
  if (keyframeStyles) {
    fullCSS += keyframeStyles;
  }
  if (isTextWithSplit && element.animations.length > 0) {
    fullCSS += generateTextSplitAnimationCSS(element);
  } else if (animationStyle) {
    const selector = `[data-element-id="${element.id}"]`;
    if (animationStyle.animation === "none") {
      fullCSS += `\n${selector} {\n  animation: none;\n}`;
    } else if (animationStyle.animation) {
      fullCSS += `\n${selector} {\n  animation: ${animationStyle.animation};\n}`;
    }
  }

  // Create stable dependency key for animations
  const animationKey = createAnimationKey(element);

  // Inject CSS via style element (mechanism separated from CSS generation)
  useAnimationStyleElement(element.id, fullCSS, `${animationKey}-${isTextWithSplit}`);

  // Build element props (element type → props relationship)
  const handleClick = (e: MouseEvent) => {
    if (element.type !== "timegroup") {
      e.stopPropagation();
      actions.selectElement(element.id);
    }
  };

  const existingStyle = (finalProps as any).style || {};
  const mergedStyle: React.CSSProperties = { 
    ...existingStyle, 
    ...designStyles,
  };
  
  const interactiveProps = element.type !== "timegroup"
    ? { 
        ...finalProps, 
        onClick: handleClick, 
        style: { ...mergedStyle, cursor: "pointer" },
        "data-element-id": element.id,
      }
    : { 
        ...finalProps, 
        style: mergedStyle,
        "data-element-id": element.id,
      };

  // Build component key (element type → key relationship)
  const componentKey = element.type === "text" 
    ? `${element.id}-${textContent || ""}-${element.props.fontSize || ""}-${element.props.fontFamily || ""}-${element.props.textAlign || ""}`
    : element.id;

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
      {element.childIds.map((childId) => {
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
      })}
    </Component>
  );
}

