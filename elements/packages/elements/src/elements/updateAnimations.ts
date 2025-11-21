import {
  deepGetTemporalElements,
  isEFTemporal,
  type TemporalMixinInterface,
} from "./EFTemporal.ts";

// All animatable elements are temporal elements with HTMLElement interface
export type AnimatableElement = TemporalMixinInterface & HTMLElement;

// ============================================================================
// Constants
// ============================================================================

const ANIMATION_PRECISION_OFFSET = 0.1; // Use 0.1ms to safely avoid completion threshold
const DEFAULT_ANIMATION_ITERATIONS = 1;
const PROGRESS_PROPERTY = "--ef-progress";
const DURATION_PROPERTY = "--ef-duration";
const TRANSITION_DURATION_PROPERTY = "--ef-transition-duration";
const TRANSITION_OUT_START_PROPERTY = "--ef-transition-out-start";

// ============================================================================
// Animation Tracking
// ============================================================================

/**
 * Tracks animations per element to prevent them from being lost when they complete.
 * Once an animation reaches 100% completion, it's removed from getAnimations(),
 * but we keep a reference to it so we can continue controlling it.
 */
const animationTracker = new WeakMap<Element, Set<Animation>>();

/**
 * Validates that an animation is still valid and controllable.
 * Animations become invalid when:
 * - They've been cancelled (idle state and not in getAnimations())
 * - Their effect is null (animation was removed)
 * - Their target is no longer in the DOM
 */
const isAnimationValid = (
  animation: Animation,
  currentAnimations: Animation[],
): boolean => {
  // Check if animation has been cancelled
  if (animation.playState === "idle" && !currentAnimations.includes(animation)) {
    return false;
  }
  
  // Check if animation effect is still valid
  const effect = animation.effect;
  if (!effect) {
    return false;
  }
  
  // Check if target is still in DOM
  const target = effect.target;
  if (target && target instanceof Element) {
    if (!target.isConnected) {
      return false;
    }
  }
  
  return true;
};

/**
 * Discovers and tracks animations on an element and its subtree.
 * This ensures we have references to animations even after they complete.
 * 
 * Tracks animations per element where they exist, not just on the root element.
 * This allows us to find animations on any element in the subtree.
 * 
 * Also cleans up invalid animations (cancelled, removed from DOM, etc.)
 */
const discoverAndTrackAnimations = (
  element: AnimatableElement,
): Set<Animation> => {
  // Get current animations from the browser (includes subtree)
  const currentAnimations = element.getAnimations({ subtree: true });
  
  // Track animations on each element where they exist
  for (const animation of currentAnimations) {
    const target = animation.effect?.target;
    if (target && target instanceof Element) {
      let tracked = animationTracker.get(target);
      if (!tracked) {
        tracked = new Set<Animation>();
        animationTracker.set(target, tracked);
      }
      tracked.add(animation);
    }
  }
  
  // Also maintain a set on the root element for coordination
  let rootTracked = animationTracker.get(element);
  if (!rootTracked) {
    rootTracked = new Set<Animation>();
    animationTracker.set(element, rootTracked);
  }
  
  // Update root set with all current animations
  for (const animation of currentAnimations) {
    rootTracked.add(animation);
  }
  
  // Clean up invalid animations from root set
  // This handles animations that were cancelled, removed from DOM, or had their effects removed
  for (const animation of rootTracked) {
    if (!isAnimationValid(animation, currentAnimations)) {
      rootTracked.delete(animation);
    }
  }
  
  // Also clean up invalid animations from per-element sets
  // We need to check all elements that might have tracked animations
  const allTargets = new Set<Element>();
  for (const animation of currentAnimations) {
    const target = animation.effect?.target;
    if (target && target instanceof Element) {
      allTargets.add(target);
    }
  }
  
  // Check tracked sets for elements that might have invalid animations
  // We can't iterate WeakMap directly, but we can check elements we know about
  // and also check elements in the subtree
  const subtreeElements = element.querySelectorAll("*");
  for (const el of subtreeElements) {
    const tracked = animationTracker.get(el);
    if (tracked) {
      for (const animation of tracked) {
        if (!isAnimationValid(animation, Array.from(el.getAnimations()))) {
          tracked.delete(animation);
        }
      }
      // Remove empty sets to free memory
      if (tracked.size === 0) {
        animationTracker.delete(el);
      }
    }
  }
  
  return rootTracked;
};

