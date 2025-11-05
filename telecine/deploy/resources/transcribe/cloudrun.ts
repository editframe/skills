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
// import { dockerImage } from "./dockerImage";
import { bucket } from "../storage";
import { getGitSha } from "../../util/getGitSha";
import { valkeyInternalIp } from "../valkey";
import { valkeyVpcConnector } from "../network";

const repo = infra.artifactRepository;

export const cloudrun = new gcp.cloudrunv2.Service(
  "telecine-transcribe",
  {
    ingress: "INGRESS_TRAFFIC_ALL",
    launchStage: "BETA",
    location: "us-central1",
    name: "telecine-transcribe",
    project: "editframe",
    template: {
      gpuZonalRedundancyDisabled: true,
      scaling: {
        maxInstanceCount: 5,
        minInstanceCount: 0,
      },
      timeout: "60s",
      maxInstanceRequestConcurrency: 12,
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
          // image: dockerImage.repoDigest,
          // image: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/transcribe:${getGitSha()}`,
          image: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/transcribe:e4ecbee541ce07c632bbcf28485b9e891c51c486`,

          envs: [
            envFromSecretVersion("POSTGRES_PASSWORD", pgPassword),
            envFromSecretVersion("APPLICATION_SECRET", applicationSecret),
            envFromSecretVersion("ACTION_SECRET", actionSecret),
            envFromSecretVersion("APPLICATION_JWT_SECRET", appJwtSecret),
            envFromSecretVersion("HASURA_JWT_SECRET", hasuraJwtSecretToken),
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
            envFromValue(
              "FRAMEGEN_OUTBOUND_HOST",
              `https://${DEPLOYED_DOMAIN}`,
            ),
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
              cpu: "4",
              memory: "16Gi",
              "nvidia.com/gpu": "1",
            },
            startupCpuBoost: true,
          },
          startupProbe: {
            failureThreshold: 5,
            periodSeconds: 2,
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
