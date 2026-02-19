import type * as gcp from "@pulumi/gcp";
export * from "./serviceAccount";
export { type QueueConfig, workerConfigs, queueEnvVars } from "./configs";
import { defineWorker } from "./defineWorker";
import { workerConfigs } from "./configs";

type Workers =
  | "ingestImage"
  | "htmlFinalizer"
  | "htmlInitializer"
  | "processISOBMFF"
  | "renderInitializer"
  | "renderFragment"
  | "renderFinalizer"
  | "ingestImage";

export const workers: Record<Workers, gcp.cloudrunv2.WorkerPool> = {
  ingestImage: defineWorker(workerConfigs.ingestImage),
  htmlFinalizer: defineWorker(workerConfigs.htmlFinalizer),
  htmlInitializer: defineWorker(workerConfigs.htmlInitializer),
  processISOBMFF: defineWorker(workerConfigs.processISOBMFF),
  renderInitializer: defineWorker(workerConfigs.renderInitializer),
  renderFragment: defineWorker(workerConfigs.renderFragment),
  renderFinalizer: defineWorker(workerConfigs.renderFinalizer),
};
