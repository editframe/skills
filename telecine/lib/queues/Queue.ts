import type ValKey from "iovalkey";
import {
  type JobStage,
  deleteJob,
  deserializeJob,
  getStalledJobs,
  releaseJob,
  retryJob,
} from "./Job";
import type { QueryCreator } from "kysely";
import SuperJSON from "superjson";

import type { JobLifecycleMessage } from "./lifecycle/Producer";
import type { DB } from "@/sql-client.server/kysely-codegen";
import { logger } from "@/logging";

export interface QueueConfig {
  name: string;
  storage: ValKey;
}

type LifecycleMessageProcessor = (
  messages: JobLifecycleMessage[],
  db: QueryCreator<DB>,
) => Promise<void>;

export interface QueueArgs {
  name: string;
  storage: ValKey;
  maxWorkerCount?: number;
  minWorkerCount?: number;
  workerConcurrency?: number;
  processStarts?: LifecycleMessageProcessor;
  processFailures?: LifecycleMessageProcessor;
  processCompletions?: LifecycleMessageProcessor;
}

export type QueueStats = Record<JobStage, number> & {
  stalled: number;
};

export type QueuePayload<T> = T extends Queue<infer P> ? P : never;

export class Queue<Payload> {
  static byName = new Map<string, Queue<unknown>>();
  static fromName(name: string) {
    return Queue.byName.get(name);
  }

  name: QueueArgs["name"];
  storage: QueueArgs["storage"];
  maxWorkerCount: NonNullable<QueueArgs["maxWorkerCount"]>;
  minWorkerCount: NonNullable<QueueArgs["minWorkerCount"]>;
  workerConcurrency: NonNullable<QueueArgs["workerConcurrency"]>;

  processStarts?: QueueArgs["processStarts"];
  processFailures?: QueueArgs["processFailures"];
  processCompletions?: QueueArgs["processCompletions"];

  constructor(args: QueueArgs) {
    this.name = args.name;
    this.storage = args.storage;
    this.maxWorkerCount = args.maxWorkerCount ?? 1;
    this.minWorkerCount = args.minWorkerCount ?? 0;
    this.workerConcurrency = args.workerConcurrency ?? 1;
    Queue.byName.set(this.name, this);
    this.processStarts = args.processStarts;
    this.processFailures = args.processFailures;
    this.processCompletions = args.processCompletions;
  }

  toJSON() {
    return {
      name: this.name,
      maxWorkerCount: this.maxWorkerCount,
      workerConcurrency: this.workerConcurrency,
    };
  }

  async getStats() {
    const stats = await this.storage.getQueueStats(
      `queues:${this.name}`,
      10000,
    );
    return JSON.parse(stats) as QueueStats;
  }

  // Stalled jobs are jobs in the claimed stage that have a score that is older than 10 seconds
  // scores are the timestamp of the job in milliseconds since epoch
  getStalledJobs(batchSize = 20) {
    return getStalledJobs(this.storage, this.name, batchSize);
  }

  async getJobs(stage: JobStage, offset = 0, limit = 20) {
    const jobs = await this.storage.getJobs(
      `queues:${this.name}:${stage}`,
      offset,
      limit,
    );

    return jobs.filter(Boolean).map((job) => deserializeJob<Payload>(job));
  }

  // releasing a job may move it to failed, which will trigger a workflow failure
  // so we' can't just query a big list of jobs and fail them all, they may cascade
  async releaseAllJobs() {
    let count = 0;
    while (count < 1000) {
      count++;
      const [claimed] = await this.getJobs("claimed", 0, 1);
      if (!claimed) {
        break;
      }
      await releaseJob(this.storage, claimed);
    }
  }

  // releasing a job may move it to failed, which will trigger a workflow failure
  // so we' can't just query a big list of jobs and fail them all, they may cascade
  async releaseAllStalledJobs() {
    let count = 0;
    while (count < 1000) {
      count++;
      const [stalled] = await this.getStalledJobs(1);
      if (!stalled) {
        break;
      }
      await releaseJob(this.storage, stalled);
    }
  }

  async deleteAllStalledJobs() {
    const jobs = await this.getStalledJobs(1000);
    logger.info({ jobs: jobs.length }, "Deleting all stalled jobs");
    for (const job of jobs) {
      await deleteJob(this.storage, job, "queued");
    }
  }

  async deleteAllFailedJobs() {
    const jobs = await this.getJobs("failed", 0, 1000);
    logger.info({ jobs: jobs.length }, "Deleting all failed jobs");
    for (const job of jobs) {
      await deleteJob(this.storage, job, "failed");
    }
  }

  async deleteAllCompletedJobs() {
    const jobs = await this.getJobs("completed", 0, 1000);
    logger.info({ jobs: jobs.length }, "Deleting all completed jobs");
    for (const job of jobs) {
      await deleteJob(this.storage, job, "completed");
    }
  }

  async retryAllJobs() {
    const jobs = await this.getJobs("failed", 0, 1000);
    logger.info({ jobs: jobs.length }, "Retrying all jobs");
    for (const job of jobs) {
      await retryJob(this.storage, job);
    }
  }

  async getOrgJobs(orgId: string, workflowId: string, stage: JobStage) {
    const unparsed = await this.storage.getJobs(
      `queues:${this.name}:orgs:${orgId}:workflows:${workflowId}:${stage}`,
    );
    return unparsed.map((job) => SuperJSON.parse(job));
  }
}
