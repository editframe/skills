import * as gcp from "@pulumi/gcp";

export const serviceAccount = new gcp.serviceaccount.Account(
  "hasura-service-account",
  {
    accountId: "hasura",
    displayName: "Hasura Service Account",
  },
);