/**
 * Gets tracked animations for a specific element.
 * This allows external code to access animations even after they complete.
 * Automatically filters out invalid animations (cancelled, removed, etc.)
 */
export const getTrackedAnimations = (element: Element): Animation[] => {
  const tracked = animationTracker.get(element);
  if (!tracked) {
    return [];
  }
  
  const currentAnimations = element.getAnimations();
  
  // Filter out invalid animations
  return Array.from(tracked).filter((animation) =>
    isAnimationValid(animation, currentAnimations),
  );
};

/**
 * Cleans up tracked animations when an element is disconnected.
 * This prevents memory leaks.
 */
export const cleanupTrackedAnimations = (element: Element): void => {
  animationTracker.delete(element);
};

// ============================================================================
// Types
// ============================================================================

/**
 * Represents the phase an element is in relative to the timeline.
 * This is the primary concept that drives all visibility and animation decisions.
 */
export type ElementPhase =
  | "before-start"
  | "active"
  | "at-end-boundary"
  | "after-end";

/**
 * Represents the temporal state of an element relative to the timeline
 */
interface TemporalState {
  progress: number;
  isVisible: boolean;
  timelineTimeMs: number;
  phase: ElementPhase;
}

/**
 * Context object that holds all evaluated state for an element update.
 * This groups related state together, reducing parameter passing and making
 * the data flow clearer.
 */
interface ElementUpdateContext {
  element: AnimatableElement;
  state: TemporalState;
}

/**
 * Animation timing information extracted from an animation effect.
 * Groups related timing properties together.
 */
interface AnimationTiming {
  duration: number;
  delay: number;
  iterations: number;
  direction: string;
}

/**
 * Capability interface for elements that support stagger offset.
 * This encapsulates the stagger behavior behind a capability check rather than
 * leaking tag name checks throughout the codebase.
 */
interface StaggerableElement extends AnimatableElement {
  staggerOffsetMs?: number;
}

// ============================================================================
// Phase Determination
// ============================================================================

/**
 * Determines what phase an element is in relative to the timeline.
 *
 * WHY: Phase is the primary concept that drives all decisions. By explicitly
 * enumerating phases, we make the code's logic clear: phase determines visibility,
 * animation coordination, and visual state.
 *
 * Phases:
 * - before-start: Timeline is before element's start time
 * - active: Timeline is within element's active range (start to end, exclusive of end)
 * - at-end-boundary: Timeline is exactly at element's end time
 * - after-end: Timeline is after element's end time
 *
 * Note: We detect "at-end-boundary" by checking if timeline equals end time.
 * The boundary policy will then determine if this should be treated as visible/active
 * or not based on element characteristics.
 */
const determineElementPhase = (
  element: AnimatableElement,
  timelineTimeMs: number,
): ElementPhase => {
  // Read endTimeMs once to avoid recalculation issues
  const endTimeMs = element.endTimeMs;
  const startTimeMs = element.startTimeMs;

  if (timelineTimeMs < startTimeMs) {
    return "before-start";
  }
  // Use epsilon to handle floating point precision issues
  const epsilon = 0.001;
  const diff = timelineTimeMs - endTimeMs;

  // If clearly after end (difference > epsilon), return 'after-end'
  if (diff > epsilon) {
    return "after-end";
  }
  // If at or very close to end boundary (within epsilon), return 'at-end-boundary'
  if (Math.abs(diff) <= epsilon) {
    return "at-end-boundary";
  }
  // Otherwise, we're before the end, so check if we're active
  return "active";
};

// ============================================================================
// Boundary Policies
// ============================================================================

/**
 * Policy interface for determining behavior at boundaries.
 * Different policies apply different rules for when elements should be visible
 * or have animations coordinated at exact boundary times.
 */
interface BoundaryPolicy {
  /**
   * Determines if an element should be considered visible/active at the end boundary
   * based on the element's characteristics.
   */
  shouldIncludeEndBoundary(element: AnimatableElement): boolean;
}

/**
 * Visibility policy: determines when elements should be visible for display purposes.
 *
 * WHY: Root elements, elements aligned with composition end, and text segments
 * should remain visible at exact end time to prevent flicker and show final frames.
 * Other elements use exclusive end for clean transitions between elements.
 */
