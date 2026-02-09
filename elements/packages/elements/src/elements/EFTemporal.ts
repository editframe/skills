import { consume, createContext } from "@lit/context";
import type { LitElement, ReactiveController } from "lit";
import { property, state } from "lit/decorators.js";
import { PlaybackController } from "../gui/PlaybackController.js";
import { durationConverter } from "./durationConverter.js";
import type { EFTimegroup } from "./EFTimegroup.js";
// Lazy import to break circular dependency: EFTemporal -> EFTimegroup -> EFMedia -> EFTemporal
// isTimegroupCalculatingDuration is only used at runtime in a getter, so we can import it lazily
// Use a module-level variable that gets set when EFTimegroup module loads
let isTimegroupCalculatingDurationFn:
  | ((timegroup: EFTimegroup | undefined) => boolean)
  | null = null;

// This function will be called by EFTimegroup when it loads to register the function
export const registerIsTimegroupCalculatingDuration = (
  fn: (timegroup: EFTimegroup | undefined) => boolean,
) => {
  isTimegroupCalculatingDurationFn = fn;
};

const getIsTimegroupCalculatingDuration = (): ((
  timegroup: EFTimegroup | undefined,
) => boolean) => {
  if (isTimegroupCalculatingDurationFn) {
    return isTimegroupCalculatingDurationFn as (
      timegroup: EFTimegroup | undefined,
    ) => boolean;
  }

  // If not registered yet, try to import synchronously (only works if module is already loaded)
  // This is a fallback for cases where EFTimegroup hasn't called registerIsTimegroupCalculatingDuration
  // In practice, EFTimegroup will call registerIsTimegroupCalculatingDuration when it loads
  let fallbackFn: (timegroup: EFTimegroup | undefined) => boolean = () => false;
  try {
    // Access the function via a global or try to get it from the module cache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const efTimegroupModule = (globalThis as any).__EFTimegroupModule;
    if (efTimegroupModule?.isTimegroupCalculatingDuration) {
      fallbackFn = efTimegroupModule.isTimegroupCalculatingDuration;
    }
  } catch {
    // Use default fallback
  }
  isTimegroupCalculatingDurationFn = fallbackFn;
  return fallbackFn;
};

export const timegroupContext = createContext<EFTimegroup>(
  Symbol("timeGroupContext"),
);

// ============================================================================
// Core Concept 1: Temporal Role
// ============================================================================
// A temporal element is either a root (controls its own playback) or a child
// (delegates playback to its root timegroup). This is the fundamental invariant.
// ============================================================================

type TemporalRole = "root" | "child";

function determineTemporalRole(
  parentTimegroup: EFTimegroup | undefined,
): TemporalRole {
  return parentTimegroup === undefined ? "root" : "child";
}

// ============================================================================
// Core Concept 2: Duration Source
// ============================================================================
// Duration comes from one of three sources: intrinsic (media-based),
// explicit (attribute), or inherited (from parent). This determines the base
// duration before any modifications.
// ============================================================================

type DurationSource = "intrinsic" | "explicit" | "inherited";

interface DurationSourceResult {
  source: DurationSource;
  baseDurationMs: number;
}

function determineDurationSource(
  intrinsicDurationMs: number | undefined,
  explicitDurationMs: number | undefined,
  parentDurationMs: number | undefined,
): DurationSourceResult {
  if (intrinsicDurationMs !== undefined) {
    return { source: "intrinsic", baseDurationMs: intrinsicDurationMs };
  }
  if (explicitDurationMs !== undefined) {
    return { source: "explicit", baseDurationMs: explicitDurationMs };
  }
  if (parentDurationMs !== undefined) {
    return { source: "inherited", baseDurationMs: parentDurationMs };
  }
  return { source: "inherited", baseDurationMs: 0 };
}

// ============================================================================
// Core Concept 3: Duration Modification Strategy
// ============================================================================
// Duration can be modified by trimming (removing from edges) or source
// manipulation (selecting a portion of the source). These are mutually
// exclusive strategies.
// ============================================================================

type DurationModificationStrategy = "none" | "trimming" | "source-manipulation";

interface DurationModificationState {
  strategy: DurationModificationStrategy;
  trimStartMs: number | undefined;
  trimEndMs: number | undefined;
  sourceInMs: number | undefined;
  sourceOutMs: number | undefined;
}

