import * as gcp from "@pulumi/gcp";
import { database } from "../database/database";
import { envFromSecretVersion } from "../../util/envFromSecretVersion";
import { envFromValue } from "../../util/envFromValue";
import { hasuraUser, hasuraDatabase } from "../database/database";

import { serviceAccount } from "./serviceAccount";
import { actionSecret, hasuraAdminSecret } from "../secrets";
import { DEPLOYED_DOMAIN } from "../constants";
import { dockerImage } from "./dockerImage";
import { hasuraConnectionString } from "./hasuraConnectionString";
import { hasuraJwtSecret } from "./hasuraJwtSecret";

export const cloudrun = new gcp.cloudrunv2.Service(
  "telecine-graphql-engine",
  {
    client: "cloud-console",
    ingress: "INGRESS_TRAFFIC_ALL",
    launchStage: "GA",
    location: "us-central1",
    name: "telecine-graphql-engine",
    project: "editframe",
    template: {
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
          image: dockerImage.repoDigest,
          envs: [
            envFromSecretVersion(
              "HASURA_GRAPHQL_DATABASE_URL",
              hasuraConnectionString,
            ),
            envFromSecretVersion("PG_DATABASE_URL", hasuraConnectionString),
            envFromValue("HASURA_GRAPHQL_LOG_LEVEL", "debug"),
            envFromValue(
              "HASURA_GRAPHQL_ENABLED_LOG_TYPES",
              "startup, http-log, webhook-log, websocket-log, query-log",
            ),
            envFromSecretVersion("HASURA_GRAPHQL_JWT_SECRET", hasuraJwtSecret),
            envFromSecretVersion(
              "HASURA_GRAPHQL_ADMIN_SECRET",
              hasuraAdminSecret,
            ),
            envFromValue("HASURA_ACTION_ORIGIN", `https://${DEPLOYED_DOMAIN}`),

            envFromSecretVersion("ACTION_SECRET", actionSecret),
            envFromValue("HASURA_GRAPHQL_ENABLE_TELEMETRY", "false"),
            envFromValue("HASURA_GRAPHQL_UNAUTHORIZED_ROLE", "anonymous"),
            envFromValue("HASURA_GRAPHQL_ENABLE_CONSOLE", "true"),

            envFromValue(
              "ADMIN_EMAILS",
              "collin@editframe.com,jeremy@editframe.com",
            ),
          ],
          livenessProbe: {
            httpGet: {
              path: "/healthz",
              port: 8080,
            },
          },
          name: "telecine-graphql-engine-1",
          ports: {
            containerPort: 8080,
            name: "http1",
          },
          resources: {
            limits: {
              cpu: "1000m",
              memory: "512Mi",
            },
            cpuIdle: false,
            startupCpuBoost: true,
          },
          startupProbe: {
            failureThreshold: 1,
            periodSeconds: 240,
            tcpSocket: {
              port: 8080,
            },
            timeoutSeconds: 240,
          },
          volumeMounts: [
            {
              mountPath: "/cloudsql",
              name: "cloudsql",
            },
          ],
        },
      ],
      executionEnvironment: "EXECUTION_ENVIRONMENT_GEN2",
      maxInstanceRequestConcurrency: 1000,
      scaling: {
        maxInstanceCount: 1,
        minInstanceCount: 1,
      },
      serviceAccount: serviceAccount.email,
      timeout: "300s",
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
    traffics: [
      {
        percent: 100,
        type: "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",
      },
    ],
  },
  {
    dependsOn: [
      database,
      hasuraDatabase,
      actionSecret.version,
      hasuraUser,
      hasuraConnectionString.version,
      hasuraAdminSecret.version,
      hasuraJwtSecret.version,
    ],
  },
);
