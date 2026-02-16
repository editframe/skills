import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/md5";
import type { LookupImageFileByMd5Result } from "@editframe/api";
import { requireQueryAs } from "@/graphql.server/userClient";
import { graphql } from "@/graphql";

export const loader = async ({
  params: { md5 },
  context,
}: Route.LoaderArgs): Promise<LookupImageFileByMd5Result> => {
  const session = context.get(apiIdentityContext);

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
