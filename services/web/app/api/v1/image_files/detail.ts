import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { createReadableStreamFromReadable } from "@react-router/node";
import { storageProvider } from "@/util/storageProvider.server";
import { imageFilePath } from "@/util/filePaths";

import type { Route } from "./+types/detail";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const loader = async ({ request, params: { id } }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);

  const imageFile = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
        query GetImageFile ($id: uuid!) {
          result: video2_image_files_by_pk(id: $id) {
            id
            md5
            mime_type
            filename
          }
        }
      `),
    { id: id },
  );

  const filePath = imageFilePath({
    org_id: session.oid,
    id: imageFile.id,
  });

  console.log("FILE PATH", filePath);
  const readStream = await storageProvider.createReadStream(filePath);
  return new Response(createReadableStreamFromReadable(readStream), {
    status: 200,
    headers: {
      "Content-Type": imageFile.mime_type,
      etag: imageFile.id,
      "Cache-Control": "max-age=3600",
    },
  });
};
