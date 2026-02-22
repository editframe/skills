import { inspect } from "node:util";

import type ValKey from "iovalkey";

import { type logger, makeLogger } from "@/logging";
import {
  RequestSleep,
  abortableLoopWithBackoff,
} from "./AbortableLoop";
import type { MaterializedJob, SerializedJob } from "./Job";
import { claimJob, completeJob, extendClaim, failJob, retryJob } from "./Job";
import type { Queue } from "./Queue";
import { Workflow } from "./Workflow";
import { publishJobLifecycle } from "./lifecycle/Producer";
import { errorToErrorInfo } from "./ErrorInfo";
import { executeSpan } from "@/tracing";
import { randomUUID } from "node:crypto";
import { valkey } from "@/valkey/valkey";

interface WorkerArgs<Payload> {
  queue: Queue<Payload>;
  storage: ValKey;
  execute: (job: MaterializedJob<Payload>) => Promise<void>;
  close?: () => Promise<void>;
  warmUp?: () => Promise<void>;
}

export class Worker<Payload = unknown> {
  static byName = new Map<string, Worker<unknown>>();
  static fromName(name: string) {
    return Worker.byName.get(name);
  }

  name: string;
  storage: ValKey;
  queue: Queue<Payload>;
  concurrency: number;
  execute: (job: MaterializedJob<Payload>) => Promise<void>;
  close: () => Promise<void>;
  warmUp: () => Promise<void>;
  logger: typeof logger;

  constructor(args: WorkerArgs<Payload>) {
    this.logger = makeLogger().child({
      component: "Worker",
      unitOfWork: args.queue.name,
    });
    this.name = args.queue.name;
    this.storage = args.storage;
    this.queue = args.queue;
    this.concurrency = args.queue.workerConcurrency ?? 1;
    this.execute = args.execute;
    this.close = args.close ?? (() => Promise.resolve());
    this.warmUp = args.warmUp ?? (() => Promise.resolve());

    Worker.byName.set(this.name, this as Worker<unknown>);
  }

  async executeJob(job: MaterializedJob<Payload>) {
    await executeSpan("Worker.executeJob", async (span) => {
      const jobMeta = {
        queue: job.queue.name,
        orgId: job.orgId,
        workflowId: job.workflowId,
        workflowName: job.workflow.name,
        jobId: job.jobId,
      };
      this.logger.info(jobMeta, "Executing job");
      span.setAttributes(jobMeta);
      const startMs = Date.now();
      await this.execute(job);
      this.logger.info(
        { ...jobMeta, executeDurationMs: Date.now() - startMs },
        "Job execute() completed, calling completeJob",
      );
      await completeJob(
        this.storage,
        this.queue.name,
        job.orgId,
        job.workflow.name,
        job.workflowId,
        job.jobId,
      );
      this.logger.info(
        { ...jobMeta, totalDurationMs: Date.now() - startMs },
        "Job fully completed",
      );
    });
  }

  async publishJobStarted(job: MaterializedJob<Payload>) {
    await publishJobLifecycle(this.storage, {
      queue: this.queue.name,
      jobId: job.jobId,
      attemptNumber: job.attempts,
      workflow: job.workflow.name,
      workflowId: job.workflowId,
      event: "started",
      type: "job",
      timestamp: Date.now(),
    });
  }

  async publishJobCompleted(job: MaterializedJob<Payload>) {
    await publishJobLifecycle(this.storage, {
      queue: this.queue.name,
      jobId: job.jobId,
      attemptNumber: job.attempts,
      workflow: job.workflow.name,
      workflowId: job.workflowId,
      event: "completed",
      type: "job",
      timestamp: Date.now(),
    });
  }

  async publishJobFailed(
    job: MaterializedJob<Payload>,
    details: Record<string, unknown>,
  ) {
    await publishJobLifecycle(this.storage, {
      queue: this.queue.name,
      jobId: job.jobId,
      attemptNumber: job.attempts,
      workflow: job.workflow.name,
      workflowId: job.workflowId,
      event: "failed",
      type: "job",
      details,
      timestamp: Date.now(),
    });
  }

  async publishAttemptStarted(job: MaterializedJob<Payload>) {
    await publishJobLifecycle(this.storage, {
      queue: this.queue.name,
      jobId: job.jobId,
      attemptNumber: job.attempts,
      workflow: job.workflow.name,
      workflowId: job.workflowId,
      event: "started",
      type: "attempt",
      timestamp: Date.now(),
    });
  }

  async publishAttemptCompleted(job: MaterializedJob<Payload>) {
    await publishJobLifecycle(this.storage, {
      queue: this.queue.name,
      jobId: job.jobId,
      attemptNumber: job.attempts,
      workflow: job.workflow.name,
      workflowId: job.workflowId,
      event: "completed",
      type: "attempt",
      timestamp: Date.now(),
    });
  }

  async publishAttemptFailed(job: MaterializedJob<Payload>) {
    await publishJobLifecycle(this.storage, {
      queue: this.queue.name,
      jobId: job.jobId,
      attemptNumber: job.attempts,
      workflow: job.workflow.name,
      workflowId: job.workflowId,
      event: "failed",
      type: "attempt",
      timestamp: Date.now(),
    });
  }

  async publishWorkflowFailed(
    workflowId: string,
    workflowName: string,
    orgId: string,
    details: Record<string, unknown>,
  ) {
    await publishJobLifecycle(this.storage, {
      workflowId,
      workflowName,
      orgId,
      event: "failed",
      type: "workflow",
      details,
      timestamp: Date.now(),
    });
  }

