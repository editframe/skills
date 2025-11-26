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
import { valkeyVpcConnector } from "../network";

const repo = infra.artifactRepository;

export const cloudrun = new gcp.cloudrunv2.Service(
  "telecine-jit-transcoding",
  {
    ingress: "INGRESS_TRAFFIC_ALL",
    launchStage: "GA",
    location: "us-central1",
    name: "telecine-jit-transcoding",
    project: "editframe",
    template: {
      executionEnvironment: "EXECUTION_ENVIRONMENT_GEN2",
      scaling: {
        maxInstanceCount: 20,
        minInstanceCount: 1,
      },
      timeout: "300s", // 5 minutes for transcoding operations
      maxInstanceRequestConcurrency: 4, // CPU intensive
      serviceAccount: serviceAccount.email,
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
          image: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/jit-transcoding:${getGitSha()}`,

          envs: [
            envFromSecretVersion("POSTGRES_PASSWORD", pgPassword),
            envFromSecretVersion("APPLICATION_SECRET", applicationSecret),
            envFromSecretVersion("ACTION_SECRET", actionSecret),
            envFromSecretVersion("APPLICATION_JWT_SECRET", appJwtSecret),
            envFromSecretVersion("HASURA_JWT_SECRET", hasuraJwtSecretToken),
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
            envFromValue("TEMP_DIR", "/tmp/jit-transcoding-temp"),
          ],
          livenessProbe: {
            httpGet: {
              path: "/health",
              port: 3001,
            },
            failureThreshold: 3,
            periodSeconds: 30,
            timeoutSeconds: 10,
          },
          ports: {
            containerPort: 3001,
            name: "http1",
          },
          resources: {
            limits: {
              cpu: "2000m", // 2 CPU cores for transcoding
              memory: "4Gi", // 4GB for FFmpeg operations
            },
            cpuIdle: true,
            startupCpuBoost: true,
          },
          startupProbe: {
            failureThreshold: 10,
            periodSeconds: 5,
            tcpSocket: {
              port: 3001,
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
        connector: valkeyVpcConnector.id,
        egress: "PRIVATE_RANGES_ONLY",
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
