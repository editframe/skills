import { createReadableStreamFromReadable } from "@react-router/node";

import { db } from "@/sql-client.server";
import { isobmffTrackFilePath } from "@/util/filePaths";
import { RangeHeader } from "@/util/RangeHeader.server";
import { throwIfExpired } from "@/http/throwIfExpired";
import { apiIdentityContext } from "~/middleware/context";
import { storageProvider } from "@/util/storageProvider.server";

import type { Route } from "./+types/tracks";

export const loader = async ({
  request,
  params: { id, trackId },
  context,
}: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);

  const file = await db
    .selectFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .where("type", "=", "video")
    .select(["id", "expires_at"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  throwIfExpired(file.expires_at);

  const trackIdNum = Number.parseInt(trackId, 10);

  const track = await db
    .selectFrom("video2.isobmff_tracks")
    .where("file_id", "=", file.id)
    .where("track_id", "=", trackIdNum)
    .select(["byte_size"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Track Not Found", { status: 404 });
    });

  const filePath = isobmffTrackFilePath({
    org_id: session.oid,
    id: file.id,
    track_id: trackIdNum,
  });

  const rangeHeader = request.headers.get("Range");
  if (rangeHeader) {
    const range = RangeHeader.parse(rangeHeader, track.byte_size);
    const readStream = await storageProvider.createReadStream(filePath, range);
    return new Response(createReadableStreamFromReadable(readStream), {
      status: 206,
      headers: {
        etag: `${file.id}-${trackIdNum}`,
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
      etag: `${file.id}-${trackIdNum}`,
      "Content-Type": "video/mp4",
      "Cache-Control": "max-age=3600",
      "Content-Length": String(track.byte_size),
    },
  });
};
