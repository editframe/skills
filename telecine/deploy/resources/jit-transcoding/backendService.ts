import * as gcp from "@pulumi/gcp";
import { endpointGroup } from "./endpointGroup";

export const backendService = new gcp.compute.BackendService(
  "telecine-jit-transcoding",
  {
    backends: [
      {
        group: endpointGroup.id,
      },
    ],
    // No CDN for dynamic transcoding content
    compressionMode: "DISABLED",
    connectionDrainingTimeoutSec: 300, // 5 minutes for ongoing transcoding
    enableCdn: false,
    loadBalancingScheme: "EXTERNAL_MANAGED",
    localityLbPolicy: "ROUND_ROBIN",
    logConfig: {
      sampleRate: 1.0, // Full logging for debugging transcoding issues
    },
    name: "telecine-jit-transcoding",
    portName: "http",
    project: "editframe",
    protocol: "HTTPS",
    sessionAffinity: "NONE",
    // timeoutSec not supported for serverless NEGs - timeout is configured in Cloud Run service
  },
  {
    protect: true,
  },
);