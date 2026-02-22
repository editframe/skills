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
  | "renderFragmentGpu"
  | "renderFinalizer";

export const workers: Record<Workers, gcp.cloudrunv2.Service> = {
  ingestImage: defineWorker(workerConfigs.ingestImage),
  htmlFinalizer: defineWorker(workerConfigs.htmlFinalizer),
  htmlInitializer: defineWorker(workerConfigs.htmlInitializer),
  processISOBMFF: defineWorker(workerConfigs.processISOBMFF),
  renderInitializer: defineWorker(workerConfigs.renderInitializer),
  renderFragment: defineWorker(workerConfigs.renderFragment),
  renderFragmentGpu: defineWorker(workerConfigs.renderFragmentGpu, {
    type: "nvidia-l4",
    zonalRedundancyDisabled: true,
  }),
  renderFinalizer: defineWorker(workerConfigs.renderFinalizer),
};
