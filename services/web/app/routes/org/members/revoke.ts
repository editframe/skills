import { graphql } from "@/graphql";
import { requireMutateAs } from "@/graphql.server/userClient";

import type { Route } from "./+types/revoke"
import { requireSession } from "@/util/requireSession.server";

export const action = async ({ request, params }: Route.LoaderArgs) => {
  const { session } = await requireSession(request)
  await requireMutateAs(
    session,
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
}
