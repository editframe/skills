import * as gcp from "@pulumi/gcp";

export const serviceAccount = new gcp.serviceaccount.Account(
  "transcribe-ctl-service-account",
  {
    accountId: "telecine-transcribe-ctl",
    displayName: "Transcribe-ctl Service Account",
  },
);
