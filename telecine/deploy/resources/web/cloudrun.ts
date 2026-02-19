import { envFromUnmanagedSecret } from "./../../util/envFromUnmanagedSecret";
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
import { queueEnvVars } from "../queues/workers";
const repo = infra.artifactRepository;

export const cloudrun = new gcp.cloudrunv2.Service(
  "telecine-web",
  {
    ingress: "INGRESS_TRAFFIC_ALL",
    launchStage: "GA",
    location: "us-central1",
    name: "telecine-web",
    project: "editframe",
    template: {
      scaling: {
        minInstanceCount: 1,
        maxInstanceCount: 10,
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
      maxInstanceRequestConcurrency: 160,
      containers: [
        {
          // image: dockerImage.repoDigest,
          image: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/web:${getGitSha()}`,

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
            envFromValue("VITE_WEB_HOST", `https://${DEPLOYED_DOMAIN}`),
            envFromValue("RENDER_HOST", `https://${DEPLOYED_DOMAIN}`),
            envFromValue("MAX_RENDER_CONCURRENCY", "80"),
            envFromValue("SMTP_HOST", "smtp.mailgun.org"),
            envFromValue("SMTP_SECURE", "true"),
            envFromValue("EMAIL_SENDER", "no-reply@editframe.com"),
            envFromValue("SMTP_PORT", "465"),
            envFromValue("SMTP_USER", "smtp@editframe.com"),
            ...queueEnvVars(),
            envFromUnmanagedSecret("SMTP_PASSWORD", "SMTP_PASSWORD"),
            envFromUnmanagedSecret("SLACK_WEBHOOK_URL", "SLACK_WEBHOOK_URL"),
            envFromUnmanagedSecret(
              "SLACK_TRANSACTIONS_URL",
              "SLACK_TRANSACTIONS_URL",
            ),
            envFromValue(
              "ADMIN_EMAILS",
              "collin@editframe.com,jeremy@editframe.com",
            ),
            envFromValue("HASURA_GRAPHQL_ENABLE_CONSOLE", "false"),
          ],
          livenessProbe: {
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
              cpu: "1000m",
              memory: "1Gi",
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
