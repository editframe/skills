import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { storageProvider } from "@/util/storageProvider.server";
import { isobmffTrackFilePath } from "@/util/filePaths";
import { createReadableStreamFromReadable } from "@react-router/node";
import { throwIfExpired } from "@/http/throwIfExpired";

import { RangeHeader } from "@/util/RangeHeader.server";

import type { Route } from "./+types/trackData";
import { apiIdentityContext } from "~/middleware/context";

export const loader = async ({
  request,
  params: { file_id, track_id },
  context,
}: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);
  const track = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
        query GetTrack ($file_id: uuid!, $track_id: Int!) {
          result: video2_isobmff_tracks_by_pk(
            file_id: $file_id
            track_id: $track_id
          ) {
            file_id
            track_id
            byte_size
            isobmff_file {
              id
              filename
              expires_at
            }
          }
        }
      `),
    {
      file_id: file_id,
      track_id: Number.parseInt(track_id, 10),
    },
  );

  throwIfExpired(track.isobmff_file.expires_at);

  const filePath = isobmffTrackFilePath({
    org_id: session.oid,
    id: track.isobmff_file.id,
    track_id: track.track_id,
  });
  const rangeHeader = request.headers.get("Range");
  if (rangeHeader) {
    const range = RangeHeader.parse(rangeHeader, track.byte_size);
    const readStream = await storageProvider.createReadStream(filePath, range);
    return new Response(createReadableStreamFromReadable(readStream), {
      status: 206,
      headers: {
        etag: `${track.file_id}-${track.track_id}`,
        "Content-Type": "video/mp4",
        "Cache-Control": "max-age=3600",
        "Content-Range": range.toHeader(),
        "Content-Length": String(range.end - range.start + 1),
        "Accept-Ranges": "bytes",
      },
    });
  }

  const readStream = await storageProvider.createReadStream(filePath);

  return new Response(createReadableStreamFromReadable(readStream), {
    status: 200,
    headers: {
      etag: `${track.file_id}-${track.track_id}`,
      "Content-Type": "video/mp4",
      "Cache-Control": "max-age=3600",
      "Content-Length": String(track.byte_size),
    },
  });
};
