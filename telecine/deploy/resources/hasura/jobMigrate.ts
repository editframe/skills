import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import * as cmd from "@pulumi/command";

import * as infra from "../_infra";
import path from "node:path";
import { GCP_LOCATION, GCP_PROJECT } from "../constants";
import { serviceAccount } from "./serviceAccount";
import { envFromSecretVersion } from "../../util/envFromSecretVersion";
import { hasuraAdminSecret } from "../secrets";
import { envFromValue } from "../../util/envFromValue";
import { cloudrun } from "./cloudrun";
import { execSync } from "node:child_process";

const repo = infra.artifactRepository;

// Get the current git commit hash
const gitCommit = execSync("git rev-parse --short HEAD").toString().trim();

const jobDockerImage = new docker.Image("migration-docker-image", {
  build: {
    context: path.resolve(__dirname, "../../../services/graphql-engine"),
    dockerfile: path.resolve(
      __dirname,
      "../../../services/graphql-engine/Dockerfile.migrate",
    ),
    // builderVersion: "BuilderBuildKit",

    args: {
      // BUILDKIT_INLINE_CACHE: "1",
      HASURA_VERSION: "v2.36.0",
    },
    platform: "linux/amd64",
  },
  imageName: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/migration-job:${gitCommit}`,
});

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
            image: jobDockerImage.imageName,
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
  // We don't want to get ahead of things
  { dependsOn: cloudrun },
);

new cmd.local.Command(
  "execute-migration",
  {
    triggers: [jobDockerImage.imageName],
    create: pulumi.interpolate`gcloud run jobs execute ${jobMigrate.name} --wait --region ${GCP_LOCATION} --project ${GCP_PROJECT}`,
  },
  { dependsOn: jobMigrate },
);
