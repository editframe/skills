import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/md5";
import type { LookupImageFileByMd5Result } from "@editframe/api";
import { requireQueryAs } from "@/graphql.server/userClient";
import { graphql } from "@/graphql";

export const loader = async ({
  request,
  params: { md5 },
}: Route.LoaderArgs): Promise<LookupImageFileByMd5Result> => {
  const session = await requireCookieOrTokenSession(request);

  const [imageFile] = await requireQueryAs(
    session,
    "org-reader",
    graphql(`
      query GetImageFile ($md5: uuid!, $orgId: uuid!) {
        result: video2_image_files(
          where: {
            md5: { _eq: $md5 },
            org_id: { _eq: $orgId },
          },
          limit: 1,
        ) {
          id
          md5
          mime_type
          filename
          complete
          byte_size
          height
          width
        }
      }
    `),
    { md5, orgId: session.oid },
  );

  if (!imageFile) {
    throw new Response("Not Found", { status: 404 });
  }

  return imageFile;
};
