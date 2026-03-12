import { db } from "@/sql-client.server";
import { apiIdentityContext } from "~/middleware/context";
import type { Route } from "./+types/md5";

export const loader = async ({
  params: { md5 },
  context,
}: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);

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
