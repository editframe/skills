import * as gcp from "@pulumi/gcp";
import { urlMap } from "./urlmap";
import { editframeProductionCertificateV2 } from "./certificates/editframeProductionCertificate";

export const httpsTargetProxy = new gcp.compute.TargetHttpsProxy("telecine-load-balancer-target-proxy-2", {
  name: "telecine-load-balancer-target-proxy-2",
  project: "editframe",
  sslCertificates: [editframeProductionCertificateV2.id],
  tlsEarlyData: "DISABLED",
  urlMap: urlMap.id,
}, {
  protect: true,
});