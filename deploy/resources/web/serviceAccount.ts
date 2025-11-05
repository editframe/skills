import * as gcp from "@pulumi/gcp";

export const serviceAccount = new gcp.serviceaccount.Account(
  "web-service-account",
  {
    accountId: "telecine-web",
    displayName: "Web Service Account",
  },
);
