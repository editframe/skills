import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { progressEventStream } from "@/progress-tracking/progressEventStream";

import type { Route } from "./+types/progress";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const loader = async ({ request, params: { id } }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);
  const process = await requireQueryAs(
    session,
    "org-reader",
    graphql(`
        query GetProcessIsobmff ($id: uuid!) {
          result: video2_process_isobmff_by_pk(id: $id) {
            id
            completed_at
            failed_at
          }
        }
      `),
    { id },
  );

  return progressEventStream("process-isobmff", process);
};
