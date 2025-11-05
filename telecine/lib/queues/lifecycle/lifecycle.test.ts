import { describe, expect, test } from "vitest";

import { fixtures } from "../fixtures";
import { makeQueues } from "../makeQueues";
import { Consumer } from "./Consumer";
import { publishJobLifecycle } from "./Producer";

describe("lifecycle", async () => {
  const queues = await fixtures(makeQueues);

  test("should work", async () => {
    const consumer = await Consumer.create({
      storage: queues.storage,
      consumerId: "1",
      streamKey: "lifecycle:jobs",
      batchSize: 1000,
      blockTimeMs: 1,
    });

    await publishJobLifecycle(queues.storage, {
      queue: queues.TestQueue.name,
      jobId: "1",
      attemptNumber: 1,
      workflow: queues.TestWorkflow.name,
      workflowId: "1",
      type: "job",
      event: "started",
      timestamp: Date.now(),
    });

    const messages = await consumer.readNewMessages();

    expect(messages).toEqual({
      [consumer.streamKey]: [
        {
          id: expect.any(String),
          data: {
            jobId: "1",
            queue: "test",
            workflow: "test-workflow",
            workflowId: "1",
            event: "started",
            timestamp: expect.any(String),
            type: "job",
            attemptNumber: "1",
          },
        },
      ],
    });

    await consumer.readNewMessages();

    await expect(consumer.getPendingMessages()).resolves.toHaveLength(1);

    await expect(consumer.claimPendingMessages(0)).resolves.toEqual([
      {
        id: expect.any(String),
        data: {
          jobId: "1",
          queue: "test",
          workflow: "test-workflow",
          type: "job",
          attemptNumber: "1",
          workflowId: "1",
          event: "started",
          timestamp: expect.any(String),
        },
      },
    ]);

    await consumer.acknowledgeMessages(messages[consumer.streamKey]!);

    await expect(consumer.getPendingMessages()).resolves.toHaveLength(0);

    await expect(consumer.readNewMessages()).resolves.toEqual({});
  });
});
