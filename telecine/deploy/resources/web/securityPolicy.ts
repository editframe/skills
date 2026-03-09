import * as gcp from "@pulumi/gcp";

import { GCP_PROJECT } from "../constants";

export const securityPolicy = new gcp.compute.SecurityPolicy(
  "telecine-web-security-policy",
  {
    name: "telecine-web-security-policy",
    project: GCP_PROJECT,
    rules: [
      {
        priority: 1000,
        match: {
          expr: {
            expression: "request.path.matches('/auth/.*')",
          },
        },
        action: "rate_based_ban",
        rateLimitOptions: {
          conformAction: "allow",
          exceedAction: "deny(429)",
          enforceOnKey: "IP",
          rateLimitThreshold: {
            count: 1000,
            intervalSec: 60,
          },
          banDurationSec: 600,
        },
        description:
          "Rate-based ban on /auth/* — 1000 req/min per IP, 10-min ban on breach",
      },
      {
        priority: 2147483647,
        match: {
          versionedExpr: "SRC_IPS_V1",
          config: {
            srcIpRanges: ["*"],
          },
        },
        action: "allow",
        description: "Default allow",
      },
    ],
  },
);
