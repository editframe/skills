import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/detail";

export const loader = async ({ request, params: { id } }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);

  return await requireQueryAs(
    session,
    "org-reader",
    graphql(`
      query GetFile ($id: uuid!) {
        result: video2_isobmff_files_by_pk(id: $id) {
          id
          md5
          fragment_index_complete
          filename
          isobmff_tracks {
            track_id
            type
            codec_name
            duration_ms
            probe_info
            transcription {
              id
              completed_at
              failed_at
            }
          }
        }
      }
    `),
    { id },
  );
};
