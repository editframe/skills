import * as gcp from "@pulumi/gcp";

export const actionRunner = new gcp.compute.Instance("github-actions-runner", {
  bootDisk: {
    autoDelete: true,
    initializeParams: {
      image: "projects/debian-cloud/global/images/debian-12-bookworm-v20240213",
      size: 10,
      type: "pd-balanced",
    },
    mode: "READ_WRITE",
  },
  canIpForward: false,
  deletionProtection: false,
  enableDisplay: false,
  labels: {
    "goog-ec-src": "vm_add-tf",
  },
  machineType: "n1-standard-1",
  name: "github-actions-runner",
  networkInterfaces: [
    {
      accessConfigs: [
        {
          networkTier: "PREMIUM",
        },
      ],
      queueCount: 0,
      stackType: "IPV4_ONLY",
      subnetwork: "projects/editframe/regions/us-central1/subnetworks/default",
    },
  ],
  scheduling: {
    automaticRestart: true,
    onHostMaintenance: "TERMINATE",
    preemptible: false,
    provisioningModel: "STANDARD",
  },
  scratchDisks: [
    {
      interface: "NVME",
    },
  ],
  serviceAccount: {
    email: "257055402370-compute@developer.gserviceaccount.com",
    scopes: [
      "https://www.googleapis.com/auth/devstorage.read_only",
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring.write",
      "https://www.googleapis.com/auth/service.management.readonly",
      "https://www.googleapis.com/auth/servicecontrol",
      "https://www.googleapis.com/auth/trace.append",
      "https://www.googleapis.com/auth/secretmanager",
      "https://www.googleapis.com/auth/monitoring",
    ],
  },
  shieldedInstanceConfig: {
    enableIntegrityMonitoring: true,
    enableSecureBoot: false,
    enableVtpm: true,
  },
  zone: "us-central1-a",
});
