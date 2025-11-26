import { requireAdminSession } from "@/util/requireAdminSession";
import type { Route } from "./+types/search-orgs";
import { db } from "@/sql-client.server";
import { data } from "react-router";

const SEARCH_LIMIT = 20;

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdminSession(request);

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() || "";

  if (!query) {
    return data([]);
  }

  const lowerQuery = query.toLowerCase();

  const orgs = await db
    .selectFrom("identity.orgs")
    .innerJoin(
      "identity.users",
      "identity.orgs.primary_user_id",
      "identity.users.id",
    )
    .innerJoin(
      "identity.email_passwords",
      "identity.users.id",
      "identity.email_passwords.user_id",
    )
    .where((eb) =>
      eb.or([
        eb(
          eb.fn("lower", ["identity.orgs.display_name"]),
          "like",
          `%${lowerQuery}%`,
        ),
        eb(
          eb.fn("lower", ["identity.email_passwords.email_address"]),
          "like",
          `%${lowerQuery}%`,
        ),
        eb(
          eb.fn("lower", ["identity.users.first_name"]),
          "like",
          `%${lowerQuery}%`,
        ),
        eb(
          eb.fn("lower", ["identity.users.last_name"]),
          "like",
          `%${lowerQuery}%`,
        ),
      ]),
    )
    .select([
      "identity.orgs.id",
      "identity.orgs.display_name",
      "identity.users.first_name",
      "identity.users.last_name",
      "identity.email_passwords.email_address",
    ])
    .orderBy("identity.orgs.display_name", "asc")
    .limit(SEARCH_LIMIT)
    .execute();

  return data(orgs);
};
