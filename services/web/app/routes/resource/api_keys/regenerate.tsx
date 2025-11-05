import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { v4 } from "uuid";
import { generateApiToken } from "@/util/scryptPromise.server";
import { db } from "@/sql-client.server";
import { commitSession } from "@/util/session";
import { data } from "react-router";

import type { Route } from "./+types/regenerate";
import { requireSession } from "@/util/requireSession.server";

export const action = async ({ request, params }: Route.ActionArgs) => {
  const { session, sessionCookie } = await requireSession(request);

  const apiKey = await requireQueryAs(
    session,
    "org-admin",
    graphql(`query APIKey($id: uuid!) {
        result: identity_api_keys_by_pk(id: $id) {
          id
        }
      }`),
    { id: params.id },
  );

  const generatedToken = `ef_${v4().replaceAll("-", "")}`;

  const [key, salt] = await generateApiToken(generatedToken);

  const updated = await db
    .updateTable("identity.api_keys")
    .set({ salt, hash: key })
    .where("id", "=", apiKey.id)
    .returningAll()
    .executeTakeFirstOrThrow(() => new Error("Failed to update API key"));

  const token = `${generatedToken}_${updated.id}`;

  sessionCookie.flash("token", token);
  sessionCookie.flash("success", "API key regenerated");

  return data(
    { success: true },
    {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    },
  );
};
