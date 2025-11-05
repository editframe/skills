import * as gcp from "@pulumi/gcp";
import { GCP_PROJECT, GCP_REGION } from "../constants";
import { cloudrun } from "./cloudrun";

export const endpointGroup = new gcp.compute.RegionNetworkEndpointGroup(
  "telecine-transcribe-ctl-backend-group",
  {
    cloudRun: {
      service: cloudrun.name,
    },
    name: "telecine-transcribe-ctl-backend-group",
    project: GCP_PROJECT,
    region: GCP_REGION,
  },
  {
    protect: true,
  },
);
