import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { storageProvider } from "@/util/storageProvider.server";
import { renderFinalFilePath } from "@/util/filePaths";

import type { Route } from "./+types/mp4";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";
import { data } from "react-router";

export const loader = async ({ params: { id }, request }: Route.LoaderArgs) => {
  if (!id) {
    return data({ error: "No id provided" }, { status: 400 });
  }
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

  const rangeHeader = request.headers.get("range");

  return await storageProvider.serveFile(
    renderFinalFilePath({
      id: renderRecord.id,
      org_id: renderRecord.org_id,
    }),
    {
      disposition: "inline",
      downloadAs: `${renderRecord.id}.mp4`,
      mimeType: "video/mp4",
      ...(rangeHeader && { range: rangeHeader })
    },
  );
};
