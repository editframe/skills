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
import {
  DEPLOYED_DOMAIN,
  GCP_LOCATION,
  GCP_PROJECT,
  GCP_REGION,
} from "../constants";

import * as infra from "../_infra";
import { bucket } from "../storage";
import { cloudrun as transcribeService } from "../transcribe";
import { valkeyComputeInstance, valkeyInternalIp } from "../valkey";
import { valkeyVpcConnector } from "../network";
import { getGitSha } from "../../util/getGitSha";

const repo = infra.artifactRepository;

export const cloudrun = new gcp.cloudrunv2.Service(
  "telecine-transcribe-ctl",
  {
    ingress: "INGRESS_TRAFFIC_ALL",
    launchStage: "GA",
    location: GCP_REGION,
    name: "telecine-transcribe-ctl",
    project: GCP_PROJECT,
    template: {
      serviceAccount: serviceAccount.email,
      maxInstanceRequestConcurrency: 1,
      timeout: "300s",
      scaling: {
        maxInstanceCount: 200,
        minInstanceCount: 0,
      },
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
          // image: dockerImage.repoDigest,
          // image: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/transcribe-ctl:${getGitSha()}`,
          image: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/transcribe-ctl:8c0b5b9212f9725577f28bbbb3477c9d63897f85`,

          envs: [
            envFromSecretVersion("POSTGRES_PASSWORD", pgPassword),
            envFromSecretVersion("APPLICATION_SECRET", applicationSecret),
            envFromSecretVersion("ACTION_SECRET", actionSecret),
            envFromSecretVersion("HASURA_JWT_SECRET", hasuraJwtSecretToken),
            envFromSecretVersion("APPLICATION_JWT_SECRET", appJwtSecret),
            envFromValue("STORAGE_BUCKET", bucket.name),
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
            envFromValue("TRANSCRIBE_HOST", transcribeService.uri),
            envFromValue("MAX_TRANSCRIBE_CONCURRENCY", "8"),
            envFromValue(
              "FRAMEGEN_OUTBOUND_HOST",
              `https://${DEPLOYED_DOMAIN}`,
            ),
            envFromValue("GLOBAL_WORK_SLOT_COUNT", "40"),
            envFromValue("FRAGMENT_ENCODE_TIMEOUT_MS", "60000"),
          ],
          ports: {
            containerPort: 3000,
            name: "http1",
          },
          resources: {
            limits: {
              cpu: "100m",
              memory: "256Mi",
            },
            cpuIdle: true,
            startupCpuBoost: true,
          },
          startupProbe: {
            failureThreshold: 5,
            periodSeconds: 2,
            tcpSocket: {
              port: 3000,
            },
            timeoutSeconds: 1,
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
      transcribeService,
      pgPassword.version,
      actionSecret.version,
      valkeyVpcConnector,
      hasuraJwtSecretToken.version,
      valkeyComputeInstance,
    ],
  },
);
