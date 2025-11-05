import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { writeReadableStreamToWritable } from "@react-router/node";
import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath } from "@/util/filePaths";
import { db } from "@/sql-client.server";

import type { Route } from "./+types/uploadIndex";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const action = async ({
  params: { id },
  request,
}: Route.ActionArgs) => {
  if (!request.body) {
    throw new Response("Request MUST have body content", { status: 400 });
  }
  const session = await requireCookieOrTokenSession(request);
  const isobmffFile = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
        query GetFile ($id: uuid!) {
          result: video2_isobmff_files_by_pk(id: $id) {
            id
            md5
            fragment_index_complete
            filename
          }
        }
      `),
    { id },
  );

  const filePath = isobmffIndexFilePath({
    org_id: session.oid,
    id: isobmffFile.id,
  });
  const writeStream = await storageProvider.createWriteStream(filePath);
  await writeReadableStreamToWritable(request.body, writeStream);
  await new Promise((resolve, reject) => {
    writeStream.on("finalized", resolve);
    writeStream.on("error", reject);
  });
  try {
    await db
      .updateTable("video2.isobmff_files")
      .set({
        fragment_index_complete: true,
      })
      .where("id", "=", id)
      .execute();
  } catch (error) {
    await storageProvider.deletePath(filePath);
    throw error;
  }

  return isobmffFile;
};
