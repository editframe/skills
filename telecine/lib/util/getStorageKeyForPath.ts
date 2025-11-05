import { logger } from "@/logging";
import {
  captionsFilePath,
  imageFilePath,
  isobmffIndexFilePath,
  isobmffTrackFilePath,
} from "@/util/filePaths";
import { type Params, matchRoutes } from "react-router";

export function getStorageKeyForPath(path: string, orgId: string) {
  logger.trace({ path, orgId }, "getStorageKeyForPath");
  const matches = matchRoutes(
    [
      {
        path: "/api/v1/isobmff_files/:id/index",
        buildFilePath: (params: Params<string>, orgId: string) => {
          return isobmffIndexFilePath({ org_id: orgId, id: params.id! });
        },
      },
      {
        path: "/api/v1/caption_files/:id",
        buildFilePath: (params: Params<string>, orgId: string) => {
          return captionsFilePath({ org_id: orgId, id: params.id! });
        },
      },
      {
        path: "/api/v1/image_files/:id",
        buildFilePath: (params: Params<string>, orgId: string) => {
          return imageFilePath({ org_id: orgId, id: params.id! });
        },
      },
      {
        // In other parts of the system the track id is treated as a query param.
        path: "/api/v1/isobmff_tracks/:id/:trackId",
        buildFilePath: (params: Params<string>, orgId: string) => {
          return isobmffTrackFilePath({
            org_id: orgId,
            id: params.id!,
            track_id: Number(params.trackId!),
          });
        },
      },
    ],
    path,
  );

  const match = matches?.[0];
  if (!match) {
    return;
  }

  return match.route.buildFilePath(match.params, orgId);
}
