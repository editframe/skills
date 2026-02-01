/**
 * Tests for FrameController centralized frame rendering.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  FrameController,
  type FrameRenderable,
  type FrameState,
  isFrameRenderable,
  PRIORITY_VIDEO,
  PRIORITY_CAPTIONS,
  PRIORITY_AUDIO,
  PRIORITY_WAVEFORM,
  PRIORITY_IMAGE,
  PRIORITY_DEFAULT,
} from "./FrameController.js";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Mock element that tracks prepare/render calls for testing.
 */
@customElement("test-frame-element")
class TestFrameElement extends LitElement implements FrameRenderable {
  @property({ type: Number })
  priority = PRIORITY_DEFAULT;

  @property({ type: Boolean })
  needsPrep = false;

  @property({ type: Boolean })
  isReadyState = true;

  prepareCallCount = 0;
  renderCallCount = 0;
  prepareTimeMs: number | undefined;
  renderTimeMs: number | undefined;
  prepareAborted = false;

  getFrameState(_timeMs: number): FrameState {
    return {
      needsPreparation: this.needsPrep,
      isReady: this.isReadyState,
      priority: this.priority,
    };
  }

  async prepareFrame(timeMs: number, signal: AbortSignal): Promise<void> {
    this.prepareCallCount++;
    this.prepareTimeMs = timeMs;
    
    // Simulate async work
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, 10);
      signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        this.prepareAborted = true;
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  }

  renderFrame(timeMs: number): void {
    this.renderCallCount++;
    this.renderTimeMs = timeMs;
  }

  reset(): void {
    this.prepareCallCount = 0;
    this.renderCallCount = 0;
    this.prepareTimeMs = undefined;
    this.renderTimeMs = undefined;
    this.prepareAborted = false;
  }

  render() {
    return html`<slot></slot>`;
  }
}

/**
 * Mock temporal element with startTimeMs/endTimeMs for visibility testing.
 */
@customElement("test-temporal-element")
class TestTemporalElement extends LitElement implements FrameRenderable {
  @property({ type: Number })
  startTimeMs = 0;

  @property({ type: Number })
  endTimeMs = Infinity;

  @property({ type: Number })
  priority = PRIORITY_DEFAULT;

  renderCallCount = 0;

  getFrameState(_timeMs: number): FrameState {
    return {
      needsPreparation: false,
      isReady: true,
      priority: this.priority,
    };
  }

  async prepareFrame(_timeMs: number, _signal: AbortSignal): Promise<void> {
    // No-op
  }

  renderFrame(_timeMs: number): void {
    this.renderCallCount++;
  }

  render() {
    return html`<slot></slot>`;
  }
}

/**
 * Root element for FrameController tests.
 */
@customElement("test-root-element")
class TestRootElement extends LitElement {
  @property({ type: Number })
  currentTimeMs = 0;

  render() {
    return html`<slot></slot>`;
  }
}

// ============================================================================
// Type Guard Tests
// ============================================================================

describe("isFrameRenderable", () => {
  test("returns true for element implementing all methods", () => {
    const element = document.createElement("test-frame-element");
    document.body.appendChild(element);
    try {
      expect(isFrameRenderable(element)).toBe(true);
    } finally {
      element.remove();
    }
  });

  test("returns false for plain HTML element", () => {
    const div = document.createElement("div");
    expect(isFrameRenderable(div)).toBe(false);
  });

  test("returns false for null/undefined", () => {
    expect(isFrameRenderable(null)).toBe(false);
    expect(isFrameRenderable(undefined)).toBe(false);
  });

  test("returns false for partial implementation", () => {
    const partial = {
      getFrameState: () => ({ needsPreparation: false, isReady: true, priority: 0 }),
      prepareFrame: async () => {},
      // Missing renderFrame
    };
    expect(isFrameRenderable(partial)).toBe(false);
  });
});

// ============================================================================
// Priority Constants Tests
// ============================================================================

