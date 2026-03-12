import * as gcp from "@pulumi/gcp";

import { endpointGroup } from "./endpointGroup";
import { securityPolicy } from "./securityPolicy";

export const backendService = new gcp.compute.BackendService(
  "telecine-web-backend",
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
      cacheMode: "CACHE_ALL_STATIC",
      clientTtl: 3600,
      defaultTtl: 3600,
      maxTtl: 86400,
      signedUrlCacheMaxAgeSec: 0,
    },
    compressionMode: "AUTOMATIC",
    connectionDrainingTimeoutSec: 0,
    enableCdn: true,
    loadBalancingScheme: "EXTERNAL_MANAGED",
    localityLbPolicy: "ROUND_ROBIN",
    logConfig: {
      sampleRate: 0,
    },
    name: "telecine-web-backend",
    portName: "http",
    project: "editframe",
    protocol: "HTTPS",
    securityPolicy: securityPolicy.selfLink,
    sessionAffinity: "NONE",
    timeoutSec: 30,
  },
  {
    protect: true,
  },
);
