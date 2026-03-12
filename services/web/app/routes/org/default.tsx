import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { z } from "zod";
import { commitSession } from "@/util/session";
import { data } from "react-router";
import { identityContext, sessionCookieContext } from "~/middleware/context";

import type { Route } from "./+types/default";

const schema = z.object({
  id: z.string(),
});

export const action = async ({ request, context }: Route.ActionArgs) => {
  const session = context.get(identityContext);
  const sessionCookie = context.get(sessionCookieContext);
  const { id } = schema.parse(await request.json());

  const org = await requireQueryAs(
    { uid: session.uid, cid: session.cid ?? null },
    "org-reader",
    graphql(`
      query Org($id: uuid!) {
        result: orgs_by_pk(id: $id) {
          id
        }
      }
    `),
    { id },
  );

  sessionCookie.set("oid", org.id);

  return data(
    {},
    { headers: { "Set-Cookie": await commitSession(sessionCookie) } },
  );
};
