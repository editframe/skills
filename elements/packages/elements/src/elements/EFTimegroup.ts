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
} from "./EFTemporal.js";
import { parseTimeToMs } from "./parseTimeToMs.js";
import { renderTemporalAudio } from "./renderTemporalAudio.js";
import { EFTargetable } from "./TargetController.js";
import { TimegroupController } from "./TimegroupController.js";
import {
  evaluateAnimationVisibilityState,
  updateAnimations,
} from "./updateAnimations.ts";

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

// Cache for sequence mode duration calculations to avoid O(n) recalculation
let sequenceDurationCache: WeakMap<EFTimegroup, number> = new WeakMap();

export const flushSequenceDurationCache = () => {
  sequenceDurationCache = new WeakMap();
};

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

  @provide({ context: timegroupContext })
  _timeGroupContext = this;

  @provide({ context: efContext })
  efContext = this;

  mode: "fit" | "fixed" | "sequence" | "contain" = "contain";
  overlapMs = 0;

  @property({ type: Number })
  fps = 30;

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
    if (name === "fps" && value) {
      this.fps = Number.parseFloat(value);
    }
    super.attributeChangedCallback(name, old, value);
  }

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
   */
  get effectiveFps(): number {
    // During rendering, prefer the render options FPS
    if (typeof window !== "undefined" && window.EF_FRAMEGEN?.renderOptions) {
      return window.EF_FRAMEGEN.renderOptions.encoderOptions.video.framerate;
    }
    return this.fps;
  }

  /**
   * Quantize a time value to the nearest frame boundary based on effectiveFps.
   * @param timeSeconds - Time in seconds
   * @returns Time quantized to frame boundaries in seconds
   */
  private quantizeToFrameTime(timeSeconds: number): number {
    const fps = this.effectiveFps;
    if (!fps || fps <= 0) return timeSeconds;
    const frameDurationS = 1 / fps;
    return Math.round(timeSeconds / frameDurationS) * frameDurationS;
  }

  private async runThrottledFrameTask(): Promise<void> {
    if (this.playbackController) {
      return this.playbackController.runThrottledFrameTask();
    }
    await this.frameTask.run();
  }

  @property({ type: Number, attribute: "currenttime" })
  set currentTime(time: number) {
    // Quantize time to frame boundaries based on fps
    // Do this BEFORE delegating to playbackController to ensure consistency
    time = this.quantizeToFrameTime(time);

    if (this.playbackController) {
      this.playbackController.currentTime = time;
      return;
    }

    time = Math.max(0, Math.min(this.durationMs / 1000, time));
    if (!this.isRootTimegroup) {
      return;
    }
    if (Number.isNaN(time)) {
      return;
    }
    if (time === this.#currentTime && !this.#processingPendingSeek) {
      return;
    }
    if (this.#pendingSeekTime === time) {
      return;
    }

    if (this.#seekInProgress) {
      this.#pendingSeekTime = time;
      this.#currentTime = time;
      return;
    }

    this.#currentTime = time;
    this.#seekInProgress = true;

    this.seekTask.run().finally(() => {
      if (
        this.#pendingSeekTime !== undefined &&
        this.#pendingSeekTime !== time
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

  get currentTime() {
    if (this.playbackController) {
      return this.playbackController.currentTime;
    }
    return this.#currentTime ?? 0;
  }

  set currentTimeMs(ms: number) {
    this.currentTime = ms / 1000;
  }

  get currentTimeMs() {
    return this.currentTime * 1000;
  }

  /**
   * Seek to a specific time and wait for all frames to be ready.
   * This is the recommended way to seek in tests and programmatic control.
   *
   * @param timeMs - Time in milliseconds to seek to
   * @returns Promise that resolves when the seek is complete and all visible children are ready
   */
  async seek(timeMs: number): Promise<void> {
    this.currentTimeMs = timeMs;
    await this.seekTask.taskComplete;

    // Handle localStorage when playbackController delegates seek
    if (this.playbackController) {
      this.saveTimeToLocalStorage(this.currentTime);
    }

    await this.frameTask.taskComplete;

    // Ensure all visible elements have completed their reactive update cycles AND frame rendering
    // waitForFrameTasks() calls frameTask.run() on children, but this may happen before child
    // elements have processed property changes from requestUpdate(). To ensure frame data is
    // accurate, we wait for updateComplete first, then ensure the frameTask has run with the
    // updated properties. Elements like EFVideo provide waitForFrameReady() for this pattern.
    const temporalElements = deepGetElementsWithFrameTasks(this);
    const visibleElements = temporalElements.filter((element) => {
      const animationState = evaluateAnimationVisibilityState(element);
      return animationState.isVisible;
    });

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
   */
  removeFrameTask(callback: FrameTaskCallback): void {
    this.#customFrameTasks.delete(callback);
  }

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
        if (EF_INTERACTIVE && this.seekTask.status === TaskStatus.INITIAL) {
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
      this.runThrottledFrameTask();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resizeObserver?.disconnect();
  }

  get storageKey() {
    if (!this.id) {
      throw new Error("Timegroup must have an id to use localStorage.");
    }
    return `ef-timegroup-${this.id}`;
  }

  get intrinsicDurationMs() {
    if (this.hasExplicitDuration) {
      return this.explicitDurationMs;
    }
    return undefined;
  }

  get hasOwnDuration() {
    return (
      this.mode === "contain" ||
      this.mode === "sequence" ||
      (this.mode === "fixed" && this.hasExplicitDuration)
    );
  }

  get durationMs(): number {
    switch (this.mode) {
      case "fit": {
        if (!this.parentTimegroup) {
          return 0;
        }
        return this.parentTimegroup.durationMs;
      }
      case "fixed":
        return super.durationMs;
      case "sequence": {
        // Check cache first to avoid expensive O(n) recalculation
        const cachedDuration = sequenceDurationCache.get(this);
        if (cachedDuration !== undefined) {
          return cachedDuration;
        }

        let duration = 0;
        this.childTemporals.forEach((child, index) => {
          if (child instanceof EFTimegroup && child.mode === "fit") {
            return;
          }
          if (index > 0) {
            duration -= this.overlapMs;
          }
          duration += child.durationMs;
        });

        // Cache the calculated duration
        sequenceDurationCache.set(this, duration);
        return duration;
      }
      case "contain": {
        let maxDuration = 0;
        for (const child of this.childTemporals) {
          // fit timegroups look "up" to their parent timegroup for their duration
          // so we need to skip them to avoid an infinite loop
          if (child instanceof EFTimegroup && child.mode === "fit") {
            continue;
          }
          if (!child.hasOwnDuration) {
            continue;
          }
          maxDuration = Math.max(maxDuration, child.durationMs);
        }
        return maxDuration;
      }
      default:
        throw new Error(`Invalid time mode: ${this.mode}`);
    }
  }

  async getPendingFrameTasks(signal?: AbortSignal) {
    await this.waitForNestedUpdates(signal);
    signal?.throwIfAborted();
    const temporals = deepGetElementsWithFrameTasks(this);

    // Filter to only include temporally visible elements for frame processing
    // (but keep all elements for duration calculations)
    // Use the target timeline time if we're in the middle of seeking
    const timelineTimeMs =
      (this.#pendingSeekTime ?? this.#currentTime ?? 0) * 1000;
    const activeTemporals = temporals.filter((temporal) => {
      // Skip timeline filtering if temporal doesn't have timeline position info
      if (!("startTimeMs" in temporal) || !("endTimeMs" in temporal)) {
        return true; // Keep non-temporal elements
      }

      // Only process frame tasks for elements that overlap the current timeline
      // Use same epsilon logic as seek task for consistency
      const epsilon = 0.001; // 1µs offset to break ties at boundaries
      const startTimeMs = (temporal as any).startTimeMs as number;
      const endTimeMs = (temporal as any).endTimeMs as number;
      const elementStartsBeforeEnd = startTimeMs <= timelineTimeMs + epsilon;
      // Root timegroups should remain visible at exact end time, but other elements use exclusive end for clean transitions
      const isRootTimegroup =
        temporal.tagName.toLowerCase() === "ef-timegroup" &&
        !(temporal as any).parentTimegroup;
      const useInclusiveEnd = isRootTimegroup;
      const elementEndsAfterStart = useInclusiveEnd
        ? endTimeMs >= timelineTimeMs
        : endTimeMs > timelineTimeMs;
      return elementStartsBeforeEnd && elementEndsAfterStart;
    });

    const frameTasks = activeTemporals.map((temporal) => temporal.frameTask);
    frameTasks.forEach((task) => {
      task.run();
    });

    return frameTasks.filter((task) => task.status < TaskStatus.COMPLETE);
  }

  async waitForNestedUpdates(signal?: AbortSignal) {
    const limit = 10;
    let steps = 0;
    let isComplete = true;
    while (true) {
      steps++;
      if (steps > limit) {
        throw new Error("Reached update depth limit.");
      }
      isComplete = await this.updateComplete;
      signal?.throwIfAborted();
      if (isComplete) {
        break;
      }
    }
  }

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

        // Filter to only include temporally visible elements for frame processing
        // Use animation-friendly visibility to prevent animation jumps at exact boundaries
        const visibleElements = temporalElements.filter((element) => {
          const animationState = evaluateAnimationVisibilityState(element);
          return animationState.isVisible;
        });
        if (isTracingEnabled()) {
          span.setAttribute("visibleElementsCount", visibleElements.length);
        }

        const promiseStart = performance.now();

        await Promise.all(
          visibleElements.map((element) => element.frameTask.run()),
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

  mediaDurationsPromise: Promise<void> | undefined = undefined;

  async waitForMediaDurations() {
    if (!this.mediaDurationsPromise) {
      this.mediaDurationsPromise = this.#waitForMediaDurations();
    }
    return this.mediaDurationsPromise;
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

  get childTemporals() {
    return shallowGetTemporalElements(this);
  }

  get contextProvider() {
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
   */
  shouldWrapWithWorkbench() {
    const isRendering = EF_RENDERING?.() === true;

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

  get efElements() {
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
   */
  getMediaElements(): EFMedia[] {
    return deepGetMediaElements(this);
  }

  /**
   * Render audio buffer for playback
   * Called by PlaybackController during live playback
   * Delegates to shared renderTemporalAudio utility for consistent behavior
   */
  async renderAudio(fromMs: number, toMs: number): Promise<AudioBuffer> {
    return renderTemporalAudio(this, fromMs, toMs);
  }

  /**
   * TEMPORARY TEST METHOD: Renders audio and immediately plays it back
   * Usage: timegroup.testPlayAudio(0, 5000) // Play first 5 seconds
   */
  async testPlayAudio(fromMs: number, toMs: number) {
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

  async loadMd5Sums() {
    const efElements = this.efElements;
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

  frameTask = new Task(this, {
    // autoRun: EF_INTERACTIVE,
    autoRun: false,
    args: () => [this.ownCurrentTimeMs, this.currentTimeMs] as const,
    task: async ([ownCurrentTimeMs, currentTimeMs]) => {
      if (this.isRootTimegroup) {
        await withSpan(
          "timegroup.frameTask",
          {
            timegroupId: this.id || "unknown",
            ownCurrentTimeMs,
            currentTimeMs,
          },
          undefined,
          async () => {
            await this.waitForFrameTasks();
            await this.#executeCustomFrameTasks();
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

  seekTask = new Task(this, {
    autoRun: false,
    args: () => [this.#pendingSeekTime ?? this.#currentTime] as const,
    onComplete: () => {},
    task: async ([targetTime]) => {
      if (this.playbackController) {
        await this.playbackController.seekTask.taskComplete;
        return this.currentTime;
      }

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
          await this.waitForMediaDurations();
          const newTime = Math.max(
            0,
            Math.min(targetTime ?? 0, this.durationMs / 1000),
          );
          if (isTracingEnabled()) {
            span.setAttribute("newTime", newTime);
          }
          // Apply the clamped time back to currentTime

          this.#currentTime = newTime;
          this.requestUpdate("currentTime");
          await this.runThrottledFrameTask();
          this.saveTimeToLocalStorage(this.#currentTime);
          this.#seekInProgress = false;
          return newTime;
        },
      );
    },
  });
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-timegroup": EFTimegroup & Element;
  }
}
