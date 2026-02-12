import { db } from "@/sql-client.server";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/detail";

export const loader = async ({ request, params: { id } }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);

  const file = await db
    .selectFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .select([
      "id",
      "filename",
      "type",
      "status",
      "byte_size",
      "md5",
      "mime_type",
      "width",
      "height",
      "created_at",
      "completed_at",
      "expires_at",
    ])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  if (file.type === "video") {
    const tracks = await db
      .selectFrom("video2.isobmff_tracks")
      .where("file_id", "=", id)
      .select([
        "track_id",
        "type",
        "codec_name",
        "duration_ms",
        "byte_size",
      ])
      .execute();

    return { ...file, tracks };
  }

  return file;
};
