import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { createReadableStreamFromReadable } from "@react-router/node";
import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath } from "@/util/filePaths";
import { throwIfExpired } from "@/http/throwIfExpired";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/indexFile";

export const loader = async ({ params: { id }, context }: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);
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
            expires_at
          }
        }
      `),
    { id },
  );

  throwIfExpired(isobmffFile.expires_at);

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
