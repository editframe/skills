import * as gcp from "@pulumi/gcp";

export const serviceAccount = new gcp.serviceaccount.Account("queues-account", {
  accountId: "telecine-queues",
  displayName: "Queues Service Account",
});
