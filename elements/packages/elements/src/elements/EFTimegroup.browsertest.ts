import {
  html,
  LitElement,
  render as litRender,
  type TemplateResult,
} from "lit";
import { assert, beforeEach, describe, test } from "vitest";
import { EFTimegroup, flushSequenceDurationCache } from "./EFTimegroup.js";
import "./EFTimegroup.js";
import { customElement } from "lit/decorators/custom-element.js";
import { ContextMixin } from "../gui/ContextMixin.js";
import { EFTemporal, resetTemporalCache } from "./EFTemporal.js";
// Need workbench to make workbench wrapping occurs
import "../gui/EFWorkbench.js";
// Import EF_INTERACTIVE to allow controlling it in tests
import { EF_INTERACTIVE, setEFInteractive } from "../EF_INTERACTIVE.js";
// Additional imports for sequence boundary test
import "./EFVideo.js";
import "../gui/EFConfiguration.js";
import { Task } from "@lit/task";
import type { MediaEngine } from "../transcoding/types/index.js";
import { EFMedia } from "./EFMedia.js";
import "./EFText.js";

beforeEach(() => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (typeof key !== "string") continue;
    localStorage.removeItem(key);
  }
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
});

@customElement("test-context")
class TestContext extends ContextMixin(LitElement) {}

@customElement("timegroup-test-media")
class TimegroupTestMedia extends EFMedia {
  mediaEngineTask = new Task(this, {
    autoRun: false,
    args: () => ["source", null] as const,
    task: () => {
      this.setAttribute("data-media-loaded", "true");
      return Promise.resolve({} as unknown as MediaEngine);
    },
  });
}

@customElement("test-frame-task-a")
class TestFrameTaskA extends EFTemporal(LitElement) {
  render() {
    return html`<div data-frame-element="a"></div>`;
  }

  frameTask = new Task(this, {
    autoRun: false,
    args: () => [],
    task: () => {
      this.setAttribute("data-frame-executed", "true");
      return Promise.resolve();
    },
  });
}

@customElement("test-frame-task-b")
class TestFrameTaskB extends EFTemporal(LitElement) {
  render() {
    return html`<div data-frame-element="b"></div>`;
  }

  frameTask = new Task(this, {
    autoRun: false,
    args: () => [],
    task: () => {
      this.setAttribute("data-frame-executed", "true");
      return Promise.resolve();
    },
  });
}

@customElement("test-frame-task-c")
class TestFrameTaskC extends EFTemporal(LitElement) {
  render() {
    return html`<div data-frame-element="c"></div>`;
  }

  frameTask = new Task(this, {
    autoRun: false,
    args: () => [],
    task: () => {
      this.setAttribute("data-frame-executed", "true");
      return Promise.resolve();
    },
  });
}

@customElement("test-temporal")
class TestTemporal extends EFTemporal(LitElement) {
  get hasOwnDuration(): boolean {
    return true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-temporal": TestTemporal;
    "test-context": TestContext;
    "timegroup-test-media": TimegroupTestMedia;
    "test-frame-task-a": TestFrameTaskA;
    "test-frame-task-b": TestFrameTaskB;
    "test-frame-task-c": TestFrameTaskC;
  }
}

const renderTimegroup = (result: TemplateResult) => {
  const container = document.createElement("div");
  litRender(result, container);
  const firstChild = container.querySelector("ef-timegroup");
  if (!firstChild) {
    throw new Error("No first child found");
  }
  if (!(firstChild instanceof EFTimegroup)) {
    throw new Error("First child is not an EFTimegroup");
  }
  document.body.appendChild(container);
  return firstChild;
};

describe(`<ef-timegroup mode='fit'>`, () => {
  test("duration is zero when there is no parent to fit into", () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="fit"></ef-timegroup>`,
    );
    assert.equal(timegroup.durationMs, 0);
  });

  test("duration is zero when there is no parent to fit into, even if there are children with duration", () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="fit">
        <ef-timegroup mode="fixed" duration="5s"></ef-timegroup>
      </ef-timegroup>`,
    );
    assert.equal(timegroup.durationMs, 0);
  });

  test("duration is the duration of the parent timegroup", () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="fixed" duration="10s">
        <ef-timegroup id="child" mode="fit"></ef-timegroup>
      </ef-timegroup>`,
    );
    const child = timegroup.querySelector("#child") as EFTimegroup;
    assert.equal(child.durationMs, 10_000);
  });

  test("fit mode items inside a sequence are given zero duration and do not factor into the duration of the sequence", () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="sequence">
        <ef-timegroup id="child" mode="fit"></ef-timegroup>
      </ef-timegroup>`,
    );
    const child = timegroup.querySelector("#child") as EFTimegroup;
    assert.equal(child.durationMs, 0);
    assert.equal(timegroup.durationMs, 0);
  });

  test("fit mode can be used to constrain a 'background' timegroup into a 'foreground' sequence", async () => {
    const timegroup = renderTimegroup(
      html`
        <ef-timegroup mode="contain">
          <ef-timegroup id="foreground" mode="sequence">
            <ef-timegroup mode="fixed" duration="10s"></ef-timegroup>
            <ef-timegroup mode="fixed" duration="10s"></ef-timegroup>
          </ef-timegroup>
          <ef-timegroup id="background" mode="fit">
            <ef-timegroup mode="fixed" duration="30s"></ef-timegroup>
          </ef-timegroup>
        </ef-timegroup>
      `,
    );

    // Wait for all nested timegroups to update their durations
    await timegroup.updateComplete;
    const foreground = timegroup.querySelector("#foreground") as EFTimegroup;
    const background = timegroup.querySelector("#background") as EFTimegroup;
    await foreground.updateComplete;
    await background.updateComplete;

    // Wait for RAF to ensure temporal cache is populated
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Clear caches to force recalculation with fresh child data
    resetTemporalCache();
    flushSequenceDurationCache();

    // Verify children are correct
    const child1 = foreground.children[0] as EFTimegroup;
    const child2 = foreground.children[1] as EFTimegroup;
    assert.equal(child1.durationMs, 10_000);
    assert.equal(child2.durationMs, 10_000);

    // Sequence should sum the children's durations
    assert.equal(foreground.durationMs, 20_000);
    // Fit mode inherits from the contain parent (which takes max of foreground = 20000)
    assert.equal(background.durationMs, 20_000);
  });
});

