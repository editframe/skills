import * as gcp from "@pulumi/gcp";

export const serviceAccount = new gcp.serviceaccount.Account(
  "transcribe-service-account",
  {
    accountId: "telecine-transcribe",
    displayName: "Transcribe Service Account",
  },
);