class VisibilityPolicy implements BoundaryPolicy {
  shouldIncludeEndBoundary(element: AnimatableElement): boolean {
    // Root elements should remain visible at exact end time to prevent flicker
    const isRootElement = !element.parentTimegroup;
    if (isRootElement) {
      return true;
    }

    // Elements aligned with composition end should remain visible at exact end time
    const isLastElementInComposition =
      element.endTimeMs === element.rootTimegroup?.endTimeMs;
    if (isLastElementInComposition) {
      return true;
    }

    // Text segments use inclusive end since they're meant to be visible for full duration
    if (this.isTextSegment(element)) {
      return true;
    }

    // Other elements use exclusive end for clean transitions
    return false;
  }

  /**
   * Checks if element is a text segment.
   * Encapsulates the tag name check to hide implementation detail.
   */
  protected isTextSegment(element: AnimatableElement): boolean {
    return element.tagName === "EF-TEXT-SEGMENT";
  }
}

/**
 * Animation policy: determines when animations should be coordinated.
 *
 * WHY: When an animation reaches exactly the end time of an element, using exclusive
 * end would make the element invisible, causing the animation to be removed from the
 * DOM and creating a visual jump. By using inclusive end, we ensure animations remain
 * coordinated even at exact boundary times, providing smooth visual transitions.
 */
class AnimationPolicy implements BoundaryPolicy {
  shouldIncludeEndBoundary(_element: AnimatableElement): boolean {
    return true;
  }
}

// Policy instances (singleton pattern for stateless policies)
const visibilityPolicy = new VisibilityPolicy();
const animationPolicy = new AnimationPolicy();

/**
 * Determines if an element should be visible based on its phase and visibility policy.
 */
const shouldBeVisible = (
  phase: ElementPhase,
  element: AnimatableElement,
): boolean => {
  if (phase === "before-start" || phase === "after-end") {
    return false;
  }
  if (phase === "active") {
    return true;
  }
  // phase === "at-end-boundary"
  return visibilityPolicy.shouldIncludeEndBoundary(element);
};

/**
 * Determines if animations should be coordinated based on element phase and animation policy.
 */
const shouldCoordinateAnimations = (
  phase: ElementPhase,
  element: AnimatableElement,
): boolean => {
  if (phase === "before-start" || phase === "after-end") {
    return false;
  }
  if (phase === "active") {
    return true;
  }
  // phase === "at-end-boundary"
  return animationPolicy.shouldIncludeEndBoundary(element);
};

// ============================================================================
// Temporal State Evaluation
// ============================================================================

/**
 * Evaluates what the element's state should be based on the timeline.
 *
 * WHY: This function determines the complete temporal state including phase,
 * which becomes the primary driver for all subsequent decisions.
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

  const phase = determineElementPhase(element, timelineTimeMs);
  const isVisible = shouldBeVisible(phase, element);

  return { progress, isVisible, timelineTimeMs, phase };
};

/**
 * Evaluates element visibility state specifically for animation coordination.
 * Uses inclusive end boundaries to prevent animation jumps at exact boundaries.
 *
 * This is exported for external use cases that need animation-specific visibility
 * evaluation without the full ElementUpdateContext.
 */
export const evaluateAnimationVisibilityState = (
  element: AnimatableElement,
): TemporalState => {
  const state = evaluateTemporalState(element);
  // Override visibility based on animation policy
  const shouldCoordinate = shouldCoordinateAnimations(state.phase, element);
  return { ...state, isVisible: shouldCoordinate };
};

// ============================================================================
// Animation Time Mapping
// ============================================================================

/**
 * Capability check: determines if an element supports stagger offset.
 * Encapsulates the knowledge of which element types support this feature.
 */
const supportsStaggerOffset = (
  element: AnimatableElement,
): element is StaggerableElement => {
  // Currently only text segments support stagger offset
  return element.tagName === "EF-TEXT-SEGMENT";
};

/**
 * Calculates effective delay including stagger offset if applicable.
 *
 * Stagger offset allows elements (like text segments) to have their animations
 * start at different times while keeping their visibility timing unchanged.
 * This enables staggered animation effects within a single timegroup.
 */
