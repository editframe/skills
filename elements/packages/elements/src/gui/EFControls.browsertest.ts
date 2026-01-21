import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { afterEach, describe, expect, test } from "vitest";

import "../elements/EFTimegroup.js";
import { EFTargetable } from "../elements/TargetController.js";
import { ContextMixin } from "./ContextMixin.js";
import "./EFControls.js";
import "./EFPreview.js";
import "./EFTogglePlay.js";
import "./EFPreview.js";
import "./EFTogglePlay.js";
import "./EFTimeDisplay.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFConfiguration } from "./EFConfiguration.js";
import type { EFControls } from "./EFControls.js";
import type { EFPreview } from "./EFPreview.js";
import type { EFTimeDisplay } from "./EFTimeDisplay.js";
import type { EFTogglePlay } from "./EFTogglePlay.js";

@customElement("ef-controls-test-context")
class EFControlsTestContext extends EFTargetable(ContextMixin(LitElement)) {
  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-controls-test-context": EFControlsTestContext;
  }
}

afterEach(() => {
  // Clean up localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (typeof key !== "string") continue;
    localStorage.removeItem(key);
  }

  // Clean up DOM
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
});

const makeElement = <
  TagName extends keyof HTMLElementTagNameMap,
  T extends HTMLElementTagNameMap[TagName],
>(
  tagName: TagName,
  attributes: Record<string, string> = {},
  target: Element | null = null,
) => {
  const element = document.createElement(tagName);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  if (target) {
    target.appendChild(element);
  }
  return element as T;
};

