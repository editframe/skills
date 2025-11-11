import {
  deepGetTemporalElements,
  type TemporalMixinInterface,
} from "./EFTemporal.ts";

// All animatable elements are temporal elements with HTMLElement interface
export type AnimatableElement = TemporalMixinInterface & HTMLElement;

// Constants
const ANIMATION_PRECISION_OFFSET = 0.1; // Use 0.1ms to safely avoid completion threshold
const DEFAULT_ANIMATION_ITERATIONS = 1;
const PROGRESS_PROPERTY = "--ef-progress";
const DURATION_PROPERTY = "--ef-duration";
const TRANSITION_DURATION_PROPERTY = "--ef-transition-duration";
const TRANSITION_OUT_START_PROPERTY = "--ef-transition-out-start";

/**
 * Represents the temporal state of an element relative to the timeline
 */
interface TemporalState {
  progress: number;
  isVisible: boolean;
  timelineTimeMs: number;
}

/**
 * Evaluates what the element's state should be based on the timeline
 */
export const evaluateTemporalState = (
  element: AnimatableElement,
): TemporalState => {
  // Get timeline time from root timegroup, or use element's own time if it IS a timegroup
  const timelineTimeMs = (element.rootTimegroup ?? element).currentTimeMs;

  const progress =
    element.durationMs <= 0
      ? 1
      : Math.max(0, Math.min(1, element.currentTimeMs / element.durationMs));

  // Root elements and elements aligned with composition end should remain visible at exact end time
  // Text segments should also use inclusive end since they're meant to be visible for full duration
  // Other elements use exclusive end for clean transitions
  const isRootElement = !(element as any).parentTimegroup;
  const isLastElementInComposition =
    element.endTimeMs === element.rootTimegroup?.endTimeMs;
  const isTextSegment = element.tagName === "EF-TEXT-SEGMENT";
  const useInclusiveEnd = isRootElement || isLastElementInComposition || isTextSegment;

  const isVisible =
    element.startTimeMs <= timelineTimeMs &&
    (useInclusiveEnd
      ? element.endTimeMs >= timelineTimeMs
      : element.endTimeMs > timelineTimeMs);

  return { progress, isVisible, timelineTimeMs };
};

/**
 * Evaluates element visibility specifically for animation coordination
 * Uses inclusive end boundaries to prevent animation jumps at exact boundaries
 */
export const evaluateTemporalStateForAnimation = (
  element: AnimatableElement,
): TemporalState => {
  // Get timeline time from root timegroup, or use element's own time if it IS a timegroup
  const timelineTimeMs = (element.rootTimegroup ?? element).currentTimeMs;

  const progress =
    element.durationMs <= 0
      ? 1
      : Math.max(0, Math.min(1, element.currentTimeMs / element.durationMs));

  // For animation coordination, use inclusive end for ALL elements to prevent visual jumps
  const isVisible =
    element.startTimeMs <= timelineTimeMs &&
    element.endTimeMs >= timelineTimeMs;

  return { progress, isVisible, timelineTimeMs };
};

/**
 * Updates the visual state (CSS + display) to match temporal state
 */
const updateVisualState = (
  element: AnimatableElement,
  state: TemporalState,
): void => {
  // Always set progress (needed for many use cases)
  element.style.setProperty(PROGRESS_PROPERTY, `${state.progress * 100}%`);

  // Handle visibility
  if (!state.isVisible) {
    if (element.style.display !== "none") {
      element.style.display = "none";
    }
    return;
  }

  if (element.style.display === "none") {
    element.style.display = "";
  }

  // Set other CSS properties for visible elements only
  element.style.setProperty(DURATION_PROPERTY, `${element.durationMs}ms`);
  element.style.setProperty(
    TRANSITION_DURATION_PROPERTY,
    `${element.parentTimegroup?.overlapMs ?? 0}ms`,
  );
  element.style.setProperty(
    TRANSITION_OUT_START_PROPERTY,
    `${element.durationMs - (element.parentTimegroup?.overlapMs ?? 0)}ms`,
  );
};

/**
 * Coordinates animations for a single element and its subtree, using the element as the time source
 */
