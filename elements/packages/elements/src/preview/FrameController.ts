/**
 * FrameController: Centralized frame rendering control
 *
 * Replaces the distributed Lit Task hierarchy with a single control loop
 * that queries elements and coordinates rendering directly.
 *
 * Benefits over the previous Task-based system:
 * - Single abort controller instead of distributed abort handling
 * - Clear prepare → render phases
 * - All coordination visible in one place
 * - No Lit Task reactivity overhead
 */

import type { LitElement } from "lit";

/**
 * State returned by elements describing their readiness for a given time.
 */
export interface FrameState {
  /**
   * Whether async preparation is needed before rendering.
   * Examples: video needs to seek, captions need to load data.
   */
  needsPreparation: boolean;

  /**
   * Whether the element is ready to render synchronously.
   * True when all async work is complete and renderFrame() can be called.
   */
  isReady: boolean;

  /**
   * Rendering priority hint. Lower numbers render first.
   * Used to order render calls for elements with dependencies.
   */
  priority: number;
}

/**
 * Interface that elements implement to participate in centralized frame rendering.
 * Elements keep their rendering logic local but expose a standardized interface.
 */
export interface FrameRenderable {
  /**
   * Query the element's readiness state for a given time.
   * Must be synchronous and cheap to call.
   */
  getFrameState(timeMs: number): FrameState;

  /**
   * Async preparation phase. Called when getFrameState().needsPreparation is true.
   * Performs any async work needed before rendering (seeking, loading, etc.).
   *
   * @param timeMs - The time to prepare for
   * @param signal - Abort signal for cancellation
   */
  prepareFrame(timeMs: number, signal: AbortSignal): Promise<void>;

  /**
   * Synchronous render phase. Called after all preparation is complete.
   * Performs the actual rendering (paint to canvas, update DOM, etc.).
   *
   * @param timeMs - The time to render
   */
  renderFrame(timeMs: number): void;
}

/**
 * Type guard to check if an element implements FrameRenderable.
 */
export function isFrameRenderable(element: unknown): element is FrameRenderable {
  return (
    typeof element === "object" &&
    element !== null &&
    "getFrameState" in element &&
    "prepareFrame" in element &&
    "renderFrame" in element &&
    typeof (element as FrameRenderable).getFrameState === "function" &&
    typeof (element as FrameRenderable).prepareFrame === "function" &&
    typeof (element as FrameRenderable).renderFrame === "function"
  );
}

/**
 * Options for FrameController.renderFrame()
 */
export interface RenderFrameOptions {
  /**
   * Whether to wait for Lit updateComplete before querying elements.
   * Default: true
   */
  waitForLitUpdate?: boolean;
}

/**
 * Central controller for frame rendering.
 * Lives at the root timegroup and orchestrates all element rendering.
 */
export class FrameController {
  #rootElement: LitElement & { currentTimeMs: number };
  #abortController: AbortController | null = null;
  #renderInProgress = false;
  #pendingRenderTime: number | null = null;

  constructor(rootElement: LitElement & { currentTimeMs: number }) {
    this.#rootElement = rootElement;
  }

  /**
   * Cancel any in-progress render operation.
   */
  abort(): void {
    this.#abortController?.abort();
    this.#abortController = null;
  }