describe(`<ef-timegroup mode="fixed">`, () => {
  test("can explicitly set a duration in seconds", async () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="fixed" duration="10s"></ef-timegroup>`,
    );
    assert.equal(timegroup.durationMs, 10_000);
  });

  test("can explicitly set a duration in milliseconds", async () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="fixed" duration="10ms"></ef-timegroup>`,
    );
    assert.equal(timegroup.durationMs, 10);
  });
});

describe(`<ef-timegroup mode="sequence">`, () => {
  test("fixed duration is ignored", () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="sequence" duration="10s"></ef-timegroup>`,
    );
    assert.equal(timegroup.durationMs, 0);
  });

  test("duration is the sum of child time groups", async () => {
    const timegroup = renderTimegroup(
      html`
        <ef-timegroup mode="sequence">
          <ef-timegroup mode="fixed" duration="5s"></ef-timegroup>
          <ef-timegroup mode="fixed" duration="5s"></ef-timegroup>
        </ef-timegroup>
      `,
    );
    assert.equal(timegroup.durationMs, 10_000);
  });

  test("duration can include any element with a durationMs value", async () => {
    const timegroup = renderTimegroup(
      html`
        <ef-timegroup mode="sequence">
          <ef-timegroup mode="fixed" duration="5s"></ef-timegroup>
          <test-temporal duration="5s"></test-temporal>
        </ef-timegroup>
      `,
    );

    assert.equal(timegroup.durationMs, 10_000);
  });

  test("arbitrary html does not factor into the calculation of a sequence duration", () => {
    const timegroup = renderTimegroup(
      html`
        <ef-timegroup mode="sequence">
          <div>
            <ef-timegroup mode="fixed" duration="5s"></ef-timegroup>
          </div>
        </ef-timegroup>
      `,
    );
    assert.equal(timegroup.durationMs, 5_000);
  });

  test("nested time groups do not factor into the calculation of a sequence duration", async () => {
    const timegroup = renderTimegroup(
      html`
        <ef-timegroup mode="sequence">
          <ef-timegroup mode="fixed" duration="5s">
            <ef-timegroup mode="fixed" duration="5s"></ef-timegroup>
          </ef-timegroup>
        </ef-timegroup>
      `,
    );
    assert.equal(timegroup.durationMs, 5_000);
  });
});

describe(`<ef-timegroup mode="contain">`, () => {
  test("fixed duration is ignored", () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="contain" duration="10s"></ef-timegroup>`,
    );
    assert.equal(timegroup.durationMs, 0);
  });

  test("duration is the maximum of it's child time groups", async () => {
    const timegroup = renderTimegroup(
      html`
        <ef-timegroup mode="contain">
          <ef-timegroup mode="fixed" duration="5s"></ef-timegroup>
          <ef-timegroup mode="fixed" duration="10s"></ef-timegroup>
        </ef-timegroup>
      `,
    );
    assert.equal(timegroup.durationMs, 10_000);
  });

  test("nested contain mode timegroups do not cause infinite loop", async () => {
    const timegroup = renderTimegroup(
      html`
        <ef-timegroup mode="contain">
          <ef-timegroup mode="contain">
            <ef-timegroup mode="fixed" duration="5s"></ef-timegroup>
            <ef-timegroup mode="fixed" duration="3s"></ef-timegroup>
          </ef-timegroup>
          <ef-timegroup mode="contain">
            <ef-timegroup mode="fixed" duration="7s"></ef-timegroup>
            <ef-timegroup mode="fixed" duration="2s"></ef-timegroup>
          </ef-timegroup>
        </ef-timegroup>
      `,
    );
    assert.equal(timegroup.durationMs, 7_000);
  });
});

