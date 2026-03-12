import { graphql } from "@/graphql";
import { requireMutateAs } from "@/graphql.server/userClient";

import type { Route } from "./+types/delete";
import { apiIdentityContext } from "~/middleware/context";

export const action = async ({ params: { id }, context }: Route.ActionArgs) => {
  const session = context.get(apiIdentityContext);

  await requireMutateAs(
    session,
    "org-editor",
    graphql(`
        mutation DeleteISOBMFFFile($id: uuid!) {
          result: delete_video2_isobmff_files_by_pk(id: $id) {
            id
          }
        }
      `),
    { id },
  );

  return { success: true };
};
