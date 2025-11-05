import * as gcp from "@pulumi/gcp";
import { cloudrun } from "./cloudrun";
import { GCP_PROJECT, GCP_REGION } from "../constants";

export const endpointGroup = new gcp.compute.RegionNetworkEndpointGroup(
  "telecine-transcribe-network-endpoint-group",
  {
    cloudRun: {
      service: cloudrun.name,
    },
    name: "telecine-transcribe-network-endpoint-group",
    project: GCP_PROJECT,
    region: GCP_REGION,
  },
  {
    protect: true,
  },
);