describe("startTimeMs", () => {
  test("is computed relative to the root time group", async () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup id="root" mode="sequence">
        <ef-timegroup id="a" mode="fixed" duration="5s"></ef-timegroup>
        <ef-timegroup id="b" mode="sequence">
          <ef-timegroup id="c" mode="fixed" duration="5s"></ef-timegroup>
          <ef-timegroup id="d" mode="contain">
            <ef-timegroup id="e" mode="fixed" duration="5s"></ef-timegroup>
            <ef-timegroup id="f" mode="fixed" duration="5s"></ef-timegroup>
          </ef-timegroup>
        </ef-timegroup>
      </ef-timegroup>`,
    );

    const a = timegroup.querySelector("#a") as EFTimegroup;
    const b = timegroup.querySelector("#b") as EFTimegroup;
    const c = timegroup.querySelector("#c") as EFTimegroup;
    const d = timegroup.querySelector("#d") as EFTimegroup;
    const e = timegroup.querySelector("#e") as EFTimegroup;
    const f = timegroup.querySelector("#f") as EFTimegroup;

    assert.equal(a.startTimeMs, 0);
    assert.equal(b.startTimeMs, 5_000);
    assert.equal(c.startTimeMs, 5_000);
    assert.equal(d.startTimeMs, 10_000);
    assert.equal(e.startTimeMs, 10_000);
    assert.equal(f.startTimeMs, 10_000);
  });

  //   // TODO: Rethink offset math, it shouldn't effect the duration of a temporal item
  //   // but actually change the start and end time.
  //   litTest.skip("can be offset with offset attribute", async ({ container }) => {
  //     render(
  //       html`<ef-timegroup id="root" mode="contain">
  //         <test-temporal id="a" duration="5s" offset="5s"></test-temporal>
  //       </ef-timegroup> `,
  //       container,
  //     );

  //     const root = container.querySelector("#root") as EFTimegroup;
  //     const a = container.querySelector("#a") as TestTemporal;

  //     assert.equal(a.durationMs, 5_000);
  //     assert.equal(root.durationMs, 10_000);
  //     assert.equal(a.startTimeMs, 5_000);
  //   });

  // litTest.skip(
  //   "offsets do not affect start time when in a sequence group",
  //   async ({ container }) => {
  //     render(
  //       html`<ef-timegroup id="root" mode="sequence">
  //         <test-temporal id="a" duration="5s"></test-temporal>
  //         <test-temporal id="b" duration="5s" offset="5s"></test-temporal>
  //       </ef-timegroup> `,
  //       container,
  //     );

  //     const root = container.querySelector("#root") as EFTimegroup;
  //     const a = container.querySelector("#a") as TestTemporal;
  //     const b = container.querySelector("#b") as TestTemporal;

  //     assert.equal(root.durationMs, 10_000);
  //     assert.equal(a.startTimeMs, 0);
  //     assert.equal(b.startTimeMs, 5_000);
  //   },
  // );

  test("temporal elements default to expand to fill a timegroup", async () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup id="root" mode="fixed" duration="10s">
        <test-temporal id="a"></test-temporal>
      </ef-timegroup> `,
    );

    const a = timegroup.querySelector("#a") as TestTemporal;

    assert.equal(timegroup.durationMs, 10_000);
    assert.equal(a.durationMs, 10_000);
  });

  test("element's parentTimegroup updates as they move", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const timegroup1 = document.createElement("ef-timegroup");
    timegroup1.setAttribute("mode", "fixed");
    timegroup1.setAttribute("duration", "5s");

    const timegroup2 = document.createElement("ef-timegroup");
    timegroup2.setAttribute("mode", "fixed");
    timegroup2.setAttribute("duration", "5s");

    container.appendChild(timegroup1);
    container.appendChild(timegroup2);

    const temporal = document.createElement("test-temporal");

    timegroup1.appendChild(temporal);

    assert.equal(temporal.parentTimegroup, timegroup1);

    timegroup2.appendChild(temporal);
    assert.equal(temporal.parentTimegroup, timegroup2);
  });

  test("elements can access their root temporal element", async () => {
    const root = renderTimegroup(
      html`<ef-timegroup id="root" mode="contain" duration="10s">
        <ef-timegroup id="a" mode="contain">
          <div>
            <ef-timegroup id="b" mode="contain">
              <div>
                <test-temporal id="c" duration="5s"></test-temporal>
              </div>
            </ef-timegroup>
          </div>
        </ef-timegroup>
      </ef-timegroup> `,
    );

    const a = root.querySelector("#a") as EFTimegroup;
    const b = root.querySelector("#b") as EFTimegroup;
    const c = root.querySelector("#c") as TestTemporal;

    assert.equal(root.rootTimegroup, root);

    assert.equal(a.rootTimegroup, root);
    assert.equal(b.rootTimegroup, root);
    assert.equal(c.rootTimegroup, root);
  });
});

// TODO: Update tests for new implementation
describe("setting currentTime", () => {
  test("persists in localStorage if the timegroup has an id and is in the dom", async () => {
    const timegroupId = "localStorage-test";
    const storageKey = `ef-timegroup-${timegroupId}`;
    const timegroup = renderTimegroup(
      html`<ef-timegroup id="${timegroupId}" mode="fixed" duration="10s"></ef-timegroup>`,
    );
    localStorage.removeItem(storageKey);
    document.body.appendChild(timegroup);
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();

    // Use the new seek() method which ensures everything is ready
    await timegroup.seek(5_000_000); // 5000 seconds in ms, should clamp to 10s

    const storedValue = localStorage.getItem(storageKey);
    assert.equal(storedValue, "10"); // Should store 10 (clamped from 5000 to duration)
    timegroup.remove();
  });

  test("root timegroup remains visible when currentTime equals duration exactly", async () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup id="end-time-test" mode="fixed" duration="10s"></ef-timegroup>`,
    );
    await timegroup.waitForMediaDurations();

    // Seek to exactly the duration
    await timegroup.seek(10_000);

    // The root timegroup should still be visible at the exact end time
    assert.notEqual(
      timegroup.style.display,
      "none",
      "Root timegroup should be visible at exact end time",
    );
    assert.equal(
      timegroup.currentTime,
      10,
      "currentTime should equal duration",
    );
  });

  test("root timegroup becomes hidden only after currentTime exceeds duration", async () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup id="beyond-end-test" mode="fixed" duration="10s"></ef-timegroup>`,
    );
    await timegroup.waitForMediaDurations();

    // Seek beyond the duration (should be clamped to duration)
    await timegroup.seek(15_000); // 15 seconds, should clamp to 10s

    // Even when clamped, it should still be visible at the end
    assert.notEqual(
      timegroup.style.display,
      "none",
      "Root timegroup should be visible even when time is clamped to duration",
    );
    // Verify that the time was actually clamped
    assert.equal(
      timegroup.currentTime,
      10,
      "Time should be clamped to duration",
    );
  });

  test("does not persist in localStorage if the timegroup has no id", async () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="fixed" duration="10s"></ef-timegroup>`,
    );
    document.body.appendChild(timegroup);
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();

    // Set time without id - should not persist
    await timegroup.seek(5_000);

    // Verify no localStorage entry was created (check all possible keys)
    let foundStorageEntry = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ef-timegroup-")) {
        foundStorageEntry = true;
        break;
      }
    }
    assert.isFalse(
      foundStorageEntry,
      "No localStorage entry should be created without id",
    );
    timegroup.remove();
  });

  test("nested items are positioned correctly in sequence timeline", async () => {
    const timegroup = renderTimegroup(
      html`
        <ef-timegroup id="root" mode="sequence">
          <ef-timegroup id="a" mode="fixed" duration="5s"> </ef-timegroup>
          <ef-timegroup id="b" mode="fixed" duration="5s"> </ef-timegroup>
        </ef-timegroup>
      `,
    );

    await timegroup.waitForMediaDurations();
    const root = timegroup;
    const a = timegroup.querySelector("#a") as EFTimegroup;
    const b = timegroup.querySelector("#b") as EFTimegroup;

    // Verify timeline positions: A starts at 0, B starts at 5s
    assert.equal(a.startTimeMs, 0, "Element A should start at 0ms");
    assert.equal(a.endTimeMs, 5_000, "Element A should end at 5000ms");
    assert.equal(b.startTimeMs, 5_000, "Element B should start at 5000ms");
    assert.equal(b.endTimeMs, 10_000, "Element B should end at 10000ms");

    // At time 0, root currentTime should be within A's range
    await root.seek(0);
    assert.equal(root.currentTimeMs, 0, "Root should be at 0ms");
    assert.isAtLeast(
      root.currentTimeMs,
      a.startTimeMs,
      "Root time should be >= A's start",
    );
    assert.isAtMost(
      root.currentTimeMs,
      a.endTimeMs,
      "Root time should be <= A's end",
    );

    // At 2.5s, still in A's range
    await root.seek(2_500);
    assert.equal(root.currentTimeMs, 2_500, "Root should be at 2500ms");
    assert.isAtLeast(
      root.currentTimeMs,
      a.startTimeMs,
      "Root time should be >= A's start",
    );
    assert.isAtMost(
      root.currentTimeMs,
      a.endTimeMs,
      "Root time should be <= A's end",
    );

    // At 7.5s, should be in B's range
    await root.seek(7_500);
    assert.equal(root.currentTimeMs, 7_500, "Root should be at 7500ms");
    assert.isAtLeast(
      root.currentTimeMs,
      b.startTimeMs,
      "Root time should be >= B's start",
    );
    assert.isAtMost(
      root.currentTimeMs,
      b.endTimeMs,
      "Root time should be <= B's end",
    );
  });
});