function determineDurationModificationStrategy(
  trimStartMs: number | undefined,
  trimEndMs: number | undefined,
  sourceInMs: number | undefined,
  sourceOutMs: number | undefined,
): DurationModificationState {
  if (trimStartMs !== undefined || trimEndMs !== undefined) {
    return {
      strategy: "trimming",
      trimStartMs,
      trimEndMs,
      sourceInMs: undefined,
      sourceOutMs: undefined,
    };
  }
  if (sourceInMs !== undefined || sourceOutMs !== undefined) {
    return {
      strategy: "source-manipulation",
      trimStartMs: undefined,
      trimEndMs: undefined,
      sourceInMs,
      sourceOutMs,
    };
  }
  return {
    strategy: "none",
    trimStartMs: undefined,
    trimEndMs: undefined,
    sourceInMs: undefined,
    sourceOutMs: undefined,
  };
}

function evaluateModifiedDuration(
  baseDurationMs: number,
  modification: DurationModificationState,
): number {
  if (baseDurationMs === 0) {
    return 0;
  }

  switch (modification.strategy) {
    case "trimming": {
      const trimmedDurationMs =
        baseDurationMs -
        (modification.trimStartMs ?? 0) -
        (modification.trimEndMs ?? 0);
      return Math.max(0, trimmedDurationMs);
    }
    case "source-manipulation": {
      const sourceInMs = modification.sourceInMs ?? 0;
      const sourceOutMs = modification.sourceOutMs ?? baseDurationMs;
      if (sourceInMs >= sourceOutMs) {
        return 0;
      }
      return sourceOutMs - sourceInMs;
    }
    case "none":
      return baseDurationMs;
  }
}

// ============================================================================
// Core Concept 4: Start Time Calculation Strategy
// ============================================================================
// Start time is calculated differently based on parent timegroup mode:
// - Sequence mode: based on previous sibling
// - Other modes: based on parent start + offset
// ============================================================================

type StartTimeStrategy = "sequence" | "offset";

function determineStartTimeStrategy(
  parentTimegroup: EFTimegroup | undefined,
): StartTimeStrategy {
  if (!parentTimegroup) {
    return "offset";
  }
  return parentTimegroup.mode === "sequence" ? "sequence" : "offset";
}

function evaluateStartTimeForSequence(
  _element: TemporalMixinInterface & HTMLElement,
  parentTimegroup: EFTimegroup,
  siblingTemporals: TemporalMixinInterface[],
  ownIndex: number,
): number {
  if (ownIndex === 0) {
    return parentTimegroup.startTimeMs;
  }
  const previous = siblingTemporals[ownIndex - 1];
  if (!previous) {
    throw new Error("Previous temporal element not found");
  }
  return previous.startTimeMs + previous.durationMs - parentTimegroup.overlapMs;
}

function evaluateStartTimeForOffset(
  parentTimegroup: EFTimegroup,
  offsetMs: number,
): number {
  return parentTimegroup.startTimeMs + offsetMs;
}

function evaluateStartTime(
  element: TemporalMixinInterface & HTMLElement,
  parentTimegroup: EFTimegroup | undefined,
  offsetMs: number,
  getSiblingTemporals: (parent: EFTimegroup) => TemporalMixinInterface[],
): number {
  if (!parentTimegroup) {
    return 0;
  }

  const strategy = determineStartTimeStrategy(parentTimegroup);
  switch (strategy) {
    case "sequence": {
      const siblingTemporals = getSiblingTemporals(parentTimegroup);
      const ownIndex = siblingTemporals.indexOf(element);
      if (ownIndex === -1) {
        return 0;
      }
      return evaluateStartTimeForSequence(
        element,
        parentTimegroup,
        siblingTemporals,
        ownIndex,
      );
    }
    case "offset":
      return evaluateStartTimeForOffset(parentTimegroup, offsetMs);
  }
}

// ============================================================================
// Core Concept 5: Current Time Source
// ============================================================================
// Current time comes from one of three sources: playback controller (root
// elements), root timegroup (child elements), or local storage (fallback).
// ============================================================================

type CurrentTimeSource = "playback-controller" | "root-timegroup" | "local";

