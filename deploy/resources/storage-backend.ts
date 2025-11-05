import * as gcp from "@pulumi/gcp";
import { GCP_PROJECT } from "./constants";
import { publicBucket } from "./storage";

export const assetsBackendBucket = new gcp.compute.BackendBucket(
  "assets-backend-bucket",
  {
    name: "assets-backend-bucket",
    bucketName: publicBucket.name,
    enableCdn: true,
    project: GCP_PROJECT,
  },
);

