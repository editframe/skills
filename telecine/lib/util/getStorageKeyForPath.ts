import { logger } from "@/logging";
import {
  captionsFilePath,
  dataFilePath,
  imageFilePath,
  isobmffIndexFilePath,
  isobmffTrackFilePath,
} from "@/util/filePaths";
import { type Params, matchRoutes } from "react-router";

export function getStorageKeyForPath(path: string, orgId: string) {
  logger.trace({ path, orgId }, "getStorageKeyForPath");
  const matches = matchRoutes(
    [
      // New unified /api/v1/files routes
      {
        path: "/api/v1/files/:id/index",
        buildFilePath: (params: Params<string>, orgId: string) => {
          return isobmffIndexFilePath({ org_id: orgId, id: params.id! });
        },
      },
      {
        path: "/api/v1/files/:id/tracks/:trackId",
        buildFilePath: (params: Params<string>, orgId: string) => {
          return isobmffTrackFilePath({
            org_id: orgId,
            id: params.id!,
            track_id: Number(params.trackId!),
          });
        },
      },
      {
        path: "/api/v1/files/:id/transcription",
        buildFilePath: (params: Params<string>, orgId: string) => {
          return captionsFilePath({ org_id: orgId, id: params.id! });
        },
      },
      {
        path: "/api/v1/files/:id",
        buildFilePath: (params: Params<string>, orgId: string) => {
          return dataFilePath({ org_id: orgId, id: params.id! });
        },
      },

      // Legacy routes (backward compatibility)
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
