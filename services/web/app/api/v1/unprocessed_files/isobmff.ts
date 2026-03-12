import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import type { ProcessIsobmffFileResult } from "@editframe/api";
import { db } from "@/sql-client.server";

import type { Route } from "./+types/isobmff";
import { apiIdentityContext } from "~/middleware/context";

export const action = async ({
  params: { id },
  context,
}: Route.ActionArgs): Promise<ProcessIsobmffFileResult> => {
  const session = context.get(apiIdentityContext);

  const file = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
        query GetUnprocessedFile ($id: uuid!) {
          result: video2_unprocessed_files_by_pk(id: $id) {
            id
          }
        }
      `),
    { id },
  );

  const processRecord = await db
    .insertInto("video2.process_isobmff")
    .values({
      unprocessed_file_id: file.id,
      api_key_id: session.cid,
      org_id: session.oid,
      source_type: "unprocessed_file",
      creator_id: session.uid,
    })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  return processRecord;
};
