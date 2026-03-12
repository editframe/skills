import { sql } from "kysely";

import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { logger } from "@/logging";
import { db } from "@/sql-client.server";
import { receiveAssetChunk } from "@/util/receiveAssetChunk";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/upload";

export const loader = async ({ request, params: { id }, context }: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);
  const file = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
        query GetFile ($id: uuid!) {
          result: video2_unprocessed_files_by_pk(id: $id) {
            complete
          }
        }
      `),
    { id },
  );

  if (file.complete) {
    return Response.json({}, { status: 200 });
  }

  return Response.json({}, { status: 202 });
};

export const action = async ({ request, params: { id }, context }: Route.ActionArgs) => {
  const session = context.get(apiIdentityContext);
  const file = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
        query GetFile ($id: uuid!) {
          result: video2_unprocessed_files_by_pk(id: $id) {
            byte_size
            next_byte
            remote_uri
          }
        }
      `),
    { id },
  );

  const remote_uri = file.remote_uri;
  if (remote_uri === null) {
    throw new Error("File is not set up for remote upload");
  }

  try {
    const { complete, nextByte } = await receiveAssetChunk(request, {
      remote_uri: remote_uri,
      byte_size: file.byte_size,
      next_byte: file.next_byte,
    });

    await db
      .updateTable("video2.unprocessed_files")
      .set({
        complete: complete,
        next_byte: nextByte,
        completed_at: complete ? sql`now()` : null,
      })
      .where("id", "=", id)
      .execute();

    return Response.json({}, { status: complete ? 201 : 202 });
  } catch (error) {
    logger.error(error, "Error uploading file");
    throw error;
  }
};
