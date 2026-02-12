import { db } from "@/sql-client.server";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/delete";

export const action = async ({ request, params: { id } }: Route.ActionArgs) => {
  const session = await requireCookieOrTokenSession(request);

  await db
    .deleteFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  return { success: true };
};
