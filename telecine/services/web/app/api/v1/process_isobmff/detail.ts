import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import type { IsobmffProcessInfoResult } from "@editframe/api";

import type { Route } from "./+types/detail";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const loader = async ({
  request,
  params: { id },
}: Route.LoaderArgs): Promise<IsobmffProcessInfoResult> => {
  const session = await requireCookieOrTokenSession(request);
  return requireQueryAs(
    session,
    "org-reader",
    graphql(`
        query GetProcessIsobmff ($id: uuid!) {
          result: video2_process_isobmff_by_pk(id: $id) {
            id
            created_at
            completed_at
            failed_at
            isobmff_file_id
            unprocessed_file_id
          }
        }
      `),
    { id },
  );
};
