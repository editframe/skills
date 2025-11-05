import { TaskStatus } from "@lit/task";
import { customElement } from "lit/decorators.js";
import { afterEach, beforeEach, describe, vi } from "vitest";
import { test as baseTest } from "../../../../test/useMSW.js";
import { EFAudio } from "../../EFAudio";
import { makeAudioInitSegmentFetchTask } from "./makeAudioInitSegmentFetchTask";

@customElement("test-media-audio-init-segment-fetch")
class TestMediaAudioInitSegmentFetch extends EFAudio {}

declare global {
  interface HTMLElementTagNameMap {
    "test-media-audio-init-segment-fetch": TestMediaAudioInitSegmentFetch;
  }
}

const test = baseTest.extend<{
  element: TestMediaAudioInitSegmentFetch;
}>({
  element: async ({}, use) => {
    const element = document.createElement(
      "test-media-audio-init-segment-fetch",
    );
    await use(element);
    element.remove();
  },
});

describe("makeAudioInitSegmentFetchTask", () => {
  beforeEach(() => {
    // MSW setup is now handled by test fixtures
  });

  afterEach(() => {
    const elements = document.querySelectorAll(
      "test-media-audio-init-segment-fetch",
    );
    for (const element of elements) {
      element.remove();
    }
    vi.restoreAllMocks();
  });

  test("creates task with correct initial state", ({ element, expect }) => {
    const task = makeAudioInitSegmentFetchTask(element);

    expect(task).toBeDefined();
    expect(task.status).toBe(TaskStatus.INITIAL);
    expect(task.value).toBeUndefined();
    expect(task.error).toBeUndefined();
  });

  test("task integrates with element properties", ({ element, expect }) => {
    const task = makeAudioInitSegmentFetchTask(element);

    expect(task).toBeDefined();
    expect(task.status).toBe(TaskStatus.INITIAL);
  });
});
