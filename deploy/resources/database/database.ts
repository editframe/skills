import * as gcp from "@pulumi/gcp";
import * as random from "@pulumi/random";

import { makeSecret } from "../../util/makeSecret";
import { GCP_LOCATION } from "../constants";
import { defaultNetwork } from "../network";
export const database = new gcp.sql.DatabaseInstance(
  "telecine-db",
  {
    databaseVersion: "POSTGRES_15",
    deletionProtection: true,
    region: GCP_LOCATION,
    settings: {
      activationPolicy: "ALWAYS",
      availabilityType: "REGIONAL",
      backupConfiguration: {
        enabled: true,
        location: GCP_LOCATION,
        pointInTimeRecoveryEnabled: true,
      },
      databaseFlags: [
        {
          name: "max_connections",
          value: "100",
        },
      ],
      diskAutoresize: true,
      diskAutoresizeLimit: 0,
      diskType: "PD_SSD",
      edition: "ENTERPRISE",
      insightsConfig: {
        queryInsightsEnabled: true,
        queryStringLength: 1024,
      },
      ipConfiguration: {
        ipv4Enabled: true,
        enablePrivatePathForGoogleCloudServices: true,
        privateNetwork: defaultNetwork.id,
      },
      pricingPlan: "PER_USE",
      tier: "db-g1-small",
    },
  },
  {
    protect: true,
  },
);

export const hasuraDBPassword = new random.RandomPassword(
  "password",
  {
    length: 64,
    special: false,
  },
  { protect: true },
);

export const hasuraUser = new gcp.sql.User(
  "hasura-user",
  {
    instance: database.name,
    name: "hasura",
    password: hasuraDBPassword.result,
    deletionPolicy: "ABANDON",
  },
  { dependsOn: [database, hasuraDBPassword], protect: true },
);

export const hasuraDatabase = new gcp.sql.Database(
  "hasura",
  {
    name: "telecine-prod",
    instance: database.name,
    deletionPolicy: "ABANDON",
  },
  { dependsOn: [database], protect: true },
);

export const pgPassword = makeSecret(
  "hasura-db-password",
  hasuraDBPassword.result,
  [hasuraDBPassword],
);
