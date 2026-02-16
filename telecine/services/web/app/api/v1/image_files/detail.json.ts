import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/detail.json";
import type { GetImageFileMetadataResult } from "@editframe/api";

export const loader = async ({
  params: { id },
  context,
}: Route.LoaderArgs): Promise<GetImageFileMetadataResult> => {
  const session = context.get(apiIdentityContext);

  const imageFile = await requireQueryAs(
    session,
    "org-reader",
    graphql(`
      query GetImageFile ($id: uuid!) {
        result: video2_image_files_by_pk(id: $id) {
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
    { id },
  );

  return imageFile;
};
