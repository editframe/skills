import { graphql } from "@/graphql";
import { queryAs } from "@/graphql.server/userClient";
import type { GetISOBMFFFileTranscriptionResult } from "@editframe/api";
import { logger } from "@/logging";

import type { Route } from "./+types/transcription";
import { apiIdentityContext } from "~/middleware/context";

export const loader = async ({
  params: { id },
  context,
}: Route.LoaderArgs): Promise<GetISOBMFFFileTranscriptionResult> => {
  const session = context.get(apiIdentityContext);
  const isobmffFile = await queryAs(
    session,
    "org-reader",
    graphql(`
        query GetFile ($file_id: uuid!) {
          transcriptions: video2_transcriptions(
            limit: 1
            where: {
              file_id: {
                _eq: $file_id
              }
            }
          ) {
            id
            work_slice_ms
            isobmff_track {
              duration_ms
            }
          }
        }
      `),
    { file_id: id },
  );

  if (isobmffFile.error) {
    logger.error(
      isobmffFile.error,
      "Error fetching isobmff file transcription",
    );
    throw new Response("Internal Server Error", {
      status: 500,
      statusText: "Internal Server Error",
    });
  }

  const transcription = isobmffFile.data?.transcriptions[0];

  if (!transcription) {
    throw new Response("Not Found", { status: 404, statusText: "Not Found" });
  }

  return transcription;
};
