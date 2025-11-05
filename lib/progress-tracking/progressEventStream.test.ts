import { describe, test, expect, beforeAll } from "vitest";
import { ProgressTracker } from "@/progress-tracking/ProgressTracker";
import { valkey } from "@/valkey/valkey";
import { sleep } from "@/util/sleep";
import { StreamEventSource } from "TEST/util/StreamEventSource";
import { progressEventStream } from "./progressEventStream";

describe("progressEventStream", () => {
  beforeAll(async () => {
    await valkey.flushall("SYNC");
  });

  test("Immediately returns complete if the process is already complete", async () => {
    const response = progressEventStream("process-isobmff", {
      id: "123",
      completed_at: "now",
      failed_at: null,
    });
    await sleep(10);
    const events: any[] = [];
    const eventSource = new StreamEventSource(response.body!);
    eventSource.on("complete", () => {
      events.push({ type: "complete" });
    });
    await eventSource.whenClosed();

    expect(events).toEqual([{ type: "complete" }]);
  });

  test("Immediately returns failure if the process has failed", async () => {
    const response = progressEventStream("process-isobmff", {
      id: "123",
      completed_at: null,
      failed_at: "now",
    });
    await sleep(10);
    const events: any[] = [];
    const eventSource = new StreamEventSource(response.body!);
    eventSource.on("error", (event) => {
      events.push({ type: "error", message: event });
    });
    await eventSource.whenClosed();
  });

  test("Returns failed event if the process fails mid-way", async () => {
    const response = progressEventStream("process-isobmff", {
      id: "123-partial",
      completed_at: null,
      failed_at: null,
    });
    const progressTracker = new ProgressTracker("process-isobmff:123-partial");
    await sleep(10);
    const events: any[] = [];
    const eventSource = new StreamEventSource(response.body!);
    eventSource.on("error", (event) => {
      events.push({ type: "error", message: event });
    });

    await progressTracker.writeFailure("Test failure");
    await eventSource.whenClosed();

    expect(events).toEqual([
      { type: "error", message: '{"message":"Test failure"}' },
    ]);
  });

  test("returns a stream of progress events", async () => {
    const response = progressEventStream("process-isobmff", {
      id: "123-full",
      completed_at: null,
      failed_at: null,
    });

    const eventSource = new StreamEventSource(response.body!);

    const events: any[] = [];
    eventSource.on("progress", (event) => {
      events.push(JSON.parse(event));
    });
    eventSource.on("complete", () => {
      events.push({ type: "complete" });
    });

    const progressTracker = new ProgressTracker("process-isobmff:123-full");
    // Waiting for the progress tracker to start listening is not reliable.
    // But I have not yet figured out the explicit thing to wait for.
    await progressTracker.writeProgress(0);
    await progressTracker.writeProgress(0.5);
    await progressTracker.writeProgress(1);

    await eventSource.whenClosed();

    expect(events).toEqual([
      { progress: 0 },
      { progress: 0.5 },
      { progress: 1 },
      { type: "complete" },
    ]);
  });
});
