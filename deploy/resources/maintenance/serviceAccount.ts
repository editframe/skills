import * as gcp from "@pulumi/gcp";

export const serviceAccount = new gcp.serviceaccount.Account(
  "maintenance-service-account",
  {
    accountId: "telecine-maintenance",
    displayName: "Maintenance Service Account",
  },
);
