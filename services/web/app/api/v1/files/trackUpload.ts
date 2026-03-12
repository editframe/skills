import { logger } from "@/logging";
import { db } from "@/sql-client.server";
import { receiveAssetChunk } from "@/util/receiveAssetChunk";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/trackUpload";

export const loader = async ({
  params: { id, trackId },
  context,
}: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);

  const track = await db
    .selectFrom("video2.isobmff_tracks")
    .innerJoin(
      "video2.files",
      "video2.files.id",
      "video2.isobmff_tracks.file_id",
    )
    .select(["video2.isobmff_tracks.complete"])
    .where("video2.isobmff_tracks.file_id", "=", id)
    .where("video2.isobmff_tracks.track_id", "=", Number(trackId))
    .where("video2.files.org_id", "=", session.oid)
    .executeTakeFirst();

  if (!track) {
    throw new Response("Track not found", { status: 404 });
  }

  if (track.complete) {
    return Response.json({}, { status: 200 });
  }

  return Response.json({}, { status: 202 });
};

export const action = async ({
  params: { id, trackId },
  request,
  context,
}: Route.ActionArgs) => {
  const session = context.get(apiIdentityContext);

  const track = await db
    .selectFrom("video2.isobmff_tracks")
    .innerJoin(
      "video2.files",
      "video2.files.id",
      "video2.isobmff_tracks.file_id",
    )
    .select([
      "video2.isobmff_tracks.byte_size",
      "video2.isobmff_tracks.next_byte",
      "video2.isobmff_tracks.remote_uri",
    ])
    .where("video2.isobmff_tracks.file_id", "=", id)
    .where("video2.isobmff_tracks.track_id", "=", Number(trackId))
    .where("video2.files.org_id", "=", session.oid)
    .executeTakeFirst();

  if (!track) {
    throw new Response("Track not found", { status: 404 });
  }

  const remote_uri = track.remote_uri;
  if (remote_uri === null) {
    throw new Error("Track is not set up for remote upload");
  }

  try {
    const { complete, nextByte } = await receiveAssetChunk(request, {
      remote_uri,
      byte_size: track.byte_size,
      next_byte: track.next_byte,
    });

    await db
      .updateTable("video2.isobmff_tracks")
      .set({
        complete,
        next_byte: nextByte,
      })
      .where("file_id", "=", id)
      .where("track_id", "=", Number(trackId))
      .execute();

    return Response.json({}, { status: complete ? 201 : 202 });
  } catch (error) {
    logger.error(error, "Error uploading track");
    throw error;
  }
};
