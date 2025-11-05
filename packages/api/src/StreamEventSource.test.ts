import { createTestStream } from "TEST/createTestStream.js";
import { describe, expect, test } from "vitest";

import {
  StreamEventSource,
  type StreamEventSourceEventMap,
} from "./StreamEventSource.js";

const collectEvents = (
  eventSource: StreamEventSource,
  events: (keyof StreamEventSourceEventMap)[],
) => {
  const collectedEvents: any[] = [];
  for (const event of events) {
    eventSource.on(event, (data: any) => {
      collectedEvents.push(data);
    });
  }
  return collectedEvents;
};

describe("StreamEventSource", () => {
  test("Emits events progress and complete events", async () => {
    const { stream, event, end } = createTestStream();

    const eventSource = new StreamEventSource(stream, new AbortController());
    const collectedEvents = collectEvents(eventSource, [
      "progress",
      "complete",
    ]);
    event("progress", { progress: 0.1 });
    event("progress", { progress: 1 });
    event("complete", {});
    end();
    await eventSource.whenClosed();
    expect(collectedEvents).toEqual([
      { type: "progress", data: { progress: 0.1 } },
      { type: "progress", data: { progress: 1 } },
      { type: "complete", data: {} },
    ]);
  });

  test("Emits error events", async () => {
    const { stream, event, end } = createTestStream();

    const eventSource = new StreamEventSource(stream, new AbortController());
    const collectedEvents = collectEvents(eventSource, ["error"]);
    event("error", { error: "test" });
    end();
    await eventSource.whenClosed();
    expect(collectedEvents).toEqual([new Error(`{"error":"test"}`)]);
  });

  test("Emits unknown events as error events", async () => {
    const { stream, event, end } = createTestStream();

    const eventSource = new StreamEventSource(stream, new AbortController());
    const collectedEvents = collectEvents(eventSource, ["error"]);
    event("BAD_EVENT", { unknown: "test" });
    end();
    await eventSource.whenClosed();
    expect(collectedEvents).toMatchInlineSnapshot(`
      [
        [Error: Unknown event: BAD_EVENT data: {"unknown":"test"}],
      ]
    `);
  });

  test("Emits message events", async () => {
    const { stream, message, end } = createTestStream();

    const eventSource = new StreamEventSource(stream, new AbortController());
    const collectedEvents = collectEvents(eventSource, ["message"]);
    message("test");
    end();
    await eventSource.whenClosed();
    expect(collectedEvents).toEqual([{ id: undefined, data: "test" }]);
  });
});
