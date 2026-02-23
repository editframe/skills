import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

import { database } from "../database/database";
import { envFromSecretVersion } from "../../util/envFromSecretVersion";
import { envFromValue } from "../../util/envFromValue";
import { hasuraUser, hasuraDatabase } from "../database/database";
import { pgPassword } from "../database/database";
import { serviceAccount } from "./serviceAccount";
import {
  actionSecret,
  appJwtSecret,
  applicationSecret,
  hasuraJwtSecretToken,
} from "../secrets";
import { DEPLOYED_DOMAIN } from "../constants";
import { bucket } from "../storage";
import { publicBucketName } from "../constants";
import { getImageRef } from "../../util/getImageRef";
import { valkeyInternalIp } from "../valkey";
import { type QueueConfig, queueEnvVars } from "./configs";

export interface GpuConfig {
  type: "nvidia-l4";
  zonalRedundancyDisabled: boolean;
}

export const defineWorker = (config: QueueConfig, gpu?: GpuConfig) => {
  const gpuResourceLimits: Record<string, string> = gpu
    ? { "nvidia.com/gpu": "1" }
    : {};

  const nodeSelector = gpu
    ? { accelerator: gpu.type }
    : undefined;

  return new gcp.cloudrunv2.Service(
    `telecine-worker-${config.name}`,
    {
      ingress: "INGRESS_TRAFFIC_INTERNAL_ONLY",
      launchStage: gpu ? "BETA" : "GA",
      location: "us-central1",
      name: `telecine-worker-${config.name}`,
      project: "editframe",
      template: {
        ...(gpu ? { gpuZonalRedundancyDisabled: gpu.zonalRedundancyDisabled } : {}),
        scaling: {
          minInstanceCount: 0,
          maxInstanceCount: config.maxWorkerCount,
        },
        serviceAccount: serviceAccount.email,
        maxInstanceRequestConcurrency: config.workerConcurrency,
        ...(nodeSelector ? { nodeSelector } : {}),
        volumes: [
          {
            name: "cloudsql",
            cloudSqlInstance: {
              instances: [database.connectionName],
            },
          },
        ],
        containers: [
          {
            image: getImageRef(`worker-${config.name}`),

            envs: [
              envFromValue("WORKER_MODE", "websocket"),
              envFromValue("POSTGRES_MIN_CONNECTIONS", "1"),
              envFromValue("POSTGRES_MAX_CONNECTIONS", "1"),
              envFromSecretVersion("POSTGRES_PASSWORD", pgPassword),
              envFromSecretVersion("APPLICATION_SECRET", applicationSecret),
              envFromSecretVersion("ACTION_SECRET", actionSecret),
              envFromSecretVersion("HASURA_JWT_SECRET", hasuraJwtSecretToken),
              envFromSecretVersion("APPLICATION_JWT_SECRET", appJwtSecret),
              envFromValue("STORAGE_BUCKET", bucket.name),
              envFromValue("PUBLIC_STORAGE_BUCKET", publicBucketName),
              envFromValue("POSTGRES_USER", hasuraUser.name),
              envFromValue("POSTGRES_DB", hasuraDatabase.name),
              envFromValue("VALKEY_HOST", valkeyInternalIp),
              envFromValue("VALKEY_PORT", "6379"),
              envFromValue(
                "POSTGRES_HOST",
                pulumi.interpolate`/cloudsql/${database.connectionName}`,
              ),
              envFromValue(
                "HASURA_SERVER_URL",
                `https://${DEPLOYED_DOMAIN}/v1/graphql`,
              ),
              envFromValue(
                "VITE_HASURA_CLIENT_URL",
                `https://${DEPLOYED_DOMAIN}/v1/graphql`,
              ),
              envFromValue("NODE_ENV", "production"),
              envFromValue("ENABLE_ALL_FEATURES", "false"),
              envFromValue("UPLOAD_TO_BUCKET", "true"),
              envFromValue("GCLOUD_TRACE_EXPORT", "true"),
              envFromValue("WEB_HOST", `https://${DEPLOYED_DOMAIN}`),
              envFromValue("RENDER_HOST", `https://${DEPLOYED_DOMAIN}`),
              ...queueEnvVars(),
              envFromValue("PINO_LOG_LEVEL", "debug"),
            ],
            ports: {
              containerPort: 3000,
              name: "http1",
            },
            resources: {
              limits: {
                cpu: config.workerCpu,
                memory: config.workerMemory,
                ...gpuResourceLimits,
              },
              startupCpuBoost: true,
            },
            startupProbe: {
              failureThreshold: 5,
              periodSeconds: 5,
              tcpSocket: {
                port: 3000,
              },
              timeoutSeconds: 5,
            },
            livenessProbe: {
              httpGet: {
                path: "/healthz",
                port: 3000,
              },
            },
            volumeMounts: [
              {
                mountPath: "/cloudsql",
                name: "cloudsql",
              },
            ],
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
        database,
        hasuraDatabase,
        hasuraUser,
        serviceAccount,
        pgPassword.version,
        actionSecret.version,
        hasuraJwtSecretToken.version,
      ],
    },
  );
};
