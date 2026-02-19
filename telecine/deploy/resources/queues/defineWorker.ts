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
import * as infra from "../_infra";
import { bucket } from "../storage";
import { publicBucketName } from "../constants";
import { getGitSha } from "../../util/getGitSha";
import { valkeyInternalIp } from "../valkey";
import { type QueueConfig, queueEnvVars } from "./workers";

const repo = infra.artifactRepository;

export const defineWorker = (config: QueueConfig) => {
  return new gcp.cloudrunv2.WorkerPool(
    `telecine-worker-${config.name}`,
    {
      launchStage: "BETA",
      location: "us-central1",
      name: `telecine-worker-${config.name}`,
      project: "editframe",
      scaling: {
        scalingMode: "MANUAL",
        manualInstanceCount: 0,
      },
      template: {
        containers: [
          {
            image: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/worker-${config.name}:${getGitSha()}`,

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
              ...queueEnvVars(),
              envFromValue("PINO_LOG_LEVEL", "debug"),
            ],
            resources: {
              limits: {
                cpu: config.workerCpu,
                memory: config.workerMemory,
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
        serviceAccount: serviceAccount.email,
        volumes: [
          {
            name: "cloudsql",
            cloudSqlInstance: {
              instances: [database.connectionName],
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
        database,
        hasuraDatabase,
        hasuraUser,
        serviceAccount,
        pgPassword.version,
        actionSecret.version,
        hasuraJwtSecretToken.version,
      ],
      ignoreChanges: ["scaling"],
    },
  );
};
