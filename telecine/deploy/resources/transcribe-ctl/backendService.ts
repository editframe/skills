import * as gcp from "@pulumi/gcp";
import { endpointGroup } from "./endpointGroup";

export const backendService = new gcp.compute.BackendService(
  "telecine-transcribe-ctl",
  {
    backends: [
      {
        group: endpointGroup.id,
      },
    ],
    cdnPolicy: {
      cacheKeyPolicy: {
        includeHost: true,
        includeProtocol: true,
        includeQueryString: true,
      },
      cacheMode: "USE_ORIGIN_HEADERS",
      signedUrlCacheMaxAgeSec: 0,
    },
    compressionMode: "DISABLED",
    connectionDrainingTimeoutSec: 0,
    enableCdn: true,
    loadBalancingScheme: "EXTERNAL_MANAGED",
    localityLbPolicy: "ROUND_ROBIN",
    logConfig: {
      sampleRate: 0,
    },
    name: "telecine-transcribe-ctl",
    portName: "http",
    project: "editframe",
    protocol: "HTTPS",
    securityPolicy:
      "https://www.googleapis.com/compute/beta/projects/editframe/global/securityPolicies/default-security-policy-for-backend-service-telecine-render-ctl",
    sessionAffinity: "NONE",
    timeoutSec: 30,
  },
  {
    protect: true,
  },
);
