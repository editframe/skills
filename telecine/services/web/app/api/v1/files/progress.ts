import { db } from "@/sql-client.server";
import { progressEventStream } from "@/progress-tracking/progressEventStream";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/progress";

export const loader = async ({ request, params: { id } }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);

  await db
    .selectFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .select(["id"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  const process = await db
    .selectFrom("video2.process_isobmff")
    .where("id", "=", id)
    .select(["id", "completed_at", "failed_at"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  return progressEventStream("process-isobmff", process);
};