interface CurrentTimeSourceResult {
  source: CurrentTimeSource;
  timeMs: number;
}

function determineCurrentTimeSource(
  playbackController: PlaybackController | undefined,
  rootTimegroup: EFTimegroup | undefined,
  isRootTimegroup: boolean,
  localTimeMs: number,
  startTimeMs: number,
  durationMs: number,
): CurrentTimeSourceResult {
  if (playbackController) {
    const timeMs = Math.min(
      Math.max(0, playbackController.currentTimeMs),
      durationMs,
    );
    return { source: "playback-controller", timeMs };
  }

  if (rootTimegroup && !isRootTimegroup) {
    const timeMs = Math.min(
      Math.max(0, rootTimegroup.currentTimeMs - startTimeMs),
      durationMs,
    );
    return { source: "root-timegroup", timeMs };
  }

  const timeMs = Math.min(Math.max(0, localTimeMs), durationMs);
  return { source: "local", timeMs };
}

export declare class TemporalMixinInterface {
  playbackController?: PlaybackController;
  playing: boolean;
  loop: boolean;
  play(): void;
  pause(): void;

  get hasOwnDuration(): boolean;
  /**
   * Whether the element has a duration set as an attribute.
   */
  get hasExplicitDuration(): boolean;

  get sourceStartMs(): number;

  /**
   * Used to trim the start of the media.
   *
   * This can be set in either seconds or milliseconds.
   *
   * For example, `trimstart="10s"` is equivalent to `trimstart="10000ms"`.
   *
   * @domAttribute "trimstart"
   */
  get trimStartMs(): number | undefined;

  /**
   * Used to trim the end of the media.
   *
   * This can be set in either seconds or milliseconds.
   *
   * For example, `trimend="10s"` is equivalent to `trimend="10000ms"`.
   *
   * @domAttribute "trimend"
   */
  get trimEndMs(): number;

  set trimStartMs(value: number | undefined);
  set trimEndMs(value: number | undefined);
  set trimstart(value: string | undefined);
  set trimend(value: string | undefined);

  /**
   * The source in time of the element.
   *
   * This is an amount of time to trim off the beginning of the media.
   *
   * This can be set in either seconds or milliseconds.
   *
   * For example, `sourcein="10s"` is equivalent to `sourcein="10000ms"`.
   *
   * If the sourcein time is greater than the duration of the media, the media
   * will not be played.
   *
   * If the media is 20 seconds long, and the `sourcein` value is set to `10s`, the
   * media will play for 10 seconds, starting at the 10 second mark.
   *
   * Can be used in conjunction with `sourceout` to create a trimmed media.
   *
   * @domAttribute "sourcein"
   */
  get sourceInMs(): number | undefined;

  /**
   * The source out time of the element.
   *
   * This is the point in time in the media that will be treated as the end of
   * the media.
   *
   * This can be set in either seconds or milliseconds.
   *
   * For example, `sourceout="10s"` is equivalent to `sourceout="10000ms"`.
   *
   * If the sourceout time is greater than the duration of the media, the media
   * will play until the end of the media.
   *
   * If the media is 20 seconds long, and the `sourceout` value is set to `10s`,
   * the media will play for 10 seconds, starting at zero seconds and ending at
   * the 10 second mark.
   *
   * Can be used in conjunction with `sourcein` to create a trimmed media.
   *
   * @domAttribute "sourceout"
   */
  get sourceOutMs(): number | undefined;

  set sourceInMs(value: number | undefined);
  set sourceOutMs(value: number | undefined);
  set sourcein(value: string | undefined);
  set sourceout(value: string | undefined);

  /**
   * @domAttribute "duration"
   */
  get durationMs(): number;

  get explicitDurationMs(): number | undefined;

  get intrinsicDurationMs(): number | undefined;

