import * as gcp from "@pulumi/gcp";

import { serviceAccount } from "./serviceAccount";
import { getImageRef } from "../../util/getImageRef";
import { envFromValue } from "../../util/envFromValue";
import { valkeyInternalIp } from "../valkey";
import { workers } from "../queues/workers";
import { workerConfigs, type QueueConfig } from "../queues/configs";

function workerUrlEnv(config: QueueConfig, service: gcp.cloudrunv2.Service) {
  return envFromValue(
    `WORKER_URL_${config.screaming}`,
    service.uri,
  );
}

function queueLimitEnvs(config: QueueConfig) {
  return [
    envFromValue(`${config.screaming}_MAX_WORKER_COUNT`, config.maxWorkerCount),
    envFromValue(`${config.screaming}_MIN_WORKER_COUNT`, config.minWorkerCount),
    envFromValue(`${config.screaming}_WORKER_CONCURRENCY`, config.workerConcurrency),
  ];
}

export const cloudrun = new gcp.cloudrunv2.Service(
  "telecine-scheduler-go",
  {
    ingress: "INGRESS_TRAFFIC_INTERNAL_ONLY",
    launchStage: "GA",
    location: "us-central1",
    name: "telecine-scheduler-go",
    project: "editframe",
    template: {
      scaling: {
        minInstanceCount: 1,
        maxInstanceCount: 1,
      },
      serviceAccount: serviceAccount.email,
      maxInstanceRequestConcurrency: 1,
      containers: [
        {
          image: getImageRef("scheduler-go"),
          envs: [
            envFromValue("VALKEY_HOST", valkeyInternalIp),
            envFromValue("VALKEY_PORT", "6379"),
            workerUrlEnv(workerConfigs.htmlInitializer, workers.htmlInitializer),
            workerUrlEnv(workerConfigs.htmlFinalizer, workers.htmlFinalizer),
            workerUrlEnv(workerConfigs.renderInitializer, workers.renderInitializer),
            workerUrlEnv(workerConfigs.renderFragment, workers.renderFragment),
            workerUrlEnv(workerConfigs.renderFragmentGpu, workers.renderFragmentGpu),
            workerUrlEnv(workerConfigs.renderFinalizer, workers.renderFinalizer),
            workerUrlEnv(workerConfigs.processISOBMFF, workers.processISOBMFF),
            workerUrlEnv(workerConfigs.ingestImage, workers.ingestImage),
            ...queueLimitEnvs(workerConfigs.htmlInitializer),
            ...queueLimitEnvs(workerConfigs.htmlFinalizer),
            ...queueLimitEnvs(workerConfigs.renderInitializer),
            ...queueLimitEnvs(workerConfigs.renderFragment),
            ...queueLimitEnvs(workerConfigs.renderFragmentGpu),
            ...queueLimitEnvs(workerConfigs.renderFinalizer),
            ...queueLimitEnvs(workerConfigs.processISOBMFF),
            ...queueLimitEnvs(workerConfigs.ingestImage),
          ],
          ports: {
            containerPort: 8080,
            name: "http1",
          },
          resources: {
            limits: {
              cpu: "1",
              memory: "512Mi",
            },
          },
          startupProbe: {
            failureThreshold: 5,
            periodSeconds: 5,
            httpGet: {
              path: "/health",
              port: 8080,
            },
            timeoutSeconds: 5,
          },
          livenessProbe: {
            httpGet: {
              path: "/health",
              port: 8080,
            },
          },
        },
      ],
      vpcAccess: {
        egress: "PRIVATE_RANGES_ONLY",
        networkInterfaces: [
          {
            network: "default",
            subnetwork: "default",
          },
        ],
      },
    },
  },
  {
    dependsOn: [
      serviceAccount,
      workers.htmlInitializer,
      workers.htmlFinalizer,
      workers.renderInitializer,
      workers.renderFragment,
      workers.renderFragmentGpu,
      workers.renderFinalizer,
      workers.processISOBMFF,
      workers.ingestImage,
    ],
  },
);
