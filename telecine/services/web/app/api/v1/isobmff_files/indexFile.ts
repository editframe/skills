import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { createReadableStreamFromReadable } from "@react-router/node";
import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath } from "@/util/filePaths";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/indexFile";

export const loader = async ({ request, params: { id } }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);
  const isobmffFile = await requireQueryAs(
    session,
    "org-reader",
    graphql(`
        query GetFile ($id: uuid!) {
          result: video2_isobmff_files_by_pk(id: $id) {
            id
            md5
            fragment_index_complete
            filename
          }
        }
      `),
    { id },
  );

  const filePath = isobmffIndexFilePath({
    org_id: session.oid,
    id: isobmffFile.id,
  });

  const readStream = await storageProvider.createReadStream(filePath);

  return new Response(createReadableStreamFromReadable(readStream), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      etag: isobmffFile.id,
      "Cache-Control": "max-age=3600",
    },
  });
};
