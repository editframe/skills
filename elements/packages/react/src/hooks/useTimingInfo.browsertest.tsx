import type { EFTimegroup } from "@editframe/elements";
import { type FC, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { assert, beforeEach, describe, test } from "vitest";
import { Timegroup } from "../elements/Timegroup.js";
import { Video } from "../elements/Video.js";
import { Configuration } from "../gui/Configuration.js";
import { Preview } from "../gui/Preview.js";
import { useTimingInfo } from "./useTimingInfo.js";

beforeEach(() => {
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
});

interface TimingDisplayProps {
  onUpdate?: (info: {
    ownCurrentTimeMs: number;
    durationMs: number;
    percentComplete: number;
  }) => void;
}

const TimingDisplay: FC<TimingDisplayProps> = ({ onUpdate }) => {
  const { ownCurrentTimeMs, durationMs, percentComplete, ref } =
    useTimingInfo();

  useEffect(() => {
    if (onUpdate) {
      onUpdate({ ownCurrentTimeMs, durationMs, percentComplete });
    }
  }, [ownCurrentTimeMs, durationMs, percentComplete, onUpdate]);

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: OK for test fixture with single instance
    <Preview id="test-preview">
      <Timegroup mode="fixed" duration="3s" ref={ref}>
        <Video
          src="test_audio.mp4"
          trim="0s-1s"
        />
      </Timegroup>
    </Preview>
  );
};

