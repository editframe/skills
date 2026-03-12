import * as gcp from "@pulumi/gcp";

export const serviceAccount = new gcp.serviceaccount.Account(
  "scheduler-go-service-account",
  {
    accountId: "telecine-scheduler-go",
    displayName: "Scheduler Go Service Account",
  },
);
