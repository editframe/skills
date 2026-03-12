import { graphql } from "@/graphql";
import { requireMutateAs } from "@/graphql.server/userClient";

import type { Route } from "./+types/revoke";
import { identityContext } from "~/middleware/context";

export const action = async ({ params, context }: Route.LoaderArgs) => {
  const session = context.get(identityContext);
  await requireMutateAs(
    { uid: session.uid, cid: session.cid ?? null },
    "org-admin",
    graphql(`
        mutation RevokeMembership($id: uuid!) {
          result: delete_memberships_by_pk(id: $id) {
            id
          }
        } 
      `),
    { id: params.id },
  );

  return { success: true };
};
