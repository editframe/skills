import { describe, test, expect, beforeAll } from "vitest";
import { makeTestAgent, type TestAgent } from "TEST/util/test";
import { processTestVideoAsset } from "./test-utils";
import { RenderFragmentQueue } from "./RenderFragmentQueue";
import { RenderFragmentWorker } from "./RenderFragment";
import type { Selectable } from "kysely";
import type { Video2IsobmffFiles } from "@/sql-client.server/kysely-codegen";

describe("RenderFragment", () => {
  let testAgent: TestAgent;
  let barsNTone: Selectable<Video2IsobmffFiles>;

  beforeAll(async () => {
    testAgent = await makeTestAgent("render-fragment-test@example.org");
    barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
  }, 30_000);

  describe("Queue Configuration", () => {
    test("initializes queue with correct settings", () => {
      expect(RenderFragmentQueue.name).toBe("render-fragment");
      expect(RenderFragmentQueue.maxWorkerCount).toBeGreaterThan(0);
      expect(RenderFragmentQueue.workerConcurrency).toBeGreaterThan(0);
    });
  });

  describe("Worker Lifecycle", () => {
    test("worker initializes with queue binding", () => {
      expect(RenderFragmentWorker.queue).toBe(RenderFragmentQueue);
    });
  });

  describe("Basic Integration", () => {
    test("queue and worker are properly configured", () => {
      expect(RenderFragmentQueue.name).toBe("render-fragment");
      expect(RenderFragmentWorker.queue).toBe(RenderFragmentQueue);
    });

    test("worker has execute method", () => {
      expect(RenderFragmentWorker.execute).toBeDefined();
      expect(typeof RenderFragmentWorker.execute).toBe("function");
    });
  });
}); 