const calculateEffectiveDelay = (
  delay: number,
  element: AnimatableElement,
): number => {
  if (supportsStaggerOffset(element)) {
    // Read stagger offset - try property first (more reliable), then CSS variable
    // The staggerOffsetMs property is set directly on the element and is always available
    const segment = element as any;
    if (segment.staggerOffsetMs !== undefined && segment.staggerOffsetMs !== null) {
      return delay + segment.staggerOffsetMs;
    }
    
    // Fallback to CSS variable if property not available
    let cssValue = (element as HTMLElement).style.getPropertyValue(
      "--ef-stagger-offset",
    ).trim();
    
    if (!cssValue) {
      cssValue = window.getComputedStyle(element).getPropertyValue(
        "--ef-stagger-offset",
      ).trim();
    }
    
    if (cssValue) {
      // Parse "100ms" format to milliseconds
      const match = cssValue.match(/(\d+(?:\.\d+)?)\s*ms?/);
      if (match) {
        const staggerOffset = parseFloat(match[1]!);
        if (!isNaN(staggerOffset)) {
          return delay + staggerOffset;
        }
      } else {
        // Try parsing as just a number
        const numValue = parseFloat(cssValue);
        if (!isNaN(numValue)) {
          return delay + numValue;
        }
      }
    }
  }
  return delay;
};

/**
 * Calculates maximum safe animation time to prevent completion.
 *
 * WHY: Once an animation reaches "finished" state, it can no longer be manually controlled
 * via currentTime. By clamping to just before completion (using ANIMATION_PRECISION_OFFSET),
 * we ensure the animation remains in a controllable state, allowing us to synchronize it
 * with the timeline even when it would naturally be complete.
 */
const calculateMaxSafeAnimationTime = (
  duration: number,
  iterations: number,
): number => {
  return duration * iterations - ANIMATION_PRECISION_OFFSET;
};

/**
 * Determines if the current iteration should be reversed based on direction
 */
const shouldReverseIteration = (
  direction: string,
  currentIteration: number,
): boolean => {
  return (
    direction === "reverse" ||
    (direction === "alternate" && currentIteration % 2 === 1) ||
    (direction === "alternate-reverse" && currentIteration % 2 === 0)
  );
};

/**
 * Applies direction to iteration time (reverses if needed)
 */
const applyDirectionToIterationTime = (
  currentIterationTime: number,
  duration: number,
  direction: string,
  currentIteration: number,
): number => {
  if (shouldReverseIteration(direction, currentIteration)) {
    return duration - currentIterationTime;
  }
  return currentIterationTime;
};

/**
 * Maps element time to animation time for normal direction.
 * Uses cumulative time throughout the animation.
 * Note: elementTime should already be adjusted (elementTime - effectiveDelay).
 */
const mapNormalDirectionTime = (
  elementTime: number,
  duration: number,
  maxSafeTime: number,
): number => {
  const currentIteration = Math.floor(elementTime / duration);
  const iterationTime = elementTime % duration;
  const cumulativeTime = currentIteration * duration + iterationTime;
  return Math.min(cumulativeTime, maxSafeTime);
};

/**
 * Maps element time to animation time for reverse direction.
 * Uses cumulative time with reversed iterations.
 * Note: elementTime should already be adjusted (elementTime - effectiveDelay).
 */
const mapReverseDirectionTime = (
  elementTime: number,
  duration: number,
  maxSafeTime: number,
): number => {
  const currentIteration = Math.floor(elementTime / duration);
  const rawIterationTime = elementTime % duration;
  const reversedIterationTime = duration - rawIterationTime;
  const cumulativeTime = currentIteration * duration + reversedIterationTime;
  return Math.min(cumulativeTime, maxSafeTime);
};

/**
 * Maps element time to animation time for alternate/alternate-reverse directions.
 *
 * WHY SPECIAL HANDLING: Alternate directions oscillate between forward and reverse iterations.
 * Without delay, we use iteration time (0 to duration) because the animation naturally
 * resets each iteration. However, with delay, iteration 0 needs to account for the delay
 * offset (using ownCurrentTimeMs), and later iterations need cumulative time to properly
 * track progress across multiple iterations. This complexity requires a dedicated mapper
 * rather than trying to handle it in the general case.
 */
const mapAlternateDirectionTime = (
  elementTime: number,
  effectiveDelay: number,
  duration: number,
  direction: string,
  maxSafeTime: number,
): number => {
  const adjustedTime = elementTime - effectiveDelay;

  if (effectiveDelay > 0) {
    // With delay: iteration 0 uses elementTime to include delay offset,
    // later iterations use cumulative time to track progress across iterations
    const currentIteration = Math.floor(adjustedTime / duration);
    if (currentIteration === 0) {
      return Math.min(elementTime, maxSafeTime);
    }
    return Math.min(adjustedTime, maxSafeTime);
  }

  // Without delay: use iteration time (after direction applied) since animation
  // naturally resets each iteration
  const currentIteration = Math.floor(elementTime / duration);
  const rawIterationTime = elementTime % duration;
  const iterationTime = applyDirectionToIterationTime(
    rawIterationTime,
    duration,
    direction,
    currentIteration,
  );
  return Math.min(iterationTime, maxSafeTime);
};

