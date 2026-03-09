import React, { type MouseEvent } from "react";
import type {
  MotionDesignerState,
  ElementNode,
} from "~/lib/motion-designer/types";
import { generateAnimationKeyframes } from "../animations/generateStyles";
import { generateAnimationStyle } from "./styleGenerators/animationStyles";
import { useElementStyles } from "./hooks/useElementStyles";
import { useElementProps } from "./hooks/useElementProps";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import {
  generateTextSplitAnimationRule,
  createAnimationKey,
} from "./animationCSS";
import { useAnimationStyleElement } from "./hooks/useAnimationStyleElement";
import type {
  KeyframesDefinition,
  CSSStyleRuleDefinition,
} from "./cssStructures";
import {
  elementStrategies,
  type RenderContext,
  type ElementStrategy,
} from "./elementStrategies";

interface ElementRendererProps {
  element: ElementNode;
  state: MotionDesignerState;
  parentElement?: ElementNode | null;
}

function composeElementStyles(
  existingStyle: React.CSSProperties | undefined,
  designStyles: React.CSSProperties,
): React.CSSProperties {
  return {
    ...existingStyle,
    ...designStyles,
  };
}

function assembleAnimationRules(
  element: ElementNode,
  keyframeDefinitions: KeyframesDefinition[],
  animationStyle: React.CSSProperties | null,
  isTextWithSplit: boolean,
): {
  keyframes: KeyframesDefinition[];
  styleRules: CSSStyleRuleDefinition[];
} {
  const styleRules: CSSStyleRuleDefinition[] = [];

  if (isTextWithSplit && element.animations.length > 0) {
    const textSplitRule = generateTextSplitAnimationRule(element);
    if (textSplitRule) {
      styleRules.push(textSplitRule);
    }
  } else if (animationStyle) {
    const selector = `[data-element-id="${element.id}"]`;
    if (animationStyle.animation === "none") {
      styleRules.push({
        selector,
        properties: { animation: "none" },
      });
    } else if (animationStyle.animation) {
      styleRules.push({
        selector,
        properties: { animation: animationStyle.animation as string },
      });
    }
  }

  return {
    keyframes: keyframeDefinitions,
    styleRules,
  };
}

export function ElementRenderer({
  element,
  state,
  parentElement = null,
}: ElementRendererProps) {
  const strategy: ElementStrategy | undefined = elementStrategies[element.type];

  if (!strategy) {
    return null;
  }

  const actions = useMotionDesignerActions();
  const { styles: designStyles } = useElementStyles(element, state);
  const { props: finalProps, textContent } = useElementProps(element);

  const keyframeDefinitions = generateAnimationKeyframes(element);
  const isTextWithSplit = element.type === "text" && element.props.split;
  const needsAnimationStyle = strategy.needsAnimationStyle
    ? strategy.needsAnimationStyle(element)
    : true;

  const animationStyle =
    isTextWithSplit || !needsAnimationStyle
      ? null
      : generateAnimationStyle(element);

  const animationRules = assembleAnimationRules(
    element,
    keyframeDefinitions,
    animationStyle,
    isTextWithSplit,
  );

  const animationKey = createAnimationKey(element);

  useAnimationStyleElement(
    element.id,
    animationRules.keyframes,
    animationRules.styleRules,
    `${animationKey}-${isTextWithSplit}`,
  );

  const handleClick = (e: MouseEvent) => {
    const policy = strategy.interactionPolicy;
    if (policy?.clickable) {
      if (policy.stopPropagation) {
        e.stopPropagation();
      }
      actions.selectElement(element.id);
    }
  };

  const existingStyle = (finalProps as any).style || {};
  const mergedStyle = composeElementStyles(existingStyle, designStyles);

  const {
    style: _,
    alignItems,
    justifyItems,
    flexDirection,
    justifyContent,
    ...finalPropsWithoutStyle
  } = finalProps;

  const baseProps = {
    ...finalPropsWithoutStyle,
    style: mergedStyle,
    "data-element-id": element.id,
  };

  const context: RenderContext = {
    state,
    parentElement,
    mergedStyle,
    baseProps,
    textContent,
    handleClick,
  };

  const transformedProps = strategy.transformProps
    ? strategy.transformProps(element, context)
    : baseProps;

  const interactionPolicy = strategy.interactionPolicy;

  const finalPropsWithInteraction = {
    ...transformedProps,
    ...(interactionPolicy.clickable
      ? {
          onClick: handleClick,
          style: {
            ...transformedProps.style,
            ...(interactionPolicy.cursor
              ? { cursor: interactionPolicy.cursor }
              : {}),
          },
        }
      : {}),
  };

  const Component = strategy.component;

  const elementContent =
    strategy.renderContent !== undefined
      ? strategy.renderContent(element, context)
      : textContent;

  const children = element.childIds.map((childId) => {
    const child = state.composition.elements[childId];
    if (!child) return null;
    return (
      <ElementRenderer
        key={childId}
        element={child}
        state={state}
        parentElement={element}
      />
    );
  });

  const elementWithChildren = (
    <Component {...finalPropsWithInteraction}>
      {elementContent}
      {children}
    </Component>
  );

  const wrappedContent = strategy.wrapElement
    ? strategy.wrapElement(element, elementWithChildren, context)
    : elementWithChildren;

  return wrappedContent;
}
