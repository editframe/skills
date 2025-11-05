import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { db } from "@/sql-client.server";
import { writeReadableStreamToWritable } from "@/util/writeReadableStreamToWritable";
import { z } from "zod";
import { appFunction } from "@/util/appFunction.server";
import { storageProvider } from "@/util/storageProvider.server";
import { captionsFilePath } from "@/util/filePaths";

export const action = appFunction(
  {
    requireCookieOrTokenSession: true,
    requireBody: true,
    params: z.object({
      id: z.string(),
    }),
  },
  async ({ body, params, session }) => {
    const captionFile = await requireQueryAs(
      session,
      "org-editor",
      graphql(`
        query GetCaptionFile ($id: uuid!) {
          result: video2_caption_files_by_pk(id: $id) {
            id
            filename
            org_id
            md5
          }
        }
      `),
      { id: params.id },
    );

    const filePath = captionsFilePath({
      org_id: captionFile.org_id,
      id: captionFile.id,
    });
    const writeStream = await storageProvider.createWriteStream(filePath);
    const byteSize = await writeReadableStreamToWritable(body, writeStream);
    await new Promise((resolve, reject) => {
      writeStream.on("finalized", resolve);
      writeStream.on("error", reject);
    });
    try {
      await db
        .updateTable("video2.caption_files")
        .set({
          complete: true,
          byte_size: byteSize,
        })
        .where("id", "=", params.id)
        .execute();
    } catch (error) {
      await storageProvider.deletePath(filePath);
      throw error;
    }
    return captionFile;
  },
);
