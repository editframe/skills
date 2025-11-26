import type ValKey from "iovalkey";
import SuperJSON from "superjson";
import { z } from "zod";

import type { Queue } from "./Queue";
import { Workflow } from "./Workflow";
import { logger } from "@/logging";
import { executeSpan } from "@/tracing";

export const JobStage = z.enum([
  "queued",
  "claimed",
  "completed",
  "failed",
  "stalled",
]);

export type JobStage = z.infer<typeof JobStage>;
interface AbstractJob<Payload> {
  workflowId: string;
  jobId: string;
  orgId: string;
  attempts: number;
  claimedAt: Date | null;
  payload: Payload;
}
export interface SerializedJob<Payload> extends AbstractJob<Payload> {
  queue: string;
  workflow: string;
}

export interface MaterializedJob<Payload> extends AbstractJob<Payload> {
  queue: Queue<Payload>;
  workflow: Workflow<unknown>;
}

export interface EnqueableJobWithQueue<Payload> {
  queue: Queue<Payload>;
  orgId: string;
  workflowId: string;
  jobId: string;
  payload: Payload;
}

export interface EnqueableJob<Payload> {
  queue: string;
  orgId: string;
  workflowId: string;
  jobId: string;
  payload: Payload;
}

export const serializeJob = <Payload>(job: SerializedJob<Payload>) =>
  SuperJSON.stringify(job);

export const deserializeJob = <Payload>(job: string): SerializedJob<Payload> =>
  SuperJSON.parse(job);

export const enqueueJob = async <Payload>(
  storage: ValKey,
  job: SerializedJob<Payload>,
) => {
  const tx = storage.multi();
  tx.enqueueJob(
    job.queue,
    job.workflowId,
    job.jobId,
    job.orgId,
    serializeJob(job),
  );
  return tx.exec();
};

export const enqueueJobs = async <Payload>(
  storage: ValKey,
  jobs: SerializedJob<Payload>[],
) => {
  const tx = storage.multi();
  for (const job of jobs) {
    tx.enqueueJob(
      job.queue,
      job.workflowId,
      job.jobId,
      job.orgId,
      serializeJob(job),
    );
  }
  return tx.exec();
};

export const getJob = async <Payload>(
  storage: ValKey,
  queue: Queue<Payload>,
  id: string,
) => {
  return await executeSpan("Job.getJob", async () => {
    const jobKey = `queues:${queue.name}:jobs:${id}`;
    const job = await storage.get(jobKey);
    if (!job) {
      return null;
    }

    // Get the score (timestamp) when the job was claimed using Redis ZSCORE
    const claimedAtScore = await storage.zscore(
      `queues:${queue.name}:claimed`,
      jobKey,
    );
    const parsedJob = deserializeJob<Payload>(job);

    // Update the claimedAt field based on the score if it exists
    if (claimedAtScore) {
      parsedJob.claimedAt = new Date(Number.parseInt(claimedAtScore));
    }

    return parsedJob;
  });
};

/**
 * Claim job is called directly by workers.
 *
 * We want (?) to trigger job starts when claiming.
 *
 * But we don't want every worker to connect to the database. We'd rather a central observer
 * do those record keeping updates. Potentially in batches.
 *
 * Perhaps we can... use a redis stream?
 */
export const claimJob = async <Payload>(
  storage: ValKey,
  {
    queue,
  }: {
    queue: string;
  },
) => {
  return await executeSpan("Job.claimJob", async (span) => {
    const claim = await storage.claimJob(queue, Date.now().toString());
    span.setAttribute("job", claim);
    if (!claim) {
      return null;
    }
    return deserializeJob<Payload>(claim);
  });
};

export const extendClaim = async (
  storage: ValKey,
  queue: string,
  orgId: string,
  workflowName: string,
  workflowId: string,
  jobId: string,
) => {
  return await executeSpan("Job.extendClaim", async (span) => {
    span.setAttributes({ queue, orgId, workflowId, workflowName, jobId });
    return await storage.moveBetweenStages(
      queue,
      orgId,
      workflowId,
      workflowName,
      jobId,
      "claimed",
      "claimed",
      Date.now(),
    );
  });
};

export const retryJob = async (
  storage: ValKey,
  job: SerializedJob<unknown>,
) => {
  return await executeSpan("Job.retryJob", async (span) => {
    span.setAttributes({
      queue: job.queue,
      orgId: job.orgId,
      workflowId: job.workflowId,
      workflowName: job.workflow,
      jobId: job.jobId,
    });
    job.attempts++;
    await storage
      .multi()
      .set(`queues:${job.queue}:jobs:${job.jobId}`, serializeJob(job))
      // Here we cannot use moveBetweenStages because enqueueJob creates a special data structure for
      // fair scheduling.
      .removeJobFromStage(
        job.queue,
        job.orgId,
        job.workflowId,
        job.workflow,
        job.jobId,
        "failed",
      )
      .enqueueJob(
        job.queue,
        job.workflowId,
        job.jobId,
        job.orgId,
        serializeJob(job),
        "REQUEUE",
      )
      .exec();
  });
};

