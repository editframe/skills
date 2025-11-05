import { consume, createContext } from "@lit/context";
import { Task } from "@lit/task";
import type { LitElement, ReactiveController } from "lit";
import { property, state } from "lit/decorators.js";
import { EF_INTERACTIVE } from "../EF_INTERACTIVE.js";
import { PlaybackController } from "../gui/PlaybackController.js";
import { durationConverter } from "./durationConverter.js";
import type { EFTimegroup } from "./EFTimegroup.js";

export const timegroupContext = createContext<EFTimegroup>(
  Symbol("timeGroupContext"),
);

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

  frameTask: Task<readonly unknown[], unknown>;

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
  for (const child of element.children) {
    if (isEFTemporal(child)) {
      temporals.push(child as TemporalMixinInterface & HTMLElement);
    }
    deepGetTemporalElements(child, temporals);
  }
  return temporals;
};

export const deepGetElementsWithFrameTasks = (
  element: Element,
  elements: Array<TemporalMixinInterface & HTMLElement> = [],
) => {
  for (const child of element.children) {
    if ("frameTask" in child && child.frameTask instanceof Task) {
      elements.push(child as TemporalMixinInterface & HTMLElement);
    }
    deepGetElementsWithFrameTasks(child, elements);
  }
  return elements;
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
  for (const child of element.children) {
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
  constructor(
    private host: EFTimegroup,
    private temporal: TemporalMixinInterface & LitElement,
  ) {
    host.addController(this);
  }

  hostUpdated() {
    this.temporal.requestUpdate("ownCurrentTimeMs");
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
    ownCurrentTimeController?: OwnCurrentTimeController;

    #parentTimegroup?: EFTimegroup;
    @consume({ context: timegroupContext, subscribe: true })
    set parentTimegroup(value: EFTimegroup | undefined) {
      const oldParent = this.#parentTimegroup;
      this.#parentTimegroup = value;

      this.ownCurrentTimeController?.remove();
      this.rootTimegroup = this.getRootTimegroup();
      if (this.rootTimegroup) {
        this.ownCurrentTimeController = new OwnCurrentTimeController(
          this.rootTimegroup,
          this as InstanceType<Constructor<TemporalMixinInterface> & T>,
        );
      }

      // Only trigger callbacks if parent status actually changed
      if (oldParent !== value) {
        if (!value) {
          this.didBecomeRoot();
        } else {
          this.didBecomeChild();
        }
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.ownCurrentTimeController?.remove();

      if (this.playbackController) {
        this.playbackController.remove();
        this.playbackController = undefined;
      }
    }

    connectedCallback() {
      super.connectedCallback();
      // Initialize playback controller for root elements
      // The parentTimegroup setter may have already called this, but the guard prevents double-creation
      if (!this.parentTimegroup) {
        this.didBecomeRoot();
      }
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
    _trimStartMs: number | undefined = undefined;

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
    _trimEndMs: number | undefined = undefined;

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
    _sourceInMs: number | undefined = undefined;

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
    _sourceOutMs: number | undefined = undefined;

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
      // Get the base duration - either intrinsic or explicit
      const baseDurationMs =
        this.intrinsicDurationMs ??
        this._durationMs ??
        this.parentTimegroup?.durationMs ??
        0;

      if (baseDurationMs === 0) {
        return 0;
      }

      // Apply trimming logic to any duration source
      if (this.trimStartMs || this.trimEndMs) {
        const trimmedDurationMs =
          baseDurationMs - (this.trimStartMs ?? 0) - (this.trimEndMs ?? 0);
        if (trimmedDurationMs < 0) {
          return 0;
        }
        return trimmedDurationMs;
      }

      if (this.sourceInMs || this.sourceOutMs) {
        const sourceInMs = this.sourceInMs ?? 0;
        const sourceOutMs = this.sourceOutMs ?? baseDurationMs;
        if (sourceInMs >= sourceOutMs) {
          return 0;
        }
        return sourceOutMs - sourceInMs;
      }

      return baseDurationMs;
    }

    get sourceStartMs() {
      return this.trimStartMs ?? this.sourceInMs ?? 0;
    }

    get offsetMs() {
      return this._offsetMs || 0;
    }

    get parentTemporal() {
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
      if (!this.parentTemporal) {
        return 0;
      }
      return this.startTimeMs - this.parentTemporal.startTimeMs;
    }

    #loop = false;

    get startTimeMs(): number {
      const cachedStartTime = startTimeMsCache.get(this);
      if (cachedStartTime !== undefined) {
        return cachedStartTime;
      }
      const parentTimegroup = this.parentTimegroup;
      if (!parentTimegroup) {
        startTimeMsCache.set(this, 0);
        return 0;
      }
      switch (parentTimegroup.mode) {
        case "sequence": {
          const siblingTemorals = shallowGetTemporalElements(parentTimegroup);
          const ownIndex = siblingTemorals?.indexOf(
            this as InstanceType<Constructor<TemporalMixinInterface> & T>,
          );
          if (ownIndex === -1) {
            return 0;
          }
          if (ownIndex === 0) {
            startTimeMsCache.set(this, parentTimegroup.startTimeMs);
            return parentTimegroup.startTimeMs;
          }
          const previous = siblingTemorals?.[(ownIndex ?? 0) - 1];
          if (!previous) {
            console.error("Previous temporal element not found", {
              ownIndex,
              siblingTemorals,
            });
            throw new Error("Previous temporal element not found");
          }
          startTimeMsCache.set(
            this,
            previous.startTimeMs +
              previous.durationMs -
              parentTimegroup.overlapMs,
          );
          return (
            previous.startTimeMs +
            previous.durationMs -
            parentTimegroup.overlapMs
          );
        }
        case "fit":
        case "contain":
        case "fixed":
          startTimeMsCache.set(
            this,
            parentTimegroup.startTimeMs + this.offsetMs,
          );
          return parentTimegroup.startTimeMs + this.offsetMs;
        default:
          throw new Error(`Invalid time mode: ${parentTimegroup.mode}`);
      }
    }

    get endTimeMs(): number {
      return this.startTimeMs + this.durationMs;
    }

    #currentTimeMs = 0;

    /**
     * The current time of the element within itself.
     * Compare with `currentTimeMs` to see the current time with respect to the root timegroup
     */
    get ownCurrentTimeMs(): number {
      // If we have a playback controller, read from it
      if (this.playbackController) {
        return Math.min(
          Math.max(0, this.playbackController.currentTimeMs),
          this.durationMs,
        );
      }

      if (
        this.rootTimegroup &&
        this.rootTimegroup !== (this as any as EFTimegroup)
      ) {
        return Math.min(
          Math.max(0, this.rootTimegroup.currentTimeMs - this.startTimeMs),
          this.durationMs,
        );
      }
      // We are the root (or no root), use stored time
      return Math.min(Math.max(0, this.#currentTimeMs), this.durationMs);
    }

    /**
     * Element's current time for progress calculation.
     * Non-timegroup temporal elements use their local time (ownCurrentTimeMs)
     */
    get currentTimeMs() {
      return this.ownCurrentTimeMs;
    }

    set currentTimeMs(value: number) {
      // If we have a playback controller, delegate to it
      if (this.playbackController) {
        this.playbackController.currentTime = value / 1000;
        return;
      }

      // If we have a root timegroup, delegate to it
      if (
        this.rootTimegroup &&
        this.rootTimegroup !== (this as any as EFTimegroup)
      ) {
        this.rootTimegroup.currentTimeMs = value;
      } else {
        // We are the root, store the time locally
        this.#currentTimeMs = value;
        this.requestUpdate("currentTimeMs");
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

    frameTask = new Task(this, {
      autoRun: EF_INTERACTIVE,
      args: () => [this.ownCurrentTimeMs] as const,
      task: async ([], { signal: _signal }) => {
        let fullyUpdated = await this.updateComplete;
        while (!fullyUpdated) {
          fullyUpdated = await this.updateComplete;
        }
      },
    });

    didBecomeRoot() {
      if (!this.playbackController) {
        this.playbackController = new PlaybackController(this as any);
        if (this.#loop) {
          this.playbackController.setLoop(this.#loop);
        }
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
