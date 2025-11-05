import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { receiveAssetChunk } from "@/util/receiveAssetChunk";
import { db } from "@/sql-client.server";
import { logger } from "@/logging";

import type { Route } from "./+types/upload";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const loader = async ({ request, params: { id } }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);
  const imageFile = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
        query GetImageFile ($id: uuid!) {
          result: video2_image_files_by_pk(id: $id) {
            complete
          }
        }
      `),
    { id: id },
  );

  if (imageFile.complete) {
    return Response.json({}, { status: 200 });
  }

  return Response.json({}, { status: 202 })
};

export const action = async ({ params, request }: Route.ActionArgs) => {
  const session = await requireCookieOrTokenSession(request);
  const imageFile = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
        query GetImageFile ($id: uuid!) {
          result: video2_image_files_by_pk(id: $id) {
            byte_size
            next_byte
            remote_uri
          }
        }
      `),
    { id: params.id },
  );

  const remote_uri = imageFile.remote_uri;
  if (remote_uri === null) {
    throw new Error("File is not set up for remote upload");
  }

  try {
    const { status, headers, complete, nextByte } = await receiveAssetChunk(
      request,
      {
        remote_uri: remote_uri,
        byte_size: imageFile.byte_size,
        next_byte: imageFile.next_byte,
      },
    );

    await db
      .updateTable("video2.image_files")
      .set({
        complete: complete,
        next_byte: nextByte,
      })
      .where("id", "=", params.id)
      .execute();

    return Response.json({}, { status, headers });
  } catch (error) {
    logger.error(error, "Error uploading file");
    throw error;
  }
};