/**
 * Maps element time to animation time based on direction.
 *
 * WHY: This function explicitly transforms element time to animation time, making
 * the time mapping concept clear. Different directions require different transformations
 * to achieve the desired visual effect.
 */
const mapElementTimeToAnimationTime = (
  elementTime: number,
  timing: AnimationTiming,
  effectiveDelay: number,
): number => {
  const { duration, iterations, direction } = timing;
  const maxSafeTime = calculateMaxSafeAnimationTime(duration, iterations);
  // Calculate adjusted time (element time minus delay) for normal/reverse directions
  const adjustedTime = elementTime - effectiveDelay;

  if (direction === "reverse") {
    return mapReverseDirectionTime(adjustedTime, duration, maxSafeTime);
  }
  if (direction === "alternate" || direction === "alternate-reverse") {
    return mapAlternateDirectionTime(
      elementTime,
      effectiveDelay,
      duration,
      direction,
      maxSafeTime,
    );
  }
  // normal direction - use adjustedTime to account for delay
  return mapNormalDirectionTime(adjustedTime, duration, maxSafeTime);
};

/**
 * Determines the animation time for a completed animation based on direction.
 */
const getCompletedAnimationTime = (
  timing: AnimationTiming,
  maxSafeTime: number,
): number => {
  const { direction, iterations, duration } = timing;

  if (direction === "alternate" || direction === "alternate-reverse") {
    // For alternate directions, determine if final iteration is reversed
    const finalIteration = iterations - 1;
    const isFinalIterationReversed =
      (direction === "alternate" && finalIteration % 2 === 1) ||
      (direction === "alternate-reverse" && finalIteration % 2 === 0);

    if (isFinalIterationReversed) {
      // At end of reversed iteration, currentTime should be near 0 (but clamped)
      return Math.min(duration - ANIMATION_PRECISION_OFFSET, maxSafeTime);
    }
  }

  // For normal, reverse, or forward final iteration of alternate: use max safe time
  return maxSafeTime;
};

/**
 * Validates that animation effect is a KeyframeEffect with a target
 */
const validateAnimationEffect = (
  effect: AnimationEffect | null,
): effect is KeyframeEffect & { target: Element } => {
  return (
    effect !== null &&
    effect instanceof KeyframeEffect &&
    effect.target !== null
  );
};

/**
 * Extracts timing information from an animation effect.
 * Duration and delay from getTiming() are already in milliseconds.
 * We use getTiming().delay directly from the animation object.
 */
const extractAnimationTiming = (effect: KeyframeEffect): AnimationTiming => {
  const timing = effect.getTiming();

  return {
    duration: Number(timing.duration) || 0,
    delay: Number(timing.delay) || 0,
    iterations: Number(timing.iterations) || DEFAULT_ANIMATION_ITERATIONS,
    direction: timing.direction || "normal",
  };
};

/**
 * Prepares animation for manual control by ensuring it's paused
 */
const prepareAnimation = (animation: Animation): void => {
  // Ensure animation is in a controllable state
  // Finished animations can't be controlled, so reset them
  if (animation.playState === "finished") {
    animation.cancel();
    // After cancel, animation is in idle state - we can set currentTime directly
    // No need to play/pause - we'll control it via currentTime
  } else if (animation.playState === "running") {
    // Pause running animations so we can control them manually
    animation.pause();
  }
  // For "idle" or "paused" state, we can set currentTime directly without play/pause
  // Setting currentTime on a paused animation will apply the keyframes
  // No initialization needed - we control everything via currentTime
};

/**
 * Maps element time to animation currentTime and sets it on the animation.
 *
 * WHY: This function explicitly performs the time mapping transformation,
 * making it clear that we're transforming element time to animation time.
 */
