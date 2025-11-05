import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { v4 } from "uuid";
import { db } from "@/sql-client.server";
import { commitSession } from "@/util/session";
import { data } from "react-router";

import type { Route } from "./+types/webhook_regenerate";
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

  const generatedSecret = `ef_webhook_${v4().replaceAll("-", "")}`;

  await db
    .updateTable("identity.api_keys")
    .set({
      webhook_secret: generatedSecret,
    })
    .where("id", "=", apiKey.id)
    .returning("id")
    .executeTakeFirstOrThrow();

  sessionCookie.flash("webhookSigningSecret", generatedSecret);
  sessionCookie.flash("success", "Webhook signing secret regenerated");

  return data(
    { success: true },
    {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    },
  );
};
