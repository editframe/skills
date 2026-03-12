import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import * as cmd from "@pulumi/command";

import { GCP_LOCATION, GCP_PROJECT } from "../constants";
import { serviceAccount } from "./serviceAccount";
import { envFromSecretVersion } from "../../util/envFromSecretVersion";
import { hasuraAdminSecret } from "../secrets";
import { envFromValue } from "../../util/envFromValue";
import { cloudrun } from "./cloudrun";
import { getImageRef } from "../../util/getImageRef";
const migrationImage = getImageRef("migration-job");

export const jobMigrate = new gcp.cloudrunv2.Job(
  "telecine-migrate",
  {
    location: GCP_LOCATION,
    project: GCP_PROJECT,
    template: {
      taskCount: 1,

      template: {
        serviceAccount: serviceAccount.email,
        containers: [
          {
            image: migrationImage,
            envs: [
              envFromSecretVersion(
                "HASURA_GRAPHQL_ADMIN_SECRET",
                hasuraAdminSecret,
              ),
              envFromValue("HASURA_GRAPHQL_ENDPOINT", cloudrun.uri),
              envFromValue("HASURA_GRAPHQL_ENABLE_TELEMETRY", "false"),
            ],
          },
        ],
      },
    },
  },
  // No use running the migration until the main graphql service is deployed
  { dependsOn: cloudrun },
);

new cmd.local.Command(
  "execute-migration",
  {
    triggers: [migrationImage],
    create: pulumi.interpolate`gcloud run jobs execute ${jobMigrate.name} --wait --region ${GCP_LOCATION} --project ${GCP_PROJECT}`,
  },
  { dependsOn: jobMigrate },
);
