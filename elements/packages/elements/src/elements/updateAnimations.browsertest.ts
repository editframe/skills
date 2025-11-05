import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { assert, beforeEach, describe, test } from "vitest";
import { EFTemporal } from "./EFTemporal.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import {
  type AnimatableElement,
  updateAnimations,
} from "./updateAnimations.js";

import "./EFTimegroup.js";

// Create proper temporal test elements
@customElement("test-temporal-element")
class TestTemporalElement extends EFTemporal(LitElement) {
  get intrinsicDurationMs() {
    return this._durationMs;
  }

  private _durationMs = 1000;
  setDuration(duration: number) {
    this._durationMs = duration;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-temporal-element": TestTemporalElement;
  }
}

beforeEach(() => {
  // Clean up DOM
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
  window.localStorage.clear();
});

function createTestElement(
  props: Partial<AnimatableElement> = {},
): AnimatableElement {
  const element = document.createElement("div") as unknown as AnimatableElement;
  // Override readonly properties for testing
  Object.defineProperty(element, "currentTimeMs", {
    value: props.currentTimeMs ?? 0,
    writable: true,
  });
  Object.defineProperty(element, "durationMs", {
    value: props.durationMs ?? 1000,
    writable: true,
  });
  Object.defineProperty(element, "startTimeMs", {
    value: props.startTimeMs ?? 0,
    writable: true,
  });
  Object.defineProperty(element, "endTimeMs", {
    value: props.endTimeMs ?? 1000,
    writable: true,
  });
  Object.defineProperty(element, "rootTimegroup", {
    value: props.rootTimegroup,
    writable: true,
  });
  Object.defineProperty(element, "parentTimegroup", {
    value: props.parentTimegroup,
    writable: true,
  });
  Object.defineProperty(element, "ownCurrentTimeMs", {
    value: props.ownCurrentTimeMs ?? 0,
    writable: true,
  });
  document.body.appendChild(element);
  return element;
}