  /**
   * The start time of the element within its root timegroup in milliseconds.
   *
   * This is an absolute time according to the highest scoped timegroup the media element is contained within.
   *
   * The calculated value will depend on the mode of the timegroup and the offset of the media element.
   *
   * If the parent time group is in `sequence` mode, the start time will be the
   * start time of the previous sibling element plus the previous sibling's duration
   * minus the overlap of the previous sibling and the current sibling.
   *
   * If the parent time group is in `contain` or `fixed` mode, the start time will be
   * the start time of the parent time group plus the offset of the media element.
   */
  get startTimeMs(): number;
  /**
   * The end time of the element within its root timegroup in milliseconds.
   *
   * This is an absolute time according to the highest scoped timegroup the media
   * element is contained within. Computed by adding the media's duration to its
   * start time.
   *
   * If the media element has been trimmed, its end time will be calculated according it
   * its trimmed duration, not its original duration.
   */
  get endTimeMs(): number;
  /**
   * The start time of the element within its parent timegroup in milliseconds.
   *
   * This is a relative time according to the closest timegroup the media element
   * is contained within. Unless the media element has been given any kind of specific offset
   * it is common for this time to be zero.
   */
  get startTimeWithinParentMs(): number;

  /**
   * The current time of the element in milliseconds.
   *
   * This is a relative time according to the closest timegroup the media element
   * is contained within.
   *
   * This is suitable for determining the percentage of the media that has been
   * played.
   */
  get ownCurrentTimeMs(): number;

  /**
   * Set the base local time (ms) used by ownCurrentTimeMs when no playback
   * controller is present. Used by seekForRender() on render clones.
   * @internal
   */
  _setLocalTimeMs(value: number): void;

  /**
   * Element's current time for progress calculation.
   * For timegroups: their timeline currentTimeMs
   * For other temporal elements: their ownCurrentTimeMs
   */
  get currentTimeMs(): number;
  set currentTimeMs(value: number);
  /**
   * The current time of the element in milliseconds, adjusted for trimming.
   *
   * This is suitable for mapping to internal media time codes for audio/video
   * elements.
   *
   * For example, if the media has a `sourcein` value of 10s, when `ownCurrentTimeMs` is 0s,
   * `currentSourceTimeMs` will be 10s.
   *
   *            sourcein=10s     sourceout=10s
   * /         /                /
   * |--------|=================|---------|
   *          ^
   *          |_
   *            currentSourceTimeMs === 10s
   *          |_
   *            ownCurrentTimeMs === 0s
   */
  get currentSourceTimeMs(): number;

  set duration(value: string);
  get duration(): string;

  /**
   * The offset of the element within its parent timegroup in milliseconds.
   *
   * This can be set in either seconds or milliseconds.
   *
   * For example, `offset="10s"` is equivalent to `offset="10000ms"`.
   *
   * This can be used to create a negative or positive offset for the start time of the media.
   *
   * This will change the start time of the media relative to it's otherwise normal start time.
   *
   * The duration of the element, or it's parent, or the start and end time of it's temporal siblings will not
   * be affected by this offset.
   *
   * @domAttribute "offset"
   */
  set offset(value: string);
  get offset(): string;

  /**
   * A convenience property for getting the nearest containing timegroup of the media element.
   */
  parentTimegroup?: EFTimegroup;

  /**
   * A convenience property for getting the root timegroup of the media element.
   */
  rootTimegroup?: EFTimegroup;

  didBecomeRoot(): void;
  didBecomeChild(): void;

  updateComplete: Promise<boolean>;
}

export const isEFTemporal = (obj: any): obj is TemporalMixinInterface =>
  obj[EF_TEMPORAL];

const EF_TEMPORAL = Symbol("EF_TEMPORAL");

export const deepGetTemporalElements = (
  element: Element,
  temporals: Array<TemporalMixinInterface & HTMLElement> = [],
) => {
  // Get children to walk - handle both regular children and slotted content
  const children = getChildrenIncludingSlotted(element);
  
  for (const child of children) {
    if (isEFTemporal(child)) {
      temporals.push(child as TemporalMixinInterface & HTMLElement);
    }
    deepGetTemporalElements(child, temporals);
  }
  return temporals;
};

/**
 * Gets all child elements including slotted content for shadow DOM elements.
 * For elements with shadow DOM that contain slots, this returns the assigned
 * elements (slotted content) instead of just the shadow DOM children.
 */
