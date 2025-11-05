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
import { DEPLOYED_DOMAIN, GCP_LOCATION } from "../constants";
// import { dockerImage } from "./dockerImage";
import * as infra from "../_infra";
import { bucket } from "../storage";
import { publicBucketName } from "../constants";
import { getGitSha } from "../../util/getGitSha";
import { valkeyInternalIp } from "../valkey";
import { BASE_QUEUE_CONFIGS } from "./BASE_QUEUE_CONFIGS";
import { type QueueConfig, workerConfigs, } from "./workers";

const repo = infra.artifactRepository;

/**
 * Returns a list of environment variables to be defined in the worker services.
 * They need a value for the WS host, but they'll never use it. Localhost is good enough.
 * @returns
 */
const internalQueueEnvVars = () => {
  const vars: {
    name: string;
    value: pulumi.Output<string>;
  }[] = [];

  Object.entries(workerConfigs).forEach(([name, config]) => {
    vars.push(
      envFromValue(`${config.screaming}_WEBSOCKET_HOST`, "http://localhost:80"),
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

export const defineWorker = (config: QueueConfig) => {
  const { name, maxWorkerCount, workerConcurrency } = config;
  const screaming = name.toUpperCase().replace(/-/g, "_");
  const queueConfig = structuredClone(BASE_QUEUE_CONFIGS);

  // @ts-ignore
  queueConfig[`${screaming}_MAX_WORKER_COUNT`] = maxWorkerCount.toString();

  // @ts-ignore
  queueConfig[`${screaming}_WORKER_CONCURRENCY`] = workerConcurrency.toString();

  return new gcp.cloudrunv2.Service(
    `telecine-worker-${config.name}`,
    {
      ingress: "INGRESS_TRAFFIC_INTERNAL_ONLY",
      launchStage: "GA",
      location: "us-central1",
      name: `telecine-worker-${config.name}`,
      project: "editframe",
      template: {
        // run workers in GEN1, faster boots, but less performance
        executionEnvironment: "EXECUTION_ENVIRONMENT_GEN1",
        // This is the maximum allowed timeout for a Cloud Run service
        // We set this to be long so our workers can hold a websocket connection
        // as long as possible before terminating and reconnecting
        timeout: "3600s",
        scaling: {
          minInstanceCount: 0,
          maxInstanceCount: config.maxWorkerCount,
        },
        serviceAccount: serviceAccount.email,
        volumes: [
          {
            name: "cloudsql",
            cloudSqlInstance: {
              instances: [database.connectionName],
            },
          },
        ],
        maxInstanceRequestConcurrency: 1,
        containers: [
          {
            // image: dockerImage.repoDigest,
            image: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/worker-${name}:${getGitSha()}`,

            envs: [
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
              ...internalQueueEnvVars(),
              envFromValue("PINO_LOG_LEVEL", "debug"),
            ],
            livenessProbe: {
              failureThreshold: 2,
              periodSeconds: 5,
              timeoutSeconds: 5,
              httpGet: {
                path: "/healthz",
                port: 3000,
              },
            },
            ports: {
              containerPort: 3000,
              name: "http1",
            },
            resources: {
              limits: {
                cpu: config.workerCpu,
                memory: config.workerMemory,
              },
              cpuIdle: true,
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
