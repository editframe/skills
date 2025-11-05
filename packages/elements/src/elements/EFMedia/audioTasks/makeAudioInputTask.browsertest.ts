import { TaskStatus } from "@lit/task";
import { customElement } from "lit/decorators.js";
import { afterEach, beforeEach, describe, vi } from "vitest";
import { test as baseTest } from "../../../../test/useMSW.js";
import { EFAudio } from "../../EFAudio";
import { makeAudioInputTask } from "./makeAudioInputTask";

@customElement("test-media-audio-input")
class TestMediaAudioInput extends EFAudio {}

declare global {
  interface HTMLElementTagNameMap {
    "test-media-audio-input": TestMediaAudioInput;
  }
}

const test = baseTest.extend<{
  element: TestMediaAudioInput;
}>({
  element: async ({}, use) => {
    const element = document.createElement("test-media-audio-input");
    await use(element);
    element.remove();
  },
});

describe("makeAudioInputTask", () => {
  beforeEach(() => {
    // MSW setup is now handled by test fixtures
  });

  afterEach(() => {
    const elements = document.querySelectorAll("test-media-audio-input");
    for (const element of elements) {
      element.remove();
    }
    vi.restoreAllMocks();
  });

  test("creates task with correct initial state", ({ element, expect }) => {
    const task = makeAudioInputTask(element);

    expect(task).toBeDefined();
    expect(task.status).toBe(TaskStatus.INITIAL);
    expect(task.value).toBeUndefined();
    expect(task.error).toBeUndefined();
  });

  test("task integrates with element properties", ({ element, expect }) => {
    const task = makeAudioInputTask(element);

    expect(task).toBeDefined();
    expect(task.status).toBe(TaskStatus.INITIAL);
  });
});