const mapAndSetAnimationTime = (
  animation: Animation,
  element: AnimatableElement,
  timing: AnimationTiming,
  effectiveDelay: number,
): void => {
  // Use ownCurrentTimeMs for all elements (timegroups and other temporal elements)
  // This gives us time relative to when the element started, which ensures animations
  // on child elements are synchronized with their containing timegroup's timeline.
  // For timegroups, ownCurrentTimeMs is the time relative to when the timegroup started.
  // For other temporal elements, ownCurrentTimeMs is the time relative to their start.
  const elementTime = element.ownCurrentTimeMs ?? 0;

  // Ensure animation is paused before setting currentTime
  if (animation.playState === "running") {
    animation.pause();
  }

  // Calculate adjusted time (element time minus delay)
  const adjustedTime = elementTime - effectiveDelay;

  // If before delay, show initial keyframe state (0% of animation)
  if (adjustedTime < 0) {
    // Before delay: show initial keyframe state
    // For CSS animations with delay > 0, currentTime includes the delay, so set to elementTime
    // For CSS animations with delay = 0, currentTime is just animation progress, so set to 0
    if (timing.delay > 0) {
      animation.currentTime = elementTime;
    } else {
      animation.currentTime = 0;
    }
    return;
  }

  // At delay time (adjustedTime = 0) or after, the animation should be active
  const { duration, iterations } = timing;
  const currentIteration = Math.floor(adjustedTime / duration);

  if (currentIteration >= iterations) {
    // Animation is completed - use completed time mapping
    const maxSafeTime = calculateMaxSafeAnimationTime(duration, iterations);
    const completedAnimationTime = getCompletedAnimationTime(
      timing,
      maxSafeTime,
    );

    // CRITICAL: For CSS animations, currentTime behavior differs based on whether delay > 0:
    // - If timing.delay > 0: currentTime includes the delay (absolute timeline time)
    // - If timing.delay === 0: currentTime is just animation progress (0 to duration)
    if (timing.delay > 0) {
      // Completed: currentTime should be delay + completed animation time (absolute timeline time)
      animation.currentTime = effectiveDelay + completedAnimationTime;
    } else {
      // Completed: currentTime should be just the completed animation time (animation progress)
      animation.currentTime = completedAnimationTime;
    }
  } else {
    // Animation is in progress - map element time to animation time
    const animationTime = mapElementTimeToAnimationTime(
      elementTime,
      timing,
      effectiveDelay,
    );

    // CRITICAL: For CSS animations, currentTime behavior differs based on whether delay > 0:
    // - If timing.delay > 0: currentTime includes the delay (absolute timeline time)
    // - If timing.delay === 0: currentTime is just animation progress (0 to duration)
    //   Stagger offset is handled via adjustedTime calculation, but doesn't affect currentTime format
    const { direction, delay } = timing;
    
    if (delay > 0) {
      // CSS animation with delay: currentTime is absolute timeline time
      const isAlternateWithDelay =
        (direction === "alternate" || direction === "alternate-reverse") &&
        effectiveDelay > 0;
      if (isAlternateWithDelay && currentIteration === 0) {
        // For alternate direction iteration 0 with delay, use elementTime directly
        animation.currentTime = elementTime;
      } else {
        // For other cases with delay, currentTime should be delay + animation time (absolute timeline time)
        animation.currentTime = effectiveDelay + animationTime;
      }
    } else {
      // CSS animation with delay = 0: currentTime is just animation progress
      // Stagger offset is already accounted for in adjustedTime, so animationTime is the progress
      animation.currentTime = animationTime;
    }
  }
};

/**
 * Synchronizes a single animation with the timeline using the element as the time source.
 *
 * For animations in this element's subtree, always use this element as the time source.
 * This handles both animations directly on the temporal element and on its non-temporal children.
 */
const synchronizeAnimation = (
  animation: Animation,
  element: AnimatableElement,
): void => {
  const effect = animation.effect;
  if (!validateAnimationEffect(effect)) {
    return;
  }

  const timing = extractAnimationTiming(effect);

  if (timing.duration <= 0) {
    animation.currentTime = 0;
    return;
  }

  // Find the containing timegroup for the animation target.
  // Temporal elements are always synced to timegroups, so animations should use
  // the timegroup's timeline as the time source.
  const target = effect.target;
  let timeSource: AnimatableElement = element;

  if (target && target instanceof HTMLElement) {
    // Find the nearest timegroup in the DOM tree
    const nearestTimegroup = target.closest("ef-timegroup");
    if (nearestTimegroup && isEFTemporal(nearestTimegroup)) {
      timeSource = nearestTimegroup as AnimatableElement;
    }
  }

  // For stagger offset, we need to find the actual text segment element.
  // CSS animations might be on the segment itself or on a child element.
  // If the target is not a text segment, try to find the parent text segment.
  let staggerElement: AnimatableElement = timeSource;
  if (target && target instanceof HTMLElement) {
    // Check if target is a text segment
    const targetAsAnimatable = target as AnimatableElement;
    if (supportsStaggerOffset(targetAsAnimatable)) {
      staggerElement = targetAsAnimatable;
    } else {
      // Target might be a child element - find the parent text segment
      const parentSegment = target.closest("ef-text-segment");
      if (parentSegment && supportsStaggerOffset(parentSegment as AnimatableElement)) {
        staggerElement = parentSegment as AnimatableElement;
      }
    }
  }
  
  const effectiveDelay = calculateEffectiveDelay(timing.delay, staggerElement);
  mapAndSetAnimationTime(animation, timeSource, timing, effectiveDelay);
};

