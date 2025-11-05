import { graphql } from "@/graphql";
import { requireMutateAs } from "@/graphql.server/userClient";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/delete";

export const action = async ({ request, params: { id } }: Route.ActionArgs) => {
  const session = await requireCookieOrTokenSession(request);

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
