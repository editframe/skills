import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

import * as infra from "./resources/_infra";
import * as hasura from "./resources/hasura";
import * as web from "./resources/web";
import * as transcribe from "./resources/transcribe";
import * as transcribeCtl from "./resources/transcribe-ctl";
import * as jitTranscoding from "./resources/jit-transcoding";
import * as storage from "./resources/storage";
import * as queues from "./resources/queues/workers";
import * as maintenance from "./resources/maintenance";
import * as schedulerGo from "./resources/scheduler-go";
import "./resources/network";
import "./resources/valkey";
import "./resources/storage-backend";
import "./resources/loadbalancer";
import "./resources/cloudflare-dns-com";
import "./resources/cloudflare-dns-dev";

import { GCP_PROJECT } from "./resources/constants";

// AUDIT: This feels like we should be creating custom roles for each kind of service,
// and then binding the service accounts to the roles rather than binding to existing roles.

const webServiceAccount = pulumi.interpolate`serviceAccount:${web.serviceAccount.email}`;
const transcribeServiceAccount = pulumi.interpolate`serviceAccount:${transcribe.serviceAccount.email}`;
const transcribeCtlServiceAccount = pulumi.interpolate`serviceAccount:${transcribeCtl.serviceAccount.email}`;
const jitTranscodingServiceAccount = pulumi.interpolate`serviceAccount:${jitTranscoding.serviceAccount.email}`;
const hasuraServiceAccount = pulumi.interpolate`serviceAccount:${hasura.serviceAccount.email}`;
const deployerWorkloadPool = pulumi.interpolate`principalSet://iam.googleapis.com/${infra.deployerWorkloadPool.name}/attribute.repository/editframe/telecine`;
const queuesServiceAccount = pulumi.interpolate`serviceAccount:${queues.serviceAccount.email}`;
const maintenanceServiceAccount = pulumi.interpolate`serviceAccount:${maintenance.serviceAccount.email}`;
const schedulerGoServiceAccount = pulumi.interpolate`serviceAccount:${schedulerGo.serviceAccount.email}`;