const coordinateAnimationsForSingleElement = (
  element: AnimatableElement,
): void => {
  // Get animations on the element itself and its subtree
  // CSS animations created via the 'animation' property are included
  const animations = element.getAnimations({ subtree: true });

  for (const animation of animations) {
    // Ensure animation is in a playable state (not finished)
    // Finished animations can't be controlled, so reset them
    if (animation.playState === "finished") {
      animation.cancel();
      // Re-initialize the animation so it can be controlled
      animation.play();
      animation.pause();
    } else if (animation.playState === "running") {
      // Pause running animations so we can control them manually
      animation.pause();
    }

    const effect = animation.effect;
    if (!(effect && effect instanceof KeyframeEffect)) {
      continue;
    }

    const target = effect.target;
    if (!target) {
      continue;
    }

    // For animations in this element's subtree, always use this element as the time source
    // This handles both animations directly on the temporal element and on its non-temporal children
    const timing = effect.getTiming();
    // Duration and delay from getTiming() are already in milliseconds
    // They include CSS animation-duration and animation-delay values
    let duration = Number(timing.duration) || 0;
    let delay = Number(timing.delay) || 0;
    
    // Always read delay from computed styles to ensure we get CSS animation-delay
    // getTiming().delay might not always reflect CSS animation-delay correctly
    // This is especially important when animations are paused early
    if (target instanceof HTMLElement) {
      const computedStyle = window.getComputedStyle(target);
      const animationDelays = computedStyle.animationDelay.split(", ").map(s => s.trim());
      
      // Parse CSS delay value
      const parseDelay = (delayStr: string): number => {
        if (delayStr === "0s" || delayStr === "0ms") {
          return 0;
        }
        const delayMatch = delayStr.match(/^([\d.]+)(s|ms)$/);
        if (delayMatch && delayMatch[1] && delayMatch[2]) {
          const value = parseFloat(delayMatch[1]);
          const unit = delayMatch[2];
          return unit === "s" ? value * 1000 : value;
        }
        return 0;
      };
      
      // If there's only one animation/delay, use it directly
      if (animationDelays.length === 1 && animationDelays[0]) {
        const parsedDelay = parseDelay(animationDelays[0]);
        // Only override if we successfully parsed a value (or if it's explicitly 0)
        if (parsedDelay !== 0 || animationDelays[0] === "0s" || animationDelays[0] === "0ms") {
          delay = parsedDelay;
        }
      } else {
        // Multiple animations: try to match by index
        const allAnimations = Array.from(target.getAnimations());
        const animationIndex = allAnimations.indexOf(animation);
        if (animationIndex >= 0 && animationIndex < animationDelays.length && animationDelays[animationIndex]) {
          const parsedDelay = parseDelay(animationDelays[animationIndex]);
          // Only override if we successfully parsed a value (or if it's explicitly 0)
          if (parsedDelay !== 0 || animationDelays[animationIndex] === "0s" || animationDelays[animationIndex] === "0ms") {
            delay = parsedDelay;
          }
        }
      }
    }
    
    const iterations =
      Number(timing.iterations) || DEFAULT_ANIMATION_ITERATIONS;

    if (duration <= 0) {
      animation.currentTime = 0;
      continue;
    }

    // Use the element itself as the time source (it's guaranteed to be temporal)
    let currentTime = element.ownCurrentTimeMs ?? 0;

    // Special case for ef-text-segment: apply stagger offset for animation timing
    // This allows staggered animations while keeping visibility timing unchanged
    // We ADD the stagger offset to the delay, so animations start later for later segments
    let effectiveDelay = delay;
    if (
      element.tagName === "EF-TEXT-SEGMENT" &&
      (element as any).staggerOffsetMs !== undefined
    ) {
      const staggerOffsetMs = (element as any).staggerOffsetMs as number;
      effectiveDelay = delay + staggerOffsetMs;
    }

    // If before delay, show initial keyframe state (0% of animation)
    // Use strict < instead of <= so animations can start immediately when delay is reached
    if (currentTime < effectiveDelay) {
      // Set to 0 to show initial keyframe (animation time, not including delay)
      // When manually controlling animation.currentTime, 0 represents the start of the animation
      animation.currentTime = 0;
      continue;
    }

    const adjustedTime = currentTime - effectiveDelay;
    const currentIteration = Math.floor(adjustedTime / duration);
    let currentIterationTime = adjustedTime % duration;

    // Handle animation-direction
    const direction = timing.direction || "normal";
    const shouldReverse =
      direction === "reverse" ||
      (direction === "alternate" && currentIteration % 2 === 1) ||
      (direction === "alternate-reverse" && currentIteration % 2 === 0);

    if (shouldReverse) {
      currentIterationTime = duration - currentIterationTime;
    }

    if (currentIteration >= iterations) {
      // Animation would be complete - clamp to just before completion
      // This prevents the animation from being removed from the element
      // animation.currentTime is the time within the animation (not including delay)
      const maxSafeAnimationTime = duration * iterations - ANIMATION_PRECISION_OFFSET;
      animation.currentTime = maxSafeAnimationTime;
    } else {
      // Animation in progress - clamp to safe value within current iteration
      // Note: animation.currentTime is the time within the animation itself (not including delay)
      // We need to account for which iteration we're in
      const timeWithinAnimation = currentIteration * duration + currentIterationTime;
      // Clamp to prevent completion (use epsilon before the end)
      const maxSafeAnimationTime = duration * iterations - ANIMATION_PRECISION_OFFSET;
      animation.currentTime = Math.min(timeWithinAnimation, maxSafeAnimationTime);
    }
  }
};

/**
 * Main function: synchronizes DOM element with timeline
 */
export const updateAnimations = (element: AnimatableElement): void => {
  const temporalState = evaluateTemporalState(element);
  deepGetTemporalElements(element).forEach((temporalElement) => {
    const temporalState = evaluateTemporalState(temporalElement);
    updateVisualState(temporalElement, temporalState);
  });
  updateVisualState(element, temporalState);

  // Coordinate animations - use animation-specific visibility to prevent jumps at exact boundaries
  const animationState = evaluateTemporalStateForAnimation(element);
  if (animationState.isVisible) {
    coordinateAnimationsForSingleElement(element);
  }

  // Coordinate animations for child elements using animation-specific visibility
  deepGetTemporalElements(element).forEach((temporalElement) => {
    const childAnimationState =
      evaluateTemporalStateForAnimation(temporalElement);
    if (childAnimationState.isVisible) {
      coordinateAnimationsForSingleElement(temporalElement);
    }
  });
};
