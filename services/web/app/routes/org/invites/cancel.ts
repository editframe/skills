import { graphql } from "@/graphql";
import { requireMutateAs } from "@/graphql.server/userClient";
import { identityContext } from "~/middleware/context";

import type { Route } from "./+types/cancel";

export const action = async ({ params: { id }, context }: Route.ActionArgs) => {
  const session = context.get(identityContext);

  await requireMutateAs(
    { uid: session.uid, cid: session.cid ?? null },
    "org-admin",
    graphql(`
      mutation CancelInvite($id: uuid!) {
        result: delete_invites_by_pk(id: $id) {
          id
        }
      }
    `),
    { id },
  );

  return { success: true };
};
