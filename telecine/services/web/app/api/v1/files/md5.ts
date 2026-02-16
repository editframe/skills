import { db } from "@/sql-client.server";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/md5";

export const loader = async ({
  params: { md5 },
  context,
}: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);

  return db
    .selectFrom("video2.files")
    .where("md5", "=", md5)
    .where("org_id", "=", session.oid)
    .select(["id", "filename", "type", "status", "byte_size", "md5", "next_byte"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });
};
