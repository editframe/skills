import type { LookupRenderByMd5Result } from "@editframe/api";
import { db } from "@/sql-client.server";

import type { Route } from "./+types/md5";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const loader = async ({
  request,
  params: { md5 },
}: Route.LoaderArgs): Promise<LookupRenderByMd5Result> => {
  const session = await requireCookieOrTokenSession(request);
  const render = await db
    .selectFrom("video2.renders")
    .where("md5", "=", md5)
    .where("org_id", "=", session.oid)
    .select([
      "id",
      "md5",
      "status",
      "created_at",
      "fps",
      "width",
      "height",
      "duration_ms",
      "completed_at",
      "work_slice_ms",
      "failed_at",
      "metadata",
    ])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  return render;
};
