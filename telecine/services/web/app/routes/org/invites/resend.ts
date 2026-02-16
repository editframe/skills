import { graphql } from "@/graphql";
import { requireMutateAs, requireQueryAs } from "@/graphql.server/userClient";
import type { Route } from "./+types/resend";
import { identityContext } from "~/middleware/context";

export const action = async ({ params: { id }, context }: Route.ActionArgs) => {
  const session = context.get(identityContext);

  // First get the current invitation details
  const invite = await requireQueryAs(
    { uid: session.uid, cid: session.cid ?? null },
    "org-admin",
    graphql(`
        query GetInvite($id: uuid!) {
          result: invites_by_pk(id: $id) {
            id
            role
            org_id
            email_address
          }
        }
      `),
    { id },
  );

  await requireMutateAs(
    { uid: session.uid, cid: session.cid ?? null },
    "org-admin",
    graphql(`
        mutation ResendInvitation(
          $emailAddress: String!
          $role: roles_enum!
          $orgId: uuid!
          $id: uuid!
        ) {
          delete_invites_by_pk(id: $id) {
            id
          }
          result: insert_invites_one(
            object: {
              email_address: $emailAddress
              role: $role
              org_id: $orgId
            }
          ) {
            id
          }
        }
      `),
    {
      emailAddress: invite.email_address,
      role: invite.role,
      orgId: invite.org_id,
      id,
    },
  );

  return { success: true };
};