describe("EFControls", () => {
  test("can find and connect to target preview by ID", async () => {
    const preview = makeElement(
      "ef-preview",
      { id: "test-preview", mode: "fixed", duration: "10s" },
      document.body,
    );
    const controls = makeElement(
      "ef-controls",
      { target: "test-preview" },
      document.body,
    );

    // Wait for both elements to complete their updates
    await preview.updateComplete;
    await controls.updateComplete;

    // The controls should have found and connected to the preview
    expect(controls.targetElement).toBe(preview);
  });

  test("handles missing target gracefully", async () => {
    const controls = makeElement(
      "ef-controls",
      { target: "nonexistent-preview" },
      document.body,
    );

    await controls.updateComplete;

    expect(controls.targetElement).toBe(null);
  });

  test("updates when target is set after connection", async () => {
    const preview = makeElement(
      "ef-preview",
      { mode: "fixed", duration: "10s" },
      document.body,
    );
    const controls = makeElement("ef-controls", {}, document.body);

    // Initially no target
    expect(controls.targetElement).toBe(null);

    controls.target = "test-preview";
    preview.id = "test-preview";

    await preview.updateComplete;
    await controls.updateComplete;

    expect(controls.targetElement).toBe(preview);
  });

  test("disconnects from target when removed", async () => {
    const preview = makeElement("ef-controls-test-context", {}, document.body);
    preview.id = "test-preview";

    makeElement("ef-timegroup", { mode: "fixed", duration: "10s" }, preview);

    const controls = makeElement(
      "ef-controls",
      { target: "test-preview" },
      document.body,
    );
    controls.target = "test-preview";

    // Wait for both elements to complete their updates
    await preview.updateComplete;
    await controls.updateComplete;

    // Should be connected
    expect(controls.targetElement).toBe(preview);

    controls.remove();

    // After disconnection, targetElement persists but should have no effect
    // (TargetController only clears targetElement when target is removed, not when consumer disconnects)
    expect(controls.targetElement).toBe(preview);
  });

  describe("html as text", () => {
    const htmlTest = test.extend<{
      markup: string;
      container: HTMLElement;
      preview: EFPreview;
      timegroup: EFTimegroup;
      togglePlay: EFTogglePlay;
      timeDisplay: EFTimeDisplay;
      configuration: EFConfiguration;
      controls: EFControls;
    }>({
      container: async ({ markup }, use) => {
        const container = makeElement("div", {}, document.body);
        container.innerHTML = markup;
        await use(container);
        container.remove();
      },
      markup: async ({}, use) => {
        const markup = `
          <ef-configuration>
            <ef-preview id="test-preview-html">
              <ef-timegroup mode="fixed" duration="10s" id="test-timegroup">
                <ef-video src="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
              </ef-timegroup>
            </ef-preview>
            <ef-controls target="test-preview-html">
              <ef-toggle-play></ef-toggle-play>
              <ef-time-display></ef-time-display>
            </ef-controls>
          </ef-configuration>
        `;
        use(markup);
      },
      preview: async ({ container }, use) => {
        const preview = container.querySelector("ef-preview")!;
        await use(preview);
      },
      timegroup: async ({ container }, use) => {
        const timegroup = container.querySelector("ef-timegroup")!;
        await use(timegroup);
      },
      togglePlay: async ({ container }, use) => {
        const togglePlay = container.querySelector("ef-toggle-play")!;
        await use(togglePlay);
      },
      timeDisplay: async ({ container }, use) => {
        const timeDisplay = container.querySelector("ef-time-display")!;
        await use(timeDisplay);
      },
      configuration: async ({ container }, use) => {
        const configuration = container.querySelector("ef-configuration")!;
        await use(configuration);
      },
      controls: async ({ container }, use) => {
        const controls = container.querySelector("ef-controls")!;
        await use(controls);
      },
    });

    htmlTest(
      "can find and connect to target preview by ID",
      async ({ preview, controls, togglePlay }) => {
        expect(controls.targetElement).toBe(preview);
        expect(togglePlay.efContext).toBe(preview);
      },
    );
  });

  describe("context propagation", () => {
    const contextTest = test.extend<{
      context: EFControlsTestContext;
      controls: EFControls;
      togglePlay: EFTogglePlay;
      timeDisplay: EFTimeDisplay;
      configuration: EFConfiguration;
    }>({
      configuration: async ({}, use) => {
        const configuration = makeElement(
          "ef-configuration",
          {},
          document.body,
        );
        use(configuration);
      },
      context: async ({ configuration }, use) => {
        const context = makeElement(
          "ef-controls-test-context",
          { id: "test-preview" },
          configuration,
        );
        makeElement(
          "ef-timegroup",
          { mode: "fixed", duration: "10s" },
          context,
        );
        use(context);
      },
      controls: async ({ configuration }, use) => {
        const controls = makeElement(
          "ef-controls",
          { target: "test-preview" },
          configuration,
        );
        use(controls);
      },
      togglePlay: async ({ controls }, use) => {
        const togglePlay = makeElement("ef-toggle-play", {}, controls);
        use(togglePlay);
      },
      timeDisplay: async ({ controls }, use) => {
        const timeDisplay = makeElement("ef-time-display", {}, controls);
        use(timeDisplay);
      },
    });

    contextTest(
      "propagates changes to play state",
      async ({ context, controls, togglePlay }) => {
        context.play();
        await context.updateComplete;
        await controls.updateComplete;
        await togglePlay.updateComplete;
        expect(togglePlay.playing).toBe(true);
        context.pause();
      },
    );

    contextTest(
      "propagates changes from toggle play button",
      async ({ context, togglePlay }) => {
        context.play();
        await togglePlay.updateComplete;
        await context.updateComplete;
        expect(togglePlay.playing).toBe(true);
        togglePlay.click();
        await togglePlay.updateComplete;
        expect(context.playing).toBe(false);
      },
    );

    contextTest(
      "efContext is consumed by toggle-play",
      async ({ controls, context, togglePlay }) => {
        await togglePlay.updateComplete;
        expect(togglePlay.efContext).toBe(context);

        controls.setAttribute("target", "no-target");
        await togglePlay.updateComplete;
        expect(togglePlay.efContext).toBeNull();

        controls.setAttribute("target", "test-preview");
        await togglePlay.updateComplete;
        expect(togglePlay.efContext).toBe(context);
      },
    );

    contextTest(
      "propagates context from controls to toggle-play",
      async ({ context, controls, togglePlay }) => {
        context.play();
        await controls.updateComplete;
        await togglePlay.updateComplete;
        expect(togglePlay.efContext).toBe(context);

        // Pause before disconnecting to ensure clean state
        context.pause();
        await context.updateComplete;
        await togglePlay.updateComplete;

        controls.setAttribute("target", "no-target");
        // Wait for context changes to propagate through multiple cycles
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await controls.updateComplete;
        await togglePlay.updateComplete;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await controls.updateComplete;
        await togglePlay.updateComplete;
        expect(controls.targetElement).toBeNull();
        expect(togglePlay.efContext).toBeNull();
        expect(togglePlay.playing).toBe(false);
        // Test to ensure play context is no longer updated
        context.pause();
        await context.updateComplete;
        context.play();
        await context.updateComplete;
        await togglePlay.updateComplete;
        expect(togglePlay.playing).toBe(false);
      },
    );

    contextTest(
      "propagates changes to time display",
      async ({ context, timeDisplay }) => {
        await context.updateComplete;
        await timeDisplay.updateComplete;
        expect(timeDisplay.shadowRoot?.textContent?.trim()).toBe("0:00 / 0:10");

        const timegroup = context.querySelector("ef-timegroup");
        if (timegroup) {
          await timegroup.seek(1000);
        } else {
          context.currentTimeMs = 1000;
        }

        await new Promise((resolve) => requestAnimationFrame(resolve));
        await context.updateComplete;
        await timeDisplay.updateComplete;
        expect(timeDisplay.shadowRoot?.textContent?.trim()).toBe("0:01 / 0:10");
      },
    );
  });

  test("works with child control elements - EFTogglePlay", async () => {
    const preview = makeElement(
      "ef-controls-test-context",
      { id: "test-preview" },
      document.body,
    );
    makeElement("ef-timegroup", { mode: "fixed", duration: "10s" }, preview);

    const controls = makeElement(
      "ef-controls",
      { target: "test-preview" },
      document.body,
    );

    const togglePlay = makeElement("ef-toggle-play", {}, controls);

    // Wait for all elements to complete their updates
    await preview.updateComplete;
    await controls.updateComplete;
    await togglePlay.updateComplete;

    // The toggle play should be connected to the controls' context (which syncs with preview)
    expect((togglePlay as any).playing).toBe(false);

    // Test that clicking the toggle affects the preview
    preview.playing = true;
    await preview.updateComplete;
    await togglePlay.updateComplete;

    expect((togglePlay as any).playing).toBe(true);
  });

  describe("direct temporal element targeting", () => {
    test("can target ef-timegroup directly without ef-preview wrapper", async () => {
      // Create a standalone timegroup (not wrapped in ef-preview)
      const timegroup = makeElement(
        "ef-timegroup",
        { id: "direct-timegroup", mode: "fixed", duration: "10s" },
        document.body,
      );

      const controls = makeElement(
        "ef-controls",
        { target: "direct-timegroup" },
        document.body,
      );

      await timegroup.updateComplete;
      await controls.updateComplete;

      // Controls should find and connect to the timegroup
      expect(controls.targetElement).toBe(timegroup);
    });

    test("synchronizes playing state from direct timegroup to controls", async () => {
      const timegroup = makeElement(
        "ef-timegroup",
        { id: "direct-timegroup", mode: "fixed", duration: "10s" },
        document.body,
      );

      const controls = makeElement(
        "ef-controls",
        { target: "direct-timegroup" },
        document.body,
      );

      const togglePlay = makeElement("ef-toggle-play", {}, controls);

      // Wait for timegroup to fully initialize (playbackController is created async)
      await timegroup.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await timegroup.updateComplete;
      await controls.updateComplete;
      await togglePlay.updateComplete;
      // Wait for async subscription to complete
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await controls.updateComplete;

      // Initial state should be not playing
      expect(controls.playing).toBe(false);
      expect(togglePlay.playing).toBe(false);

      // Play the timegroup directly
      timegroup.play();
      await timegroup.updateComplete;
      await controls.updateComplete;
      await togglePlay.updateComplete;

      // Controls and child elements should reflect the playing state
      expect(controls.playing).toBe(true);
      expect(togglePlay.playing).toBe(true);

      // Pause
      timegroup.pause();
      await timegroup.updateComplete;
      await controls.updateComplete;
      await togglePlay.updateComplete;

      expect(controls.playing).toBe(false);
      expect(togglePlay.playing).toBe(false);
    });

    test("synchronizes currentTimeMs from direct timegroup to controls", async () => {
      const timegroup = makeElement(
        "ef-timegroup",
        { id: "direct-timegroup", mode: "fixed", duration: "10s" },
        document.body,
      );

      const controls = makeElement(
        "ef-controls",
        { target: "direct-timegroup" },
        document.body,
      );

      const timeDisplay = makeElement("ef-time-display", {}, controls);

      // Wait for timegroup to fully initialize
      await timegroup.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await timegroup.updateComplete;
      await controls.updateComplete;
      await timeDisplay.updateComplete;
      // Wait for async subscription to complete
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await controls.updateComplete;

      // Verify subscription is working by checking initial state
      expect(controls.targetTemporal).toBe(timegroup);

      // Seek the timegroup - seek() internally sets currentTimeMs and runs seekTask
      await timegroup.seek(5000);
      
      // Wait for PlaybackController's notification to propagate
      // The seekTask completes and notifies listeners before seek() returns,
      // but we need to wait for Lit's reactive update cycle
      await new Promise((resolve) => setTimeout(resolve, 50));
      await controls.updateComplete;
      await timeDisplay.updateComplete;

      // Controls should reflect the current time
      // Note: currentTimeMs from playbackController is quantized to frame boundaries
      expect(controls.currentTimeMs).toBe(5000);
    });

    test("synchronizes durationMs from direct timegroup to controls", async () => {
      const timegroup = makeElement(
        "ef-timegroup",
        { id: "direct-timegroup", mode: "fixed", duration: "10s" },
        document.body,
      );

      const controls = makeElement(
        "ef-controls",
        { target: "direct-timegroup" },
        document.body,
      );

      // Wait for timegroup to fully initialize
      await timegroup.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await timegroup.updateComplete;
      await controls.updateComplete;
      // Wait for async subscription to complete
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await controls.updateComplete;

      // Controls should have the correct duration
      expect(controls.durationMs).toBe(10000);
    });

    test("sets targetTemporal when targeting direct timegroup", async () => {
      const timegroup = makeElement(
        "ef-timegroup",
        { id: "direct-timegroup", mode: "fixed", duration: "10s" },
        document.body,
      );

      const controls = makeElement(
        "ef-controls",
        { target: "direct-timegroup" },
        document.body,
      );

      // Wait for timegroup to fully initialize
      await timegroup.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await timegroup.updateComplete;
      await controls.updateComplete;
      // Wait for async subscription to complete
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await controls.updateComplete;

      // targetTemporal should be set to the timegroup itself
      expect(controls.targetTemporal).toBe(timegroup);
    });

    test("controls can play/pause direct timegroup", async () => {
      const timegroup = makeElement(
        "ef-timegroup",
        { id: "direct-timegroup", mode: "fixed", duration: "10s" },
        document.body,
      );

      const controls = makeElement(
        "ef-controls",
        { target: "direct-timegroup" },
        document.body,
      );

      const togglePlay = makeElement("ef-toggle-play", {}, controls);

      // Wait for timegroup to fully initialize
      await timegroup.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await timegroup.updateComplete;
      await controls.updateComplete;
      await togglePlay.updateComplete;
      // Wait for async subscription to complete
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await controls.updateComplete;

      // Click toggle play to start playback
      togglePlay.click();
      await togglePlay.updateComplete;
      await controls.updateComplete;
      await timegroup.updateComplete;

      // Timegroup should now be playing
      expect(timegroup.playing).toBe(true);
      expect(controls.playing).toBe(true);

      // Click again to pause
      togglePlay.click();
      await togglePlay.updateComplete;
      await controls.updateComplete;
      await timegroup.updateComplete;

      expect(timegroup.playing).toBe(false);
      expect(controls.playing).toBe(false);
    });

    test("nested timegroup should NOT be targetable (no playbackController)", async () => {
      // Create a parent timegroup
      const parentTimegroup = makeElement(
        "ef-timegroup",
        { id: "parent-timegroup", mode: "fixed", duration: "20s" },
        document.body,
      );

      // Create a nested child timegroup inside the parent
      const childTimegroup = makeElement(
        "ef-timegroup",
        { id: "child-timegroup", mode: "fixed", duration: "10s" },
        parentTimegroup,
      );

      const controls = makeElement(
        "ef-controls",
        { target: "child-timegroup" },
        document.body,
      );

      await parentTimegroup.updateComplete;
      await childTimegroup.updateComplete;
      await controls.updateComplete;

      // Controls should find the element but it should NOT have playbackController
      // because nested temporal elements delegate to their root
      expect(controls.targetElement).toBe(childTimegroup);
      // Child should not have its own playbackController
      expect(childTimegroup.playbackController).toBeUndefined();
      // Therefore targetTemporal should be null (not a valid controllable)
      expect(controls.targetTemporal).toBeNull();
    });
  });
});
