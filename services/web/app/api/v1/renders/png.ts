import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { storageProvider } from "@/util/storageProvider.server";
import { renderStillFilePath } from "@/util/filePaths";

import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/png";

export const loader = async ({ params: { id }, request }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);
  const renderRecord = await requireQueryAs(
    session,
    "org-reader",
    graphql(`
        query GetRender ($id: uuid!) {
          result: video2_renders_by_pk(id: $id) {
            id
            org_id
          }
        }
      `),
    { id },
  );

  return await storageProvider.serveFile(
    renderStillFilePath({
      id: renderRecord.id,
      org_id: renderRecord.org_id,
      fileType: "png",
    }),
    { disposition: "inline", downloadAs: `${renderRecord.id}.png` },
  );
};
