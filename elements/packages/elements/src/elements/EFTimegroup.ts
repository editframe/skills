import { provide } from "@lit/context";
import debug from "debug";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

import { quantizeToFrameTimeS } from "../utils/frameTime.js";
import { getCloneFactory } from "./cloneFactoryRegistry.js";
import { EF_RENDERING } from "../EF_RENDERING.js";
import { efContext } from "../gui/efContext.js";
import { TWMixin } from "../gui/TWMixin.js";
import { isTracingEnabled, withSpan } from "../otel/tracingHelpers.js";
import {
  FrameController,
  type FrameRenderable,
  type FrameState,
  PRIORITY_DEFAULT,
} from "../preview/FrameController.js";
import { QualityUpgradeScheduler } from "../preview/QualityUpgradeScheduler.js";
import { deepGetMediaElements, type EFMedia } from "./EFMedia.js";
import {
  EFTemporal,
  flushStartTimeMsCache,
  resetTemporalCache,
  shallowGetTemporalElements,
  timegroupContext,
  type TemporalMixinInterface,
} from "./EFTemporal.js";
import { parseTimeToMs } from "./parseTimeToMs.js";
import { renderTemporalAudio } from "./renderTemporalAudio.js";
import { EFTargetable } from "./TargetController.js";
import { TimegroupController } from "./TimegroupController.js";
import { updateAnimations } from "./updateAnimations.js";
import { type ContainerInfo, getContainerInfoFromElement } from "./ContainerInfo.js";
import { type ElementPositionInfo, getPositionInfoFromElement } from "./ElementPositionInfo.js";
// Import only types - actual function loaded dynamically
import type { RenderToVideoOptions } from "../preview/renderTimegroupToVideo.types.js";
import type { PlaybackControllerUpdateEvent } from "../gui/PlaybackController.js";

// Side-effect imports for workbench wrapping
import "../canvas/EFCanvas.js";
import "../gui/hierarchy/EFHierarchy.js";
import "../gui/EFFilmstrip.js";
import "../gui/EFWorkbench.js";
import "../gui/EFFitScale.js";
import "./EFPanZoom.js";

const log = debug("ef:elements:EFTimegroup");

// Custom frame task callback type
export type FrameTaskCallback = (info: {
  ownCurrentTimeMs: number;
  currentTimeMs: number;
  durationMs: number;
  percentComplete: number;
  element: EFTimegroup;
}) => void | Promise<void>;

/**
 * Result of createRenderClone() - contains the clone, its container, and cleanup function.
 */
export interface RenderCloneResult {
  /** The cloned timegroup, fully functional with its own time state */
  clone: EFTimegroup;
  /** The offscreen container holding the clone */
  container: HTMLElement;
  /** Call this to remove the clone from DOM and clean up */
  cleanup: () => void;
}

/**
 * Initializer function type for setting up JavaScript behavior on timegroup instances.
 * This function is called on both the prime timeline and each render clone.
 *
 * CONSTRAINTS:
 * - MUST be synchronous (no async/await, no Promise return)
 * - MUST complete in <2000ms (error) or <100ms (warning)
 * - Should only register callbacks and set up behavior, not do expensive work
 * - GPU operations (WebGL context creation, shader compilation) may take up to ~1s
 */
export type TimegroupInitializer = (timegroup: EFTimegroup) => void;

// Constants for initializer time budget enforcement
const INITIALIZER_ERROR_THRESHOLD_MS = 2000;
const INITIALIZER_WARN_THRESHOLD_MS = 100;

// ============================================================================
// Purpose 1: Composition Rules - How Duration is Determined
// ============================================================================
//
// A timegroup's duration is determined by its mode:
// - "fixed": Uses explicit duration attribute (base case)
// - "sequence": Sum of child durations minus overlaps
// - "contain": Maximum of child durations
// - "fit": Inherits duration from parent timegroup
//
// Core invariant: Every timegroup has exactly one duration value at any moment,
// computed from either explicit specification (fixed mode) or child relationships
// (sequence/contain/fit modes).
//
// ============================================================================

/**
 * The four timegroup modes define how duration is calculated:
 * - "fit": Inherits duration from parent timegroup
 * - "fixed": Uses explicit duration attribute
 * - "sequence": Sum of child durations minus overlaps
 * - "contain": Maximum of child durations
 */
export type TimeMode = "fit" | "fixed" | "sequence" | "contain";

/**
 * Per-phase timing data returned by seekForRender().
 * All values are in milliseconds.
 */
export interface SeekForRenderTiming {
  updateComplete1Ms: number;
  updateComplete2Ms: number;
  updateComplete3Ms: number;
  textSegmentsMs: number;
  renderFrameMs: number;
  renderFrameQueryMs: number;
  renderFramePrepareMs: number;
  renderFrameDrawMs: number;
  renderFrameAnimsMs: number;
  frameTasksMs: number;
  totalMs: number;
}

// Cache for duration calculations to avoid O(n) recalculation on every access
// Used by all modes (sequence, contain) to avoid repeated iteration through children
let durationCache: WeakMap<EFTimegroup, number> = new WeakMap();

export const flushDurationCache = () => {
  durationCache = new WeakMap();
};

// Keep alias for backwards compatibility
export const flushSequenceDurationCache = flushDurationCache;

// Track timegroups currently calculating duration to prevent infinite loops
const durationCalculationInProgress = new WeakSet<EFTimegroup>();

// Export function to check if a timegroup is currently calculating duration
// This is used by EFTemporal to prevent calling parent.durationMs during calculation
export const isTimegroupCalculatingDuration = (timegroup: EFTimegroup | undefined): boolean => {
  return timegroup !== undefined && durationCalculationInProgress.has(timegroup);
};

// Register this function with EFTemporal to break circular dependency
// EFTemporal needs this function but can't import it directly due to circular dependency
import { registerIsTimegroupCalculatingDuration } from "./EFTemporal.js";
registerIsTimegroupCalculatingDuration(isTimegroupCalculatingDuration);

/**
 * Determines if a timegroup has its own duration based on its mode.
 * This is the semantic rule: which modes produce independent durations.
 */
function hasOwnDurationForMode(mode: TimeMode, hasExplicitDuration: boolean): boolean {
  return mode === "contain" || mode === "sequence" || (mode === "fixed" && hasExplicitDuration);
}

/**
 * Determines if a child temporal element should participate in parent duration calculation.
 *
 * Semantic rule: Fit-mode children inherit from parent, so they don't contribute to parent's
 * duration calculation (to avoid circular dependencies). Children without own duration
 * also don't contribute.
 */
function shouldParticipateInDurationCalculation(
  child: TemporalMixinInterface & HTMLElement,
): boolean {
  // Fit timegroups look "up" to their parent for duration, so skip to avoid infinite loop
  if (child instanceof EFTimegroup && child.mode === "fit") {
    return false;
  }
  // Only children with their own duration contribute
  if (!child.hasOwnDuration) {
    return false;
  }
  return true;
}

/**
 * Evaluates duration for "fit" mode: inherits from parent.
 * Semantic rule: fit mode always matches parent duration, or 0 if no parent.
 */
function evaluateFitDuration(parentTimegroup: EFTimegroup | undefined): number {
  if (!parentTimegroup) {
    return 0;
  }
  return parentTimegroup.durationMs;
}

/**
 * Evaluates duration for "sequence" mode: sum of children minus overlaps.
 * Semantic rule: sequence mode sums child durations, subtracting overlap between consecutive items.
 * Fit-mode children are excluded to avoid circular dependencies.
 */
function evaluateSequenceDuration(
  timegroup: EFTimegroup,
  childTemporals: Array<TemporalMixinInterface & HTMLElement>,
  overlapMs: number,
): number {
  // Check cache first to avoid expensive O(n) recalculation
  const cachedDuration = durationCache.get(timegroup);
  if (cachedDuration !== undefined) {
    return cachedDuration;
  }

  let duration = 0;
  let participatingIndex = 0;
  childTemporals.forEach((child) => {
    if (!shouldParticipateInDurationCalculation(child)) {
      return;
    }
    // Prevent infinite loops: skip children that are already calculating their duration
    if (child instanceof EFTimegroup && durationCalculationInProgress.has(child)) {
      return;
    }

    // Additional safety: if child is a timegroup, check if any of its ancestors
    // (EXCLUDING the current timegroup) are calculating.
    // This prevents cycles where a child's descendant eventually calls back to an ancestor,
    // but allows direct children of the current timegroup to participate.
    if (child instanceof EFTimegroup) {
      let ancestor: Node | null = child.parentNode;
      let shouldSkip = false;
      while (ancestor) {
        // Stop FIRST if we've reached the current timegroup - direct children are allowed
        if (ancestor === timegroup) {
          break;
        }
        if (ancestor instanceof EFTimegroup && durationCalculationInProgress.has(ancestor)) {
          // Found a calculating ancestor (not the current timegroup) - skip this child to prevent cycle
          shouldSkip = true;
          break;
        }
        ancestor = ancestor.parentNode;
      }
      if (shouldSkip) {
        return;
      }
    }

    // Subtract overlap for all items after the first
    if (participatingIndex > 0) {
      duration -= overlapMs;
    }
    duration += child.durationMs;
    participatingIndex++;
  });

  // Ensure non-negative duration (invariant)
  duration = Math.max(0, duration);

  // Cache the calculated duration
  durationCache.set(timegroup, duration);
  return duration;
}

/**
 * Evaluates duration for "contain" mode: maximum of children.
 * Semantic rule: contain mode takes the maximum child duration.
 * Fit-mode children and children without own duration are excluded.
 */
