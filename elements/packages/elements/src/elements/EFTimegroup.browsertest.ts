import {
  html,
  LitElement,
  render as litRender,
  type TemplateResult,
} from "lit";
import { assert, beforeEach, describe, test } from "vitest";
import { EFTimegroup } from "./EFTimegroup.js";
import "./EFTimegroup.js";
import { customElement } from "lit/decorators/custom-element.js";
import { ContextMixin } from "../gui/ContextMixin.js";
import { EFTemporal } from "./EFTemporal.js";
// Need workbench to make workbench wrapping occurs
import "../gui/EFWorkbench.js";
// Additional imports for sequence boundary test
import "./EFVideo.js";
import "../gui/EFConfiguration.js";
import { Task } from "@lit/task";
import type { MediaEngine } from "../transcoding/types/index.js";
import { EFMedia } from "./EFMedia.js";

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
  mediaEngineTaskCount = 0;
  mediaEngineTask = new Task(this, {
    autoRun: false,
    args: () => ["source", null] as const,
    task: () => {
      this.mediaEngineTaskCount++;
      return Promise.resolve({} as unknown as MediaEngine);
    },
  });
}

@customElement("test-frame-task-a")
class TestFrameTaskA extends EFTemporal(LitElement) {
  frameTaskCount = 0;

  frameTask = new Task(this, {
    autoRun: false,
    args: () => [],
    task: () => {
      this.frameTaskCount++;
      return Promise.resolve();
    },
  });
}

@customElement("test-frame-task-b")
class TestFrameTaskB extends EFTemporal(LitElement) {
  frameTaskCount = 0;

  frameTask = new Task(this, {
    autoRun: false,
    args: () => [],
    task: () => {
      this.frameTaskCount++;
      return Promise.resolve();
    },
  });
}

@customElement("test-frame-task-c")
class TestFrameTaskC extends EFTemporal(LitElement) {
  frameTaskCount = 0;

