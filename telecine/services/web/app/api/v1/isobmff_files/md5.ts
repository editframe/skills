import { db } from "@/sql-client.server";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";
import type { Route } from "./+types/md5";

export const loader = async ({
  request,
  params: { md5 },
}: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);

  const isobmffFile = await db
    .selectFrom("video2.isobmff_files")
    .where("md5", "=", md5)
    .where("org_id", "=", session.oid)
    .select(["id", "filename", "md5", "fragment_index_complete"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  return isobmffFile;
};
