import * as gcp from "@pulumi/gcp";
import { bucketName, GCP_LOCATION, publicBucketName } from "./constants";

// Create a GCP resource (Storage Bucket)
export const bucket = new gcp.storage.Bucket(
  bucketName,
  {
    location: GCP_LOCATION,
  },
  { protect: true },
);
export const publicBucket = new gcp.storage.Bucket(
  publicBucketName,
  {
    location: GCP_LOCATION,
  },
  { protect: false },
);

new gcp.storage.BucketIAMBinding("public-bucket-read", {
  bucket: publicBucket.name,
  role: "roles/storage.objectViewer",
  members: ["allUsers"],
});