/**
 * Coordinates animations for a single element and its subtree, using the element as the time source.
 *
 * Uses tracked animations to ensure we can control animations even after they complete.
 * Both CSS animations (created via the 'animation' property) and WAAPI animations are included.
 *
 * CRITICAL: CSS animations are created asynchronously when classes are added. This function
 * discovers new animations on each call and tracks them in memory. Once animations complete,
 * they're removed from getAnimations(), but we keep references to them so we can continue
 * controlling them.
 */
const coordinateElementAnimations = (element: AnimatableElement): void => {
  // Discover and track animations (includes both current and previously completed ones)
  const trackedAnimations = discoverAndTrackAnimations(element);
  
  const currentAnimations = element.getAnimations({ subtree: true });

  for (const animation of trackedAnimations) {
    // Skip invalid animations (cancelled, removed from DOM, etc.)
    if (!isAnimationValid(animation, currentAnimations)) {
      continue;
    }
    
    prepareAnimation(animation);
    synchronizeAnimation(animation, element);
  }
};

// ============================================================================
// Visual State Application
// ============================================================================

/**
 * Applies visual state (CSS + display) to match temporal state.
 *
 * WHY: This function applies visual state based on the element's phase and state.
 * Phase determines what should be visible, and this function applies that decision.
 */
const applyVisualState = (
  element: AnimatableElement,
  state: TemporalState,
): void => {
  // Always set progress (needed for many use cases)
  element.style.setProperty(PROGRESS_PROPERTY, `${state.progress}`);

  // Handle visibility based on phase
  if (!state.isVisible) {
    element.style.setProperty("display", "none");
    return;
  }
  element.style.removeProperty("display");

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
 * Applies animation coordination if the element phase requires it.
 *
 * WHY: Animation coordination is driven by phase. If the element is in a phase
 * where animations should be coordinated, we coordinate them.
 */
const applyAnimationCoordination = (
  element: AnimatableElement,
  phase: ElementPhase,
): void => {
  if (shouldCoordinateAnimations(phase, element)) {
    coordinateElementAnimations(element);
  }
};

// ============================================================================
// Main Function
// ============================================================================

/**
 * Evaluates the complete state for an element update.
 * This separates evaluation (what should the state be?) from application (apply that state).
 */
const evaluateElementState = (
  element: AnimatableElement,
): ElementUpdateContext => {
  return {
    element,
    state: evaluateTemporalState(element),
  };
};

/**
 * Main function: synchronizes DOM element with timeline.
 *
 * Orchestrates clear flow: Phase → Policy → Time Mapping → State Application
 *
 * WHY: This function makes the conceptual flow explicit:
 * 1. Determine phase (what phase is the element in?)
 * 2. Apply policies (should it be visible/coordinated based on phase?)
 * 3. Map time for animations (transform element time to animation time)
 * 4. Apply visual state (update CSS and display based on phase and policies)
 */
export const updateAnimations = (element: AnimatableElement): void => {
  // Evaluate all states
  const rootContext = evaluateElementState(element);
  const childContexts = deepGetTemporalElements(element).map(
    (temporalElement) => evaluateElementState(temporalElement),
  );

  // Apply visual state and animation coordination for root element
  applyVisualState(rootContext.element, rootContext.state);
  applyAnimationCoordination(rootContext.element, rootContext.state.phase);

  // Apply visual state and animation coordination for all temporal child elements
  childContexts.forEach((context) => {
    applyVisualState(context.element, context.state);
    applyAnimationCoordination(context.element, context.state.phase);
  });
};
