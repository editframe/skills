import type ValKey from "iovalkey";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { JobStage } from "./Job";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadLuaScript = (name: string) => {
  return readFileSync(join(__dirname, "lua", `${name}.lua`), "utf-8");
};

declare module "iovalkey" {
  interface ChainableCommander {
    claimJob: (name: string, timestamp: string) => Promise<string>;
    maybeEnqueueFinalizer: (
      queue: string,
      orgId: string,
      workflowId: string,
      workflowName: string,
      job: string,
      now: number,
    ) => ChainableCommander;
    failWorkflow: (
      workflowId: string,
      workflowName: string,
      orgId: string,
      now: number,
    ) => ChainableCommander;
    getJobs: (
      key: string,
      offset?: number,
      limit?: number,
    ) => ChainableCommander;
    getStalledJobs: (
      key: string,
      cutoffTime: number,
      batchSize?: number,
    ) => ChainableCommander;
    enqueueJob: (
      queue: string,
      workflowId: string,
      jobId: string,
      orgId: string,
      payload: unknown,
      requeue?: "REQUEUE",
    ) => ChainableCommander;
    removeJobFromStage: (
      queue: string,
      orgId: string,
      workflowId: string,
      workflowName: string,
      jobId: string,
      stage: JobStage,
    ) => ChainableCommander;
    moveBetweenStages: (
      queue: string,
      orgId: string,
      workflowId: string,
      workflowName: string,
      jobId: string,
      fromStage: JobStage,
      toStage: JobStage,
      now: number,
    ) => ChainableCommander;
  }
  interface Redis {
    claimJob: (name: string, timestamp: string) => Promise<string>;
    maybeEnqueueFinalizer: (
      queue: string,
      orgId: string,
      workflowId: string,
      workflowName: string,
      job: string,
      now: number,
    ) => Promise<void>;
    getJobs: (
      key: string,
      offset?: number,
      limit?: number,
    ) => Promise<string[]>;
    getStalledJobs: (
      key: string,
      cutoffTime: number,
      batchSize?: number,
    ) => Promise<string[]>;
    getQueueStats: (queue: string, maxCount?: number) => Promise<string>;
    mgetQueueStats: (maxCount: number, ...queues: string[]) => Promise<string>;
    getWorkflowStats: (workflowId: string) => Promise<string>;
    getSchedulerStats: (
      schedulerId: string,
      ...queues: string[]
    ) => Promise<string>;
    failWorkflow: (
      workflowId: string,
      workflowName: string,
      orgId: string,
      now: number,
    ) => Promise<number>;
    deleteJob: (
      queue: string,
      jobId: string,
      orgId: string,
      workflow: string,
      workflowId: string,
      stage: JobStage,
    ) => Promise<number>;
    enqueueJob: (
      queue: string,
      workflowId: string,
      jobId: string,
      orgId: string,
      payload: unknown,
      requeue?: "REQUEUE",
    ) => Promise<void>;
    removeJobFromStage: (
      queue: string,
      orgId: string,
      workflowId: string,
      workflowName: string,
      jobId: string,
      stage: JobStage,
    ) => Promise<void>;
    moveBetweenStages: (
      queue: string,
      orgId: string,
      workflowId: string,
      workflowName: string,
      jobId: string,
      fromStage: JobStage,
      toStage: JobStage,
      now: number,
    ) => Promise<void>;
  }
}

export const defineCommands = (storage: ValKey) => {
  storage.defineCommand("enqueueJob", {
    numberOfKeys: 0,
    lua: loadLuaScript("enqueueJob"),
  });

  storage.defineCommand("deleteJob", {
    numberOfKeys: 0,
    lua: loadLuaScript("deleteJob"),
  });

  storage.defineCommand("failWorkflow", {
    numberOfKeys: 0,
    lua: loadLuaScript("failWorkflow"),
  });
  storage.defineCommand("getQueueStats", {
    numberOfKeys: 1,
    lua: loadLuaScript("getQueueStats"),
  });
  storage.defineCommand("mgetQueueStats", {
    numberOfKeys: 0,
    lua: loadLuaScript("mgetQueueStats"),
  });

  storage.defineCommand("getSchedulerStats", {
    numberOfKeys: 0,
    lua: loadLuaScript("getSchedulerStats"),
  });
  storage.defineCommand("moveBetweenStages", {
    numberOfKeys: 0,
    lua: loadLuaScript("moveBetweenStages"),
  });

  storage.defineCommand("maybeEnqueueFinalizer", {
    numberOfKeys: 0,
    lua: loadLuaScript("maybeEnqueueFinalizer"),
  });

  storage.defineCommand("getStalledJobs", {
    numberOfKeys: 1,
    lua: loadLuaScript("getStalledJobs"),
  });

  storage.defineCommand("getJobs", {
    numberOfKeys: 1,
    lua: loadLuaScript("getJobs"),
  });

  storage.defineCommand("claimJob", {
    numberOfKeys: 0,
    lua: loadLuaScript("claimJob"),
  });

  storage.defineCommand("removeJobFromStage", {
    numberOfKeys: 0,
    lua: loadLuaScript("removeJobFromStage"),
  });
};
