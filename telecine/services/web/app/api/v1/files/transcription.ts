import { db } from "@/sql-client.server";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/transcription";

export const loader = async ({
  request,
  params: { id },
}: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);

  await db
    .selectFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .select(["id"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  const transcription = await db
    .selectFrom("video2.transcriptions")
    .where("file_id", "=", id)
    .select(["id", "work_slice_ms", "status", "completed_at", "failed_at"])
    .executeTakeFirst();

  if (!transcription) {
    throw new Response("Not Found", { status: 404 });
  }

  return transcription;
};
