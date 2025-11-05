import * as gcp from "@pulumi/gcp";
import { GCP_PROJECT, GCP_REGION } from "../constants";
import { cloudrun } from "./cloudrun";

export const endpointGroup = new gcp.compute.RegionNetworkEndpointGroup(
  "graphql-engine-enpoint-group",
  {
    cloudRun: {
      service: cloudrun.name,
    },
    name: "network-endpoint-group",
    project: GCP_PROJECT,
    region: GCP_REGION,
  },
  {
    protect: true,
  },
);
