import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { z } from "zod";
import { db } from "@/sql-client.server";
import { commitSession } from "@/util/session";
import { data } from "react-router";

import type { Route } from "./+types/extend";
import { requireSession } from "@/util/requireSession.server";

const schema = z.object({
  expired_at: z
    .string()
    .transform((val) => {
      if (!val) return null;
      const days = Number.parseInt(val);
      const date = new Date();
      // Adding millis to the date because js date math can go bad around months of differing lengths etc.
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      return date;
    })
    .optional(),
});

export const action = async ({ request, params }: Route.ActionArgs) => {
  const { session, sessionCookie } = await requireSession(request);
  const apiKey = await requireQueryAs(
    { uid: session.uid, cid: session.cid ?? null },
    "org-admin",
    graphql(`query APIKey($id: uuid!) {
        result: identity_api_keys_by_pk(id: $id) {
          id
          org_id
        }
      }`),
    { id: params.id },
  );

  const payload = schema.parse(await request.json());

  await db
    .updateTable("identity.api_keys")
    .set({ expired_at: payload.expired_at })
    .where("id", "=", apiKey.id)
    .returningAll()
    .executeTakeFirstOrThrow(() => new Error("Failed to update API key"));

  sessionCookie.flash("success", "API key expiration extended");

  return data(
    { success: true },
    {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    },
  );
};