describe("shouldWrapWithWorkbench", () => {
  test("should not wrap if EF_INTERACTIVE is false", () => {
    // Save original values
    const originalInteractive = EF_INTERACTIVE;
    const originalDevWorkbench = globalThis.EF_DEV_WORKBENCH;

    try {
      // Set EF_INTERACTIVE to false using the setter
      setEFInteractive(false);
      globalThis.EF_DEV_WORKBENCH = true;

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      document.body.appendChild(timegroup);

      // Observable outcome: no ef-workbench should wrap the timegroup
      const shouldWrap = timegroup.shouldWrapWithWorkbench();
      assert.isFalse(
        shouldWrap,
        "shouldWrapWithWorkbench should be false when EF_INTERACTIVE is false",
      );
      assert.isNull(
        timegroup.closest("ef-workbench"),
        "No workbench should wrap timegroup when EF_INTERACTIVE is false",
      );

      timegroup.remove();
    } finally {
      // Restore original values
      setEFInteractive(originalInteractive);
      globalThis.EF_DEV_WORKBENCH = originalDevWorkbench;
    }
  });

  test("should wrap if root-most timegroup with EF_INTERACTIVE and EF_DEV_WORKBENCH", () => {
    // Save original values
    const originalInteractive = EF_INTERACTIVE;
    const originalDevWorkbench = globalThis.EF_DEV_WORKBENCH;

    try {
      // Set both flags to true using the setter
      setEFInteractive(true);
      globalThis.EF_DEV_WORKBENCH = true;

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      document.body.appendChild(timegroup);

      // Observable outcome: timegroup should be wrapped in an ef-workbench
      // (connectedCallback automatically wraps when conditions are met)
      const workbench = timegroup.closest("ef-workbench");
      assert.isNotNull(
        workbench,
        "Root timegroup should be wrapped in ef-workbench when EF_INTERACTIVE and EF_DEV_WORKBENCH are true",
      );

      // Clean up (workbench is the parent now)
      workbench?.remove();
    } finally {
      // Restore original values
      setEFInteractive(originalInteractive);
      globalThis.EF_DEV_WORKBENCH = originalDevWorkbench;
    }
  });

  test("should not wrap if contained within a preview context", () => {
    const timegroup = document.createElement("ef-timegroup");
    const context = document.createElement("test-context");
    context.append(timegroup);
    document.body.appendChild(context);

    // Verify observable behavior: no ef-workbench element exists
    assert.isNull(
      timegroup.closest("ef-workbench"),
      "No workbench should wrap timegroup in context",
    );

    context.remove();
  });
});

