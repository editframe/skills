import { describe, test, expect, beforeEach } from "vitest";

import { fixtures } from "./fixtures";
import { makeQueues } from "./makeQueues";
import {
  claimJob,
  completeJob,
  deleteJob,
  enqueueJob,
  enqueueJobs,
  extendClaim,
  failJob,
  getJob,
  getStalledJobs,
  releaseJob,
  retryJob,
  stallJob,
} from "./Job";
import { sleep } from "@/util/sleep";

describe("Job", async () => {
  const queues = fixtures(makeQueues);
  const jobs = fixtures(async () => {
    return {
      job1: {
        queue: queues.TestQueue.name,
        workflowId: "workflow1",
        jobId: "job1",
        orgId: "org1",
        payload: {},
        workflow: queues.TestWorkflow.name,
        attempts: 0,
        claimedAt: null,
      },
      job2: {
        queue: queues.TestQueue.name,
        workflowId: "workflow1",
        jobId: "job2",
        orgId: "org1",
        payload: {},
        workflow: queues.TestWorkflow.name,
        attempts: 0,
        claimedAt: null,
      },
      job3: {
        queue: queues.TestQueue.name,
        workflowId: "workflow2",
        jobId: "job3",
        orgId: "org1",
        payload: {},
        workflow: queues.TestWorkflow2.name,
        attempts: 0,
        claimedAt: null,
      },
    } as const;
  });

  describe("claimJob", () => {
    test("returns null if no job is found", async () => {
      const job = await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      expect(job).toBeNull();
    });

    test("returns a job if one is found", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      const job = await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      expect(job).toEqual(jobs.job1);
    });

    test("moves job to claimed stage for queue", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });

      await expect(
        queues.storage.zrange("queues:test:claimed", 0, -1),
      ).resolves.toEqual(["queues:test:jobs:job1"]);
    });

    test("moves job to claimed stage for workflow", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });

      await expect(
        queues.storage.zrange("workflows:workflow1:claimed", 0, -1),
      ).resolves.toEqual(["queues:test:jobs:job1"]);
    });
  });

  describe("enqueueJob", () => {
    test("adds job to claimable structure", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);

      await expect(
        queues.storage.zrange(
          "queues:test:orgs:org1:workflows:workflow1:queued",
          0,
          -1,
        ),
      ).resolves.toEqual(["queues:test:jobs:job1"]);
    });

    test("adds job to listing structure", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await expect(queues.TestQueue.getJobs("queued")).resolves.toEqual([
        jobs.job1,
      ]);
    });

    test("adds job to workflow", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await expect(
        queues.storage.zrange("workflows:workflow1:queued", 0, -1),
      ).resolves.toEqual(["queues:test:jobs:job1"]);
    });

    test("job enqueueing is idempotent", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await expect(queues.TestQueue.getJobs("queued")).resolves.toEqual([
        jobs.job1,
      ]);
    });

    test("enqueueing a job is idempontent even if the job has left the queued stage", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });

      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await expect(queues.TestQueue.getJobs("queued")).resolves.toEqual([]);
    });
  });

  describe("enqueueJobs", () => {
    test("enqueues multiple jobs", async () => {
      await enqueueJobs(queues.TestQueue.storage, [jobs.job1, jobs.job2]);

      await expect(queues.TestQueue.getJobs("queued")).resolves.toEqual([
        jobs.job1,
        jobs.job2,
      ]);
    });
  });

  describe("releaseJob", () => {
    test("moves job back into queued", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await expect(queues.TestQueue.getJobs("queued")).resolves.toEqual([]);
      await releaseJob(queues.TestQueue.storage, jobs.job1);
      await expect(queues.TestQueue.getJobs("queued")).resolves.toEqual([
        jobs.job1,
      ]);
    });

    test("increments job attempt count", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await releaseJob(queues.TestQueue.storage, jobs.job1);
      await expect(
        getJob(queues.TestQueue.storage, queues.TestQueue, jobs.job1.jobId),
      ).resolves.toMatchObject({
        attempts: 1,
      });
    });

    test("releases stalled jobs", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });

      await stallJob(queues.TestQueue.storage, jobs.job1);
      await expect(queues.TestQueue.getStalledJobs()).resolves.toEqual([
        jobs.job1,
      ]);
      await releaseJob(queues.TestQueue.storage, jobs.job1);
      await expect(queues.TestQueue.getStalledJobs()).resolves.toEqual([]);
    });

    test("jobs over maximum attempt count are moved to failed", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      for (let i = 0; i < 4; i++) {
        await claimJob(queues.TestQueue.storage, {
          queue: queues.TestQueue.name,
        });
        await releaseJob(queues.TestQueue.storage, jobs.job1);
      }
      await expect(
        getJob(queues.TestQueue.storage, queues.TestQueue, jobs.job1.jobId),
      ).resolves.toMatchObject({
        attempts: 3,
      });

      await expect(queues.TestQueue.getJobs("failed")).resolves.toEqual([
        jobs.job1,
      ]);
    });
  });

  describe("deleteJob", () => {
    test("deletes job data", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await expect(
        getJob(queues.TestQueue.storage, queues.TestQueue, jobs.job1.jobId),
      ).resolves.toEqual(jobs.job1);
      await deleteJob(queues.TestQueue.storage, jobs.job1, "queued");
      await expect(
        getJob(queues.TestQueue.storage, queues.TestQueue, jobs.job1.jobId),
      ).resolves.toBeNull();
    });

    test("deletes jobs from queued stage", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await deleteJob(queues.TestQueue.storage, jobs.job1, "queued");
      await expect(queues.TestQueue.getJobs("queued")).resolves.toEqual([]);
      await expect(
        getJob(queues.TestQueue.storage, queues.TestQueue, jobs.job1.jobId),
      ).resolves.toBeNull();
    });

    test("deletes jobs from claimed stage", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await deleteJob(queues.TestQueue.storage, jobs.job1, "claimed");
      await expect(queues.TestQueue.getJobs("claimed")).resolves.toEqual([]);
      await expect(
        getJob(queues.TestQueue.storage, queues.TestQueue, jobs.job1.jobId),
      ).resolves.toBeNull();
    });

    test("deletes jobs from failed stage", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await failJob(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        "org1",
        "test-workflow",
        "workflow1",
        "job1",
      );
      await deleteJob(queues.TestQueue.storage, jobs.job1, "failed");
      await expect(queues.TestQueue.getJobs("failed")).resolves.toEqual([]);
      await expect(
        getJob(queues.TestQueue.storage, queues.TestQueue, jobs.job1.jobId),
      ).resolves.toBeNull();
    });

    test("deletes stalled jobs", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await stallJob(queues.TestQueue.storage, jobs.job1);
      await deleteJob(queues.TestQueue.storage, jobs.job1, "claimed");
      await expect(queues.TestQueue.getStalledJobs()).resolves.toEqual([]);
      await expect(
        getJob(queues.TestQueue.storage, queues.TestQueue, jobs.job1.jobId),
      ).resolves.toBeNull();
    });
  });

  describe("retryJob", () => {
    beforeEach(async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await failJob(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        "org1",
        "test-workflow",
        "workflow1",
        "job1",
      );
      await retryJob(queues.TestQueue.storage, jobs.job1);
    });

    test("moves jobs from failed to queued", async () => {
      await expect(queues.TestQueue.getJobs("queued")).resolves.toEqual([
        jobs.job1,
      ]);
    });

    test("increments attempts", async () => {
      await expect(
        getJob(queues.TestQueue.storage, queues.TestQueue, jobs.job1.jobId),
      ).resolves.toMatchObject({
        attempts: 1,
      });
    });
  });

  describe("extendClaim", () => {
    test("extends claim", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      const loadedJob = await getJob(
        queues.TestQueue.storage,
        queues.TestQueue,
        jobs.job1.jobId,
      );
      await sleep(1);
      await extendClaim(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        jobs.job1.orgId,
        jobs.job1.workflow,
        jobs.job1.workflowId,
        jobs.job1.jobId,
      );
      const reloadedJob = await getJob(
        queues.TestQueue.storage,
        queues.TestQueue,
        jobs.job1.jobId,
      );
      expect(reloadedJob!.claimedAt! > loadedJob!.claimedAt!).toBe(true);
    });
  });

  describe("stallJob", () => {
    test("stalls job", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await stallJob(queues.TestQueue.storage, jobs.job1);

      await expect(
        getStalledJobs(queues.TestQueue.storage, queues.TestQueue.name),
      ).resolves.toEqual([jobs.job1]);
    });
  });

  describe("completeJob", () => {
    test("has no effect if job is not claimed", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await completeJob(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        "org1",
        "test-workflow",
        "workflow1",
        "job1",
      );
      await expect(queues.TestQueue.getJobs("completed")).resolves.toEqual([]);
    });

    test("moves job to complete queue", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await completeJob(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        "org1",
        "test-workflow",
        "workflow1",
        "job1",
      );

      await expect(queues.TestQueue.getJobs("completed")).resolves.toEqual([
        jobs.job1,
      ]);
    });

    test("moves job to completed stage in workflow", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await completeJob(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        jobs.job1.orgId,
        jobs.job1.workflow,
        jobs.job1.workflowId,
        jobs.job1.jobId,
      );

      await expect(
        queues.storage.zrange("workflows:workflow1:completed", 0, -1),
      ).resolves.toEqual(["queues:test:jobs:job1"]);
    });

    test("enqueues finalizer job if workflow has finalizer", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job3);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await completeJob(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        jobs.job3.orgId,
        jobs.job3.workflow,
        jobs.job3.workflowId,
        jobs.job3.jobId,
      );

      await expect(queues.TestQueue2.getJobs("queued")).resolves.toEqual([
        {
          attempts: 0,
          claimedAt: null,
          jobId: "workflow2-finalizer",
          orgId: "org1",
          payload: null,
          queue: "test2",
          workflow: "test-workflow2",
          workflowId: "workflow2",
        },
      ]);

      // Verify the fair scheduling structure is correct for the queued set
      await expect(
        queues.storage.zrange(
          "queues:test2:orgs:org1:workflows:workflow2:queued",
          0,
          -1,
        ),
      ).resolves.toEqual(["queues:test2:jobs:workflow2-finalizer"]);

      // Verify the fair scheduling structure is correct for the org workflows set
      await expect(
        queues.storage.zrange("queues:test2:orgs:org1:workflows", 0, -1),
      ).resolves.toEqual(["queues:test2:orgs:org1:workflows:workflow2"]);

      // Verify the fair scheduling structure is correct for the queue orgs set
      await expect(
        queues.storage.zrange("queues:test2:orgs", 0, -1),
      ).resolves.toEqual(["queues:test2:orgs:org1"]);
    });
  });

  describe("failJob", () => {
    test("romoves workflow from rotation if it's the last one", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await enqueueJob(queues.TestQueue.storage, jobs.job2);
      await failJob(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        "org1",
        "test-workflow",
        "workflow1",
        "job1",
      );

      expect(
        await queues.storage.zcard("queues:test:orgs:org1:workflows"),
      ).toBe(0);
    });

    test("removes org from rotation if it's the last one", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await enqueueJob(queues.TestQueue.storage, jobs.job2);
      await failJob(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        "org1",
        "test-workflow",
        "workflow1",
        "job1",
      );

      expect(await queues.storage.zcard("queues:test:orgs")).toBe(0);
    });

    test("moves jobs from claimed to failed", async () => {
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });
      await failJob(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        "org1",
        "test-workflow",
        "workflow1",
        "job1",
      );
    });

    test("fails other jobs in the workflow", async () => {
      // Setup: Enqueue two jobs in the same workflow
      await enqueueJob(queues.TestQueue.storage, jobs.job1);
      await enqueueJob(queues.TestQueue.storage, jobs.job2);

      // Claim first job
      await claimJob(queues.TestQueue.storage, {
        queue: queues.TestQueue.name,
      });

      // Call failJob which will trigger failWorkflow
      await failJob(
        queues.TestQueue.storage,
        queues.TestQueue.name,
        "org1",
        "test-workflow",
        "workflow1",
        "job1",
      );

      // Verify all jobs in workflow are failed
      const failedJobs = await queues.TestQueue.getJobs("failed");
      expect(failedJobs).toHaveLength(2);
      expect(failedJobs.map((job) => job.jobId)).toContain(jobs.job1.jobId);
      expect(failedJobs.map((job) => job.jobId)).toContain(jobs.job2.jobId);
      // Verify workflow status is set to failed
      const workflowStatus = await queues.TestQueue.storage.get(
        "workflows:workflow1:status",
      );
      expect(workflowStatus).toBe("failed");

      // Verify org workflow count is decremented
      const orgWorkflowCount = await queues.TestQueue.storage.zcard(
        "queues:TestQueue:orgs:org1:workflows",
      );
      expect(orgWorkflowCount).toBe(0);

      // Verify jobs are removed from queued and moved to failed stage
      const workflowQueuedCount = await queues.TestQueue.storage.zcard(
        "workflows:workflow1:queued",
      );
      const workflowFailedCount = await queues.TestQueue.storage.zcard(
        "workflows:workflow1:failed",
      );
      expect(workflowQueuedCount).toBe(0);
      expect(workflowFailedCount).toBe(2);
    });
  });
});
