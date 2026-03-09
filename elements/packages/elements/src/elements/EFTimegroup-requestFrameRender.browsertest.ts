/**
 * Test that requestFrameRender() bypasses FrameController's time-based
 * deduplication, ensuring quality upgrades (scrub → main) are displayed.
 *
 * Bug: When a quality upgrade completes and calls requestFrameRender(), the
 * FrameController skips rendering because the time hasn't changed since the
 * scrub frame was rendered (timeMs === #lastRenderedTimeMs).
 *
 * Fix: requestFrameRender() must reset dedup state before triggering a
 * re-render so upgraded frames are always painted.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import "./EFTimegroup.js";
import {
  type FrameRenderable,
  type FrameState,
  PRIORITY_DEFAULT,
} from "../preview/FrameController.js";

beforeAll(() => {
  console.clear();
});

beforeEach(() => {
  localStorage.clear();
});

@customElement("test-rfrr-frame-element")
class TestFrameElement extends LitElement implements FrameRenderable {
  @property({ type: Number })
  startTimeMs = 0;

  @property({ type: Number })
  endTimeMs = Infinity;

  renderCallCount = 0;

  getFrameState(_timeMs: number): FrameState {
    return {
      needsPreparation: false,
      isReady: true,
      priority: PRIORITY_DEFAULT,
    };
  }

  async prepareFrame(_timeMs: number, _signal: AbortSignal): Promise<void> {}

  renderFrame(_timeMs: number): void {
    this.renderCallCount++;
  }

  render() {
    return html`<slot></slot>`;
  }
}

describe("requestFrameRender bypasses FrameController deduplication", () => {
  let container: HTMLDivElement;
  let timegroup: EFTimegroup;
  let child: TestFrameElement;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10000ms");
    container.appendChild(timegroup);
    await timegroup.updateComplete;

    child = document.createElement("test-rfrr-frame-element") as TestFrameElement;
    timegroup.appendChild(child);
    await child.updateComplete;
    await timegroup.updateComplete;

    // Drain initialization renders, then reset both the dedup state and the
    // render counter so each test starts from a known clean baseline.
    await new Promise((r) => setTimeout(r, 30));
    timegroup.frameController.abort();
    child.renderCallCount = 0;
  });

  afterEach(() => {
    container.remove();
  });

  test("renders frame initially", async () => {
    await timegroup.frameController.renderFrame(0);
    expect(child.renderCallCount).toBe(1);
  });

  test("deduplication blocks same-time re-render", async () => {
    await timegroup.frameController.renderFrame(0);
    expect(child.renderCallCount).toBe(1);

    // Same time - dedup fires, no second render
    await timegroup.frameController.renderFrame(0);
    expect(child.renderCallCount).toBe(1);
  });

  test("requestFrameRender re-renders even when time has not changed", async () => {
    // Simulate scrub frame: render at time 0
    await timegroup.frameController.renderFrame(0);
    expect(child.renderCallCount).toBe(1);

    // Simulate quality upgrade completing: requestFrameRender is called at
    // same time. Without the fix, dedup fires and count stays at 1.
    timegroup.requestFrameRender();

    // Give async rendering a chance to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(child.renderCallCount).toBe(2);
  });
});
