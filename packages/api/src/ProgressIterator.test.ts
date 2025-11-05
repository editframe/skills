import { createTestStream } from "TEST/createTestStream.js";
import { describe, expect, test } from "vitest";
import { ProgressIterator } from "./ProgressIterator.js";
import {
  type CompleteEvent,
  type ProgressEvent,
  StreamEventSource,
} from "./StreamEventSource.js";

describe("ProgressIterator", () => {
  test("Fulfills promise when complete event is emitted", async () => {
    const { stream, event, end } = createTestStream();
    const eventSource = new StreamEventSource(stream, new AbortController());
    const iterator = new ProgressIterator(eventSource);
    const iteratorPromise = iterator.whenComplete();

    event("progress", { progress: 0.1 });
    event("progress", { progress: 0.2 });
    event("complete", {});
    end();

    await expect(iteratorPromise).resolves.toEqual([
      { type: "progress", data: { progress: 0.1 } },
      { type: "progress", data: { progress: 0.2 } },
      { type: "complete", data: {} },
    ]);
  });

  test("Fulfills promise if registered after events are emitted", async () => {
    const { stream, event, end } = createTestStream();
    const eventSource = new StreamEventSource(stream, new AbortController());
    const iterator = new ProgressIterator(eventSource);

    event("progress", { progress: 0.1 });
    event("progress", { progress: 0.2 });
    event("complete", {});
    end();

    await expect(iterator.whenComplete()).resolves.toEqual([
      { type: "progress", data: { progress: 0.1 } },
      { type: "progress", data: { progress: 0.2 } },
      { type: "complete", data: {} },
    ]);
  });

  test("Rejects promise if error event is emitted", async () => {
    const { stream, event, end } = createTestStream();
    const eventSource = new StreamEventSource(stream, new AbortController());
    const iterator = new ProgressIterator(eventSource);
    const iteratorPromise = iterator.whenComplete();

    event("error", { error: "test" });
    end();

    await expect(iteratorPromise).rejects.toThrowError("test");
  });

  test("Iterates over all events", async () => {
    const { stream, event, end } = createTestStream();
    const eventSource = new StreamEventSource(stream, new AbortController());
    const iterator = new ProgressIterator(eventSource);
    const iteratorPromise = new Promise<
      (ProgressEvent | CompleteEvent)[]
      // biome-ignore lint/suspicious/noAsyncPromiseExecutor: Just a test. It's fine.
    >(async (resolve) => {
      const events: (ProgressEvent | CompleteEvent)[] = [];
      for await (const event of iterator) {
        events.push(event);
      }
      resolve(events);
    });

    event("progress", { progress: 0.1 });
    event("progress", { progress: 0.2 });
    event("complete", {});
    end();

    await expect(iteratorPromise).resolves.toEqual([
      { type: "progress", data: { progress: 0.1 } },
      { type: "progress", data: { progress: 0.2 } },
      { type: "complete", data: {} },
    ]);
  });

  test("Iterates over all events even if error is emitted", async () => {
    const { stream, event, end } = createTestStream();
    const eventSource = new StreamEventSource(stream, new AbortController());
    const iterator = new ProgressIterator(eventSource);

    const iteratorPromise = new Promise<
      (ProgressEvent | CompleteEvent)[]
      // biome-ignore lint/suspicious/noAsyncPromiseExecutor: Just a test. It's fine.
    >(async (resolve, reject) => {
      const events: (ProgressEvent | CompleteEvent)[] = [];
      try {
        for await (const event of iterator) {
          events.push(event);
        }
        resolve(events);
      } catch (error) {
        reject(error);
      }
    });

    event("error", { error: "test" });
    end();

    await expect(iteratorPromise).rejects.toThrowError("test");
  });
});
