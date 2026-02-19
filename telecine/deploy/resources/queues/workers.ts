import type * as gcp from "@pulumi/gcp";
import type * as pulumi from "@pulumi/pulumi";
export * from "./serviceAccount";
import { envFromValue } from "../../util/envFromValue";
import { defineWorker } from "./defineWorker";
import { workerResources } from "../../worker-resources.config";

export interface QueueConfig {
  name: string;
  screaming: string;
  maxWorkerCount: number;
  workerConcurrency: number;
  workerCpu: string;
  workerMemory: string;
}

type Workers =
  | "ingestImage"
  | "htmlFinalizer"
  | "htmlInitializer"
  | "processISOBMFF"
  | "renderInitializer"
  | "renderFragment"
  | "renderFinalizer"
  | "ingestImage";

export const workerConfigs: Record<Workers, QueueConfig> = {
  ingestImage: {
    name: "ingest-image",
    screaming: "INGEST_IMAGE",
    maxWorkerCount: 10,
    workerConcurrency: 20,
    workerCpu: workerResources.ingestImage.cpu,
    workerMemory: workerResources.ingestImage.memory,
  },
  htmlFinalizer: {
    name: "process-html-finalizer",
    screaming: "PROCESS_HTML_FINALIZER",
    maxWorkerCount: 10,
    workerConcurrency: 20,
    workerCpu: workerResources.htmlFinalizer.cpu,
    workerMemory: workerResources.htmlFinalizer.memory,
  },
  htmlInitializer: {
    name: "process-html-initializer",
    screaming: "PROCESS_HTML_INITIALIZER",
    maxWorkerCount: 20,
    workerConcurrency: 5,
    workerCpu: workerResources.htmlInitializer.cpu,
    workerMemory: workerResources.htmlInitializer.memory,
  },
  processISOBMFF: {
    name: "process-isobmff",
    screaming: "PROCESS_ISOBMFF",
    maxWorkerCount: 20,
    workerConcurrency: 5,
    workerCpu: workerResources.processISOBMFF.cpu,
    workerMemory: workerResources.processISOBMFF.memory,
  },
  renderInitializer: {
    name: "render-initializer",
    screaming: "RENDER_INITIALIZER",
    maxWorkerCount: 10,
    workerConcurrency: 2,
    workerCpu: workerResources.renderInitializer.cpu,
    workerMemory: workerResources.renderInitializer.memory,
  },
  renderFragment: {
    name: "render-fragment",
    screaming: "RENDER_FRAGMENT",
    maxWorkerCount: 200,
    workerConcurrency: 1,
    workerCpu: workerResources.renderFragment.cpu,
    workerMemory: workerResources.renderFragment.memory,
  },
  renderFinalizer: {
    name: "render-finalizer",
    screaming: "RENDER_FINALIZER",
    maxWorkerCount: 10,
    workerConcurrency: 20,
    workerCpu: workerResources.renderFinalizer.cpu,
    workerMemory: workerResources.renderFinalizer.memory,
  },
};

export const workers: Record<Workers, gcp.cloudrunv2.WorkerPool> = {
  ingestImage: defineWorker(workerConfigs.ingestImage),
  htmlFinalizer: defineWorker(workerConfigs.htmlFinalizer),
  htmlInitializer: defineWorker(workerConfigs.htmlInitializer),
  processISOBMFF: defineWorker(workerConfigs.processISOBMFF),
  renderInitializer: defineWorker(workerConfigs.renderInitializer),
  renderFragment: defineWorker(workerConfigs.renderFragment),
  renderFinalizer: defineWorker(workerConfigs.renderFinalizer),
};

/**
 * Returns environment variables for queue configuration (maxWorkerCount, workerConcurrency).
 * Used by workers and the maintenance service.
 */
export const queueEnvVars = () => {
  const vars: {
    name: string;
    value: pulumi.Output<string>;
  }[] = [];

  Object.entries(workerConfigs).forEach(([name, config]) => {
    vars.push(
      envFromValue(
        `${config.screaming}_MAX_WORKER_COUNT`,
        config.maxWorkerCount,
      ),
      envFromValue(
        `${config.screaming}_WORKER_CONCURRENCY`,
        config.workerConcurrency,
      ),
    );
  });

  return vars;
};
