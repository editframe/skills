import { sql } from "kysely";

import { logger } from "@/logging";
import { db } from "@/sql-client.server";
import { receiveAssetChunk } from "@/util/receiveAssetChunk";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/upload";

export const loader = async ({ params: { id }, context }: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);

  const file = await db
    .selectFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .select(["status"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  if (file.status !== "created" && file.status !== "uploading") {
    return Response.json({}, { status: 200 });
  }

  return Response.json({}, { status: 202 });
};

export const action = async ({ request, params: { id }, context }: Route.ActionArgs) => {
  const session = context.get(apiIdentityContext);

  const file = await db
    .selectFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .select(["byte_size", "next_byte", "remote_uri", "type", "status"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  if (file.remote_uri === null) {
    throw new Error("File is not set up for remote upload");
  }

  if (file.byte_size === null) {
    throw new Error("File byte_size is not set");
  }

  try {
    const { complete, nextByte } = await receiveAssetChunk(request, {
      remote_uri: file.remote_uri,
      byte_size: file.byte_size,
      next_byte: file.next_byte,
    });

    if (complete) {
      await onUploadComplete(id, file.type, session);
    } else {
      await db
        .updateTable("video2.files")
        .set({
          next_byte: nextByte,
          status: "uploading",
        })
        .where("id", "=", id)
        .execute();
    }

    return Response.json({}, { status: complete ? 201 : 202 });
  } catch (error) {
    logger.error(error, "Error uploading file");
    throw error;
  }
};

async function onUploadComplete(
  fileId: string,
  fileType: string,
  session: { oid: string; uid: string; cid: string | null },
) {
  switch (fileType) {
    case "video": {
      await db
        .updateTable("video2.files")
        .set({
          status: "processing",
          completed_at: sql`now()`,
        })
        .where("id", "=", fileId)
        .execute();

      await db
        .insertInto("video2.process_isobmff")
        .values({
          id: fileId,
          api_key_id: session.cid,
          org_id: session.oid,
          creator_id: session.uid,
          source_type: "file",
        })
        .executeTakeFirstOrThrow();
      break;
    }

    case "image": {
      await db
        .updateTable("video2.files")
        .set({
          status: "ready",
          completed_at: sql`now()`,
        })
        .where("id", "=", fileId)
        .execute();
      break;
    }

    case "caption": {
      await db
        .updateTable("video2.files")
        .set({
          status: "ready",
          completed_at: sql`now()`,
        })
        .where("id", "=", fileId)
        .execute();
      break;
    }
  }
}
