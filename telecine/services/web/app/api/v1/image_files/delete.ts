import { graphql } from "@/graphql";
import { requireMutateAs } from "@/graphql.server/userClient";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/delete";

export const action = async ({ params: { id }, context }: Route.ActionArgs) => {
  const session = context.get(apiIdentityContext);

  await requireMutateAs(
    session,
    "org-editor",
    graphql(`
        mutation DeleteImageFile($id: uuid!) {
          result: delete_video2_image_files_by_pk(id: $id) {
            id
          }
        }
      `),
    { id: id },
  );

  return { success: true };
};
