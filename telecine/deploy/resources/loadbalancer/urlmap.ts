import * as gcp from "@pulumi/gcp";
import { GCP_PROJECT } from "../constants";

import * as telecineWeb from "../web";
import * as hasura from "../hasura";
import * as transcribeCtl from "../transcribe-ctl";
import * as transcribe from "../transcribe";
import * as jitTranscoding from "../jit-transcoding";
import { assetsBackendBucket } from "../storage-backend";

export const urlMap = new gcp.compute.URLMap(
  "telecine-load-balancer",
  {
    defaultService: telecineWeb.backendService.id,
    hostRules: [
      {
        hosts: ["editframe.dev", "www.editframe.dev", "editframe.com", "www.editframe.com"],
        pathMatcher: "path-matcher-1",
      },
      {
        hosts: ["assets.editframe.com"],
        pathMatcher: "assets-path-matcher",
      },
    ],
    name: "telecine-load-balancer",
    pathMatchers: [
      {
        defaultService: telecineWeb.backendService.id,
        name: "path-matcher-1",
        pathRules: [
          {
            paths: ["/v1/graphql"],
            service: hasura.backendService.id,
          },
          {
            paths: ["/hdb/transcribe_audio_track"],
            service: transcribeCtl.backendService.id,
          },
          {
            paths: ["/_/transcribe/*"],
            service: transcribe.backendService.id,
          },
          {
            paths: ["/api/v1/transcode/*"],
            service: jitTranscoding.backendService.id,
          },
        ],
      },
      {
        defaultService: assetsBackendBucket.id,
        name: "assets-path-matcher",
      },
    ],
    project: GCP_PROJECT,
  },
  {
    protect: true,
  },
);