function evaluateContainDuration(
  timegroup: EFTimegroup,
  childTemporals: Array<TemporalMixinInterface & HTMLElement>,
): number {
  // Check cache first to avoid expensive O(n) recalculation
  const cachedDuration = durationCache.get(timegroup);
  if (cachedDuration !== undefined) {
    return cachedDuration;
  }

  let maxDuration = 0;
  for (const child of childTemporals) {
    if (!shouldParticipateInDurationCalculation(child)) {
      continue;
    }
    // Prevent infinite loops: skip children that are already calculating their duration
    // This check applies to all timegroup children, not just contain mode, because
    // a sequence-mode child could contain a contain-mode grandchild that
    // eventually references back to the parent through the parent chain
    if (child instanceof EFTimegroup && durationCalculationInProgress.has(child)) {
      continue;
    }

    // Additional safety: if child is a timegroup, check if any of its ancestors
    // (EXCLUDING the current timegroup) are calculating.
    // This prevents cycles where a child's descendant eventually calls back to an ancestor,
    // but allows direct children of the current timegroup to participate.
    if (child instanceof EFTimegroup) {
      let ancestor: Node | null = child.parentNode;
      let shouldSkip = false;
      while (ancestor) {
        // Stop FIRST if we've reached the current timegroup - direct children are allowed
        if (ancestor === timegroup) {
          break;
        }
        if (ancestor instanceof EFTimegroup && durationCalculationInProgress.has(ancestor)) {
          // Found a calculating ancestor (not the current timegroup) - skip this child to prevent cycle
          shouldSkip = true;
          break;
        }
        ancestor = ancestor.parentNode;
      }
      if (shouldSkip) {
        continue;
      }
    }

    maxDuration = Math.max(maxDuration, child.durationMs);
  }
  // Ensure non-negative duration (invariant)
  const duration = Math.max(0, maxDuration);

  // Cache the calculated duration
  durationCache.set(timegroup, duration);
  return duration;
}

/**
 * Evaluates duration based on timegroup mode.
 * This is the semantic evaluation function - it determines what duration should be.
 *
 * Note: Fixed mode is handled inline in the getter because it needs to call super.durationMs
 * which requires the class context. The other modes are extracted for clarity.
 */
function evaluateDurationForMode(
  timegroup: EFTimegroup,
  mode: TimeMode,
  childTemporals: Array<TemporalMixinInterface & HTMLElement>,
): number {
  switch (mode) {
    case "fit":
      return evaluateFitDuration(timegroup.parentTimegroup);
    case "sequence": {
      // Mark this timegroup as calculating duration to prevent infinite loops
      durationCalculationInProgress.add(timegroup);
      try {
        return evaluateSequenceDuration(timegroup, childTemporals, timegroup.overlapMs);
      } finally {
        // Always remove the marker, even if an error occurs
        durationCalculationInProgress.delete(timegroup);
      }
    }
    case "contain": {
      // Mark this timegroup as calculating duration to prevent infinite loops
      durationCalculationInProgress.add(timegroup);
      try {
        return evaluateContainDuration(timegroup, childTemporals);
      } finally {
        // Always remove the marker, even if an error occurs
        durationCalculationInProgress.delete(timegroup);
      }
    }
    default:
      throw new Error(`Invalid time mode: ${mode}`);
  }
}

export const shallowGetTimegroups = (element: Element, groups: EFTimegroup[] = []) => {
  for (const child of Array.from(element.children)) {
    if (child instanceof EFTimegroup) {
      groups.push(child);
    } else {
      shallowGetTimegroups(child, groups);
    }
  }
  return groups;
};

// ============================================================================
// Purpose 2: Time Propagation - How currentTime Flows Root to Children
// ============================================================================
//
// Time propagation determines how the root timegroup's currentTime flows to child
// temporal elements, computing each child's ownCurrentTime based on:
// - The root's currentTime (global coordinate)
// - The child's startTimeMs (determined by parent's composition mode)
// - The parent's mode (sequence/contain/fit/fixed)
//
// Propagation rules by mode:
// - Sequence: Each child's ownCurrentTime progresses within its time-shifted window
// - Contain: All children share the same ownCurrentTime as parent
// - Fit: Child ownCurrentTime = parent ownCurrentTime (identity mapping)
//
// Core invariant: Only root timegroup's currentTime should be written.
// Child times are computed from parent state via ownCurrentTimeMs.
//
// Note: Time propagation logic is primarily implemented in EFTemporal.ts
// (ownCurrentTimeMs getter and startTimeMs calculation). The timegroup's
// currentTime setter triggers propagation by updating root time.
//
// ============================================================================

// ============================================================================
// Purpose 3: Seeking - Moving to a Specific Time
// ============================================================================
//
// Seeking moves the timeline to a specific time position. This involves:
// 1. Quantizing the requested time to frame boundaries (based on fps)
// 2. Clamping to valid range [0, duration]
// 3. Updating root timegroup's currentTime (which triggers time propagation)
// 4. Waiting for all media and frame tasks to complete
//
// Core invariant: All time values snap to frame boundaries when FPS is set.
// This ensures consistent seek/render behavior.
//
// ============================================================================

/**
 * Evaluates the target time for a seek operation.
 * Applies quantization and clamping to determine the valid seek target.
 */
function evaluateSeekTarget(requestedTime: number, durationMs: number, fps: number): number {
  // Quantize to frame boundaries
  const quantizedTime = quantizeToFrameTimeS(requestedTime, fps);
  // Clamp to valid range [0, duration]
  return Math.max(0, Math.min(quantizedTime, durationMs / 1000));
}

