import { graphql } from "@/graphql";
import { requireMutateAs } from "@/graphql.server/userClient";
import { redirect } from "react-router";
import { commitSession } from "@/util/session";

import type { Route } from "./+types/delete";
import { identityContext, sessionCookieContext } from "~/middleware/context";

export const action = async ({ params, context }: Route.ActionArgs) => {
  const session = context.get(identityContext);
  const sessionCookie = context.get(sessionCookieContext);

  const deleted = await requireMutateAs(
    { uid: session.uid, cid: session.cid ?? null },
    "org-admin",
    graphql(`mutation DeleteAPIKey($id: uuid!) {
        result: delete_identity_api_keys_by_pk(id: $id) {
          id
          org_id
        }
      }`),
    { id: params.id },
  );

  sessionCookie.flash("success", "API key deleted");

  return redirect(`/resource/api_keys?org=${deleted.org_id}`, {
    headers: {
      "Set-Cookie": await commitSession(sessionCookie),
    },
  });
};
