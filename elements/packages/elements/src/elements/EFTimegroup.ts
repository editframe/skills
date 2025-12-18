import { provide } from "@lit/context";
import { Task, TaskStatus } from "@lit/task";
import debug from "debug";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

import { EF_INTERACTIVE } from "../EF_INTERACTIVE.js";
import { EF_RENDERING } from "../EF_RENDERING.js";
import { isContextMixin } from "../gui/ContextMixin.js";
import { efContext } from "../gui/efContext.js";
import { TWMixin } from "../gui/TWMixin.js";
import { isTracingEnabled, withSpan } from "../otel/tracingHelpers.js";
import { deepGetMediaElements, type EFMedia } from "./EFMedia.js";
import {
  deepGetElementsWithFrameTasks,
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
import {
  evaluateAnimationVisibilityState,
  updateAnimations,
} from "./updateAnimations.ts";
import {
  type ContainerInfo,
  getContainerInfoFromElement,
} from "./ContainerInfo.js";
import {
  type ElementPositionInfo,
  getPositionInfoFromElement,
} from "./ElementPositionInfo.js";

declare global {
  var EF_DEV_WORKBENCH: boolean | undefined;
}

const log = debug("ef:elements:EFTimegroup");

// Custom frame task callback type
export type FrameTaskCallback = (info: {
  ownCurrentTimeMs: number;
  currentTimeMs: number;
  durationMs: number;
  percentComplete: number;
  element: EFTimegroup;
}) => void | Promise<void>;

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

// Cache for sequence mode duration calculations to avoid O(n) recalculation
let sequenceDurationCache: WeakMap<EFTimegroup, number> = new WeakMap();

export const flushSequenceDurationCache = () => {
  sequenceDurationCache = new WeakMap();
};

// Track timegroups currently calculating duration to prevent infinite loops
const durationCalculationInProgress = new WeakSet<EFTimegroup>();

// Export function to check if a timegroup is currently calculating duration
// This is used by EFTemporal to prevent calling parent.durationMs during calculation
export const isTimegroupCalculatingDuration = (
  timegroup: EFTimegroup | undefined,
): boolean => {
  return (
    timegroup !== undefined && durationCalculationInProgress.has(timegroup)
  );
};

// Register this function with EFTemporal to break circular dependency
// EFTemporal needs this function but can't import it directly due to circular dependency
import { registerIsTimegroupCalculatingDuration } from "./EFTemporal.js";
registerIsTimegroupCalculatingDuration(isTimegroupCalculatingDuration);

/**
 * Determines if a timegroup has its own duration based on its mode.
 * This is the semantic rule: which modes produce independent durations.
 */
function hasOwnDurationForMode(
  mode: TimeMode,
  hasExplicitDuration: boolean,
): boolean {
  return (
    mode === "contain" ||
    mode === "sequence" ||
    (mode === "fixed" && hasExplicitDuration)
  );
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
  const cachedDuration = sequenceDurationCache.get(timegroup);
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
    if (
      child instanceof EFTimegroup &&
      durationCalculationInProgress.has(child)
    ) {
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
        if (
          ancestor instanceof EFTimegroup &&
          durationCalculationInProgress.has(ancestor)
        ) {
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
  sequenceDurationCache.set(timegroup, duration);
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
  let maxDuration = 0;
  for (const child of childTemporals) {
    if (!shouldParticipateInDurationCalculation(child)) {
      continue;
    }
    // Prevent infinite loops: skip children that are already calculating their duration
    // This check applies to all timegroup children, not just contain mode, because
    // a sequence-mode child could contain a contain-mode grandchild that
    // eventually references back to the parent through the parent chain
    if (
      child instanceof EFTimegroup &&
      durationCalculationInProgress.has(child)
    ) {
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
        if (
          ancestor instanceof EFTimegroup &&
          durationCalculationInProgress.has(ancestor)
        ) {
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
  return Math.max(0, maxDuration);
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
        return evaluateSequenceDuration(
          timegroup,
          childTemporals,
          timegroup.overlapMs,
        );
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

export const shallowGetTimegroups = (
  element: Element,
  groups: EFTimegroup[] = [],
) => {
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
 * Quantizes a time value to the nearest frame boundary based on FPS.
 * This ensures time values align with frame boundaries for consistent rendering.
 *
 * Semantic rule: Time values should snap to frame boundaries when FPS is set.
 */
function quantizeToFrameTime(timeSeconds: number, fps: number): number {
  if (!fps || fps <= 0) return timeSeconds;
  const frameDurationS = 1 / fps;
  return Math.round(timeSeconds / frameDurationS) * frameDurationS;
}

/**
 * Evaluates the target time for a seek operation.
 * Applies quantization and clamping to determine the valid seek target.
 */
function evaluateSeekTarget(
  requestedTime: number,
  durationMs: number,
  fps: number,
): number {
  // Quantize to frame boundaries
  const quantizedTime = quantizeToFrameTime(requestedTime, fps);
  // Clamp to valid range [0, duration]
  return Math.max(0, Math.min(quantizedTime, durationMs / 1000));
}

@customElement("ef-timegroup")
export class EFTimegroup extends EFTargetable(EFTemporal(TWMixin(LitElement))) {
  static get observedAttributes(): string[] {
    // biome-ignore lint/complexity/noThisInStatic: It's okay to use this here
    const parentAttributes = super.observedAttributes || [];
    return [
      ...parentAttributes,
      "mode",
      "overlap",
      "currenttime",
      "fit",
      "fps",
      "auto-init",
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

  /** @public */
  mode: TimeMode = "contain";
  /** @public */
  overlapMs = 0;

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

  attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
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
    super.attributeChangedCallback(name, old, value);
  }

  /** @public */
  @property({ type: String })
  fit: "none" | "contain" | "cover" = "none";

  #resizeObserver?: ResizeObserver;

  #currentTime: number | undefined = undefined;
  #seekInProgress = false;
  #pendingSeekTime: number | undefined;
  #processingPendingSeek = false;
  #customFrameTasks: Set<FrameTaskCallback> = new Set();

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

  async #runThrottledFrameTask(): Promise<void> {
    if (this.playbackController) {
      return this.playbackController.runThrottledFrameTask();
    }
    await this.frameTask.run();
  }

  // ============================================================================
  // Purpose 3: Seeking Implementation
  // ============================================================================

  /** @public */
  @property({ type: Number, attribute: "currenttime" })
  set currentTime(time: number) {
    // Evaluate seek target (quantization and clamping)
    const seekTarget = evaluateSeekTarget(
      time,
      this.durationMs,
      this.effectiveFps,
    );

    // Delegate to playbackController if available
    if (this.playbackController) {
      this.playbackController.currentTime = seekTarget;
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

    // Skip if already at target time (unless processing pending seek)
    if (seekTarget === this.#currentTime && !this.#processingPendingSeek) {
      return;
    }

    // Skip if this is the same as pending seek
    if (this.#pendingSeekTime === seekTarget) {
      return;
    }

    // Handle concurrent seeks by queuing pending seek
    if (this.#seekInProgress) {
      this.#pendingSeekTime = seekTarget;
      this.#currentTime = seekTarget;
      return;
    }

    // Execute seek
    this.#currentTime = seekTarget;
    this.#seekInProgress = true;

    this.seekTask.run().finally(() => {
      // Process pending seek if it differs from completed seek
      if (
        this.#pendingSeekTime !== undefined &&
        this.#pendingSeekTime !== seekTarget
      ) {
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
   * Seek to a specific time and wait for all frames to be ready.
   * This is the recommended way to seek in tests and programmatic control.
   *
   * Combines seeking (Purpose 3) with frame rendering (Purpose 4) to ensure
   * all visible elements are ready after the seek completes.
   *
   * @param timeMs - Time in milliseconds to seek to
   * @returns Promise that resolves when the seek is complete and all visible children are ready
   * @public
   */
  async seek(timeMs: number): Promise<void> {
    // Execute seek (Purpose 3)
    this.currentTimeMs = timeMs;
    await this.seekTask.taskComplete;

    // Handle localStorage when playbackController delegates seek
    if (this.playbackController) {
      this.saveTimeToLocalStorage(this.currentTime);
    }

    // Wait for frame rendering (Purpose 4)
    await this.frameTask.taskComplete;

    // Ensure all visible elements have completed their reactive update cycles AND frame rendering
    // waitForFrameTasks() calls frameTask.run() on children, but this may happen before child
    // elements have processed property changes from requestUpdate(). To ensure frame data is
    // accurate, we wait for updateComplete first, then ensure the frameTask has run with the
    // updated properties. Elements like EFVideo provide waitForFrameReady() for this pattern.
    const visibleElements = this.#evaluateVisibleElementsForFrame();

    await Promise.all(
      visibleElements.map(async (element) => {
        if (
          "waitForFrameReady" in element &&
          typeof element.waitForFrameReady === "function"
        ) {
          await (element as any).waitForFrameReady();
        } else {
          await element.updateComplete;
        }
      }),
    );
  }

  /**
   * Determines if this is a root timegroup (no parent timegroups)
   * @public
   */
  get isRootTimegroup(): boolean {
    return !this.parentTimegroup;
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
    // Invalidate caches when slot content changes
    resetTemporalCache();
    flushSequenceDurationCache();
    flushStartTimeMsCache();

    // Request update to trigger recalculation of dependent properties
    this.requestUpdate();
  };

  /** @internal */
  loadTimeFromLocalStorage(): number | undefined {
    if (this.id) {
      try {
        const storedValue = localStorage.getItem(this.storageKey);
        if (storedValue === null) {
          return undefined;
        }
        return Number.parseFloat(storedValue);
      } catch (error) {
        log("Failed to load time from localStorage", error);
      }
    }
    return undefined;
  }

  connectedCallback() {
    super.connectedCallback();

    if (!this.playbackController) {
      this.waitForMediaDurations().then(async () => {
        let didLoadFromStorage = false;
        if (this.id) {
          const maybeLoadedTime = this.loadTimeFromLocalStorage();
          if (maybeLoadedTime !== undefined) {
            this.currentTime = maybeLoadedTime;
            didLoadFromStorage = true;
          }
        }

        // Auto-init: seek to frame 0 for root timegroups if enabled and not loaded from storage
        if (
          this.autoInit &&
          this.isRootTimegroup &&
          !didLoadFromStorage &&
          EF_INTERACTIVE
        ) {
          await this.seek(0);
        } else if (EF_INTERACTIVE && this.seekTask.status === TaskStatus.INITIAL) {
          this.seekTask.run();
        } else if (didLoadFromStorage) {
          await this.seekTask.run();
        }
      });
    }

    if (this.parentTimegroup) {
      new TimegroupController(this.parentTimegroup, this);
    }

    if (this.shouldWrapWithWorkbench()) {
      this.wrapWithWorkbench();
    }
  }

  #previousDurationMs = 0;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("mode") || changedProperties.has("overlapMs")) {
      sequenceDurationCache.delete(this);
    }

    if (this.#previousDurationMs !== this.durationMs) {
      this.#previousDurationMs = this.durationMs;
      this.#runThrottledFrameTask();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resizeObserver?.disconnect();
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

  /**
   * Evaluates which elements should be rendered in the current frame.
   * Filters to only include temporally visible elements for frame processing.
   * Uses animation-friendly visibility to prevent animation jumps at exact boundaries.
   */
  #evaluateVisibleElementsForFrame(): Array<
    TemporalMixinInterface & HTMLElement
  > {
    const temporalElements = deepGetElementsWithFrameTasks(this);
    return temporalElements.filter((element) => {
      const animationState = evaluateAnimationVisibilityState(element);
      return animationState.isVisible;
    });
  }

  /** @internal */
  async waitForFrameTasks() {
    const result = await withSpan(
      "timegroup.waitForFrameTasks",
      {
        timegroupId: this.id || "unknown",
        mode: this.mode,
      },
      undefined,
      async (span) => {
        const innerStart = performance.now();

        const temporalElements = deepGetElementsWithFrameTasks(this);
        if (isTracingEnabled()) {
          span.setAttribute("temporalElementsCount", temporalElements.length);
        }

        // Evaluate which elements should be rendered
        const visibleElements = this.#evaluateVisibleElementsForFrame();
        if (isTracingEnabled()) {
          span.setAttribute("visibleElementsCount", visibleElements.length);
        }

        const promiseStart = performance.now();

        // Execute frame tasks for all visible elements
        // CRITICAL: Must wait for updateComplete before running frameTask so that
        // property changes (like desiredSeekTimeMs) have propagated to the element.
        // Elements with waitForFrameReady() handle this; others need explicit waiting.
        await Promise.all(
          visibleElements.map(async (element) => {
            if (
              "waitForFrameReady" in element &&
              typeof element.waitForFrameReady === "function"
            ) {
              await (element as any).waitForFrameReady();
            } else {
              await element.updateComplete;
              await element.frameTask.run();
            }
          }),
        );
        const promiseEnd = performance.now();

        const innerEnd = performance.now();
        if (isTracingEnabled()) {
          span.setAttribute("actualInnerMs", innerEnd - innerStart);
          span.setAttribute("promiseAwaitMs", promiseEnd - promiseStart);
        }
      },
    );

    return result;
  }

  #mediaDurationsPromise: Promise<void> | undefined = undefined;

  /** @internal */
  async waitForMediaDurations() {
    if (!this.#mediaDurationsPromise) {
      this.#mediaDurationsPromise = this.#waitForMediaDurations();
    }
    return this.#mediaDurationsPromise;
  }

  /**
   * Wait for all media elements to load their initial segments.
   * Ideally we would only need the extracted index json data, but
   * that caused issues with constructing audio data. We had negative durations
   * in calculations and it was not clear why.
   */
  async #waitForMediaDurations() {
    return withSpan(
      "timegroup.waitForMediaDurations",
      {
        timegroupId: this.id || "unknown",
        mode: this.mode,
      },
      undefined,
      async (span) => {
        // We must await updateComplete to ensure all media elements inside this are connected
        // and will match deepGetMediaElements
        await this.updateComplete;
        const mediaElements = deepGetMediaElements(this);
        if (isTracingEnabled()) {
          span.setAttribute("mediaElementsCount", mediaElements.length);
        }

        // Then, we must await the fragmentIndexTask to ensure all media elements have their
        // fragment index loaded, which is where their duration is parsed from.
        await Promise.all(
          mediaElements.map((m) =>
            m.mediaEngineTask.value
              ? Promise.resolve()
              : m.mediaEngineTask.run(),
          ),
        );

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
        this.requestUpdate("currentTime");
        // Finally, we must await updateComplete to ensure all temporal elements have their
        // currentTime updated and all animations have run.

        await this.updateComplete;
      },
    );
  }

  /** @internal */
  get childTemporals() {
    return shallowGetTemporalElements(this);
  }

  get #contextProvider() {
    let parent = this.parentNode;
    while (parent) {
      if (isContextMixin(parent)) {
        return parent;
      }
      parent = parent.parentNode;
    }
    return null;
  }

  /**
   * Returns true if the timegroup should be wrapped with a workbench.
   *
   * A timegroup should be wrapped with a workbench if:
   * - It's being rendered (EF_RENDERING), OR
   * - It's in interactive mode (EF_INTERACTIVE) with the dev workbench flag set
   *
   * If the timegroup is already wrapped in a context provider like ef-preview,
   * it should NOT be wrapped in a workbench.
   * @internal
   */
  shouldWrapWithWorkbench() {
    const isRendering = EF_RENDERING?.() === true;

    // Never wrap with workbench when inside a canvas
    // Canvas manages its own layout and coordinate system
    if (this.closest("ef-canvas") !== null) {
      return false;
    }

    // During rendering, always wrap with workbench (needed by EF_FRAMEGEN)
    if (isRendering) {
      return (
        this.closest("ef-timegroup") === this &&
        this.closest("ef-preview") === null &&
        this.closest("ef-workbench") === null &&
        this.closest("test-context") === null
      );
    }

    // During interactive mode, respect the dev workbench flag
    if (!globalThis.EF_DEV_WORKBENCH) {
      return false;
    }

    return (
      EF_INTERACTIVE &&
      this.closest("ef-timegroup") === this &&
      this.closest("ef-preview") === null &&
      this.closest("ef-workbench") === null &&
      this.closest("test-context") === null
    );
  }

  /** @internal */
  wrapWithWorkbench() {
    const workbench = document.createElement("ef-workbench");
    this.parentElement?.append(workbench);
    if (!this.hasAttribute("id")) {
      this.setAttribute("id", "root-this");
    }
    this.setAttribute("slot", "canvas");
    workbench.append(this as unknown as Element);

    const filmstrip = document.createElement("ef-filmstrip");
    filmstrip.setAttribute("slot", "timeline");
    filmstrip.setAttribute("target", this.id);
    workbench.append(filmstrip);
  }

  get #efElements() {
    return Array.from(
      this.querySelectorAll(
        "ef-audio, ef-video, ef-image, ef-captions, ef-waveform",
      ),
    );
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
  async renderAudio(fromMs: number, toMs: number): Promise<AudioBuffer> {
    return renderTemporalAudio(this, fromMs, toMs);
  }

  /**
   * TEMPORARY TEST METHOD: Renders audio and immediately plays it back
   * Usage: timegroup.testPlayAudio(0, 5000) // Play first 5 seconds
   */
  async #testPlayAudio(fromMs: number, toMs: number) {
    // Render the audio using the existing renderAudio method
    const renderedBuffer = await this.renderAudio(fromMs, toMs);

    // Create a regular AudioContext for playback
    const playbackContext = new AudioContext();

    // Create a buffer source and connect it
    const bufferSource = playbackContext.createBufferSource();
    bufferSource.buffer = renderedBuffer;
    bufferSource.connect(playbackContext.destination);

    // Start playback immediately
    bufferSource.start(0);

    // Return a promise that resolves when playback ends
    return new Promise<void>((resolve) => {
      bufferSource.onended = () => {
        playbackContext.close();
        resolve();
      };
    });
  }

  async #loadMd5Sums() {
    const efElements = this.#efElements;
    const loaderTasks: Promise<any>[] = [];
    for (const el of efElements) {
      const md5SumLoader = (el as any).md5SumLoader;
      if (md5SumLoader instanceof Task) {
        md5SumLoader.run();
        loaderTasks.push(md5SumLoader.taskComplete);
      }
    }

    await Promise.all(loaderTasks);

    efElements.forEach((el) => {
      if ("productionSrc" in el && el.productionSrc instanceof Function) {
        el.setAttribute("src", el.productionSrc());
      }
    });
  }

  /** @internal */
  frameTask = new Task(this, {
    // autoRun: EF_INTERACTIVE,
    autoRun: false,
    args: () => [this.ownCurrentTimeMs, this.currentTimeMs] as const,
    task: async ([ownCurrentTimeMs, currentTimeMs]) => {
      if (this.isRootTimegroup) {
        // Root timegroup orchestrates frame rendering for entire tree
        await withSpan(
          "timegroup.frameTask",
          {
            timegroupId: this.id || "unknown",
            ownCurrentTimeMs,
            currentTimeMs,
          },
          undefined,
          async () => {
            // Wait for all child frame tasks to complete (Purpose 4)
            await this.waitForFrameTasks();
            // Execute custom frame tasks registered on this timegroup
            await this.#executeCustomFrameTasks();
            // Update animations based on current time
            updateAnimations(this);
          },
        );
      } else {
        // Non-root timegroups execute their custom frame tasks when called
        await this.#executeCustomFrameTasks();
      }
    },
  });

  async #executeCustomFrameTasks() {
    if (this.#customFrameTasks.size > 0) {
      const percentComplete =
        this.durationMs > 0 ? this.ownCurrentTimeMs / this.durationMs : 0;
      const frameInfo = {
        ownCurrentTimeMs: this.ownCurrentTimeMs,
        currentTimeMs: this.currentTimeMs,
        durationMs: this.durationMs,
        percentComplete,
        element: this,
      };

      await Promise.all(
        Array.from(this.#customFrameTasks).map((callback) =>
          Promise.resolve(callback(frameInfo)),
        ),
      );
    }
  }

  /** @internal */
  seekTask = new Task(this, {
    autoRun: false,
    args: () => [this.#pendingSeekTime ?? this.#currentTime] as const,
    onComplete: () => {},
    task: async ([targetTime]) => {
      // Delegate to playbackController if available
      if (this.playbackController) {
        await this.playbackController.seekTask.taskComplete;
        return this.currentTime;
      }

      // Only root timegroups execute seek tasks
      if (!this.isRootTimegroup) {
        return;
      }

      return withSpan(
        "timegroup.seekTask",
        {
          timegroupId: this.id || "unknown",
          targetTime: targetTime ?? 0,
          durationMs: this.durationMs,
        },
        undefined,
        async (span) => {
          // Wait for media durations to be loaded (needed for accurate duration calculations)
          await this.waitForMediaDurations();

          // Evaluate and apply seek target
          const newTime = evaluateSeekTarget(
            targetTime ?? 0,
            this.durationMs,
            this.effectiveFps,
          );
          if (isTracingEnabled()) {
            span.setAttribute("newTime", newTime);
          }

          // Apply the seek target (triggers time propagation to children)
          this.#currentTime = newTime;
          this.requestUpdate("currentTime");
          
          // CRITICAL: Wait for update cycle to complete so children have updated desiredSeekTimeMs
          // before we run their frame tasks. Without this, children would use stale values.
          await this.updateComplete;

          // Trigger frame rendering for the new time position
          await this.#runThrottledFrameTask();

          // Save to localStorage for persistence
          this.saveTimeToLocalStorage(this.#currentTime);
          this.#seekInProgress = false;
          return newTime;
        },
      );
    },
  });

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
