import { db } from "@/sql-client.server";

import type { Route } from "./+types/detail";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const loader = async ({ params: { id }, request }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);

  const apiKeyId = session.cid;

  const render = await db
    .selectFrom("video2.renders")
    .where("api_key_id", "=", apiKeyId)
    .where("id", "=", id)
    .select([
      "id",
      "status",
      "created_at",
      "fps",
      "width",
      "height",
      "duration_ms",
      "completed_at",
      "failed_at",
    ])
    .executeTakeFirst();

  if (!render) {
    throw new Response("Not Found", { status: 404 });
  }

  return render;
};
