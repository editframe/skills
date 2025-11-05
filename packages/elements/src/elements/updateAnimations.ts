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
  // Other elements use exclusive end for clean transitions
  const isRootElement = !(element as any).parentTimegroup;
  const isLastElementInComposition =
    element.endTimeMs === element.rootTimegroup?.endTimeMs;
  const useInclusiveEnd = isRootElement || isLastElementInComposition;

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
  const animations = element.getAnimations({ subtree: true });

  for (const animation of animations) {
    if (animation.playState === "running") {
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
    const duration = Number(timing.duration) || 0;
    const delay = Number(timing.delay) || 0;
    const iterations =
      Number(timing.iterations) || DEFAULT_ANIMATION_ITERATIONS;

    if (duration <= 0) {
      animation.currentTime = 0;
      continue;
    }

    // Use the element itself as the time source (it's guaranteed to be temporal)
    const currentTime = element.ownCurrentTimeMs ?? 0;

    if (currentTime < delay) {
      animation.currentTime = 0;
      continue;
    }

    const adjustedTime = currentTime - delay;
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

    // Calculate the total animation timeline length (delay + duration * iterations)
    const totalAnimationLength = delay + duration * iterations;

    // CRITICAL: Always keep currentTime below totalAnimationLength to prevent completion
    const maxSafeCurrentTime =
      totalAnimationLength - ANIMATION_PRECISION_OFFSET;

    if (currentIteration >= iterations) {
      // Animation would be complete - clamp to just before completion
      animation.currentTime = maxSafeCurrentTime;
    } else {
      // Animation in progress - clamp to safe value within current iteration
      const proposedCurrentTime =
        Math.min(currentIterationTime, duration - ANIMATION_PRECISION_OFFSET) +
        delay;
      animation.currentTime = Math.min(proposedCurrentTime, maxSafeCurrentTime);
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