export const releaseJob = async (
  storage: ValKey,
  job: SerializedJob<unknown>,
) => {
  return await executeSpan("Job.releaseJob", async (span) => {
    span.setAttributes({
      queue: job.queue,
      orgId: job.orgId,
      workflowId: job.workflowId,
      workflowName: job.workflow,
      jobId: job.jobId,
    });
    if (job.attempts >= 3) {
      await failJob(
        storage,
        job.queue,
        job.orgId,
        job.workflowId,
        job.workflow,
        job.jobId,
      );
    } else {
      job.attempts++;
      await storage
        .multi()
        // Here we cannot use moveBetweenStages because enqueueJob creates a special data structure for
        // fair scheduling.
        .removeJobFromStage(
          job.queue,
          job.orgId,
          job.workflowId,
          job.workflow,
          job.jobId,
          "claimed",
        )
        .enqueueJob(
          job.queue,
          job.workflowId,
          job.jobId,
          job.orgId,
          serializeJob(job),
          "REQUEUE",
        )
        .exec();
    }
  });
};

export const deleteJob = async (
  storage: ValKey,
  job: SerializedJob<unknown>,
  fromStage: JobStage,
) => {
  return await executeSpan("Job.deleteJob", async (span) => {
    span.setAttributes({
      queue: job.queue,
      orgId: job.orgId,
      workflowId: job.workflowId,
      workflowName: job.workflow,
      jobId: job.jobId,
    });
    return await storage.deleteJob(
      job.queue,
      job.jobId,
      job.orgId,
      job.workflow,
      job.workflowId,
      fromStage,
    );
  });
};

export const stallJob = async (
  storage: ValKey,
  job: SerializedJob<unknown>,
) => {
  logger.info(
    "Stalling job",
    job.queue,
    job.orgId,
    job.workflowId,
    job.workflow,
    job.jobId,
  );
  return await executeSpan("Job.stallJob", async (span) => {
    span.setAttributes({
      queue: job.queue,
      orgId: job.orgId,
      workflowId: job.workflowId,
      workflowName: job.workflow,
      jobId: job.jobId,
    });
    const jobKey = `queues:${job.queue}:jobs:${job.jobId}`;
    return await storage
      .multi()
      .zadd(`queues:${job.queue}:claimed`, 0, jobKey)
      .zadd(`workflows:${job.workflowId}:claimed`, 0, jobKey)
      .exec();
  });
};

export const getStalledJobs = async <Payload>(
  storage: ValKey,
  queue: string,
  batchSize = 20,
) => {
  // Calculate cutoff time (10 seconds ago)
  const cutoffTime = Date.now() - 10 * 1000;

  const jobs = await storage.getStalledJobs(
    `queues:${queue}:claimed`,
    cutoffTime,
    batchSize,
  );
  return jobs.filter(Boolean).map((job) => deserializeJob<Payload>(job));
};

export const completeJob = async (
  storage: ValKey,
  queue: string,
  orgId: string,
  workflowName: string,
  workflowId: string,
  jobId: string,
) => {
  logger.info("Completing job", queue, orgId, workflowName, workflowId, jobId);
  return await executeSpan("Job.completeJob", async (span) => {
    span.setAttributes({
      queue,
      orgId,
      workflowId,
      workflowName,
      jobId,
    });
    const workflow = Workflow.fromName(workflowName);
    if (!workflow) {
      throw new Error(`Workflow ${workflowName} not found`);
    }
    const tx = storage.multi();
    tx.moveBetweenStages(
      queue,
      orgId,
      workflowId,
      workflowName,
      jobId,
      "claimed",
      "completed",
      Date.now(),
    );
    if (workflow?.finalizerQueue) {
      const finalizerJob = serializeJob({
        queue: workflow.finalizerQueue.name,
        workflowId,
        workflow: workflow.name,
        jobId: `${workflowId}-finalizer`,
        orgId,
        attempts: 0,
        claimedAt: null,
        payload: await workflow.getRawWorkflowData(workflowId),
      });

      // Avoid re-enqueuing the finalizer job
      if (!jobId.endsWith("-finalizer")) {
        logger.info(
          {
            workflowId,
            workflowName: workflow.name,
            job: finalizerJob,
          },
          "Maybe enqueuing finalizer job",
        );
        tx.maybeEnqueueFinalizer(
          workflow.finalizerQueue.name,
          orgId,
          workflowId,
          workflow.name,
          finalizerJob,
          Date.now(),
        );
      }
    }
    return tx.exec();
  });
};

export const failJob = async (
  storage: ValKey,
  queue: string,
  orgId: string,
  workflowName: string,
  workflowId: string,
  jobId: string,
) => {
  // at this point, retries have been exhausted
  // we just move the job to the failed stage
  // we should:
  // - move all jobs in the workflow to the failed stage
  // - record workflow failure
  return await executeSpan("Job.failJob", async (span) => {
    span.setAttributes({
      queue,
      orgId,
      workflowId,
      workflowName,
      jobId,
    });
    return storage
      .multi()
      .moveBetweenStages(
        queue,
        orgId,
        workflowId,
        workflowName,
        jobId,
        "claimed",
        "failed",
        Date.now(),
      )
      .failWorkflow(workflowId, workflowName, orgId, Date.now())
      .exec();
  });
};