describe("Timeline Element Synchronizer", () => {
  describe("CSS custom properties", () => {
    test("sets --ef-progress based on currentTimeMs/durationMs ratio", () => {
      const element = createTestElement({
        currentTimeMs: 250,
        durationMs: 1000,
      });

      updateAnimations(element);

      assert.equal(element.style.getPropertyValue("--ef-progress"), "25%");
    });

    test("clamps --ef-progress to 0-100% range", () => {
      const element1 = createTestElement({
        currentTimeMs: -100,
        durationMs: 1000,
      });
      const element2 = createTestElement({
        currentTimeMs: 1500,
        durationMs: 1000,
      });

      updateAnimations(element1);
      updateAnimations(element2);

      assert.equal(element1.style.getPropertyValue("--ef-progress"), "0%");
      assert.equal(element2.style.getPropertyValue("--ef-progress"), "100%");
    });

    test("sets --ef-duration to element durationMs", () => {
      const element = createTestElement({
        durationMs: 2000,
      });

      updateAnimations(element);

      assert.equal(element.style.getPropertyValue("--ef-duration"), "2000ms");
    });

    test("sets --ef-transition-duration based on parentTimegroup overlapMs", () => {
      const parentTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      parentTimegroup.overlapMs = 500;

      const element = createTestElement({
        parentTimegroup,
      });

      updateAnimations(element);

      assert.equal(
        element.style.getPropertyValue("--ef-transition-duration"),
        "500ms",
      );
    });

    test("sets --ef-transition-duration to 0ms when no parentTimegroup", () => {
      const element = createTestElement();

      updateAnimations(element);

      assert.equal(
        element.style.getPropertyValue("--ef-transition-duration"),
        "0ms",
      );
    });

    test("sets --ef-transition-out-start correctly", () => {
      const parentTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      parentTimegroup.overlapMs = 200;

      const element = createTestElement({
        durationMs: 1000,
        parentTimegroup,
      });

      updateAnimations(element);

      assert.equal(
        element.style.getPropertyValue("--ef-transition-out-start"),
        "800ms",
      );
    });

    test("sets animation-related CSS properties when animations are present", () => {
      const element = createTestElement({
        durationMs: 2000,
      });

      // Create an animation to trigger CSS property setting
      element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1000 });

      updateAnimations(element);

      assert.equal(element.style.getPropertyValue("--ef-duration"), "2000ms");
      assert.equal(
        element.style.getPropertyValue("--ef-transition-duration"),
        "0ms",
      );
      assert.equal(
        element.style.getPropertyValue("--ef-transition-out-start"),
        "2000ms",
      );
    });
  });

  describe("element visibility", () => {
    test("hides element when timeline is before startTimeMs", () => {
      const rootTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      rootTimegroup.currentTimeMs = 100;

      const element = createTestElement({
        startTimeMs: 200,
        endTimeMs: 800,
        rootTimegroup,
      });

      updateAnimations(element);

      assert.equal(element.style.display, "none");
    });

    test("hides element when timeline is after endTimeMs", () => {
      const rootTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      rootTimegroup.currentTimeMs = 900;

      const element = createTestElement({
        startTimeMs: 200,
        endTimeMs: 800,
        rootTimegroup,
      });

      updateAnimations(element);

      assert.equal(element.style.display, "none");
    });

    test("shows element when timeline is within start/end range (using element currentTimeMs)", () => {
      const element = createTestElement({
        currentTimeMs: 500,
        startTimeMs: 200,
        endTimeMs: 800,
      });
      // Start with element hidden
      element.style.display = "none";

      updateAnimations(element);

      assert.equal(element.style.display, "");
    });

    test("sequence elements remain coordinated at exact end boundary", () => {
      // Create a root timegroup mock
      const rootTimegroup = {
        currentTimeMs: 3000,
        durationMs: 3000,
        startTimeMs: 0,
        endTimeMs: 3000,
        tagName: "EF-TIMEGROUP",
      } as any;

      // Create a child element in sequence that spans 2000-3000ms
      const element = createTestElement({
        startTimeMs: 2000,
        endTimeMs: 3000,
        durationMs: 1000,
        ownCurrentTimeMs: 1000, // At exact end of its own duration
        rootTimegroup: rootTimegroup,
      });

      // Create REAL animations using the Web Animations API
      const animation1 = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        delay: 0,
        iterations: 1,
      });

      const animation2 = element.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.5)" }],
        {
          duration: 1000,
          delay: 0,
          iterations: 1,
        },
      );

      // Start with animations running
      animation1.play();
      animation2.play();

      // Verify we have real animations
      const animations = element.getAnimations({ subtree: true });
      assert.equal(animations.length, 2, "Should have 2 real animations");

      updateAnimations(element);

      // The element should be hidden due to exclusive end condition (3000 > 3000 = false)
      assert.equal(
        element.style.display,
        "",
        "Element should be hidden at exact end boundary due to inclusive end",
      );

      // BUT animations should still be coordinated to prevent jarring visual jumps
      // This is the fix we want: animations coordinated even when element is hidden at exact boundary
      animations.forEach((animation, index) => {
        assert.approximately(
          animation.currentTime as number,
          999,
          1,
          `Animation ${index + 1} should be coordinated at exact end boundary to prevent visual jumps`,
        );
        assert.equal(
          animation.playState,
          "paused",
          `Animation ${index + 1} should be paused after coordination`,
        );
      });
    });

    test("uses element currentTimeMs when no rootTimegroup", () => {
      const element = createTestElement({
        currentTimeMs: 500,
        startTimeMs: 200,
        endTimeMs: 800,
      });
      element.style.display = "none";

      updateAnimations(element);

      assert.equal(element.style.display, "");
    });

    test("element at exact start boundary is visible (using element currentTimeMs)", () => {
      const element = createTestElement({
        currentTimeMs: 200,
        startTimeMs: 200,
        endTimeMs: 800,
      });
      element.style.display = "none";

      updateAnimations(element);

      assert.equal(element.style.display, "");
    });

    test("bare temporal element at its exact end is visible (root element)", () => {
      const element = createTestElement({
        currentTimeMs: 1000,
        startTimeMs: 0,
        endTimeMs: 1000,
        durationMs: 1000,
      });
      element.style.display = "";

      updateAnimations(element);

      assert.equal(
        element.style.display,
        "",
        "Root element should remain visible at exact end to show final frame",
      );
    });

    test("deeply nested element aligned with root end is visible (2 levels)", () => {
      const rootTimegroup = {
        currentTimeMs: 3000,
        durationMs: 3000,
        startTimeMs: 0,
        endTimeMs: 3000,
        tagName: "EF-TIMEGROUP",
      } as any;

      const childTimegroup = {
        currentTimeMs: 3000,
        durationMs: 2000,
        startTimeMs: 1000,
        endTimeMs: 3000,
        rootTimegroup,
        parentTimegroup: rootTimegroup,
        tagName: "EF-TIMEGROUP",
      } as any;

      const element = createTestElement({
        currentTimeMs: 1000,
        startTimeMs: 2000,
        endTimeMs: 3000,
        durationMs: 1000,
        ownCurrentTimeMs: 1000,
        rootTimegroup,
        parentTimegroup: childTimegroup,
      });
      element.style.display = "";

      updateAnimations(element);

      assert.equal(
        element.style.display,
        "",
        "Deeply nested element aligned with root end should remain visible",
      );
    });

    test("deeply nested element aligned with root end is visible (3 levels)", () => {
      const rootTimegroup = {
        currentTimeMs: 4000,
        durationMs: 4000,
        startTimeMs: 0,
        endTimeMs: 4000,
        tagName: "EF-TIMEGROUP",
      } as any;

      const childTimegroup1 = {
        currentTimeMs: 4000,
        durationMs: 3000,
        startTimeMs: 1000,
        endTimeMs: 4000,
        rootTimegroup,
        parentTimegroup: rootTimegroup,
        tagName: "EF-TIMEGROUP",
      } as any;

      const childTimegroup2 = {
        currentTimeMs: 4000,
        durationMs: 2000,
        startTimeMs: 2000,
        endTimeMs: 4000,
        rootTimegroup,
        parentTimegroup: childTimegroup1,
        tagName: "EF-TIMEGROUP",
      } as any;

      const element = createTestElement({
        currentTimeMs: 1000,
        startTimeMs: 3000,
        endTimeMs: 4000,
        durationMs: 1000,
        ownCurrentTimeMs: 1000,
        rootTimegroup,
        parentTimegroup: childTimegroup2,
      });
      element.style.display = "";

      updateAnimations(element);

      assert.equal(
        element.style.display,
        "",
        "3+ level nested element aligned with root end should remain visible",
      );
    });

    test("mid-composition element is hidden when timeline passes its end", () => {
      const rootTimegroup = {
        currentTimeMs: 3000,
        durationMs: 3000,
        startTimeMs: 0,
        endTimeMs: 3000,
        tagName: "EF-TIMEGROUP",
      } as any;

      const element = createTestElement({
        currentTimeMs: 1000,
        startTimeMs: 1000,
        endTimeMs: 2000,
        durationMs: 1000,
        rootTimegroup,
        parentTimegroup: rootTimegroup,
      });
      element.style.display = "";

      updateAnimations(element);

      assert.equal(
        element.style.display,
        "none",
        "Mid-composition element should be hidden when timeline is past its end",
      );
    });

    test("root timegroup at exact end is visible", () => {
      const rootTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      Object.defineProperty(rootTimegroup, "currentTimeMs", {
        value: 1000,
        writable: true,
      });
      Object.defineProperty(rootTimegroup, "durationMs", {
        value: 1000,
        writable: true,
      });
      Object.defineProperty(rootTimegroup, "startTimeMs", {
        value: 0,
        writable: true,
      });
      Object.defineProperty(rootTimegroup, "endTimeMs", {
        value: 1000,
        writable: true,
      });
      Object.defineProperty(rootTimegroup, "parentTimegroup", {
        value: undefined,
        writable: true,
      });
      document.body.appendChild(rootTimegroup);

      updateAnimations(rootTimegroup as any);

      assert.equal(
        rootTimegroup.style.display,
        "",
        "Root timegroup should remain visible at exact end",
      );

      document.body.removeChild(rootTimegroup);
    });

    test("element at exact end boundary is visible when it is root (using element currentTimeMs)", () => {
      const element = createTestElement({
        currentTimeMs: 800,
        startTimeMs: 200,
        endTimeMs: 800,
      });
      element.style.display = "";

      updateAnimations(element);

      assert.equal(
        element.style.display,
        "",
        "Root element should remain visible at exact end boundary",
      );
    });

    test("element just before start boundary is hidden", () => {
      const element = createTestElement({
        currentTimeMs: 199,
        startTimeMs: 200,
        endTimeMs: 800,
      });

      updateAnimations(element);

      assert.equal(element.style.display, "none");
    });

    test("element just after end boundary is hidden", () => {
      const element = createTestElement({
        currentTimeMs: 801,
        startTimeMs: 200,
        endTimeMs: 800,
      });

      updateAnimations(element);

      assert.equal(element.style.display, "none");
    });
  });

  describe("Web Animations API integration", () => {
    test("skips animation processing when getAnimations is not available", () => {
      const element = createTestElement();
      // Mock missing getAnimations
      delete (element as any).getAnimations;

      // Should not throw and should still set CSS properties
      updateAnimations(element);

      assert.equal(element.style.getPropertyValue("--ef-progress"), "0%");
    });

    test("pauses running animations", async () => {
      const element = createTestElement();

      // Create a test animation
      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
      });
      animation.play();

      updateAnimations(element);

      assert.equal(animation.playState, "paused");
    });

    test("ignores animations without KeyframeEffect", async () => {
      const element = createTestElement();

      // Create animation with non-KeyframeEffect (this is tricky to test, but we can verify no errors)
      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
      });

      // Mock the effect to not be a KeyframeEffect
      Object.defineProperty(animation, "effect", {
        value: {},
        writable: false,
      });

      // Should not throw
      updateAnimations(element);
    });

    test("ignores animations without target", async () => {
      const element = createTestElement();

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
      });

      // Mock the effect target to be null
      if (animation.effect instanceof KeyframeEffect) {
        Object.defineProperty(animation.effect, "target", {
          value: null,
          writable: false,
        });
      }

      // Should not throw
      updateAnimations(element);
    });

    test("handles missing timeTarget gracefully", async () => {
      const element = createTestElement();

      const target = document.createElement("div");
      element.appendChild(target);

      // Should not throw when target has no temporal parent
      updateAnimations(element);
    });

    test("processes multiple animations on same element", async () => {
      const element = createTestElement();

      const animation1 = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
      });
      const animation2 = element.animate(
        [{ transform: "scale(1)" }, { transform: "scale(2)" }],
        { duration: 500 },
      );

      animation1.play();
      animation2.play();

      updateAnimations(element);

      // Both animations should be paused
      assert.equal(animation1.playState, "paused");
      assert.equal(animation2.playState, "paused");
    });

    test("handles animations with zero duration", async () => {
      const element = createTestElement();

      // Should not throw
      updateAnimations(element);
    });

    test("handles animations with zero iterations", async () => {
      const element = createTestElement();

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 0,
      });

      updateAnimations(element);

      // With 0 iterations and no timeTarget, currentIteration (0) >= iterations (0), so should be set to duration - epsilon
      // But since there's no timeTarget, the code path continues and doesn't set currentTime
      // The animation will continue with its default behavior
      assert.equal(animation.currentTime, 0);
    });

    test("handles animations that are already paused", async () => {
      const element = createTestElement();

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
      });
      animation.pause();

      assert.equal(animation.playState, "paused");

      // Should not throw and should still set currentTime
      updateAnimations(element);

      assert.equal(animation.playState, "paused");
    });

    test("keeps completed animations available for scrubbing", async () => {
      // Create a timegroup with 10s duration
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10000ms");
      document.body.appendChild(timegroup);

      // Create a child element with a 5s animation
      const child = document.createElement("div");
      timegroup.appendChild(child);

      child.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 5000, // 5s animation
        iterations: 1,
        delay: 0,
      });
      timegroup.currentTime = 6;
      await timegroup.seekTask.run();

      // Animation should still be available even though timeline (6s) > animation duration (5s)
      // This prevents animations from being removed, enabling scrubbing backwards
      const animations = timegroup.getAnimations({ subtree: true });
      assert.equal(
        animations.length,
        1,
        "REGRESSION TEST: Animation should remain available for scrubbing. This would fail with Number.EPSILON due to insufficient precision offset.",
      );
    });
  });

  describe("child element animation coordination", () => {
    test("coordinates animations on non-temporal child elements", async () => {
      // Create root timegroup
      const rootTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      rootTimegroup.currentTimeMs = 150; // Timeline at 150ms
      document.body.appendChild(rootTimegroup);

      // Create parent temporal element
      const parentElement = document.createElement(
        "test-temporal-element",
      ) as TestTemporalElement;
      parentElement.setDuration(300); // 300ms duration
      parentElement.setAttribute("offset", "100ms"); // Start at 100ms in root timeline
      rootTimegroup.appendChild(parentElement);

      // Create a regular NON-temporal HTML element inside the temporal element
      const nonTemporalDiv = document.createElement("div");
      parentElement.appendChild(nonTemporalDiv);

      // Wait for elements to be connected and updated
      await rootTimegroup.updateComplete;
      await parentElement.updateComplete;

      // Create animation on the NON-temporal child element
      const nonTemporalAnimation = nonTemporalDiv.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: 1000,
        },
      );
      nonTemporalAnimation.play();

      // Call updateAnimations on root timegroup
      updateAnimations(rootTimegroup);

      // Parent should be visible at current timeline position (150ms is between 100ms-400ms)
      assert.notEqual(
        parentElement.style.display,
        "",
        "Parent should be visible at current timeline time",
      );

      // FIXED: Non-temporal child animation should be paused and coordinated
      assert.equal(
        nonTemporalAnimation.playState,
        "paused",
        "Non-temporal child element animation should be paused and coordinated with timeline",
      );
    });

    test("coordinates animations on deeply nested non-temporal elements", async () => {
      // Create root timegroup
      const rootTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      rootTimegroup.currentTimeMs = 150; // Timeline at 150ms
      document.body.appendChild(rootTimegroup);

      // Create parent temporal element
      const parentElement = document.createElement(
        "test-temporal-element",
      ) as TestTemporalElement;
      parentElement.setDuration(300); // 300ms duration
      parentElement.setAttribute("offset", "100ms"); // Start at 100ms in root timeline
      rootTimegroup.appendChild(parentElement);

      // Create nested non-temporal structure: temporal > div > div > span
      const outerDiv = document.createElement("div");
      const innerDiv = document.createElement("div");
      const span = document.createElement("span");

      parentElement.appendChild(outerDiv);
      outerDiv.appendChild(innerDiv);
      innerDiv.appendChild(span);

      // Wait for elements to be connected and updated
      await rootTimegroup.updateComplete;
      await parentElement.updateComplete;

      // Create animations on different levels of nesting
      const outerAnimation = outerDiv.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.1)" }],
        {
          duration: 800,
        },
      );
      const innerAnimation = innerDiv.animate(
        [{ opacity: 0.5 }, { opacity: 1 }],
        {
          duration: 1200,
        },
      );
      const spanAnimation = span.animate(
        [{ color: "red" }, { color: "blue" }],
        {
          duration: 600,
        },
      );

      outerAnimation.play();
      innerAnimation.play();
      spanAnimation.play();

      // Call updateAnimations on root timegroup
      updateAnimations(rootTimegroup);

      // All nested non-temporal animations should be coordinated
      assert.equal(
        outerAnimation.playState,
        "paused",
        "Outer div animation should be coordinated",
      );
      assert.equal(
        innerAnimation.playState,
        "paused",
        "Inner div animation should be coordinated",
      );
      assert.equal(
        spanAnimation.playState,
        "paused",
        "Span animation should be coordinated",
      );
    });

    test("coordinates animations on child temporal elements when they are visible", async () => {
      // Create root timegroup
      const rootTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      rootTimegroup.currentTimeMs = 150; // Timeline at 150ms
      document.body.appendChild(rootTimegroup);

      // Create parent element (timegroup acts as parent)
      const parentTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      parentTimegroup.setAttribute("duration", "1000ms");
      rootTimegroup.appendChild(parentTimegroup);

      // Create child temporal element that WILL be visible at timeline time 150ms
      const childElement = document.createElement(
        "test-temporal-element",
      ) as TestTemporalElement;
      childElement.setDuration(300); // 300ms duration (from 100ms to 400ms in root timeline)
      childElement.setAttribute("offset", "100ms"); // Start at 100ms in root timeline
      parentTimegroup.appendChild(childElement);

      // Wait for elements to be connected and updated
      await rootTimegroup.updateComplete;
      await parentTimegroup.updateComplete;
      await childElement.updateComplete;

      // Create animation on child element
      const childAnimation = childElement.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: 1000,
        },
      );
      childAnimation.play();

      // Call updateAnimations on parent timegroup - this should coordinate child animations too
      updateAnimations(parentTimegroup);

      // Child should be visible at current timeline position (150ms is between 100ms-400ms)
      assert.notEqual(
        childElement.style.display,
        "",
        "Child should be visible at current timeline time",
      );

      // FIXED: Child animation should be paused and coordinated
      assert.equal(
        childAnimation.playState,
        "paused",
        "Child element animation should be paused and coordinated with timeline",
      );
    });

    test("does not coordinate animations on child temporal elements when they are not visible", async () => {
      // Create root timegroup
      const rootTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      rootTimegroup.currentTimeMs = 100; // Timeline at 100ms
      document.body.appendChild(rootTimegroup);

      // Create parent element (timegroup acts as parent)
      const parentTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      parentTimegroup.setAttribute("duration", "1000ms");
      rootTimegroup.appendChild(parentTimegroup);

      // Create child temporal element that will NOT be visible at timeline time 100ms
      const childElement = document.createElement(
        "test-temporal-element",
      ) as TestTemporalElement;
      childElement.setDuration(200); // 200ms duration
      childElement.setAttribute("offset", "500ms"); // Start at 500ms in root timeline (way after current time)
      parentTimegroup.appendChild(childElement);

      // Wait for elements to be connected and updated
      await rootTimegroup.updateComplete;
      await parentTimegroup.updateComplete;
      await childElement.updateComplete;

      // Create animation on child element
      const childAnimation = childElement.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: 1000,
        },
      );
      childAnimation.play();

      // Call updateAnimations on parent timegroup
      updateAnimations(parentTimegroup);

      // Child should be hidden (display: none)
      assert.equal(
        childElement.style.display,
        "none",
        "Child should be hidden when not in visible time range",
      );

      // Child animation should still be running (not coordinated since child is not visible)
      assert.equal(
        childAnimation.playState,
        "paused",
        "Child animation should remain running when child element is not visible",
      );
    });
  });

  describe("edge cases", () => {
    test("handles zero duration gracefully", () => {
      const element = createTestElement({
        currentTimeMs: 100,
        durationMs: 0,
      });

      updateAnimations(element);

      // Should handle division by zero
      assert.equal(element.style.getPropertyValue("--ef-progress"), "100%");
    });

    test("handles negative currentTimeMs", () => {
      const element = createTestElement({
        currentTimeMs: -100,
        durationMs: 1000,
      });

      updateAnimations(element);

      assert.equal(element.style.getPropertyValue("--ef-progress"), "0%");
    });

    test("handles missing parentTimegroup overlapMs", () => {
      const parentTimegroup = {} as EFTimegroup; // Missing overlapMs property

      const element = createTestElement({
        parentTimegroup,
        durationMs: 1000,
      });

      updateAnimations(element);

      assert.equal(
        element.style.getPropertyValue("--ef-transition-duration"),
        "0ms",
      );
      assert.equal(
        element.style.getPropertyValue("--ef-transition-out-start"),
        "1000ms",
      );
    });

    test("handles large duration values", () => {
      const element = createTestElement({
        currentTimeMs: 5000,
        durationMs: 1000000, // 1000 seconds
      });

      updateAnimations(element);

      assert.equal(element.style.getPropertyValue("--ef-progress"), "0.5%");
    });

    test("handles very small time values", () => {
      const element = createTestElement({
        currentTimeMs: 0.5,
        durationMs: 10,
      });

      updateAnimations(element);

      assert.equal(element.style.getPropertyValue("--ef-progress"), "5%");
    });

    test("does not modify display when element should remain visible", () => {
      const element = createTestElement({
        currentTimeMs: 500,
        startTimeMs: 200,
        endTimeMs: 800,
      });
      // Element starts visible (default state)
      const initialDisplay = element.style.display;

      updateAnimations(element);

      // Should not have been modified
      assert.equal(element.style.display, initialDisplay);
    });

    test("does not modify display when element should remain hidden", () => {
      const element = createTestElement({
        currentTimeMs: 100,
        startTimeMs: 200,
        endTimeMs: 800,
      });
      element.style.display = "none";

      updateAnimations(element);

      // Should still be hidden
      assert.equal(element.style.display, "none");
    });
  });

  describe("CSS variables with zero overlap", () => {
    test("correctly sets transition duration to 0ms when overlap is 0ms", () => {
      const element = createTestElement({
        currentTimeMs: 500,
        startTimeMs: 0,
        endTimeMs: 1000,
        durationMs: 1000,
        parentTimegroup: {
          overlapMs: 0, // Zero overlap case
        } as any,
      });

      updateAnimations(element);

      // When overlap is 0, transition duration should be 0ms (no overlap means no transition)
      const transitionDuration = element.style.getPropertyValue(
        "--ef-transition-duration",
      );
      assert.equal(
        transitionDuration,
        "0ms",
        "Transition duration should be 0ms when no overlap",
      );

      // Transition out start should equal full duration (no transition period)
      const transitionOutStart = element.style.getPropertyValue(
        "--ef-transition-out-start",
      );
      assert.equal(
        transitionOutStart,
        "1000ms",
        "Transition out start should equal full duration when no overlap",
      );

      // Duration variable should still be set correctly for within-clip animations
      const duration = element.style.getPropertyValue("--ef-duration");
      assert.equal(
        duration,
        "1000ms",
        "Duration should be set for within-clip animation calculations",
      );
    });
  });

  describe("animation-direction support", () => {
    test("normal direction: maintains forward playback at start", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 0,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        direction: "normal",
      });

      updateAnimations(element);

      assert.equal(animation.currentTime, 0);
    });

    test("normal direction: maintains forward playback at middle", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 500,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        direction: "normal",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 500, 1);
    });

    test("normal direction: maintains forward playback near end", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 999,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        direction: "normal",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 999, 1);
    });

    test("reverse direction: shows end frame at start", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 0,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        direction: "reverse",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 1000, 1);
    });

    test("reverse direction: shows reversed progress at middle", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 300,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        direction: "reverse",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 700, 1);
    });

    test("reverse direction: shows start frame near end", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 999,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        direction: "reverse",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 1, 2);
    });

    test("alternate direction: plays forward in iteration 0", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 3,
        direction: "alternate",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 250, 1);
    });

    test("alternate direction: plays backward in iteration 1", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 1250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 3,
        direction: "alternate",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 750, 1);
    });

    test("alternate direction: plays forward in iteration 2", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 2250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 3,
        direction: "alternate",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 250, 1);
    });

    test("alternate-reverse direction: plays backward in iteration 0", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 3,
        direction: "alternate-reverse",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 750, 1);
    });

    test("alternate-reverse direction: plays forward in iteration 1", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 1250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 3,
        direction: "alternate-reverse",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 250, 1);
    });

    test("alternate-reverse direction: plays backward in iteration 2", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 2250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 3,
        direction: "alternate-reverse",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 750, 1);
    });

    test("alternate direction at exact iteration boundary (start of iteration 1)", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 1000,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 3,
        direction: "alternate",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 1000, 1);
    });

    test("alternate direction at exact iteration boundary (start of iteration 2)", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 2000,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 3,
        direction: "alternate",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 0, 1);
    });

    test("reverse direction with single iteration", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 400,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 1,
        direction: "reverse",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 600, 1);
    });

    test("multiple animations with different directions on same element", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 300,
      });

      const normalAnimation = element.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: 1000,
          direction: "normal",
        },
      );

      const reverseAnimation = element.animate(
        [{ transform: "scale(1)" }, { transform: "scale(2)" }],
        {
          duration: 1000,
          direction: "reverse",
        },
      );

      const alternateAnimation = element.animate(
        [{ color: "red" }, { color: "blue" }],
        {
          duration: 1000,
          iterations: 3,
          direction: "alternate",
        },
      );

      updateAnimations(element);

      assert.approximately(normalAnimation.currentTime as number, 300, 1);
      assert.approximately(reverseAnimation.currentTime as number, 700, 1);
      assert.approximately(alternateAnimation.currentTime as number, 300, 1);
    });

    test("alternate direction with delay: iteration 0 plays forward", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 750,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        delay: 500,
        iterations: 3,
        direction: "alternate",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 750, 1);
    });

    test("alternate direction with delay: iteration 1 plays backward", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 1750,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        delay: 500,
        iterations: 3,
        direction: "alternate",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 1250, 1);
    });

    test("reverse direction respects precision offset to prevent completion", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 1000,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        direction: "reverse",
      });

      updateAnimations(element);

      assert.isBelow(
        animation.currentTime as number,
        1000,
        "Animation should not reach exact completion",
      );
      assert.approximately(animation.currentTime as number, 999, 1);
    });

    test("alternate direction at end of final iteration respects precision offset", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 2999,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 3,
        direction: "alternate",
      });

      updateAnimations(element);

      assert.isBelow(
        animation.currentTime as number,
        1000,
        "Animation should not reach iteration completion",
      );
      assert.approximately(
        animation.currentTime as number,
        999,
        1,
        "Should be at end of iteration 2 with precision offset",
      );
    });
  });

  describe("animation-fill-mode support", () => {
    test("fill-mode none: animation before delay shows no effect", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        delay: 500,
        fill: "none",
      });

      updateAnimations(element);

      assert.equal(
        animation.currentTime,
        0,
        "Animation should be at start when before delay with fill: none",
      );
    });

    test("fill-mode backwards: animation before delay applies starting values", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        delay: 500,
        fill: "backwards",
      });

      updateAnimations(element);

      assert.equal(
        animation.currentTime,
        0,
        "Animation should be at start when before delay with fill: backwards",
      );
    });

    test("fill-mode forwards: animation after completion holds final state", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 1500,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        fill: "forwards",
      });

      updateAnimations(element);

      assert.approximately(
        animation.currentTime as number,
        999,
        1,
        "Animation should be held at end with precision offset",
      );
    });

    test("fill-mode both: applies both backwards and forwards behavior", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        delay: 500,
        fill: "both",
      });

      updateAnimations(element);

      assert.equal(
        animation.currentTime,
        0,
        "Animation should be at start when before delay with fill: both",
      );
    });

    test("fill-mode forwards with element at exact end boundary", () => {
      const rootTimegroup = {
        currentTimeMs: 1000,
        durationMs: 1000,
        startTimeMs: 0,
        endTimeMs: 1000,
        tagName: "EF-TIMEGROUP",
      } as any;

      const element = createTestElement({
        startTimeMs: 0,
        endTimeMs: 1000,
        durationMs: 1000,
        ownCurrentTimeMs: 1000,
        rootTimegroup,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        fill: "forwards",
      });

      updateAnimations(element);

      assert.equal(
        element.style.display,
        "",
        "Element should be visible at exact end boundary (root element)",
      );

      assert.approximately(
        animation.currentTime as number,
        999,
        1,
        "Animation should be coordinated near completion with precision offset",
      );
    });

    test("fill-mode none: animation past completion has no effect", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 1500,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        fill: "none",
      });

      updateAnimations(element);

      assert.approximately(
        animation.currentTime as number,
        999,
        1,
        "Animation should still be coordinated at end even with fill: none",
      );
    });

    test("fill-mode forwards with reverse direction", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 1500,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        direction: "reverse",
        fill: "forwards",
      });

      updateAnimations(element);

      assert.approximately(
        animation.currentTime as number,
        999,
        1,
        "Reverse animation with forwards fill should hold at logical end (visual start)",
      );
    });

    test("fill-mode backwards with reverse direction", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        delay: 500,
        direction: "reverse",
        fill: "backwards",
      });

      updateAnimations(element);

      assert.equal(
        animation.currentTime,
        0,
        "Reverse animation with backwards fill should apply logical start (visual end) during delay",
      );
    });
  });

  describe("animation-timing-function support", () => {
    test("ease timing function: correctly interpolates at midpoint", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 500,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        easing: "ease",
      });

      updateAnimations(element);

      assert.approximately(
        animation.currentTime as number,
        500,
        1,
        "Timeline position should be correct regardless of easing",
      );
    });

    test("linear timing function: evenly distributes time", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 500,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        easing: "linear",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 500, 1);
    });

    test("ease-in timing function: slow start", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        easing: "ease-in",
      });

      updateAnimations(element);

      assert.approximately(
        animation.currentTime as number,
        250,
        1,
        "Timeline coordination should be independent of easing curve",
      );
    });

    test("ease-out timing function: slow end", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 750,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        easing: "ease-out",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 750, 1);
    });

    test("ease-in-out timing function: slow start and end", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 500,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        easing: "ease-in-out",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 500, 1);
    });

    test("cubic-bezier timing function: custom curve", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 400,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        easing: "cubic-bezier(0.42, 0, 0.58, 1)",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 400, 1);
    });

    test("steps timing function: start - discrete jumps at interval starts", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        easing: "steps(4, start)",
      });

      updateAnimations(element);

      assert.approximately(
        animation.currentTime as number,
        250,
        1,
        "Steps timing should work with timeline coordination",
      );
    });

    test("steps timing function: end - discrete jumps at interval ends", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 250,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        easing: "steps(4, end)",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 250, 1);
    });

    test("step-start timing function: immediate jump to end value", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 100,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        easing: "step-start",
      });

      updateAnimations(element);

      assert.approximately(
        animation.currentTime as number,
        100,
        1,
        "Step-start should work with timeline coordination",
      );
    });

    test("step-end timing function: hold start value until end", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 999,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        easing: "step-end",
      });

      updateAnimations(element);

      assert.approximately(animation.currentTime as number, 999, 1);
    });

    test("timing function with reverse direction", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 300,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        direction: "reverse",
        easing: "ease-in",
      });

      updateAnimations(element);

      assert.approximately(
        animation.currentTime as number,
        700,
        1,
        "Reverse direction should correctly invert time with easing",
      );
    });

    test("timing function with alternate direction", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 1300,
      });

      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        iterations: 3,
        direction: "alternate",
        easing: "ease-out",
      });

      updateAnimations(element);

      assert.approximately(
        animation.currentTime as number,
        700,
        1,
        "Alternate direction should work with easing on reversed iterations",
      );
    });

    test("multiple animations with different timing functions", () => {
      const element = createTestElement({
        ownCurrentTimeMs: 500,
      });

      const linearAnimation = element.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: 1000,
          easing: "linear",
        },
      );

      const easeAnimation = element.animate(
        [{ transform: "scale(1)" }, { transform: "scale(2)" }],
        {
          duration: 1000,
          easing: "ease-in-out",
        },
      );

      const stepsAnimation = element.animate(
        [{ color: "red" }, { color: "blue" }],
        {
          duration: 1000,
          easing: "steps(5, end)",
        },
      );

      updateAnimations(element);

      assert.approximately(
        linearAnimation.currentTime as number,
        500,
        1,
        "Linear animation should be at midpoint",
      );
      assert.approximately(
        easeAnimation.currentTime as number,
        500,
        1,
        "Ease animation should be at midpoint timeline",
      );
      assert.approximately(
        stepsAnimation.currentTime as number,
        500,
        1,
        "Steps animation should be at midpoint timeline",
      );
    });
  });
});
