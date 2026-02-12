import { sql } from "kysely";

import { db } from "@/sql-client.server";
import { logger } from "@/logging";

import type { Route } from "./+types/reap_expired_files";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

const BATCH_LIMIT = 500;

async function reapTable(table: "video2.files" | "video2.image_files" | "video2.isobmff_files") {
  const now = sql<Date>`now()`;

  const expired = db
    .selectFrom(table)
    .where("expires_at", "is not", null)
    .where("expires_at", "<", now)
    .select("id")
    .limit(BATCH_LIMIT);

  const deleted = await db
    .deleteFrom(table)
    .where("id", "in", expired)
    .returning(["id"])
    .execute();

  return deleted.length;
}

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);

  const files = await reapTable("video2.files");
  const imageFiles = await reapTable("video2.image_files");
  const isobmffFiles = await reapTable("video2.isobmff_files");

  const summary = {
    files,
    image_files: imageFiles,
    isobmff_files: isobmffFiles,
  };

  logger.info(summary, "Reaped expired files");

  return Response.json(summary);
};
