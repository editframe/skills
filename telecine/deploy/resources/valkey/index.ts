import * as gcp from "@pulumi/gcp";
import { GCP_REGION } from "../constants";
import { defaultNetwork, defaultSubnet } from "../network";

// Existing Valkey Compute Instance
export const valkeyComputeInstance = new gcp.compute.Instance(
  "valkey-compute-instance",
  {
    name: "valkey-compute-instance",
    machineType: "e2-micro",
    zone: `${GCP_REGION}-a`,
    bootDisk: {
      initializeParams: {
        image: "cos-cloud/cos-stable",
      },
    },
    networkInterfaces: [
      {
        network: defaultNetwork.id,
        subnetwork: defaultSubnet.id,
        accessConfigs: [
          {
            // This block adds an external IP address
            natIp: undefined, // Automatically assign an external IP
          },
        ],
      },
    ],
    metadata: {
      "gce-container-declaration": `
spec:
  containers:
  - name: valkey
    image: valkey/valkey:8.0-alpine
    securityContext:
      privileged: true
    stdin: false
    tty: false
  restartPolicy: Always
`,
    },

    tags: ["valkey-instance"], // Ensure this tag matches the firewall rule
    allowStoppingForUpdate: true,
  },
  {
    dependsOn: [],
    protect: false,
  },
);

// Export the internal IP address of the Valkey instance
export const valkeyInternalIp = valkeyComputeInstance.networkInterfaces.apply(
  (interfaces) => interfaces[0].networkIp,
);

// Export the external IP address of the Valkey instance
export const valkeyExternalIp = valkeyComputeInstance.networkInterfaces.apply(
  (interfaces) => interfaces[0].accessConfigs?.[0].natIp,
);