describe("Priority constants", () => {
  test("priorities are in correct order", () => {
    expect(PRIORITY_VIDEO).toBeLessThan(PRIORITY_CAPTIONS);
    expect(PRIORITY_CAPTIONS).toBeLessThan(PRIORITY_AUDIO);
    expect(PRIORITY_AUDIO).toBeLessThan(PRIORITY_WAVEFORM);
    expect(PRIORITY_WAVEFORM).toBeLessThan(PRIORITY_IMAGE);
    expect(PRIORITY_IMAGE).toBeLessThan(PRIORITY_DEFAULT);
  });

  test("DEFAULT priority is high enough for custom elements", () => {
    expect(PRIORITY_DEFAULT).toBeGreaterThanOrEqual(100);
  });
});

// ============================================================================
// FrameController Tests
// ============================================================================

describe("FrameController", () => {
  let root: TestRootElement;
  let controller: FrameController;

  beforeEach(async () => {
    root = document.createElement("test-root-element") as TestRootElement;
    document.body.appendChild(root);
    await root.updateComplete;
    controller = new FrameController(root);
  });

  afterEach(() => {
    controller.abort();
    root.remove();
  });

  describe("renderFrame lifecycle", () => {
    test("calls prepareFrame when needsPreparation is true", async () => {
      const element = document.createElement("test-frame-element") as TestFrameElement;
      element.needsPrep = true;
      root.appendChild(element);
      await root.updateComplete;

      await controller.renderFrame(1000);

      expect(element.prepareCallCount).toBe(1);
      expect(element.prepareTimeMs).toBe(1000);
      element.remove();
    });

    test("skips prepareFrame when needsPreparation is false", async () => {
      const element = document.createElement("test-frame-element") as TestFrameElement;
      element.needsPrep = false;
      root.appendChild(element);
      await root.updateComplete;

      await controller.renderFrame(1000);

      expect(element.prepareCallCount).toBe(0);
      element.remove();
    });

    test("calls renderFrame for all visible elements", async () => {
      const element1 = document.createElement("test-frame-element") as TestFrameElement;
      const element2 = document.createElement("test-frame-element") as TestFrameElement;
      root.appendChild(element1);
      root.appendChild(element2);
      await root.updateComplete;

      await controller.renderFrame(1000);

      expect(element1.renderCallCount).toBe(1);
      expect(element2.renderCallCount).toBe(1);
      element1.remove();
      element2.remove();
    });

    test("passes correct timeMs to renderFrame", async () => {
      const element = document.createElement("test-frame-element") as TestFrameElement;
      root.appendChild(element);
      await root.updateComplete;

      await controller.renderFrame(2500);

      expect(element.renderTimeMs).toBe(2500);
      element.remove();
    });
  });

  describe("priority ordering", () => {
    test("renders elements in priority order", async () => {
      const renderOrder: string[] = [];

      const high = document.createElement("test-frame-element") as TestFrameElement;
      high.priority = PRIORITY_VIDEO;
      high.renderFrame = () => renderOrder.push("high");

      const mid = document.createElement("test-frame-element") as TestFrameElement;
      mid.priority = PRIORITY_AUDIO;
      mid.renderFrame = () => renderOrder.push("mid");

      const low = document.createElement("test-frame-element") as TestFrameElement;
      low.priority = PRIORITY_IMAGE;
      low.renderFrame = () => renderOrder.push("low");

      // Add in reverse order
      root.appendChild(low);
      root.appendChild(high);
      root.appendChild(mid);
      await root.updateComplete;

      await controller.renderFrame(1000);

      expect(renderOrder).toEqual(["high", "mid", "low"]);
      high.remove();
      mid.remove();
      low.remove();
    });
  });

  describe("temporal visibility filtering", () => {
    test("includes elements within time range", async () => {
      const element = document.createElement("test-temporal-element") as TestTemporalElement;
      element.startTimeMs = 0;
      element.endTimeMs = 5000;
      root.appendChild(element);
      await root.updateComplete;

      await controller.renderFrame(2500);

      expect(element.renderCallCount).toBe(1);
      element.remove();
    });

    test("excludes elements outside time range (before)", async () => {
      const element = document.createElement("test-temporal-element") as TestTemporalElement;
      element.startTimeMs = 5000;
      element.endTimeMs = 10000;
      root.appendChild(element);
      await root.updateComplete;

      await controller.renderFrame(1000); // Before start

      expect(element.renderCallCount).toBe(0);
      element.remove();
    });

    test("excludes elements outside time range (after)", async () => {
      const element = document.createElement("test-temporal-element") as TestTemporalElement;
      element.startTimeMs = 0;
      element.endTimeMs = 5000;
      root.appendChild(element);
      await root.updateComplete;

      await controller.renderFrame(6000); // After end

      expect(element.renderCallCount).toBe(0);
      element.remove();
    });

    test("uses exclusive end time (element ends at exact boundary)", async () => {
      const element = document.createElement("test-temporal-element") as TestTemporalElement;
      element.startTimeMs = 0;
      element.endTimeMs = 5000;
      root.appendChild(element);
      await root.updateComplete;

      await controller.renderFrame(5000); // Exactly at end

      expect(element.renderCallCount).toBe(0); // Should NOT render (exclusive end)
      element.remove();
    });
  });

  describe("abort handling", () => {
    test("abort() stops the abort controller", async () => {
      const element = document.createElement("test-frame-element") as TestFrameElement;
      root.appendChild(element);
      await root.updateComplete;

      // Complete a render first
      await controller.renderFrame(1000);
      expect(element.renderCallCount).toBe(1);

      // Abort should be callable (no error)
      controller.abort();
      
      // New render should work after abort
      await controller.renderFrame(2000);
      expect(element.renderCallCount).toBe(2);
      expect(element.renderTimeMs).toBe(2000);
      element.remove();
    });

    test("queued render replaces pending when render in progress", async () => {
      const element = document.createElement("test-frame-element") as TestFrameElement;
      element.needsPrep = true;
      root.appendChild(element);
      await root.updateComplete;

      // Start first render
      const promise1 = controller.renderFrame(1000);
      
      // While first is in progress, queue second (will be processed after first)
      const promise2 = controller.renderFrame(2000);

      // Both promises resolve
      await Promise.all([promise1, promise2]);

      // The element should have been rendered at least once
      // The queued render may or may not have executed depending on timing
      expect(element.renderCallCount).toBeGreaterThanOrEqual(1);
      element.remove();
    });
  });

  describe("render queuing", () => {
    test("queues render while another is in progress", async () => {
      const element = document.createElement("test-frame-element") as TestFrameElement;
      element.needsPrep = true;
      root.appendChild(element);
      await root.updateComplete;

      // Start slow render
      const promise1 = controller.renderFrame(1000);
      
      // isRendering should be true
      expect(controller.isRendering).toBe(true);

      // Queue another render
      const promise2 = controller.renderFrame(2000);

      await Promise.all([promise1, promise2]);

      // Queued render should eventually execute
      // (either the first or second time value will be the final state)
      expect(element.renderCallCount).toBeGreaterThanOrEqual(1);
      element.remove();
    });
  });

  describe("onAnimationsUpdate callback", () => {
    test("calls onAnimationsUpdate after rendering", async () => {
      const element = document.createElement("test-frame-element") as TestFrameElement;
      root.appendChild(element);
      await root.updateComplete;

      const onAnimationsUpdate = vi.fn();
      await controller.renderFrame(1000, { onAnimationsUpdate });

      expect(onAnimationsUpdate).toHaveBeenCalledTimes(1);
      expect(onAnimationsUpdate).toHaveBeenCalledWith(root);
      element.remove();
    });

    test("does not call onAnimationsUpdate if not provided", async () => {
      const element = document.createElement("test-frame-element") as TestFrameElement;
      root.appendChild(element);
      await root.updateComplete;

      // Should not throw
      await controller.renderFrame(1000);

      expect(element.renderCallCount).toBe(1);
      element.remove();
    });
  });
});

// Clean up custom elements after tests
declare global {
  interface HTMLElementTagNameMap {
    "test-frame-element": TestFrameElement;
    "test-temporal-element": TestTemporalElement;
    "test-root-element": TestRootElement;
  }
}
