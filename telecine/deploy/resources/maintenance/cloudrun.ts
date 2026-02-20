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
import { workerResources } from "../../worker-resources.config";

export const cloudrun = new gcp.cloudrunv2.Service(
  "telecine-maintenance",
  {
    ingress: "INGRESS_TRAFFIC_INTERNAL_ONLY",
    launchStage: "GA",
    location: "us-central1",
    name: "telecine-maintenance",
    project: "editframe",
    template: {
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
          image: getImageRef("maintenance"),

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
              cpu: workerResources.maintenance.cpu,
              memory: workerResources.maintenance.memory,
            },
            cpuIdle: false,
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
