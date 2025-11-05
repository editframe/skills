import { graphql } from "@/graphql";
import { Features } from "@/util/features.server";
import { appFunction } from "@/util/appFunction.server";
import { z } from "zod";
import { requireQueryAs } from "@/graphql.server/userClient";
import { storageProvider } from "@/util/storageProvider.server";
import { renderFinalFilePath } from "@/util/filePaths";

export const loader = appFunction(
  {
    featureGate: Features.RENDER,
    requireSession: true,
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  async ({ session, params }) => {
    const renderRecord = await requireQueryAs(
      session,
      "org-reader",
      graphql(`
        query GetRender ($id: uuid!) {
          result: video2_renders_by_pk(id: $id) {
            id
            md5
            org_id
          }
        }
      `),
      { id: params.id },
    );

    return await storageProvider.serveVideo(
      renderFinalFilePath({
        org_id: renderRecord.org_id,
        id: renderRecord.id,
      }),
    );
  },
);
