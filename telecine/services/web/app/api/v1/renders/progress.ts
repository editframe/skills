import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { progressEventStream } from "@/progress-tracking/progressEventStream";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/progress";

export const loader = async ({ params: { id }, request }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);
  const render = await requireQueryAs(
    session,
    "org-reader",
    graphql(`
        query GetRender($id: uuid!) {
          result: video2_renders_by_pk(id: $id) {
            id
            completed_at
            failed_at
          }
        }
      `),
    { id },
  );

  return progressEventStream("render", render);
};
