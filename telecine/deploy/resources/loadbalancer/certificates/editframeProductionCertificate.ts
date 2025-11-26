import * as gcp from "@pulumi/gcp";

export const editframeProductionCertificate =
  new gcp.compute.ManagedSslCertificate(
    "editframe-production-certificate",
    {
      managed: {
        domains: [
          "editframe.dev",
          "www.editframe.dev",
          "editframe.com",
          "www.editframe.com",
        ],
      },
      name: "editframe-production-certificate",
      project: "editframe",
    },
    {
      protect: true,
    },
  );

export const editframeProductionCertificateV2 =
  new gcp.compute.ManagedSslCertificate(
    "editframe-production-certificate-v2",
    {
      managed: {
        domains: [
          "editframe.dev",
          "www.editframe.dev",
          "editframe.com",
          "www.editframe.com",
          "assets.editframe.com",
        ],
      },
      name: "editframe-production-certificate-v2",
      project: "editframe",
    },
    {
      protect: true,
    },
  );