  static async getWorkLoops() {
    const presence = await valkey.zrangebyscore(
      "worker.workLoop",
      Date.now() - 10_000,
      Date.now(),
    );

    // Group by queue
    const groupedByQueue = presence.reduce(
      (acc, p) => {
        const [queue, loopId] = p.split(":");
        if (!acc[queue!]) {
          acc[queue!] = [];
        }
        acc[queue!]!.push(loopId!);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    // Return an array of objects with queue and loopIds
    return Object.entries(groupedByQueue).map(([queue, loopIds]) => {
      return { queue, loopIds };
    });
  }

  async writePresence(loopId: string) {
    // This is mostly just to let see if workloops are stalled out
    await valkey
      .multi()
      .zadd("worker.workLoop", Date.now(), `${this.queue.name}:${loopId}`)
      .zremrangebyscore("worker.workLoop", 0, Date.now() - 10_000)
      .exec();
  }

  workLoop() {
    const loopId = randomUUID();
    let idlePollCount = 0;
    let idleStartMs: number | null = null;
    const IDLE_LOG_INTERVAL_MS = 60_000;
    let lastIdleLogMs: number | null = null;

    return abortableLoopWithBackoff({
      spanName: "worker.workLoop",
      backoffMs: 1000,
      fn: async (signal) => {
        await this.writePresence(loopId);
        this.logger.debug("Claiming job");
        const job = await claimJob<Payload>(this.storage, {
          queue: this.queue.name,
        });
        if (!job) {
          if (idleStartMs === null) {
            idleStartMs = Date.now();
          }
          idlePollCount++;
          const now = Date.now();
          const idleDurationMs = now - idleStartMs;
          if (idleDurationMs >= IDLE_LOG_INTERVAL_MS && (lastIdleLogMs === null || now - lastIdleLogMs >= IDLE_LOG_INTERVAL_MS)) {
            lastIdleLogMs = now;
            this.logger.info(
              {
                queue: this.queue.name,
                idleDurationMs,
                pollCount: idlePollCount,
                event: "workerIdle",
              },
              "Worker idle",
            );
          }
          return RequestSleep;
        }
        // Reset idle tracking when a job is claimed.
        if (idleStartMs !== null) {
          this.logger.info(
            {
              queue: this.queue.name,
              idleDurationMs: Date.now() - idleStartMs,
              pollCount: idlePollCount,
              event: "workerIdleEnded",
            },
            "Worker idle ended, job claimed",
          );
          idleStartMs = null;
          idlePollCount = 0;
        }

        // Log queue depth at claim time for competition analysis.
        this.queue.getStats().then((stats) => {
          this.logger.info(
            {
              queue: this.queue.name,
              jobId: job.jobId,
              workflowId: job.workflowId,
              queueDepthQueued: stats.queued,
              queueDepthClaimed: stats.claimed,
              event: "jobClaimed",
            },
            "Job claimed",
          );
        }).catch(() => {});

        using _claimExtender = this.extendClaimTimeout(job, signal);
        this.logger.debug(job, "Claimed job");
        const workflow = Workflow.fromName(job.workflow);
        if (!workflow) {
          throw new Error(`Workflow ${job.workflow} not found`);
        }
        const materializedJob = {
          ...job,
          queue: this.queue,
          workflow,
        };
        try {
          if (job.attempts === 0) {
            await this.publishJobStarted(materializedJob);
          }
          await this.publishAttemptStarted(materializedJob);

          await this.executeJob(materializedJob);
          await this.publishAttemptCompleted(materializedJob);
          await this.publishJobCompleted(materializedJob);
        } catch (error) {
          const jobMeta = {
            jobId: job.jobId,
            workflowId: job.workflowId,
            attempts: job.attempts,
            willRetry: job.attempts < 3,
          };
          this.logger.error(
            { ...jobMeta, error: inspect(error) },
            "Error executing job",
          );
          await this.publishAttemptFailed(materializedJob);
          if (job.attempts < 3) {
            await retryJob(this.storage, job);
          } else {
            await failJob(
              this.storage,
              this.queue.name,
              job.orgId,
              job.workflowId,
              job.workflow,
              job.jobId,
            );
            await this.publishJobFailed(materializedJob, {
              error: errorToErrorInfo(error),
              payload: job.payload,
            });
            await this.publishWorkflowFailed(
              job.workflowId,
              job.workflow,
              job.orgId,
              {
                error: errorToErrorInfo(error),
                payload: job.payload,
                workflow: await workflow.getRawWorkflowData(job.workflowId),
              },
            );
          }
        }
      },
    });
  }

  extendClaimTimeout(claim: SerializedJob<Payload>, signal?: AbortSignal) {
    const timeoutMs = 5_000;
    const timeout = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(timeout);
        this.logger.info(
          { jobId: claim.jobId, workflowId: claim.workflowId },
          "Claim extender stopped: abort signal",
        );
        return;
      }
      extendClaim(
        this.storage,
        this.queue.name,
        claim.orgId,
        claim.workflowId,
        claim.workflow,
        claim.jobId,
      ).catch((error) => {
        this.logger.error({ error: inspect(error) }, "Error extending claim");
      });
    }, timeoutMs);
    return {
      [Symbol.dispose]: () => {
        clearInterval(timeout);
        this.logger.debug(
          { jobId: claim.jobId, workflowId: claim.workflowId },
          "Claim extender disposed",
        );
      },
    };
  }
}
