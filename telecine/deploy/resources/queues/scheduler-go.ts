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
import { externalQueueEnvVars, workers } from "./workers";
import { workerResources, toGoMemLimit } from "../../worker-resources.config";

const repo = infra.artifactRepository;

export const schedulerGo = new gcp.cloudrunv2.Service(
  "telecine-scheduler-go",
  {
    ingress: "INGRESS_TRAFFIC_INTERNAL_ONLY",
    launchStage: "GA",
    location: "us-central1",
    name: "telecine-scheduler-go",
    project: "editframe",
    template: {
      executionEnvironment: "EXECUTION_ENVIRONMENT_GEN1",
      timeout: "3600s",
      scaling: {
        minInstanceCount: 1,
        maxInstanceCount: 1,
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
          image: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/scheduler-go:${getGitSha()}`,

          envs: [
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
            envFromValue(
              "SCHEDULER_QUEUES",
              "process-html-initializer,process-html-finalizer,process-isobmff,render-initializer,render-fragment,render-finalizer,ingest-image",
            ),
            ...externalQueueEnvVars(),
            envFromValue("PINO_LOG_LEVEL", "debug"),
            envFromValue("GOMEMLIMIT", toGoMemLimit(workerResources.scheduler)),
          ],
          livenessProbe: {
            failureThreshold: 2,
            periodSeconds: 2,
            timeoutSeconds: 2,
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
              cpu: workerResources.scheduler.cpu,
              memory: workerResources.scheduler.memory,
            },
            cpuIdle: true,
            startupCpuBoost: true,
          },
          startupProbe: {
            failureThreshold: 15,
            periodSeconds: 2,
            tcpSocket: {
              port: 3000,
            },
            timeoutSeconds: 2,
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
      ...Array.from(Object.values(workers)),
    ],
  },
);
