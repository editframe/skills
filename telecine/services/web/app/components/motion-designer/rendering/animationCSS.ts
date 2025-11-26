import type { ElementNode, Animation } from "~/lib/motion-designer/types";
import { isTransformProperty } from "../animations/generateStyles";

function roundMs(value: number): number {
  return Math.round(value);
}

export interface AnimationString {
  name: string;
  duration: number;
  delay: number;
  easing: string;
  fillMode: string;
  index: number;
}

/**
 * Core relationship: animations → animation strings
 * Groups animations by CSS property and generates animation string metadata.
 * This is the single source of truth for animation grouping logic.
 */
export function generateAnimationStrings(
  animations: Animation[],
  elementId: string,
): AnimationString[] {
  if (animations.length === 0) {
    return [];
  }

  // Group animations by CSS property (transform functions map to "transform")
  const animationsByProperty = new Map<
    string,
    Array<{ anim: Animation; index: number }>
  >();
  animations.forEach((anim, index) => {
    const cssProperty = isTransformProperty(anim.property)
      ? "transform"
      : anim.property;
    const existing = animationsByProperty.get(cssProperty) || [];
    existing.push({ anim, index });
    animationsByProperty.set(cssProperty, existing);
  });

  const animationStrings: AnimationString[] = [];

  for (const [cssProperty, group] of animationsByProperty) {
    if (group.length === 1) {
      // Single animation
      const first = group[0];
      if (first) {
        const { anim, index } = first;
        animationStrings.push({
          name: `animation-${elementId}-${index}`,
          duration: roundMs(anim.duration),
          delay: roundMs(anim.delay),
          easing: anim.easing || "ease",
          fillMode: anim.fillMode || "both",
          index,
        });
      }
    } else {
      // Merged animations - use the first animation's index for the name
      const sorted = group.sort((a, b) => a.anim.delay - b.anim.delay);
      const first = sorted[0];
      if (first) {
        const firstStart = first.anim.delay;
        const lastEnd = Math.max(
          ...sorted.map(({ anim }) => anim.delay + anim.duration),
        );
        animationStrings.push({
          name: `animation-${elementId}-${first.index}`,
          duration: roundMs(lastEnd - firstStart),
          delay: roundMs(firstStart),
          easing: first.anim.easing || "ease",
          fillMode: first.anim.fillMode || "both",
          index: first.index,
        });
      }
    }
  }

  return animationStrings;
}

/**
 * Formats animation strings for text split segments with stagger offset support.
 */
export function formatAnimationStringForTextSplit(
  animString: AnimationString,
): string {
  const delayExpression =
    animString.delay > 0
      ? `calc(${animString.delay}ms + var(--ef-stagger-offset, 0ms))`
      : `var(--ef-stagger-offset, 0ms)`;
  return `${animString.name} ${animString.duration}ms ${animString.easing} ${delayExpression} ${animString.fillMode} paused`;
}

/**
 * Formats animation strings for inline element styles.
 */
export function formatAnimationStringForElement(
  animString: AnimationString,
): string {
  return `${animString.name} ${animString.duration}ms ${animString.easing} ${animString.delay}ms ${animString.fillMode} paused`;
}

/**
 * Generates CSS rule for text split animations targeting ef-text-segment.
 */
export function generateTextSplitAnimationCSS(element: ElementNode): string {
  if (element.animations.length === 0) {
    return "";
  }

  const animationStrings = generateAnimationStrings(
    element.animations,
    element.id,
  );
  const formattedStrings = animationStrings.map(
    formatAnimationStringForTextSplit,
  );

  return `\n[data-element-id="${element.id}"] ef-text-segment {\n  animation: ${formattedStrings.join(", ")};\n}`;
}

/**
 * Creates stable dependency key for animations.
 * Used to track when animations change and trigger style element updates.
 */
export function createAnimationKey(element: ElementNode): string {
  if (element.animations.length === 0) {
    return "none";
  }

  return element.animations
    .map((a) => {
      const animKey = `${a.id}-${a.delay}-${a.duration}-${a.property}-${a.fromValue || ""}-${a.toValue || ""}-${a.easing || ""}-${a.fillMode || ""}`;
      if (a.keyframes && a.keyframes.length > 0) {
        return `${animKey}-${a.keyframes.map((kf) => `${kf.time}-${kf.value}`).join("-")}`;
      }
      return animKey;
    })
    .join("-");
}