const getChildrenIncludingSlotted = (element: Element): Element[] => {
  // If element has shadowRoot with slots, get assigned elements
  if (element.shadowRoot) {
    const slots = element.shadowRoot.querySelectorAll('slot');
    if (slots.length > 0) {
      const assignedElements: Element[] = [];
      for (const slot of slots) {
        assignedElements.push(...slot.assignedElements());
      }
      // Also include shadow DOM children that aren't slots (for mixed content)
      for (const child of element.shadowRoot.children) {
        if (child.tagName !== 'SLOT') {
          assignedElements.push(child);
        }
      }
      return assignedElements;
    }
  }
  
  // Fallback to regular children
  return Array.from(element.children);
};


let temporalCache: Map<Element, TemporalMixinInterface[]>;
let temporalCacheResetScheduled = false;
export const resetTemporalCache = () => {
  temporalCache = new Map();
  if (
    typeof requestAnimationFrame !== "undefined" &&
    !temporalCacheResetScheduled
  ) {
    temporalCacheResetScheduled = true;
    requestAnimationFrame(() => {
      temporalCacheResetScheduled = false;
      resetTemporalCache();
    });
  }
};
resetTemporalCache();

export const shallowGetTemporalElements = (
  element: Element,
  temporals: TemporalMixinInterface[] = [],
) => {
  const cachedResult = temporalCache.get(element);
  if (cachedResult) {
    return cachedResult;
  }
  // Get children to walk - handle both regular children and slotted content
  const children = getChildrenIncludingSlotted(element);
  
  for (const child of children) {
    if (isEFTemporal(child)) {
      temporals.push(child);
    } else {
      shallowGetTemporalElements(child, temporals);
    }
  }
  temporalCache.set(element, temporals);
  return temporals;
};

export class OwnCurrentTimeController implements ReactiveController {
  #lastKnownTimeMs: number | undefined = undefined;
  
  constructor(
    private host: EFTimegroup,
    private temporal: TemporalMixinInterface & LitElement,
  ) {
    host.addController(this);
  }

  hostUpdated() {
    // CRITICAL FIX: Only trigger child updates when root's currentTimeMs actually changes.
    // Previously, this fired on EVERY root update, causing 40+ child updates per root update.
    // With nested timegroups, this created cascading updates that locked up the main thread.
    const currentTimeMs = this.host.currentTimeMs;
    if (this.#lastKnownTimeMs === currentTimeMs) {
      return; // Time hasn't changed, no need to update children
    }
    this.#lastKnownTimeMs = currentTimeMs;
    
    // Defer update via queueMicrotask to avoid Lit warning about scheduling
    // updates during hostUpdated. Unlike setTimeout(0) this fires as a microtask,
    // so it resolves between await points without yielding a full macrotask turn
    // (eliminating 4-16ms dead time per frame in the render pipeline).
    queueMicrotask(() => {
      this.temporal.requestUpdate("ownCurrentTimeMs");
    });
  }

  remove() {
    this.host.removeController(this);
  }
}

type Constructor<T = {}> = new (...args: any[]) => T;

let startTimeMsCache = new WeakMap<Element, number>();
let startTimeMsCacheResetScheduled = false;
const resetStartTimeMsCache = () => {
  startTimeMsCache = new WeakMap();
  if (
    typeof requestAnimationFrame !== "undefined" &&
    !startTimeMsCacheResetScheduled
  ) {
    startTimeMsCacheResetScheduled = true;
    requestAnimationFrame(() => {
      startTimeMsCacheResetScheduled = false;
      resetStartTimeMsCache();
    });
  }
};
resetStartTimeMsCache();

export const flushStartTimeMsCache = () => {
  startTimeMsCache = new WeakMap();
};

