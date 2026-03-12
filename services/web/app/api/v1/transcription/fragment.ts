import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { transcribeFragmentFilePath } from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";
import { readIntoBuffer } from "@/util/readIntoBuffer";

import type { Route } from "./+types/fragment";
import { apiIdentityContext } from "~/middleware/context";

export const loader = async ({
  params: { id, number },
  context,
}: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);
  const transcription = await requireQueryAs(
    session,
    "org-reader",
    graphql(`
        query GetTranscription ($id: uuid!) {
          result: video2_transcriptions_by_pk(id: $id) {
            id
            file_id
          }
        }
      `),
    { id: id },
  );

  const fragmentPath = transcribeFragmentFilePath({
    org_id: session.oid,
    id: transcription.file_id,
    segmentId: Number(number),
  });

  const buffer = await readIntoBuffer(
    await storageProvider.createReadStream(fragmentPath),
  );
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Length": buffer.length.toString(),
      "Content-Type": "application/json",
    },
  });
};
