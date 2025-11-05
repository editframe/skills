import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as infra from "../_infra";
import { GCP_LOCATION } from "../constants";

const repo = infra.artifactRepository;

export const dockerImage = new docker.Image("docker-web", {
  imageName: pulumi.interpolate`${GCP_LOCATION}-docker.pkg.dev/${repo.project}/${repo.name}/web:latest`,
  registry: {
    // the empty block because we log in with gcloud
  },
});
