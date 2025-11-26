import { db } from "@/sql-client.server";

import type { Route } from "./+types/organization";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const loader = async (args: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(args.request);

  const result = await db
    .selectFrom("identity.api_keys")
    .innerJoin("identity.orgs", "identity.api_keys.org_id", "identity.orgs.id")
    .where("identity.api_keys.id", "=", session.cid)
    .select([
      "identity.orgs.id",
      "identity.orgs.display_name",
      "identity.orgs.created_at",
      "identity.orgs.updated_at",
      "identity.orgs.website",
      "identity.api_keys.name",
    ])
    .executeTakeFirst();

  if (!result) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return result;
};
