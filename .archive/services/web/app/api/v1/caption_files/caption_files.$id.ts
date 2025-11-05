import { z } from "zod";
import { Features } from "@/util/features.server";
import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { createReadableStreamFromReadable } from "@react-router/node";
import { appFunction } from "@/util/appFunction.server";
import { storageProvider } from "@/util/storageProvider.server";
import { captionsFilePath } from "@/util/filePaths";

export const loader = appFunction(
  {
    featureGate: Features.VIDEO2,
    requireAPIToken: true,
    params: z.object({
      id: z.string(),
    }),
  },
  async ({ params, session }) => {
    const captionFile = await requireQueryAs(
      session,
      "org-editor",
      graphql(`
        query GetFile ($id: uuid!) {
          result: video2_caption_files_by_pk(id: $id) {
            id
            md5
            filename
          }
        }
      `),
      { id: params.id },
    );

    const filePath = captionsFilePath({
      org_id: session.oid,
      id: captionFile.id,
    });

    const readStream = await storageProvider.createReadStream(filePath);
    return new Response(createReadableStreamFromReadable(readStream), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        etag: captionFile.id,
        "Cache-Control": "max-age=3600",
      },
    });
  },
);
