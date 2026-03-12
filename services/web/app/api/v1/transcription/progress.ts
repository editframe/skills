import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { progressEventStream } from "@/progress-tracking/progressEventStream";

import type { Route } from "./+types/progress";
import { apiIdentityContext } from "~/middleware/context";

export const loader = async ({ params: { id }, context }: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);
  const transcription = await requireQueryAs(
    session,
    "org-reader",
    graphql(`
      query GetTranscription($id: uuid!) {
        result: video2_transcriptions_by_pk(id: $id) {
          id
          completed_at
          failed_at
        }
      }
    `),
    { id },
  );

  return progressEventStream("transcribe", transcription);
};
