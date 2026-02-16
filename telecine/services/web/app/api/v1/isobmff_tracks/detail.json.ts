import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { receiveAssetChunk } from "@/util/receiveAssetChunk";
import { db } from "@/sql-client.server";
import { logger } from "@/logging";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/detail.json";

export const loader = async ({
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
            complete
          }
        }
    `),
    { file_id, track_id: Number(track_id) },
  );

  if (track.complete) {
    return Response.json({}, { status: 200 });
  }

  return Response.json({}, { status: 202 });
};

export const action = async ({
  params: { file_id, track_id },
  request,
  context,
}: Route.ActionArgs) => {
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
            byte_size
            next_byte
            remote_uri
          }
        }
      `),
    { file_id, track_id: Number(track_id) },
  );

  const remote_uri = track.remote_uri;
  if (remote_uri === null) {
    throw new Error("Track is not set up for remote upload");
  }

  try {
    const { complete, nextByte } = await receiveAssetChunk(request, {
      remote_uri: remote_uri,
      byte_size: track.byte_size,
      next_byte: track.next_byte,
    });

    await db
      .updateTable("video2.isobmff_tracks")
      .set({
        complete,
        next_byte: nextByte,
      })
      .where("file_id", "=", file_id)
      .where("track_id", "=", Number(track_id))
      .execute();

    return Response.json({}, { status: complete ? 201 : 202 });
  } catch (error) {
    logger.error(error, "Error uploading file");
    throw error;
  }
};
