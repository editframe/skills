import type ValKey from "iovalkey";
import type { QueryCreator } from "kysely";
import SuperJSON from "superjson";

import type { DB } from "@/sql-client.server/kysely-codegen";
import {
  type EnqueableJob,
  type EnqueableJobWithQueue,
  type JobStage,
  deserializeJob,
  enqueueJob,
  enqueueJobs,
} from "./Job";
import type { WorkflowLifecycleMessage } from "./lifecycle/Producer";
import type { Queue } from "./Queue";

type LifecycleMessageProcessor = (
  messages: WorkflowLifecycleMessage[],
  db: QueryCreator<DB>,
) => Promise<void>;

export interface WorkflowArgs {
  name: string;
  storage: ValKey;
  finalizerQueue?: Queue<unknown>;

  processFailures?: LifecycleMessageProcessor;
}

export class Workflow<WorkflowData> {
  static byName = new Map<string, Workflow<unknown>>();
  static fromName(name: string) {
    return Workflow.byName.get(name);
  }

  name: string;
  storage: ValKey;
  finalizerQueue?: Queue<unknown>;

  processFailures?: LifecycleMessageProcessor;

  constructor(args: WorkflowArgs) {
    this.name = args.name;
    this.storage = args.storage;
    this.finalizerQueue = args.finalizerQueue;
    this.processFailures = args.processFailures;
    Workflow.byName.set(this.name, this as Workflow<unknown>);
  }

  toJSON() {
    return {
      name: this.name,
    };
  }

  enqueueJob<Payload>(job: EnqueableJobWithQueue<Payload>) {
    return enqueueJob(this.storage, {
      queue: job.queue.name,
      workflowId: job.workflowId,
      jobId: job.jobId,
      orgId: job.orgId,
      payload: job.payload,
      workflow: this.name,
      attempts: 0,
      claimedAt: null,
    });
  }

  enqueueJobs(...jobs: EnqueableJob<unknown>[]) {
    return enqueueJobs(
      this.storage,
      jobs.map((job) => ({
        queue: job.queue,
        workflow: this.name,
        workflowId: job.workflowId,
        jobId: job.jobId,
        orgId: job.orgId,
        payload: job.payload,
        attempts: 0,
        claimedAt: null,
      })),
    );
  }

  async setWorkflowData(workflowId: string, data: WorkflowData) {
    await this.storage
      .multi()
      .del(
        `workflows:${workflowId}:queued`,
        `workflows:${workflowId}:claimed`,
        `workflows:${workflowId}:failed`,
        `workflows:${workflowId}:completed`,
        `workflows:${workflowId}:status`,
      )
      .set(`workflows:${workflowId}:data`, SuperJSON.stringify(data))
      .exec();
  }

  async getRawWorkflowData(workflowId: string) {
    const data = await this.storage.get(`workflows:${workflowId}:data`);
    if (data) {
      return SuperJSON.parse(data) as WorkflowData;
    }
    return null;
  }

  async getJobs<Payload>(
    workflowId: string,
    stage: JobStage,
    offset = 0,
    limit = 20,
  ) {
    const jobs = await this.storage.getJobs(
      `workflows:${workflowId}:${stage}`,
      offset,
      limit,
    );

    return jobs.filter(Boolean).map((job) => deserializeJob<Payload>(job));
  }
}