new gcp.projects.IAMBinding("cloudsql-clients", {
  members: [
    webServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    hasuraServiceAccount,
    queuesServiceAccount,
    maintenanceServiceAccount,
  ],
  role: "roles/cloudsql.client",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("secret-accessors", {
  members: [
    webServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    hasuraServiceAccount,
    queuesServiceAccount,
    maintenanceServiceAccount,
    deployerWorkloadPool,
  ],
  role: "roles/secretmanager.secretAccessor",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("monitoring-admins", {
  members: [
    webServiceAccount,
    hasuraServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    queuesServiceAccount,
    maintenanceServiceAccount,
    deployerWorkloadPool,
  ],
  role: "roles/monitoring.admin",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("secret-viewer-binding", {
  project: GCP_PROJECT,
  role: "roles/secretmanager.viewer",
  members: [deployerWorkloadPool],
});

new gcp.projects.IAMBinding("run-admins", {
  members: [
    webServiceAccount,
    hasuraServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    queuesServiceAccount,
    maintenanceServiceAccount,
    schedulerGoServiceAccount,
    deployerWorkloadPool,
  ],
  role: "roles/run.admin",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("monitoring-alert-policy-editor", {
  members: [
    webServiceAccount,
    hasuraServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    queuesServiceAccount,
    maintenanceServiceAccount,
    deployerWorkloadPool,
  ],
  role: "roles/monitoring.alertPolicyEditor",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("monitoring-cloud-console-incident-editor", {
  members: [
    webServiceAccount,
    hasuraServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    queuesServiceAccount,
    maintenanceServiceAccount,
    deployerWorkloadPool,
  ],
  role: "roles/monitoring.cloudConsoleIncidentEditor",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("token-creators", {
  members: [
    webServiceAccount,
    hasuraServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    queuesServiceAccount,
    maintenanceServiceAccount,
  ],
  role: "roles/iam.serviceAccountTokenCreator",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("service-account-users", {
  members: [
    webServiceAccount,
    hasuraServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    deployerWorkloadPool,
    queuesServiceAccount,
    maintenanceServiceAccount,
    schedulerGoServiceAccount,
  ],
  role: "roles/iam.serviceAccountUser",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("storage-readers", {
  members: [
    deployerWorkloadPool,
    webServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    queuesServiceAccount,
    maintenanceServiceAccount,
  ],
  role: "roles/storage.admin",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("trace-agents", {
  members: [
    webServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    queuesServiceAccount,
    maintenanceServiceAccount,
    schedulerGoServiceAccount,
  ],
  role: "roles/cloudtrace.agent",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("cloudrun invokers", {
  members: [
    webServiceAccount,
    transcribeServiceAccount,
    transcribeCtlServiceAccount,
    jitTranscodingServiceAccount,
    hasuraServiceAccount,
    queuesServiceAccount,
    maintenanceServiceAccount,
    schedulerGoServiceAccount,
  ],
  role: "roles/run.invoker",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("artifact-admins", {
  members: [deployerWorkloadPool],
  role: "roles/artifactregistry.admin",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("cloud-scheduler-admins", {
  members: [deployerWorkloadPool],
  role: "roles/cloudscheduler.admin",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("dataflow-pipeline-runner", {
  members: [deployerWorkloadPool],
  role: "roles/datapipelines.admin",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("loadbalancer-admins", {
  members: [deployerWorkloadPool],
  role: "roles/compute.loadBalancerAdmin",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding(
  "secret-manager-admins",
  {
    members: [deployerWorkloadPool],
    role: "roles/secretmanager.admin",
    project: GCP_PROJECT,
  },
  {
    replaceOnChanges: ["members", "role"],
    dependsOn: [infra.deployerWorkloadPool],
  },
);

// Used to notify slack
new gcp.projects.IAMBinding(
  "auth-monitors",
  {
    members: [
      webServiceAccount,
      transcribeServiceAccount,
      transcribeCtlServiceAccount,
      jitTranscodingServiceAccount,
      hasuraServiceAccount,
      deployerWorkloadPool,
      queuesServiceAccount,
      maintenanceServiceAccount,
    ],
    role: "roles/monitoring.admin",
    project: GCP_PROJECT,
  },
  {
    replaceOnChanges: ["members", "role"],
    dependsOn: [infra.deployerWorkloadPool],
  },
);

// Used to create alert policies
new gcp.projects.IAMBinding(
  "monitoring-alerts",
  {
    members: [
      webServiceAccount,
      transcribeServiceAccount,
      transcribeCtlServiceAccount,
      jitTranscodingServiceAccount,
      hasuraServiceAccount,
      deployerWorkloadPool,
      queuesServiceAccount,
      maintenanceServiceAccount,
    ],
    role: "roles/monitoring.editor",
    project: GCP_PROJECT,
  },
  {
    replaceOnChanges: ["members", "role"],
    dependsOn: [infra.deployerWorkloadPool],
  },
);

// Used to create memorystore instances
new gcp.projects.IAMBinding("memorystore-admin", {
  members: [deployerWorkloadPool],
  role: "roles/memorystore.admin",
  project: GCP_PROJECT,
});

// Used to manage networks used for memorystore instances
new gcp.projects.IAMBinding("network-admin", {
  members: [deployerWorkloadPool],
  role: "roles/compute.networkAdmin",
  project: GCP_PROJECT,
});

// Used to create vpc access connectors for memorystore instances
new gcp.projects.IAMBinding("vpc-access-admin", {
  members: [deployerWorkloadPool],
  role: "roles/vpcaccess.admin",
  project: GCP_PROJECT,
});

// Grant permission to set tags on compute instances
new gcp.projects.IAMBinding("compute-instance-tag-setter", {
  members: [deployerWorkloadPool],
  role: "roles/compute.instanceAdmin",
  project: GCP_PROJECT,
});

new gcp.projects.IAMBinding("compute-security-admin", {
  members: [deployerWorkloadPool],
  role: "roles/compute.securityAdmin",
  project: GCP_PROJECT,
});

// Export the DNS name of the bucket
export const bucketURL = storage.bucket.url;
export const publicBucketName = storage.publicBucket.name;
// export const networkId = network.id;

new gcp.projects.IAMBinding("service-account-admin", {
  members: [deployerWorkloadPool],
  role: "roles/iam.serviceAccountAdmin",
  project: GCP_PROJECT,
});

// Helper function to create public invoker bindings
function allowPublicInvocation(name: string, service: gcp.cloudrunv2.Service) {
  return new gcp.cloudrun.IamMember(`${name}-public-invoker`, {
    service: service.name,
    location: service.location,
    role: "roles/run.invoker",
    member: "allUsers",
  });
}

allowPublicInvocation("web", web.cloudrun);
allowPublicInvocation("jit-transcoding", jitTranscoding.cloudrun);
