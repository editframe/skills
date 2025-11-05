import * as gcp from "@pulumi/gcp";
import { GCP_PROJECT } from "../constants";

export const deployerWorkloadPool = new gcp.iam.WorkloadIdentityPool(
  "telecine-deployer",
  {
    description: "Pool to run deployments through github actions.",
    displayName: "telecine-deployer",
    project: "editframe",
    workloadIdentityPoolId: "telecine-deployer",
  },
  {
    protect: true,
  },
);

export const githubWorkloadProvider = new gcp.iam.WorkloadIdentityPoolProvider(
  "github-workload-provider",
  {
    attributeCondition: "assertion.repository == 'editframe/telecine'",
    attributeMapping: {
      "attribute.actor": "assertion.actor",
      "attribute.aud": "assertion.aud",
      "attribute.repository": "assertion.repository",
      "google.subject": "assertion.sub",
    },
    displayName: "github",
    oidc: {
      issuerUri: "https://token.actions.githubusercontent.com",
    },
    project: GCP_PROJECT,
    workloadIdentityPoolId: "telecine-deployer",
    workloadIdentityPoolProviderId: "github",
  },
  {
    protect: true,
  },
);