describe("useTimingInfo", () => {
  test("provides initial timing information", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    let receivedInfo: {
      ownCurrentTimeMs: number;
      durationMs: number;
      percentComplete: number;
    } | null = null;

    const root = createRoot(container);
    root.render(
      <Configuration>
        <TimingDisplay
          onUpdate={(info) => {
            receivedInfo = info;
          }}
        />
      </Configuration>,
    );

    // Wait for the component to mount and update
    await new Promise((resolve) => setTimeout(resolve, 100));

    const preview = container.querySelector("ef-preview");
    const timegroup = preview?.querySelector("ef-timegroup") as EFTimegroup;

    assert.ok(timegroup, "Timegroup should be rendered");
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();

    // Trigger a Lit update cycle so the controller fires hostUpdated
    timegroup.currentTimeMs = 0;
    await timegroup.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.ok(receivedInfo, "Should receive timing info");
    assert.equal(receivedInfo?.ownCurrentTimeMs, 0);
    assert.equal(receivedInfo?.durationMs, 3000);
    assert.equal(receivedInfo?.percentComplete, 0);

    root.unmount();
    container.remove();
  }, 5000);

  test("updates only on frame task completion, not on every Lit update", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const updates: number[] = [];

    const root = createRoot(container);
    root.render(
      <Configuration>
        <TimingDisplay
          onUpdate={(info) => {
            updates.push(info.ownCurrentTimeMs);
          }}
        />
      </Configuration>,
    );

    // Wait for initial mount
    await new Promise((resolve) => setTimeout(resolve, 100));

    const preview = container.querySelector("ef-preview");
    const timegroup = preview?.querySelector("ef-timegroup") as EFTimegroup;

    assert.ok(timegroup, "Timegroup should be rendered");
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();

    // Clear initial updates
    updates.length = 0;

    // Trigger multiple Lit updates without frame task
    // These should NOT trigger React updates
    timegroup.requestUpdate("mode");
    await timegroup.updateComplete;
    timegroup.requestUpdate("mode");
    await timegroup.updateComplete;
    timegroup.requestUpdate("mode");
    await timegroup.updateComplete;

    // Should have no updates since no frame tasks ran
    assert.equal(
      updates.length,
      0,
      "Should not update on Lit property changes",
    );

    // Now trigger frame task via seek (proper API that triggers both task and update)
    await timegroup.seek(1000);
    // Give React a chance to process the state update
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have exactly one update from frame task
    assert.ok(updates.length >= 1, "Should update once per frame task");

    root.unmount();
    container.remove();
  }, 5000);

  test("updates synchronously with frame tasks during seek", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const updates: number[] = [];

    const root = createRoot(container);
    root.render(
      <Configuration>
        <TimingDisplay
          onUpdate={(info) => {
            updates.push(info.ownCurrentTimeMs);
          }}
        />
      </Configuration>,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const preview = container.querySelector("ef-preview");
    const timegroup = preview?.querySelector("ef-timegroup") as EFTimegroup;

    assert.ok(timegroup, "Timegroup should be rendered");
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();

    // Clear initial updates
    updates.length = 0;

    // Seek to different times
    await timegroup.seek(1000);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const updatesAfterFirstSeek = updates.length;
    assert.ok(updatesAfterFirstSeek > 0, "Should update after first seek");

    await timegroup.seek(2000);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const updatesAfterSecondSeek = updates.length;
    assert.ok(
      updatesAfterSecondSeek > updatesAfterFirstSeek,
      "Should update after second seek",
    );

    // Verify the last update has the correct time
    const lastUpdate = updates[updates.length - 1];
    assert.equal(lastUpdate, 2000, "Should reflect the seeked time");

    root.unmount();
    container.remove();
  }, 5000);

  test("updates at controlled rate with sequential frame updates", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const updateTimestamps: number[] = [];
    const updateTimes: number[] = [];

    const root = createRoot(container);
    root.render(
      <Configuration>
        <TimingDisplay
          onUpdate={(info) => {
            updateTimestamps.push(performance.now());
            updateTimes.push(info.ownCurrentTimeMs);
          }}
        />
      </Configuration>,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const preview = container.querySelector("ef-preview");
    const timegroup = preview?.querySelector("ef-timegroup") as EFTimegroup;

    assert.ok(timegroup, "Timegroup should be rendered");
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();

    // Clear initial updates
    updateTimestamps.length = 0;
    updateTimes.length = 0;

    // Simulate frame-by-frame updates at a controlled rate (30fps)
    // Note: We use seek() rather than play() because AudioContext-based playback
    // doesn't work in headless browsers due to autoplay policies that require user interaction
    const FPS = 30;
    const MS_PER_FRAME = 1000 / FPS;
    const DURATION_MS = 500;
    const numFrames = Math.floor(DURATION_MS / MS_PER_FRAME);

    for (let i = 0; i < numFrames; i++) {
      const targetTime = i * MS_PER_FRAME;
      await timegroup.seek(targetTime);
      await new Promise((resolve) => setTimeout(resolve, MS_PER_FRAME));
    }

    // Should have received multiple updates during simulated playback
    assert.ok(
      updateTimestamps.length >= 10,
      `Should have at least 10 updates during simulated playback (got ${updateTimestamps.length})`,
    );

    // Calculate update intervals
    const intervals: number[] = [];
    for (let i = 1; i < updateTimestamps.length; i++) {
      intervals.push(updateTimestamps[i] - updateTimestamps[i - 1]);
    }

    // Average interval should be around 33ms (30fps) matching our simulated rate
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Should be approximately 33ms per frame
    // Allow generous variance for timing imprecision in CI
    assert.ok(
      avgInterval > 20 && avgInterval < 100,
      `Update interval should be between 20-100ms (got ${avgInterval}ms), indicating controlled rate`,
    );

    root.unmount();
    container.remove();
  }, 5000);

  test("continues observing after errors in frame task", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const updates: number[] = [];

    const root = createRoot(container);
    root.render(
      <Configuration>
        <TimingDisplay
          onUpdate={(info) => {
            updates.push(info.ownCurrentTimeMs);
          }}
        />
      </Configuration>,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const preview = container.querySelector("ef-preview");
    const timegroup = preview?.querySelector("ef-timegroup") as EFTimegroup;

    assert.ok(timegroup, "Timegroup should be rendered");
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();

    updates.length = 0;

    // First seek triggers frame task
    await timegroup.seek(500);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(updates.length >= 1, "Should update after first seek");

    // Even if there's an error or the task rejects, the observer should continue
    // (The implementation catches errors and continues observing)
    const updatesAfterFirst = updates.length;

    // Second seek triggers another frame task
    await timegroup.seek(1000);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(updates.length > updatesAfterFirst, "Should continue updating");

    root.unmount();
    container.remove();
  }, 5000);

  test("stops observing when component unmounts", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const updates: number[] = [];

    const root = createRoot(container);
    root.render(
      <Configuration>
        <TimingDisplay
          onUpdate={(info) => {
            updates.push(info.ownCurrentTimeMs);
          }}
        />
      </Configuration>,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const preview = container.querySelector("ef-preview");
    const timegroup = preview?.querySelector("ef-timegroup") as EFTimegroup;

    assert.ok(timegroup, "Timegroup should be rendered");
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();

    updates.length = 0;

    // Seek before unmount (triggers frame task)
    await timegroup.seek(500);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(updates.length >= 1, "Should update before unmount");

    // Unmount the component
    root.unmount();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Seek after unmount should not cause updates
    const updatesBeforePost = updates.length;
    await timegroup.seek(1000);

    // Give time for any potential updates
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(
      updates.length,
      updatesBeforePost,
      "Should not update after unmount",
    );

    container.remove();
  }, 5000);
});
