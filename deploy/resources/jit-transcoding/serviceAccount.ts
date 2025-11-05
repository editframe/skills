import * as gcp from "@pulumi/gcp";

export const serviceAccount = new gcp.serviceaccount.Account(
  "jit-transcoding-service-account",
  {
    accountId: "telecine-jit-transcoding",
    displayName: "JIT Transcoding Service Account",
  },
);