  /**
   * Render a frame at the specified time.
   *
   * This is the main entry point for frame rendering. It:
   * 1. Cancels any previous in-progress render
   * 2. Queries all visible FrameRenderable elements
   * 3. Runs preparation in parallel for elements that need it
   * 4. Runs render in priority order
   *
   * @param timeMs - The time in milliseconds to render
   * @param options - Optional configuration
   */
  async renderFrame(
    timeMs: number,
    options: RenderFrameOptions = {}
  ): Promise<void> {
    const { waitForLitUpdate = true } = options;

    // If a render is in progress, queue this one
    if (this.#renderInProgress) {
      this.#pendingRenderTime = timeMs;
      return;
    }

    // Cancel any previous render operation
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    const signal = this.#abortController.signal;

    this.#renderInProgress = true;

    try {
      // Wait for Lit to propagate time changes to children
      if (waitForLitUpdate) {
        await this.#rootElement.updateComplete;
        signal.throwIfAborted();
      }

      // Query all visible elements that implement FrameRenderable
      const elements = this.#queryVisibleElements();
      signal.throwIfAborted();

      // Phase 1: Parallel preparation
      const elementsNeedingPreparation = elements.filter(
        (el) => el.getFrameState(timeMs).needsPreparation
      );

      if (elementsNeedingPreparation.length > 0) {
        await Promise.all(
          elementsNeedingPreparation.map((el) => el.prepareFrame(timeMs, signal))
        );
        signal.throwIfAborted();
      }

      // Phase 2: Sequential render by priority
      const sortedElements = [...elements].sort(
        (a, b) => a.getFrameState(timeMs).priority - b.getFrameState(timeMs).priority
      );

      for (const element of sortedElements) {
        signal.throwIfAborted();
        element.renderFrame(timeMs);
      }
    } finally {
      this.#renderInProgress = false;

      // Process any queued render
      if (this.#pendingRenderTime !== null) {
        const pendingTime = this.#pendingRenderTime;
        this.#pendingRenderTime = null;
        // Don't await - fire and forget to avoid recursive waiting
        this.renderFrame(pendingTime, options).catch(() => {
          // Silently ignore errors from queued renders (likely aborted)
        });
      }
    }
  }

  /**
   * Query all visible FrameRenderable elements in the tree.
   * Uses temporal visibility to filter out elements not visible at current time.
   */
  #queryVisibleElements(): FrameRenderable[] {
    const result: FrameRenderable[] = [];
    const currentTimeMs = this.#rootElement.currentTimeMs;

    const walk = (element: Element): void => {
      // Check visibility
      if (element instanceof HTMLElement) {
        // Fast path: check inline display style
        if (element.style.display === "none") {
          return;
        }
        // Slow path: check computed style
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") {
          return;
        }
      }

      // Check if this element implements FrameRenderable
      if (isFrameRenderable(element)) {
        // Check temporal visibility if element has timing properties
        if ("startTimeMs" in element && "endTimeMs" in element) {
          const startMs = (element as { startTimeMs?: number }).startTimeMs ?? -Infinity;
          const endMs = (element as { endTimeMs?: number }).endTimeMs ?? Infinity;
          if (currentTimeMs >= startMs && currentTimeMs <= endMs) {
            result.push(element);
          }
        } else {
          // Non-temporal FrameRenderable - always include
          result.push(element);
        }
      }

      // Walk children
      for (const child of element.children) {
        walk(child);
      }
    };

    walk(this.#rootElement);
    return result;
  }

  /**
   * Check if a render is currently in progress.
   */
  get isRendering(): boolean {
    return this.#renderInProgress;
  }
}

/**
 * Default frame state for elements that don't need special handling.
 * Use this for simple elements that are always ready.
 */
export const DEFAULT_FRAME_STATE: FrameState = {
  needsPreparation: false,
  isReady: true,
  priority: 100,
};

/**
 * Helper to create a FrameRenderable mixin for elements.
 * Provides default implementations that can be overridden.
 */
export function createFrameRenderableMixin<T extends { new (...args: any[]): HTMLElement }>(
  Base: T
) {
  return class FrameRenderableMixin extends Base implements FrameRenderable {
    getFrameState(_timeMs: number): FrameState {
      return DEFAULT_FRAME_STATE;
    }

    async prepareFrame(_timeMs: number, _signal: AbortSignal): Promise<void> {
      // Default: no preparation needed
    }

    renderFrame(_timeMs: number): void {
      // Default: no explicit render needed
    }
  };
}
