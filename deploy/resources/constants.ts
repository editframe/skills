import * as pulumi from "@pulumi/pulumi";

export const GCP_PROJECT = "editframe";

export const projectName = pulumi.getProject();
export const stackName = pulumi.getStack();

export const bucketName = `${stackName}-data`;
export const GCP_LOCATION = "us-central1";
export const GCP_REGION = "us-central1";

export const DEPLOYED_DOMAIN = "editframe.dev";
export const publicBucketName = "editframe-assets";
