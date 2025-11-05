import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as infra from "../_infra";
import { GCP_LOCATION } from "../constants";
import path from "node:path";

const repo = infra.artifactRepository;

export const dockerImage = new docker.Image("docker-hasura", {
  build: {
    context: path.resolve(__dirname, "../../../services/graphql-engine"),
    dockerfile: path.resolve(
      __dirname,
      "../../../services/graphql-engine/Dockerfile",
    ),
    platform: "linux/amd64",
    builderVersion: "BuilderBuildKit",

    args: {
      BUILDKIT_INLINE_CACHE: "1",
    },
    // Cache from didn't really save any time with this configuration.
    cacheFrom: {
      images: [
        pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/graphql-engine:latest`,
      ],
    },
  },
  imageName: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/graphql-engine:latest`,
  registry: {
    // the empty block because we log in with gcloud
  },
});
