import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { storageProvider } from "@/util/storageProvider.server";
import { renderFilePath } from "@/util/filePaths";

import type { Route } from "./+types/tgz";
import { apiIdentityContext } from "~/middleware/context";

export const loader = async ({ params: { id }, context }: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);
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
    renderFilePath({
      id: renderRecord.id,
      org_id: renderRecord.org_id,
    }),
    { disposition: "inline", downloadAs: `${renderRecord.id}-bundle.tgz` },
  );
};
