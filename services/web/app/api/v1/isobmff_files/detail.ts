import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/detail";

export const loader = async ({ params: { id }, context }: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);

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
