import { describe, test, expect, beforeEach } from "vitest";

import { fixtures } from "./fixtures";
import { makeQueues } from "./makeQueues";
import {
  claimJob,
  completeJob,
  type EnqueableJobWithQueue,
  failJob,
} from "./Job";
import type { Workflow } from "./Workflow";
import { sleep } from "@/util/sleep";

describe("Queue", async () => {
  const queues = fixtures(makeQueues);

  let job1: EnqueableJobWithQueue<unknown> & {
    workflow: Workflow<unknown>;
  };

  let job2: EnqueableJobWithQueue<unknown> & {
    workflow: Workflow<unknown>;
  };

  let secondOrgJob: EnqueableJobWithQueue<unknown> & {
    workflow: Workflow<unknown>;
  };
  let thirdOrgJob: EnqueableJobWithQueue<unknown> & {
    workflow: Workflow<unknown>;
  };

  beforeEach(() => {
    job1 = {
      queue: queues.TestQueue,
      workflow: queues.TestWorkflow,
      workflowId: "workflow1",
      jobId: "job1",
      orgId: "org1",
      payload: {},
    };
    job2 = {
      queue: queues.TestQueue,
      workflow: queues.TestWorkflow,
      workflowId: "workflow2",
      jobId: "job2",
      orgId: "org1",
      payload: {},
    };
    secondOrgJob = {
      queue: queues.TestQueue,
      workflow: queues.TestWorkflow,
      workflowId: "workflow3",
      jobId: "job3",
      orgId: "org2",
      payload: {},
    };
    thirdOrgJob = {
      queue: queues.TestQueue,
      workflow: queues.TestWorkflow,
      workflowId: "workflow4",
      jobId: "job4",
      orgId: "org3",
      payload: {},
    };
  });

  test("returns initial stats", async () => {
    const stats = await queues.TestQueue.getStats();
    expect(stats).toEqual({
      queued: 0,
      claimed: 0,
      completed: 0,
      failed: 0,
      stalled: 0,
    });
  });

  describe("with one enqueued job", () => {
    beforeEach(async () => {
      await queues.TestWorkflow.enqueueJob(job1);
    });

    test("returns stats after jobs are enqueued", async () => {
      const stats = await queues.TestQueue.getStats();
      expect(stats).toEqual({
        queued: 1,
        claimed: 0,
        completed: 0,
        failed: 0,
        stalled: 0,
      });
    });

    describe("with duplicate jobs", () => {
      beforeEach(async () => {
        await queues.TestWorkflow.enqueueJob(job1);
      });

      test("returns stats after jobs are enqueued", async () => {
        const stats = await queues.TestQueue.getStats();
        expect(stats).toEqual({
          queued: 1,
          claimed: 0,
          completed: 0,
          failed: 0,
          stalled: 0,
        });
      });

      test("adds org to queue orgs set", async () => {
        const orgs = await queues.TestQueue.storage.zrange(
          `queues:${queues.TestQueue.name}:orgs`,
          0,
          -1,
        );
        expect(orgs).toEqual([
          `queues:${queues.TestQueue.name}:orgs:${job1.orgId}`,
        ]);
      });

      test("adds workflow to queue orgs:orgId:workflows set", async () => {
        const workflows = await queues.TestQueue.storage.zrange(
          `queues:${queues.TestQueue.name}:orgs:${job1.orgId}:workflows`,
          0,
          -1,
        );
        expect(workflows).toEqual([
          `queues:${queues.TestQueue.name}:orgs:${job1.orgId}:workflows:${job1.workflowId}`,
        ]);
      });
    });

    describe("with claimed job", () => {
      beforeEach(async () => {
        await claimJob(queues.TestQueue.storage, {
          queue: queues.TestQueue.name,
        });
      });

      test("returns stats after jobs are claimed", async () => {
        const stats = await queues.TestQueue.getStats();
        expect(stats).toEqual({
          queued: 0,
          claimed: 1,
          completed: 0,
          failed: 0,
          stalled: 0,
        });
      });

      describe("with completed jobs", () => {
        beforeEach(async () => {
          await completeJob(
            queues.TestQueue.storage,
            job1.queue.name,
            job1.orgId,
            job1.workflow.name,
            job1.workflowId,
            job1.jobId,
          );
        });

        test("returns stats after jobs are completed", async () => {
          const stats = await queues.TestQueue.getStats();
          expect(stats).toEqual({
            queued: 0,
            claimed: 0,
            completed: 1,
            failed: 0,
            stalled: 0,
          });
        });
      });

      describe("with failed job", () => {
        beforeEach(async () => {
          await failJob(
            queues.TestQueue.storage,
            job1.queue.name,
            job1.orgId,
            job1.workflow.name,
            job1.workflowId,
            job1.jobId,
          );
        });

        test("returns stats after jobs are failed", async () => {
          const stats = await queues.TestQueue.getStats();
          expect(stats).toEqual({
            queued: 0,
            claimed: 0,
            completed: 0,
            failed: 1,
            stalled: 0,
          });
        });
      });
    });
  });

  describe("with multiple enqueued jobs", () => {
    beforeEach(async () => {
      await queues.TestWorkflow.enqueueJob(job1);
      await queues.TestWorkflow.enqueueJob(job2);
    });

    test("should have two queued jobs", async () => {
      const stats = await queues.TestQueue.getStats();
      expect(stats.queued).toBe(2);
    });

    describe("with one job completed", () => {
      beforeEach(async () => {
        await claimJob(queues.TestQueue.storage, {
          queue: queues.TestQueue.name,
        });
        await completeJob(
          queues.TestQueue.storage,
          job1.queue.name,
          job1.orgId,
          job1.workflow.name,
          job1.workflowId,
          job1.jobId,
        );
      });

      test("should have one completed and one queued", async () => {
        const stats = await queues.TestQueue.getStats();
        expect(stats.completed).toBe(1);
        expect(stats.queued).toBe(1);
      });
    });
  });

  describe("with jobs from three orgs", () => {
    beforeEach(async () => {
      await queues.TestWorkflow.enqueueJob(job1);
      await queues.TestWorkflow.enqueueJob(job2);
      await queues.TestWorkflow.enqueueJob(secondOrgJob);
      await queues.TestWorkflow.enqueueJob(thirdOrgJob);
    });

    describe("with first org's job completed and cleaned up", () => {
      beforeEach(async () => {
        // Ensure we get new scores on milisecond accuracy
        await sleep(1);
        await claimJob(queues.TestQueue.storage, {
          queue: queues.TestQueue.name,
        });
        await completeJob(
          queues.TestQueue.storage,
          job1.queue.name,
          job1.orgId,
          job1.workflow.name,
          job1.workflowId,
          job1.jobId,
        );
      });

      test("second org's job should be claimed next", async () => {
        const claimedJob = await claimJob(queues.TestQueue.storage, {
          queue: queues.TestQueue.name,
        });
        expect(claimedJob?.jobId).toEqual(secondOrgJob.jobId);
      });

      describe("with second org's job completed and cleaned up", () => {
        beforeEach(async () => {
          await claimJob(queues.TestQueue.storage, {
            queue: queues.TestQueue.name,
          });
          await completeJob(
            queues.TestQueue.storage,
            secondOrgJob.queue.name,
            secondOrgJob.orgId,
            secondOrgJob.workflow.name,
            secondOrgJob.workflowId,
            secondOrgJob.jobId,
          );
        });

        test("third org's job should be claimed next", async () => {
          const claimedJob = await claimJob(queues.TestQueue.storage, {
            queue: queues.TestQueue.name,
          });
          expect(claimedJob?.jobId).toEqual(thirdOrgJob.jobId);
        });
      });
    });
  });

  describe("workflow with multiple queues", () => {
    let queue1Job: EnqueableJobWithQueue<unknown> & {
      workflow: Workflow<unknown>;
    };
    let queue2Job: EnqueableJobWithQueue<unknown> & {
      workflow: Workflow<unknown>;
    };

    beforeEach(async () => {
      queue1Job = {
        queue: queues.TestQueue,
        workflow: queues.TestWorkflow,
        workflowId: "workflow1",
        jobId: "job1",
        orgId: "org1",
        payload: {},
      };
      queue2Job = {
        queue: queues.TestQueue,
        workflow: queues.TestWorkflow,
        workflowId: "workflow1",
        jobId: "job2",
        orgId: "org1",
        payload: {},
      };

      await queues.TestWorkflow.enqueueJob(queue1Job);
      await queues.TestWorkflow.enqueueJob(queue2Job);
    });

    describe("first job fails befoe second job is claimed", () => {
      beforeEach(async () => {
        await claimJob(queues.TestQueue.storage, {
          queue: queues.TestQueue.name,
        });
        await failJob(
          queues.TestQueue.storage,
          queues.TestQueue.name,
          queue1Job.orgId,
          queue1Job.workflow.name,
          queue1Job.workflowId,
          queue1Job.jobId,
        );
      });

      test("all queued jobs in workflow should be failed", async () => {
        const stats = await queues.TestQueue.getStats();
        expect(stats).toEqual({
          queued: 0,
          claimed: 0,
          completed: 0,
          failed: 2,
          stalled: 0,
        });
      });

      test("workflow should register as failed", async () => {});

      test("second job should not be claimable", async () => {
        const claimedJob = await claimJob(queues.TestQueue.storage, {
          queue: queues.TestQueue.name,
        });
        expect(claimedJob).toBeNull();
      });
    });

    describe("first job fails after second job is claimed", () => {
      beforeEach(async () => {
        await claimJob(queues.TestQueue.storage, {
          queue: queues.TestQueue.name,
        });
        await claimJob(queues.TestQueue.storage, {
          queue: queues.TestQueue.name,
        });
        await failJob(
          queues.TestQueue.storage,
          queues.TestQueue.name,
          queue1Job.orgId,
          queue1Job.workflow.name,
          queue1Job.workflowId,
          queue1Job.jobId,
        );
        await completeJob(
          queues.TestQueue.storage,
          queue2Job.queue.name,
          queue2Job.orgId,
          queue2Job.workflow.name,
          queue2Job.workflowId,
          queue2Job.jobId,
        );
      });

      test("stats should be correct", async () => {
        const stats = await queues.TestQueue.getStats();
        expect(stats).toEqual({
          queued: 0,
          claimed: 0,
          completed: 1,
          failed: 1,
          stalled: 0,
        });
      });

      test("workflow should register as failed", async () => {});
    });
  });

  describe("job idempotency", () => {
    test("jobs enqueued twice should only be enqueued once", async () => {
      await queues.TestWorkflow.enqueueJob(job1);
      await queues.TestWorkflow.enqueueJob(job1);
      const stats = await queues.TestQueue.getStats();
      expect(stats).toEqual({
        queued: 1,
        claimed: 0,
        completed: 0,
        failed: 0,
        stalled: 0,
      });

      await expect(
        queues.TestWorkflow.getJobs(job1.workflowId, "queued"),
      ).resolves.toHaveLength(1);
    });

    test("when enqueing the same job id in separate workflows, the second workflow should not be created", async () => {
      const jobInWorkflow1 = {
        jobId: "job1",
        workflowId: "workflow1",
        queue: queues.TestQueue,
        workflow: queues.TestWorkflow,
        orgId: "org1",
        payload: {},
      };
      const jobInWorkflow2 = {
        jobId: "job1",
        workflowId: "workflow2",
        queue: queues.TestQueue,
        workflow: queues.TestWorkflow,
        orgId: "org1",
        payload: {},
      };

      await queues.TestWorkflow.enqueueJob(jobInWorkflow1);
      await queues.TestWorkflow.enqueueJob(jobInWorkflow2);

      const stats = await queues.TestQueue.getStats();

      expect(stats).toEqual({
        queued: 1,
        claimed: 0,
        completed: 0,
        failed: 0,
        stalled: 0,
      });

      await expect(
        queues.storage.exists("workflows:workflow1:queued"),
      ).resolves.toBe(1);

      await expect(
        queues.storage.exists("workflows:workflow2:queued"),
      ).resolves.toBe(0);
    });
  });
});
