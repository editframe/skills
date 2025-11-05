import { graphql } from "@/graphql";
import { requireMutateAs } from "@/graphql.server/userClient";

import type { Route } from "./+types/delete";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const action = async ({ request, params: { id } }: Route.ActionArgs) => {
  const session = await requireCookieOrTokenSession(request);

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
