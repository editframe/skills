import { db } from "@/sql-client.server";
import type { LookupUnprocessedFileByMd5Result } from "@editframe/api";

import type { Route } from "./+types/md5";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const loader = async ({
  request,
  params: { md5 },
}: Route.LoaderArgs): Promise<LookupUnprocessedFileByMd5Result> => {
  const session = await requireCookieOrTokenSession(request);
  return db
    .selectFrom("video2.unprocessed_files")
    .where("md5", "=", md5)
    .where("org_id", "=", session.oid)
    .select(["id", "byte_size", "next_byte", "complete", "md5"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });
};