export const EFTemporal = <T extends Constructor<LitElement>>(
  superClass: T,
) => {
  class TemporalMixinClass extends superClass {
    #ownCurrentTimeController?: OwnCurrentTimeController;

    #parentTimegroup?: EFTimegroup;
    #rootTimegroupLocked = false; // When true, rootTimegroup won't be auto-recalculated
    
    @consume({ context: timegroupContext, subscribe: true })
    set parentTimegroup(value: EFTimegroup | undefined) {
      const oldParent = this.#parentTimegroup;
      const oldRole = determineTemporalRole(oldParent);
      const newRole = determineTemporalRole(value);

      this.#parentTimegroup = value;

      this.#ownCurrentTimeController?.remove();
      // Only auto-calculate rootTimegroup if it hasn't been locked
      // (locked means it was manually set, e.g., for render clones)
      if (!this.#rootTimegroupLocked) {
        this.rootTimegroup = this.getRootTimegroup();
      }
      if (this.rootTimegroup) {
        this.#ownCurrentTimeController = new OwnCurrentTimeController(
          this.rootTimegroup,
          this as InstanceType<Constructor<TemporalMixinInterface> & T>,
        );
      }

      // Only trigger callbacks if role actually changed
      if (oldRole !== newRole) {
        if (newRole === "root") {
          this.didBecomeRoot();
        } else {
          this.didBecomeChild();
        }
      }
    }
    
    /**
     * Lock the rootTimegroup to prevent auto-recalculation.
     * Used for render clones where the root must be fixed.
     * @internal
     */
    lockRootTimegroup() {
      this.#rootTimegroupLocked = true;
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.#ownCurrentTimeController?.remove();

      if (this.playbackController) {
        this.playbackController.remove();
        this.playbackController = undefined;
      }

      // Clean up tracked animations to prevent memory leaks
      // Use dynamic import to avoid circular dependency with updateAnimations
      import("./updateAnimations.js").then(({ cleanupTrackedAnimations }) => {
        cleanupTrackedAnimations(this);
      });
    }

    connectedCallback() {
      super.connectedCallback();
      this.#ownCurrentTimeController?.remove();

      // Root detection: Check DOM structure to determine if this is truly a root.
      // 
      // We can't rely on Lit Context (parentTimegroup) because context propagates
      // asynchronously during update cycles. Children may complete their first update
      // before ancestors have provided context, causing them to incorrectly think
      // they're roots.
      //
      // Instead, we check if there's an ancestor ef-timegroup in the DOM. This is
      // reliable because DOM structure is established synchronously at connection time.
      // 
      // If there's NO ancestor timegroup, this is a true root → create PlaybackController.
      // If there IS an ancestor, wait for context to propagate (handled by parentTimegroup setter).
      // Note: closest() includes self, so we check from parentElement to find true ancestors.
      const hasAncestorTimegroup = this.parentElement?.closest('ef-timegroup') != null;
      
      if (!hasAncestorTimegroup && !this.playbackController) {
        // True root: no ancestor timegroup in DOM
        // Defer slightly to allow element to fully initialize
        this.updateComplete.then(() => {
          if (!this.isConnected) return;
          if (!this.playbackController) {
            this.didBecomeRoot();
          }
        });
      }
      // For elements WITH ancestors, the parentTimegroup setter will be called
      // when Lit Context propagates, and if the role changes, didBecomeRoot/didBecomeChild
      // will be called appropriately.
    }

    get parentTimegroup() {
      return this.#parentTimegroup;
    }

    playbackController?: PlaybackController;

    get playing(): boolean {
      if (!this.playbackController) {
        return false;
      }
      return this.playbackController.playing;
    }

    set playing(value: boolean) {
      if (!this.playbackController) {
        console.warn("Cannot set playing on non-root temporal element", this);
        return;
      }
      this.playbackController.setPlaying(value);
    }

    play(): void {
      if (!this.playbackController) {
        console.warn("play() called on non-root temporal element", this);
        return;
      }
      this.playbackController.play();
    }

    pause(): void {
      if (!this.playbackController) {
        console.warn("pause() called on non-root temporal element", this);
        return;
      }
      this.playbackController.pause();
    }

    @property({ type: Boolean, reflect: true, attribute: "loop" })
    get loop(): boolean {
      return this.playbackController?.loop ?? this.#loop;
    }

    set loop(value: boolean) {
      const oldValue = this.#loop;
      this.#loop = value;
      if (this.playbackController) {
        this.playbackController.setLoop(value);
      }
      this.requestUpdate("loop", oldValue);
    }

    @property({
      type: String,
      attribute: "offset",
      converter: durationConverter,
    })
    private _offsetMs = 0;

    @property({
      type: Number,
      attribute: "duration",
      converter: durationConverter,
    })
    private _durationMs?: number;

    set duration(value: string | undefined) {
      if (value !== undefined) {
        this.setAttribute("duration", value);
      } else {
        this.removeAttribute("duration");
      }
    }

    @property({
      type: Number,
      attribute: "trimstart",
      converter: durationConverter,
    })
    private _trimStartMs: number | undefined = undefined;

    get trimStartMs() {
      if (this._trimStartMs === undefined) {
        return undefined;
      }
      return Math.min(
        Math.max(this._trimStartMs, 0),
        this.intrinsicDurationMs ?? 0,
      );
    }

    set trimStartMs(value: number | undefined) {
      this._trimStartMs = value;
    }

    @property({
      type: Number,
      attribute: "trimend",
      converter: durationConverter,
    })
    private _trimEndMs: number | undefined = undefined;

    get trimEndMs() {
      if (this._trimEndMs === undefined) {
        return undefined;
      }
      return Math.min(this._trimEndMs, this.intrinsicDurationMs ?? 0);
    }

    set trimEndMs(value: number | undefined) {
      this._trimEndMs = value;
    }

    @property({
      type: Number,
      attribute: "sourcein",
      converter: durationConverter,
    })
    private _sourceInMs: number | undefined = undefined;

    get sourceInMs() {
      if (this._sourceInMs === undefined) {
        return undefined;
      }
      return Math.max(this._sourceInMs, 0);
    }

    set sourceInMs(value: number | undefined) {
      this._sourceInMs = value;
    }

    @property({
      type: Number,
      attribute: "sourceout",
      converter: durationConverter,
    })
    private _sourceOutMs: number | undefined = undefined;

    get sourceOutMs() {
      if (this._sourceOutMs === undefined) {
        return undefined;
      }
      if (
        this.intrinsicDurationMs &&
        this._sourceOutMs > this.intrinsicDurationMs
      ) {
        return this.intrinsicDurationMs;
      }
      return Math.max(this._sourceOutMs, 0);
    }

    set sourceOutMs(value: number | undefined) {
      this._sourceOutMs = value;
    }

    override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
      super.willUpdate?.(changedProperties);
      
      // When sourcein or sourceout change, reset currentTime to 0
      // This ensures users see the new starting frame, avoiding confusion
      // when both properties change together (e.g., dragging a trim region)
      if (changedProperties.has("_sourceInMs") || changedProperties.has("_sourceOutMs")) {
        // Reset the root timegroup's currentTime (whether we're the root or a child)
        if (this.rootTimegroup && this.rootTimegroup.currentTimeMs !== 0) {
          this.rootTimegroup.currentTimeMs = 0;
        }
      }
    }

    @property({
      type: Number,
      attribute: "startoffset",
      converter: durationConverter,
    })
    private _startOffsetMs = 0;
    public get startOffsetMs(): number {
      return this._startOffsetMs;
    }

    @state()
    rootTimegroup?: EFTimegroup = this.getRootTimegroup();

    private getRootTimegroup(): EFTimegroup | undefined {
      let parent =
        this.tagName === "EF-TIMEGROUP" ? this : this.parentTimegroup;
      while (parent?.parentTimegroup) {
        parent = parent.parentTimegroup;
      }
      return parent as EFTimegroup | undefined;
    }

    get hasExplicitDuration() {
      return this._durationMs !== undefined;
    }

    get explicitDurationMs() {
      if (this.hasExplicitDuration) {
        return this._durationMs;
      }
      return undefined;
    }

    get hasOwnDuration() {
      return this.intrinsicDurationMs !== undefined || this.hasExplicitDuration;
    }

    get intrinsicDurationMs() {
      return undefined;
    }

    get durationMs() {
      // Prevent infinite loops: don't call parent.durationMs if parent is currently calculating
      // Lazy import to break circular dependency: EFTemporal -> EFTimegroup -> EFMedia -> EFTemporal
      const isTimegroupCalculatingDuration =
        getIsTimegroupCalculatingDuration();
      const parentDurationMs = isTimegroupCalculatingDuration(
        this.parentTimegroup,
      )
        ? undefined
        : this.parentTimegroup?.durationMs;
      const durationSource = determineDurationSource(
        this.intrinsicDurationMs,
        this._durationMs,
        parentDurationMs,
      );

      const modification = determineDurationModificationStrategy(
        this.trimStartMs,
        this.trimEndMs,
        this.sourceInMs,
        this.sourceOutMs,
      );

      return evaluateModifiedDuration(
        durationSource.baseDurationMs,
        modification,
      );
    }

    get sourceStartMs() {
      return this.trimStartMs ?? this.sourceInMs ?? 0;
    }

    #offsetMs() {
      return this._offsetMs || 0;
    }

    #parentTemporal() {
      let parent = this.parentElement;
      while (parent && !isEFTemporal(parent)) {
        parent = parent.parentElement;
      }
      return parent;
    }

    /**
     * The start time of the element within its parent timegroup.
     */
    get startTimeWithinParentMs() {
      const parent = this.#parentTemporal();
      if (!parent) {
        return 0;
      }
      return this.startTimeMs - parent.startTimeMs;
    }

    #loop = false;

    get startTimeMs(): number {
      const cachedStartTime = startTimeMsCache.get(this);
      if (cachedStartTime !== undefined) {
        return cachedStartTime;
      }

      const startTime = evaluateStartTime(
        this as InstanceType<Constructor<TemporalMixinInterface> & T>,
        this.parentTimegroup,
        this.#offsetMs(),
        (parent) => shallowGetTemporalElements(parent),
      );

      startTimeMsCache.set(this, startTime);
      return startTime;
    }

    get endTimeMs(): number {
      return this.startTimeMs + this.durationMs;
    }

    #currentTimeMs = 0;

    /**
     * Set the base local time (ms) used by ownCurrentTimeMs when no playback
     * controller is present. Called by EFTimegroup.seekForRender() to keep the
     * mixin's internal time in sync with the timegroup's own time state.
     * @internal
     */
    _setLocalTimeMs(value: number) {
      this.#currentTimeMs = value;
    }

    /**
     * The current time of the element within itself.
     * Compare with `currentTimeMs` to see the current time with respect to the root timegroup
     */
    get ownCurrentTimeMs(): number {
      const timeSource = determineCurrentTimeSource(
        this.playbackController,
        this.rootTimegroup,
        this.rootTimegroup === (this as any as EFTimegroup),
        this.#currentTimeMs,
        this.startTimeMs,
        this.durationMs,
      );
      return timeSource.timeMs;
    }

    /**
     * Element's current time for progress calculation.
     * Non-timegroup temporal elements use their local time (ownCurrentTimeMs)
     */
    get currentTimeMs() {
      return this.ownCurrentTimeMs;
    }

    set currentTimeMs(value: number) {
      const role = determineTemporalRole(this.parentTimegroup);

      // Apply current time based on role
      switch (role) {
        case "root":
          if (this.playbackController) {
            this.playbackController.currentTime = value / 1000;
          } else {
            this.#currentTimeMs = value;
            this.requestUpdate("currentTimeMs");
          }
          break;
        case "child":
          if (
            this.rootTimegroup &&
            this.rootTimegroup !== (this as any as EFTimegroup)
          ) {
            this.rootTimegroup.currentTimeMs = value;
          } else {
            this.#currentTimeMs = value;
            this.requestUpdate("currentTimeMs");
          }
          break;
      }
    }

    /**
     * Used to calculate the internal currentTimeMs of the element. This is useful
     * for mapping to internal media time codes for audio/video elements.
     */
    get currentSourceTimeMs() {
      const leadingTrimMs = this.sourceInMs || this.trimStartMs || 0;
      return this.ownCurrentTimeMs + leadingTrimMs;
    }

    didBecomeRoot() {
      // Don't create PlaybackController if:
      // 1. Explicitly disabled via attribute (e.g., for render clones)
      // 2. Already exists
      // 3. In headless rendering mode (EF_FRAMEGEN active)
      const noPlayback = (this as any).hasAttribute?.('data-no-playback-controller');
      const isRendering = typeof window !== 'undefined' && 'FRAMEGEN_BRIDGE' in window;
      if (noPlayback || this.playbackController || isRendering) {
        return;
      }
      
      this.playbackController = new PlaybackController(this as any);
      if (this.#loop) {
        this.playbackController.setLoop(this.#loop);
      }
    }

    didBecomeChild() {
      if (this.playbackController) {
        this.playbackController.remove();
        this.playbackController = undefined;
      }
    }
  }

  Object.defineProperty(TemporalMixinClass.prototype, EF_TEMPORAL, {
    value: true,
  });

  return TemporalMixinClass as unknown as Constructor<TemporalMixinInterface> &
    T;
};