@customElement("ef-timegroup")
export class EFTimegroup
  extends EFTargetable(EFTemporal(TWMixin(LitElement)))
  implements FrameRenderable
{
  static get observedAttributes(): string[] {
    const parentAttributes = super.observedAttributes || [];
    return [
      ...parentAttributes,
      "mode",
      "overlap",
      "currenttime",
      "fit",
      "fps",
      "auto-init",
      "workbench",
    ];
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
    }

    ::slotted(ef-timegroup) {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      overflow: initial;
    }
  `;

  /** @internal */
  @provide({ context: timegroupContext })
  _timeGroupContext = this;

  /** @internal */
  @provide({ context: efContext })
  efContext = this;

  // ---- Content Readiness Aggregation ----

  #trackedChildren = new Set<TemporalMixinInterface & HTMLElement>();

  override shouldAutoReady(): boolean {
    return false;
  }

  #onCSSAnimationStart = (e: AnimationEvent) => {
    const target = e.target as Element;
    for (const anim of target.getAnimations()) {
      if (anim.playState === "running") {
        anim.pause();
      }
    }
  };

  #childReadyStateHandler = () => {
    this.#recomputeAggregateReadyState();
  };

  #childContentChangeHandler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    this.emitContentChange(detail?.reason ?? "content");
  };

  #childDurationChangeHandler = () => {
    durationCache.delete(this);
    this.requestUpdate();
  };

  #recomputeAggregateReadyState(): void {
    const children = shallowGetTemporalElements(this);
    if (children.length === 0) {
      this.setContentReadyState("ready");
      return;
    }

    let hasLoading = false;
    let hasError = false;
    let hasIdle = false;

    for (const child of children) {
      const state = child.contentReadyState;
      if (state === "loading") hasLoading = true;
      else if (state === "error") hasError = true;
      else if (state === "idle") hasIdle = true;
    }

    if (hasError) {
      this.setContentReadyState("error");
    } else if (hasLoading) {
      this.setContentReadyState("loading");
    } else if (hasIdle) {
      this.setContentReadyState("loading");
    } else {
      this.setContentReadyState("ready");
    }
  }

  #syncChildListeners(): void {
    const currentChildren = new Set(
      shallowGetTemporalElements(this) as Array<TemporalMixinInterface & HTMLElement>,
    );

    // Remove listeners from children that left
    for (const child of this.#trackedChildren) {
      if (!currentChildren.has(child)) {
        child.removeEventListener("readystatechange", this.#childReadyStateHandler);
        child.removeEventListener("contentchange", this.#childContentChangeHandler);
        child.removeEventListener("durationchange", this.#childDurationChangeHandler);
      }
    }

    // Add listeners to new children
    for (const child of currentChildren) {
      if (!this.#trackedChildren.has(child)) {
        child.addEventListener("readystatechange", this.#childReadyStateHandler);
        child.addEventListener("contentchange", this.#childContentChangeHandler);
        child.addEventListener("durationchange", this.#childDurationChangeHandler);
      }
    }

    this.#trackedChildren = currentChildren;
    this.#recomputeAggregateReadyState();
  }

  // ---- End Content Readiness Aggregation ----

  /** @public */
  #mode: TimeMode = "contain";
  get mode(): TimeMode {
    return this.#mode;
  }
  set mode(value: TimeMode) {
    if (this.#mode === value) return;
    const old = this.#mode;
    this.#mode = value;
    this.requestUpdate("mode", old);
    if (this.getAttribute("mode") !== value) {
      this.setAttribute("mode", value);
    }
  }

  /** @public */
  #overlapMs = 0;
  get overlapMs(): number {
    return this.#overlapMs;
  }
  set overlapMs(value: number) {
    if (this.#overlapMs === value) return;
    const old = this.#overlapMs;
    this.#overlapMs = value;
    this.requestUpdate("overlapMs", old);
    const attrVal = value > 0 ? `${value}ms` : null;
    if (attrVal && this.getAttribute("overlap") !== attrVal) {
      this.setAttribute("overlap", attrVal);
    } else if (!attrVal && this.hasAttribute("overlap")) {
      this.removeAttribute("overlap");
    }
  }

  #initializer?: TimegroupInitializer;

  /**
   * Initializer function for setting up JavaScript behavior on this timegroup.
   * This function is called ONCE per instance - on the prime timeline when first connected,
   * and on each render clone when created.
   *
   * Use this to register frame callbacks, set up event listeners, or initialize state.
   * The same initializer code runs on both prime and clones, eliminating duplication.
   *
   * CONSTRAINTS:
   * - MUST be synchronous (no async/await, no Promise return)
   * - MUST complete in <100ms (error thrown) or <10ms (warning logged)
   * - Should only register callbacks and set up behavior, not do expensive work
   *
   * TIMING:
   * - If set before element connects to DOM: runs automatically after connectedCallback
   * - If set after element is connected: runs immediately
   * - Clones automatically copy and run the initializer when created
   *
   * @example
   * ```javascript
   * const tg = document.querySelector('ef-timegroup');
   * tg.initializer = (instance) => {
   *   // Runs once on prime timeline, once on each clone
   *   instance.addFrameTask((info) => {
   *     // Update content based on time
   *   });
   * };
   * ```
   * @public
   */
  get initializer(): TimegroupInitializer | undefined {
    return this.#initializer;
  }

  set initializer(fn: TimegroupInitializer | undefined) {
    this.#initializer = fn;
    // Just store the function. Execution is handled by:
    // - connectedCallback (for elements that have initializer before connection)
    // - #copyInitializersToClone (explicitly triggers for render clones)
  }

  /**
   * Track if initializer has run on this instance to prevent double execution.
   * @internal
   */
  #initializerHasRun = false;

  /** @public */
  @property({ type: Number })
  fps = 30;

  /**
   * When true, automatically seeks to frame 0 after media durations are loaded.
   * Only applies to root timegroups (timegroups that are not nested inside another timegroup).
   * This ensures the first frame is rendered immediately on initialization.
   */
  @property({ type: Boolean, attribute: "auto-init" })
  autoInit = false;

  /**
   * When true, automatically wraps this root timegroup with an ef-workbench element.
   * The workbench provides development UI including hierarchy panel, timeline, and playback controls.
   * Only applies to root timegroups.
   * @public
   */
  @property({ type: Boolean, reflect: true })
  workbench = false;

  attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === "mode" && value) {
      this.mode = value as typeof this.mode;
    }
    if (name === "overlap" && value) {
      this.overlapMs = parseTimeToMs(value);
    }
    if (name === "auto-init") {
      this.autoInit = value !== null;
    }
    if (name === "fps" && value) {
      this.fps = Number.parseFloat(value);
    }
    if (name === "workbench") {
      this.workbench = value !== null;
    }
    super.attributeChangedCallback(name, old, value);
  }

  /** @public */
  @property({ type: String })
  fit: "none" | "contain" | "cover" = "none";

  #resizeObserver?: ResizeObserver;

  /** Content epoch - increments when visual content changes (used by thumbnail cache) */
  #contentEpoch = 0;

  #currentTime: number | undefined = undefined;
  #userTimeMs: number = 0; // What the user last requested (for preview display)
  #seekInProgress = false;
  #pendingSeekTime: number | undefined;
  #processingPendingSeek = false;
  #restoringFromLocalStorage = false; // Guard to prevent recursive seeks during localStorage restoration

  /** @internal */
  isRestoringFromLocalStorage(): boolean {
    return this.#restoringFromLocalStorage;
  }

  /** @internal - Used by PlaybackController to set restoration state */
  setRestoringFromLocalStorage(value: boolean): void {
    this.#restoringFromLocalStorage = value;
  }
  #customFrameTasks: Set<FrameTaskCallback> = new Set();
  #onFrameCallback: FrameTaskCallback | null = null;
  #onFrameCleanup: (() => void) | null = null;
  #playbackListener: ((event: PlaybackControllerUpdateEvent) => void) | null = null;

  /**
   * Centralized frame controller for coordinating element rendering.
   * Replaces the distributed Lit Task hierarchy with a single control point.
   */
  #frameController: FrameController = new FrameController(this);

  /**
   * Get the frame controller for centralized rendering coordination.
   * @public
   */
  get frameController(): FrameController {
    return this.#frameController;
  }

  /**
   * Centralized quality upgrade scheduler for coordinating main-quality segment fetching.
   * Lives alongside FrameController to manage background quality upgrades.
   */
  #qualityUpgradeScheduler: QualityUpgradeScheduler = new QualityUpgradeScheduler({
    requestFrameRender: () => this.requestFrameRender(),
  });

  /**
   * Get the quality upgrade scheduler for background segment fetching.
   * @public
   */
  get qualityUpgradeScheduler(): QualityUpgradeScheduler {
    return this.#qualityUpgradeScheduler;
  }

  // ============================================================================
  // FrameRenderable Interface Implementation
  // ============================================================================
  // Allows FrameController to discover and coordinate nested timegroups.
  // This ensures frame callbacks registered on nested timegroups are executed.
  // ============================================================================

  /**
   * Query timegroup's readiness state for a given time.
   * Timegroups are always ready (no async preparation needed).
   * @public
   */
  getFrameState(_timeMs: number): FrameState {
    return {
      needsPreparation: false,
      isReady: true,
      priority: PRIORITY_DEFAULT,
    };
  }

  /**
   * Async preparation phase (no-op for timegroups).
   * Timegroups don't need preparation - they just coordinate child rendering.
   * @public
   */
  async prepareFrame(_timeMs: number, _signal: AbortSignal): Promise<void> {
    // No preparation needed for timegroups
  }

  /**
   * Synchronous render phase - executes custom frame callbacks.
   * Called by FrameController after all preparation is complete.
   * Kicks off async frame callbacks without blocking (they run in background).
   * @public
   */
  renderFrame(_timeMs: number): void {
    // Execute custom frame tasks registered via addFrameTask()
    // Fire and forget - callbacks can be async but we don't block here
    // The frameTask.taskComplete promise tracks completion if needed
    if (this.#customFrameTasks.size > 0) {
      this.#executeCustomFrameTasks().catch((error) => {
        console.error("EFTimegroup custom frame task error:", error);
      });
    }
  }

  /**
   * Get the effective FPS for this timegroup.
   * During rendering, uses the render options FPS if available.
   * Otherwise uses the configured fps property.
   * @public
   */
  get effectiveFps(): number {
    // During rendering, prefer the render options FPS
    if (typeof window !== "undefined" && window.EF_FRAMEGEN?.renderOptions) {
      return window.EF_FRAMEGEN.renderOptions.encoderOptions.video.framerate;
    }
    return this.fps;
  }

  /**
   * Get the current content epoch (used by thumbnail cache).
   * The epoch increments whenever visual content changes.
   * @public
   */
  get contentEpoch(): number {
    return this.#contentEpoch;
  }

  /**
   * Increment content epoch (called when visual content changes).
   * This invalidates cached thumbnails by changing their cache keys.
   * @public
   */
  incrementContentEpoch(): void {
    this.#contentEpoch++;
  }

  /**
   * Request a frame re-render at the current time.
   *
   * Use this when the source-to-timeline mapping has changed (e.g., sourcein/sourceout)
   * but currentTimeMs hasn't. The FrameController only re-renders when currentTimeMs
   * or durationMs change, so this provides a way for child elements to request a
   * re-render when their internal state changes the visual output.
   * @public
   */
  requestFrameRender(): void {
    this.#frameController.abort();
    this.#runThrottledFrameTask();
  }

  async #runThrottledFrameTask(): Promise<void> {
    if (this.playbackController) {
      return this.playbackController.runThrottledFrameTask();
    }
    // Use FrameController directly (no frameTask fallback)
    try {
      await this.#frameController.renderFrame(this.currentTimeMs, {
        onAnimationsUpdate: (root) => {
          updateAnimations(root as typeof this);
        },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("FrameController error:", error);
    }
  }

  // ============================================================================
  // Purpose 3: Seeking Implementation
  // ============================================================================

  /** @public */
  @property({ type: Number, attribute: "currenttime" })
  set currentTime(time: number) {
    // Evaluate seek target (quantization and clamping)
    const seekTarget = evaluateSeekTarget(time, this.durationMs, this.effectiveFps);

    // Delegate to playbackController if available
    if (this.playbackController) {
      this.playbackController.currentTime = seekTarget;
      this.#userTimeMs = seekTarget * 1000; // User-initiated time change
      return;
    }

    // Only root timegroups can have their currentTime set directly
    if (!this.isRootTimegroup) {
      return;
    }

    // Validate seek target
    if (Number.isNaN(seekTarget)) {
      return;
    }

    // Skip if already at target time (unless processing pending seek or restoring from localStorage)
    if (
      seekTarget === this.#currentTime &&
      !this.#processingPendingSeek &&
      !this.#restoringFromLocalStorage
    ) {
      return;
    }

    // Skip if this is the same as pending seek
    if (this.#pendingSeekTime === seekTarget) {
      return;
    }

    // Prevent recursive seeks during localStorage restoration
    if (this.#restoringFromLocalStorage && seekTarget !== this.#currentTime) {
      // Allow the restoration seek to proceed, but prevent subsequent seeks
      // The flag will be cleared after the seek completes
    }

    // Handle concurrent seeks by queuing pending seek
    // This ensures we only have ONE seek in flight at a time, avoiding wasted work.
    // When scrubbing quickly, intermediate positions are skipped entirely - we don't
    // start work we know will be thrown away.
    if (this.#seekInProgress) {
      this.#pendingSeekTime = seekTarget;
      this.#currentTime = seekTarget;
      this._setLocalTimeMs(seekTarget * 1000);
      this.#userTimeMs = seekTarget * 1000; // User-initiated time change
      return;
    }

    // Execute seek - update both source time and user time
    this.#currentTime = seekTarget;
    this._setLocalTimeMs(seekTarget * 1000);
    this.#userTimeMs = seekTarget * 1000; // User-initiated time change
    this.#seekInProgress = true;

    // Attach .catch() to prevent unhandled rejection warning - errors are handled by seekTask.onError
    Promise.resolve(this.seekTask.run())
      .catch(() => {})
      .finally(async () => {
        this.#seekInProgress = false;

        // CRITICAL: Coordinate animations after seekTask completes
        // This handles seeks from currentTime setter (like localStorage restore)
        const { updateAnimations } = await import("./updateAnimations.js");
        updateAnimations(this);

        // Process pending seek if it differs from completed seek
        // This jumps directly to wherever the user ended up, skipping intermediates
        if (this.#pendingSeekTime !== undefined && this.#pendingSeekTime !== seekTarget) {
          const pendingTime = this.#pendingSeekTime;
          this.#pendingSeekTime = undefined;
          this.#processingPendingSeek = true;
          try {
            this.currentTime = pendingTime;
          } finally {
            this.#processingPendingSeek = false;
          }
        } else {
          this.#pendingSeekTime = undefined;
        }
      });
  }

  /** @public */
  get currentTime() {
    if (this.playbackController) {
      return this.playbackController.currentTime;
    }
    return this.#currentTime ?? 0;
  }

  /** @public */
  set currentTimeMs(ms: number) {
    this.currentTime = ms / 1000;
  }

  /** @public */
  get currentTimeMs() {
    return this.currentTime * 1000;
  }

  /**
   * The time the user last requested via seek/scrub.
   * Preview systems should use this instead of currentTimeMs to avoid
   * seeing intermediate times during batch operations (thumbnails, export).
   * @public
   */
  get userTimeMs(): number {
    return this.#userTimeMs;
  }

  /**
   * Seek to a specific time and wait for all frames to be ready.
   * This is the recommended way to seek in tests and programmatic control.
   *
   * Combines seeking (Purpose 3) with frame rendering (Purpose 4) to ensure
   * all visible elements are ready after the seek completes.
   *
   * Updates both the source time AND userTimeMs (what the preview displays).
   *
   * @param timeMs - Time in milliseconds to seek to
   * @returns Promise that resolves when the seek is complete and all visible children are ready
   * @public
   */
  async seek(timeMs: number): Promise<void> {
    // Update user time - this is what the preview should display
    this.#userTimeMs = timeMs;

    // Execute seek (Purpose 3)
    this.currentTimeMs = timeMs;
    await this.seekTask.taskComplete;

    // Handle localStorage when playbackController delegates seek
    if (this.playbackController) {
      this.saveTimeToLocalStorage(this.currentTime);
    }

    // Wait for frame rendering via FrameController
    await this.#frameController.renderFrame(timeMs, {
      onAnimationsUpdate: (root) => {
        updateAnimations(root as typeof this);
      },
    });
  }

  /**
   * Optimized seek for render loops.
   * Unlike `seek()`, this:
   * - Skips waitForMediaDurations (already loaded at render setup)
   * - Skips localStorage persistence
   * - Uses FrameController for centralized element coordination
   *
   * Still waits for all content to be ready (Lit updates, element preparation, rendering).
   *
   * @param timeMs - Time in milliseconds to seek to
   * @internal
   */
  async seekForRender(timeMs: number): Promise<SeekForRenderTiming> {
    const t0 = performance.now();

    // Set time directly (skip seekTask overhead)
    const newTime = timeMs / 1000;
    this.#userTimeMs = timeMs;
    this.#currentTime = newTime;
    // Sync playbackController if present so currentTime getter returns
    // the correct value regardless of which code path reads it.
    if (this.playbackController) {
      this.playbackController.currentTime = newTime;
    }
    // Sync the base mixin's local time so ownCurrentTimeMs returns the
    // correct value in render clones (which have no playback controller).
    this._setLocalTimeMs(timeMs);
    this.requestUpdate("currentTime");

    // First await: let Lit propagate time to children
    const t1 = performance.now();
    await this.updateComplete;
    const updateComplete1Ms = performance.now() - t1;

    // Collect all LitElement descendants (not just those with frameTask)
    // This ensures ef-text, ef-captions, and other reactive elements update
    const allLitElements = this.#getAllLitElementDescendants();

    // Wait for ALL LitElement descendants to complete their reactive updates
    // This is critical for elements like ef-text and ef-captions that don't have frameTask
    const t2 = performance.now();
    await Promise.all(allLitElements.map((el) => el.updateComplete));
    const updateComplete2Ms = performance.now() - t2;

    // OwnCurrentTimeController defers child updates via queueMicrotask.
    // Those microtasks have fired by this point (between await boundaries).
    // Await a second pass of updateComplete to catch those deferred updates.
    const t3 = performance.now();
    await Promise.all(allLitElements.map((el) => el.updateComplete));
    const updateComplete3Ms = performance.now() - t3;

    // Wait for ef-text elements to have their segments ready
    // ef-text creates segments asynchronously via requestAnimationFrame
    const textElements = allLitElements.filter((el) => el.tagName === "EF-TEXT");
    const t4 = performance.now();
    if (textElements.length > 0) {
      await Promise.all(
        textElements.map((el) => {
          if ("whenSegmentsReady" in el && typeof el.whenSegmentsReady === "function") {
            return (el as any).whenSegmentsReady();
          }
          return Promise.resolve();
        }),
      );

      // Force synchronous layout reflow after text segments are created/updated.
      // offsetHeight triggers layout computation — no need to yield a full rAF
      // (which costs 16-40ms and is throttled in hidden tabs).
      void this.offsetHeight;
    }
    const textSegmentsMs = performance.now() - t4;

    // Use FrameController for centralized element coordination
    // This replaces the old distributed frameTask system
    // Animation updates are handled via the onAnimationsUpdate callback
    const t5 = performance.now();
    const frameControllerTiming = await this.#frameController.renderFrame(timeMs, {
      waitForLitUpdate: false,
      onAnimationsUpdate: (root) => {
        updateAnimations(root as typeof this);
        // CRITICAL: Force style recalculation after updateAnimations sets animation.currentTime
        // Without this, getComputedStyle may return stale values (e.g., opacity: 0 instead of 1)
        // Accessing offsetWidth triggers synchronous style recalc
        void (root as HTMLElement).offsetWidth;
      },
    });
    const renderFrameMs = performance.now() - t5;

    // Execute custom frame tasks registered via addFrameTask()
    const t6 = performance.now();
    await this.#executeCustomFrameTasks();
    const frameTasksMs = performance.now() - t6;

    const totalMs = performance.now() - t0;

    return {
      updateComplete1Ms,
      updateComplete2Ms,
      updateComplete3Ms,
      textSegmentsMs,
      renderFrameMs,
      renderFrameQueryMs: frameControllerTiming?.queryMs ?? 0,
      renderFramePrepareMs: frameControllerTiming?.prepareMs ?? 0,
      renderFrameDrawMs: frameControllerTiming?.renderMs ?? 0,
      renderFrameAnimsMs: frameControllerTiming?.animsMs ?? 0,
      frameTasksMs,
      totalMs,
    };
  }

  /**
   * Collects all LitElement descendants recursively.
   * Used by seekForRender to ensure all reactive elements have updated.
   * Prunes subtrees of temporally-invisible elements — their Lit updates
   * still fire via microtasks (OwnCurrentTimeController), so skipping
   * the explicit await is safe.
   */
  #getAllLitElementDescendants(): LitElement[] {
    const result: LitElement[] = [];
    const currentTimeMs = this.currentTimeMs;

    const walk = (el: Element) => {
      for (const child of el.children) {
        // Temporal pruning: skip invisible temporal elements and their subtrees
        if ("startTimeMs" in child && "endTimeMs" in child) {
          const startMs = (child as any).startTimeMs ?? -Infinity;
          const endMs = (child as any).endTimeMs ?? Infinity;
          if (endMs > startMs && (currentTimeMs < startMs || currentTimeMs >= endMs)) {
            continue; // skip entire subtree
          }
        }

        if (child instanceof LitElement) {
          result.push(child);
        }
        walk(child);
      }
    };
    walk(this);

    return result;
  }

  /**
   * Determines if this is a root timegroup (no parent timegroups)
   * @public
   */
  get isRootTimegroup(): boolean {
    return !this.parentTimegroup;
  }

  /**
   * Property-based frame task callback for React integration.
   * When set, automatically registers the callback as a frame task.
   * Setting a new value automatically cleans up the previous callback.
   * Set to null or undefined to remove the callback.
   *
   * @example
   * // React usage:
   * <Timegroup onFrame={({ ownCurrentTimeMs, percentComplete }) => {
   *   // Per-frame updates
   * }} />
   *
   * @public
   */
  get onFrame(): FrameTaskCallback | null {
    return this.#onFrameCallback;
  }

  set onFrame(callback: FrameTaskCallback | null | undefined) {
    // Clean up previous callback if exists
    if (this.#onFrameCleanup) {
      this.#onFrameCleanup();
      this.#onFrameCleanup = null;
    }
    this.#onFrameCallback = callback ?? null;

    // Register new callback if provided
    if (callback) {
      this.#onFrameCleanup = this.addFrameTask(callback);
    }
  }

  /**
   * Register a custom frame task callback that will be executed during frame rendering.
   * The callback receives timing information and can be async or sync.
   * Multiple callbacks can be registered and will execute in parallel.
   *
   * @param callback - Function to execute on each frame
   * @returns A cleanup function that removes the callback when called
   * @public
   */
  addFrameTask(callback: FrameTaskCallback): () => void {
    if (typeof callback !== "function") {
      throw new Error("Frame task callback must be a function");
    }
    this.#customFrameTasks.add(callback);
    return () => {
      this.#customFrameTasks.delete(callback);
    };
  }

  /**
   * Remove a previously registered custom frame task callback.
   *
   * @param callback - The callback function to remove
   * @public
   */
  removeFrameTask(callback: FrameTaskCallback): void {
    this.#customFrameTasks.delete(callback);
  }

  /** @internal */
  saveTimeToLocalStorage(time: number) {
    try {
      if (this.id && this.isConnected && !Number.isNaN(time)) {
        localStorage.setItem(this.storageKey, time.toString());
      }
    } catch (error) {
      log("Failed to save time to localStorage", error);
    }
  }

  render() {
    return html`<slot @slotchange=${this.#handleSlotChange}></slot> `;
  }

  #handleSlotChange = () => {
    resetTemporalCache();
    flushSequenceDurationCache();
    flushStartTimeMsCache();

    this.requestUpdate();
    this.#syncChildListeners();
    this.emitContentChange("structure");
  };

  /** @internal */
  loadTimeFromLocalStorage(): number | undefined {
    if (this.id) {
      try {
        const storedValue = localStorage.getItem(this.storageKey);
        if (storedValue === null) {
          return undefined;
        }
        const parsedValue = Number.parseFloat(storedValue);
        // Guard against NaN and Infinity which could cause issues
        if (Number.isNaN(parsedValue) || !Number.isFinite(parsedValue)) {
          return undefined;
        }
        return parsedValue;
      } catch (error) {
        log("Failed to load time from localStorage", error);
      }
    }
    return undefined;
  }

  connectedCallback() {
    // CRITICAL: super.connectedCallback() MUST be synchronous for Lit lifecycle to work correctly.
    // Deferring it breaks render clones because updateComplete resolves before Lit initializes.
    //
    // EFTemporal.connectedCallback() handles root detection after Lit Context propagates:
    // - Schedules updateComplete.then(didBecomeRoot check)
    // - Only true roots (no parent after context) create PlaybackController
    //
    // PlaybackController.hostConnected() owns ALL root initialization:
    // - waitForMediaDurations
    // - localStorage time restoration
    // - initial seek
    //
    // This avoids the previous race conditions where both EFTimegroup.connectedCallback
    // and PlaybackController.hostConnected tried to initialize, causing concurrent seeks.
    super.connectedCallback();

    // Immediately pause all SVG SMIL clocks in the subtree.
    // The SMIL clock starts as soon as an SVG enters a document, before any
    // frame loop fires. Pausing here prevents visible autoplay between
    // connectedCallback and the first updateAnimations call.
    for (const svg of this.querySelectorAll("svg")) {
      svg.pauseAnimations();
    }

    // Pause CSS animations the moment they start.
    // CSS animations are created by the browser's style engine after
    // connectedCallback fires, so getAnimations() returns nothing here.
    // Listening for animationstart in capture phase lets us intercept each
    // animation as soon as the browser creates it, before any frame is painted.
    this.addEventListener("animationstart", this.#onCSSAnimationStart, {
      capture: true,
    });

    // Skip re-initialization when being moved for canvas preview capture.
    // EFTemporal.connectedCallback (super) already guards its own logic;
    // we guard the EFTimegroup-specific parts here (initializer, child
    // listeners, TimegroupController, wrapWithWorkbench).
    if ((this as any).canvasPreviewActive) return;

    // Run initializer after element is fully connected and Lit has updated
    // This ensures the element is in a stable state before user code runs
    this.updateComplete.then(() => {
      this.#runInitializer();
      // slotchange may not fire for empty timegroups, so run initial aggregation
      this.#syncChildListeners();
    });

    // Defer TimegroupController creation and workbench wrapping to next frame
    // These operations involve DOM queries (closest, getBoundingClientRect) which
    // can be expensive when many elements initialize simultaneously
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.parentTimegroup) {
          new TimegroupController(this.parentTimegroup, this);
        }

        if (this.shouldWrapWithWorkbench()) {
          this.wrapWithWorkbench();
        }
      });
    });
  }

  /**
   * Called when this timegroup becomes a root (no parent timegroup).
   * Sets up the playback listener after PlaybackController is created.
   * @internal
   */
  didBecomeRoot() {
    super.didBecomeRoot();
    this.#setupPlaybackListener();
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    const isEditframeDomain = hostname === "editframe.com" || hostname.endsWith(".editframe.com");
    if (
      this.playbackController &&
      typeof __EF_TELEMETRY_ENABLED__ !== "undefined" &&
      __EF_TELEMETRY_ENABLED__ &&
      !isEditframeDomain
    ) {
      fetch("https://editframe.com/api/v1/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "load" }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  /**
   * Setup listener on playbackController to sync userTimeMs during playback.
   */
  #setupPlaybackListener(): void {
    // Already setup or no controller
    if (this.#playbackListener || !this.playbackController) return;

    this.#playbackListener = (event: PlaybackControllerUpdateEvent) => {
      // Update userTimeMs during playback time changes
      // Clone-timeline: captures use separate clones, so Prime-timeline updates freely
      // Canvas preview reads userTimeMs to know what to render
      if (event.property === "currentTimeMs" && typeof event.value === "number") {
        this.#userTimeMs = event.value;
      }
    };

    this.playbackController.addListener(this.#playbackListener);
  }

  /**
   * Remove playback listener on disconnect.
   */
  #removePlaybackListener(): void {
    if (this.#playbackListener && this.playbackController) {
      this.playbackController.removeListener(this.#playbackListener);
    }
    this.#playbackListener = null;
  }

  #previousDurationMs = 0;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("mode") || changedProperties.has("overlapMs")) {
      durationCache.delete(this);
    }

    if (this.#previousDurationMs !== this.durationMs) {
      this.#previousDurationMs = this.durationMs;
      this.dispatchEvent(new CustomEvent("durationchange", { bubbles: true, composed: true }));
      // Render clones are sequenced via seekForRender — don't trigger autonomous re-renders.
      // This prevents FrameController.abort() from interrupting an in-progress seekForRender.
      if (!this.hasAttribute("data-no-playback-controller")) {
        this.#runThrottledFrameTask();
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.removeEventListener("animationstart", this.#onCSSAnimationStart, {
      capture: true,
    });

    // Skip teardown when being moved for canvas preview capture.
    // EFTemporal.disconnectedCallback (super) already guards its own logic.
    if ((this as any).canvasPreviewActive) return;

    this.#resizeObserver?.disconnect();
    this.#removePlaybackListener();
    for (const child of this.#trackedChildren) {
      child.removeEventListener("readystatechange", this.#childReadyStateHandler);
      child.removeEventListener("contentchange", this.#childContentChangeHandler);
      child.removeEventListener("durationchange", this.#childDurationChangeHandler);
    }
    this.#trackedChildren.clear();
    this.#qualityUpgradeScheduler.dispose();
  }

  /**
   * Render the timegroup to an MP4 video file and trigger download.
   * Captures each frame at the specified fps, encodes using WebCodecs via
   * MediaBunny, and downloads the resulting video.
   *
   * Uses dynamic import to only load render utilities in browser context.
   *
   * @param options - Rendering options (fps, codec, bitrate, filename, etc.)
   * @returns Promise that resolves when video is downloaded
   * @public
   */
  async renderToVideo(options?: RenderToVideoOptions): Promise<Uint8Array | undefined> {
    // Dynamic import - only loads in browser context when actually called
    const { renderTimegroupToVideo } = await import("../preview/renderTimegroupToVideo.js");
    return renderTimegroupToVideo(this, options);
  }

  /**
   * Runs the initializer function with validation for synchronous execution and time budget.
   * Only runs once per instance. Safe to call multiple times - will skip if already run.
   * @throws Error if initializer returns a Promise (async not allowed)
   * @throws Error if initializer takes more than INITIALIZER_ERROR_THRESHOLD_MS
   * @internal
   */
  #runInitializer(): void {
    // Skip if no initializer or already run
    if (!this.initializer || this.#initializerHasRun) {
      return;
    }

    // Mark as run before executing to prevent recursion
    this.#initializerHasRun = true;

    const startTime = performance.now();
    const result: unknown = this.initializer(this);
    const elapsed = performance.now() - startTime;

    // Check for async (Promise return) - initializers MUST be synchronous
    if (result !== undefined && result !== null && typeof (result as any).then === "function") {
      throw new Error(
        "Timeline initializer must be synchronous. " +
          "Do not return a Promise from the initializer function.",
      );
    }

    // Time budget enforcement - initializers run for EVERY instance
    if (elapsed > INITIALIZER_ERROR_THRESHOLD_MS) {
      throw new Error(
        `Timeline initializer took ${elapsed.toFixed(1)}ms, exceeding the ${INITIALIZER_ERROR_THRESHOLD_MS}ms limit. ` +
          "Initializers must be fast - move expensive work outside the initializer.",
      );
    }

    if (elapsed > INITIALIZER_WARN_THRESHOLD_MS) {
      console.warn(
        `[ef-timegroup] Initializer took ${elapsed.toFixed(1)}ms, exceeding ${INITIALIZER_WARN_THRESHOLD_MS}ms. ` +
          "Consider optimizing for better render performance.",
      );
    }
  }

  /**
   * Copy captionsData property from original to clone.
   * cloneNode() only copies attributes, not JavaScript properties.
   * captionsData is often set via JS (e.g., captionsEl.captionsData = {...}),
   * so we must manually copy it to the cloned elements.
   * @internal
   */
  #copyCaptionsData(original: Element, clone: Element): void {
    // Find matching caption elements by position (querySelectorAll returns in document order)
    const originalCaptions = original.querySelectorAll("ef-captions");
    const cloneCaptions = clone.querySelectorAll("ef-captions");

    for (let i = 0; i < originalCaptions.length && i < cloneCaptions.length; i++) {
      const origCap = originalCaptions[i] as any;
      const cloneCap = cloneCaptions[i] as any;

      // Copy loaded captions data from any source (JS property, captions-src, script element).
      // The loaded data is stored in unifiedCaptionsDataTask.value after async loading.
      // Setting captionsData on the clone gives it Priority 1, bypassing async loading.
      const loadedData = origCap.captionsData ?? origCap.unifiedCaptionsDataTask?.value;
      if (loadedData) {
        cloneCap.captionsData = loadedData;
      }
    }
  }

  /**
   * Copy ef-text _textContent property from original to cloned elements.
   * This MUST be called BEFORE elements upgrade (before updateComplete)
   * because splitText() runs in connectedCallback and will clear segments
   * if _textContent is null/empty.
   * @internal
   */
  #copyTextContent(original: Element, clone: Element): void {
    const originalTexts = original.querySelectorAll("ef-text");
    const cloneTexts = clone.querySelectorAll("ef-text");

    for (let i = 0; i < originalTexts.length && i < cloneTexts.length; i++) {
      const origText = originalTexts[i] as any;
      const cloneText = cloneTexts[i] as any;

      // Copy _textContent if it exists
      // This is a private property, so we access it via any
      if (origText._textContent !== undefined) {
        cloneText._textContent = origText._textContent;
      }
      // Also copy the segments getter to ensure we can read them
      if (origText._templateElement !== undefined) {
        cloneText._templateElement = origText._templateElement;
      }
    }
  }

  /**
   * Copy ef-text-segment properties from original to cloned elements.
   * segmentText and other properties are set via JS, not attributes,
   * so we must manually copy them to the cloned elements.
   * @internal
   */
  async #copyTextSegmentData(original: Element, clone: Element): Promise<void> {
    // Find matching text segment elements by position
    const originalSegments = original.querySelectorAll("ef-text-segment");
    const cloneSegments = clone.querySelectorAll("ef-text-segment");

    const updatePromises: Promise<any>[] = [];

    for (let i = 0; i < originalSegments.length && i < cloneSegments.length; i++) {
      const origSeg = originalSegments[i] as any;
      const cloneSeg = cloneSegments[i] as any;

      // Copy all segment properties
      if (origSeg.segmentText !== undefined) {
        cloneSeg.segmentText = origSeg.segmentText;
      }
      if (origSeg.segmentIndex !== undefined) {
        cloneSeg.segmentIndex = origSeg.segmentIndex;
      }
      if (origSeg.staggerOffsetMs !== undefined) {
        cloneSeg.staggerOffsetMs = origSeg.staggerOffsetMs;
      }
      if (origSeg.segmentStartMs !== undefined) {
        cloneSeg.segmentStartMs = origSeg.segmentStartMs;
      }
      if (origSeg.segmentEndMs !== undefined) {
        cloneSeg.segmentEndMs = origSeg.segmentEndMs;
      }

      // Wait for Lit to render the updated segmentText to shadow DOM
      if (cloneSeg.updateComplete) {
        updatePromises.push(cloneSeg.updateComplete);
      }
    }

    // Wait for all segment updates to complete
    await Promise.all(updatePromises);
  }

  /**
   * Wait for all ef-captions elements to have their data loaded.
   * This is needed because EFCaptions is not an EFMedia, so waitForMediaDurations doesn't cover it.
   * Used by createRenderClone to ensure captions are ready before rendering.
   * @internal
   */
  async #waitForCaptionsData(root: Element): Promise<void> {
    // Find all ef-captions elements (including nested in timegroups)
    const captionsElements = root.querySelectorAll("ef-captions");
    if (captionsElements.length === 0) return;

    // Wait for each caption element's data to load
    // Use duck-typing to check for loadCaptionsData method
    const waitPromises: Promise<unknown>[] = [];
    for (const el of captionsElements) {
      const captions = el as any;
      // Try new async method first
      if (typeof captions.loadCaptionsData === "function") {
        waitPromises.push(captions.loadCaptionsData().catch(() => {}));
      }
      // Fallback to task if present
      else if (captions.unifiedCaptionsDataTask?.taskComplete) {
        waitPromises.push(captions.unifiedCaptionsDataTask.taskComplete.catch(() => {}));
      }
    }

    if (waitPromises.length > 0) {
      await Promise.all(waitPromises);
    }
  }

  /**
   * Copies initializers from original timegroup tree to cloned timegroup tree.
   * Handles both the root timegroup and all nested timegroups recursively.
   * @internal
   */
  async #copyInitializersToClone(original: EFTimegroup, clone: EFTimegroup): Promise<void> {
    // Copy and execute initializer at this level
    if (original.initializer) {
      clone.initializer = original.initializer;
      // Explicitly run the initializer on the clone
      // Wait for Lit update cycle to complete first so the element is stable
      await clone.updateComplete;
      clone.#runInitializer();
    }

    // Find all nested timegroups in both original and clone
    const originalNested = Array.from(original.querySelectorAll("ef-timegroup")) as EFTimegroup[];
    const cloneNested = Array.from(clone.querySelectorAll("ef-timegroup")) as EFTimegroup[];

    // Match up nested timegroups by index (they should correspond 1:1)
    for (let i = 0; i < originalNested.length && i < cloneNested.length; i++) {
      const origNested = originalNested[i];
      const cloneNestedItem = cloneNested[i];

      if (origNested!.initializer) {
        cloneNestedItem!.initializer = origNested!.initializer;
        await cloneNestedItem!.updateComplete;
        cloneNestedItem!.#runInitializer();
      }
    }
  }

  /**
   * Create an independent clone of this timegroup for rendering.
   * The clone is a fully functional ef-timegroup with its own animations
   * and time state, isolated from the original (Prime-timeline).
   *
   * OPTIONAL: An initializer can be set via `timegroup.initializer = (tg) => { ... }`
   * to re-run JavaScript setup (frame callbacks, React components) on each clone.
   *
   * This enables:
   * - Rendering without affecting user's preview position
   * - Concurrent renders with different clones
   * - Re-running JavaScript setup on each clone (if initializer is provided)
   *
   * @returns Promise resolving to clone, container, and cleanup function
   * @throws Error if initializer is async or takes too long
   * @public
   */
  async createRenderClone(): Promise<RenderCloneResult> {
    const factory = getCloneFactory(this);

    if (factory) {
      return this.#createRenderCloneFromFactory(factory);
    }
    return this.#createRenderCloneFromDOM();
  }

  /**
   * Wait for all LitElement descendants to update and for text segments to be ready.
   * This ensures the clone is fully initialized before rendering.
   * @internal
   */
  async #waitForDescendants(actualClone: EFTimegroup): Promise<void> {
    // Wait for all LitElement descendants
    const allLitElements = Array.from(actualClone.querySelectorAll("*")).filter(
      (el) => el instanceof LitElement,
    ) as LitElement[];
    await Promise.all(allLitElements.map((el) => el.updateComplete));

    // Wait for text segments
    const textElements = allLitElements.filter((el) => el.tagName === "EF-TEXT");
    if (textElements.length > 0) {
      await Promise.all(
        textElements.map((el) => {
          if ("whenSegmentsReady" in el && typeof el.whenSegmentsReady === "function") {
            return (el as any).whenSegmentsReady();
          }
          return Promise.resolve();
        }),
      );
      void actualClone.offsetHeight;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  /**
   * Factory path: mount a fresh component tree (React, etc.) to produce
   * a fully functional clone. The factory is responsible for rendering
   * the component into the container and returning the root ef-timegroup.
   */
  async #createRenderCloneFromFactory(
    factory: NonNullable<ReturnType<typeof getCloneFactory>>,
  ): Promise<RenderCloneResult> {
    const width = this.offsetWidth || 1920;
    const height = this.offsetHeight || 1080;

    const container = document.createElement("div");
    container.className = "ef-render-clone-container";
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: ${width}px;
      height: ${height}px;
      pointer-events: none;
      overflow: hidden;
    `;

    // Preserve ef-configuration context
    let renderTarget: HTMLElement = container;
    const originalConfig = this.closest("ef-configuration");
    if (originalConfig) {
      const configClone = originalConfig.cloneNode(false) as HTMLElement;
      container.appendChild(configClone);
      renderTarget = configClone;
    }

    document.body.appendChild(container);

    // Mount the component tree — this produces a live ef-timegroup
    const { timegroup: actualClone, cleanup: factoryCleanup } = factory(renderTarget);

    if (!actualClone) {
      throw new Error(
        "Clone factory did not produce an ef-timegroup. " +
          "Ensure the factory renders a component containing a Timegroup.",
      );
    }

    // Mark as render clone
    actualClone.setAttribute("data-no-workbench", "true");
    actualClone.setAttribute("data-no-playback-controller", "true");
    actualClone.style.width = `${width}px`;
    actualClone.style.height = `${height}px`;
    actualClone.style.display = "block";

    // Wait for custom elements to upgrade and Lit to update
    await customElements.whenDefined("ef-timegroup");
    customElements.upgrade(container);
    await actualClone.updateComplete;

    // Wait for all descendants to be ready
    await this.#waitForDescendants(actualClone);

    // Finalize clone: parent-child relationships, lock root, remove PlaybackController
    await this.#finalizeRenderClone(actualClone);

    return {
      clone: actualClone,
      container,
      cleanup: () => {
        container.remove();
        factoryCleanup();
      },
    };
  }

  /**
   * DOM path: deep clone the DOM tree and copy JavaScript properties.
   * Used for vanilla HTML/JS timelines that don't have a factory registered.
   */
  async #createRenderCloneFromDOM(): Promise<RenderCloneResult> {
    // 1. Create offscreen container
    const container = document.createElement("div");
    container.className = "ef-render-clone-container";
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: ${this.offsetWidth || 1920}px;
      height: ${this.offsetHeight || 1080}px;
      pointer-events: none;
      overflow: hidden;
    `;

    // 2. Deep clone the DOM
    const cloneEl = this.cloneNode(true) as EFTimegroup;
    // Strip all id attributes from clone tree to prevent duplicate IDs in the document
    cloneEl.removeAttribute("id");
    for (const el of cloneEl.querySelectorAll("[id]")) {
      el.removeAttribute("id");
    }
    cloneEl.setAttribute("data-no-workbench", "true");
    cloneEl.setAttribute("data-no-playback-controller", "true");

    const width = this.offsetWidth || 1920;
    const height = this.offsetHeight || 1080;
    cloneEl.style.width = `${width}px`;
    cloneEl.style.height = `${height}px`;
    cloneEl.style.display = "block";

    // 2b. Copy JavaScript properties that aren't cloned by cloneNode()
    this.#copyCaptionsData(this, cloneEl);
    this.#copyTextContent(this, cloneEl);

    // 3. Preserve ef-configuration context
    const originalConfig = this.closest("ef-configuration");
    if (originalConfig) {
      const configClone = originalConfig.cloneNode(false) as HTMLElement;
      configClone.appendChild(cloneEl);
      container.appendChild(configClone);
    } else {
      container.appendChild(cloneEl);
    }

    document.body.appendChild(container);

    // Wait for custom elements to upgrade
    await cloneEl.updateComplete;

    // Copy initializers and run them on clones
    await this.#copyInitializersToClone(this, cloneEl);

    // Copy text segment data
    await this.#copyTextSegmentData(this, cloneEl);

    // Find the actual timegroup (initializer may have replaced the DOM)
    let actualClone = container.querySelector("ef-timegroup") as EFTimegroup;
    if (!actualClone) {
      throw new Error(
        "No ef-timegroup found after initializer. " +
          "Ensure your initializer renders a Timegroup (React) or does not remove the cloned element (vanilla JS).",
      );
    }

    // Wait for custom elements to upgrade
    await customElements.whenDefined("ef-timegroup");
    customElements.upgrade(container);
    actualClone = container.querySelector("ef-timegroup") as EFTimegroup;
    if (!actualClone) {
      throw new Error("ef-timegroup element lost after upgrade");
    }

    // Wait for LitElement updates
    await actualClone.updateComplete;

    // Wait for all descendants to be ready
    await this.#waitForDescendants(actualClone);

    // Copy text segment data again after initializer may have replaced DOM
    await this.#copyTextSegmentData(this, actualClone);

    // Finalize clone
    await this.#finalizeRenderClone(actualClone);

    return {
      clone: actualClone,
      container,
      cleanup: () => {
        container.remove();
        const reactRoot = (actualClone as any)._reactRoot;
        if (reactRoot) {
          queueMicrotask(() => {
            reactRoot.unmount();
          });
        }
      },
    };
  }

  /**
   * Shared finalization for both factory and DOM clone paths:
   * - Set up parent-child temporal relationships
   * - Lock root timegroup references
   * - Wait for media durations and captions
   * - Remove PlaybackController
   * - Initial seek to frame 0
   */
  async #finalizeRenderClone(actualClone: EFTimegroup): Promise<void> {
    // Set up parent-child relationships for temporal elements
    const setupParentChildRelationships = (parent: EFTimegroup, root: EFTimegroup) => {
      for (const child of parent.children) {
        if (child.tagName === "EF-TIMEGROUP") {
          const childTG = child as EFTimegroup;
          childTG.parentTimegroup = parent;
          childTG.rootTimegroup = root;
          (childTG as any).lockRootTimegroup();
          setupParentChildRelationships(childTG, root);
        } else if ("parentTimegroup" in child && "rootTimegroup" in child) {
          const temporal = child as TemporalMixinInterface & HTMLElement;
          temporal.parentTimegroup = parent;
          temporal.rootTimegroup = root;
          if ("lockRootTimegroup" in temporal && typeof temporal.lockRootTimegroup === "function") {
            temporal.lockRootTimegroup();
          }
        } else if (child instanceof Element) {
          setupInContainer(child, parent, root);
        }
      }
    };

    const setupInContainer = (
      container: Element,
      nearestParentTG: EFTimegroup,
      root: EFTimegroup,
    ) => {
      for (const child of container.children) {
        if (child.tagName === "EF-TIMEGROUP") {
          const childTG = child as EFTimegroup;
          childTG.parentTimegroup = nearestParentTG;
          childTG.rootTimegroup = root;
          (childTG as any).lockRootTimegroup();
          setupParentChildRelationships(childTG, root);
        } else if ("parentTimegroup" in child && "rootTimegroup" in child) {
          const temporal = child as TemporalMixinInterface & HTMLElement;
          temporal.parentTimegroup = nearestParentTG;
          temporal.rootTimegroup = root;
          if ("lockRootTimegroup" in temporal && typeof temporal.lockRootTimegroup === "function") {
            temporal.lockRootTimegroup();
          }
        } else if (child instanceof Element) {
          setupInContainer(child, nearestParentTG, root);
        }
      }
    };

    actualClone.rootTimegroup = actualClone;
    setupParentChildRelationships(actualClone, actualClone);

    await actualClone.updateComplete;

    // Lock root references to prevent Lit Context from overwriting
    actualClone.rootTimegroup = actualClone;
    (actualClone as any).lockRootTimegroup();
    const finalizeRootTimegroup = (el: Element) => {
      if ("rootTimegroup" in el && "lockRootTimegroup" in el) {
        (el as any).rootTimegroup = actualClone;
        (el as any).lockRootTimegroup();
      }
      for (const child of el.children) {
        finalizeRootTimegroup(child);
      }
    };
    finalizeRootTimegroup(actualClone);

    await actualClone.waitForMediaDurations();
    await this.#waitForCaptionsData(actualClone);

    // Remove PlaybackController — render clones use seekForRender directly
    if (actualClone.playbackController) {
      actualClone.playbackController.remove();
      actualClone.playbackController = undefined;
    }

    // Initial seek to frame 0
    await actualClone.seek(0);
  }

  /** @internal */
  get storageKey() {
    if (!this.id) {
      throw new Error("Timegroup must have an id to use localStorage.");
    }
    return `ef-timegroup-${this.id}`;
  }

  /** @internal */
  get intrinsicDurationMs() {
    if (this.hasExplicitDuration) {
      return this.explicitDurationMs;
    }
    return undefined;
  }

  /** @internal */
  get hasOwnDuration() {
    return hasOwnDurationForMode(this.mode, this.hasExplicitDuration);
  }

  // ============================================================================
  // Purpose 1: Composition Rules Implementation
  // ============================================================================

  /** @public */
  get durationMs(): number {
    // Fixed mode delegates to parent class durationMs which handles trimming, source in/out, etc.
    if (this.mode === "fixed") {
      return super.durationMs;
    }

    // Evaluate duration semantics based on mode (Purpose 1)
    // childTemporals returns TemporalMixinInterface[], but we need HTMLElement intersection
    const childTemporalsAsElements = this.childTemporals as Array<
      TemporalMixinInterface & HTMLElement
    >;
    return evaluateDurationForMode(this, this.mode, childTemporalsAsElements);
  }

  // ============================================================================
  // Purpose 4: Frame Rendering - What Happens Each Frame
  // ============================================================================

  #mediaDurationsPromise: Promise<void> | undefined = undefined;

  /** @internal */
  async waitForMediaDurations(signal?: AbortSignal) {
    // Check abort before starting
    signal?.throwIfAborted();

    // Start loading media durations in background, but don't block if already in progress
    // This prevents multiple concurrent calls from creating redundant work
    if (!this.#mediaDurationsPromise) {
      this.#mediaDurationsPromise = this.#waitForMediaDurations(signal).catch((err) => {
        // Re-throw AbortError to propagate cancellation
        if (err instanceof DOMException && err.name === "AbortError") {
          this.#mediaDurationsPromise = undefined;
          throw err;
        }
        console.error(
          `[EFTimegroup] waitForMediaDurations failed for ${this.id || "unnamed"}:`,
          err,
        );
        // Clear promise on error so it can be retried
        this.#mediaDurationsPromise = undefined;
        throw err;
      });
    }

    // If signal is provided and aborted, throw immediately
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    return this.#mediaDurationsPromise;
  }

  /**
   * Wait for all media elements to load their initial segments.
   * Ideally we would only need the extracted index json data, but
   * that caused issues with constructing audio data. We had negative durations
   * in calculations and it was not clear why.
   */
  async #waitForMediaDurations(signal?: AbortSignal) {
    return withSpan(
      "timegroup.waitForMediaDurations",
      {
        timegroupId: this.id || "unknown",
        mode: this.mode,
      },
      undefined,
      async (span) => {
        // Check abort before starting
        signal?.throwIfAborted();

        // Don't wait for updateComplete during initialization - it causes deadlocks with nested timegroups
        // Instead, use a short delay to let elements connect, then scan for media elements
        // If elements aren't ready yet, we'll retry or they'll be picked up on the next update cycle
        await new Promise<void>((resolve, reject) => {
          if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }

          const abortHandler = () => {
            clearTimeout(timeoutId);
            cancelAnimationFrame(rafId2);
            cancelAnimationFrame(rafId1);
            reject(new DOMException("Aborted", "AbortError"));
          };
          signal?.addEventListener("abort", abortHandler, { once: true });

          let rafId1: number;
          let rafId2: number;
          let timeoutId: ReturnType<typeof setTimeout>;

          // Use multiple animation frames to ensure DOM is ready, but don't wait for all children
          rafId1 = requestAnimationFrame(() => {
            if (signal?.aborted) {
              reject(new DOMException("Aborted", "AbortError"));
              return;
            }
            rafId2 = requestAnimationFrame(() => {
              if (signal?.aborted) {
                reject(new DOMException("Aborted", "AbortError"));
                return;
              }
              // Small additional delay to let custom elements upgrade
              timeoutId = setTimeout(() => {
                signal?.removeEventListener("abort", abortHandler);
                resolve();
              }, 10);
            });
          });
        });

        // Check abort after delay
        signal?.throwIfAborted();

        const mediaElements = deepGetMediaElements(this);
        if (isTracingEnabled()) {
          span.setAttribute("mediaElementsCount", mediaElements.length);
        }

        // Check abort after getting elements
        signal?.throwIfAborted();

        // Then, we must await the fragmentIndexTask to ensure all media elements have their
        // fragment index loaded, which is where their duration is parsed from.
        // Use Promise.allSettled with timeout to avoid blocking if asset server is slow
        const mediaLoadStart = Date.now();
        const MEDIA_LOAD_TIMEOUT_MS = 30000; // 30 second timeout per element

        const loadPromises = mediaElements.map(async (m, index) => {
          // Check abort before each element
          signal?.throwIfAborted();

          const elementStart = Date.now();
          try {
            // Use getMediaEngine async method if available
            if (typeof m.getMediaEngine === "function") {
              // Add timeout to prevent indefinite blocking
              const timeoutPromise = new Promise<undefined>((_, reject) => {
                if (signal?.aborted) {
                  reject(new DOMException("Aborted", "AbortError"));
                  return;
                }
                const timeoutId = setTimeout(
                  () =>
                    reject(
                      new Error(
                        `Media element ${index} load timeout after ${MEDIA_LOAD_TIMEOUT_MS}ms`,
                      ),
                    ),
                  MEDIA_LOAD_TIMEOUT_MS,
                );
                signal?.addEventListener(
                  "abort",
                  () => {
                    clearTimeout(timeoutId);
                    reject(new DOMException("Aborted", "AbortError"));
                  },
                  { once: true },
                );
              });

              await Promise.race([m.getMediaEngine(signal), timeoutPromise]);
            }
            // Fallback: check status and use taskComplete
            else if (m.mediaEngineTask) {
              // Status: INITIAL=0, PENDING=1, COMPLETE=2, ERROR=3
              const status = m.mediaEngineTask.status;

              // Already complete or errored - no need to wait
              if (status === 2 || status === 3) {
                return;
              }

              // Attach .catch() to taskComplete to prevent unhandled rejection
              const taskPromise = m.mediaEngineTask.taskComplete;
              taskPromise?.catch(() => {});

              if (taskPromise) {
                const timeoutPromise = new Promise<undefined>((_, reject) => {
                  if (signal?.aborted) {
                    reject(new DOMException("Aborted", "AbortError"));
                    return;
                  }
                  const timeoutId = setTimeout(
                    () =>
                      reject(
                        new Error(
                          `Media element ${index} load timeout after ${MEDIA_LOAD_TIMEOUT_MS}ms`,
                        ),
                      ),
                    MEDIA_LOAD_TIMEOUT_MS,
                  );
                  signal?.addEventListener(
                    "abort",
                    () => {
                      clearTimeout(timeoutId);
                      reject(new DOMException("Aborted", "AbortError"));
                    },
                    { once: true },
                  );
                });

                await Promise.race([taskPromise, timeoutPromise]);
              }
            }
          } catch (error) {
            // Re-throw AbortError to propagate cancellation
            if (error instanceof DOMException && error.name === "AbortError") {
              throw error;
            }
            // Log only if tracing is enabled to reduce console noise
            if (isTracingEnabled()) {
              const elementElapsed = Date.now() - elementStart;
              console.error(
                `[EFTimegroup] Media element ${index} failed after ${elementElapsed}ms:`,
                error,
              );
            }
            // Don't throw - continue with other elements
          }
        });

        const results = await Promise.allSettled(loadPromises);

        // Check if any were aborted
        const aborted = results.some(
          (r) =>
            r.status === "rejected" &&
            r.reason instanceof DOMException &&
            r.reason.name === "AbortError",
        );
        if (aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        // Log any failures but don't throw - we want to continue even if some media fails
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0 && isTracingEnabled()) {
          const mediaLoadElapsed = Date.now() - mediaLoadStart;
          console.warn(
            `[EFTimegroup] ${failures.length} media elements failed to load in ${mediaLoadElapsed}ms:`,
            failures.map((r) => (r.status === "rejected" ? r.reason : null)),
          );
        }

        // After waiting for durations, we must force some updates to cascade and ensure all temporal elements
        // have correct durations and start times. It is not ideal that we have to do this inside here,
        // but it is the best current way to ensure that all temporal elements have correct durations and start times.

        // Next, we must flush the startTimeMs cache to ensure all media elements have their
        // startTimeMs parsed fresh, otherwise the startTimeMs is cached per animation frame.
        flushStartTimeMsCache();

        // Flush duration cache since child durations may have changed
        flushSequenceDurationCache();

        // Request an update to the currentTime of this group, ensuring that time updates will cascade
        // down to children, forcing sequence groups to arrange correctly.
        // This also makes the filmstrip update correctly.
        // Defer using setTimeout(0) to avoid Lit warning about scheduling updates after update completed.
        // This method can be called during a task or after an update cycle completes, and using
        // setTimeout ensures we're completely outside any Lit update cycle.
        setTimeout(() => this.requestUpdate("currentTime"), 0);
        // Note: We don't await updateComplete here during initialization to avoid deadlocks.
        // The update will complete asynchronously, and sequence groups will arrange correctly
        // once all timegroups have finished initializing. During normal operation (seeks, etc.),
        // the caller will wait for updateComplete explicitly if needed.
      },
    );
  }

  /** @internal */
  get childTemporals() {
    return shallowGetTemporalElements(this);
  }

  /**
   * Returns true if the timegroup should be wrapped with a workbench.
   *
   * A timegroup should be wrapped with a workbench if:
   * - It's being rendered (EF_RENDERING), OR
   * - The workbench property is set to true
   *
   * If the timegroup is already wrapped in a context provider like ef-preview,
   * it should NOT be wrapped in a workbench.
   * @internal
   */
  shouldWrapWithWorkbench() {
    // Never wrap when being captured by canvas preview — the element is
    // temporarily reparented for native rendering and must not spawn a
    // new workbench (which would read "canvas" from localStorage and
    // re-enter initCanvasMode, creating an infinite loop).
    if ((this as any).canvasPreviewActive) {
      return false;
    }

    // Only root timegroups should wrap with workbench
    if (!this.isRootTimegroup) {
      return false;
    }

    // Never wrap with workbench when inside a canvas
    // Canvas manages its own layout and coordinate system
    if (this.closest("ef-canvas") !== null) {
      return false;
    }

    // Never wrap if already inside preview, workbench, or preview context
    if (
      this.closest("ef-preview") !== null ||
      this.closest("ef-workbench") !== null ||
      this.closest("ef-preview-context") !== null
    ) {
      return false;
    }

    // Skip wrapping in test contexts or if explicitly disabled
    // Test contexts and render clones provide their own rendering infrastructure
    if (this.closest("test-context") !== null || this.hasAttribute("data-no-workbench")) {
      return false;
    }

    // During rendering, never wrap with workbench - timegroups can seek without it
    const isRendering = EF_RENDERING?.() === true;
    if (isRendering) {
      return false;
    }

    // Check URL param to disable workbench (only applies in non-rendering mode)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("noWorkbench") === "true" || params.get("no-workbench") === "true") {
        return false;
      }
    }

    // Respect the explicit workbench property
    return this.workbench;
  }

  /** @internal */
  wrapWithWorkbench() {
    const workbench = document.createElement("ef-workbench") as any;
    const parent = this.parentElement;

    // When in rendering mode, immediately set rendering=true before insertion
    // This prevents the workbench UI from ever being visible in rendered frames
    if (EF_RENDERING()) {
      // Use setAttribute to ensure it's set before the element connects and renders
      workbench.setAttribute("rendering", "");
      workbench.rendering = true;
    }

    // Apply explicit sizing to ensure workbench fills its container
    if (parent === document.body) {
      // Direct child of body: use viewport units with fixed positioning
      workbench.style.position = "fixed";
      workbench.style.top = "0";
      workbench.style.left = "0";
      workbench.style.width = "100vw";
      workbench.style.height = "100vh";
      workbench.style.zIndex = "0";
    } else {
      // Embedded in container: ensure it fills the container
      // Use absolute positioning to prevent content-based sizing
      workbench.style.position = "absolute";
      workbench.style.top = "0";
      workbench.style.left = "0";
      workbench.style.width = "100%";
      workbench.style.height = "100%";
    }

    parent?.append(workbench);
    if (!this.hasAttribute("id")) {
      this.setAttribute("id", "root-timegroup");
    }

    // Create pan-zoom for selection overlay support
    // Must be in light DOM so canvas can find it via closest()
    const panZoom = document.createElement("ef-pan-zoom");
    panZoom.id = "workbench-panzoom";
    panZoom.setAttribute("slot", "canvas");
    panZoom.setAttribute("auto-fit", ""); // Fit content to view on first render
    panZoom.style.width = "100%";
    panZoom.style.height = "100%";

    // Create canvas wrapper for selection/highlighting support
    // Get dimensions from the timegroup for explicit canvas sizing
    const rect = this.getBoundingClientRect();
    const canvas = document.createElement("ef-canvas");
    canvas.id = "workbench-canvas";
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.style.display = "block";

    // Move timegroup into canvas, canvas into pan-zoom
    canvas.append(this as unknown as Element);
    panZoom.append(canvas);
    workbench.append(panZoom);

    // Add hierarchy panel - targets canvas for selection support
    const hierarchy = document.createElement("ef-hierarchy");
    hierarchy.setAttribute("slot", "hierarchy");
    hierarchy.setAttribute("target", "workbench-canvas");
    hierarchy.setAttribute("header", "Scenes");
    workbench.append(hierarchy);

    // Add filmstrip/timeline - targets timegroup for playback
    const filmstrip = document.createElement("ef-filmstrip");
    filmstrip.setAttribute("slot", "timeline");
    filmstrip.setAttribute("target", this.id);
    workbench.append(filmstrip);
  }

  /**
   * Returns media elements for playback audio rendering
   * For standalone media, returns [this]; for timegroups, returns all descendants
   * Used by PlaybackController for audio-driven playback
   * @internal
   */
  getMediaElements(): EFMedia[] {
    return deepGetMediaElements(this);
  }

  /**
   * Render audio buffer for playback
   * Called by PlaybackController during live playback
   * Delegates to shared renderTemporalAudio utility for consistent behavior
   * @internal
   */
  async renderAudio(fromMs: number, toMs: number, signal?: AbortSignal): Promise<AudioBuffer> {
    return renderTemporalAudio(this, fromMs, toMs, signal);
  }

  async #executeCustomFrameTasks() {
    if (this.#customFrameTasks.size > 0) {
      const percentComplete = this.durationMs > 0 ? this.ownCurrentTimeMs / this.durationMs : 0;
      const frameInfo = {
        ownCurrentTimeMs: this.ownCurrentTimeMs,
        currentTimeMs: this.currentTimeMs,
        durationMs: this.durationMs,
        percentComplete,
        element: this,
      };

      await Promise.all(
        Array.from(this.#customFrameTasks).map((callback) => Promise.resolve(callback(frameInfo))),
      );
    }
  }

  /** @internal */
  #seekTaskPromise: Promise<number | undefined> = Promise.resolve(undefined);
  #seekTaskAbortController: AbortController | null = null;

  seekTask = (() => {
    const taskObj: {
      run(): void | Promise<number | undefined>;
      taskComplete: Promise<number | undefined>;
    } = {
      run: () => {
        // Abort any in-flight task
        this.#seekTaskAbortController?.abort();
        this.#seekTaskAbortController = new AbortController();
        const signal = this.#seekTaskAbortController.signal;

        const targetTime = this.#pendingSeekTime ?? this.#currentTime;
        this.#seekTaskPromise = this.#runSeekTask(targetTime, signal);
        taskObj.taskComplete = this.#seekTaskPromise;
        return this.#seekTaskPromise;
      },
      taskComplete: Promise.resolve(undefined),
    };
    return taskObj;
  })();

  async #runSeekTask(
    targetTime: number | undefined,
    signal: AbortSignal,
  ): Promise<number | undefined> {
    try {
      signal.throwIfAborted();

      // Delegate to playbackController if available
      if (this.playbackController) {
        // Wait for playbackController's seek to complete
        await this.playbackController.currentTime; // Trigger seek
        signal.throwIfAborted();
        return this.currentTime;
      }

      // Only root timegroups execute seek tasks
      if (!this.isRootTimegroup) {
        return undefined;
      }

      return await withSpan(
        "timegroup.seekTask",
        {
          timegroupId: this.id || "unknown",
          targetTime: targetTime ?? 0,
          durationMs: this.durationMs,
        },
        undefined,
        async (span) => {
          // Wait for media durations to be loaded
          try {
            await Promise.race([
              this.waitForMediaDurations(signal),
              new Promise<void>((_, reject) => {
                if (signal.aborted) {
                  reject(new DOMException("Aborted", "AbortError"));
                  return;
                }
                const timeoutId = setTimeout(
                  () => reject(new Error("waitForMediaDurations timeout")),
                  10000,
                );
                signal.addEventListener(
                  "abort",
                  () => {
                    clearTimeout(timeoutId);
                    reject(new DOMException("Aborted", "AbortError"));
                  },
                  { once: true },
                );
              }),
            ]);
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              throw error;
            }
            // Continue with seek even if durations aren't loaded yet
          }

          signal.throwIfAborted();

          // Evaluate and apply seek target
          const newTime = evaluateSeekTarget(targetTime ?? 0, this.durationMs, this.effectiveFps);
          if (isTracingEnabled()) {
            span.setAttribute("newTime", newTime);
          }

          this.#currentTime = newTime;
          this._setLocalTimeMs(newTime * 1000);
          this.requestUpdate("currentTime");

          await this.updateComplete;
          signal.throwIfAborted();

          await this.#runThrottledFrameTask();
          signal.throwIfAborted();

          if (!this.#restoringFromLocalStorage) {
            this.saveTimeToLocalStorage(this.#currentTime);
          }
          this.#seekInProgress = false;
          if (this.#restoringFromLocalStorage) {
            this.#restoringFromLocalStorage = false;
          }
          return newTime;
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return undefined;
      }
      console.error("EFTimegroup seekTask error", error);
      return undefined;
    }
  }

  /**
   * Get container information for this timegroup.
   * Timegroups are always containers and can contain children.
   * Display mode is determined from computed styles.
   *
   * @public
   */
  getContainerInfo(): ContainerInfo {
    const info = getContainerInfoFromElement(this);
    // Timegroups are always containers and can contain children
    return {
      ...info,
      isContainer: true,
      canContainChildren: true,
    };
  }

  /**
   * Get position information for this timegroup.
   * Returns computed bounds, transform, and rotation.
   *
   * @public
   */
  getPositionInfo(): ElementPositionInfo | null {
    return getPositionInfoFromElement(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-timegroup": EFTimegroup & Element;
  }
}
