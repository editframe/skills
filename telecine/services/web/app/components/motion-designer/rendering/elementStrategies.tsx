import React, { type MouseEvent, type ReactNode } from "react";
import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import {
  Timegroup,
  Video,
  Audio,
  Image,
  Text,
  Captions,
  Surface,
  Waveform,
  ThumbnailStrip,
  CaptionsBeforeActiveWord,
  CaptionsAfterActiveWord,
  CaptionsActiveWord,
  CaptionsSegment,
  FitScale,
} from "@editframe/react";
import { needsFitScale } from "@editframe/react";
import { TextSegment } from "./elementRegistry";

export interface RenderContext {
  state: MotionDesignerState;
  parentElement: ElementNode | null;
  mergedStyle: React.CSSProperties;
  baseProps: Record<string, any>;
  textContent: string | null;
  handleClick: (e: MouseEvent) => void;
}

export interface ElementStrategy {
  component: React.ElementType;
  
  transformProps?: (
    element: ElementNode,
    context: RenderContext,
  ) => Record<string, any>;
  
  renderContent?: (
    element: ElementNode,
    context: RenderContext,
  ) => ReactNode;
  
  wrapElement?: (
    element: ElementNode,
    content: ReactNode,
    context: RenderContext,
  ) => ReactNode;
  
  interactionPolicy: {
    clickable: boolean;
    stopPropagation: boolean;
    cursor?: string;
  };
  
  needsAnimationStyle?: (element: ElementNode) => boolean;
}

export interface ElementStrategyInput extends Partial<Omit<ElementStrategy, "component">> {
  component: React.ElementType;
}

// ============================================================================
// Default Policies and Helpers
// ============================================================================

const DEFAULT_INTERACTION_POLICY = {
  clickable: true,
  stopPropagation: true,
  cursor: "pointer" as const,
};

const NON_INTERACTIVE_POLICY = {
  clickable: false,
  stopPropagation: false,
} as const;

/**
 * Determines if FitScale should be applied.
 * Uses elements package API when parent DOM element is available,
 * falls back to motion designer state when not.
 */
function shouldApplyFitScale(
  parent: ElementNode | null,
  mergedStyle: React.CSSProperties,
): boolean {
  // Try to get parent DOM element to use elements package API
  if (parent?.id) {
    // Try to find parent element in DOM
    const parentElement =
      (document.querySelector(
        `[data-element-id="${parent.id}"]`,
      ) as HTMLElement) ||
      (document.querySelector(
        `[data-timegroup-id="${parent.id}"]`,
      ) as HTMLElement) ||
      (document.querySelector(`ef-timegroup#${parent.id}`) as HTMLElement);

    if (parentElement) {
      // Use elements package API
      const hasExplicitSize = !!(mergedStyle.width || mergedStyle.height);
      return needsFitScale(parentElement, hasExplicitSize);
    }
  }

  // Fallback: check motion designer state
  // This is less ideal but necessary when DOM isn't available yet
  const isInGridContainer =
    parent?.type === "div" || parent?.type === "timegroup" || false;
  const hasExplicitSize = !!(mergedStyle.width || mergedStyle.height);
  return isInGridContainer && !hasExplicitSize;
}

function applyFitScalePropsTransform(
  _element: ElementNode,
  context: RenderContext,
): Record<string, any> {
  const props: Record<string, any> = { ...context.baseProps };
  
  if (shouldApplyFitScale(context.parentElement, context.mergedStyle)) {
    props.style = {
      ...context.mergedStyle,
      display: "inline-block",
      width: "auto",
      height: "auto",
    };
  }
  
  return props;
}

function applyFitScaleWrapper(
  element: ElementNode,
  content: ReactNode,
  context: RenderContext,
): ReactNode {
  if (shouldApplyFitScale(context.parentElement, context.mergedStyle)) {
    return (
      <FitScale
        key={`fit-scale-${element.id}`}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {content}
      </FitScale>
    );
  }
  return content;
}

function ensureIdAttribute(
  props: Record<string, any>,
  element: ElementNode,
): Record<string, any> {
  if (!props.id) {
    props.id = element.id;
  }
  return props;
}

// ============================================================================
// Element Strategy Registry
// ============================================================================

const elementStrategiesRegistry: Record<string, ElementStrategy> = {};

export function registerElementStrategy(
  type: string,
  input: ElementStrategyInput,
): void {
  const strategy: ElementStrategy = {
    ...input,
    interactionPolicy: input.interactionPolicy ?? DEFAULT_INTERACTION_POLICY,
  };
  elementStrategiesRegistry[type] = strategy;
}

export function getElementStrategy(
  type: string,
): ElementStrategy | undefined {
  return elementStrategiesRegistry[type];
}

export const elementStrategies = elementStrategiesRegistry;

// ============================================================================
// Strategy Registrations
// ============================================================================

registerElementStrategy("text", {
  component: Text,
  
  renderContent: (_element: ElementNode, context: RenderContext) => {
    if (!context.textContent) return null;
    return (
      <>
        <TextSegment />
        {context.textContent}
      </>
    );
  },
  
  needsAnimationStyle: (element: ElementNode) => {
    return !element.props.split;
  },
});

registerElementStrategy("captions", {
  component: Captions,
  
  renderContent: (element: ElementNode, _context: RenderContext) => {
    return (
      <>
        {element.props.showBefore !== false && <CaptionsBeforeActiveWord />}
        {element.props.showAfter !== false && <CaptionsAfterActiveWord />}
        {element.props.showActive !== false && <CaptionsActiveWord />}
        {element.props.showSegment !== false && <CaptionsSegment />}
      </>
    );
  },
});

registerElementStrategy("video", {
  component: Video,
  
  transformProps: (element: ElementNode, context: RenderContext): Record<string, any> => {
    const props = applyFitScalePropsTransform(element, context);
    props.id = element.id;
    return props;
  },
  
  wrapElement: applyFitScaleWrapper,
});

registerElementStrategy("image", {
  component: Image,
  
  transformProps: applyFitScalePropsTransform,
  
  wrapElement: applyFitScaleWrapper,
});

registerElementStrategy("timegroup", {
  component: Timegroup,
  
  transformProps: (element: ElementNode, context: RenderContext): Record<string, any> => {
    return ensureIdAttribute({ ...context.baseProps }, element);
  },
  
  interactionPolicy: NON_INTERACTIVE_POLICY,
});

registerElementStrategy("div", {
  component: "div",
});

registerElementStrategy("audio", {
  component: Audio,
});

registerElementStrategy("surface", {
  component: Surface,
});

registerElementStrategy("waveform", {
  component: Waveform,
});

registerElementStrategy("thumbnailstrip", {
  component: ThumbnailStrip,
});
