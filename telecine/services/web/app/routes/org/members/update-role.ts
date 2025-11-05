import { graphql } from "@/graphql";
import { requireMutateAs } from "@/graphql.server/userClient";
import { z } from "zod";

import type { Route } from "./+types/update-role";
import { requireSession } from "@/util/requireSession.server";

const schema = z.object({
  id: z.string(),
  role: z.enum(["admin", "editor", "reader"]),
});

export const action = async ({ request }: Route.ActionArgs) => {
  const { session } = await requireSession(request);
  const { id, role } = schema.parse(await request.json());

  await requireMutateAs(
    session,
    "org-admin",
    graphql(`
      mutation UpdateOrganizationMemberRole($id: uuid!, $role: String!) {
        result: update_memberships_by_pk(
          pk_columns: {id: $id},
          _set: {role: $role}
        ) {
          id
          role
        }
      }
    `),
    { id, role },
  );

  return { success: true };
};
