import { db } from "@/sql-client.server";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/delete";

export const action = async ({ params: { id }, context }: Route.ActionArgs) => {
  const session = context.get(apiIdentityContext);

  await db
    .deleteFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  return { success: true };
};
