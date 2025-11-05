import * as gcp from "@pulumi/gcp";

import { endpointGroup } from "./endpointGroup";

export const backendService = new gcp.compute.BackendService(
  "graphql-backend",
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
    compressionMode: "AUTOMATIC",
    connectionDrainingTimeoutSec: 0,
    enableCdn: true,
    loadBalancingScheme: "EXTERNAL_MANAGED",
    localityLbPolicy: "ROUND_ROBIN",
    logConfig: {
      enable: true,
    },
    name: "telecine-backend",
    portName: "http",
    project: "editframe",
    protocol: "HTTPS",
    sessionAffinity: "NONE",
    timeoutSec: 30,
  },
  {
    protect: true,
  },
);