  frameTask = new Task(this, {
    autoRun: false,
    args: () => [],
    task: () => {
      this.frameTaskCount++;
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

    const foreground = timegroup.querySelector("#foreground") as EFTimegroup;
    const background = timegroup.querySelector("#background") as EFTimegroup;
    assert.equal(foreground.durationMs, 20_000);
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

describe("setting currentTime", () => {
  test("persists in localStorage if the timegroup has an id and is in the dom", async () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup id="localStorage-test" mode="fixed" duration="10s"></ef-timegroup>`,
    );
    localStorage.removeItem(timegroup.storageKey);
    document.body.appendChild(timegroup);
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();

    // Use the new seek() method which ensures everything is ready
    await timegroup.seek(5_000_000); // 5000 seconds in ms, should clamp to 10s

    const storedValue = localStorage.getItem(timegroup.storageKey);
    assert.equal(storedValue, "10"); // Should store 10 (clamped from 5000 to duration)
    timegroup.remove();
  });

  test("root timegroup remains visible when currentTime equals duration exactly", async () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup id="end-time-test" mode="fixed" duration="10s"></ef-timegroup>`,
    );
    await timegroup.waitForMediaDurations();

    // Set currentTime to exactly the duration
    timegroup.currentTime = 10; // 10 seconds
    await timegroup.seekTask.taskComplete;
    await timegroup.frameTask.taskComplete;

    // The root timegroup should still be visible at the exact end time
    assert.notEqual(
      timegroup.style.display,
      "none",
      "Root timegroup should be visible at exact end time",
    );
  });

  test("root timegroup becomes hidden only after currentTime exceeds duration", async () => {
    const timegroup = renderTimegroup(
      html`<ef-timegroup id="beyond-end-test" mode="fixed" duration="10s"></ef-timegroup>`,
    );
    await timegroup.waitForMediaDurations();

    // Set currentTime beyond the duration (should be clamped to duration)
    timegroup.currentTime = 15; // 15 seconds, should clamp to 10s
    await timegroup.seekTask.taskComplete;
    await timegroup.frameTask.taskComplete;

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
    timegroup.currentTime = 5_000;
    timegroup.removeAttribute("id");
    assert.throws(() => {
      assert.isNull(localStorage.getItem(timegroup.storageKey));
    }, "Timegroup must have an id to use localStorage");
    timegroup.remove();
  });

  test("nested items derive their ownCurrentTimeMs", async () => {
    const timegroup = renderTimegroup(
      html`
        <ef-timegroup id="root" mode="sequence">
          <ef-timegroup id="a" mode="fixed" duration="5s"> </ef-timegroup>
          <ef-timegroup id="b" mode="fixed" duration="5s"> </ef-timegroup>
        </ef-timegroup>
      `,
    );

    const root = timegroup;
    const a = timegroup.querySelector("#a") as EFTimegroup;
    const b = timegroup.querySelector("#b") as EFTimegroup;

    assert.equal(a.ownCurrentTimeMs, 0);
    assert.equal(b.ownCurrentTimeMs, 0);

    root.currentTimeMs = 2_500;

    assert.equal(a.ownCurrentTimeMs, 2_500);
    assert.equal(b.ownCurrentTimeMs, 0);

    // Wait for frame update to complete before next assignment
    await new Promise((resolve) => setTimeout(resolve, 10));

    root.currentTimeMs = 7_500;

    assert.equal(a.ownCurrentTimeMs, 5_000);
    assert.equal(b.ownCurrentTimeMs, 2_500);
  });
});

describe("shouldWrapWithWorkbench", () => {
  test.skip("should not wrap if EF_INTERACTIVE is false", () => {
    // TODO: need a way to define EF_INTERACTIVE in a test
  });

  test.skip("should wrap if root-most timegroup", () => {
    // TODO: This test requires EF_INTERACTIVE to be true, which is a module-level constant
    // that cannot be modified in tests. Need a way to test this behavior.
  });

  test("should not wrap if contained within a preview context", () => {
    const timegorup = document.createElement("ef-timegroup");
    const context = document.createElement("test-context");
    context.append(timegorup);
    assert.isFalse(timegorup.shouldWrapWithWorkbench());
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
    assert.equal(timegroup.childTemporals.length, 2);

    // Dynamically add a new child element
    const newChild = document.createElement("ef-timegroup");
    newChild.setAttribute("mode", "fixed");
    newChild.setAttribute("duration", "4s");
    timegroup.appendChild(newChild);

    // Wait for slot change event to process
    await timegroup.updateComplete;

    // Duration should now include the new child (3s + 2s + 4s = 9s)
    assert.equal(timegroup.durationMs, 9_000);
    assert.equal(timegroup.childTemporals.length, 3);
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
    assert.equal(timegroup.childTemporals.length, 3);

    // Remove the longest duration child
    const child2 = timegroup.querySelector("#child2");
    child2?.remove();

    // Wait for slot change event to process
    await timegroup.updateComplete;

    // Duration should now be max of remaining children (5s)
    assert.equal(timegroup.durationMs, 5_000);
    assert.equal(timegroup.childTemporals.length, 2);
  });

  describe("frameTask", () => {
    test("executes all nested frame tasks", async () => {
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
      const frameTaskA = timegroup.querySelector("test-frame-task-a")!;
      const frameTaskB = timegroup.querySelector("test-frame-task-b")!;
      const frameTaskC = timegroup.querySelector("test-frame-task-c")!;

      // Following the initial update, frame tasks may run during initialization
      await timegroup.updateComplete;

      // frameTaskB should never run (not visible at time 0ms in sequence)
      assert.equal(frameTaskB.frameTaskCount, 0);

      // Then we run them manually.
      await timegroup.frameTask.run();

      // At timeline time 0ms:
      // - frameTaskA (0-1000ms) should have run (visible)
      // - frameTaskB (1000-2000ms) should NOT run (not visible at time 0)
      // - frameTaskC (0-1000ms) should have run (inherits root positioning, visible)

      // Verify visible tasks have run at least once
      assert.ok(frameTaskA.frameTaskCount > 0, "frameTaskA should have run");
      assert.ok(frameTaskC.frameTaskCount > 0, "frameTaskC should have run");
      // Verify non-visible task has never run
      assert.equal(frameTaskB.frameTaskCount, 0); // Not visible at time 0
    });
  });

  describe("seekTask", () => {
    test("does not execute if not the root timegroup", async () => {
      const timegroup = renderTimegroup(
        html`<ef-timegroup mode="sequence">
            <ef-timegroup mode="fixed" duration="3s">
              <test-frame-task-a></test-frame-task-a>
            </ef-timegroup>
          </ef-timegroup>`,
      );
      const nonRootTimegroup = timegroup.querySelector("ef-timegroup")!;
      const frameTaskA = timegroup.querySelector("test-frame-task-a")!;
      await timegroup.updateComplete;
      assert.equal(frameTaskA.frameTaskCount, 1);
      await nonRootTimegroup.seekTask.run();
      assert.equal(frameTaskA.frameTaskCount, 1);
    });

    test("waits for media durations", async () => {
      const timegroup = renderTimegroup(
        html`
        <ef-preview>
          <ef-timegroup mode="sequence">
            <timegroup-test-media></timegroup-test-media>
          </ef-timegroup>
        </ef-preview>`,
      );
      const media = timegroup.querySelector("timegroup-test-media")!;
      assert.equal(media.mediaEngineTaskCount, 0);
      await timegroup.seekTask.run();
      assert.equal(media.mediaEngineTaskCount, 1);
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
});