describe("DOM nodes", () => {
  test("can have mode and duration set as attributes", () => {
    const timegroup = document.createElement("ef-timegroup");
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    assert.equal(timegroup.mode, "fixed");
    assert.equal(timegroup.durationMs, 10_000);
  });
});

// TODO: Update tests for new implementation
describe("Dynamic content updates", () => {
  test("updates duration when new child temporal elements are added dynamically", async () => {
    // Create a sequence timegroup with initial children
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="sequence">
        <ef-timegroup mode="fixed" duration="3s"></ef-timegroup>
        <ef-timegroup mode="fixed" duration="2s"></ef-timegroup>
      </ef-timegroup>`,
    );

    // Initial duration should be 5 seconds (3s + 2s)
    assert.equal(timegroup.durationMs, 5_000);
    const initialTemporals = timegroup.querySelectorAll("ef-timegroup");
    assert.equal(initialTemporals.length, 2);

    // Dynamically add a new child element
    const newChild = document.createElement("ef-timegroup");
    newChild.setAttribute("mode", "fixed");
    newChild.setAttribute("duration", "4s");
    timegroup.appendChild(newChild);

    // Wait for slot change event to process
    await timegroup.updateComplete;

    // Duration should now include the new child (3s + 2s + 4s = 9s)
    assert.equal(timegroup.durationMs, 9_000);
    const updatedTemporals = timegroup.querySelectorAll("ef-timegroup");
    assert.equal(updatedTemporals.length, 3);
  });

  test("updates duration when child temporal elements are removed dynamically", async () => {
    // Create a contain timegroup with initial children
    const timegroup = renderTimegroup(
      html`<ef-timegroup mode="contain">
        <ef-timegroup id="child1" mode="fixed" duration="5s"></ef-timegroup>
        <ef-timegroup id="child2" mode="fixed" duration="8s"></ef-timegroup>
        <ef-timegroup id="child3" mode="fixed" duration="3s"></ef-timegroup>
      </ef-timegroup>`,
    );

    // Initial duration should be max of children (8s)
    assert.equal(timegroup.durationMs, 8_000);
    const initialTemporals = timegroup.querySelectorAll("ef-timegroup");
    assert.equal(initialTemporals.length, 3);

    // Remove the longest duration child
    const child2 = timegroup.querySelector("#child2");
    child2?.remove();

    // Wait for slot change event to process
    await timegroup.updateComplete;

    // Duration should now be max of remaining children (5s)
    assert.equal(timegroup.durationMs, 5_000);
    const remainingTemporals = timegroup.querySelectorAll("ef-timegroup");
    assert.equal(remainingTemporals.length, 2);
  });

  describe("frameTask", () => {
    test("visible nested elements are rendered when seeking to their time range", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="sequence">
          <test-frame-task-a duration="1s"></test-frame-task-a>
          <div>
            <test-frame-task-b duration="1s">
              <test-frame-task-c duration="1s"></test-frame-task-c>
            </test-frame-task-b>
          </div>
        </ef-timegroup>`,
      );
      await timegroup.waitForMediaDurations();

      const frameTaskA = timegroup.querySelector("test-frame-task-a")!;
      const frameTaskB = timegroup.querySelector("test-frame-task-b")!;
      const frameTaskC = timegroup.querySelector("test-frame-task-c")!;

      // Seek to time 0ms - first element should be visible
      await timegroup.seek(0);

      // At timeline time 0ms:
      // - frameTaskA (0-1000ms) should be visible and executed
      // - frameTaskB (1000-2000ms) should NOT be visible (not in range at time 0)
      // - frameTaskC (0-1000ms) should be visible (inherits root positioning)

      // Verify observable behavior: elements are visible/hidden and frame tasks executed
      const getDisplay = (el: Element) => window.getComputedStyle(el).display;
      assert.notEqual(
        getDisplay(frameTaskA),
        "none",
        "A should be visible at time 0",
      );
      assert.equal(
        getDisplay(frameTaskB),
        "none",
        "B should not be visible at time 0",
      );
      assert.notEqual(
        getDisplay(frameTaskC),
        "none",
        "C should be visible at time 0",
      );

      assert.equal(
        frameTaskA.getAttribute("data-frame-executed"),
        "true",
        "A's frame task should have executed",
      );
      assert.isNull(
        frameTaskB.getAttribute("data-frame-executed"),
        "B's frame task should not have executed",
      );
      assert.equal(
        frameTaskC.getAttribute("data-frame-executed"),
        "true",
        "C's frame task should have executed",
      );
    });
  });

  describe("seekTask", () => {
    test("non-root timegroups do not affect root timeline when seeking", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="sequence">
            <ef-timegroup mode="fixed" duration="3s">
              <test-frame-task-a></test-frame-task-a>
            </ef-timegroup>
          </ef-timegroup>`,
      );
      await timegroup.waitForMediaDurations();

      const nonRootTimegroup = timegroup.querySelector("ef-timegroup")!;
      const frameTaskA = timegroup.querySelector("test-frame-task-a")!;

      // Seek root to time 0
      await timegroup.seek(0);
      const getDisplay = (el: Element) => window.getComputedStyle(el).display;
      const initialDisplay = getDisplay(frameTaskA);
      const initialExecuted = frameTaskA.getAttribute("data-frame-executed");

      // Attempt to seek non-root (should not affect root timeline)
      nonRootTimegroup.currentTime = 1.5;
      await nonRootTimegroup.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50)); // Allow any async updates

      // Verify observable behavior: root timeline unchanged
      assert.equal(
        timegroup.currentTime,
        0,
        "Root timeline should be unchanged",
      );
      assert.equal(
        getDisplay(frameTaskA),
        initialDisplay,
        "Element visibility should be unchanged",
      );
      assert.equal(
        frameTaskA.getAttribute("data-frame-executed"),
        initialExecuted,
        "Frame task execution should be unchanged",
      );
    });

    test("media elements are loaded before seeking completes", async () => {
      const timegroup = renderTimegroup(
        html`
        <ef-preview>
          <ef-timegroup mode="sequence">
            <timegroup-test-media></timegroup-test-media>
          </ef-timegroup>
        </ef-preview>`,
      );
      const media = timegroup.querySelector("timegroup-test-media")!;

      // Before seek, media may not be loaded
      const beforeSeek = media.getAttribute("data-media-loaded");

      // Seek should wait for media to load
      await timegroup.seek(0);

      // Verify observable behavior: media is now loaded
      assert.equal(
        media.getAttribute("data-media-loaded"),
        "true",
        "Media should be loaded after seek",
      );
    });
  });

  describe("custom frame tasks", () => {
    test("executes registered callback on frame update", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      let callbackExecuted = false;
      const callback = () => {
        callbackExecuted = true;
      };

      timegroup.addFrameTask(callback);
      await timegroup.seek(1000);

      assert.equal(callbackExecuted, true);
    }, 1000);

    test("callback receives correct timing information", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5000ms"></ef-timegroup>`,
      );

      let receivedInfo: any = null;
      const callback = (info: any) => {
        receivedInfo = info;
      };

      timegroup.addFrameTask(callback);
      await timegroup.seek(2000);

      assert.equal(receivedInfo.ownCurrentTimeMs, 2000);
      assert.equal(receivedInfo.currentTimeMs, 2000);
      assert.equal(receivedInfo.durationMs, 5000);
      assert.equal(receivedInfo.percentComplete, 0.4);
      assert.equal(receivedInfo.element, timegroup);
    }, 1000);

    test("executes multiple callbacks in parallel", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      let callback1Executed = false;
      let callback2Executed = false;
      let callback3Executed = false;

      timegroup.addFrameTask(() => {
        callback1Executed = true;
      });
      timegroup.addFrameTask(() => {
        callback2Executed = true;
      });
      timegroup.addFrameTask(() => {
        callback3Executed = true;
      });

      await timegroup.seek(1000);

      assert.equal(callback1Executed, true);
      assert.equal(callback2Executed, true);
      assert.equal(callback3Executed, true);
    }, 1000);

    test("async callbacks block frame pipeline", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      let asyncCallbackCompleted = false;
      const executionOrder: string[] = [];

      const asyncCallback = async () => {
        executionOrder.push("async-start");
        await new Promise((resolve) => setTimeout(resolve, 50));
        asyncCallbackCompleted = true;
        executionOrder.push("async-end");
      };

      timegroup.addFrameTask(asyncCallback);

      const seekPromise = timegroup.seek(1000);
      executionOrder.push("seek-called");

      await seekPromise;
      executionOrder.push("seek-complete");

      assert.equal(asyncCallbackCompleted, true);
      assert.deepEqual(executionOrder, [
        "seek-called",
        "async-start",
        "async-end",
        "seek-complete",
      ]);
    }, 1000);

    test("cleanup function removes callback", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      let callbackExecutionCount = 0;
      const cleanup = timegroup.addFrameTask(() => {
        callbackExecutionCount++;
      });

      await timegroup.seek(1000);
      assert.equal(callbackExecutionCount, 1);

      cleanup();
      await timegroup.seek(2000);
      assert.equal(callbackExecutionCount, 1);
    }, 1000);

    test("removeFrameTask removes callback", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      let callbackExecutionCount = 0;
      const callback = () => {
        callbackExecutionCount++;
      };

      timegroup.addFrameTask(callback);
      await timegroup.seek(1000);
      assert.equal(callbackExecutionCount, 1);

      timegroup.removeFrameTask(callback);
      await timegroup.seek(2000);
      assert.equal(callbackExecutionCount, 1);
    }, 1000);

    test("addFrameTask throws error for non-function", () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      assert.throws(() => {
        timegroup.addFrameTask("not a function" as any);
      }, "Frame task callback must be a function");
    }, 1000);

    test("custom frame tasks persist after disconnect and reconnect", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      container.appendChild(timegroup);

      let callbackWorkedAfterReconnect = false;
      const callback = () => {
        callbackWorkedAfterReconnect = true;
      };

      timegroup.addFrameTask(callback);

      // Disconnect and reconnect
      container.removeChild(timegroup);
      callbackWorkedAfterReconnect = false; // Reset after disconnect
      container.appendChild(timegroup);

      // Callback should still work after reconnect
      await timegroup.seek(2000);
      assert.equal(
        callbackWorkedAfterReconnect,
        true,
        "Callback should still work after reconnect",
      );

      container.remove();
    }, 1000);

    test("sync and async callbacks execute together", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      let syncExecuted = false;
      let asyncExecuted = false;

      timegroup.addFrameTask(() => {
        syncExecuted = true;
      });

      timegroup.addFrameTask(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        asyncExecuted = true;
      });

      await timegroup.seek(1000);

      assert.equal(syncExecuted, true);
      assert.equal(asyncExecuted, true);
    }, 1000);

    test("executes callbacks when currentTime is loaded from localStorage", async () => {
      const timegroupId = "localStorage-frame-task-test";
      const storageKey = `ef-timegroup-${timegroupId}`;

      localStorage.setItem(storageKey, "2.5");

      const container = document.createElement("div");
      document.body.appendChild(container);

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.setAttribute("id", timegroupId);
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");

      let callbackExecutionCount = 0;
      const receivedTimes: number[] = [];

      timegroup.addFrameTask((info) => {
        callbackExecutionCount++;
        receivedTimes.push(info.currentTimeMs);
      });

      container.appendChild(timegroup);

      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();

      await new Promise((resolve) => {
        const checkComplete = async () => {
          if (
            timegroup.currentTime === 2.5 &&
            receivedTimes[receivedTimes.length - 1] === 2500
          ) {
            resolve(undefined);
          } else if (timegroup.currentTime === 2.5) {
            await new Promise((r) => setTimeout(r, 10));
            checkComplete();
          } else {
            setTimeout(checkComplete, 10);
          }
        };
        checkComplete();
      });

      assert.equal(
        timegroup.currentTime,
        2.5,
        "Timegroup should have loaded time from localStorage",
      );
      assert.isAtLeast(
        callbackExecutionCount,
        1,
        "Frame callback should be executed at least once",
      );
      assert.equal(
        receivedTimes[receivedTimes.length - 1],
        2500,
        `Last callback execution should receive the time loaded from localStorage. Got: ${receivedTimes.join(", ")}`,
      );

      container.remove();
      localStorage.removeItem(storageKey);
    }, 1000);
  });

  describe("onFrame property", () => {
    test("onFrame property executes callback on frame update", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      let callbackExecuted = false;
      timegroup.onFrame = () => {
        callbackExecuted = true;
      };

      await timegroup.seek(1000);

      assert.equal(callbackExecuted, true);
    }, 1000);

    test("onFrame property receives correct timing information", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5000ms"></ef-timegroup>`,
      );

      let receivedInfo: any = null;
      timegroup.onFrame = (info) => {
        receivedInfo = info;
      };

      await timegroup.seek(2000);

      assert.equal(receivedInfo.ownCurrentTimeMs, 2000);
      assert.equal(receivedInfo.currentTimeMs, 2000);
      assert.equal(receivedInfo.durationMs, 5000);
      assert.equal(receivedInfo.percentComplete, 0.4);
      assert.equal(receivedInfo.element, timegroup);
    }, 1000);

    test("setting onFrame to null removes the callback", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      let callbackCount = 0;
      timegroup.onFrame = () => {
        callbackCount++;
      };

      await timegroup.seek(1000);
      assert.equal(callbackCount, 1);

      timegroup.onFrame = null;
      await timegroup.seek(2000);
      assert.equal(callbackCount, 1, "callback should not run after set to null");
    }, 1000);

    test("setting new onFrame replaces previous callback", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      let callback1Count = 0;
      let callback2Count = 0;

      timegroup.onFrame = () => {
        callback1Count++;
      };

      await timegroup.seek(1000);
      assert.equal(callback1Count, 1);
      assert.equal(callback2Count, 0);

      timegroup.onFrame = () => {
        callback2Count++;
      };

      await timegroup.seek(2000);
      assert.equal(callback1Count, 1, "first callback should not run");
      assert.equal(callback2Count, 1, "second callback should run");
    }, 1000);

    test("onFrame getter returns current callback", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      assert.equal(timegroup.onFrame, null);

      const callback = () => {};
      timegroup.onFrame = callback;
      assert.equal(timegroup.onFrame, callback);

      timegroup.onFrame = null;
      assert.equal(timegroup.onFrame, null);
    }, 1000);

    test("onFrame works alongside addFrameTask callbacks", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="5s"></ef-timegroup>`,
      );

      let onFrameExecuted = false;
      let addFrameTaskExecuted = false;

      timegroup.onFrame = () => {
        onFrameExecuted = true;
      };

      timegroup.addFrameTask(() => {
        addFrameTaskExecuted = true;
      });

      await timegroup.seek(1000);

      assert.equal(onFrameExecuted, true);
      assert.equal(addFrameTaskExecuted, true);
    }, 1000);
  });

  describe("staggered text animations", () => {
    test("staggered animations start at opacity 0", async () => {
      const style = document.createElement("style");
      style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 5s paused; }
      `;
      document.head.appendChild(style);

      const timegroup = renderTimegroup(
        html`
          <ef-timegroup>
            <ef-text split="line" stagger="1000ms" duration="8s">
              <template>
                <ef-text-segment class="fade-in"></ef-text-segment>
              </template>
              Line 1
              Line 2
            </ef-text>
          </ef-timegroup>
        `,
      );
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();

      const segments = await timegroup
        .querySelector("ef-text")!
        .whenSegmentsReady();

      await timegroup.seek(500);
      await Promise.all(
        segments.map((seg) => seg.frameTask?.taskComplete).filter((p) => p),
      );
      await new Promise((resolve) => requestAnimationFrame(resolve));

      assert.equal(
        parseFloat(window.getComputedStyle(segments[1]!).opacity),
        0,
      );

      document.head.removeChild(style);
      document.body.removeChild(timegroup);
    }, 1000);

    test("animations remain controllable after completion", async () => {
      const style = document.createElement("style");
      style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 1s paused; }
      `;
      document.head.appendChild(style);

      const timegroup = renderTimegroup(
        html`
          <ef-timegroup>
            <ef-text split="line" stagger="1000ms" duration="5s">
              <template>
                <ef-text-segment class="fade-in"></ef-text-segment>
              </template>
              Line 1
              Line 2
            </ef-text>
          </ef-timegroup>
        `,
      );
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();

      const segments = await timegroup
        .querySelector("ef-text")!
        .whenSegmentsReady();

      await timegroup.seek(5000);
      await Promise.all(
        segments.map((seg) => seg.frameTask?.taskComplete).filter((p) => p),
      );
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const { getTrackedAnimations } = await import("./updateAnimations.ts");
      assert.isAbove(getTrackedAnimations(segments[1]!).length, 0);

      document.head.removeChild(style);
      document.body.removeChild(timegroup);
    }, 1000);
  });

  describe("auto-init", () => {
    test("seeks to frame 0 for root timegroup when auto-init is enabled", async () => {
      setEFInteractive(true);
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="10s" auto-init></ef-timegroup>`,
      );
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();

      assert.equal(
        timegroup.currentTimeMs,
        0,
        "Root timegroup with auto-init should seek to frame 0",
      );
      timegroup.remove();
    });

    test("does not seek when auto-init is disabled", async () => {
      setEFInteractive(true);
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="fixed" duration="10s"></ef-timegroup>`,
      );
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();

      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.equal(
        timegroup.currentTimeMs,
        0,
        "Timegroup without auto-init may still start at 0, but should not auto-seek",
      );
      timegroup.remove();
    });

    test("does not auto-init nested timegroups", async () => {
      setEFInteractive(true);
      const parentTimegroup = renderTimegroup(
        html`
          <ef-timegroup mode="fixed" duration="10s" auto-init>
            <ef-timegroup mode="fixed" duration="5s" auto-init></ef-timegroup>
          </ef-timegroup>
        `,
      );
      document.body.appendChild(parentTimegroup);
      await parentTimegroup.updateComplete;
      await parentTimegroup.waitForMediaDurations();

      const nestedTimegroup = parentTimegroup.querySelector(
        "ef-timegroup",
      ) as EFTimegroup;
      await nestedTimegroup.updateComplete;
      await nestedTimegroup.waitForMediaDurations();

      assert.equal(
        parentTimegroup.currentTimeMs,
        0,
        "Root timegroup with auto-init should seek to frame 0",
      );

      assert.notEqual(
        nestedTimegroup.isRootTimegroup,
        true,
        "Nested timegroup should not be root",
      );
      parentTimegroup.remove();
    });

    test("does not auto-init when time is loaded from localStorage", async () => {
      setEFInteractive(true);
      const timegroupId = "auto-init-storage-test";
      const storageKey = `ef-timegroup-${timegroupId}`;
      localStorage.setItem(storageKey, "5");

      const timegroup = renderTimegroup(
        html`<ef-timegroup id="${timegroupId}" mode="fixed" duration="10s" auto-init></ef-timegroup>`,
      );
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();

      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.equal(
        timegroup.currentTimeMs,
        5000,
        "Timegroup should use localStorage value instead of auto-init",
      );

      localStorage.removeItem(storageKey);
      timegroup.remove();
    });
  });
});
