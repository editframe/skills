import { valkey } from "@/valkey/valkey";
import { beforeEach, describe, expect, test } from "vitest";
import { getTestPrefix } from "TEST/util/getTestPrefix";
import {
  type ProgressItem,
  ProgressTracker,
  ProgressTrackerTimeoutError,
} from "./ProgressTracker";
import { sleep } from "@/util/sleep";

describe("ProgressTracker", () => {
  beforeEach(async () => {
    const keys = await valkey.keys(`${getTestPrefix()}*`);
    if (keys.length > 0) {
      await valkey.del(keys);
    }
  });

  describe("iterator", () => {
    test("yields all items asynchronously", async () => {
      const key = `${getTestPrefix()}`;
      const tracker = new ProgressTracker(key);

      // biome-ignore lint/suspicious/noAsyncPromiseExecutor: Testing iterator rollup
      const iteratorPromise = new Promise(async (resolve) => {
        const events: ProgressItem[] = [];
        const iterator = tracker.iterator();
        for await (const event of iterator) {
          events.push(event);
        }
        resolve(events);
      });

      await sleep(10);
      await tracker.writeProgress(0);
      await sleep(10);
      await tracker.writeProgress(0.5);
      await sleep(10);
      await tracker.writeProgress(1);

      await expect(iteratorPromise).resolves.toEqual([
        { type: "progress", id: expect.any(String), progress: 0 },
        { type: "progress", id: expect.any(String), progress: 0.5 },
        { type: "progress", id: expect.any(String), progress: 1 },
      ]);
    });

    test("Yields items that were written before the iterator was created", async () => {
      const key = `${getTestPrefix()}`;
      const tracker = new ProgressTracker(key);

      await sleep(10);
      await tracker.writeProgress(0);
      // biome-ignore lint/suspicious/noAsyncPromiseExecutor: Testing iterator rollup
      const iteratorPromise = new Promise(async (resolve) => {
        const events: ProgressItem[] = [];
        const iterator = tracker.iterator();
        for await (const event of iterator) {
          events.push(event);
        }
        resolve(events);
      });
      await sleep(10);
      await tracker.writeProgress(0.5);
      await sleep(10);
      await tracker.writeProgress(1);

      await expect(iteratorPromise).resolves.toEqual([
        { type: "progress", id: expect.any(String), progress: 0 },
        { type: "progress", id: expect.any(String), progress: 0.5 },
        { type: "progress", id: expect.any(String), progress: 1 },
      ]);
    });

    test("throws a timeout error if no updates are received", async () => {
      const key = `${getTestPrefix()}`;
      const tracker = new ProgressTracker(key, 10, 10);
      const iterator = tracker.iterator(10);
      // biome-ignore lint/suspicious/noAsyncPromiseExecutor: Testing iterator rollup
      const iteratorPromise = new Promise(async (resolve, reject) => {
        try {
          for await (const _ of iterator) {
            resolve(true);
          }
        } catch (error) {
          reject(error);
        }
      });
      await expect(iteratorPromise).rejects.toThrow(
        ProgressTrackerTimeoutError,
      );
    });
  });

  describe("max_len", () => {
    test("Restricts stream length", async () => {
      const key = `${getTestPrefix()}`;
      const tracker = new ProgressTracker(key, 1);
      for (let i = 0; i < 10; i++) {
        await tracker.writeProgress(i);
      }

      const items = await tracker.getAllItems();
      expect(items.length).toEqual(1);
    });
  });

  describe("getAllItems", () => {
    test("returns empty array if there are no items", async () => {
      const key = `${getTestPrefix()}`;
      const tracker = new ProgressTracker(key);
      await expect(tracker.getAllItems()).resolves.toEqual([]);
    });

    test("returns all items", async () => {
      const key = `${getTestPrefix()}`;
      const tracker = new ProgressTracker(key);
      await tracker.writeProgress(50);
      await tracker.writeProgress(100);

      await expect(tracker.getAllItems()).resolves.toEqual([
        { type: "progress", id: expect.any(String), progress: 50 },
        { type: "progress", id: expect.any(String), progress: 100 },
      ]);
    });
  });

  describe("Failed process", () => {
    test("yields a failure event", async () => {
      const key = `${getTestPrefix()}`;
      const tracker = new ProgressTracker(key);
      await tracker.writeFailure("Bad things happened");
      await expect(tracker.getLastItem()).resolves.toEqual({
        id: expect.any(String),
        type: "failure",
        message: "Bad things happened",
      });
    });
  });

  describe("getLastItem", () => {
    test("returns null if there are no items", async () => {
      const key = `${getTestPrefix()}`;
      const tracker = new ProgressTracker(key);
      await expect(tracker.getLastItem()).resolves.toBeUndefined();
    });

    test("returns the last item", async () => {
      const key = `${getTestPrefix()}`;
      const tracker = new ProgressTracker(key);
      await tracker.writeProgress(50);
      await tracker.writeProgress(100);

      await expect(tracker.getLastItem()).resolves.toEqual({
        type: "progress",
        id: expect.any(String),
        progress: 100,
      });
    });
  });
});
