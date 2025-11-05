import * as gcp from "@pulumi/gcp";
import { GCP_LOCATION } from "../constants";

export const artifactRepository = new gcp.artifactregistry.Repository(
  "telecine-artifacts",
  {
    format: "DOCKER",
    repositoryId: "telecine-artifacts",
    location: GCP_LOCATION,
    cleanupPolicies: [
      {
        id: "keep-10-latest",
        action: "KEEP",
        mostRecentVersions: {
          keepCount: 10,
        },
      },
      {
        id: "delete-all",
        action: "DELETE",
        condition: {
          olderThan: "2600000s", // About 1 month
        },
      },
    ],
  },
  { protect: true },
);
