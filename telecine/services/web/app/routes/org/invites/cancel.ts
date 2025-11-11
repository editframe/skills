import { graphql } from "@/graphql";
import { requireMutateAs } from "@/graphql.server/userClient";
import { requireSession } from "@/util/requireSession.server";

import type { Route } from "./+types/cancel";

export const action = async ({ params: { id }, request }: Route.ActionArgs) => {
  const { session } = await requireSession(request);

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
